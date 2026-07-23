"use client";

import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  deleteField,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { deleteProfileOgImage } from "@/lib/og-image-upload";
import { profileUpdatedAtKey } from "@/lib/profile-draft";
import {
  developerActivityHasVisibleModules,
  normalizeHandle,
  sanitizeProfile,
  type ProfileConfig,
} from "@/lib/profile";

export async function loadProfile(uid: string) {
  if (!db) return null;
  const [profileSnapshot, userSnapshot] = await Promise.all([
    getDoc(doc(db, "profiles", uid)),
    getDoc(doc(db, "users", uid)),
  ]);
  if (!profileSnapshot.exists()) return null;

  const profile = profileSnapshot.data() as ProfileConfig;
  const privateActivity = userSnapshot.exists()
    ? (userSnapshot.data().developerActivity as ProfileConfig["developerActivity"] | undefined)
    : undefined;
  return privateActivity ? { ...profile, developerActivity: privateActivity } : profile;
}

export async function loadPublicProfile(handle: string) {
  if (!db) return null;
  const normalized = normalizeHandle(handle);
  const handleSnapshot = await getDoc(doc(db, "handles", normalized));
  if (!handleSnapshot.exists()) return null;
  const uid = handleSnapshot.data().uid as string;
  const profileSnapshot = await getDoc(doc(db, "profiles", uid));
  if (!profileSnapshot.exists()) return null;
  const profile = profileSnapshot.data() as ProfileConfig;
  return profile.published ? profile : null;
}

/**
 * Returns whether `handle` can be claimed by `ownerUid`.
 * Own current handle counts as available.
 */
export async function isHandleAvailableForUser(handle: string, ownerUid?: string) {
  if (!db) return true;
  const normalized = normalizeHandle(handle);
  if (!normalized) return false;

  const handleSnapshot = await getDoc(doc(db, "handles", normalized));
  if (!handleSnapshot.exists()) return true;
  const existingUid = handleSnapshot.data().uid as string | undefined;
  return Boolean(ownerUid && existingUid === ownerUid);
}

export async function saveProfile(
  uid: string,
  profile: ProfileConfig,
  expectedUpdatedAt?: string,
) {
  const firestore = db;
  if (!firestore) throw new Error("Accounts are not configured.");
  const cleanProfile = sanitizeProfile(profile);
  const {
    developerActivity,
    ogImageUrl: _legacyOgImageUrl,
    ...publicProfile
  } = cleanProfile;
  const handleRef = doc(firestore, "handles", cleanProfile.handle);
  const profileRef = doc(firestore, "profiles", uid);
  const userRef = doc(firestore, "users", uid);

  await runTransaction(firestore, async (transaction) => {
    const [handleSnapshot, profileSnapshot] = await Promise.all([
      transaction.get(handleRef),
      transaction.get(profileRef),
    ]);

    if (handleSnapshot.exists() && handleSnapshot.data().uid !== uid) {
      throw new Error("That handle is already taken.");
    }

    const currentUpdatedAt = profileSnapshot.exists()
      ? profileUpdatedAtKey(profileSnapshot.data() as ProfileConfig)
      : "";
    if (
      expectedUpdatedAt !== undefined &&
      (!profileSnapshot.exists() || currentUpdatedAt !== expectedUpdatedAt)
    ) {
      throw new Error(
        "This profile changed in another tab. Refresh to review the latest version before saving.",
      );
    }

    const previousHandle = profileSnapshot.exists()
      ? (profileSnapshot.data().handle as string | undefined)
      : undefined;

    if (previousHandle && previousHandle !== cleanProfile.handle) {
      transaction.delete(doc(firestore, "handles", previousHandle));
    }

    transaction.set(handleRef, { uid, updatedAt: serverTimestamp() });
    transaction.set(profileRef, {
      ...publicProfile,
      ...(developerActivity?.enabled &&
      developerActivityHasVisibleModules(developerActivity)
        ? { developerActivity }
        : {}),
      ownerUid: uid,
      updatedAt: serverTimestamp(),
    });
    transaction.set(userRef, {
      profileHandle: cleanProfile.handle,
      developerActivity: developerActivity ?? deleteField(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });

  // The handle-specific dynamic image route is the canonical social card.
  // Remove the legacy fixed object without making an otherwise successful save fail.
  void deleteProfileOgImage(uid).catch((error) => {
    console.error("Failed to remove a legacy Open Graph image", error);
  });

  const saved = await loadProfile(uid);
  if (!saved) {
    throw new Error("Your profile saved, but the updated version could not be loaded.");
  }
  return saved;
}
