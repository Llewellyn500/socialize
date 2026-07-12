import type { ProfileConfig } from "@/lib/profile";

export type ProfileDraft = {
  savedAt: string;
  baseUpdatedAt: string;
  profile: ProfileConfig;
};

function draftKey(uid: string) {
  return `socialize-profile-draft:${uid}`;
}

export function profileUpdatedAtKey(profile: ProfileConfig) {
  const value = profile.updatedAt;
  if (!value) return "";
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return "";
    }
  }
  return String(value);
}

function stableProfileJson(profile: ProfileConfig) {
  const { updatedAt: _ignored, ...rest } = profile;
  return JSON.stringify(rest);
}

export function profilesMatch(a: ProfileConfig, b: ProfileConfig) {
  return stableProfileJson(a) === stableProfileJson(b);
}

export function readProfileDraft(uid: string): ProfileDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProfileDraft;
    if (!parsed?.profile || typeof parsed.profile !== "object") return null;
    if (typeof parsed.savedAt !== "string") return null;
    if (typeof parsed.baseUpdatedAt !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeProfileDraft(
  uid: string,
  profile: ProfileConfig,
  baseUpdatedAt: string,
) {
  if (typeof window === "undefined") return;
  const payload: ProfileDraft = {
    savedAt: new Date().toISOString(),
    baseUpdatedAt,
    profile,
  };
  try {
    window.localStorage.setItem(draftKey(uid), JSON.stringify(payload));
  } catch {
    // Quota / private mode — ignore.
  }
}

export function clearProfileDraft(uid: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(draftKey(uid));
  } catch {
    // ignore
  }
}

/** Prefer a browser draft when it still matches the loaded server revision. */
export function resolveProfileWithDraft(
  uid: string,
  serverProfile: ProfileConfig,
): { profile: ProfileConfig; restoredDraft: boolean; baseUpdatedAt: string } {
  const baseUpdatedAt = profileUpdatedAtKey(serverProfile);
  const draft = readProfileDraft(uid);

  if (
    draft &&
    draft.baseUpdatedAt === baseUpdatedAt &&
    !profilesMatch(draft.profile, serverProfile)
  ) {
    return {
      profile: draft.profile,
      restoredDraft: true,
      baseUpdatedAt,
    };
  }

  if (draft && draft.baseUpdatedAt !== baseUpdatedAt) {
    clearProfileDraft(uid);
  }

  return {
    profile: serverProfile,
    restoredDraft: false,
    baseUpdatedAt,
  };
}
