import { normalizeProfile } from "@/lib/profile-utils";
import type { Profile } from "@/types/profile";

const SOCIAL_LABELS: Record<string, string> = {
  github: "GitHub",
  gitlab: "GitLab",
  linkedin: "LinkedIn",
  x: "X",
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  threads: "Threads",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
  discord: "Discord",
  twitch: "Twitch",
  reddit: "Reddit",
  medium: "Medium",
  hashnode: "Hashnode",
  devto: "Dev.to",
  stackoverflow: "Stack Overflow",
  codepen: "CodePen",
  codesandbox: "CodeSandbox",
  dribbble: "Dribbble",
  behance: "Behance",
  figma: "Figma",
  npm: "npm",
  producthunt: "Product Hunt",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  apple_music: "Apple Music",
  patreon: "Patreon",
  kofi: "Ko-fi",
  buymeacoffee: "Buy Me a Coffee",
  calendly: "Calendly",
  calcom: "Cal.com",
  email: "Email",
  website: "Website"
};

type JsonObject = Record<string, unknown>;

export type HostedProfileImportResult = {
  profile: Profile;
  warnings: string[];
};

function record(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : null;
}

function string(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function mediaFields(value: JsonObject) {
  const mediaUrl = string(value.mediaUrl);
  return {
    ...(mediaUrl ? { mediaUrl } : {}),
    ...(mediaUrl
      ? { mediaType: value.mediaType === "thumbnail" ? "thumbnail" as const : "icon" as const }
      : {})
  };
}

/**
 * Converts the JSON emitted by the hosted dashboard's Export button into the
 * self-hosted Profile model. Unsupported hosted presentation state is reported
 * instead of being silently represented as if it migrated.
 */
export function convertHostedProfileExport(
  value: unknown,
  fallback: Profile
): HostedProfileImportResult {
  const source = record(value);
  if (
    !source ||
    typeof source.displayName !== "string" ||
    typeof source.handle !== "string" ||
    !Array.isArray(source.links)
  ) {
    throw new Error("This is not a Socialize hosted profile export.");
  }

  const rawSections = Array.isArray(source.sections) ? source.sections : [];
  const sections = rawSections.flatMap((entry, index) => {
    const section = record(entry);
    if (!section) return [];
    const id = string(section.id) || `section-${index + 1}`;
    return [{
      id,
      title: string(section.title),
      ...mediaFields(section),
      ...(section.hideTitle === true ? { hideTitle: true } : {})
    }];
  });

  const links = source.links.flatMap((entry, index) => {
    const link = record(entry);
    if (!link) return [];
    return [{
      id: string(link.id) || `link-${index + 1}`,
      title: string(link.title),
      description: string(link.description),
      url: string(link.url),
      enabled: link.enabled !== false,
      ...(string(link.sectionId) ? { sectionId: string(link.sectionId) } : {}),
      ...mediaFields(link)
    }];
  });

  const socialSource = record(source.socials) ?? {};
  const socials = Object.entries(socialSource).flatMap(([key, value], index) => {
    if (typeof value !== "string" || !value.trim()) return [];
    return [{
      id: `social-${key}-${index + 1}`,
      label: SOCIAL_LABELS[key] ?? key.replace(/_/g, " "),
      url: value
    }];
  });

  const handle = string(source.handle).trim();
  const converted = normalizeProfile({
    name: string(source.displayName),
    handle: handle.startsWith("@") ? handle : `@${handle}`,
    role: string(source.role),
    bio: string(source.bio),
    location: string(source.location),
    availability: string(source.availability),
    avatarUrl: string(source.avatarUrl),
    accent: string(source.accent),
    sections,
    links,
    socials,
    developerActivity: source.developerActivity
  }, fallback);

  const iconSelections = [...rawSections, ...source.links].filter((entry) => {
    const item = record(entry);
    return Boolean(item && typeof item.mediaIcon === "string" && item.mediaIcon);
  }).length;
  const hostedMedia = [
    string(source.avatarUrl),
    ...rawSections.map((entry) => string(record(entry)?.mediaUrl)),
    ...source.links.map((entry) => string(record(entry)?.mediaUrl))
  ].some((url) => /firebasestorage\.googleapis\.com|firebasestorage\.app/i.test(url));
  const warnings: string[] = [];

  if (iconSelections) {
    warnings.push(
      `${iconSelections} hosted icon selection${iconSelections === 1 ? " was" : "s were"} not copied; upload replacement images in this workspace.`
    );
  }
  if (hostedMedia) {
    warnings.push(
      "Some images still point to hosted Firebase Storage; re-upload them here before deleting the hosted account."
    );
  }
  if (links.length !== converted.links.length) {
    warnings.push("Links with missing titles or invalid URLs were skipped.");
  }
  if (source.published === false) {
    warnings.push("The hosted draft flag was not copied because this self-hosted root profile is public.");
  }
  if (typeof source.theme === "string") {
    warnings.push("The hosted theme was mapped to the self-hosted layout; the accent color was preserved.");
  }
  if (typeof source.ogImageUrl === "string" && source.ogImageUrl) {
    warnings.push("The hosted Open Graph image was replaced with a fresh image generated from this profile.");
  }

  return { profile: converted, warnings };
}

export function parseHostedProfileExport(
  json: string,
  fallback: Profile
): HostedProfileImportResult {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }
  return convertHostedProfileExport(value, fallback);
}
