import {
  firebaseAdminAccessToken,
  firebaseAdminStorageBucket,
  firestoreAdminCommit,
  firestoreAdminDocumentName,
  firestoreAdminRequest,
} from "@/lib/firebase-admin-rest";
import { normalizeHandle } from "@/lib/profile";

type FirestoreValue =
  | { stringValue: string }
  | { timestampValue: string }
  | { integerValue: string }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { mapValue: { fields?: Record<string, FirestoreValue> } }
  | { arrayValue: { values?: FirestoreValue[] } };

type FirestoreDocument = {
  fields?: Record<string, FirestoreValue>;
  updateTime?: string;
};

type StoredDocument = {
  fields: Record<string, FirestoreValue>;
  updateTime?: string;
};

function readString(fields: Record<string, FirestoreValue>, key: string) {
  const value = fields[key];
  return value && "stringValue" in value ? value.stringValue : "";
}

function normalizeStorageBucket(raw: string) {
  return raw
    .trim()
    .replace(/^gs:\/\//i, "")
    .replace(/\/+$/, "");
}

async function loadDocument(path: string): Promise<StoredDocument | null> {
  const response = await firestoreAdminRequest(path);
  if (!response) {
    throw new Error("Firebase account cleanup is not configured.");
  }
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error("Account data could not be checked before deletion.");
  }
  const document = (await response.json()) as FirestoreDocument;
  return {
    fields: document.fields ?? {},
    updateTime: document.updateTime,
  };
}

async function ownedHandleDeleteWrite(handle: string, uid: string) {
  const normalized = normalizeHandle(handle);
  if (!normalized) return null;
  const document = await loadDocument(`handles/${encodeURIComponent(normalized)}`);
  if (!document || readString(document.fields, "uid") !== uid) return null;

  const name = firestoreAdminDocumentName(`handles/${normalized}`);
  if (!name) throw new Error("Firebase account cleanup is not configured.");
  // ponytail: skip updateTime precondition — it was aborting deletes on races
  return { delete: name };
}

async function listStorageObjects(
  token: string,
  bucket: string,
  prefix: string,
) {
  const objects: string[] = [];
  let pageToken = "";

  do {
    const params = new URLSearchParams({ prefix });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await fetch(
      `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o?${params}`,
      {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10_000),
      },
    );
    // Missing bucket / missing Storage IAM must not strand the Auth user.
    if (response.status === 403 || response.status === 404) return [];
    if (!response.ok) {
      throw new Error("Uploaded files could not be checked before deletion.");
    }
    const result = (await response.json()) as {
      items?: Array<{ name?: string }>;
      nextPageToken?: string;
    };
    for (const item of result.items ?? []) {
      if (item.name?.startsWith(prefix)) objects.push(item.name);
    }
    pageToken = result.nextPageToken ?? "";
  } while (pageToken);

  return objects;
}

async function deleteStorageObject(token: string, bucket: string, name: string) {
  const response = await fetch(
    `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(name)}`,
    {
      method: "DELETE",
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (response.status !== 404 && !response.ok) {
    throw new Error("An uploaded file could not be deleted.");
  }
}

async function deleteOwnedStorage(uid: string) {
  const [token, rawBucket] = await Promise.all([
    firebaseAdminAccessToken(),
    Promise.resolve(firebaseAdminStorageBucket()),
  ]);
  const bucket = normalizeStorageBucket(rawBucket);
  if (!token || !bucket) {
    throw new Error("Firebase account cleanup is not configured.");
  }

  const prefixes = [
    `avatars/${uid}/`,
    `og/${uid}/`,
    `profile-media/${uid}/`,
  ];

  let names: string[];
  try {
    names = (
      await Promise.all(
        prefixes.map((prefix) => listStorageObjects(token, bucket, prefix)),
      )
    ).flat();
  } catch (error) {
    // ponytail: prefer finishing Auth/Firestore cleanup over stalling on Storage
    console.error("Account storage listing failed; continuing delete", error);
    return;
  }

  for (let index = 0; index < names.length; index += 10) {
    try {
      await Promise.all(
        names
          .slice(index, index + 10)
          .map((name) => deleteStorageObject(token, bucket, name)),
      );
    } catch (error) {
      console.error("Account storage delete failed; continuing delete", error);
      return;
    }
  }
}

async function deleteFirestoreAccountData(uid: string) {
  const [profile, user] = await Promise.all([
    loadDocument(`profiles/${encodeURIComponent(uid)}`),
    loadDocument(`users/${encodeURIComponent(uid)}`),
  ]);
  const candidateHandles = new Set(
    [
      profile ? readString(profile.fields, "handle") : "",
      user ? readString(user.fields, "profileHandle") : "",
    ]
      .map(normalizeHandle)
      .filter(Boolean),
  );
  const handleWrites = (
    await Promise.all(
      [...candidateHandles].map((handle) => ownedHandleDeleteWrite(handle, uid)),
    )
  ).filter((write): write is NonNullable<typeof write> => Boolean(write));

  const paths = [`profiles/${uid}`, `users/${uid}`, `profileStats/${uid}`];
  const documentWrites = paths.map((path) => {
    const name = firestoreAdminDocumentName(path);
    if (!name) throw new Error("Firebase account cleanup is not configured.");
    return { delete: name };
  });

  const response = await firestoreAdminCommit([
    ...handleWrites,
    ...documentWrites,
  ]);
  if (!response) {
    throw new Error("Firebase account cleanup is not configured.");
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Firestore account commit failed", response.status, detail);
    throw new Error("Account records could not be deleted.");
  }
}

/**
 * Cleanup order: uploaded files first (best-effort), then Firestore records.
 * Firebase Auth is removed client-side with deleteUser() after reauth — the
 * service account often lacks firebaseauth.users.delete (INSUFFICIENT_PERMISSION).
 */
export async function deleteHostedAccount(uid: string) {
  await deleteOwnedStorage(uid);
  await deleteFirestoreAccountData(uid);
}
