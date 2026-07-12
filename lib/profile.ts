import { emailFromLinkUrl, isEmailAddress, normalizeLinkUrl } from "@/lib/email-link";

export type ProfileTheme = "terminal" | "paper" | "midnight" | "mono";

export type SocialKey =
  | "github"
  | "gitlab"
  | "linkedin"
  | "x"
  | "email"
  | "website";

export type ProfileSection = {
  id: string;
  title: string;
};

export type ProfileLink = {
  id: string;
  title: string;
  url: string;
  description?: string;
  enabled: boolean;
  kind?: "link" | "project" | "writing";
  sectionId?: string;
};

export type ProfileConfig = {
  handle: string;
  displayName: string;
  role: string;
  bio: string;
  avatarUrl?: string;
  location?: string;
  availability?: string;
  theme: ProfileTheme;
  accent: string;
  published: boolean;
  socials: Partial<Record<SocialKey, string>>;
  sections?: ProfileSection[];
  links: ProfileLink[];
  updatedAt?: string;
};

export type LinkSectionGroup = {
  section: ProfileSection | null;
  links: ProfileLink[];
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
  const location = profile.location?.trim().slice(0, 80) || undefined;
  const availability = profile.availability?.trim().slice(0, 90) || undefined;

  const sections = (profile.sections ?? [])
    .slice(0, MAX_SECTIONS)
    .map((section) => ({
      id: section.id.slice(0, 80),
      title: section.title.trim().slice(0, 60),
    }))
    .filter((section) => section.title.length > 0);
  const sectionIds = new Set(sections.map((section) => section.id));

  return {
    handle: normalizeHandle(profile.handle),
    displayName: profile.displayName.trim().slice(0, 60),
    role: profile.role.trim().slice(0, 100),
    bio: profile.bio.trim().slice(0, 240),
    // Omit optional fields when empty — Firestore rejects `undefined` values.
    ...(avatarUrl ? { avatarUrl } : {}),
    ...(location ? { location } : {}),
    ...(availability ? { availability } : {}),
    theme: profile.theme,
    accent: /^#[0-9a-f]{6}$/i.test(profile.accent) ? profile.accent : "#8a2be2",
    published: profile.published,
    socials: profile.socials,
    ...(sections.length > 0 ? { sections } : {}),
    links: profile.links.slice(0, 50).map((link) => {
      const description = link.description?.trim().slice(0, 160) || undefined;
      const sectionId =
        link.sectionId && sectionIds.has(link.sectionId) ? link.sectionId : undefined;
      return {
        id: link.id.slice(0, 80),
        title: link.title.trim().slice(0, 100),
        url: isSafeExternalUrl(link.url) ? link.url : "https://example.com",
        enabled: link.enabled,
        ...(description ? { description } : {}),
        ...(link.kind ? { kind: link.kind } : {}),
        ...(sectionId ? { sectionId } : {}),
      };
    }),
  };
}
