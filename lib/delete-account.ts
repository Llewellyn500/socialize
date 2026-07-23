import { reauthenticateWithPopup, type User } from "firebase/auth";
import { providerInstance } from "@/lib/auth-linking";
import { type AuthProviderId } from "@/lib/auth-providers";
import { clearProfileDraft } from "@/lib/profile-draft";
import { auth } from "@/lib/firebase";

async function reauthenticateForDeletion(user: User) {
  const oauthId = user.providerData
    .map((entry) => entry.providerId)
    .find(
      (id): id is AuthProviderId => id === "google.com" || id === "github.com",
    );

  // ponytail: OAuth reauth only — password users already proved the session by signing in
  if (!oauthId) return;

  const provider = providerInstance(oauthId);
  if (!provider) {
    throw new Error("Sign out, sign back in, then try deleting your account again.");
  }
  await reauthenticateWithPopup(user, provider);
}

export async function deleteAccount(user: User) {
  if (!auth) throw new Error("Accounts are not configured.");
  if (auth.currentUser?.uid !== user.uid) {
    throw new Error("Sign in again before deleting this account.");
  }

  await reauthenticateForDeletion(user);
  const idToken = await user.getIdToken(true);
  const response = await fetch("/api/account", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(
      payload?.error ||
        "We could not delete the account. It remains active so you can retry.",
    );
  }

  clearProfileDraft(user.uid);

  try {
    window.localStorage.removeItem("socialize-demo-profile");
  } catch {
    // ignore
  }

  // The trusted route removed the Auth user. Clear the now-invalid local
  // session without making account cleanup depend on another network call.
  await auth.signOut().catch(() => undefined);
}
