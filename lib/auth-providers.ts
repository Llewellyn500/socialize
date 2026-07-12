import {
  getAdditionalUserInfo,
  type User,
  type UserCredential,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isValidGitHubUsername, normalizeGitHubUsername } from "@/lib/profile";

export type AuthProviderId = "password" | "google.com" | "github.com";

export const AUTH_PROVIDER_LABELS: Record<AuthProviderId, string> = {
  password: "Email & password",
  "google.com": "Google",
  "github.com": "GitHub",
};

export function getUserProviderIds(user: User) {
  return user.providerData.map((provider) => provider.providerId as AuthProviderId);
}

export function hasAuthProvider(user: User, providerId: AuthProviderId) {
  return getUserProviderIds(user).includes(providerId);
}

export function primaryAuthEmail(user: User) {
  return user.email ?? user.providerData.find((provider) => provider.email)?.email ?? "";
}

export function githubProviderUserId(user: User | null | undefined) {
  if (!user) return null;
  const github = user.providerData.find((provider) => provider.providerId === "github.com");
  const id = github?.uid?.trim() ?? "";
  return /^\d+$/.test(id) ? id : null;
}

/** True when GitHub is linked (provider present). Does not mean we know the login yet. */
export function hasLinkedGitHub(user: User | null | undefined) {
  return Boolean(user && hasAuthProvider(user, "github.com"));
}

function sanitizeGitHubLogin(raw: string | null | undefined) {
  const login = normalizeGitHubUsername(raw ?? "");
  return isValidGitHubUsername(login) ? login : null;
}

export async function persistGitHubLogin(uid: string, login: string) {
  if (!db) return;
  const sanitized = sanitizeGitHubLogin(login);
  if (!sanitized) return;
  await setDoc(
    doc(db, "users", uid),
    { githubLogin: sanitized, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function loadStoredGitHubLogin(uid: string) {
  if (!db) return null;
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) return null;
  return sanitizeGitHubLogin(snapshot.data().githubLogin as string | undefined);
}

async function fetchGitHubLoginById(githubUserId: string) {
  const response = await fetch(`https://api.github.com/user/${githubUserId}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { login?: string };
  return sanitizeGitHubLogin(data.login);
}

/**
 * Capture GitHub login from a sign-in / link credential.
 * Firebase only exposes the real login here — not on providerData.displayName
 * (which is the profile name, e.g. "Jane Doe").
 */
export async function captureGitHubLoginFromCredential(result: UserCredential) {
  const info = getAdditionalUserInfo(result);
  if (info?.providerId !== "github.com") return null;
  const login = sanitizeGitHubLogin(info.username ?? undefined);
  if (!login) return null;
  await persistGitHubLogin(result.user.uid, login);
  return login;
}

/**
 * Resolve the linked account's GitHub login (username), not display name.
 * Order: stored users.githubLogin → GitHub API by provider uid → persist.
 */
export async function resolveGitHubLogin(user: User | null | undefined) {
  if (!user || !hasLinkedGitHub(user)) return null;

  const stored = await loadStoredGitHubLogin(user.uid);
  if (stored) return stored;

  const githubUserId = githubProviderUserId(user);
  if (!githubUserId) return null;

  const login = await fetchGitHubLoginById(githubUserId);
  if (login) await persistGitHubLogin(user.uid, login);
  return login;
}

export function canUnlinkProvider(user: User, providerId: AuthProviderId) {
  const linked = getUserProviderIds(user);
  return linked.includes(providerId) && linked.length > 1;
}

export function normalizeSignInMethods(methods: string[]) {
  return methods.filter(
    (method): method is AuthProviderId =>
      method === "password" || method === "google.com" || method === "github.com",
  );
}

export function providerLabel(providerId: AuthProviderId) {
  return AUTH_PROVIDER_LABELS[providerId];
}
