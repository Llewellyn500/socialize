export type FirebaseIdentity = {
  uid: string;
  emailVerified: boolean;
};

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

/**
 * Verifies a Firebase ID token through the Identity Toolkit endpoint. This is
 * intentionally useful in Edge routes, where the Node Firebase Admin SDK is
 * not available. The Firebase Web API key identifies the project; the signed
 * ID token remains the authentication credential.
 */
export async function verifyFirebaseRequest(
  request: Request,
): Promise<FirebaseIdentity | null> {
  const idToken = bearerToken(request);
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!idToken || !apiKey) return null;

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
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
    };
  } catch {
    return null;
  }
}
