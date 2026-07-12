import {
  coerceExternalUrl,
  emailFromLinkUrl,
  isEmailAddress,
  normalizeLinkUrl,
} from "@/lib/email-link";
import { sanitizeSocials, type SocialKey } from "@/lib/socials";

export type { SocialKey } from "@/lib/socials";
export { isSocialKey, SOCIAL_KEYS, socialLabel } from "@/lib/socials";

export type ProfileTheme = "terminal" | "paper" | "midnight" | "mono";
export type ProfileMediaType = "icon" | "thumbnail";

export type ProfileSection = {
  id: string;
  title: string;
  mediaUrl?: string;
  mediaType?: ProfileMediaType;
  hideTitle?: boolean;
};

export type ProfileLink = {
  id: string;
  title: string;
  url: string;
  description?: string;
  enabled: boolean;
  kind?: "link" | "project" | "writing";
  sectionId?: string;
  mediaUrl?: string;
  mediaType?: ProfileMediaType;
};

export type ActivityWindowDays = 7 | 14 | 30;
export type RepositoryMode = "recent" | "include" | "exclude";

export type DeveloperActivityConfig = {
  enabled: boolean;
  githubUsername: string;
  placement: "before-links" | "after-links";
  repositories: {
    mode: RepositoryMode;
    names: string[];
  };
  commits: {
    enabled: boolean;
    title: string;
    limit: number;
    showRepository: boolean;
    showDate: boolean;
  };
  coding: {
    enabled: boolean;
    title: string;
    windowDays: ActivityWindowDays;
    showContributionCount: boolean;
    showHeatmap: boolean;
    showMonthLabels: boolean;
    showWeekdayLabels: boolean;
    showLegend: boolean;
    showYearSelector: boolean;
    showLanguages: boolean;
  };
};

export type ProfileConfig = {
  handle: string;
  displayName: string;
  role: string;
  bio: string;
  avatarUrl?: string;
  /** CDN URL for the pre-generated Open Graph image (Firebase Storage). */
  ogImageUrl?: string;
  location?: string;
  availability?: string;
  theme: ProfileTheme;
  accent: string;
  published: boolean;
  socials: Partial<Record<SocialKey, string>>;
  developerActivity?: DeveloperActivityConfig;
  sections?: ProfileSection[];
  links: ProfileLink[];
  updatedAt?: string;
};

export type LinkSectionGroup = {
  section: ProfileSection | null;
  links: ProfileLink[];
};

export const DEFAULT_DEVELOPER_ACTIVITY: DeveloperActivityConfig = {
  enabled: false,
  githubUsername: "",
  placement: "before-links",
  repositories: {
    mode: "recent",
    names: [],
  },
  commits: {
    enabled: true,
    title: "Recent commits",
    limit: 5,
    showRepository: true,
    showDate: true,
  },
  coding: {
    enabled: true,
    title: "Contributions",
    windowDays: 30,
    showContributionCount: true,
    showHeatmap: true,
    showMonthLabels: true,
    showWeekdayLabels: true,
    showLegend: true,
    showYearSelector: true,
    showLanguages: true,
  },
};

export const RESERVED_HANDLES = new Set([
  "acceptable-use",
  "api",
  "auth",
  "cookies",
  "dashboard",
  "docs",
  "forgot-password",
  "legal",
  "login",
  "onboarding",
  "privacy",
  "report",
  "security",
  "self-host",
  "settings",
  "sign-in",
  "sign-up",
  "sponsor",
  "support",
  "terms",
]);

