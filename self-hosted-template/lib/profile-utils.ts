import type { Profile, ProfileLink, SocialLink } from "@/types/profile";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
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

export function cloneProfile(profile: Profile): Profile {
  return {
    ...profile,
    links: profile.links.map((link) => ({ ...link })),
    socials: profile.socials.map((social) => ({ ...social }))
  };
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

  return {
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
