import { NextResponse } from "next/server";
import {
  firestoreAdminCommit,
  firestoreAdminDocumentName,
  firestoreAdminRequest,
  isFirebaseAppCheckConfigured,
  verifyFirebaseAppCheckToken,
} from "@/lib/firebase-admin-rest";
import {
  consumeRequestRateLimit,
  NO_STORE_CACHE_CONTROL,
  requestRateLimitHeaders,
} from "@/lib/request-safety";

export const runtime = "nodejs";

type FirestoreValue =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { mapValue: { fields?: Record<string, FirestoreValue> } }
  | { arrayValue: { values?: FirestoreValue[] } };

type ClickKind = "link" | "social";
type ClickRequest = { handle: string; targetId: string; kind: ClickKind };

const CLICK_RATE_LIMIT = {
  namespace: "profile-click",
  limit: 20,
  windowMs: 60_000,
} as const;
const HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TARGET_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;
const SOCIAL_KEYS = new Set([
  "github", "gitlab", "linkedin", "x", "youtube", "instagram", "tiktok",
  "facebook", "threads", "bluesky", "mastodon", "discord", "twitch",
  "reddit", "medium", "hashnode", "devto", "stackoverflow", "codepen",
  "codesandbox", "dribbble", "behance", "figma", "npm", "producthunt",
  "telegram", "whatsapp", "spotify", "soundcloud", "apple_music",
  "patreon", "kofi", "buymeacoffee", "calendly", "calcom", "email", "website",
]);

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin") || request.headers.get("referer");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function appCheckToken(request: Request) {
  return request.headers.get("x-firebase-appcheck")?.trim() || "";
}

function stringValue(fields: Record<string, FirestoreValue> | undefined, key: string) {
  const value = fields?.[key];
  return value && "stringValue" in value ? value.stringValue : "";
}

function booleanValue(fields: Record<string, FirestoreValue> | undefined, key: string) {
  const value = fields?.[key];
  return Boolean(value && "booleanValue" in value && value.booleanValue);
}

function mapFields(value: FirestoreValue | undefined) {
  return value && "mapValue" in value ? value.mapValue.fields ?? {} : {};
}

function isValidClickRequest(value: unknown): value is ClickRequest {
  if (!value || typeof value !== "object") return false;
  const input = value as Partial<ClickRequest>;
  return (
    typeof input.handle === "string" &&
    HANDLE_PATTERN.test(input.handle) &&
    input.handle.length >= 3 &&
    input.handle.length <= 30 &&
    typeof input.targetId === "string" &&
    TARGET_PATTERN.test(input.targetId) &&
    (input.kind === "link" || input.kind === "social")
  );
}

async function documentFields(path: string) {
  const response = await firestoreAdminRequest(path);
  if (response?.status === 404) return null;
  if (!response?.ok) return undefined;
  const document = (await response.json()) as { fields?: Record<string, FirestoreValue> };
  return document.fields ?? {};
}

function profileHasTarget(
  fields: Record<string, FirestoreValue>,
  input: ClickRequest,
) {
  if (!booleanValue(fields, "published")) return false;

  if (input.kind === "social") {
    if (!SOCIAL_KEYS.has(input.targetId)) return false;
    return Boolean(stringValue(mapFields(fields.socials), input.targetId));
  }

  const links = fields.links;
  if (!links || !("arrayValue" in links)) return false;
  return (links.arrayValue.values ?? []).some((entry) => {
    const link = mapFields(entry);
    return (
      stringValue(link, "id") === input.targetId &&
      booleanValue(link, "enabled") &&
      Boolean(stringValue(link, "url"))
    );
  });
}

function errorResponse(
  error: string,
  status: 400 | 401 | 403 | 413 | 429 | 500 | 503,
  headers: Record<string, string>,
) {
  return NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": NO_STORE_CACHE_CONTROL, ...headers } },
  );
}

/**
 * Rate-limited, server-owned click aggregation. Firestore rules deny browser
 * writes to profileStats so counts cannot be fabricated through the SDK.
 */
export async function POST(request: Request) {
  if (!isFirebaseAppCheckConfigured()) {
    // Analytics remains optional until App Check is configured and its token
    // verifier role is granted to the server account.
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": NO_STORE_CACHE_CONTROL } });
  }

  const token = appCheckToken(request);
  if (!token) return new NextResponse(null, { status: 204, headers: { "Cache-Control": NO_STORE_CACHE_CONTROL } });

  const rateLimit = consumeRequestRateLimit(request, CLICK_RATE_LIMIT);
  const rateHeaders = requestRateLimitHeaders(rateLimit);
  if (!rateLimit.allowed) {
    return errorResponse(
      "Too many click events. Try again shortly.",
      429,
      { "Retry-After": String(rateLimit.retryAfter), ...rateHeaders },
    );
  }
  if (!sameOrigin(request)) return errorResponse("Invalid request origin.", 403, rateHeaders);

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 1_024) {
    return errorResponse("Click payload is too large.", 413, rateHeaders);
  }

  if (!(await verifyFirebaseAppCheckToken(token))) {
    return errorResponse("Invalid application attestation.", 401, rateHeaders);
  }

  try {
    const body = (await request.json()) as unknown;
    if (!isValidClickRequest(body)) {
      return errorResponse("Invalid click payload.", 400, rateHeaders);
    }

    const handleFields = await documentFields(`handles/${encodeURIComponent(body.handle)}`);
    const uid = handleFields ? stringValue(handleFields, "uid") : "";
    if (!uid) return new NextResponse(null, { status: 204, headers: rateHeaders });

    const profileFields = await documentFields(`profiles/${encodeURIComponent(uid)}`);
    if (!profileFields || !profileHasTarget(profileFields, body)) {
      return new NextResponse(null, { status: 204, headers: rateHeaders });
    }

    const documentName = firestoreAdminDocumentName(`profileStats/${encodeURIComponent(uid)}`);
    if (!documentName) {
      return errorResponse("Click analytics is temporarily unavailable.", 503, rateHeaders);
    }
    const bucket = body.kind === "link" ? "links" : "socials";
    const targetPath = `${bucket}.\`${body.targetId}\``;
    const response = await firestoreAdminCommit([
      {
        update: {
          name: documentName,
          fields: { handle: { stringValue: body.handle } },
        },
        updateMask: { fieldPaths: ["handle"] },
        updateTransforms: [
          { fieldPath: "totalClicks", increment: { integerValue: "1" } },
          { fieldPath: `${targetPath}.clicks`, increment: { integerValue: "1" } },
          { fieldPath: `${targetPath}.lastClickAt`, setToServerValue: "REQUEST_TIME" },
          { fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" },
        ],
      },
    ]);
    if (!response?.ok) {
      return errorResponse("Click analytics is temporarily unavailable.", 503, rateHeaders);
    }

    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": NO_STORE_CACHE_CONTROL, ...rateHeaders },
    });
  } catch {
    return errorResponse("Click analytics is temporarily unavailable.", 500, rateHeaders);
  }
}
