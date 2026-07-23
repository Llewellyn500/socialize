import { after } from "next/server";
import { NextResponse } from "next/server";
import {
  ensureAllContributionYearsCached,
  getGitHubActivity,
  GitHubActivityError,
  isValidGitHubUsername,
  type GitHubRepositoryMode,
} from "@/lib/github-activity";
import {
  isValidGitHubRepository,
  normalizeGitHubRepository,
} from "@/lib/profile";
import {
  consumeRequestRateLimit,
  requestRateLimitHeaders,
} from "@/lib/request-safety";

export const runtime = "nodejs";

const SUCCESS_CACHE_CONTROL = "private, no-store";
const ERROR_CACHE_CONTROL = "private, no-store";
const GITHUB_ACTIVITY_RATE_LIMIT = {
  namespace: "github-activity",
  limit: 30,
  windowMs: 60_000,
} as const;

function errorResponse(
  error: string,
  code: string,
  status: 400 | 404 | 429 | 502,
  options: { retryAfter?: number; headers?: Record<string, string> } = {},
) {
  const headers: Record<string, string> = {
    "Cache-Control": ERROR_CACHE_CONTROL,
    ...(options.headers ?? {}),
  };
  if (status === 429 && options.retryAfter) {
    headers["Retry-After"] = String(options.retryAfter);
  }

  return NextResponse.json(
    {
      error,
      code,
      ...(status === 429 && options.retryAfter
        ? { retryAfter: options.retryAfter }
        : {}),
    },
    { status, headers },
  );
}

function parseBooleanFlag(value: string | null, fallback: boolean) {
  if (value === null) return fallback;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return null;
}

export async function GET(request: Request) {
  const rateLimit = consumeRequestRateLimit(request, GITHUB_ACTIVITY_RATE_LIMIT);
  const requestRateHeaders = requestRateLimitHeaders(rateLimit);
  if (!rateLimit.allowed) {
    return errorResponse(
      "Too many activity requests. Try again shortly.",
      "SOCIALIZE_RATE_LIMITED",
      429,
      { retryAfter: rateLimit.retryAfter, headers: requestRateHeaders },
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const username = searchParams.get("username")?.trim();
  if (!username || !isValidGitHubUsername(username)) {
    return errorResponse(
      "Enter a valid GitHub username.",
      "INVALID_USERNAME",
      400,
      { headers: requestRateHeaders },
    );
  }

  const includeCommits = parseBooleanFlag(searchParams.get("commits"), true);
  const includeCoding = parseBooleanFlag(searchParams.get("coding"), true);
  const includeContributions = parseBooleanFlag(searchParams.get("calendar"), true);
  const includeLanguages = parseBooleanFlag(searchParams.get("languages"), true);
  if (
    includeCommits === null ||
    includeCoding === null ||
    includeContributions === null ||
    includeLanguages === null
  ) {
    return errorResponse(
      "Activity flags must be true or false.",
      "INVALID_OPTIONS",
      400,
      { headers: requestRateHeaders },
    );
  }
  if (!includeCommits && !includeCoding) {
    return errorResponse(
      "Enable commits or coding activity.",
      "NO_ACTIVITY_MODULES",
      400,
      { headers: requestRateHeaders },
    );
  }

  const rawLimit = searchParams.get("limit");
  const commitLimit = rawLimit === null ? 5 : Number(rawLimit);
  if (!Number.isInteger(commitLimit) || commitLimit < 1 || commitLimit > 10) {
    return errorResponse(
      "Commit limit must be an integer from 1 to 10.",
      "INVALID_OPTIONS",
      400,
      { headers: requestRateHeaders },
    );
  }

  const currentYear = new Date().getUTCFullYear();
  const rawYear = searchParams.get("year");
  const contributionYear = rawYear === null ? currentYear : Number(rawYear);
  if (
    !Number.isInteger(contributionYear) ||
    contributionYear < 2008 ||
    contributionYear > currentYear
  ) {
    return errorResponse(
      "Contribution year is invalid.",
      "INVALID_OPTIONS",
      400,
      { headers: requestRateHeaders },
    );
  }

  const rawMode = searchParams.get("repoMode") ?? "recent";
  if (!(["recent", "include", "exclude"] as const).includes(
    rawMode as GitHubRepositoryMode,
  )) {
    return errorResponse(
      "Repository mode is invalid.",
      "INVALID_REPOSITORIES",
      400,
      { headers: requestRateHeaders },
    );
  }
  const repositoryMode = rawMode as GitHubRepositoryMode;
  const rawRepositories = searchParams.getAll("repo");
  if (rawRepositories.length > 5) {
    return errorResponse(
      "Choose no more than five repositories.",
      "INVALID_REPOSITORIES",
      400,
      { headers: requestRateHeaders },
    );
  }

  const repositories: string[] = [];
  const seenRepositories = new Set<string>();
  for (const rawRepository of rawRepositories) {
    const repository = normalizeGitHubRepository(rawRepository);
    const key = repository.toLowerCase();
    if (!isValidGitHubRepository(repository)) {
      return errorResponse(
        "Repositories must use the owner/repository format.",
        "INVALID_REPOSITORIES",
        400,
        { headers: requestRateHeaders },
      );
    }
    if (!seenRepositories.has(key)) {
      seenRepositories.add(key);
      repositories.push(repository);
    }
  }
  if (repositoryMode === "include" && repositories.length === 0) {
    return errorResponse(
      "Choose at least one repository for include mode.",
      "INVALID_REPOSITORIES",
      400,
      { headers: requestRateHeaders },
    );
  }

  try {
    const activity = await getGitHubActivity(username, {
      includeCommits,
      includeCoding,
      includeContributions: includeCoding && includeContributions,
      includeLanguages: includeCoding && includeLanguages,
      commitLimit,
      repositoryMode,
      repositories,
      contributionYear,
    });

    if (includeCoding && includeContributions) {
      const years = activity.contributions?.availableYears ?? [contributionYear];
      after(() => {
        void ensureAllContributionYearsCached(username, years);
      });
    }

    return NextResponse.json(activity, {
      headers: {
        "Cache-Control": SUCCESS_CACHE_CONTROL,
        ...requestRateHeaders,
      },
    });
  } catch (error) {
    if (error instanceof GitHubActivityError) {
      if (error.status === 404) {
        return errorResponse(
          "That GitHub user could not be found.",
          "GITHUB_USER_NOT_FOUND",
          404,
          { headers: requestRateHeaders },
        );
      }
      if (error.status === 429) {
        return errorResponse(
          "GitHub activity is temporarily rate limited. Try again shortly.",
          "GITHUB_RATE_LIMITED",
          429,
          { retryAfter: error.retryAfter, headers: requestRateHeaders },
        );
      }
    }

    return errorResponse(
      "GitHub activity is temporarily unavailable.",
      "GITHUB_UNAVAILABLE",
      502,
      { headers: requestRateHeaders },
    );
  }
}
