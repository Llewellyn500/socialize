import { NextResponse } from "next/server";
import { fetchOpenGraph } from "@/lib/open-graph";
import {
  consumeRequestRateLimit,
  NO_STORE_CACHE_CONTROL,
  PUBLIC_METADATA_CACHE_CONTROL,
  requestRateLimitHeaders,
  type RequestRateLimitResult,
} from "@/lib/request-safety";
import { safeExternalJson } from "@/lib/safe-external-fetch";
import { parseYouTubeUrl } from "@/lib/youtube-url";

export const runtime = "nodejs";

type YouTubeMetadata = {
  title: string;
  description: string;
};

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

function cleanYouTubeTitle(value: string) {
  return value
    .replace(/\s*-\s*YouTube\s*$/i, "")
    .trim();
}

async function fetchYouTubeOpenGraph(url: string): Promise<YouTubeMetadata | null> {
  const metadata = await fetchOpenGraph(url);
  if (!metadata) return null;
  return {
    title: cleanYouTubeTitle(metadata.title),
    description: metadata.description,
  };
}

async function fetchVideoOEmbed(url: string): Promise<YouTubeMetadata | null> {
  const data = await safeExternalJson<{ author_name?: string; title?: string }>(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    { allowedHosts: ["www.youtube.com"] },
  );
  const title = data?.author_name?.trim() ?? "";
  if (!title) return null;
  return { title, description: "" };
}

async function fetchWithYouTubeApi(
  parsed: NonNullable<ReturnType<typeof parseYouTubeUrl>>,
  apiKey: string,
): Promise<YouTubeMetadata | null> {
  try {
    if (parsed.kind === "channel") {
      const params = new URLSearchParams({
        part: "snippet",
        key: apiKey,
      });
      if (parsed.handle) params.set("forHandle", parsed.handle);
      else if (parsed.channelId) params.set("id", parsed.channelId);
      else return null;

      const data = await safeExternalJson<{
        items?: Array<{ snippet?: { title?: string; description?: string } }>;
      }>(`https://www.googleapis.com/youtube/v3/channels?${params.toString()}`, {
        allowedHosts: ["www.googleapis.com"],
      });

      const snippet = data?.items?.[0]?.snippet;
      if (!snippet?.title) return null;
      return {
        title: snippet.title.trim(),
        description: snippet.description?.trim() ?? "",
      };
    }

    if (!parsed.videoId) return null;

    const videoData = await safeExternalJson<{
      items?: Array<{
        snippet?: {
          channelId?: string;
          channelTitle?: string;
          description?: string;
        };
      }>;
    }>(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${parsed.videoId}&key=${apiKey}`,
      { allowedHosts: ["www.googleapis.com"] },
    );

    const videoSnippet = videoData?.items?.[0]?.snippet;
    if (!videoSnippet) return null;

    let title = videoSnippet.channelTitle?.trim() ?? "";
    let description = videoSnippet.description?.trim() ?? "";

    if (videoSnippet.channelId) {
      const channelData = await safeExternalJson<{
        items?: Array<{ snippet?: { title?: string; description?: string } }>;
      }>(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${videoSnippet.channelId}&key=${apiKey}`,
        { allowedHosts: ["www.googleapis.com"] },
      );
      const channelSnippet = channelData?.items?.[0]?.snippet;
      if (channelSnippet?.title) title = channelSnippet.title.trim();
      if (channelSnippet?.description) description = channelSnippet.description.trim();
    }

    if (!title) return null;
    return { title, description };
  } catch {
    return null;
  }
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

  const parsed = parseYouTubeUrl(url);
  if (!parsed) {
    return inputError("Not a supported YouTube URL.", rateLimit);
  }

  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (apiKey) {
      const fromApi = await fetchWithYouTubeApi(parsed, apiKey);
      if (fromApi) return NextResponse.json(fromApi, { headers: metadataHeaders(rateLimit) });
    }

    if (parsed.kind === "video") {
      const fromOEmbed = await fetchVideoOEmbed(parsed.canonicalUrl);
      if (fromOEmbed) return NextResponse.json(fromOEmbed, { headers: metadataHeaders(rateLimit) });
    }

    const fromOpenGraph = await fetchYouTubeOpenGraph(parsed.canonicalUrl);
    if (fromOpenGraph) return NextResponse.json(fromOpenGraph, { headers: metadataHeaders(rateLimit) });
  } catch {
    // Fall through to 502 below.
  }

  return NextResponse.json(
    { error: "Could not load YouTube metadata." },
    {
      status: 502,
      headers: {
        "Cache-Control": NO_STORE_CACHE_CONTROL,
        ...requestRateLimitHeaders(rateLimit),
      },
    },
  );
}
