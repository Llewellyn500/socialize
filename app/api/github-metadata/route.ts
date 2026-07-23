import { NextResponse } from "next/server";
import { fetchOpenGraph } from "@/lib/open-graph";
import { parseGitHubUrl } from "@/lib/github-url";
import {
  consumeRequestRateLimit,
  NO_STORE_CACHE_CONTROL,
  PUBLIC_METADATA_CACHE_CONTROL,
  requestRateLimitHeaders,
  type RequestRateLimitResult,
} from "@/lib/request-safety";
import { safeExternalJson } from "@/lib/safe-external-fetch";

export const runtime = "nodejs";

type GitHubMetadata = {
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

function githubHeaders(includeAuthorization = true) {
  const token = process.env.GITHUB_TOKEN?.trim();
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "SocializeBot/1.0",
    "X-GitHub-Api-Version": "2026-03-10",
  };
  if (includeAuthorization && token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function fetchFromGitHubApi(
  parsed: NonNullable<ReturnType<typeof parseGitHubUrl>>,
): Promise<GitHubMetadata | null> {
  try {
    if (parsed.kind === "repo" && parsed.repo) {
      const data = await safeExternalJson<{
        full_name?: string;
        description?: string | null;
        private?: boolean;
      }>(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, {
        // Repository link previews must remain public-only even if the configured
        // token was accidentally granted private repository access.
        headers: githubHeaders(false),
        allowedHosts: ["api.github.com"],
      });
      if (!data?.full_name || data.private !== false) return null;
      return {
        title: data.full_name.trim(),
        description: data.description?.trim() ?? "",
      };
    }

    const data = await safeExternalJson<{
      name?: string | null;
      login?: string;
      bio?: string | null;
    }>(`https://api.github.com/users/${parsed.owner}`, {
      headers: githubHeaders(),
      allowedHosts: ["api.github.com"],
    });

    const title = data?.name?.trim() || data?.login?.trim();
    if (!title) return null;
    return {
      title,
      description: data?.bio?.trim() ?? "",
    };
  } catch {
    return null;
  }
}

function cleanGitHubTitle(value: string) {
  return value.replace(/\s*·\s*GitHub\s*$/i, "").replace(/\s*-\s*GitHub\s*$/i, "").trim();
}

function githubFallback(
  parsed: NonNullable<ReturnType<typeof parseGitHubUrl>>,
  rateLimit: RequestRateLimitResult,
) {
  const title =
    parsed.kind === "repo" && parsed.repo
      ? `${parsed.owner}/${parsed.repo}`
      : parsed.owner;

  return NextResponse.json({
    title,
    description: "",
  }, { headers: metadataHeaders(rateLimit) });
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

  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    return inputError("Not a supported GitHub URL.", rateLimit);
  }

  try {
    const fromApi = await fetchFromGitHubApi(parsed);
    if (fromApi) return NextResponse.json(fromApi, { headers: metadataHeaders(rateLimit) });

    const fromOpenGraph = await fetchOpenGraph(parsed.canonicalUrl);
    if (fromOpenGraph) {
      return NextResponse.json({
        title: cleanGitHubTitle(fromOpenGraph.title),
        description: fromOpenGraph.description,
      }, { headers: metadataHeaders(rateLimit) });
    }
  } catch {
    // Fall through to URL-derived title.
  }

  return githubFallback(parsed, rateLimit);
}
