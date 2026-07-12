import type { Metadata } from "next";
import { PublicProfileClient } from "@/components/public-profile/public-profile-client";
import { OG_SIZE } from "@/lib/og-mark";
import { loadPublicProfileServer } from "@/lib/profile-server";

type ProfilePageProps = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { handle } = await params;
  const normalized = handle.toLowerCase();
  const profile = await loadPublicProfileServer(normalized);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://socialize.you";

  if (!profile) {
    return {
      title: `@${normalized}`,
      description: `View @${normalized}'s developer profile on Socialize.`,
      alternates: { canonical: `/${normalized}` },
    };
  }

  const title = `${profile.displayName} (@${profile.handle})`;
  const description =
    profile.bio?.trim() ||
    profile.role?.trim() ||
    `View @${profile.handle}'s developer profile on Socialize.`;
  const ogImage =
    profile.ogImageUrl ||
    `${siteUrl.replace(/\/$/, "")}/${profile.handle}/opengraph-image`;

  return {
    title: `@${profile.handle}`,
    description,
    alternates: { canonical: `/${profile.handle}` },
    openGraph: {
      type: "profile",
      title,
      description,
      url: `/${profile.handle}`,
      images: [
        {
          url: ogImage,
          width: OG_SIZE.width,
          height: OG_SIZE.height,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { handle } = await params;
  return <PublicProfileClient handle={handle.toLowerCase()} />;
}
