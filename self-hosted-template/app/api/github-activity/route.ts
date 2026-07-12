import { NextRequest, NextResponse } from "next/server";
import { getGitHubActivity, GitHubActivityError } from "@/lib/github-activity";
import {
  isValidRepositoryFullName,
  normalizeRepositoryNames,
  repositoryNameTokens,
} from "@/lib/profile-utils";
import type { GitHubActivityErrorBody } from "@/types/github-activity";

const GITHUB_USERNAME = /^(?!.*--)[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;
const VALID_WINDOWS = new Set([7, 14, 30]);
const VALID_MODES = new Set(["recent", "include", "exclude"]);
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

type RateEntry = { count: number; resetAt: number };
const rateGlobal = globalThis as typeof globalThis & {
  __selfHostedActivityRateLimits?: Map<string, RateEntry>;
};
const rateLimits = rateGlobal.__selfHostedActivityRateLimits ?? new Map<string, RateEntry>();
rateGlobal.__selfHostedActivityRateLimits = rateLimits;

export const runtime = "nodejs";

function noStoreError(error: string, status: number, retryAfter?: number) {
  return NextResponse.json<GitHubActivityErrorBody>(
    { error },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
        ...(retryAfter ? { "Retry-After": String(retryAfter) } : {})
      }
    }
  );
}

function parseFlag(value: string | null, fallback: boolean) {
  if (value === null) return fallback;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return null;
}

function consumeRateLimit(request: NextRequest) {
  const now = Date.now();
  if (rateLimits.size > 1_000) {
    for (const [key, entry] of rateLimits) {
      if (entry.resetAt <= now) rateLimits.delete(key);
    }
    while (rateLimits.size > 1_000) {
      const oldestKey = rateLimits.keys().next().value as string | undefined;
      if (!oldestKey) break;
      rateLimits.delete(oldestKey);
    }
  }
  const key = (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  ).slice(0, 128);
  const current = rateLimits.get(key);
  const entry = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + RATE_WINDOW_MS }
    : current;
  entry.count += 1;
  rateLimits.set(key, entry);
  return {
    allowed: entry.count <= RATE_LIMIT,
    retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1_000))
  };
}

export async function GET(request: NextRequest) {
  const rate = consumeRateLimit(request);
  if (!rate.allowed) {
    return noStoreError("Too many activity requests. Try again shortly.", 429, rate.retryAfter);
  }

  const username = request.nextUrl.searchParams.get("username")?.trim().replace(/^@/, "") || "";
  const requestedWindow = Number(request.nextUrl.searchParams.get("days"));
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit"));
  const rawMode = request.nextUrl.searchParams.get("repoMode") || "recent";
  const rawRepositories = request.nextUrl.searchParams.getAll("repo");
  const includeCommits = parseFlag(request.nextUrl.searchParams.get("commits"), true);
  const includeCoding = parseFlag(request.nextUrl.searchParams.get("coding"), true);
  const includeContributions = parseFlag(request.nextUrl.searchParams.get("calendar"), true);
  const includeLanguages = parseFlag(request.nextUrl.searchParams.get("languages"), true);
  const currentYear = new Date().getUTCFullYear();
  const rawYear = request.nextUrl.searchParams.get("year");
  const contributionYear = rawYear === null ? currentYear : Number(rawYear);
  const windowDays = (VALID_WINDOWS.has(requestedWindow) ? requestedWindow : 30) as 7 | 14 | 30;
  const commitLimit = Number.isFinite(requestedLimit)
    ? Math.min(10, Math.max(1, Math.round(requestedLimit)))
    : 5;

  if (!GITHUB_USERNAME.test(username)) {
    return noStoreError("Enter a valid GitHub username.", 400);
  }
  if (
    includeCommits === null ||
    includeCoding === null ||
    includeContributions === null ||
    includeLanguages === null ||
    (!includeCommits && !includeCoding)
  ) {
    return noStoreError("Choose valid activity modules.", 400);
  }
  if (
    !Number.isInteger(contributionYear) ||
    contributionYear < 2008 ||
    contributionYear > currentYear
  ) {
    return noStoreError("Choose a valid contribution year.", 400);
  }
  if (!VALID_MODES.has(rawMode)) {
    return noStoreError("Choose a valid repository mode.", 400);
  }
  const tokens = repositoryNameTokens(rawRepositories);
  if (
    tokens.length > 5 ||
    tokens.some((repository) => !isValidRepositoryFullName(repository))
  ) {
    return noStoreError("Use up to five owner/repository names.", 400);
  }
  const repositories = normalizeRepositoryNames(tokens);
  if (rawMode === "include" && repositories.length === 0) {
    return noStoreError("Include mode needs at least one repository.", 400);
  }

  try {
    const activity = await getGitHubActivity(username, {
      windowDays,
      commitLimit,
      repositoryMode: rawMode as "recent" | "include" | "exclude",
      repositories,
      includeCommits,
      includeCoding,
      includeContributions: includeCoding && includeContributions,
      contributionYear,
      includeLanguages: includeCoding && includeLanguages
    });

    return NextResponse.json(activity, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=86400"
      }
    });
  } catch (error) {
    const status = error instanceof GitHubActivityError ? error.status : 502;
    const message = error instanceof GitHubActivityError
      ? error.message
      : "GitHub activity is unavailable.";
    return noStoreError(message, status);
  }
}
