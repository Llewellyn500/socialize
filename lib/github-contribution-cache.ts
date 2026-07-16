import type {
  GitHubContributionCalendar,
  GitHubContributionDay,
  GitHubContributionLevel,
  GitHubContributionMonth,
  GitHubContributionWeek,
} from "@/lib/github-activity";
import { firestoreAdminRequest } from "@/lib/firebase-admin-rest";
import { firebasePublicDocumentUrl } from "@/lib/firebase-public-rest";

export type ContributionDayCacheEntry = {
  count: number;
  level: GitHubContributionLevel;
};

export type ContributionDayMap = Record<string, ContributionDayCacheEntry>;

export type GitHubContributionCache = {
  username: string;
  days: ContributionDayMap;
  availableYears: number[];
  updatedAt?: string;
  /** Bump when the fetch source/format changes so stale caches re-sync. */
  version?: number;
  source?: "profile" | "github" | "events";
  /** Calendar years that were fully scraped from GitHub's profile graph. */
  syncedYears?: number[];
};

export const CONTRIBUTION_CACHE_VERSION = 6;

type FirestoreValue =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { timestampValue: string }
  | { nullValue: null }
  | { mapValue: { fields?: Record<string, FirestoreValue> } }
  | { arrayValue: { values?: FirestoreValue[] } };

const CACHE_COLLECTION = "githubContributionCaches";
const MAX_CACHED_DAYS = 5_500;
const COVERAGE_THRESHOLD = 0.9;

export function contributionCacheKey(username: string) {
  return username.trim().toLowerCase();
}

export function utcDateString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function startOfUtcDay(date = new Date()) {
  const next = new Date(date);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function validDateOnly(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  return Number.isFinite(Date.parse(`${value}T00:00:00.000Z`)) ? value : null;
}

function normalizeLevel(value: unknown): GitHubContributionLevel {
  const level = typeof value === "number" ? Math.round(value) : Number(value);
  if (level === 1 || level === 2 || level === 3 || level === 4) return level;
  return 0;
}

function normalizeCount(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(1_000_000, Math.max(0, Math.round(value)));
}

export function normalizeDayMap(raw: unknown): ContributionDayMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const days: ContributionDayMap = {};
  for (const [date, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!validDateOnly(date) || Object.keys(days).length >= MAX_CACHED_DAYS) continue;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as { count?: unknown; level?: unknown };
    days[date] = {
      count: normalizeCount(record.count),
      level: normalizeLevel(record.level),
    };
  }
  return days;
}

export function normalizeAvailableYears(raw: unknown) {
  const currentYear = new Date().getUTCFullYear();
  if (!Array.isArray(raw)) return [currentYear];
  return [...new Set(
    raw.filter(
      (value): value is number =>
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 2008 &&
        value <= currentYear,
    ),
  )]
    .sort((a, b) => b - a)
    .slice(0, 15);
}

export function extractDaysFromCalendar(
  calendar: GitHubContributionCalendar,
): ContributionDayMap {
  const days: ContributionDayMap = {};
  for (const week of calendar.weeks) {
    for (const day of week.days) {
      days[day.date] = { count: day.count, level: day.level };
    }
  }
  return days;
}

/** Ensure every date in the year range exists in the map (explicit zeros). */
export function fillYearDayGaps(
  yearDays: ContributionDayMap,
  year: number,
): ContributionDayMap {
  const { from, to } = contributionRangeForYear(year);
  const filled: ContributionDayMap = { ...yearDays };
  for (const date of eachUtcDate(from, to)) {
    if (!filled[date]) filled[date] = { count: 0, level: 0 };
  }
  return filled;
}

export function mergeDayMaps(
  ...maps: Array<ContributionDayMap | null | undefined>
): ContributionDayMap {
  const merged: ContributionDayMap = {};
  for (const map of maps) {
    if (!map) continue;
    for (const [date, entry] of Object.entries(map)) {
      if (!validDateOnly(date)) continue;
      if (Object.keys(merged).length >= MAX_CACHED_DAYS && !(date in merged)) {
        continue;
      }
      merged[date] = entry;
    }
  }
  return merged;
}

/** Replace all cached days for a calendar year with a fresh full-year scrape. */
export function replaceYearDays(
  existing: ContributionDayMap,
  year: number,
  yearDays: ContributionDayMap,
): ContributionDayMap {
  const prefix = String(year);
  const merged: ContributionDayMap = {};
  for (const [date, entry] of Object.entries(existing)) {
    if (!date.startsWith(prefix)) merged[date] = entry;
  }
  return mergeDayMaps(merged, yearDays);
}

