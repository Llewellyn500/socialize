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
  if (avatarUrl.startsWith("https://") || avatarUrl.startsWith("http://")) {
    return avatarUrl;
  }
  if (avatarUrl.startsWith("/")) {
    return `${siteUrl.replace(/\/$/, "")}${avatarUrl}`;
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
