import {
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  type User,
} from "firebase/auth";
import { deleteDoc, doc } from "firebase/firestore";
import { deleteObject, listAll, ref, type StorageReference } from "firebase/storage";
import { providerInstance } from "@/lib/auth-linking";
import { type AuthProviderId } from "@/lib/auth-providers";
import { clearProfileDraft } from "@/lib/profile-draft";
import { normalizeHandle } from "@/lib/profile";
import { auth, db, storage } from "@/lib/firebase";

async function deleteStorageTree(folder: StorageReference) {
  const listing = await listAll(folder);
  await Promise.all(listing.items.map((item) => deleteObject(item)));
  await Promise.all(listing.prefixes.map((prefix) => deleteStorageTree(prefix)));
}

async function deleteOwnedStorage(uid: string) {
  const fileStorage = storage;
  if (!fileStorage) return;
  const roots = [`avatars/${uid}`, `og/${uid}`, `profile-media/${uid}`];
  await Promise.all(
    roots.map(async (path) => {
      try {
        await deleteStorageTree(ref(fileStorage, path));
      } catch {
        // Missing folders are fine during account cleanup.
      }
    }),
  );
}

async function reauthenticateForDeletion(user: User, password?: string) {
  const providerIds = user.providerData.map((entry) => entry.providerId);
  const hasPassword = providerIds.includes("password");
  const oauthId = providerIds.find(
    (id): id is AuthProviderId => id === "google.com" || id === "github.com",
  );

  if (hasPassword && user.email) {
    if (!password?.trim()) {
      throw new Error("Enter your password to confirm account deletion.");
    }
    const credential = EmailAuthProvider.credential(user.email, password.trim());
    await reauthenticateWithCredential(user, credential);
    return;
  }

  if (oauthId) {
    const provider = providerInstance(oauthId);
    if (!provider) {
      throw new Error("Sign out, sign back in, then try deleting your account again.");
    }
    await reauthenticateWithPopup(user, provider);
    return;
  }

  throw new Error("Sign out, sign back in, then try deleting your account again.");
}

async function deleteFirestoreAccountData(uid: string, handle: string) {
  if (!db) throw new Error("Accounts are not configured.");
  const normalized = normalizeHandle(handle);
  const deletions = [
    deleteDoc(doc(db, "profiles", uid)),
    deleteDoc(doc(db, "users", uid)),
    deleteDoc(doc(db, "profileStats", uid)),
  ];
  if (normalized) {
    deletions.push(deleteDoc(doc(db, "handles", normalized)));
  }
  const results = await Promise.allSettled(deletions);
  const hardFailure = results.find(
    (result) =>
      result.status === "rejected" &&
      !(
        typeof result.reason === "object" &&
        result.reason &&
        "code" in result.reason &&
        String(result.reason.code).includes("not-found")
      ),
  );
  if (hardFailure && hardFailure.status === "rejected") {
    throw hardFailure.reason;
  }
}

export async function deleteAccount(
  user: User,
  input: { handle: string; password?: string },
) {
  if (!auth) throw new Error("Accounts are not configured.");
  if (auth.currentUser?.uid !== user.uid) {
    throw new Error("Sign in again before deleting this account.");
  }

  await reauthenticateForDeletion(user, input.password);
  await deleteFirestoreAccountData(user.uid, input.handle);
  await deleteOwnedStorage(user.uid);
  clearProfileDraft(user.uid);

  try {
    window.localStorage.removeItem("socialize-demo-profile");
  } catch {
    // ignore
  }

  await deleteUser(user);
}