export function normalizeSyncedYears(raw: unknown) {
  const currentYear = new Date().getUTCFullYear();
  if (!Array.isArray(raw)) return [] as number[];
  return [...new Set(
    raw.filter(
      (value): value is number =>
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 2008 &&
        value <= currentYear,
    ),
  )]
    .sort((a, b) => b - a)
    .slice(0, 15);
}

export function contributionRangeForYear(year: number) {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const from = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const to =
    year === currentYear
      ? now
      : new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
  return { from, to };
}

function eachUtcDate(from: Date, to: Date) {
  const dates: string[] = [];
  const cursor = startOfUtcDay(from);
  const end = startOfUtcDay(to);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function coverageRatio(days: ContributionDayMap, year: number) {
  const { from, to } = contributionRangeForYear(year);
  const expected = eachUtcDate(from, to);
  if (expected.length === 0) return 0;
  let present = 0;
  for (const date of expected) {
    if (days[date]) present += 1;
  }
  return present / expected.length;
}

export function hasYearCoverage(
  days: ContributionDayMap,
  year: number,
  cache?: Pick<GitHubContributionCache, "version" | "source" | "syncedYears"> | null,
) {
  if ((cache?.version ?? 0) < CONTRIBUTION_CACHE_VERSION) return false;
  if (cache?.source === "events") return false;
  // Only reuse a year after an explicit full profile scrape for that year.
  // Day presence alone is not enough — zeros from a partial fill used to
  // look like complete coverage and blocked Aug–Dec from ever refreshing.
  if (!(cache?.syncedYears ?? []).includes(year)) return false;
  return coverageRatio(days, year) >= COVERAGE_THRESHOLD;
}

function monthLabelsForRange(from: Date, to: Date): GitHubContributionMonth[] {
  const monthFormatter = new Intl.DateTimeFormat("en", {
    month: "short",
    timeZone: "UTC",
  });
  const months: GitHubContributionMonth[] = [];
  const rangeStart = startOfUtcDay(from);
  const rangeEnd = startOfUtcDay(to);
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
  return months;
}

export function buildContributionCalendarFromDays(
  days: ContributionDayMap,
  year: number,
  availableYears: number[],
  source: GitHubContributionCalendar["source"] = "github",
  partial = false,
): GitHubContributionCalendar {
  const { from, to } = contributionRangeForYear(year);
  const rangeStart = startOfUtcDay(from);
  const rangeEnd = startOfUtcDay(to);
  const yearPrefix = String(year);

  const firstWeek = new Date(rangeStart);
  firstWeek.setUTCDate(firstWeek.getUTCDate() - firstWeek.getUTCDay());
  const lastWeek = new Date(rangeEnd);
  lastWeek.setUTCDate(lastWeek.getUTCDate() + (6 - lastWeek.getUTCDay()));

  const weeks: GitHubContributionWeek[] = [];
  let totalContributions = 0;

  for (
    const week = new Date(firstWeek);
    week <= lastWeek;
    week.setUTCDate(week.getUTCDate() + 7)
  ) {
    const weekDays: GitHubContributionDay[] = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const day = new Date(week);
      day.setUTCDate(week.getUTCDate() + weekday);
      if (day < rangeStart || day > rangeEnd) continue;
      const date = day.toISOString().slice(0, 10);
      // Never emit cells outside the selected calendar year.
      if (!date.startsWith(yearPrefix)) continue;
      const cached = days[date];
      const count = cached?.count ?? 0;
      const level = cached?.level ?? 0;
      totalContributions += count;
      weekDays.push({ date, weekday, count, level });
    }
    if (weekDays.length === 0) continue;
    weeks.push({
      // Keep the week-start Sunday for layout/month spanning, even when it
      // falls in the previous year — only in-year days are included above.
      firstDay: week.toISOString().slice(0, 10),
      days: weekDays,
    });
  }

  const currentYear = new Date().getUTCFullYear();
  const years = normalizeAvailableYears([
    ...availableYears,
    year,
    currentYear,
  ]);

  return {
    year,
    totalContributions,
    availableYears: years,
    months: monthLabelsForRange(rangeStart, rangeEnd).filter((month) =>
      month.firstDay.startsWith(yearPrefix),
    ),
    weeks,
    source,
    partial,
  };
}

function readInteger(fields: Record<string, FirestoreValue> | undefined, key: string) {
  const value = fields?.[key];
  if (!value) return undefined;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  return undefined;
}