export const demoProfile: ProfileConfig = {
  handle: "maya",
  displayName: "Maya Chen",
  role: "Systems engineer · open-source maintainer",
  bio: "I build reliable developer infrastructure and write about the decisions behind it.",
  avatarUrl: "/demo-avatar.jpg",
  location: "Toronto, Canada",
  availability: "Available for OSS collaborations",
  theme: "paper",
  accent: "#8a2be2",
  published: true,
  socials: {
    github: "https://github.com/",
    linkedin: "https://www.linkedin.com/",
    website: "https://example.com",
    email: "mailto:hello@example.com",
  },
  sections: [
    { id: "section-projects", title: "Open source" },
    { id: "section-writing", title: "Writing" },
  ],
  links: [
    {
      id: "project-relay",
      title: "Relay — queues without the ceremony",
      description: "My open-source job orchestration toolkit.",
      url: "https://github.com/",
      enabled: true,
      kind: "project",
      sectionId: "section-projects",
    },
    {
      id: "weekly-log",
      title: "This week in the terminal",
      description: "Commits, experiments, and small discoveries.",
      url: "https://github.com/",
      enabled: true,
      kind: "link",
      sectionId: "section-projects",
    },
    {
      id: "notes-systems",
      title: "Notes on systems that stay boring",
      description: "A field guide to predictable infrastructure.",
      url: "https://dev.to/",
      enabled: true,
      kind: "writing",
      sectionId: "section-writing",
    },
  ],
};

export function normalizeHandle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}

export function isValidHandle(value: string) {
  const normalized = normalizeHandle(value);
  return (
    normalized.length >= 3 &&
    normalized === value.toLowerCase().replace(/^@/, "") &&
    !RESERVED_HANDLES.has(normalized)
  );
}

export function isSafeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "mailto:";
  } catch {
    return false;
  }
}

