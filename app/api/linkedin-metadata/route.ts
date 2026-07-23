import { NextResponse } from "next/server";
import { fetchLinkedInHeadline, LINKEDIN_LINK_TITLE } from "@/lib/linkedin-headline";
import { parseLinkedInUrl } from "@/lib/linkedin-url";
import {
  consumeRequestRateLimit,
  NO_STORE_CACHE_CONTROL,
  PUBLIC_METADATA_CACHE_CONTROL,
  requestRateLimitHeaders,
  type RequestRateLimitResult,
} from "@/lib/request-safety";

export const runtime = "nodejs";

const METADATA_RATE_LIMIT = {
  namespace: "link-metadata",
  limit: 20,
  windowMs: 60_000,
} as const;

function metadataHeaders(rateLimit: RequestRateLimitResult) {
  return {
    "Cache-Control": PUBLIC_METADATA_CACHE_CONTROL,
    ...requestRateLimitHeaders(rateLimit),
  };
}

function inputError(message: string, rateLimit: RequestRateLimitResult) {
  return NextResponse.json(
    { error: message },
    {
      status: 400,
      headers: {
        "Cache-Control": NO_STORE_CACHE_CONTROL,
        ...requestRateLimitHeaders(rateLimit),
      },
    },
  );
}

export async function GET(request: Request) {
  const rateLimit = consumeRequestRateLimit(request, METADATA_RATE_LIMIT);
  const rateHeaders = requestRateLimitHeaders(rateLimit);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many metadata requests. Try again shortly." },
      {
        status: 429,
        headers: {
          "Cache-Control": NO_STORE_CACHE_CONTROL,
          "Retry-After": String(rateLimit.retryAfter),
          ...rateHeaders,
        },
      },
    );
  }

  const url = new URL(request.url).searchParams.get("url")?.trim();
  if (!url) {
    return inputError("Missing url parameter.", rateLimit);
  }

  const parsed = parseLinkedInUrl(url);
  if (!parsed) {
    return inputError("Not a supported LinkedIn URL.", rateLimit);
  }

  try {
    const description = await fetchLinkedInHeadline(parsed.canonicalUrl);
    return NextResponse.json({
      title: LINKEDIN_LINK_TITLE,
      description,
    }, { headers: metadataHeaders(rateLimit) });
  } catch {
    return NextResponse.json({
      title: LINKEDIN_LINK_TITLE,
      description: "",
    }, { headers: metadataHeaders(rateLimit) });
  }
}
