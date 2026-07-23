import "server-only";

import { unstable_cache } from "next/cache";

import type {
  GitHubActivityCommit,
  GitHubActivityData,
  GitHubActivityDay,
  GitHubActivityLanguage,
  GitHubContributionCalendar,
  GitHubContributionDay,
  GitHubContributionLevel,
  GitHubContributionMonth,
  GitHubContributionWeek
} from "@/types/github-activity";

const GITHUB_API = "https://api.github.com";
const GITHUB_GRAPHQL_API = "https://api.github.com/graphql";
const REVALIDATE_SECONDS = 15 * 60;
const CONTRIBUTION_REVALIDATE_SECONDS = 60 * 60;
const COMMIT_SHA = /^[a-f\d]{7,64}$/i;
const REPOSITORY_NAME = /^(?!.*--)[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?\/[a-z\d_.-]{1,100}$/i;

export type GitHubActivityOptions = {
  windowDays: 7 | 14 | 30;
  commitLimit: number;
  repositoryMode: "recent" | "include" | "exclude";
  repositories: string[];
  includeCommits: boolean;
  includeCoding: boolean;
  includeContributions: boolean;
  includeLanguages: boolean;
  contributionYear: number;
};

type GitHubSearchCommit = {
  sha?: string;
  html_url?: string;
  author?: { login?: string } | null;
  commit?: {
    message?: string;
    author?: { date?: string } | null;
    committer?: { date?: string } | null;
  };
  repository?: {
    full_name?: string;
    html_url?: string;
    private?: boolean;
  };
};

type GitHubCommitSearchResponse = {
  total_count?: number;
  incomplete_results?: boolean;
  items?: GitHubSearchCommit[];
};

type GitHubRepository = {
  full_name?: string | null;
  language?: string | null;
  pushed_at?: string | null;
  private?: boolean;
  archived?: boolean;
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
  errors?: unknown[];
  data?: {
    user?: null | {
      contributionsCollection?: {
        contributionYears?: unknown;
        contributionCalendar?: {
          totalContributions?: unknown;
          months?: unknown;
          weeks?: unknown;
        };
      };
    };
  };
};

export class GitHubActivityError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "GitHubActivityError";
    this.status = status;
  }
}

function githubHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Socialize-Self-Hosted",
    "X-GitHub-Api-Version": "2026-03-10"
  };
  const token = process.env.GITHUB_TOKEN?.trim();

  if (token) headers.Authorization = `Bearer ${token}`;

  return headers;
}

async function githubFetch<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: githubHeaders(),
    next: { revalidate: REVALIDATE_SECONDS }
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new GitHubActivityError("That GitHub account could not be found.", 404);
    }

    if (response.status === 403 || response.status === 429) {
      throw new GitHubActivityError(
        "GitHub activity is temporarily rate-limited. Try again in a few minutes.",
        503
      );
    }

    if (response.status === 401) {
      throw new GitHubActivityError(
        "GitHub rejected the configured token. Check GITHUB_TOKEN or remove it.",
        502
      );
    }

    throw new GitHubActivityError("GitHub could not return activity.");
  }

  try {
    return await response.json() as T;
  } catch {
    throw new GitHubActivityError("GitHub returned an unreadable response.");
  }
}

const CONTRIBUTION_QUERY = `
  query SocializeContributionCalendar($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionYears
        contributionCalendar {
          totalContributions
          months { firstDay name totalWeeks }
          weeks {
            firstDay
            contributionDays { contributionCount contributionLevel date weekday }
          }
        }
      }
    }
  }
`;

function contributionRange(year: number) {
  const now = new Date();
  if (year === now.getUTCFullYear()) {
    const from = new Date(now);
    from.setUTCFullYear(from.getUTCFullYear() - 1);
    from.setUTCDate(from.getUTCDate() + 1);
    from.setUTCHours(0, 0, 0, 0);
    return { from, to: now };
  }

  return {
    from: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)),
    to: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999))
  };
}

function validDateOnly(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return Number.isFinite(Date.parse(`${value}T00:00:00.000Z`)) ? value : null;
}

