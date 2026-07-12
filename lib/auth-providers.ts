import type { User } from "firebase/auth";

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
