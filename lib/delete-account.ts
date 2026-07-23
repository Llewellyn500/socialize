import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  type User,
  type UserCredential,
} from "firebase/auth";
import { providerInstance } from "@/lib/auth-linking";
import { type AuthProviderId } from "@/lib/auth-providers";
import { clearProfileDraft } from "@/lib/profile-draft";
import { auth } from "@/lib/firebase";

const MAX_AUTH_AGE_SECONDS = 5 * 60;

async function freshIdToken(user: User) {
  const tokenResult = await user.getIdTokenResult(true);
  const authTimeMs = Date.parse(tokenResult.authTime);
  if (!Number.isFinite(authTimeMs)) {
    throw new Error("Sign out, sign back in, then try deleting your account again.");
  }
  const ageSeconds = (Date.now() - authTimeMs) / 1000;
  if (ageSeconds > MAX_AUTH_AGE_SECONDS) {
    throw new Error(
      "For security, confirm your identity again, then retry deleting your account.",
    );
  }
  return tokenResult.token;
}

async function reauthenticateForDeletion(
  user: User,
  password?: string,
): Promise<User> {
  const providerIds = user.providerData.map((entry) => entry.providerId);
  const oauthId = providerIds.find(
    (id): id is AuthProviderId => id === "google.com" || id === "github.com",
  );

  // Prefer OAuth when linked — password may be unknown to the user.
  if (oauthId) {
    const provider = providerInstance(oauthId);
    if (!provider) {
      throw new Error("Sign out, sign back in, then try deleting your account again.");
    }
    const result: UserCredential = await reauthenticateWithPopup(user, provider);
    return result.user;
  }

  if (providerIds.includes("password") && user.email) {
    if (!password) {
      throw new Error("Enter your password to confirm account deletion.");
    }
    // Passwords are opaque credentials. Leading/trailing whitespace can be
    // intentional and must not be changed before reauthentication.
    const credential = EmailAuthProvider.credential(user.email, password);
    const result = await reauthenticateWithCredential(user, credential);
    return result.user;
  }

  throw new Error("Sign out, sign back in, then try deleting your account again.");
}

export async function deleteAccount(
  user: User,
  input: { password?: string } = {},
) {
  if (!auth) throw new Error("Accounts are not configured.");
  if (auth.currentUser?.uid !== user.uid) {
    throw new Error("Sign in again before deleting this account.");
  }

  const reauthenticated = await reauthenticateForDeletion(user, input.password);
  const idToken = await freshIdToken(reauthenticated);
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
