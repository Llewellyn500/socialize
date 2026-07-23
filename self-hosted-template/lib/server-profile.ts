import "server-only";

import { cache } from "react";
import { selfHostedConfig } from "@/profile.config";
import { cloneProfile, normalizeProfile } from "@/lib/profile-utils";
import type { Profile } from "@/types/profile";

type FirestoreValue = {
  nullValue?: null;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  timestampValue?: string;
  stringValue?: string;
  bytesValue?: string;
  referenceValue?: string;
  geoPointValue?: { latitude?: number; longitude?: number };
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
};

type FirestoreDocument = {
  fields?: Record<string, FirestoreValue>;
};

function decodeFirestoreValue(value: FirestoreValue): unknown {
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("stringValue" in value) return value.stringValue;
  if ("bytesValue" in value) return value.bytesValue;
  if ("referenceValue" in value) return value.referenceValue;
  if ("geoPointValue" in value) return value.geoPointValue;
  if ("arrayValue" in value) {
    return (value.arrayValue?.values ?? []).map(decodeFirestoreValue);
  }
  if ("mapValue" in value) {
    return decodeFirestoreFields(value.mapValue?.fields ?? {});
  }
  return undefined;
}

function decodeFirestoreFields(fields: Record<string, FirestoreValue>) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)])
  );
}

function publicDocumentUrl(): string {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!projectId) return "";

  const documentPath = selfHostedConfig.firestoreDocumentPath
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  const base =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}` +
    `/databases/(default)/documents/${documentPath}`;

  return base;
}

/**
 * Uses Firestore's Rules-aware REST API so the initial HTML, metadata, social
 * images, and hydrated page all begin with the profile saved by /manage.
 */
export const getServerProfile = cache(async (): Promise<Profile> => {
  const url = publicDocumentUrl();
  if (!url) return cloneProfile(selfHostedConfig.profile);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5_000)
    });
    if (!response.ok) return cloneProfile(selfHostedConfig.profile);

    const document = await response.json() as FirestoreDocument;
    return normalizeProfile(
      decodeFirestoreFields(document.fields ?? {}),
      selfHostedConfig.profile
    );
  } catch {
    return cloneProfile(selfHostedConfig.profile);
  }
});
