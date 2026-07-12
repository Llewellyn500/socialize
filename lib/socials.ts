import {
  coerceExternalUrl,
  emailFromLinkUrl,
  isEmailAddress,
  normalizeLinkUrl,
} from "@/lib/email-link";

export const SOCIAL_KEYS = [
  "github",
  "gitlab",
  "linkedin",
  "x",
  "youtube",
  "instagram",
  "tiktok",
  "facebook",
  "threads",
  "bluesky",
  "mastodon",
  "discord",
  "twitch",
  "reddit",
  "medium",
  "hashnode",
  "devto",
  "stackoverflow",
  "codepen",
  "codesandbox",
  "dribbble",
  "behance",
  "figma",
  "npm",
  "producthunt",
  "telegram",
  "whatsapp",
  "spotify",
  "soundcloud",
  "apple_music",
  "patreon",
  "kofi",
  "buymeacoffee",
  "calendly",
  "calcom",
  "email",
  "website",
] as const;

export type SocialKey = (typeof SOCIAL_KEYS)[number];

export type SocialCatalogEntry = {
  label: string;
  placeholder: string;
  inputType: "url" | "email";
};

export const SOCIAL_CATALOG: Record<SocialKey, SocialCatalogEntry> = {
  github: { label: "GitHub", placeholder: "https://github.com/you", inputType: "url" },
  gitlab: { label: "GitLab", placeholder: "https://gitlab.com/you", inputType: "url" },
  linkedin: { label: "LinkedIn", placeholder: "https://linkedin.com/in/you", inputType: "url" },
  x: { label: "X", placeholder: "https://x.com/you", inputType: "url" },
  youtube: { label: "YouTube", placeholder: "https://youtube.com/@you", inputType: "url" },
  instagram: { label: "Instagram", placeholder: "https://instagram.com/you", inputType: "url" },
  tiktok: { label: "TikTok", placeholder: "https://tiktok.com/@you", inputType: "url" },
  facebook: { label: "Facebook", placeholder: "https://facebook.com/you", inputType: "url" },
  threads: { label: "Threads", placeholder: "https://threads.net/@you", inputType: "url" },
  bluesky: { label: "Bluesky", placeholder: "https://bsky.app/profile/you.bsky.social", inputType: "url" },
  mastodon: { label: "Mastodon", placeholder: "https://mastodon.social/@you", inputType: "url" },
  discord: { label: "Discord", placeholder: "https://discord.gg/invite", inputType: "url" },
  twitch: { label: "Twitch", placeholder: "https://twitch.tv/you", inputType: "url" },
  reddit: { label: "Reddit", placeholder: "https://reddit.com/u/you", inputType: "url" },
  medium: { label: "Medium", placeholder: "https://medium.com/@you", inputType: "url" },
  hashnode: { label: "Hashnode", placeholder: "https://hashnode.com/@you", inputType: "url" },
  devto: { label: "Dev.to", placeholder: "https://dev.to/you", inputType: "url" },
  stackoverflow: {
    label: "Stack Overflow",
    placeholder: "https://stackoverflow.com/users/you",
    inputType: "url",
  },
  codepen: { label: "CodePen", placeholder: "https://codepen.io/you", inputType: "url" },
  codesandbox: { label: "CodeSandbox", placeholder: "https://codesandbox.io/u/you", inputType: "url" },
  dribbble: { label: "Dribbble", placeholder: "https://dribbble.com/you", inputType: "url" },
  behance: { label: "Behance", placeholder: "https://behance.net/you", inputType: "url" },
  figma: { label: "Figma", placeholder: "https://figma.com/@you", inputType: "url" },
  npm: { label: "npm", placeholder: "https://npmjs.com/~you", inputType: "url" },
  producthunt: { label: "Product Hunt", placeholder: "https://producthunt.com/@you", inputType: "url" },
  telegram: { label: "Telegram", placeholder: "https://t.me/you", inputType: "url" },
  whatsapp: { label: "WhatsApp", placeholder: "https://wa.me/15551234567", inputType: "url" },
  spotify: { label: "Spotify", placeholder: "https://open.spotify.com/user/you", inputType: "url" },
  soundcloud: { label: "SoundCloud", placeholder: "https://soundcloud.com/you", inputType: "url" },
  apple_music: { label: "Apple Music", placeholder: "https://music.apple.com/profile/you", inputType: "url" },
  patreon: { label: "Patreon", placeholder: "https://patreon.com/you", inputType: "url" },
  kofi: { label: "Ko-fi", placeholder: "https://ko-fi.com/you", inputType: "url" },
  buymeacoffee: { label: "Buy Me a Coffee", placeholder: "https://buymeacoffee.com/you", inputType: "url" },
  calendly: { label: "Calendly", placeholder: "https://calendly.com/you", inputType: "url" },
  calcom: { label: "Cal.com", placeholder: "https://cal.com/you", inputType: "url" },
  email: { label: "Email", placeholder: "you@example.com", inputType: "email" },
  website: { label: "Website", placeholder: "https://yoursite.com", inputType: "url" },
};

export function isSocialKey(value: string): value is SocialKey {
  return (SOCIAL_KEYS as readonly string[]).includes(value);
}

export function socialLabel(key: SocialKey) {
  return SOCIAL_CATALOG[key].label;
}

export function normalizeSocialValue(key: SocialKey, rawValue: string) {
  const trimmed = rawValue.trim();
  if (!trimmed) return "";
  if (key === "email") {
    return normalizeLinkUrl(trimmed);
  }
  return trimmed.slice(0, 2048);
}

export function displaySocialValue(key: SocialKey, value: string) {
  if (key === "email") {
    return emailFromLinkUrl(value) || (isEmailAddress(value) ? value : value.replace(/^mailto:/i, ""));
  }
  return value;
}

export function sanitizeSocials(socials: Partial<Record<string, string>>) {
  const next: Partial<Record<SocialKey, string>> = {};
  for (const key of SOCIAL_KEYS) {
    const raw = socials[key];
    if (typeof raw !== "string") continue;
    const value = coerceExternalUrl(normalizeSocialValue(key, raw)).slice(0, 2048);
    if (!value) continue;
    next[key] = value;
  }
  return next;
}

export function listedSocialKeys(socials: Partial<Record<SocialKey, string>>) {
  const known = new Set<string>(SOCIAL_KEYS);
  return Object.keys(socials).filter((key): key is SocialKey => known.has(key));
}