function toContributionLevel(value: unknown): GitHubContributionLevel {
  const levels: Record<string, GitHubContributionLevel> = {
    NONE: 0,
    FIRST_QUARTILE: 1,
    SECOND_QUARTILE: 2,
    THIRD_QUARTILE: 3,
    FOURTH_QUARTILE: 4
  };
  return typeof value === "string" ? (levels[value] ?? 0) : 0;
}

async function fetchContributionCalendar(
  username: string,
  year: number
): Promise<GitHubContributionCalendar | null> {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) return null;
  const { from, to } = contributionRange(year);

  let response: Response;
  try {
    response = await fetch(GITHUB_GRAPHQL_API, {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "Socialize-Self-Hosted"
      },
      body: JSON.stringify({
        query: CONTRIBUTION_QUERY,
        variables: { login: username, from: from.toISOString(), to: to.toISOString() }
      }),
      signal: AbortSignal.timeout(8_000)
    });
  } catch {
    return null;
  }

  if (response.status === 403 || response.status === 429) {
    throw new GitHubActivityError(
      "GitHub contribution data is temporarily rate-limited.",
      503
    );
  }
  if (!response.ok) return null;

  let body: GitHubGraphQLResponse;
  try {
    body = await response.json() as GitHubGraphQLResponse;
  } catch {
    return null;
  }
  if (Array.isArray(body.errors) && body.errors.length) return null;
  if (body.data?.user === null) {
    throw new GitHubActivityError("That GitHub account could not be found.", 404);
  }

  const collection = body.data?.user?.contributionsCollection;
  const calendar = collection?.contributionCalendar;
  if (!calendar || !Array.isArray(calendar.weeks)) return null;

  const weeks: GitHubContributionWeek[] = [];
  for (const raw of calendar.weeks.slice(0, 54) as GitHubGraphQLContributionWeek[]) {
    const firstDay = validDateOnly(raw.firstDay);
    if (!firstDay || !Array.isArray(raw.contributionDays)) continue;
    const days: GitHubContributionDay[] = [];
    for (const rawDay of raw.contributionDays.slice(0, 7) as GitHubGraphQLContributionDay[]) {
      const date = validDateOnly(rawDay.date);
      const weekday = typeof rawDay.weekday === "number" &&
        Number.isInteger(rawDay.weekday) && rawDay.weekday >= 0 && rawDay.weekday <= 6
        ? rawDay.weekday
        : null;
      if (!date || weekday === null) continue;
      const count = typeof rawDay.contributionCount === "number" &&
        Number.isFinite(rawDay.contributionCount)
        ? Math.min(1_000_000, Math.max(0, Math.round(rawDay.contributionCount)))
        : 0;
      days.push({
        date,
        weekday,
        count,
        level: toContributionLevel(rawDay.contributionLevel)
      });
    }
    weeks.push({ firstDay, days });
  }
  if (!weeks.length) return null;

  const months: GitHubContributionMonth[] = [];
  if (Array.isArray(calendar.months)) {
    for (const raw of calendar.months.slice(0, 13) as GitHubGraphQLContributionMonth[]) {
      const firstDay = validDateOnly(raw.firstDay);
      const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 12) : "";
      const totalWeeks = typeof raw.totalWeeks === "number" && Number.isInteger(raw.totalWeeks)
        ? Math.min(6, Math.max(1, raw.totalWeeks))
        : 1;
      if (firstDay && name) months.push({ firstDay, name, totalWeeks });
    }
  }

  const currentYear = new Date().getUTCFullYear();
  const availableYears = Array.isArray(collection?.contributionYears)
    ? [...new Set(collection.contributionYears.filter(
        (value): value is number => typeof value === "number" &&
          Number.isInteger(value) && value >= 2008 && value <= currentYear
      ))].sort((a, b) => b - a).slice(0, 10)
    : [currentYear];
  if (!availableYears.includes(year)) availableYears.unshift(year);

  const totalContributions = typeof calendar.totalContributions === "number" &&
    Number.isFinite(calendar.totalContributions)
    ? Math.min(10_000_000, Math.max(0, Math.round(calendar.totalContributions)))
    : weeks.reduce(
        (total, week) => total + week.days.reduce((sum, day) => sum + day.count, 0),
        0
      );

  return {
    year,
    totalContributions,
    availableYears,
    months,
    weeks,
    source: "github",
    partial: false
  };
}

