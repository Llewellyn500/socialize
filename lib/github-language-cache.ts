import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { GitHubActivityLanguage } from "@/lib/github-activity";

export type LanguageYearCacheEntry = {
  languages: GitHubActivityLanguage[];
  repositories: string[];
  modeKey: string;
  updatedAt: string;
};

export type GitHubLanguageCache = {
  username: string;
  byYear: Record<string, LanguageYearCacheEntry>;
  syncedYears: number[];
  version?: number;
  updatedAt?: string;
};

export const LANGUAGE_CACHE_VERSION = 1;
export const CURRENT_YEAR_LANGUAGE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

type FirestoreValue =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { timestampValue: string }
  | { nullValue: null }
  | { mapValue: { fields?: Record<string, FirestoreValue> } }
  | { arrayValue: { values?: FirestoreValue[] } };

const CACHE_COLLECTION = "githubLanguageCaches";
const MAX_YEARS = 15;
const MAX_LANGUAGES = 40;
const MAX_REPOSITORIES = 40;

function projectId() {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
}

export function languageCacheKey(username: string) {
  return username.trim().toLowerCase();
}

export function languageModeKey(
  mode: "recent" | "include" | "exclude",
  repositories: string[],
) {
  if (mode === "recent") return "recent";
  const list = [...repositories]
    .map((repository) => repository.trim().toLowerCase())
    .filter(Boolean)
    .sort();
  return `${mode}:${list.join(",")}`;
}

export function normalizeLanguageList(raw: unknown): GitHubActivityLanguage[] {
  if (!Array.isArray(raw)) return [];
  const languages: GitHubActivityLanguage[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as { name?: unknown; percentage?: unknown };
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const percentage =
      typeof record.percentage === "number" && Number.isFinite(record.percentage)
        ? Math.round(record.percentage * 100) / 100
        : null;
    if (!name || name.length > 100 || percentage === null || percentage < 0) continue;
    languages.push({ name: name.slice(0, 100), percentage: Math.min(100, percentage) });
    if (languages.length >= MAX_LANGUAGES) break;
  }
  return languages;
}

export function normalizeRepositoryList(raw: unknown) {
  if (!Array.isArray(raw)) return [] as string[];
  const repositories: string[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const name = entry.trim();
    const key = name.toLowerCase();
    if (!name || name.length > 200 || seen.has(key)) continue;
    seen.add(key);
    repositories.push(name.slice(0, 200));
    if (repositories.length >= MAX_REPOSITORIES) break;
  }
  return repositories;
}

export function normalizeSyncedYears(raw: unknown) {
  const currentYear = new Date().getUTCFullYear();
  if (!Array.isArray(raw)) return [] as number[];
  return [...new Set(
    raw
      .map((value) => (typeof value === "number" ? value : Number(value)))
      .filter(
        (year) =>
          Number.isInteger(year) && year >= 2008 && year <= currentYear,
      ),
  )]
    .sort((a, b) => b - a)
    .slice(0, MAX_YEARS);
}

function normalizeYearEntry(raw: unknown): LanguageYearCacheEntry | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const modeKey =
    typeof record.modeKey === "string" ? record.modeKey.trim().slice(0, 500) : "";
  if (!modeKey) return null;
  const updatedAt =
    typeof record.updatedAt === "string" &&
    Number.isFinite(Date.parse(record.updatedAt))
      ? record.updatedAt
      : new Date(0).toISOString();
  return {
    languages: normalizeLanguageList(record.languages),
    repositories: normalizeRepositoryList(record.repositories),
    modeKey,
    updatedAt,
  };
}

export function normalizeByYear(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {} as Record<string, LanguageYearCacheEntry>;
  }
  const byYear: Record<string, LanguageYearCacheEntry> = {};
  for (const [yearKey, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}$/.test(yearKey)) continue;
    const year = Number(yearKey);
    const currentYear = new Date().getUTCFullYear();
    if (!Number.isInteger(year) || year < 2008 || year > currentYear) continue;
    const normalized = normalizeYearEntry(entry);
    if (!normalized) continue;
    byYear[yearKey] = normalized;
    if (Object.keys(byYear).length >= MAX_YEARS) break;
  }
  return byYear;
}