/** Normalize pasted media URLs (add https:// when missing). Local paths stay as-is. */
export function coerceProfileMediaUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  if (/^https:\/\//i.test(trimmed)) return trimmed;
  if (/^http:\/\//i.test(trimmed)) {
    return `https://${trimmed.slice("http://".length)}`;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function isSafeProfileMediaUrl(value?: string) {
  if (!value) return false;
  const trimmed = coerceProfileMediaUrl(value);
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function normalizeGitHubUsername(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (url.hostname.toLowerCase().replace(/^www\./, "") === "github.com") {
      return (url.pathname.split("/").filter(Boolean)[0] || "").slice(0, 39);
    }
  } catch {
    // Treat non-URL input as a GitHub username below.
  }

  return trimmed.replace(/^@/, "").slice(0, 39);
}

export function isValidGitHubUsername(value: string) {
  const username = normalizeGitHubUsername(value);
  return /^(?!.*--)(?:[a-z\d]|[a-z\d][a-z\d-]{0,37}[a-z\d])$/i.test(username);
}

export function normalizeGitHubRepository(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  let candidate = trimmed;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (url.hostname.toLowerCase().replace(/^www\./, "") === "github.com") {
      candidate = url.pathname.split("/").filter(Boolean).slice(0, 2).join("/");
    }
  } catch {
    // Treat non-URL input as an owner/repository name below.
  }

  return candidate.replace(/^github\.com\//i, "").replace(/\.git$/i, "").replace(/^\/+|\/+$/g, "");
}

export function isValidGitHubRepository(value: string) {
  const repository = normalizeGitHubRepository(value);
  const [owner, name, extra] = repository.split("/");
  return Boolean(
    !extra &&
      isValidGitHubUsername(owner ?? "") &&
      name &&
      name !== "." &&
      name !== ".." &&
      /^[a-z\d._-]{1,100}$/i.test(name),
  );
}

export function normalizeGitHubRepositories(values: unknown) {
  const entries = Array.isArray(values)
    ? values.filter((value): value is string => typeof value === "string")
    : typeof values === "string"
      ? values.split(/[\s,]+/)
      : [];
  const repositories: string[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const repository = normalizeGitHubRepository(entry);
    const key = repository.toLowerCase();
    if (!repository || !isValidGitHubRepository(repository) || seen.has(key)) continue;
    seen.add(key);
    repositories.push(repository);
    if (repositories.length === 5) break;
  }

  return repositories;
}

export function resolveDeveloperActivity(
  value?: Partial<DeveloperActivityConfig>,
): DeveloperActivityConfig {
  return {
    ...DEFAULT_DEVELOPER_ACTIVITY,
    ...value,
    repositories: {
      ...DEFAULT_DEVELOPER_ACTIVITY.repositories,
      ...(value?.repositories ?? {}),
    },
    commits: {
      ...DEFAULT_DEVELOPER_ACTIVITY.commits,
      ...(value?.commits ?? {}),
    },
    coding: {
      ...DEFAULT_DEVELOPER_ACTIVITY.coding,
      ...(value?.coding ?? {}),
    },
  };
}

export function developerActivityHasVisibleModules(
  value: DeveloperActivityConfig,
): boolean {
  const codingVisible =
    value.coding.enabled &&
    (value.coding.showContributionCount ||
      value.coding.showHeatmap ||
      value.coding.showYearSelector ||
      value.coding.showLanguages);
  return value.commits.enabled || codingVisible;
}

/** Known site hostnames → display / company name for auto link titles. */
const LINK_BRAND_NAMES: Record<string, string> = {
  "github.com": "GitHub",
  "gitlab.com": "GitLab",
  "bitbucket.org": "Bitbucket",
  "linkedin.com": "LinkedIn",
  "x.com": "X",
  "twitter.com": "X",
  "youtube.com": "YouTube",
  "youtu.be": "YouTube",
  "dev.to": "DEV",
  "medium.com": "Medium",
  "hashnode.dev": "Hashnode",
  "hashnode.com": "Hashnode",
  "stackoverflow.com": "Stack Overflow",
  "stackexchange.com": "Stack Exchange",
  "npmjs.com": "npm",
  "pypi.org": "PyPI",
  "crates.io": "crates.io",
  "docker.com": "Docker",
  "hub.docker.com": "Docker Hub",
  "figma.com": "Figma",
  "notion.so": "Notion",
  "notion.site": "Notion",
  "vercel.com": "Vercel",
  "netlify.com": "Netlify",
  "codesandbox.io": "CodeSandbox",
  "codepen.io": "CodePen",
  "replit.com": "Replit",
  "dribbble.com": "Dribbble",
  "behance.net": "Behance",
  "producthunt.com": "Product Hunt",
  "reddit.com": "Reddit",
  "discord.com": "Discord",
  "discord.gg": "Discord",
  "twitch.tv": "Twitch",
  "spotify.com": "Spotify",
  "open.spotify.com": "Spotify",
  "apple.com": "Apple",
  "apps.apple.com": "App Store",
  "play.google.com": "Google Play",
  "google.com": "Google",
  "docs.google.com": "Google Docs",
  "drive.google.com": "Google Drive",
  "calendar.google.com": "Google Calendar",
  "facebook.com": "Facebook",
  "fb.com": "Facebook",
  "instagram.com": "Instagram",
  "tiktok.com": "TikTok",
  "mastodon.social": "Mastodon",
  "bsky.app": "Bluesky",
  "threads.net": "Threads",
  "substack.com": "Substack",
  "patreon.com": "Patreon",
  "buymeacoffee.com": "Buy Me a Coffee",
  "ko-fi.com": "Ko-fi",
  "gumroad.com": "Gumroad",
  "stripe.com": "Stripe",
  "cal.com": "Cal.com",
  "calendly.com": "Calendly",
  "trello.com": "Trello",
  "linear.app": "Linear",
  "slack.com": "Slack",
  "wikipedia.org": "Wikipedia",
  "en.wikipedia.org": "Wikipedia",
};

function brandNameFromHost(host: string) {
  const normalized = host.replace(/^www\./i, "").toLowerCase();
  if (LINK_BRAND_NAMES[normalized]) return LINK_BRAND_NAMES[normalized];

  // Match subdomain hosts like gist.github.com → GitHub
  const match = Object.entries(LINK_BRAND_NAMES).find(([domain]) =>
    normalized === domain || normalized.endsWith(`.${domain}`),
  );
  if (match) return match[1];

  // Unknown site: use the registrable-looking label, e.g. example.com → Example
  const label = normalized.split(".")[0] || normalized;
  if (!label || label === "www") return normalized.slice(0, 100);
  return (label.charAt(0).toUpperCase() + label.slice(1)).slice(0, 100);
}

/** Derive a short display title from a pasted URL (company / site name). */
export function titleFromUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    if (isEmailAddress(trimmed)) {
      return emailFromLinkUrl(normalizeLinkUrl(trimmed));
    }

    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(withProtocol);
    return brandNameFromHost(url.hostname);
  } catch {
    return "";
  }
}

