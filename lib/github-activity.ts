import { unstable_cache } from "next/cache";
import {
  buildContributionCalendarFromDays,
  extractDaysFromCalendar,
  fillYearDayGaps,
  hasYearCoverage,
  loadContributionCacheServer,
  mergeDayMaps,
  normalizeAvailableYears,
  normalizeSyncedYears,
  replaceYearDays,
  saveContributionCacheServer,
  startOfUtcDay,
  type ContributionDayMap,
  CONTRIBUTION_CACHE_VERSION,
} from "@/lib/github-contribution-cache";
import {
  hasLanguageYearCoverage,
  LANGUAGE_CACHE_VERSION,
  languageModeKey,
  loadLanguageCacheServer,
  normalizeSyncedYears as normalizeLanguageSyncedYears,
  readLanguageYearEntry,
  replaceLanguageYear,
  saveLanguageCacheServer,
  type LanguageYearCacheEntry,
} from "@/lib/github-language-cache";

const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const GITHUB_API_VERSION = "2026-03-10";
const EVENT_CACHE_SECONDS = 5 * 60;
const REPOSITORY_CACHE_SECONDS = 60 * 60;
const CONTRIBUTION_CACHE_SECONDS = 60 * 60;
const CONTRIBUTION_DAY_CACHE_SECONDS = 5 * 60;
const EVENT_LIMIT = 100;
const RECENT_REPOSITORY_LIMIT = 3;
const SELECTED_REPOSITORY_LIMIT = 5;
const YEAR_LANGUAGE_REPOSITORY_LIMIT = 12;
const LANGUAGE_DISPLAY_LIMIT = 30;
const COMMITS_PER_REPOSITORY = 10;
const DAY_COUNT = 30;

const GITHUB_USERNAME_PATTERN =
  /^(?!-)(?!.*--)(?!.*-$)[A-Za-z0-9-]{1,39}$/;
const GITHUB_REPOSITORY_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;
const GITHUB_SHA_PATTERN = /^[a-f0-9]{7,64}$/i;

export type GitHubRepositoryMode = "recent" | "include" | "exclude";

export type GitHubActivityOptions = {
  includeCommits?: boolean;
  includeCoding?: boolean;
  includeContributions?: boolean;
  includeLanguages?: boolean;
  commitLimit?: number;
  repositoryMode?: GitHubRepositoryMode;
  repositories?: string[];
  contributionYear?: number;
};

export type GitHubActivityCommit = {
  sha: string;
  message: string;
  repository: string;
  repositoryUrl: string;
  url: string;
  createdAt: string;
};

export type GitHubActivityDay = {
  date: string;
  count: number;
};

export type GitHubActivityLanguage = {
  name: string;
  percentage: number;
};

export type GitHubContributionLevel = 0 | 1 | 2 | 3 | 4;

export type GitHubContributionDay = {
  date: string;
  weekday: number;
  count: number;
  level: GitHubContributionLevel;
};

export type GitHubContributionWeek = {
  firstDay: string;
  days: GitHubContributionDay[];
};

export type GitHubContributionMonth = {
  firstDay: string;
  name: string;
  totalWeeks: number;
};

export type GitHubContributionCalendar = {
  year: number;
  totalContributions: number;
  availableYears: number[];
  months: GitHubContributionMonth[];
  weeks: GitHubContributionWeek[];
  source: "github" | "events";
  partial: boolean;
};

export type GitHubActivityResponse = {
  username: string;
  profileUrl: string;
  repositories: string[];
  commits: GitHubActivityCommit[];
  daily: GitHubActivityDay[];
  languages: GitHubActivityLanguage[];
  contributions: GitHubContributionCalendar | null;
  summary: {
    commits: number;
    activeDays: number;
    repositories: number;
  };
  limited: boolean;
};

type GitHubEvent = {
  type?: unknown;
  public?: unknown;
  created_at?: unknown;
  repo?: { name?: unknown } | null;
};

type GitHubCommit = {
  sha?: unknown;
  commit?: {
    message?: unknown;
    author?: { date?: unknown } | null;
    committer?: { date?: unknown } | null;
  } | null;
};

type GitHubRepository = {
  full_name?: unknown;
  private?: unknown;
};

type GitHubGraphQLContributionDay = {
  contributionCount?: unknown;
  contributionLevel?: unknown;
  date?: unknown;
  weekday?: unknown;
};

type GitHubGraphQLContributionWeek = {
  firstDay?: unknown;
  contributionDays?: unknown;
};

type GitHubGraphQLContributionMonth = {
  firstDay?: unknown;
  name?: unknown;
  totalWeeks?: unknown;
};

type GitHubGraphQLResponse = {
  data?: {
    user?: {
      contributionsCollection?: {
        contributionYears?: unknown;
        contributionCalendar?: {
          totalContributions?: unknown;
          months?: unknown;
          weeks?: unknown;
        } | null;
      } | null;
    } | null;
  };
  errors?: unknown;
};

type RecentRepository = {
  name: string;
  pushedAt: string;
};

type RepositoryCommitResult = {
  commits: GitHubActivityCommit[];
  hitLimit: boolean;
};

type GitHubRequestResult = {
  response: Response;
  data: unknown;
};

export class GitHubActivityError extends Error {
  readonly status: 404 | 429 | 502;
  readonly retryAfter?: number;

  constructor(
    status: 404 | 429 | 502,
    message: string,
    retryAfter?: number,
  ) {
    super(message);
    this.name = "GitHubActivityError";
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

export function isValidGitHubUsername(value: string) {
  return GITHUB_USERNAME_PATTERN.test(value);
}

function githubHeaders() {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Socialize-GitHub-Activity/1.0",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function retryAfterSeconds(response: Response) {
  const retryAfter = Number.parseInt(response.headers.get("retry-after") ?? "", 10);
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter, 86_400);
  }

  const resetAt = Number.parseInt(
    response.headers.get("x-ratelimit-reset") ?? "",
    10,
  );
  if (Number.isFinite(resetAt) && resetAt > 0) {
    return Math.min(
      Math.max(resetAt - Math.floor(Date.now() / 1000), 1),
      86_400,
    );
  }

  return 60;
}

