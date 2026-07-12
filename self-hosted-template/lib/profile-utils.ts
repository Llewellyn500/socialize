import type {
  DeveloperActivity,
  Profile,
  ProfileLink,
  SocialLink
} from "@/types/profile";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const GITHUB_OWNER = /^(?!.*--)[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;
const GITHUB_REPOSITORY = /^[a-z\d_.-]{1,100}$/i;

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;
}

export function isValidRepositoryFullName(value: string): boolean {
  const parts = value.trim().split("/");
  return parts.length === 2 &&
    GITHUB_OWNER.test(parts[0]) &&
    GITHUB_REPOSITORY.test(parts[1]) &&
    parts[1] !== "." &&
    parts[1] !== "..";
}

export function repositoryNameTokens(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];

  return values.flatMap((entry) =>
    typeof entry === "string"
      ? entry.split(/[\s,]+/).map((name) => name.trim()).filter(Boolean)
      : []
  );
}

export function normalizeRepositoryNames(value: unknown): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const name of repositoryNameTokens(value)) {
    const key = name.toLowerCase();
    if (!isValidRepositoryFullName(name) || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
    if (names.length === 5) break;
  }

  return names;
}

export function isSafePublicUrl(value: string, allowMail = true): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" || (allowMail && url.protocol === "mailto:");
  } catch {
    return false;
  }
}

export function isSafeImageUrl(value: string): boolean {
  return (value.startsWith("/") && !value.startsWith("//")) || isSafePublicUrl(value, false);
}

function normalizeLink(value: unknown, index: number): ProfileLink | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<ProfileLink>;
  const title = text(candidate.title);
  const url = text(candidate.url);

  if (!title || !isSafePublicUrl(url)) {
    return null;
  }

  return {
    id: text(candidate.id, `link-${index + 1}`),
    title,
    description: text(candidate.description),
    url,
    enabled: candidate.enabled !== false
  };
}

function normalizeSocial(value: unknown, index: number): SocialLink | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<SocialLink>;
  const label = text(candidate.label);
  const url = text(candidate.url);

  if (!label || !isSafePublicUrl(url)) {
    return null;
  }

  return {
    id: text(candidate.id, `social-${index + 1}`),
    label,
    url
  };
}

export function cloneDeveloperActivity(
  activity: DeveloperActivity
): DeveloperActivity {
  return {
    ...activity,
    repositories: {
      ...activity.repositories,
      names: [...activity.repositories.names]
    },
    commits: { ...activity.commits },
    coding: { ...activity.coding }
  };
}

export function developerActivityHasVisibleModules(activity: DeveloperActivity): boolean {
  const codingVisible = activity.coding.enabled && (
    activity.coding.showContributionCount ||
    activity.coding.showHeatmap ||
    activity.coding.showYearSelector ||
    activity.coding.showLanguages
  );
  return activity.commits.enabled || codingVisible;
}

function normalizeDeveloperActivity(
  value: unknown,
  fallback: DeveloperActivity | undefined
): DeveloperActivity | undefined {
  if (!fallback) return undefined;
  if (!value || typeof value !== "object") return cloneDeveloperActivity(fallback);

  const candidate = value as Partial<DeveloperActivity>;
  const commits: Partial<DeveloperActivity["commits"]> = candidate.commits && typeof candidate.commits === "object"
    ? candidate.commits
    : {};
  const coding: Partial<DeveloperActivity["coding"]> = candidate.coding && typeof candidate.coding === "object"
    ? candidate.coding
    : {};
  const repositories: Partial<DeveloperActivity["repositories"]> =
    candidate.repositories && typeof candidate.repositories === "object"
      ? candidate.repositories
      : {};
  const windowDays = coding.windowDays === 7 || coding.windowDays === 14 || coding.windowDays === 30
    ? coding.windowDays
    : fallback.coding.windowDays;

  return {
    enabled: flag(candidate.enabled, fallback.enabled),
    githubUsername: text(candidate.githubUsername, fallback.githubUsername).replace(/^@/, ""),
    placement: candidate.placement === "after-links" || candidate.placement === "before-links"
      ? candidate.placement
      : fallback.placement,
    repositories: {
      mode: repositories.mode === "include" || repositories.mode === "exclude" || repositories.mode === "recent"
        ? repositories.mode
        : fallback.repositories.mode,
      names: Array.isArray(repositories.names)
        ? normalizeRepositoryNames(repositories.names)
        : [...fallback.repositories.names]
    },
    commits: {
      enabled: flag(commits.enabled, fallback.commits.enabled),
      title: text(commits.title, fallback.commits.title),
      limit: boundedInteger(commits.limit, fallback.commits.limit, 1, 10),
      showRepository: flag(commits.showRepository, fallback.commits.showRepository),
      showDate: flag(commits.showDate, fallback.commits.showDate)
    },
    coding: {
      enabled: flag(coding.enabled, fallback.coding.enabled),
      title: text(coding.title, fallback.coding.title),
      windowDays,
      showContributionCount: flag(
        coding.showContributionCount,
        fallback.coding.showContributionCount
      ),
      showHeatmap: flag(coding.showHeatmap, fallback.coding.showHeatmap),
      showMonthLabels: flag(coding.showMonthLabels, fallback.coding.showMonthLabels),
      showWeekdayLabels: flag(coding.showWeekdayLabels, fallback.coding.showWeekdayLabels),
      showLegend: flag(coding.showLegend, fallback.coding.showLegend),
      showYearSelector: flag(coding.showYearSelector, fallback.coding.showYearSelector),
      showLanguages: flag(coding.showLanguages, fallback.coding.showLanguages)
    }
  };
}

export function cloneProfile(profile: Profile): Profile {
  const cloned: Profile = {
    ...profile,
    links: profile.links.map((link) => ({ ...link })),
    socials: profile.socials.map((social) => ({ ...social }))
  };

  if (profile.developerActivity) {
    cloned.developerActivity = cloneDeveloperActivity(profile.developerActivity);
  } else {
    delete cloned.developerActivity;
  }

  return cloned;
}

export function normalizeProfile(value: unknown, fallback: Profile): Profile {
  if (!value || typeof value !== "object") {
    return cloneProfile(fallback);
  }

  const candidate = value as Partial<Profile>;
  const avatarUrl = text(candidate.avatarUrl);
  const links = Array.isArray(candidate.links)
    ? candidate.links
        .map(normalizeLink)
        .filter((link): link is ProfileLink => Boolean(link))
    : cloneProfile(fallback).links;
  const socials = Array.isArray(candidate.socials)
    ? candidate.socials
        .map(normalizeSocial)
        .filter((social): social is SocialLink => Boolean(social))
    : cloneProfile(fallback).socials;
  const developerActivity = normalizeDeveloperActivity(
    candidate.developerActivity,
    fallback.developerActivity
  );

  const normalized: Profile = {
    name: text(candidate.name, fallback.name),
    handle: text(candidate.handle, fallback.handle),
    role: text(candidate.role, fallback.role),
    bio: text(candidate.bio, fallback.bio),
    location: text(candidate.location, fallback.location),
    availability: text(candidate.availability, fallback.availability),
    avatarUrl: avatarUrl && isSafeImageUrl(avatarUrl) ? avatarUrl : "",
    accent: HEX_COLOR.test(text(candidate.accent)) ? text(candidate.accent) : fallback.accent,
    links,
    socials
  };

  if (developerActivity) normalized.developerActivity = developerActivity;

  return normalized;
}

export function profileInitials(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "SO";
}