export function isAutoLinkTitle(title: string, url?: string) {
  const trimmed = title.trim();
  if (!trimmed || trimmed === "Untitled link") return true;
  if (!url) return false;
  const derived = titleFromUrl(url);
  return Boolean(derived) && trimmed === derived;
}

export function isAutoLinkDescription(description?: string) {
  const trimmed = description?.trim() ?? "";
  return !trimmed || trimmed === "Add a short reason to click.";
}

const MAX_SECTIONS = 12;

export function groupLinksBySection(profile: ProfileConfig): LinkSectionGroup[] {
  const sections = profile.sections ?? [];
  const sectionIds = new Set(sections.map((section) => section.id));
  const groups: LinkSectionGroup[] = sections.map((section) => ({
    section,
    links: profile.links.filter((link) => link.sectionId === section.id),
  }));

  const ungrouped = profile.links.filter(
    (link) => !link.sectionId || !sectionIds.has(link.sectionId),
  );
  if (ungrouped.length > 0) {
    groups.push({ section: null, links: ungrouped });
  }

  if (groups.length === 0 && profile.links.length > 0) {
    return [{ section: null, links: profile.links }];
  }

  return groups;
}

export function sanitizeProfile(profile: ProfileConfig): ProfileConfig {
  const avatarUrl =
    profile.avatarUrl?.startsWith("/") || profile.avatarUrl?.startsWith("https://")
      ? profile.avatarUrl.slice(0, 2048)
      : undefined;
  const ogImageUrl =
    profile.ogImageUrl?.startsWith("https://")
      ? profile.ogImageUrl.slice(0, 2048)
      : undefined;
  const location = profile.location?.trim().slice(0, 80) || undefined;
  const availability = profile.availability?.trim().slice(0, 90) || undefined;
  const rawDeveloperActivity = profile.developerActivity
    ? resolveDeveloperActivity(profile.developerActivity)
    : undefined;
  const developerActivity = rawDeveloperActivity
    ? {
        enabled: Boolean(rawDeveloperActivity.enabled),
        githubUsername: normalizeGitHubUsername(rawDeveloperActivity.githubUsername),
        placement:
          rawDeveloperActivity.placement === "after-links"
            ? ("after-links" as const)
            : ("before-links" as const),
        repositories: {
          mode:
            rawDeveloperActivity.repositories.mode === "include" ||
            rawDeveloperActivity.repositories.mode === "exclude"
              ? rawDeveloperActivity.repositories.mode
              : ("recent" as const),
          names: normalizeGitHubRepositories(rawDeveloperActivity.repositories.names),
        },
        commits: {
          enabled: Boolean(rawDeveloperActivity.commits.enabled),
          title:
            rawDeveloperActivity.commits.title.trim().slice(0, 60) ||
            DEFAULT_DEVELOPER_ACTIVITY.commits.title,
          limit: Math.min(10, Math.max(1, Math.round(rawDeveloperActivity.commits.limit))),
          showRepository: Boolean(rawDeveloperActivity.commits.showRepository),
          showDate: Boolean(rawDeveloperActivity.commits.showDate),
        },
        coding: {
          enabled: Boolean(rawDeveloperActivity.coding.enabled),
          title:
            rawDeveloperActivity.coding.title.trim().slice(0, 60) ||
            DEFAULT_DEVELOPER_ACTIVITY.coding.title,
          windowDays: ([7, 14, 30] as const).includes(
            rawDeveloperActivity.coding.windowDays,
          )
            ? rawDeveloperActivity.coding.windowDays
            : DEFAULT_DEVELOPER_ACTIVITY.coding.windowDays,
          showContributionCount: Boolean(
            rawDeveloperActivity.coding.showContributionCount,
          ),
          showHeatmap: Boolean(rawDeveloperActivity.coding.showHeatmap),
          showMonthLabels: Boolean(rawDeveloperActivity.coding.showMonthLabels),
          showWeekdayLabels: Boolean(rawDeveloperActivity.coding.showWeekdayLabels),
          showLegend: Boolean(rawDeveloperActivity.coding.showLegend),
          showYearSelector: Boolean(rawDeveloperActivity.coding.showYearSelector),
          showLanguages: Boolean(rawDeveloperActivity.coding.showLanguages),
        },
      }
    : undefined;

  const sections = (profile.sections ?? [])
    .slice(0, MAX_SECTIONS)
    .map((section) => {
      const mediaUrl = isSafeProfileMediaUrl(section.mediaUrl)
        ? coerceProfileMediaUrl(section.mediaUrl!).slice(0, 2048)
        : undefined;
      return {
        id: section.id.slice(0, 80),
        title: section.title.trim().slice(0, 60),
        ...(mediaUrl ? { mediaUrl } : {}),
        ...(mediaUrl
          ? { mediaType: section.mediaType === "thumbnail" ? "thumbnail" as const : "icon" as const }
          : {}),
        ...(mediaUrl && section.hideTitle ? { hideTitle: true } : {}),
      };
    })
    .filter((section) => section.title.length > 0);
  const sectionIds = new Set(sections.map((section) => section.id));

  return {
    handle: normalizeHandle(profile.handle),
    displayName: profile.displayName.trim().slice(0, 60),
    role: profile.role.trim().slice(0, 100),
    bio: profile.bio.trim().slice(0, 240),
    // Omit optional fields when empty — Firestore rejects `undefined` values.
    ...(avatarUrl ? { avatarUrl } : {}),
    ...(ogImageUrl ? { ogImageUrl } : {}),
    ...(location ? { location } : {}),
    ...(availability ? { availability } : {}),
    theme: profile.theme,
    accent: /^#[0-9a-f]{6}$/i.test(profile.accent) ? profile.accent : "#8a2be2",
    published: profile.published,
    socials: sanitizeSocials(profile.socials),
    ...(developerActivity ? { developerActivity } : {}),
    ...(sections.length > 0 ? { sections } : {}),
    links: profile.links.slice(0, 50).map((link) => {
      const description = link.description?.trim().slice(0, 160) || undefined;
      const sectionId =
        link.sectionId && sectionIds.has(link.sectionId) ? link.sectionId : undefined;
      const mediaUrl = isSafeProfileMediaUrl(link.mediaUrl)
        ? coerceProfileMediaUrl(link.mediaUrl!).slice(0, 2048)
        : undefined;
      return {
        id: link.id.slice(0, 80),
        title: link.title.trim().slice(0, 100),
        url: (() => {
          const url = coerceExternalUrl(link.url).slice(0, 2048);
          return isSafeExternalUrl(url) ? url : "https://example.com";
        })(),
        enabled: link.enabled,
        ...(description ? { description } : {}),
        ...(link.kind ? { kind: link.kind } : {}),
        ...(sectionId ? { sectionId } : {}),
        ...(mediaUrl ? { mediaUrl } : {}),
        ...(mediaUrl
          ? { mediaType: link.mediaType === "thumbnail" ? "thumbnail" as const : "icon" as const }
          : {}),
      };
    }),
  };
}
