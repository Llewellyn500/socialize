import { NextResponse } from "next/server";
import {
  isFirebaseAppCheckConfigured,
  verifyFirebaseAppCheckToken,
} from "@/lib/firebase-admin-rest";
import { verifyFirebaseRequest } from "@/lib/firebase-auth-server";
import {
  deleteProfileMedia,
  isProfileMediaContentType,
  isProfileMediaDestination,
  isProfileMediaItemId,
  isProfileMediaScope,
  PROFILE_MEDIA_MAX_DELETE_ITEMS,
  PROFILE_MEDIA_MAX_FILE_BYTES,
  ProfileMediaServerError,
  storeProfileMedia,
  type ProfileMediaDeleteItem,
} from "@/lib/profile-media-server";
import {
  consumeRequestRateLimit,
  NO_STORE_CACHE_CONTROL,
  requestRateLimitHeaders,
} from "@/lib/request-safety";

export const runtime = "nodejs";
export const maxDuration = 60;

const PROFILE_MEDIA_UPLOAD_RATE_LIMIT = {
  namespace: "profile-media-upload",
  limit: 70,
  windowMs: 10 * 60_000,
} as const;
const PROFILE_MEDIA_DELETE_RATE_LIMIT = {
  namespace: "profile-media-delete",
  limit: 90,
  windowMs: 10 * 60_000,
} as const;
const MAX_MULTIPART_BYTES = PROFILE_MEDIA_MAX_FILE_BYTES + 256 * 1024;
const MAX_DELETE_BODY_BYTES = 140 * 1024;

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

function appCheckIsEnforced() {
  return process.env.FIREBASE_APP_CHECK_ENFORCED?.trim().toLowerCase() === "true";
}

async function verifyRequiredAppCheck(request: Request) {
  if (!appCheckIsEnforced()) return "ok" as const;
  if (!isFirebaseAppCheckConfigured()) return "unavailable" as const;
  const token = appCheckToken(request);
  if (!token || !(await verifyFirebaseAppCheckToken(token))) {
    return "invalid" as const;
  }
  return "ok" as const;
}

function errorResponse(
  error: string,
  status: 400 | 401 | 403 | 409 | 413 | 429 | 500 | 503,
  headers: Record<string, string> = {},
) {
  return NextResponse.json(
    { error },
    {
      status,
      headers: { "Cache-Control": NO_STORE_CACHE_CONTROL, ...headers },
    },
  );
}

function contentLengthExceeds(request: Request, maximum: number) {
  const raw = request.headers.get("content-length");
  if (!raw) return false;
  const length = Number(raw);
  return !Number.isSafeInteger(length) || length < 0 || length > maximum;
}

async function authorize(
  request: Request,
  rateLimit: Parameters<typeof consumeRequestRateLimit>[1],
) {
  const consumed = consumeRequestRateLimit(request, rateLimit);
  const headers = requestRateLimitHeaders(consumed);
  if (!consumed.allowed) {
    return {
      response: errorResponse(
        "Too many profile media requests. Try again shortly.",
        429,
        { "Retry-After": String(consumed.retryAfter), ...headers },
      ),
      headers,
    };
  }
  if (!sameOrigin(request)) {
    return {
      response: errorResponse("Invalid request origin.", 403, headers),
      headers,
    };
  }

  const identity = await verifyFirebaseRequest(request);
  if (!identity?.emailVerified) {
    return {
      response: errorResponse(
        "Verify your email before changing profile images.",
        401,
        headers,
      ),
      headers,
    };
  }

  const appCheck = await verifyRequiredAppCheck(request);
  if (appCheck === "unavailable") {
    return {
      response: errorResponse(
        "Profile media attestation is not configured.",
        503,
        headers,
      ),
      headers,
    };
  }
  if (appCheck === "invalid") {
    return {
      response: errorResponse(
        "Unable to verify this profile media request.",
        403,
        headers,
      ),
      headers,
    };
  }

  return { identity, headers };
}

function serverErrorResponse(
  error: unknown,
  headers: Record<string, string>,
) {
  if (error instanceof ProfileMediaServerError) {
    return errorResponse(error.message, error.status, headers);
  }
  if (error instanceof TypeError) {
    return errorResponse("Invalid profile media request.", 400, headers);
  }
  console.error("Profile media request failed", error);
  return errorResponse(
    "Profile media storage is temporarily unavailable.",
    500,
    headers,
  );
}

export async function POST(request: Request) {
  const authorized = await authorize(request, PROFILE_MEDIA_UPLOAD_RATE_LIMIT);
  if ("response" in authorized) return authorized.response;
  const { identity, headers } = authorized;

  if (contentLengthExceeds(request, MAX_MULTIPART_BYTES)) {
    return errorResponse("The image upload is too large.", 413, headers);
  }

  try {
    const form = await request.formData();
    if (
      form.getAll("scope").length !== 1 ||
      form.getAll("itemId").length !== 1 ||
      form.getAll("file").length !== 1
    ) {
      return errorResponse("Invalid image upload fields.", 400, headers);
    }

    const scope = form.get("scope");
    const itemId = form.get("itemId");
    const file = form.get("file");
    if (
      !isProfileMediaScope(scope) ||
      !isProfileMediaItemId(itemId) ||
      !isProfileMediaDestination(scope, itemId) ||
      !(file instanceof File) ||
      file.size < 1 ||
      file.size >= PROFILE_MEDIA_MAX_FILE_BYTES ||
      !isProfileMediaContentType(file.type)
    ) {
      return errorResponse(
        "Use a JPEG, PNG, WebP, or GIF image smaller than 3 MB.",
        400,
        headers,
      );
    }

    const result = await storeProfileMedia(
      identity.uid,
      scope,
      itemId,
      file,
    );
    return NextResponse.json(result, {
      status: 201,
      headers: { "Cache-Control": NO_STORE_CACHE_CONTROL, ...headers },
    });
  } catch (error) {
    return serverErrorResponse(error, headers);
  }
}

function isDeleteItem(value: unknown): value is ProfileMediaDeleteItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ProfileMediaDeleteItem>;
  return (
    isProfileMediaDestination(item.scope, item.itemId) &&
    typeof item.mediaUrl === "string" &&
    item.mediaUrl.length >= 1 &&
    item.mediaUrl.length <= 2_048
  );
}

export async function DELETE(request: Request) {
  const authorized = await authorize(request, PROFILE_MEDIA_DELETE_RATE_LIMIT);
  if ("response" in authorized) return authorized.response;
  const { identity, headers } = authorized;

  if (contentLengthExceeds(request, MAX_DELETE_BODY_BYTES)) {
    return errorResponse("The deletion request is too large.", 413, headers);
  }

  try {
    const body = (await request.json()) as { items?: unknown };
    if (
      !Array.isArray(body.items) ||
      body.items.length > PROFILE_MEDIA_MAX_DELETE_ITEMS ||
      !body.items.every(isDeleteItem)
    ) {
      return errorResponse("Invalid profile media deletion.", 400, headers);
    }

    const result = await deleteProfileMedia(identity.uid, body.items);
    return NextResponse.json(result, {
      headers: { "Cache-Control": NO_STORE_CACHE_CONTROL, ...headers },
    });
  } catch (error) {
    return serverErrorResponse(error, headers);
  }
}
