import { createSign } from "node:crypto";

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id?: string;
  token_uri?: string;
};

type AccessToken = {
  value: string;
  expiresAt: number;
};

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const TOKEN_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const TOKEN_REFRESH_MARGIN_MS = 60_000;

const globalState = globalThis as typeof globalThis & {
  __socializeFirestoreAccessToken?: AccessToken;
};

function base64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function serviceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
    if (!parsed.client_email || !parsed.private_key) return null;
    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key.replace(/\\n/g, "\n"),
      project_id: parsed.project_id,
      token_uri: parsed.token_uri || TOKEN_ENDPOINT,
    } satisfies ServiceAccount;
  } catch {
    return null;
  }
}

function projectId(account: ServiceAccount) {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || account.project_id || "";
}

async function accessToken(account: ServiceAccount) {
  const cached = globalState.__socializeFirestoreAccessToken;
  if (cached && cached.expiresAt > Date.now() + TOKEN_REFRESH_MARGIN_MS) {
    return cached.value;
  }

  const now = Math.floor(Date.now() / 1_000);
  const unsignedToken = [
    base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" })),
    base64Url(
      JSON.stringify({
        iss: account.client_email,
        scope: TOKEN_SCOPE,
        aud: account.token_uri || TOKEN_ENDPOINT,
        iat: now,
        exp: now + 3_600,
      }),
    ),
  ].join(".");

  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const assertion = `${unsignedToken}.${base64Url(signer.sign(account.private_key))}`;

  const response = await fetch(account.token_uri || TOKEN_ENDPOINT, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return null;

  const result = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!result.access_token) return null;

  globalState.__socializeFirestoreAccessToken = {
    value: result.access_token,
    expiresAt: Date.now() + Math.max(60, result.expires_in ?? 3_600) * 1_000,
  };
  return result.access_token;
}

/**
 * Sends a Firestore REST request with a server-only service account. This is
 * deliberately separate from browser Firebase credentials: use it only for
 * writes that must not be exposed through client security rules.
 */
export async function firestoreAdminRequest(
  path: string,
  init: RequestInit = {},
): Promise<Response | null> {
  const account = serviceAccount();
  const id = account ? projectId(account) : "";
  if (!account || !id) return null;

  const token = await accessToken(account);
  if (!token) return null;

  try {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return await fetch(
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(id)}/databases/(default)/documents/${path.replace(/^\/+/, "")}`,
      {
        ...init,
        cache: "no-store",
        headers,
        signal: init.signal ?? AbortSignal.timeout(8_000),
      },
    );
  } catch {
    return null;
  }
}

export function firestoreAdminDocumentName(path: string) {
  const account = serviceAccount();
  const id = account ? projectId(account) : "";
  if (!id) return "";
  return `projects/${id}/databases/(default)/documents/${path.replace(/^\/+/, "")}`;
}

export async function firestoreAdminCommit(writes: unknown[]) {
  const account = serviceAccount();
  const id = account ? projectId(account) : "";
  if (!account || !id) return null;

  const token = await accessToken(account);
  if (!token) return null;

  try {
    return await fetch(
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(id)}/databases/(default)/documents:commit`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ writes }),
        signal: AbortSignal.timeout(8_000),
      },
    );
  } catch {
    return null;
  }
}

export function isFirebaseAppCheckConfigured() {
  return Boolean(
    isFirestoreAdminConfigured() &&
      process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY?.trim(),
  );
}

/**
 * Verifies and consumes a limited-use App Check token before an anonymous
 * browser request can reach a privileged Firestore operation.
 */
export async function verifyFirebaseAppCheckToken(token: string) {
  const account = serviceAccount();
  const id = account ? projectId(account) : "";
  if (!account || !id || token.length < 32 || token.length > 12_000) return false;

  const accessTokenValue = await accessToken(account);
  if (!accessTokenValue) return false;

  try {
    const response = await fetch(
      `https://firebaseappcheck.googleapis.com/v1beta/projects/${encodeURIComponent(id)}:verifyAppCheckToken`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${accessTokenValue}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ appCheckToken: token }),
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!response.ok) return false;
    const result = (await response.json()) as { alreadyConsumed?: boolean };
    return result.alreadyConsumed !== true;
  } catch {
    return false;
  }
}

export function isFirestoreAdminConfigured() {
  const account = serviceAccount();
  return Boolean(account && projectId(account));
}