async function requestGitHub(path: string): Promise<GitHubRequestResult> {
  let response: Response;
  try {
    response = await fetch(`${GITHUB_API_BASE}${path}`, {
      cache: "no-store",
      headers: githubHeaders(),
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new GitHubActivityError(
      502,
      "GitHub did not respond to the activity request.",
    );
  }

  if (response.status === 403 || response.status === 429) {
    throw new GitHubActivityError(
      429,
      "GitHub activity is temporarily rate limited.",
      retryAfterSeconds(response),
    );
  }

  let data: unknown = null;
  if (response.status !== 204) {
    try {
      data = await response.json();
    } catch {
      if (response.ok) {
        throw new GitHubActivityError(
          502,
          "GitHub returned an invalid activity response.",
        );
      }
    }
  }

  return { response, data };
}

const CONTRIBUTION_QUERY = `
  query SocializeContributionCalendar($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionYears
        # contributionCalendar matches github.com's profile graph, including
        # anonymized private contribution counts when the user has enabled
        # "Include private contributions on my profile". It never returns
        # private repository names or contents.
        contributionCalendar {
          totalContributions
          months {
            firstDay
            name
            totalWeeks
          }
          weeks {
            firstDay
            contributionDays {
              contributionCount
              contributionLevel
              date
              weekday
            }
          }
        }
      }
    }
  }
`;

function contributionRange(year: number) {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const from = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const to =
    year === currentYear
      ? now
      : new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
  return { from, to };
}

function validDateOnly(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  return Number.isFinite(Date.parse(`${value}T00:00:00.000Z`)) ? value : null;
}

function contributionLevel(value: unknown): GitHubContributionLevel {
  const levels: Record<string, GitHubContributionLevel> = {
    NONE: 0,
    FIRST_QUARTILE: 1,
    SECOND_QUARTILE: 2,
    THIRD_QUARTILE: 3,
    FOURTH_QUARTILE: 4,
  };
  return typeof value === "string" ? (levels[value] ?? 0) : 0;
}

function contributionLevelFromCount(count: number): GitHubContributionLevel {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

function resolveContributionLevel(
  contributionLevelValue: unknown,
  count: number,
): GitHubContributionLevel {
  const mapped = contributionLevel(contributionLevelValue);
  if (mapped > 0 || count <= 0) return mapped;
  return contributionLevelFromCount(count);
}

function parseProfileContributionHtml(html: string): {
  days: ContributionDayMap;
  availableYears: number[];
} {
  const days: ContributionDayMap = {};
  const cellPattern =
    /data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="([0-4])"[^>]*>[\s\S]*?<tool-tip[^>]*>\s*([^<]*?)\s*<\/tool-tip>/gi;
  const altCellPattern =
    /data-level="([0-4])"[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*>[\s\S]*?<tool-tip[^>]*>\s*([^<]*?)\s*<\/tool-tip>/gi;

  const ingest = (date: string, levelRaw: string, tip: string) => {
    if (!validDateOnly(date) || date in days) return;
    const parsedLevel = Number(levelRaw);
    const level: GitHubContributionLevel =
      parsedLevel === 1 ||
      parsedLevel === 2 ||
      parsedLevel === 3 ||
      parsedLevel === 4
        ? parsedLevel
        : 0;
    let count = 0;
    if (!/^no contribution/i.test(tip.trim())) {
      const match = tip.trim().match(/^([\d,]+)/);
      if (match) {
        count = Math.min(
          1_000_000,
          Math.max(0, Number(match[1].replace(/,/g, "")) || 0),
        );
      }
    }
    days[date] = {
      count,
      level: count > 0 ? (level > 0 ? level : contributionLevelFromCount(count)) : 0,
    };
  };

  for (const match of html.matchAll(cellPattern)) {
    ingest(match[1], match[2], match[3]);
  }
  for (const match of html.matchAll(altCellPattern)) {
    ingest(match[2], match[1], match[3]);
  }

  const currentYear = new Date().getUTCFullYear();
  const years = new Set<number>([currentYear]);
  for (const match of html.matchAll(/[?&]from=(\d{4})-\d{2}-\d{2}/g)) {
    const year = Number(match[1]);
    if (year >= 2008 && year <= currentYear) years.add(year);
  }
  for (const date of Object.keys(days)) {
    years.add(Number(date.slice(0, 4)));
  }

  return {
    days,
    availableYears: [...years].sort((a, b) => b - a).slice(0, 15),
  };
}

/**
 * Fetch the public contribution graph HTML GitHub shows on profiles.
 * This includes anonymized private contributions when the user has enabled
 * that setting — matching github.com exactly, without exposing private repos.
 */
async function fetchContributionCalendarFromProfile(
  username: string,
  year: number,
  range?: { from: Date; to: Date },
): Promise<GitHubContributionCalendar | null> {
  const { from, to } = range ?? contributionRange(year);
  const fromKey = startOfUtcDay(from).toISOString().slice(0, 10);
  const toKey = startOfUtcDay(to).toISOString().slice(0, 10);
  const url =
    `https://github.com/users/${encodeURIComponent(username)}/contributions` +
    `?from=${fromKey}&to=${toKey}`;

  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "text/html",
        "User-Agent":
          "Mozilla/5.0 (compatible; SocializeBot/1.0; +https://www.socialize.you)",
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return null;
  }

  if (response.status === 404) {
    throw new GitHubActivityError(404, "GitHub user not found.");
  }
  if (response.status === 403 || response.status === 429) {
    throw new GitHubActivityError(
      429,
      "GitHub contribution data is temporarily rate limited.",
      retryAfterSeconds(response),
    );
  }
  if (!response.ok) return null;

  let html: string;
  try {
    html = await response.text();
  } catch {
    return null;
  }
  if (!html.includes("ContributionCalendar") && !html.includes("data-date=")) {
    return null;
  }

  const parsed = parseProfileContributionHtml(html);
  if (Object.keys(parsed.days).length === 0) return null;

  const yearPrefix = String(year);
  const yearDays: ContributionDayMap = {};
  for (const [date, entry] of Object.entries(parsed.days)) {
    if (date.startsWith(yearPrefix)) yearDays[date] = entry;
  }
  if (Object.keys(yearDays).length === 0) return null;

  return buildContributionCalendarFromDays(
    yearDays,
    year,
    parsed.availableYears,
    "github",
    false,
  );
}

async function fetchContributionCalendar(
  username: string,
  year: number,
  range?: { from: Date; to: Date },
): Promise<GitHubContributionCalendar | null> {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) return null;

  const { from, to } = range ?? contributionRange(year);
  let response: Response;
  try {
    response = await fetch(GITHUB_GRAPHQL_URL, {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "Socialize-GitHub-Activity/1.0",
      },
      body: JSON.stringify({
        query: CONTRIBUTION_QUERY,
        variables: {
          login: username,
          from: from.toISOString(),
          to: to.toISOString(),
        },
      }),
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    return null;
  }

  if (response.status === 403 || response.status === 429) {
    throw new GitHubActivityError(
      429,
      "GitHub contribution data is temporarily rate limited.",
      retryAfterSeconds(response),
    );
  }
  if (!response.ok) return null;

  let body: GitHubGraphQLResponse;
  try {
    body = (await response.json()) as GitHubGraphQLResponse;
  } catch {
    return null;
  }

  if (Array.isArray(body.errors) && body.errors.length > 0) return null;
  if (body.data?.user === null) {
    throw new GitHubActivityError(404, "GitHub user not found.");
  }

  const collection = body.data?.user?.contributionsCollection;
  const calendar = collection?.contributionCalendar;
  if (!calendar) return null;

  const weeks: GitHubContributionWeek[] = [];
  if (Array.isArray(calendar.weeks)) {
    for (const rawWeek of calendar.weeks.slice(0, 54) as GitHubGraphQLContributionWeek[]) {
      const firstDay = validDateOnly(rawWeek.firstDay);
      if (!firstDay || !Array.isArray(rawWeek.contributionDays)) continue;
      const days: GitHubContributionDay[] = [];
      for (const rawDay of rawWeek.contributionDays.slice(0, 7) as GitHubGraphQLContributionDay[]) {
        const date = validDateOnly(rawDay.date);
        const weekday =
          typeof rawDay.weekday === "number" &&
          Number.isInteger(rawDay.weekday) &&
          rawDay.weekday >= 0 &&
          rawDay.weekday <= 6
            ? rawDay.weekday
            : null;
        if (!date || weekday === null) continue;
        const count =
          typeof rawDay.contributionCount === "number" &&
          Number.isFinite(rawDay.contributionCount)
            ? Math.min(1_000_000, Math.max(0, Math.round(rawDay.contributionCount)))
            : 0;
        days.push({
          date,
          weekday,
          count,
          level: resolveContributionLevel(rawDay.contributionLevel, count),
        });
      }
      weeks.push({ firstDay, days });
    }
  }
  if (weeks.length === 0) return null;

  const months: GitHubContributionMonth[] = [];
  if (Array.isArray(calendar.months)) {
    for (const rawMonth of calendar.months.slice(0, 13) as GitHubGraphQLContributionMonth[]) {
      const firstDay = validDateOnly(rawMonth.firstDay);
      const name =
        typeof rawMonth.name === "string"
          ? rawMonth.name.trim().slice(0, 12)
          : "";
      const totalWeeks =
        typeof rawMonth.totalWeeks === "number" &&
        Number.isInteger(rawMonth.totalWeeks)
          ? Math.min(6, Math.max(1, rawMonth.totalWeeks))
          : 1;
      if (firstDay && name) months.push({ firstDay, name, totalWeeks });
    }
  }

  const currentYear = new Date().getUTCFullYear();
  const availableYears = Array.isArray(collection?.contributionYears)
    ? [...new Set(
        collection.contributionYears.filter(
          (value): value is number =>
            typeof value === "number" &&
            Number.isInteger(value) &&
            value >= 2008 &&
            value <= currentYear,
        ),
      )]
        .sort((a, b) => b - a)
        .slice(0, 15)
    : [currentYear];
  if (!availableYears.includes(year)) availableYears.unshift(year);

  const totalContributions =
    typeof calendar.totalContributions === "number" &&
    Number.isFinite(calendar.totalContributions)
      ? Math.min(10_000_000, Math.max(0, Math.round(calendar.totalContributions)))
      : weeks.reduce(
          (total, week) =>
            total + week.days.reduce((weekTotal, day) => weekTotal + day.count, 0),
          0,
        );

  return {
    year,
    totalContributions,
    availableYears,
    months,
    weeks,
    source: "github",
    partial: false,
  };
}

const fetchCachedContributionCalendar = unstable_cache(
  (username: string, year: number) => fetchContributionCalendar(username, year),
  ["github-contribution-calendar-v3"],
  { revalidate: CONTRIBUTION_CACHE_SECONDS },
);

const fetchCachedContributionDay = unstable_cache(
  (username: string, year: number, dayKey: string) => {
    const from = startOfUtcDay(new Date(`${dayKey}T00:00:00.000Z`));
    const to = new Date();
    return fetchContributionCalendar(username, year, { from, to });
  },
  ["github-contribution-day-v2"],
  { revalidate: CONTRIBUTION_DAY_CACHE_SECONDS },
);

const fetchCachedProfileContributionCalendar = unstable_cache(
  (username: string, year: number) =>
    fetchContributionCalendarFromProfile(username, year),
  ["github-contribution-profile-v4"],
  { revalidate: CONTRIBUTION_CACHE_SECONDS },
);

const fetchCachedProfileContributionDay = unstable_cache(
  (username: string, year: number, dayKey: string) => {
    const from = startOfUtcDay(new Date(`${dayKey}T00:00:00.000Z`));
    const to = new Date();
    return fetchContributionCalendarFromProfile(username, year, { from, to });
  },
  ["github-contribution-profile-day-v4"],
  { revalidate: CONTRIBUTION_DAY_CACHE_SECONDS },
);

async function fetchContributionCalendarCached(
  username: string,
  year: number,
): Promise<GitHubContributionCalendar | null> {
  try {
    const fromProfile = await fetchCachedProfileContributionCalendar(
      username,
      year,
    );
    if (fromProfile) return fromProfile;
  } catch (error) {
    if (error instanceof GitHubActivityError) throw error;
  }

  if (!process.env.GITHUB_TOKEN?.trim()) return null;
  return fetchCachedContributionCalendar(username, year);
}

async function fetchContributionDayCached(
  username: string,
  year: number,
  dayKey: string,
): Promise<GitHubContributionCalendar | null> {
  try {
    const fromProfile = await fetchCachedProfileContributionDay(
      username,
      year,
      dayKey,
    );
    if (fromProfile) return fromProfile;
  } catch (error) {
    if (error instanceof GitHubActivityError) throw error;
  }

  if (!process.env.GITHUB_TOKEN?.trim()) return null;
  return fetchCachedContributionDay(username, year, dayKey);
}

async function persistContributionDays(
  username: string,
  days: ContributionDayMap,
  availableYears: number[],
  options: {
    source?: "profile" | "github";
    syncedYears?: number[];
  } = {},
) {
  try {
    await saveContributionCacheServer(username, days, availableYears, {
      source: options.source ?? "profile",
      version: CONTRIBUTION_CACHE_VERSION,
      syncedYears: options.syncedYears,
    });
  } catch {
    // Cache persistence must never break activity responses.
  }
}

/**
 * Fetch and store every available contribution year that is not yet fully synced.
 * Safe to run after the response via next/server `after()`.
 */
export async function ensureAllContributionYearsCached(
  username: string,
  seedYears: number[] = [],
) {
  const normalized = username.trim().toLowerCase();
  if (!isValidGitHubUsername(normalized)) return;

  const cached = await loadContributionCacheServer(normalized);
  let days = cached?.days ?? {};
  let availableYears = normalizeAvailableYears([
    ...(cached?.availableYears ?? []),
    ...seedYears,
  ]);
  let syncedYears = normalizeSyncedYears(cached?.syncedYears ?? []);

  // Discover years from the newest scrape if we do not know them yet.
  if (availableYears.length <= 1 || seedYears.length === 0) {
    try {
      const currentYear = new Date().getUTCFullYear();
      const probe = await fetchContributionCalendarCached(normalized, currentYear);
      if (probe) {
        availableYears = normalizeAvailableYears([
          ...availableYears,
          ...probe.availableYears,
          currentYear,
        ]);
        if (!syncedYears.includes(currentYear)) {
          days = replaceYearDays(
            days,
            currentYear,
            fillYearDayGaps(extractDaysFromCalendar(probe), currentYear),
          );
          syncedYears = normalizeSyncedYears([...syncedYears, currentYear]);
          await persistContributionDays(normalized, days, availableYears, {
            source: "profile",
            syncedYears,
          });
        }
      }
    } catch {
      // Continue with whatever years we already know.
    }
  }

  const missing = availableYears.filter((year) => !syncedYears.includes(year));
  for (const year of missing) {
    try {
      const calendar = await fetchContributionCalendarCached(normalized, year);
      if (!calendar) continue;
      days = replaceYearDays(
        days,
        year,
        fillYearDayGaps(extractDaysFromCalendar(calendar), year),
      );
      availableYears = normalizeAvailableYears([
        ...availableYears,
        ...calendar.availableYears,
      ]);
      syncedYears = normalizeSyncedYears([...syncedYears, year]);
      await persistContributionDays(normalized, days, availableYears, {
        source: "profile",
        syncedYears,
      });
    } catch {
      // Keep going so one bad year does not block the rest.
    }
  }
}

async function resolveContributionCalendar(
  username: string,
  year: number,
  pushEvents: GitHubEvent[],
): Promise<GitHubContributionCalendar> {
  const cached = await loadContributionCacheServer(username);
  const cachedDays = cached?.days ?? {};
  const cachedYears = cached?.availableYears ?? [];
  const syncedYears = normalizeSyncedYears(cached?.syncedYears ?? []);

  if (hasYearCoverage(cachedDays, year, cached)) {
    const todayKey = startOfUtcDay().toISOString().slice(0, 10);
    const { to } = contributionRange(year);
    const includesToday = startOfUtcDay(to) >= startOfUtcDay();

    let days = cachedDays;
    let availableYears = cachedYears;
    let source: GitHubContributionCalendar["source"] = "github";
    let partial = false;

    if (includesToday) {
      try {
        const todayCalendar = await fetchContributionDayCached(
          username,
          year,
          todayKey,
        );
        if (todayCalendar) {
          days = mergeDayMaps(cachedDays, extractDaysFromCalendar(todayCalendar));
          // Keep every date in the current year explicitly cached.
          days = replaceYearDays(
            days,
            year,
            fillYearDayGaps(
              Object.fromEntries(
                Object.entries(days).filter(([date]) =>
                  date.startsWith(String(year)),
                ),
              ),
              year,
            ),
          );
          availableYears = normalizeAvailableYears([
            ...cachedYears,
            ...todayCalendar.availableYears,
          ]);
          source = "github";
          partial = false;
          void persistContributionDays(username, days, availableYears, {
            source: "profile",
            syncedYears,
          });
        }
      } catch (error) {
        if (!(error instanceof GitHubActivityError) || error.status !== 429) {
          throw error;
        }
      }
    }

    return buildContributionCalendarFromDays(
      days,
      year,
      availableYears,
      source,
      partial,
    );
  }

  let contributions: GitHubContributionCalendar | null = null;
  try {
    contributions = await fetchContributionCalendarCached(username, year);
  } catch (error) {
    if (!(error instanceof GitHubActivityError) || error.status !== 429) throw error;
  }

  if (contributions) {
    const yearDays = fillYearDayGaps(
      extractDaysFromCalendar(contributions),
      year,
    );
    const days = replaceYearDays(cachedDays, year, yearDays);
    const availableYears = normalizeAvailableYears([
      ...cachedYears,
      ...contributions.availableYears,
    ]);
    const nextSyncedYears = normalizeSyncedYears([...syncedYears, year]);
    void persistContributionDays(username, days, availableYears, {
      source: "profile",
      syncedYears: nextSyncedYears,
    });
    return buildContributionCalendarFromDays(
      days,
      year,
      availableYears,
      "github",
      false,
    );
  }

  if (Object.keys(cachedDays).length > 0) {
    return buildContributionCalendarFromDays(
      cachedDays,
      year,
      cachedYears,
      "github",
      true,
    );
  }

  return buildEventContributionCalendar(pushEvents, year);
}

function parseRepositoryName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const parts = value.trim().split("/");
  if (parts.length !== 2) return null;
  const [owner, repository] = parts;
  if (
    !isValidGitHubUsername(owner) ||
    !GITHUB_REPOSITORY_PATTERN.test(repository) ||
    repository === "." ||
    repository === ".."
  ) {
    return null;
  }
  return `${owner}/${repository}`;
}

function normalizeRepositories(values: string[]) {
  const repositories: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const repository = parseRepositoryName(value);
    const key = repository?.toLowerCase();
    if (!repository || !key || seen.has(key)) continue;
    seen.add(key);
    repositories.push(repository);
    if (repositories.length === SELECTED_REPOSITORY_LIMIT) break;
  }

  return repositories;
}

function validIsoDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

async function fetchPublicEvents(username: string): Promise<GitHubEvent[]> {
  const { response, data } = await requestGitHub(
    `/users/${encodeURIComponent(username)}/events/public?per_page=${EVENT_LIMIT}`,
  );

  if (response.status === 404) {
    throw new GitHubActivityError(404, "GitHub user not found.");
  }
  if (!response.ok) {
    throw new GitHubActivityError(502, "GitHub could not provide public activity.");
  }
  if (!Array.isArray(data)) {
    throw new GitHubActivityError(
      502,
      "GitHub returned an invalid public activity response.",
    );
  }

  return (data as GitHubEvent[]).slice(0, EVENT_LIMIT);
}

const fetchCachedPublicEvents = unstable_cache(
  fetchPublicEvents,
  ["github-activity-public-events-v3"],
  { revalidate: EVENT_CACHE_SECONDS },
);

function getPushEvents(events: GitHubEvent[]) {
  return events.filter(
    (event) =>
      event.type === "PushEvent" &&
      event.public !== false &&
      parseRepositoryName(event.repo?.name) !== null &&
      validIsoDate(event.created_at) !== null,
  );
}

function getRecentRepositories(pushEvents: GitHubEvent[]) {
  const byName = new Map<string, RecentRepository>();

  for (const event of pushEvents) {
    const name = parseRepositoryName(event.repo?.name);
    const pushedAt = validIsoDate(event.created_at);
    if (!name || !pushedAt) continue;
    const key = name.toLowerCase();
    const current = byName.get(key);
    if (!current || pushedAt > current.pushedAt) {
      byName.set(key, { name, pushedAt });
    }
  }

  return [...byName.values()].sort((a, b) =>
    b.pushedAt.localeCompare(a.pushedAt),
  );
}

async function fetchPublicRepository(repository: string) {
  const parsedRepository = parseRepositoryName(repository);
  if (!parsedRepository) return null;
  const [owner, name] = parsedRepository.split("/");
  const { response, data } = await requestGitHub(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
  );

  if ([404, 451].includes(response.status)) return null;
  if (!response.ok || !data || typeof data !== "object" || Array.isArray(data)) {
    throw new GitHubActivityError(502, "GitHub could not verify a repository.");
  }

  const repositoryData = data as GitHubRepository;
  const fullName = parseRepositoryName(repositoryData.full_name);
  if (
    repositoryData.private !== false ||
    !fullName ||
    fullName.toLowerCase() !== parsedRepository.toLowerCase()
  ) {
    return null;
  }
  return fullName;
}

const fetchCachedPublicRepository = unstable_cache(
  fetchPublicRepository,
  ["github-activity-public-repository-v3"],
  { revalidate: REPOSITORY_CACHE_SECONDS },
);

async function fetchRepositoryCommits(
  repository: string,
  username: string,
): Promise<RepositoryCommitResult> {
  const parsedRepository = parseRepositoryName(repository);
  if (!parsedRepository || !isValidGitHubUsername(username)) {
    return { commits: [], hitLimit: false };
  }

  const [owner, name] = parsedRepository.split("/");
  const { response, data } = await requestGitHub(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/commits` +
      `?author=${encodeURIComponent(username)}&per_page=${COMMITS_PER_REPOSITORY}`,
  );

  if ([404, 409, 451].includes(response.status)) {
    return { commits: [], hitLimit: false };
  }
  if (!response.ok || !Array.isArray(data)) {
    throw new GitHubActivityError(
      502,
      "GitHub could not provide repository commits.",
    );
  }

  const repositoryUrl = `https://github.com/${parsedRepository}`;
  const commits: GitHubActivityCommit[] = [];

  for (const item of data as GitHubCommit[]) {
    const sha = typeof item.sha === "string" ? item.sha.trim() : "";
    const rawMessage =
      typeof item.commit?.message === "string" ? item.commit.message.trim() : "";
    const createdAt = validIsoDate(
      item.commit?.author?.date ?? item.commit?.committer?.date,
    );
    if (!GITHUB_SHA_PATTERN.test(sha) || !createdAt) continue;

    commits.push({
      sha,
      message:
        rawMessage.split(/\r?\n/, 1)[0]?.trim().slice(0, 300) || "Untitled commit",
      repository: parsedRepository,
      repositoryUrl,
      url: `${repositoryUrl}/commit/${sha}`,
      createdAt,
    });
  }

  return {
    commits,
    hitLimit: data.length >= COMMITS_PER_REPOSITORY,
  };
}

const fetchCachedRepositoryCommits = unstable_cache(
  fetchRepositoryCommits,
  ["github-activity-repository-commits-v3"],
  { revalidate: REPOSITORY_CACHE_SECONDS },
);

async function fetchRepositoryLanguages(repository: string) {
  const parsedRepository = parseRepositoryName(repository);
  if (!parsedRepository) return {} as Record<string, number>;
  const [owner, name] = parsedRepository.split("/");
  const { response, data } = await requestGitHub(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/languages`,
  );

  if ([404, 451].includes(response.status)) return {} as Record<string, number>;
  if (!response.ok || !data || typeof data !== "object" || Array.isArray(data)) {
    throw new GitHubActivityError(
      502,
      "GitHub could not provide repository languages.",
    );
  }

  const languages: Record<string, number> = {};
  for (const [language, bytes] of Object.entries(data)) {
    if (
      language.trim().length > 0 &&
      language.length <= 100 &&
      typeof bytes === "number" &&
      Number.isFinite(bytes) &&
      bytes > 0
    ) {
      languages[language] = bytes;
    }
  }
  return languages;
}

const fetchCachedRepositoryLanguages = unstable_cache(
  fetchRepositoryLanguages,
  ["github-activity-repository-languages-v3"],
  { revalidate: REPOSITORY_CACHE_SECONDS },
);

function filterCodingEvents(
  pushEvents: GitHubEvent[],
  mode: GitHubRepositoryMode,
  repositories: string[],
) {
  if (mode === "recent") return pushEvents;
  const selected = new Set(repositories.map((repository) => repository.toLowerCase()));
  return pushEvents.filter((event) => {
    const repository = parseRepositoryName(event.repo?.name)?.toLowerCase();
    if (!repository) return false;
    return mode === "include" ? selected.has(repository) : !selected.has(repository);
  });
}

function buildEventContributionCalendar(
  pushEvents: GitHubEvent[],
  year: number,
): GitHubContributionCalendar {
  const { from, to } = contributionRange(year);
  const rangeStart = new Date(from);
  rangeStart.setUTCHours(0, 0, 0, 0);
  const rangeEnd = new Date(to);
  rangeEnd.setUTCHours(0, 0, 0, 0);

  const counts = new Map<string, number>();
  for (const event of pushEvents) {
    const createdAt = validIsoDate(event.created_at);
    if (!createdAt) continue;
    const date = createdAt.slice(0, 10);
    const timestamp = Date.parse(`${date}T00:00:00.000Z`);
    if (timestamp < rangeStart.getTime() || timestamp > rangeEnd.getTime()) continue;
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }

  const firstWeek = new Date(rangeStart);
  firstWeek.setUTCDate(firstWeek.getUTCDate() - firstWeek.getUTCDay());
  const lastWeek = new Date(rangeEnd);
  lastWeek.setUTCDate(lastWeek.getUTCDate() + (6 - lastWeek.getUTCDay()));

  const weeks: GitHubContributionWeek[] = [];
  for (
    const week = new Date(firstWeek);
    week <= lastWeek;
    week.setUTCDate(week.getUTCDate() + 7)
  ) {
    const days: GitHubContributionDay[] = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const day = new Date(week);
      day.setUTCDate(week.getUTCDate() + weekday);
      if (day < rangeStart || day > rangeEnd) continue;
      const date = day.toISOString().slice(0, 10);
      const count = counts.get(date) ?? 0;
      days.push({
        date,
        weekday,
        count,
        level: contributionLevelFromCount(count),
      });
    }
    weeks.push({ firstDay: week.toISOString().slice(0, 10), days });
  }

  const monthFormatter = new Intl.DateTimeFormat("en", {
    month: "short",
    timeZone: "UTC",
  });
  const months: GitHubContributionMonth[] = [];
  const monthCursor = new Date(
    Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), 1),
  );
  while (monthCursor <= rangeEnd) {
    const visibleFirstDay = monthCursor < rangeStart ? rangeStart : monthCursor;
    const daysInMonth = new Date(
      Date.UTC(monthCursor.getUTCFullYear(), monthCursor.getUTCMonth() + 1, 0),
    ).getUTCDate();
    months.push({
      firstDay: visibleFirstDay.toISOString().slice(0, 10),
      name: monthFormatter.format(monthCursor),
      totalWeeks: Math.min(
        6,
        Math.ceil((monthCursor.getUTCDay() + daysInMonth) / 7),
      ),
    });
    monthCursor.setUTCMonth(monthCursor.getUTCMonth() + 1);
  }

  const currentYear = new Date().getUTCFullYear();
  const availableYears = [
    ...new Set([
      currentYear,
      year,
      ...pushEvents
        .map((event) => validIsoDate(event.created_at))
        .filter((value): value is string => Boolean(value))
        .map((value) => Number(value.slice(0, 4))),
    ]),
  ]
    .filter((value) => value >= 2008 && value <= currentYear)
    .sort((a, b) => b - a)
    .slice(0, 15);

  return {
    year,
    totalContributions: [...counts.values()].reduce((total, count) => total + count, 0),
    availableYears,
    months,
    weeks,
    source: "events",
    partial: true,
  };
}

function buildDailyActivity(pushEvents: GitHubEvent[], now: Date) {
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);

  const daily: GitHubActivityDay[] = [];
  const byDate = new Map<string, GitHubActivityDay>();
  for (let offset = DAY_COUNT - 1; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setUTCDate(today.getUTCDate() - offset);
    const entry = { date: day.toISOString().slice(0, 10), count: 0 };
    daily.push(entry);
    byDate.set(entry.date, entry);
  }

  for (const event of pushEvents) {
    const createdAt = validIsoDate(event.created_at);
    if (!createdAt) continue;
    const entry = byDate.get(createdAt.slice(0, 10));
    if (entry) entry.count += 1;
  }

  return daily;
}

function mergeCommits(results: RepositoryCommitResult[]) {
  const deduplicated = new Map<string, GitHubActivityCommit>();
  for (const result of results) {
    for (const commit of result.commits) {
      const key = `${commit.repository.toLowerCase()}:${commit.sha.toLowerCase()}`;
      const current = deduplicated.get(key);
      if (!current || commit.createdAt > current.createdAt) {
        deduplicated.set(key, commit);
      }
    }
  }
  return [...deduplicated.values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

function mergeLanguages(
  languageSets: Record<string, number>[],
  limit = LANGUAGE_DISPLAY_LIMIT,
) {
  const totals = new Map<string, number>();
  for (const languages of languageSets) {
    for (const [name, bytes] of Object.entries(languages)) {
      totals.set(name, (totals.get(name) ?? 0) + bytes);
    }
  }

  const entries = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const totalBytes = entries.reduce((total, [, bytes]) => total + bytes, 0);
  if (totalBytes <= 0) return [] as GitHubActivityLanguage[];

  const capped =
    entries.length <= limit
      ? entries
      : [
          ...entries.slice(0, limit - 1),
          [
            "Other",
            entries.slice(limit - 1).reduce((sum, [, bytes]) => sum + bytes, 0),
          ] as [string, number],
        ];

  return capped.map(([name, bytes]) => ({
    name,
    percentage: Math.round((bytes / totalBytes) * 10_000) / 100,
  }));
}

function repositoriesFromPushEventsInYear(pushEvents: GitHubEvent[], year: number) {
  const { from, to } = contributionRange(year);
  const fromMs = from.getTime();
  const toMs = to.getTime();
  const byName = new Map<string, RecentRepository>();

  for (const event of pushEvents) {
    const name = parseRepositoryName(event.repo?.name);
    const pushedAt = validIsoDate(event.created_at);
    if (!name || !pushedAt) continue;
    const pushedMs = Date.parse(pushedAt);
    if (!Number.isFinite(pushedMs) || pushedMs < fromMs || pushedMs > toMs) {
      continue;
    }
    const key = name.toLowerCase();
    const current = byName.get(key);
    if (!current || pushedAt > current.pushedAt) {
      byName.set(key, { name, pushedAt });
    }
  }

  return [...byName.values()].sort((a, b) =>
    b.pushedAt.localeCompare(a.pushedAt),
  );
}

async function requestGitHubSoft(path: string): Promise<GitHubRequestResult | null> {
  try {
    return await requestGitHub(path);
  } catch (error) {
    if (error instanceof GitHubActivityError && error.status === 429) {
      return null;
    }
    throw error;
  }
}

async function listUserRepositoriesPushedInYear(username: string, year: number) {
  const { from, to } = contributionRange(year);
  const fromMs = from.getTime();
  const toMs = to.getTime();
  const result = await requestGitHubSoft(
    `/users/${encodeURIComponent(username)}/repos?type=owner&sort=pushed&per_page=100`,
  );
  if (!result || !result.response.ok || !Array.isArray(result.data)) {
    return [] as string[];
  }

  const repositories: string[] = [];
  const seen = new Set<string>();
  for (const item of result.data) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const repo = item as {
      full_name?: unknown;
      private?: unknown;
      pushed_at?: unknown;
      fork?: unknown;
    };
    if (repo.private === true) continue;
    const pushedAt = validIsoDate(repo.pushed_at);
    if (!pushedAt) continue;
    const pushedMs = Date.parse(pushedAt);
    if (!Number.isFinite(pushedMs) || pushedMs < fromMs || pushedMs > toMs) {
      continue;
    }
    const fullName = parseRepositoryName(repo.full_name);
    if (!fullName) continue;
    const key = fullName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    repositories.push(fullName);
    if (repositories.length >= YEAR_LANGUAGE_REPOSITORY_LIMIT) break;
  }
  return repositories;
}

const fetchCachedUserRepositoriesPushedInYear = unstable_cache(
  listUserRepositoriesPushedInYear,
  ["github-activity-user-repos-year-v1"],
  { revalidate: REPOSITORY_CACHE_SECONDS },
);

async function discoverRepositoriesForYear(
  username: string,
  year: number,
  pushEvents: GitHubEvent[],
) {
  // Prefer already-fetched public events (no extra GitHub quota), then owned
  // repos pushed in-year. Avoid Search API — it rate-limits far more aggressively.
  const fromEvents = repositoriesFromPushEventsInYear(pushEvents, year).map(
    ({ name }) => name,
  );
  const fromOwned =
    fromEvents.length >= YEAR_LANGUAGE_REPOSITORY_LIMIT
      ? []
      : await fetchCachedUserRepositoriesPushedInYear(username, year);

  const combined: string[] = [];
  const seen = new Set<string>();
  for (const repository of [...fromEvents, ...fromOwned]) {
    const key = repository.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push(repository);
    if (combined.length >= YEAR_LANGUAGE_REPOSITORY_LIMIT) break;
  }
  return combined;
}

function applyRepositoryModeFilter(
  repositories: string[],
  mode: GitHubRepositoryMode,
  configuredRepositories: string[],
) {
  if (mode === "recent") {
    return repositories.slice(0, YEAR_LANGUAGE_REPOSITORY_LIMIT);
  }

  const selected = new Set(
    configuredRepositories.map((repository) => repository.toLowerCase()),
  );

  if (mode === "include") {
    const active = new Set(repositories.map((repository) => repository.toLowerCase()));
    const activeSelected = configuredRepositories.filter((repository) =>
      active.has(repository.toLowerCase()),
    );
    // If discovery could not confirm activity (rate limits / sparse events),
    // still use the explicitly selected repositories.
    return (
      activeSelected.length > 0 ? activeSelected : configuredRepositories
    ).slice(0, SELECTED_REPOSITORY_LIMIT);
  }

  return repositories
    .filter((repository) => !selected.has(repository.toLowerCase()))
    .slice(0, YEAR_LANGUAGE_REPOSITORY_LIMIT);
}

async function fetchLanguagesForRepositories(repositories: string[]) {
  const languageSets = await Promise.all(
    repositories.map(async (repository) => {
      try {
        return await fetchCachedRepositoryLanguages(repository);
      } catch (error) {
        if (error instanceof GitHubActivityError && error.status === 429) {
          return {} as Record<string, number>;
        }
        throw error;
      }
    }),
  );
  return mergeLanguages(languageSets);
}

async function persistLanguageYear(
  username: string,
  year: number,
  entry: LanguageYearCacheEntry,
  options: { markSynced?: boolean } = {},
) {
  const cached = await loadLanguageCacheServer(username);
  const byYear = replaceLanguageYear(cached?.byYear ?? {}, year, entry);
  const syncedYears = normalizeLanguageSyncedYears([
    ...(cached?.syncedYears ?? []),
    ...(options.markSynced !== false ? [year] : []),
  ]);
  await saveLanguageCacheServer(username, byYear, syncedYears, {
    version: LANGUAGE_CACHE_VERSION,
  });
}

async function resolveYearLanguages(
  username: string,
  year: number,
  mode: GitHubRepositoryMode,
  configuredRepositories: string[],
  pushEvents: GitHubEvent[],
): Promise<{ languages: GitHubActivityLanguage[]; repositories: string[] }> {
  const modeKey = languageModeKey(mode, configuredRepositories);
  const cached = await loadLanguageCacheServer(username);
  if (hasLanguageYearCoverage(cached, year, modeKey)) {
    const entry = cached!.byYear[String(year)]!;
    return {
      languages: entry.languages,
      repositories: entry.repositories,
    };
  }

  const stale = readLanguageYearEntry(cached, year, modeKey);

  try {
    const discovered = await discoverRepositoriesForYear(
      username,
      year,
      pushEvents,
    );
    const candidateRepositories = applyRepositoryModeFilter(
      discovered,
      mode,
      configuredRepositories,
    );

    const verifiedRepositories = (
      await Promise.all(
        candidateRepositories.map(async (repository) => {
          try {
            return await fetchCachedPublicRepository(repository);
          } catch (error) {
            if (error instanceof GitHubActivityError && error.status === 429) {
              return null;
            }
            throw error;
          }
        }),
      )
    ).filter((repository): repository is string => Boolean(repository));

    // If we could not verify anything (likely rate limited), keep stale data.
    if (verifiedRepositories.length === 0 && stale) {
      return {
        languages: stale.languages,
        repositories: stale.repositories,
      };
    }

    const languages = await fetchLanguagesForRepositories(verifiedRepositories);
    if (languages.length === 0 && stale) {
      return {
        languages: stale.languages,
        repositories: stale.repositories,
      };
    }

    const entry: LanguageYearCacheEntry = {
      languages,
      repositories: verifiedRepositories,
      modeKey,
      updatedAt: new Date().toISOString(),
    };

    const currentYear = new Date().getUTCFullYear();
    await persistLanguageYear(username, year, entry, {
      markSynced: year < currentYear,
    });

    return { languages, repositories: verifiedRepositories };
  } catch (error) {
    if (stale) {
      return {
        languages: stale.languages,
        repositories: stale.repositories,
      };
    }
    if (error instanceof GitHubActivityError && error.status === 429) {
      return { languages: [], repositories: [] };
    }
    throw error;
  }
}

export async function getGitHubActivity(
  username: string,
  options: GitHubActivityOptions = {},
): Promise<GitHubActivityResponse> {
  const normalizedUsername = username.trim();
  if (!isValidGitHubUsername(normalizedUsername)) {
    throw new TypeError("Invalid GitHub username.");
  }

  const includeCommits = options.includeCommits !== false;
  const includeCoding = options.includeCoding !== false;
  const includeContributions = includeCoding && options.includeContributions !== false;
  const includeLanguages = includeCoding && options.includeLanguages !== false;
  const commitLimit = Math.min(10, Math.max(1, Math.round(options.commitLimit ?? 5)));
  const repositoryMode = options.repositoryMode ?? "recent";
  const configuredRepositories = normalizeRepositories(options.repositories ?? []);
  const currentYear = new Date().getUTCFullYear();
  const contributionYear =
    Number.isInteger(options.contributionYear) &&
    (options.contributionYear ?? 0) >= 2008 &&
    (options.contributionYear ?? 0) <= currentYear
      ? (options.contributionYear as number)
      : currentYear;

  const events = await fetchCachedPublicEvents(normalizedUsername.toLowerCase());
  const pushEvents = getPushEvents(events);
  const recentRepositories = getRecentRepositories(pushEvents);
  const excluded = new Set(
    configuredRepositories.map((repository) => repository.toLowerCase()),
  );
  const eligibleRecentRepositories =
    repositoryMode === "exclude"
      ? recentRepositories.filter(({ name }) => !excluded.has(name.toLowerCase()))
      : recentRepositories;
  const candidateRepositories =
    repositoryMode === "include"
      ? configuredRepositories
      : eligibleRecentRepositories
          .slice(0, RECENT_REPOSITORY_LIMIT)
          .map(({ name }) => name);

  const needsRepositoryData = includeCommits;
  const verifiedRepositories = needsRepositoryData
    ? (
        await Promise.all(
          candidateRepositories.map((repository) =>
            fetchCachedPublicRepository(repository),
          ),
        )
      ).filter((repository): repository is string => Boolean(repository))
    : [];

  const repositoryData = await Promise.all(
    verifiedRepositories.map(async (repository) => {
      const commitResult = includeCommits
        ? await fetchCachedRepositoryCommits(
            repository,
            normalizedUsername.toLowerCase(),
          )
        : { commits: [], hitLimit: false };
      return { commitResult };
    }),
  );

  const allCommits = includeCommits
    ? mergeCommits(repositoryData.map(({ commitResult }) => commitResult))
    : [];
  const commits = allCommits.slice(0, commitLimit);
  const codingEvents = includeCoding
    ? filterCodingEvents(pushEvents, repositoryMode, configuredRepositories)
    : [];
  const daily = includeCoding ? buildDailyActivity(codingEvents, new Date()) : [];
  let contributions: GitHubContributionCalendar | null = null;
  if (includeContributions) {
    contributions = await resolveContributionCalendar(
      normalizedUsername.toLowerCase(),
      contributionYear,
      pushEvents,
    );
  }

  let languages: GitHubActivityLanguage[] = [];
  let languageRepositories: string[] = [];
  if (includeLanguages) {
    try {
      const yearLanguages = await resolveYearLanguages(
        normalizedUsername.toLowerCase(),
        contributionYear,
        repositoryMode,
        configuredRepositories,
        pushEvents,
      );
      languages = yearLanguages.languages;
      languageRepositories = yearLanguages.repositories;
    } catch (error) {
      // Languages are optional — never fail the whole activity payload for them.
      if (!(error instanceof GitHubActivityError && error.status === 429)) {
        // Keep empty languages for unexpected soft failures.
      }
    }
  }

  const selectionWasLimited =
    needsRepositoryData &&
    repositoryMode !== "include" &&
    eligibleRecentRepositories.length > RECENT_REPOSITORY_LIMIT;
  const responseRepositories =
    languageRepositories.length > 0 ? languageRepositories : verifiedRepositories;

  return {
    username: normalizedUsername,
    profileUrl: `https://github.com/${normalizedUsername}`,
    repositories: responseRepositories,
    commits,
    daily,
    languages,
    contributions,
    summary: {
      commits: commits.length,
      activeDays: daily.filter(({ count }) => count > 0).length,
      repositories: responseRepositories.length,
    },
    limited:
      events.length >= EVENT_LIMIT ||
      selectionWasLimited ||
      allCommits.length > commitLimit ||
      repositoryData.some(({ commitResult }) => commitResult.hitLimit),
  };
}
