"use client";

import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteField,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadProfileOgImage } from "@/lib/og-image-upload";
import {
  normalizeHandle,
  sanitizeProfile,
  type ProfileConfig,
} from "@/lib/profile";

export async function loadProfile(uid: string) {
  if (!db) return null;
  const snapshot = await getDoc(doc(db, "profiles", uid));
  return snapshot.exists() ? (snapshot.data() as ProfileConfig) : null;
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

async function regenerateOgImage(uid: string, profile: ProfileConfig) {
  if (!profile.published) {
    if (!db) return profile;
    try {
      await updateDoc(doc(db, "profiles", uid), {
        ogImageUrl: deleteField(),
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Non-fatal: profile save already succeeded.
    }
    const { ogImageUrl: _removed, ...rest } = profile;
    return rest;
  }

  const response = await fetch("/api/og-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      profile: {
        handle: profile.handle,
        displayName: profile.displayName,
        role: profile.role,
        bio: profile.bio,
        accent: profile.accent,
        avatarUrl: profile.avatarUrl,
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Open Graph image generation failed.");
  }

  const blob = await response.blob();
  const ogImageUrl = await uploadProfileOgImage(uid, blob);

  if (db) {
    await updateDoc(doc(db, "profiles", uid), {
      ogImageUrl,
      updatedAt: serverTimestamp(),
    });
  }

  return { ...profile, ogImageUrl };
}

export async function saveProfile(uid: string, profile: ProfileConfig) {
  const firestore = db;
  if (!firestore) throw new Error("Accounts are not configured.");
  const cleanProfile = sanitizeProfile(profile);
  const handleRef = doc(firestore, "handles", cleanProfile.handle);
  const profileRef = doc(firestore, "profiles", uid);

  await runTransaction(firestore, async (transaction) => {
    const [handleSnapshot, profileSnapshot] = await Promise.all([
      transaction.get(handleRef),
      transaction.get(profileRef),
    ]);

    if (handleSnapshot.exists() && handleSnapshot.data().uid !== uid) {
      throw new Error("That handle is already taken.");
    }

    const previousHandle = profileSnapshot.exists()
      ? (profileSnapshot.data().handle as string | undefined)
      : undefined;
    const previousOgImageUrl = profileSnapshot.exists()
      ? (profileSnapshot.data().ogImageUrl as string | undefined)
      : undefined;

    if (previousHandle && previousHandle !== cleanProfile.handle) {
      transaction.delete(doc(firestore, "handles", previousHandle));
    }

    transaction.set(handleRef, { uid, updatedAt: serverTimestamp() });
    transaction.set(profileRef, {
      ...cleanProfile,
      ownerUid: uid,
      updatedAt: serverTimestamp(),
      ...(cleanProfile.published && previousOgImageUrl
        ? { ogImageUrl: previousOgImageUrl }
        : {}),
    });  });

  await setDoc(
    doc(firestore, "users", uid),
    { profileHandle: cleanProfile.handle, updatedAt: serverTimestamp() },
    { merge: true },
  );

  try {
    return await regenerateOgImage(uid, cleanProfile);
  } catch (error) {
    console.error("Failed to regenerate profile Open Graph image", error);
    return cleanProfile;
  }
}
