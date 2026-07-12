import { normalizeHandle, type ProfileConfig } from "@/lib/profile";

type FirestoreValue =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { timestampValue: string }
  | { nullValue: null }
  | { mapValue: { fields?: Record<string, FirestoreValue> } }
  | { arrayValue: { values?: FirestoreValue[] } };

function projectId() {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
}

function readString(fields: Record<string, FirestoreValue> | undefined, key: string) {
  const value = fields?.[key];
  return value && "stringValue" in value ? value.stringValue : undefined;
}

function readBoolean(fields: Record<string, FirestoreValue> | undefined, key: string) {
  const value = fields?.[key];
  return value && "booleanValue" in value ? value.booleanValue : undefined;
}

async function fetchDocument(path: string) {
  const id = projectId();
  if (!id) return null;

  const url = `https://firestore.googleapis.com/v1/projects/${id}/databases/(default)/documents/${path}`;
  const response = await fetch(url, {
    next: { revalidate: 60 },
  });

  if (response.status === 404) return null;
  if (!response.ok) return null;

  const data = (await response.json()) as {
    fields?: Record<string, FirestoreValue>;
  };
  return data.fields ?? null;
}

/**
 * Server-side public profile loader via Firestore REST (unauthenticated).
 * Respects security rules: only published profiles are readable.
 */
export async function loadPublicProfileServer(handle: string): Promise<ProfileConfig | null> {
  const normalized = normalizeHandle(handle);
  if (!normalized) return null;

  const handleFields = await fetchDocument(`handles/${normalized}`);
  if (!handleFields) return null;
  const uid = readString(handleFields, "uid");
  if (!uid) return null;

  const profileFields = await fetchDocument(`profiles/${uid}`);
  if (!profileFields) return null;

  const published = readBoolean(profileFields, "published");
  if (!published) return null;

  const displayName = readString(profileFields, "displayName");
  const role = readString(profileFields, "role");
  const bio = readString(profileFields, "bio");
  const theme = readString(profileFields, "theme");
  const accent = readString(profileFields, "accent");
  const profileHandle = readString(profileFields, "handle") || normalized;

  if (!displayName || role === undefined || bio === undefined || !theme || !accent) {
    return null;
  }

  return {
    handle: profileHandle,
    displayName,
    role,
    bio,
    avatarUrl: readString(profileFields, "avatarUrl"),
    location: readString(profileFields, "location"),
    availability: readString(profileFields, "availability"),
    theme: theme as ProfileConfig["theme"],
    accent,
    published: true,
    socials: {},
    links: [],
    ogImageUrl: readString(profileFields, "ogImageUrl"),
    updatedAt: readString(profileFields, "updatedAt"),
  };
}
