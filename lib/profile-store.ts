"use client";

import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
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

export async function saveProfile(uid: string, profile: ProfileConfig) {
  const firestore = db;
  if (!firestore) throw new Error("Firebase is not configured.");
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

    if (previousHandle && previousHandle !== cleanProfile.handle) {
      transaction.delete(doc(firestore, "handles", previousHandle));
    }

    transaction.set(handleRef, { uid, updatedAt: serverTimestamp() });
    transaction.set(profileRef, {
      ...cleanProfile,
      ownerUid: uid,
      updatedAt: serverTimestamp(),
    });
  });

  await setDoc(
    doc(firestore, "users", uid),
    { profileHandle: cleanProfile.handle, updatedAt: serverTimestamp() },
    { merge: true },
  );

  return cleanProfile;
}
