import { doc, getDocFromServer } from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  getMetadata,
  listAll,
  ref,
  uploadBytes,
  type StorageReference
} from "firebase/storage";
import { getFirebaseServices } from "@/lib/firebase";
import {
  firebaseStorageObjectIdentity,
  profileMediaIdentity,
  profileMediaIdentityFromPath
} from "@/lib/profile-media-identity";
import { normalizeProfile } from "@/lib/profile-utils";
import { selfHostedConfig } from "@/profile.config";

const ACCEPTED_TYPES = /^image\/(jpeg|jpg|png|webp|gif)$/i;
const MAX_BYTES = 3 * 1024 * 1024;
const ABANDONED_MEDIA_MAX_AGE_MS = 24 * 60 * 60 * 1_000;
const IMMUTABLE_MEDIA_FILE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ProfileMediaScope = "links" | "sections";

function resolveMediaContentType(file: File) {
  if (file.type === "image/jpg") return "image/jpeg";
  if (file.type && ACCEPTED_TYPES.test(file.type)) return file.type;
  return file.type;
}

export function validateProfileMediaFile(file: File) {
  const contentType = resolveMediaContentType(file);
  if (!ACCEPTED_TYPES.test(contentType)) {
    throw new Error("Use a JPEG, PNG, WebP, or GIF image.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Link and heading images must be 3 MB or smaller.");
  }
}

function mediaDirectory(uid: string, scope: ProfileMediaScope, itemId: string) {
  const safeItemId = itemId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  if (!safeItemId) throw new Error("This item needs a valid ID before its image can be changed.");
  return `profile-media/${uid}/${scope}/${safeItemId}/`;
}

function isObjectNotFound(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "storage/object-not-found"
  );
}

function isImmutableOwnedMediaPath(path: string, uid: string) {
  const parts = path.split("/");
  return parts.length === 5 &&
    parts[0] === "profile-media" &&
    parts[1] === uid &&
    (parts[2] === "links" || parts[2] === "sections") &&
    /^[A-Za-z0-9_-]{1,80}$/.test(parts[3]) &&
    IMMUTABLE_MEDIA_FILE.test(parts[4]);
}

async function listMediaObjects(
  directory: StorageReference
): Promise<StorageReference[]> {
  const result = await listAll(directory);
  const nested = await Promise.all(result.prefixes.map(listMediaObjects));
  return [...result.items, ...nested.flat()];
}

export async function uploadProfileMedia(
  scope: ProfileMediaScope,
  itemId: string,
  file: File
) {
  const services = getFirebaseServices();
  const uid = services?.auth.currentUser?.uid;
  if (!services || !uid) throw new Error("Sign in before uploading an image.");

  validateProfileMediaFile(file);
  const contentType = resolveMediaContentType(file);
  const mediaRef = ref(
    services.storage,
    `${mediaDirectory(uid, scope, itemId)}${crypto.randomUUID()}`,
  );
  await uploadBytes(mediaRef, file, {
    contentType,
    cacheControl: "public,max-age=31536000,immutable"
  });
  const downloadUrl = new URL(await getDownloadURL(mediaRef));
  downloadUrl.searchParams.set("v", crypto.randomUUID());
  return downloadUrl.toString();
}

export async function deleteProfileMedia(
  scope: ProfileMediaScope,
  itemId: string,
  mediaUrl?: string
): Promise<void> {
  if (!mediaUrl) return;

  const services = getFirebaseServices();
  const uid = services?.auth.currentUser?.uid;
  if (!services || !uid) throw new Error("Sign in before removing an image.");
  const directory = mediaDirectory(uid, scope, itemId);
  const identity = firebaseStorageObjectIdentity(mediaUrl);
  const currentBucket = ref(services.storage).bucket.toLowerCase();
  const objectPath = identity?.bucket === currentBucket
    ? identity.objectPath
    : "";
  const fileName = objectPath.startsWith(directory)
    ? objectPath.slice(directory.length)
    : "";
  if (
    fileName !== "media" &&
    fileName !== "media-a" &&
    fileName !== "media-b" &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fileName)
  ) {
    return;
  }

  try {
    await deleteObject(ref(services.storage, objectPath));
  } catch (error) {
    if (isObjectNotFound(error)) return;
    throw error;
  }
}

export async function reconcileProfileMedia(
  pendingMediaUrls: Iterable<string> = []
): Promise<void> {
  const services = getFirebaseServices();
  const uid = services?.auth.currentUser?.uid;
  if (!services || !uid) throw new Error("Sign in before cleaning up images.");

  const profileReference = doc(
    services.db,
    selfHostedConfig.firestoreDocumentPath
  );
  const profileSnapshot = await getDocFromServer(profileReference);
  const currentProfile = profileSnapshot.exists()
    ? normalizeProfile(profileSnapshot.data(), selfHostedConfig.profile)
    : selfHostedConfig.profile;
  const retainedMedia = new Set(
    [
      ...currentProfile.links.map((item) => item.mediaUrl),
      ...currentProfile.sections.map((item) => item.mediaUrl),
      ...pendingMediaUrls
    ]
      .map(profileMediaIdentity)
      .filter(Boolean)
  );
  const objects = await listMediaObjects(
    ref(services.storage, `profile-media/${uid}`)
  );
  const cutoff = Date.now() - ABANDONED_MEDIA_MAX_AGE_MS;

  for (let offset = 0; offset < objects.length; offset += 8) {
    const batch = objects.slice(offset, offset + 8);
    const results = await Promise.allSettled(
      batch.map(async (object) => {
        if (!isImmutableOwnedMediaPath(object.fullPath, uid)) return;
        if (
          retainedMedia.has(
            profileMediaIdentityFromPath(object.bucket, object.fullPath)
          )
        ) {
          return;
        }

        const metadata = await getMetadata(object);
        const createdAt = Date.parse(metadata.timeCreated);
        if (!Number.isFinite(createdAt) || createdAt > cutoff) return;

        try {
          await deleteObject(object);
        } catch (error) {
          if (!isObjectNotFound(error)) throw error;
        }
      })
    );

    for (const result of results) {
      if (result.status === "rejected") {
        console.error("Failed to reconcile abandoned profile media", result.reason);
      }
    }
  }
}
