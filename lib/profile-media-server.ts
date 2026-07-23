import { randomInt, randomUUID } from "node:crypto";
import {
  firebaseAdminAccessToken,
  firebaseAdminStorageBucket,
  firestoreAdminRequest,
} from "@/lib/firebase-admin-rest";

export const PROFILE_MEDIA_MAX_FILE_BYTES = 3 * 1024 * 1024;
export const PROFILE_MEDIA_MAX_TOTAL_BYTES = 192 * 1024 * 1024;
export const PROFILE_MEDIA_SLOT_COUNT = 128;
export const PROFILE_MEDIA_MAX_DELETE_ITEMS = 64;
const PROFILE_MEDIA_MAX_STORED_GENERATIONS = 384;
const PROFILE_MEDIA_DRAFT_GRACE_MS = 24 * 60 * 60 * 1_000;

const PROFILE_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const PROFILE_MEDIA_ITEM_ID = /^[A-Za-z0-9_-]{1,80}$/;
const PROFILE_MEDIA_UID = /^[A-Za-z0-9:_-]{1,128}$/;
const PROFILE_MEDIA_SLOT = /^(?:0\d{2}|1[01]\d|12[0-7])$/;
const LEGACY_MEDIA_UUID =
  /^(?:media-)?[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GCS_TIMEOUT_MS = 15_000;

export type ProfileMediaScope = "links" | "sections" | "avatars";

export type ProfileMediaDeleteItem = {
  scope: ProfileMediaScope;
  itemId: string;
  mediaUrl: string;
};

type PoolObject = {
  name: string;
  size: number;
  generation: string;
  live: boolean;
  timeCreated?: string;
};

type ManagedPoolObject = {
  name: string;
  generation?: string;
};

type PoolInventory = {
  objects: PoolObject[];
  softDeletedBytes: number;
  recordCount: number;
};

export class ProfileMediaServerError extends Error {
  constructor(
    message: string,
    readonly status: 409 | 413 | 503,
    readonly code:
      | "POOL_FULL"
      | "QUOTA_EXCEEDED"
      | "RECORD_LIMIT"
      | "STORAGE_NOT_CONFIGURED"
      | "STORAGE_UNAVAILABLE",
  ) {
    super(message);
    this.name = "ProfileMediaServerError";
  }
}

export function isProfileMediaScope(value: unknown): value is ProfileMediaScope {
  return value === "links" || value === "sections" || value === "avatars";
}

export function isProfileMediaItemId(value: unknown): value is string {
  return typeof value === "string" && PROFILE_MEDIA_ITEM_ID.test(value);
}

export function isProfileMediaDestination(
  scope: unknown,
  itemId: unknown,
): scope is ProfileMediaScope {
  return (
    isProfileMediaScope(scope) &&
    isProfileMediaItemId(itemId) &&
    (scope !== "avatars" || itemId === "avatar")
  );
}

export function normalizedProfileMediaContentType(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === "image/jpg" ? "image/jpeg" : normalized;
}

export function isProfileMediaContentType(value: string) {
  return PROFILE_MEDIA_TYPES.has(value.trim().toLowerCase());
}

function assertUid(uid: string) {
  if (!PROFILE_MEDIA_UID.test(uid)) {
    throw new ProfileMediaServerError(
      "Profile media storage is unavailable.",
      503,
      "STORAGE_UNAVAILABLE",
    );
  }
}

function poolPrefix(uid: string) {
  assertUid(uid);
  return `profile-media/${uid}/objects/`;
}

function slotName(slot: number) {
  return String(slot).padStart(3, "0");
}

function shuffled<T>(values: T[]) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = randomInt(index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

async function storageCredentials() {
  const [token, bucket] = await Promise.all([
    firebaseAdminAccessToken(),
    Promise.resolve(firebaseAdminStorageBucket()),
  ]);
  if (!token || !bucket) {
    throw new ProfileMediaServerError(
      "Profile media storage is not configured.",
      503,
      "STORAGE_NOT_CONFIGURED",
    );
  }
  return { token, bucket };
}

async function listPoolObjects(
  token: string,
  bucket: string,
  uid: string,
  maximumRecords: number,
): Promise<PoolObject[]> {
  const prefix = poolPrefix(uid);
  const objects: PoolObject[] = [];
  let pageToken = "";

  do {
    const remaining = maximumRecords - objects.length;
    if (remaining < 1) {
      throw new ProfileMediaServerError(
        "Your profile media retention limit has been reached.",
        409,
        "RECORD_LIMIT",
      );
    }
    const params = new URLSearchParams({
      prefix,
      maxResults: String(Math.min(256, remaining)),
      fields:
        "items(name,size,generation,timeCreated,timeDeleted),nextPageToken",
      prettyPrint: "false",
      versions: "true",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const response = await fetch(
      `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o?${params}`,
      {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(GCS_TIMEOUT_MS),
      },
    );
    if (!response.ok) {
      throw new ProfileMediaServerError(
        "Profile media storage is temporarily unavailable.",
        503,
        "STORAGE_UNAVAILABLE",
      );
    }

    const result = (await response.json()) as {
      items?: Array<{
        name?: string;
        size?: string;
        generation?: string;
        timeCreated?: string;
        timeDeleted?: string;
      }>;
      nextPageToken?: string;
    };
    for (const item of result.items ?? []) {
      if (
        item.name?.startsWith(prefix) &&
        typeof item.generation === "string" &&
        /^\d+$/.test(item.generation)
      ) {
        const size = Number(item.size ?? 0);
        objects.push({
          name: item.name,
          generation: item.generation,
          live: !item.timeDeleted,
          size: Number.isSafeInteger(size) && size >= 0 ? size : 0,
          ...(item.timeCreated ? { timeCreated: item.timeCreated } : {}),
        });
      }
    }
    pageToken = result.nextPageToken ?? "";
    if (pageToken && objects.length >= maximumRecords) {
      throw new ProfileMediaServerError(
        "Your profile media retention limit has been reached.",
        409,
        "RECORD_LIMIT",
      );
    }
  } while (pageToken);

  return objects;
}

async function listSoftDeletedPoolBytes(
  token: string,
  bucket: string,
  uid: string,
  maximumRecords: number,
): Promise<{ bytes: number; records: number }> {
  const prefix = poolPrefix(uid);
  let total = 0;
  let records = 0;
  let pageToken = "";

  do {
    const remaining = maximumRecords - records;
    if (remaining < 1) {
      throw new ProfileMediaServerError(
        "Your profile media retention limit has been reached.",
        409,
        "RECORD_LIMIT",
      );
    }
    const params = new URLSearchParams({
      prefix,
      maxResults: String(Math.min(256, remaining)),
      fields: "items(name,size),nextPageToken",
      prettyPrint: "false",
      softDeleted: "true",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await fetch(
      `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o?${params}`,
      {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(GCS_TIMEOUT_MS),
      },
    );
    // Buckets with soft delete disabled reject this listing mode.
    if (response.status === 400) return { bytes: 0, records: 0 };
    if (!response.ok) {
      throw new ProfileMediaServerError(
        "Profile media storage is temporarily unavailable.",
        503,
        "STORAGE_UNAVAILABLE",
      );
    }
    const result = (await response.json()) as {
      items?: Array<{ name?: string; size?: string }>;
      nextPageToken?: string;
    };
    for (const item of result.items ?? []) {
      if (!item.name?.startsWith(prefix)) continue;
      records += 1;
      const size = Number(item.size ?? 0);
      if (Number.isSafeInteger(size) && size >= 0) total += size;
    }
    pageToken = result.nextPageToken ?? "";
    if (pageToken && records >= maximumRecords) {
      throw new ProfileMediaServerError(
        "Your profile media retention limit has been reached.",
        409,
        "RECORD_LIMIT",
      );
    }
  } while (pageToken);

  return { bytes: total, records };
}

async function listPoolInventory(
  token: string,
  bucket: string,
  uid: string,
): Promise<PoolInventory> {
  const objects = await listPoolObjects(
    token,
    bucket,
    uid,
    PROFILE_MEDIA_MAX_STORED_GENERATIONS,
  );
  if (objects.length >= PROFILE_MEDIA_MAX_STORED_GENERATIONS) {
    const softDeletedProbe = await listSoftDeletedPoolBytes(
      token,
      bucket,
      uid,
      1,
    );
    if (softDeletedProbe.records > 0) {
      throw new ProfileMediaServerError(
        "Your profile media retention limit has been reached.",
        409,
        "RECORD_LIMIT",
      );
    }
    return {
      objects,
      softDeletedBytes: 0,
      recordCount: objects.length,
    };
  }
  const softDeleted = await listSoftDeletedPoolBytes(
    token,
    bucket,
    uid,
    PROFILE_MEDIA_MAX_STORED_GENERATIONS - objects.length,
  );
  return {
    objects,
    softDeletedBytes: softDeleted.bytes,
    recordCount: objects.length + softDeleted.records,
  };
}

function poolObjectIdentity(
  bucket: string,
  object: Pick<PoolObject, "name" | "generation">,
) {
  return `${bucket}\n${object.name}\n${object.generation}`;
}

function poolIdentityFromMediaUrl(
  uid: string,
  bucket: string,
  mediaUrl: string,
) {
  try {
    const url = new URL(mediaUrl);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "firebasestorage.googleapis.com"
    ) {
      return null;
    }
    const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
    if (!match) return null;
    const urlBucket = decodeURIComponent(match[1]);
    const name = decodeURIComponent(match[2]);
    const generation = url.searchParams.get("generation") ?? "";
    const prefix = poolPrefix(uid);
    if (
      urlBucket !== bucket ||
      !name.startsWith(prefix) ||
      !PROFILE_MEDIA_SLOT.test(name.slice(prefix.length)) ||
      !/^[1-9]\d{0,30}$/.test(generation)
    ) {
      return null;
    }
    return poolObjectIdentity(bucket, { name, generation });
  } catch {
    return null;
  }
}

function collectFirestoreStrings(value: unknown, output: string[]) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) collectFirestoreStrings(item, output);
    return;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.stringValue === "string") {
    output.push(record.stringValue);
    return;
  }
  for (const nested of Object.values(record)) {
    collectFirestoreStrings(nested, output);
  }
}

async function referencedPoolObjects(
  uid: string,
  bucket: string,
): Promise<Set<string>> {
  const response = await firestoreAdminRequest(
    `profiles/${encodeURIComponent(uid)}`,
  );
  if (!response) {
    throw new ProfileMediaServerError(
      "Profile media reconciliation is temporarily unavailable.",
      503,
      "STORAGE_UNAVAILABLE",
    );
  }
  if (response.status === 404) return new Set();
  if (!response.ok) {
    throw new ProfileMediaServerError(
      "Profile media reconciliation is temporarily unavailable.",
      503,
      "STORAGE_UNAVAILABLE",
    );
  }

  let document: unknown;
  try {
    document = await response.json();
  } catch {
    throw new ProfileMediaServerError(
      "Profile media reconciliation returned an invalid profile.",
      503,
      "STORAGE_UNAVAILABLE",
    );
  }
  const strings: string[] = [];
  collectFirestoreStrings(document, strings);
  const identities = new Set<string>();
  for (const value of strings) {
    const identity = poolIdentityFromMediaUrl(uid, bucket, value);
    if (identity) identities.add(identity);
  }
  return identities;
}

async function reconcileAbandonedPoolObjects(
  token: string,
  bucket: string,
  uid: string,
  objects: PoolObject[],
) {
  const cutoff = Date.now() - PROFILE_MEDIA_DRAFT_GRACE_MS;
  const candidates = objects.filter((object) => {
    if (!object.live || !object.timeCreated) return false;
    const createdAt = Date.parse(object.timeCreated);
    const prefix = poolPrefix(uid);
    return (
      Number.isFinite(createdAt) &&
      createdAt <= cutoff &&
      object.name.startsWith(prefix) &&
      PROFILE_MEDIA_SLOT.test(object.name.slice(prefix.length))
    );
  });
  if (candidates.length === 0) return 0;

  // Read immediately before generation-pinned deletion. Objects absent from
  // this authoritative profile and younger draft objects are both retained.
  const referenced = await referencedPoolObjects(uid, bucket);
  const abandoned = candidates.filter(
    (object) => !referenced.has(poolObjectIdentity(bucket, object)),
  );

  let deleted = 0;
  for (let index = 0; index < abandoned.length; index += 10) {
    const results = await Promise.all(
      abandoned
        .slice(index, index + 10)
        .map((object) => deletePoolObject(token, bucket, object)),
    );
    deleted += results.filter(Boolean).length;
  }
  return deleted;
}

function occupiedSlots(uid: string, objects: PoolObject[]) {
  const prefix = poolPrefix(uid);
  const occupied = new Set<string>();
  for (const object of objects) {
    const candidate = object.name.slice(prefix.length);
    if (object.live && PROFILE_MEDIA_SLOT.test(candidate)) occupied.add(candidate);
  }
  return occupied;
}

async function detectedImageContentType(file: File) {
  const bytes = new Uint8Array(
    await file.slice(0, Math.min(file.size, 16)).arrayBuffer(),
  );
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

async function createPoolObject(
  token: string,
  bucket: string,
  uid: string,
  slot: string,
  scope: ProfileMediaScope,
  itemId: string,
  file: File,
  contentType: string,
) {
  const name = `${poolPrefix(uid)}${slot}`;
  const downloadToken = randomUUID();
  const boundary = `socialize-${randomUUID()}`;
  const metadata = JSON.stringify({
    name,
    contentType,
    cacheControl: "public,max-age=31536000,immutable",
    metadata: {
      firebaseStorageDownloadTokens: downloadToken,
      socializeScope: scope,
      socializeItemId: itemId,
    },
  });
  const body = new Blob(
    [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
      metadata,
      `\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`,
      file,
      `\r\n--${boundary}--\r\n`,
    ],
    { type: `multipart/related; boundary=${boundary}` },
  );
  const params = new URLSearchParams({
    uploadType: "multipart",
    ifGenerationMatch: "0",
    prettyPrint: "false",
  });

  const response = await fetch(
    `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?${params}`,
    {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
      signal: AbortSignal.timeout(GCS_TIMEOUT_MS),
    },
  );
  if (response.status === 412) return null;
  if (!response.ok) {
    throw new ProfileMediaServerError(
      "The image could not be stored.",
      503,
      "STORAGE_UNAVAILABLE",
    );
  }

  const object = (await response.json()) as {
    name?: string;
    generation?: string;
  };
  if (
    object.name !== name ||
    typeof object.generation !== "string" ||
    !/^[1-9]\d*$/.test(object.generation)
  ) {
    throw new ProfileMediaServerError(
      "The image upload returned an invalid storage record.",
      503,
      "STORAGE_UNAVAILABLE",
    );
  }

  return {
    name,
    generation: object.generation,
    downloadToken,
  };
}

function firebaseDownloadUrl(
  bucket: string,
  object: {
    name: string;
    generation: string;
    downloadToken: string;
  },
) {
  const url = new URL(
    `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(object.name)}`,
  );
  url.searchParams.set("alt", "media");
  url.searchParams.set("token", object.downloadToken);
  url.searchParams.set("generation", object.generation);
  return url.toString();
}

async function deletePoolObject(
  token: string,
  bucket: string,
  object: ManagedPoolObject,
) {
  const params = new URLSearchParams({ prettyPrint: "false" });
  if (object.generation) {
    params.set("generation", object.generation);
    params.set("ifGenerationMatch", object.generation);
  }
  const response = await fetch(
    `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(object.name)}?${params}`,
    {
      method: "DELETE",
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(GCS_TIMEOUT_MS),
    },
  );

  if (response.ok) return true;
  if (response.status === 404 || response.status === 412) return false;
  throw new ProfileMediaServerError(
    "An uploaded image could not be deleted.",
    503,
    "STORAGE_UNAVAILABLE",
  );
}

/**
 * Creates an immutable object in a fixed per-user pool. Slot allocation uses
 * GCS's create-only generation precondition, so concurrent requests cannot
 * overwrite a published object or claim the same free slot.
 */
export async function storeProfileMedia(
  uid: string,
  scope: ProfileMediaScope,
  itemId: string,
  file: File,
) {
  assertUid(uid);
  if (!isProfileMediaDestination(scope, itemId)) {
    throw new TypeError("Invalid profile media destination.");
  }
  const contentType = normalizedProfileMediaContentType(file.type);
  if (
    !isProfileMediaContentType(file.type) ||
    file.size < 1 ||
    file.size >= PROFILE_MEDIA_MAX_FILE_BYTES
  ) {
    throw new TypeError("Invalid profile media file.");
  }
  if ((await detectedImageContentType(file)) !== contentType) {
    throw new TypeError("The uploaded bytes do not match the image type.");
  }

  const { token, bucket } = await storageCredentials();
  let inventory = await listPoolInventory(token, bucket, uid);
  const reconciled = await reconcileAbandonedPoolObjects(
    token,
    bucket,
    uid,
    inventory.objects,
  );
  if (reconciled > 0) {
    inventory = await listPoolInventory(token, bucket, uid);
  }
  if (
    inventory.recordCount + 1 >
    PROFILE_MEDIA_MAX_STORED_GENERATIONS
  ) {
    throw new ProfileMediaServerError(
      "Your profile media retention limit has been reached.",
      409,
      "RECORD_LIMIT",
    );
  }
  const totalBytes =
    inventory.objects.reduce((total, object) => total + object.size, 0) +
    inventory.softDeletedBytes;
  if (totalBytes + file.size > PROFILE_MEDIA_MAX_TOTAL_BYTES) {
    throw new ProfileMediaServerError(
      "Your profile media storage quota has been reached.",
      413,
      "QUOTA_EXCEEDED",
    );
  }

  const occupied = occupiedSlots(uid, inventory.objects);
  const available = shuffled(
    Array.from({ length: PROFILE_MEDIA_SLOT_COUNT }, (_, slot) => slotName(slot))
      .filter((slot) => !occupied.has(slot)),
  );
  if (available.length === 0) {
    throw new ProfileMediaServerError(
      "Your profile media slot limit has been reached.",
      409,
      "POOL_FULL",
    );
  }

  for (const slot of available) {
    const stored = await createPoolObject(
      token,
      bucket,
      uid,
      slot,
      scope,
      itemId,
      file,
      contentType,
    );
    if (!stored) continue;

    try {
      // Listings are strongly consistent. Recheck after the create so the
      // request that crosses either bound rolls back its own generation.
      const updated = await listPoolInventory(token, bucket, uid);
      const updatedBytes =
        updated.objects.reduce((total, object) => total + object.size, 0) +
        updated.softDeletedBytes;
      if (
        updated.recordCount > PROFILE_MEDIA_MAX_STORED_GENERATIONS ||
        updatedBytes > PROFILE_MEDIA_MAX_TOTAL_BYTES
      ) {
        throw new ProfileMediaServerError(
          "Your profile media storage quota has been reached.",
          413,
          "QUOTA_EXCEEDED",
        );
      }
    } catch (error) {
      // A failed inventory check must not leak an unverified live generation.
      try {
        await deletePoolObject(token, bucket, stored);
      } catch (rollbackError) {
        console.error("Profile media upload rollback failed", {
          uid,
          name: stored.name,
          generation: stored.generation,
          rollbackError,
        });
      }
      throw error;
    }

    return { mediaUrl: firebaseDownloadUrl(bucket, stored) };
  }

  throw new ProfileMediaServerError(
    "Your profile media slot limit has been reached.",
    409,
    "POOL_FULL",
  );
}

function managedObjectFromUrl(
  uid: string,
  bucket: string,
  mediaUrl: string,
  scope: ProfileMediaScope,
  itemId: string,
): ManagedPoolObject | null {
  try {
    const url = new URL(mediaUrl);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "firebasestorage.googleapis.com"
    ) {
      return null;
    }
    const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
    if (!match) return null;
    const urlBucket = decodeURIComponent(match[1]);
    const name = decodeURIComponent(match[2]);
    const generation = url.searchParams.get("generation") ?? "";
    if (
      urlBucket !== bucket ||
      !name.startsWith(`profile-media/${uid}/`)
    ) {
      return null;
    }

    if (name.startsWith(poolPrefix(uid))) {
      const slot = name.slice(poolPrefix(uid).length);
      if (
        !PROFILE_MEDIA_SLOT.test(slot) ||
        !/^[1-9]\d{0,30}$/.test(generation)
      ) {
        return null;
      }
      return { name, generation };
    }

    // Legacy hosted objects were mutable paths. Browser writes to every
    // profile-media path are now denied, so these names cannot be reused after
    // migration and can be safely removed without a historical generation.
    const parts = name.split("/");
    if (
      parts.length !== 5 ||
      parts[0] !== "profile-media" ||
      parts[1] !== uid ||
      (scope !== "links" && scope !== "sections") ||
      parts[2] !== scope ||
      parts[3] !== itemId ||
      !(
        parts[4] === "media" ||
        parts[4] === "media-a" ||
        parts[4] === "media-b" ||
        LEGACY_MEDIA_UUID.test(parts[4])
      )
    ) {
      return null;
    }
    return { name };
  } catch {
    return null;
  }
}

/**
 * Deletes generation-pinned objects from the caller's managed pool, plus
 * exact caller-owned legacy paths during migration. A stale pooled URL becomes
 * a harmless no-op after its slot has been reused.
 */
export async function deleteProfileMedia(
  uid: string,
  items: ProfileMediaDeleteItem[],
) {
  assertUid(uid);
  if (items.length > PROFILE_MEDIA_MAX_DELETE_ITEMS) {
    throw new TypeError("Too many profile media items.");
  }
  const { token, bucket } = await storageCredentials();
  const unique = new Map<string, ManagedPoolObject>();

  for (const item of items) {
    if (
      !isProfileMediaDestination(item.scope, item.itemId) ||
      typeof item.mediaUrl !== "string" ||
      item.mediaUrl.length > 2_048
    ) {
      throw new TypeError("Invalid profile media deletion.");
    }
    const object = managedObjectFromUrl(
      uid,
      bucket,
      item.mediaUrl,
      item.scope,
      item.itemId,
    );
    if (object) {
      unique.set(`${object.name}:${object.generation ?? "legacy"}`, object);
    }
  }

  let deleted = 0;
  const failures: unknown[] = [];
  const objects = [...unique.values()];
  for (let index = 0; index < objects.length; index += 10) {
    const results = await Promise.allSettled(
      objects
        .slice(index, index + 10)
        .map((object) => deletePoolObject(token, bucket, object)),
    );
    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value) deleted += 1;
      } else {
        failures.push(result.reason);
      }
    }
  }
  if (failures.length > 0) throw failures[0];

  return {
    deleted,
    ignored: items.length - deleted,
  };
}