const fetchCachedContributionCalendar = unstable_cache(
  fetchContributionCalendar,
  ["self-hosted-github-contributions-v1"],
  { revalidate: CONTRIBUTION_REVALIDATE_SECONDS }
);

function buildCommitContributionCalendar(
  commits: GitHubActivityCommit[],
  year: number
): GitHubContributionCalendar {
  const { from, to } = contributionRange(year);
  const rangeStart = new Date(Date.UTC(
    from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()
  ));
  const rangeEnd = new Date(Date.UTC(
    to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()
  ));
  const counts = new Map<string, number>();

  commits.forEach((commit) => {
    const date = safeDate(commit.date);
    if (!date) return;
    const day = date.slice(0, 10);
    const timestamp = Date.parse(`${day}T00:00:00.000Z`);
    if (timestamp >= rangeStart.getTime() && timestamp <= rangeEnd.getTime()) {
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
  });

  const firstWeek = new Date(rangeStart);
  firstWeek.setUTCDate(firstWeek.getUTCDate() - firstWeek.getUTCDay());
  const lastWeek = new Date(rangeEnd);
  lastWeek.setUTCDate(lastWeek.getUTCDate() + (6 - lastWeek.getUTCDay()));
  const weeks: GitHubContributionWeek[] = [];

  for (const week = new Date(firstWeek); week <= lastWeek; week.setUTCDate(week.getUTCDate() + 7)) {
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
        level: Math.min(4, count) as GitHubContributionLevel
      });
    }
    weeks.push({ firstDay: week.toISOString().slice(0, 10), days });
  }

  const monthFormatter = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" });
  const months: GitHubContributionMonth[] = [];
  const monthCursor = new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), 1));
  while (monthCursor <= rangeEnd) {
    const visibleFirstDay = monthCursor < rangeStart ? rangeStart : monthCursor;
    const daysInMonth = new Date(Date.UTC(
      monthCursor.getUTCFullYear(), monthCursor.getUTCMonth() + 1, 0
    )).getUTCDate();
    months.push({
      firstDay: visibleFirstDay.toISOString().slice(0, 10),
      name: monthFormatter.format(monthCursor),
      totalWeeks: Math.min(6, Math.ceil((monthCursor.getUTCDay() + daysInMonth) / 7))
    });
    monthCursor.setUTCMonth(monthCursor.getUTCMonth() + 1);
  }

  const currentYear = new Date().getUTCFullYear();
  const availableYears = [...new Set([
    currentYear,
    year,
    ...commits.map((commit) => Number(commit.date.slice(0, 4)))
  ])]
    .filter((value) => Number.isInteger(value) && value >= 2008 && value <= currentYear)
    .sort((a, b) => b - a)
    .slice(0, 10);

  return {
    year,
    totalContributions: [...counts.values()].reduce((total, count) => total + count, 0),
    availableYears,
    months,
    weeks,
    source: "events",
    partial: true
  };
}

function utcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildDays(from: Date, windowDays: 7 | 14 | 30): GitHubActivityDay[] {
  return Array.from({ length: windowDays }, (_, index) => {
    const date = new Date(from);
    date.setUTCDate(date.getUTCDate() + index);
    return { date: isoDay(date), count: 0 };
  });
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";
}

function safeGitHubUrl(value: unknown): string {
  if (typeof value !== "string" || value.length > 2048) return "";

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "github.com" || url.username || url.password) {
      return "";
    }

    return `${url.origin}${url.pathname}`;
  } catch {
    return "";
  }
}

function safeDate(value: unknown): string {
  if (typeof value !== "string" || value.length > 64) return "";
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : "";
}