function readString(fields: Record<string, FirestoreValue> | undefined, key: string) {
  const value = fields?.[key];
  return value && "stringValue" in value ? value.stringValue : undefined;
}

function decodeDayMap(value: FirestoreValue | undefined): ContributionDayMap {
  if (!value || !("mapValue" in value)) return {};
  const fields = value.mapValue.fields ?? {};
  const raw: Record<string, { count?: number; level?: number }> = {};
  for (const [date, entry] of Object.entries(fields)) {
    if (!("mapValue" in entry)) continue;
    raw[date] = {
      count: readInteger(entry.mapValue.fields, "count"),
      level: readInteger(entry.mapValue.fields, "level"),
    };
  }
  return normalizeDayMap(raw);
}

function decodeAvailableYears(value: FirestoreValue | undefined) {
  if (!value || !("arrayValue" in value)) return normalizeAvailableYears([]);
  const values = value.arrayValue.values ?? [];
  return normalizeAvailableYears(
    values.map((entry) => {
      if ("integerValue" in entry) return Number(entry.integerValue);
      if ("doubleValue" in entry) return entry.doubleValue;
      return null;
    }),
  );
}

function decodeSyncedYears(value: FirestoreValue | undefined) {
  if (!value || !("arrayValue" in value)) return normalizeSyncedYears([]);
  const values = value.arrayValue.values ?? [];
  return normalizeSyncedYears(
    values.map((entry) => {
      if ("integerValue" in entry) return Number(entry.integerValue);
      if ("doubleValue" in entry) return entry.doubleValue;
      return null;
    }),
  );
}

function encodeDayMap(days: ContributionDayMap): FirestoreValue {
  const fields: Record<string, FirestoreValue> = {};
  for (const [date, entry] of Object.entries(days).slice(0, MAX_CACHED_DAYS)) {
    fields[date] = {
      mapValue: {
        fields: {
          count: { integerValue: String(entry.count) },
          level: { integerValue: String(entry.level) },
        },
      },
    };
  }
  return { mapValue: { fields } };
}

async function fetchDocument(path: string) {
  const url = firebasePublicDocumentUrl(path);
  if (!url) return null;
  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) return null;

  const data = (await response.json()) as {
    fields?: Record<string, FirestoreValue>;
  };
  return data.fields ?? null;
}

export async function loadContributionCacheServer(
  username: string,
): Promise<GitHubContributionCache | null> {
  const key = contributionCacheKey(username);
  if (!key) return null;

  const fields = await fetchDocument(`${CACHE_COLLECTION}/${key}`);
  if (!fields) return null;

  const storedUsername = readString(fields, "username") || key;
  return {
    username: storedUsername,
    days: decodeDayMap(fields.days),
    availableYears: decodeAvailableYears(fields.availableYears),
    syncedYears: decodeSyncedYears(fields.syncedYears),
    updatedAt: readString(fields, "updatedAt"),
    version: readInteger(fields, "version"),
    source:
      readString(fields, "source") === "profile" ||
      readString(fields, "source") === "github" ||
      readString(fields, "source") === "events"
        ? (readString(fields, "source") as GitHubContributionCache["source"])
        : undefined,
  };
}

export async function saveContributionCacheServer(
  username: string,
  days: ContributionDayMap,
  availableYears: number[],
  options: {
    source?: GitHubContributionCache["source"];
    version?: number;
    syncedYears?: number[];
  } = {},
) {
  const key = contributionCacheKey(username);
  if (!key) return false;
  const source = options.source ?? "profile";
  const version = options.version ?? CONTRIBUTION_CACHE_VERSION;
  const syncedYears = normalizeSyncedYears(options.syncedYears ?? []);

  const body = {
    fields: {
      username: { stringValue: key },
      days: encodeDayMap(normalizeDayMap(days)),
      availableYears: {
        arrayValue: {
          values: normalizeAvailableYears(availableYears).map((year) => ({
            integerValue: String(year),
          })),
        },
      },
      syncedYears: {
        arrayValue: {
          values: syncedYears.map((year) => ({
            integerValue: String(year),
          })),
        },
      },
      source: { stringValue: source },
      version: { integerValue: String(version) },
      updatedAt: { timestampValue: new Date().toISOString() },
    },
  };

  const response = await firestoreAdminRequest(
    `${CACHE_COLLECTION}/${encodeURIComponent(key)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return Boolean(response?.ok);
}
