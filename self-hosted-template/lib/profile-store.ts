import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp
} from "firebase/firestore";
import { selfHostedConfig } from "@/profile.config";
import { getFirebaseServices } from "@/lib/firebase";
import { cloneProfile, normalizeProfile } from "@/lib/profile-utils";
import type { Profile } from "@/types/profile";

function storedRevision(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const revision = (value as { revision?: unknown }).revision;
  return typeof revision === "string" ? revision : "";
}

export class ProfileRevisionConflictError extends Error {
  constructor() {
    super(
      "This profile changed in another browser. Review the latest version before publishing again."
    );
    this.name = "ProfileRevisionConflictError";
  }
}

export type SavedProfile = {
  profile: Profile;
  revision: string;
};

export function subscribeToProfile(
  onValue: (profile: Profile, revision: string) => void,
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
      onValue(
        snapshot.exists()
          ? normalizeProfile(snapshot.data(), selfHostedConfig.profile)
          : cloneProfile(selfHostedConfig.profile),
        snapshot.exists() ? storedRevision(snapshot.data()) : ""
      );
    },
    (error) => onError?.(error)
  );
}

export async function saveProfile(
  profile: Profile,
  expectedRevision: string
): Promise<SavedProfile> {
  const services = getFirebaseServices();

  if (!services) {
    throw new Error("Accounts are not configured.");
  }

  const reference = doc(services.db, selfHostedConfig.firestoreDocumentPath);
  const next = normalizeProfile(profile, selfHostedConfig.profile);
  const nextRevision = crypto.randomUUID();

  await runTransaction(services.db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    const currentRevision = snapshot.exists()
      ? storedRevision(snapshot.data())
      : "";

    if (currentRevision !== expectedRevision) {
      throw new ProfileRevisionConflictError();
    }

    transaction.set(reference, {
      ...next,
      revision: nextRevision,
      updatedAt: serverTimestamp()
    });
  });

  return {
    profile: cloneProfile(next),
    revision: nextRevision
  };
}