function toCommit(
  value: unknown,
  username: string,
  fromTimestamp: number,
  throughTimestamp: number
): GitHubActivityCommit | null {
  if (!value || typeof value !== "object") return null;
  const item = value as GitHubSearchCommit;
  const author = cleanText(item.author?.login, 39).toLowerCase();
  const sha = cleanText(item.sha, 64);
  const repository = cleanText(item.repository?.full_name, 201);
  const repositoryUrl = safeGitHubUrl(item.repository?.html_url);
  const url = safeGitHubUrl(item.html_url);
  const date = safeDate(item.commit?.author?.date || item.commit?.committer?.date);
  const message = cleanText(item.commit?.message?.split("\n")[0], 240);
  const timestamp = date ? Date.parse(date) : Number.NaN;

  if (
    author !== username.toLowerCase() ||
    item.repository?.private !== false ||
    !COMMIT_SHA.test(sha) ||
    !REPOSITORY_NAME.test(repository) ||
    !url ||
    !repositoryUrl ||
    !message ||
    !Number.isFinite(timestamp) ||
    timestamp < fromTimestamp ||
    timestamp >= throughTimestamp
  ) {
    return null;
  }

  return {
    sha,
    message,
    url,
    repository,
    repositoryUrl,
    date
  };
}

function countLanguages(
  repositories: unknown[],
  from: Date,
  selectedRepositories: Set<string>
): GitHubActivityLanguage[] {
  const counts = new Map<string, number>();

  repositories.forEach((value) => {
    if (!value || typeof value !== "object") return;
    const repository = value as GitHubRepository;
    const fullName = cleanText(repository.full_name, 140);
    const language = cleanText(repository.language, 40);
    const pushedAt = safeDate(repository.pushed_at);

    if (
      repository.private !== false ||
      repository.archived ||
      !REPOSITORY_NAME.test(fullName) ||
      !selectedRepositories.has(fullName.toLowerCase()) ||
      !language ||
      !pushedAt ||
      new Date(pushedAt) < from
    ) {
      return;
    }

    counts.set(language, (counts.get(language) || 0) + 1);
  });

  return Array.from(counts, ([name, repositoryCount]) => ({ name, repositoryCount }))
    .sort((a, b) => b.repositoryCount - a.repositoryCount || a.name.localeCompare(b.name))
    .slice(0, 8);
}

function commitSearchUrl(
  username: string,
  fromDay: string,
  throughDay: string,
  page: number
): string {
  const params = new URLSearchParams({
    q: `author:${username} author-date:${fromDay}..${throughDay} is:public`,
    sort: "author-date",
    order: "desc",
    per_page: "100",
    page: String(page)
  });

  return `${GITHUB_API}/search/commits?${params.toString()}`;
}