export function hasLanguageYearCoverage(
  cache: GitHubLanguageCache | null | undefined,
  year: number,
  modeKey: string,
) {
  if (!cache || (cache.version ?? 0) < LANGUAGE_CACHE_VERSION) return false;
  const entry = cache.byYear[String(year)];
  if (!entry || entry.modeKey !== modeKey) return false;

  const currentYear = new Date().getUTCFullYear();
  if (year === currentYear) {
    const age = Date.now() - Date.parse(entry.updatedAt);
    if (!Number.isFinite(age) || age > CURRENT_YEAR_LANGUAGE_MAX_AGE_MS) {
      return false;
    }
    return true;
  }

  return cache.syncedYears.includes(year);
}

/** Any matching year entry, including stale current-year data. */
export function readLanguageYearEntry(
  cache: GitHubLanguageCache | null | undefined,
  year: number,
  modeKey: string,
) {
  if (!cache || (cache.version ?? 0) < LANGUAGE_CACHE_VERSION) return null;
  const entry = cache.byYear[String(year)];
  if (!entry || entry.modeKey !== modeKey) return null;
  return entry;
}

export function replaceLanguageYear(
  byYear: Record<string, LanguageYearCacheEntry>,
  year: number,
  entry: LanguageYearCacheEntry,
) {
  const next = { ...byYear, [String(year)]: entry };
  const keys = Object.keys(next)
    .map(Number)
    .filter((value) => Number.isInteger(value))
    .sort((a, b) => b - a)
    .slice(0, MAX_YEARS);
  const trimmed: Record<string, LanguageYearCacheEntry> = {};
  for (const key of keys) {
    trimmed[String(key)] = next[String(key)]!;
  }
  return trimmed;
}

function readString(fields: Record<string, FirestoreValue>, key: string) {
  const value = fields[key];
  return value && "stringValue" in value ? value.stringValue : "";
}

function readInteger(fields: Record<string, FirestoreValue>, key: string) {
  const value = fields[key];
  if (!value || !("integerValue" in value)) return undefined;
  const parsed = Number(value.integerValue);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function decodeSyncedYears(value: FirestoreValue | undefined) {
  if (!value || !("arrayValue" in value)) return [] as number[];
  return normalizeSyncedYears(
    (value.arrayValue.values ?? []).map((entry) =>
      "integerValue" in entry ? Number(entry.integerValue) : null,
    ),
  );
}

function decodeByYear(value: FirestoreValue | undefined) {
  if (!value || !("mapValue" in value)) return {} as Record<string, LanguageYearCacheEntry>;
  const fields = value.mapValue.fields ?? {};
  const raw: Record<string, unknown> = {};
  for (const [yearKey, entryValue] of Object.entries(fields)) {
    if (!("mapValue" in entryValue)) continue;
    const entryFields = entryValue.mapValue.fields ?? {};
    raw[yearKey] = {
      modeKey: readString(entryFields, "modeKey"),
      updatedAt: readString(entryFields, "updatedAt"),
      languages:
        entryFields.languages && "arrayValue" in entryFields.languages
          ? (entryFields.languages.arrayValue.values ?? []).map((item) => {
              if (!("mapValue" in item)) return null;
              const languageFields = item.mapValue.fields ?? {};
              return {
                name: readString(languageFields, "name"),
                percentage:
                  languageFields.percentage && "doubleValue" in languageFields.percentage
                    ? languageFields.percentage.doubleValue
                    : languageFields.percentage &&
                        "integerValue" in languageFields.percentage
                      ? Number(languageFields.percentage.integerValue)
                      : 0,
              };
            })
          : [],
      repositories:
        entryFields.repositories && "arrayValue" in entryFields.repositories
          ? (entryFields.repositories.arrayValue.values ?? []).map((item) =>
              "stringValue" in item ? item.stringValue : "",
            )
          : [],
    };
  }
  return normalizeByYear(raw);
}

function encodeLanguageList(languages: GitHubActivityLanguage[]): FirestoreValue {
  return {
    arrayValue: {
      values: languages.map((language) => ({
        mapValue: {
          fields: {
            name: { stringValue: language.name },
            percentage: { doubleValue: language.percentage },
          },
        },
      })),
    },
  };
}

function encodeByYear(
  byYear: Record<string, LanguageYearCacheEntry>,
): FirestoreValue {
  const fields: Record<string, FirestoreValue> = {};
  for (const [yearKey, entry] of Object.entries(byYear)) {
    fields[yearKey] = {
      mapValue: {
        fields: {
          modeKey: { stringValue: entry.modeKey },
          updatedAt: { stringValue: entry.updatedAt },
          languages: encodeLanguageList(entry.languages),
          repositories: {
            arrayValue: {
              values: entry.repositories.map((repository) => ({
                stringValue: repository,
              })),
            },
          },
        },
      },
    };
  }
  return { mapValue: { fields } };
}

async function fetchDocument(path: string) {
  const id = projectId();
  if (!id) return null;
  const url =
    `https://firestore.googleapis.com/v1/projects/${id}/databases/(default)/documents/${path}`;
  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) return null;
  const data = (await response.json()) as {
    fields?: Record<string, FirestoreValue>;
  };
  return data.fields ?? null;
}

