import { ImageResponse } from "next/og";
import { loadOgFonts, ogFontStyles } from "@/lib/og-fonts";
import { OG_SIZE, ProfileOgCard } from "@/lib/og-mark";
import type { ProfileConfig } from "@/lib/profile";

export type ProfileOgInput = Pick<
  ProfileConfig,
  "handle" | "displayName" | "role" | "bio" | "avatarUrl" | "accent"
>;

function absoluteAvatarUrl(avatarUrl: string | undefined, siteUrl: string) {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith("/")) {
    return `${siteUrl.replace(/\/$/, "")}${avatarUrl}`;
  }

  try {
    const url = new URL(avatarUrl);
    const site = new URL(siteUrl);
    if (url.protocol !== "https:") return null;

    // OG rendering happens on our server. Only allow known image hosts here so
    // a profile cannot turn the image generator into an internal-network fetch.
    if (
      url.origin === site.origin ||
      url.hostname === "firebasestorage.googleapis.com" ||
      url.hostname === "storage.googleapis.com"
    ) {
      return url.toString();
    }
  } catch {
    // Invalid or relative external URLs are intentionally omitted from OG cards.
  }

  return null;
}

export async function renderProfileOgImage(profile: ProfileOgInput) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://socialize.you";
  const fonts = await loadOgFonts();
  const avatarSrc = absoluteAvatarUrl(profile.avatarUrl, siteUrl);

  return new ImageResponse(
    (
      <ProfileOgCard
        profile={profile}
        avatarSrc={avatarSrc}
        fontFamily={ogFontStyles.sans}
        monoFamily={ogFontStyles.mono}
      />
    ),
    {
      ...OG_SIZE,
      fonts,
    },
  );
}
