import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { selfHostedConfig } from "@/profile.config";
import { getFirebaseServices } from "@/lib/firebase";
import { cloneProfile, normalizeProfile } from "@/lib/profile-utils";
import type { Profile } from "@/types/profile";

export function subscribeToProfile(
  onValue: (profile: Profile) => void,
  onError?: (error: Error) => void
): () => void {
  const services = getFirebaseServices();

  if (!services) {
    return () => undefined;
  }

  const reference = doc(services.db, selfHostedConfig.firestoreDocumentPath);

  return onSnapshot(
    reference,
    (snapshot) => {
      if (snapshot.exists()) {
        onValue(normalizeProfile(snapshot.data(), selfHostedConfig.profile));
      }
    },
    (error) => onError?.(error)
  );
}

export async function saveProfile(profile: Profile): Promise<void> {
  const services = getFirebaseServices();

  if (!services) {
    throw new Error("Accounts are not configured.");
  }

  const reference = doc(services.db, selfHostedConfig.firestoreDocumentPath);
  await setDoc(reference, {
    ...cloneProfile(profile),
    updatedAt: serverTimestamp()
  });
}