export async function getGitHubActivity(
  username: string,
  options: GitHubActivityOptions
): Promise<GitHubActivityData> {
  const safeCommitLimit = Number.isFinite(options.commitLimit)
    ? Math.min(10, Math.max(1, Math.round(options.commitLimit)))
    : 5;
  const windowDays = options.windowDays;
  const currentYear = new Date().getUTCFullYear();
  const contributionYear = Number.isInteger(options.contributionYear) &&
    options.contributionYear >= 2008 && options.contributionYear <= currentYear
    ? options.contributionYear
    : currentYear;
  const configuredRepositories = Array.from(
    new Map(
      options.repositories
        .filter((repository) => REPOSITORY_NAME.test(repository))
        .slice(0, 5)
        .map((repository) => [repository.toLowerCase(), repository])
    ).values()
  );
  const today = utcDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const through = isoDay(today);
  const from = new Date(today);
  from.setUTCDate(from.getUTCDate() - (windowDays - 1));
  const fromDay = isoDay(from);
  const encodedUsername = encodeURIComponent(username);

  let repositories: GitHubRepository[] = [];
  if (options.includeCoding && options.includeLanguages) {
    repositories = await githubFetch<GitHubRepository[]>(
      `${GITHUB_API}/users/${encodedUsername}/repos?type=owner&sort=pushed&direction=desc&per_page=100`
    );
    if (!Array.isArray(repositories)) {
      throw new GitHubActivityError("GitHub returned an unreadable repository response.");
    }
  } else {
    await githubFetch<Record<string, unknown>>(`${GITHUB_API}/users/${encodedUsername}`);
  }
  const firstPage = await githubFetch<GitHubCommitSearchResponse>(
    commitSearchUrl(username, fromDay, through, 1)
  );
  if (!firstPage || typeof firstPage !== "object" || Array.isArray(firstPage)) {
    throw new GitHubActivityError("GitHub returned an unreadable commit response.");
  }
  const totalCommits = typeof firstPage?.total_count === "number" && Number.isFinite(firstPage.total_count)
    ? Math.min(1_000_000, Math.max(0, Math.floor(firstPage.total_count)))
    : 0;
  const maxPages = process.env.GITHUB_TOKEN ? 3 : 1;
  const pageCount = Math.min(maxPages, Math.max(1, Math.ceil(totalCommits / 100)));
  const additionalPages = pageCount > 1
    ? await Promise.all(
        Array.from({ length: pageCount - 1 }, (_, index) =>
          githubFetch<GitHubCommitSearchResponse>(
            commitSearchUrl(username, fromDay, through, index + 2)
          )
        )
      )
    : [];
  const rawItems = [firstPage, ...additionalPages].flatMap((page) =>
    Array.isArray(page?.items) ? page.items : []
  );
  const deduplicated = new Map<string, GitHubActivityCommit>();

  rawItems.forEach((item) => {
    const commit = toCommit(item, username, from.getTime(), tomorrow.getTime());
    if (commit) deduplicated.set(`${commit.repository}:${commit.sha}`, commit);
  });

  const publicCommits = Array.from(deduplicated.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const excludedRepositories = new Set(
    configuredRepositories.map((repository) => repository.toLowerCase())
  );
  const eligibleCommits = options.repositoryMode === "exclude"
    ? publicCommits.filter((commit) => !excludedRepositories.has(commit.repository.toLowerCase()))
    : publicCommits;
  const candidateRepositoryNames = options.repositoryMode === "include"
    ? configuredRepositories
    : Array.from(
        new Map(
          eligibleCommits.map((commit) => [commit.repository.toLowerCase(), commit.repository])
        ).values()
      ).slice(0, 3);
  const publicRepositoryEvidence = new Set(
    publicCommits.map((commit) => commit.repository.toLowerCase())
  );
  repositories.forEach((repository) => {
    const fullName = cleanText(repository.full_name, 140);
    if (repository.private === false && REPOSITORY_NAME.test(fullName)) {
      publicRepositoryEvidence.add(fullName.toLowerCase());
    }
  });
  const selectedRepositoryNames = candidateRepositoryNames.filter((repository) =>
    publicRepositoryEvidence.has(repository.toLowerCase())
  );
  const selectedRepositorySet = new Set(
    selectedRepositoryNames.map((repository) => repository.toLowerCase())
  );
  const allCommits = eligibleCommits.filter((commit) =>
    selectedRepositorySet.has(commit.repository.toLowerCase())
  );
  const daily = buildDays(from, windowDays);
  const dayIndex = new Map(daily.map((day, index) => [day.date, index]));

  allCommits.forEach((commit) => {
    const date = isoDay(new Date(commit.date));
    const index = dayIndex.get(date);
    if (index !== undefined) daily[index].count += 1;
  });
  let contributions: GitHubContributionCalendar | null = null;
  if (options.includeCoding && options.includeContributions) {
    try {
      contributions = await fetchCachedContributionCalendar(
        username.toLowerCase(),
        contributionYear
      );
    } catch (error) {
      if (!(error instanceof GitHubActivityError) || error.status !== 503) throw error;
    }
    contributions ??= buildCommitContributionCalendar(publicCommits, contributionYear);
  }

  return {
    username,
    profileUrl: `https://github.com/${encodeURIComponent(username)}`,
    repositories: selectedRepositoryNames,
    windowDays,
    commits: options.includeCommits ? allCommits.slice(0, safeCommitLimit) : [],
    daily: options.includeCoding ? daily : [],
    languages: options.includeCoding && options.includeLanguages
      ? countLanguages(repositories, from, selectedRepositorySet)
      : [],
    contributions,
    totalCommits: allCommits.length,
    sampledCommitCount: allCommits.length,
    activeDays: options.includeCoding ? daily.filter((day) => day.count > 0).length : 0,
    truncated:
      firstPage?.incomplete_results === true ||
      totalCommits > publicCommits.length ||
      (options.repositoryMode !== "include" &&
        new Set(eligibleCommits.map((commit) => commit.repository.toLowerCase())).size > 3),
    generatedAt: new Date().toISOString()
  };
}
