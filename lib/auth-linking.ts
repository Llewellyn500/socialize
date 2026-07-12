import {
  EmailAuthProvider,
  GithubAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  linkWithPopup,
  type AuthCredential,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import type { AuthProviderId } from "@/lib/auth-providers";

export type PendingProviderLink = {
  email: string;
  methods: AuthProviderId[];
  pendingCredential: AuthCredential | null;
};

export function googleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

export function githubProvider() {
  const provider = new GithubAuthProvider();
  provider.addScope("read:user");
  return provider;
}

export function providerInstance(providerId: AuthProviderId) {
  if (providerId === "google.com") return googleProvider();
  if (providerId === "github.com") return githubProvider();
  return null;
}

export function credentialFromAuthError(error: unknown) {
  const firebaseError = error as Parameters<typeof GoogleAuthProvider.credentialFromError>[0];
  return (
    GoogleAuthProvider.credentialFromError(firebaseError) ??
    GithubAuthProvider.credentialFromError(firebaseError) ??
    OAuthProvider.credentialFromError(firebaseError)
  );
}

export async function readPendingProviderLink(error: unknown): Promise<PendingProviderLink | null> {
  const firebaseAuth = auth;
  if (!firebaseAuth) return null;

  const code =
    typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (
    code !== "auth/account-exists-with-different-credential" &&
    code !== "auth/email-already-in-use"
  ) {
    return null;
  }

  const customData =
    typeof error === "object" && error && "customData" in error
      ? (error.customData as { email?: string })
      : undefined;
  const email = customData?.email?.trim();
  if (!email) return null;

  const methods = (await fetchSignInMethodsForEmail(firebaseAuth, email)).filter(
    (method): method is AuthProviderId =>
      method === "password" || method === "google.com" || method === "github.com",
  );

  if (methods.length === 0) return null;

  return {
    email,
    methods,
    pendingCredential: credentialFromAuthError(error),
  };
}

export async function linkGoogle(user: User) {
  return linkWithPopup(user, googleProvider());
}

export async function linkGithub(user: User) {
  return linkWithPopup(user, githubProvider());
}

export async function linkEmailPassword(user: User, email: string, password: string) {
  const credential = EmailAuthProvider.credential(email.trim(), password);
  return linkWithCredential(user, credential);
}

export async function signInAndLinkPendingCredential(
  providerId: AuthProviderId,
  pendingCredential: AuthCredential | null,
  emailPassword?: { email: string; password: string },
) {
  const firebaseAuth = auth;
  if (!firebaseAuth) throw new Error("Accounts are not configured.");

  const { signInWithEmailAndPassword, signInWithPopup } = await import("firebase/auth");

  if (providerId === "password") {
    if (!emailPassword) throw new Error("Email and password are required.");
    await signInWithEmailAndPassword(
      firebaseAuth,
      emailPassword.email.trim(),
      emailPassword.password,
    );
  } else {
    const provider = providerInstance(providerId);
    if (!provider) throw new Error("Unsupported sign-in provider.");
    await signInWithPopup(firebaseAuth, provider);
  }

  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) throw new Error("Sign-in did not complete.");

  if (pendingCredential) {
    await linkWithCredential(currentUser, pendingCredential);
  } else if (emailPassword) {
    await linkEmailPassword(currentUser, emailPassword.email, emailPassword.password);
  }

  return currentUser;
}

export async function linkEmailPasswordAfterSignIn(email: string, password: string) {
  const firebaseAuth = auth;
  if (!firebaseAuth?.currentUser) throw new Error("Sign in before linking a password.");
  return linkEmailPassword(firebaseAuth.currentUser, email, password);
}
