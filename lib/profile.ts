export type ProfileTheme = "terminal" | "paper" | "midnight" | "mono";

export type SocialKey =
  | "github"
  | "gitlab"
  | "linkedin"
  | "x"
  | "email"
  | "website";

export type ProfileLink = {
  id: string;
  title: string;
  url: string;
  description?: string;
  enabled: boolean;
  kind?: "link" | "project" | "writing";
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
  links: ProfileLink[];
  updatedAt?: string;
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
  links: [
    {
      id: "project-relay",
      title: "Relay — queues without the ceremony",
      description: "My open-source job orchestration toolkit.",
      url: "https://github.com/",
      enabled: true,
      kind: "project",
    },
    {
      id: "notes-systems",
      title: "Notes on systems that stay boring",
      description: "A field guide to predictable infrastructure.",
      url: "https://dev.to/",
      enabled: true,
      kind: "writing",
    },
    {
      id: "weekly-log",
      title: "This week in the terminal",
      description: "Commits, experiments, and small discoveries.",
      url: "https://github.com/",
      enabled: true,
      kind: "link",
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

export function sanitizeProfile(profile: ProfileConfig): ProfileConfig {
  return {
    ...profile,
    handle: normalizeHandle(profile.handle),
    displayName: profile.displayName.trim().slice(0, 60),
    role: profile.role.trim().slice(0, 100),
    bio: profile.bio.trim().slice(0, 240),
    avatarUrl:
      profile.avatarUrl?.startsWith("/") || profile.avatarUrl?.startsWith("https://")
        ? profile.avatarUrl.slice(0, 2048)
        : undefined,
    location: profile.location?.trim().slice(0, 80),
    availability: profile.availability?.trim().slice(0, 90),
    accent: /^#[0-9a-f]{6}$/i.test(profile.accent) ? profile.accent : "#8a2be2",
    links: profile.links.slice(0, 50).map((link) => ({
      ...link,
      id: link.id.slice(0, 80),
      title: link.title.trim().slice(0, 100),
      description: link.description?.trim().slice(0, 160),
      url: isSafeExternalUrl(link.url) ? link.url : "https://example.com",
    })),
    updatedAt: new Date().toISOString(),
  };
}
