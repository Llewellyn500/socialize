import { firebaseAdminAccessToken } from "@/lib/firebase-admin-rest";

export type FirebaseIdentity = {
  uid: string;
  emailVerified: boolean;
  authTime: number | null;
};

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function authTimeFromVerifiedToken(idToken: string) {
  try {
    const payload = idToken.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { auth_time?: unknown };
    const authTime = Number(decoded.auth_time);
    return Number.isFinite(authTime) ? Math.trunc(authTime) : null;
  } catch {
    return null;
  }
}

export function firebaseBearerToken(request: Request) {
  return bearerToken(request);
}

/**
 * Verifies a Firebase ID token through Identity Toolkit using the production
 * service account. This avoids coupling trusted server routes to browser
 * API-key referrer restrictions.
 */
export async function verifyFirebaseRequest(
  request: Request,
): Promise<FirebaseIdentity | null> {
  const idToken = bearerToken(request);
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!idToken || !projectId) return null;

  try {
    const accessToken = await firebaseAdminAccessToken();
    if (!accessToken) return null;
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/accounts:lookup`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!response.ok) return null;

    const data = (await response.json()) as {
      users?: Array<{ localId?: string; emailVerified?: boolean }>;
    };
    const user = data.users?.[0];
    if (!user?.localId) return null;
    return {
      uid: user.localId,
      emailVerified: Boolean(user.emailVerified),
      // accounts:lookup above validates the token signature, issuer, audience,
      // and expiry before we inspect its standard auth_time claim.
      authTime: authTimeFromVerifiedToken(idToken),
    };
  } catch {
    return null;
  }
}
