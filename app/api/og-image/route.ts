import { NextResponse } from "next/server";
import { verifyFirebaseRequest } from "@/lib/firebase-auth-server";
import { renderProfileOgImage, type ProfileOgInput } from "@/lib/og-profile-image";
import {
  consumeRequestRateLimit,
  NO_STORE_CACHE_CONTROL,
  requestRateLimitHeaders,
} from "@/lib/request-safety";

export const runtime = "nodejs";

const OG_RATE_LIMIT = {
  namespace: "og-image",
  limit: 10,
  windowMs: 60_000,
} as const;

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin") || request.headers.get("referer");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function errorResponse(
  error: string,
  status: 400 | 401 | 403 | 413 | 429 | 500,
  headers: Record<string, string>,
) {
  return NextResponse.json(
    { error },
    {
      status,
      headers: { "Cache-Control": NO_STORE_CACHE_CONTROL, ...headers },
    },
  );
}

type OgRequestPayload = {
  uid: string;
  profile: ProfileOgInput;
};

function isProfilePayload(value: unknown): value is ProfileOgInput {
  if (!value || typeof value !== "object") return false;
  const profile = value as Record<string, unknown>;
  return (
    typeof profile.handle === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(profile.handle) &&
    typeof profile.displayName === "string" &&
    typeof profile.role === "string" &&
    typeof profile.bio === "string" &&
    typeof profile.accent === "string" &&
    /^#[0-9a-f]{6}$/i.test(profile.accent)
  );
}

/** Generate a profile Open Graph PNG for upload to Storage. */
export async function POST(request: Request) {
  const rateLimit = consumeRequestRateLimit(request, OG_RATE_LIMIT);
  const rateHeaders = requestRateLimitHeaders(rateLimit);
  if (!rateLimit.allowed) {
    return errorResponse(
      "Too many image requests. Try again shortly.",
      429,
      { "Retry-After": String(rateLimit.retryAfter), ...rateHeaders },
    );
  }

  if (!sameOrigin(request)) {
    return errorResponse("Invalid request origin.", 403, rateHeaders);
  }

  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 12_000) {
      return errorResponse("Profile payload is too large.", 413, rateHeaders);
    }

    const identity = await verifyFirebaseRequest(request);
    if (!identity?.emailVerified) {
      return errorResponse(
        "Verify your email before generating a profile image.",
        401,
        rateHeaders,
      );
    }

    const body = (await request.json()) as Partial<OgRequestPayload>;
    if (body.uid !== identity.uid || !isProfilePayload(body.profile)) {
      return errorResponse("Invalid profile payload.", 400, rateHeaders);
    }

    const image = await renderProfileOgImage({
      handle: body.profile.handle.toLowerCase().slice(0, 30),
      displayName: body.profile.displayName.slice(0, 60),
      role: body.profile.role.slice(0, 100),
      bio: body.profile.bio.slice(0, 240),
      accent: body.profile.accent,
      avatarUrl:
        typeof body.profile.avatarUrl === "string"
          ? body.profile.avatarUrl.slice(0, 2048)
          : undefined,
    });

    return new NextResponse(image.body, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": NO_STORE_CACHE_CONTROL,
        ...rateHeaders,
      },
    });
  } catch (error) {
    console.error("OG image generation failed", error);
    return errorResponse("Could not generate Open Graph image.", 500, rateHeaders);
  }
}
