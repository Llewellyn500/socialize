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
  return {
    delete: name,
    ...(document.updateTime
      ? { currentDocument: { updateTime: document.updateTime } }
      : {}),
  };
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
  const [token, bucket] = await Promise.all([
    firebaseAdminAccessToken(),
    Promise.resolve(firebaseAdminStorageBucket()),
  ]);
  if (!token || !bucket) {
    throw new Error("Firebase account cleanup is not configured.");
  }

  const prefixes = [
    `avatars/${uid}/`,
    `og/${uid}/`,
    `profile-media/${uid}/`,
  ];
  const names = (
    await Promise.all(
      prefixes.map((prefix) => listStorageObjects(token, bucket, prefix)),
    )
  ).flat();

  // Keep concurrency bounded so a profile with many media items cannot exhaust
  // the route's connections or cause a large burst against Cloud Storage.
  for (let index = 0; index < names.length; index += 10) {
    await Promise.all(
      names
        .slice(index, index + 10)
        .map((name) => deleteStorageObject(token, bucket, name)),
    );
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
  if (!response?.ok) {
    throw new Error("Account records could not be deleted.");
  }
}

async function deleteFirebaseAuthUser(uid: string) {
  const [token, projectId] = await Promise.all([
    firebaseAdminAccessToken(),
    Promise.resolve(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || ""),
  ]);
  if (!token || !projectId) {
    throw new Error("Firebase account cleanup is not configured.");
  }
  const response = await fetch(
    "https://identitytoolkit.googleapis.com/v1/accounts:delete",
    {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ localId: uid, targetProjectId: projectId }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    if (response.status === 404 || payload.includes("USER_NOT_FOUND")) return;
    throw new Error("The sign-in account could not be deleted. Try again.");
  }
}

/**
 * Strict cleanup order: uploaded files first, Firestore records atomically
 * second, and Firebase Auth last. A cleanup failure leaves the user signed in
 * so the operation can be retried safely.
 */
export async function deleteHostedAccount(uid: string) {
  await deleteOwnedStorage(uid);
  await deleteFirestoreAccountData(uid);
  await deleteFirebaseAuthUser(uid);
}
