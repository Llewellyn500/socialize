import { cache } from "react";
import { normalizeHandle, type ProfileConfig } from "@/lib/profile";
import { firestoreAdminRequest } from "@/lib/firebase-admin-rest";

type FirestoreValue =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { timestampValue: string }
  | { nullValue: null }
  | { mapValue: { fields?: Record<string, FirestoreValue> } }
  | { arrayValue: { values?: FirestoreValue[] } };

function readString(fields: Record<string, FirestoreValue> | undefined, key: string) {
  const value = fields?.[key];
  return value && "stringValue" in value ? value.stringValue : undefined;
}

function readBoolean(fields: Record<string, FirestoreValue> | undefined, key: string) {
  const value = fields?.[key];
  return value && "booleanValue" in value ? value.booleanValue : undefined;
}

async function fetchDocument(path: string) {
  try {
    const response = await firestoreAdminRequest(path);

    if (!response) return null;
    if (response.status === 404) return null;
    if (!response.ok) return null;

    const data = (await response.json()) as {
      fields?: Record<string, FirestoreValue>;
    };
    return data.fields ?? null;
  } catch {
    return null;
  }
}

/**
 * Server-side public profile loader using the trusted runtime credential so
 * metadata and no-JavaScript rendering keep working after App Check
 * enforcement. Because Admin requests bypass Security Rules, this loader
 * explicitly returns only a profile whose public handle resolves and whose
 * `published` flag is true.
 */
export const loadPublicProfileServer = cache(async (
  handle: string,
): Promise<ProfileConfig | null> => {
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
});