export async function loadLanguageCacheServer(
  username: string,
): Promise<GitHubLanguageCache | null> {
  const key = languageCacheKey(username);
  if (!key) return null;
  const fields = await fetchDocument(`${CACHE_COLLECTION}/${key}`);
  if (!fields) return null;
  return {
    username: readString(fields, "username") || key,
    byYear: decodeByYear(fields.byYear),
    syncedYears: decodeSyncedYears(fields.syncedYears),
    version: readInteger(fields, "version"),
    updatedAt: readString(fields, "updatedAt"),
  };
}

export async function saveLanguageCacheServer(
  username: string,
  byYear: Record<string, LanguageYearCacheEntry>,
  syncedYears: number[],
  options: { version?: number } = {},
) {
  const id = projectId();
  const key = languageCacheKey(username);
  if (!id || !key) return false;

  const url =
    `https://firestore.googleapis.com/v1/projects/${id}/databases/(default)/documents/` +
    `${CACHE_COLLECTION}/${encodeURIComponent(key)}`;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  const writeUrl = apiKey ? `${url}?key=${encodeURIComponent(apiKey)}` : url;
  const version = options.version ?? LANGUAGE_CACHE_VERSION;
  const body = {
    fields: {
      username: { stringValue: key },
      byYear: encodeByYear(normalizeByYear(byYear)),
      syncedYears: {
        arrayValue: {
          values: normalizeSyncedYears(syncedYears).map((year) => ({
            integerValue: String(year),
          })),
        },
      },
      version: { integerValue: String(version) },
      updatedAt: { timestampValue: new Date().toISOString() },
    },
  };

  try {
    const response = await fetch(writeUrl, {
      method: "PATCH",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function loadLanguageCacheClient(
  username: string,
): Promise<GitHubLanguageCache | null> {
  if (!db) return null;
  const key = languageCacheKey(username);
  if (!key) return null;
  const snapshot = await getDoc(doc(db, CACHE_COLLECTION, key));
  if (!snapshot.exists()) return null;
  const data = snapshot.data() as Record<string, unknown>;
  return {
    username: typeof data.username === "string" ? data.username : key,
    byYear: normalizeByYear(data.byYear),
    syncedYears: normalizeSyncedYears(data.syncedYears),
    version: typeof data.version === "number" ? data.version : undefined,
    updatedAt:
      typeof data.updatedAt === "string"
        ? data.updatedAt
        : data.updatedAt &&
            typeof data.updatedAt === "object" &&
            data.updatedAt !== null &&
            "toDate" in data.updatedAt
          ? (data.updatedAt as { toDate: () => Date }).toDate().toISOString()
          : undefined,
  };
}

export async function saveLanguageCacheClient(
  username: string,
  year: number,
  entry: Omit<LanguageYearCacheEntry, "updatedAt"> & { updatedAt?: string },
  options: { syncedYear?: number; version?: number } = {},
) {
  if (!db) return;
  const key = languageCacheKey(username);
  if (!key) return;

  const existing = await loadLanguageCacheClient(key);
  const nextEntry: LanguageYearCacheEntry = {
    languages: normalizeLanguageList(entry.languages),
    repositories: normalizeRepositoryList(entry.repositories),
    modeKey: entry.modeKey.slice(0, 500),
    updatedAt: entry.updatedAt ?? new Date().toISOString(),
  };
  const byYear = replaceLanguageYear(existing?.byYear ?? {}, year, nextEntry);
  const syncedYears = normalizeSyncedYears([
    ...(existing?.syncedYears ?? []),
    ...(typeof options.syncedYear === "number" ? [options.syncedYear] : []),
  ]);

  await setDoc(
    doc(db, CACHE_COLLECTION, key),
    {
      username: key,
      byYear,
      syncedYears,
      version: options.version ?? LANGUAGE_CACHE_VERSION,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
