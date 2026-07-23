import type { Metadata } from "next";
import { ProfileView } from "@/components/profile-view";
import { getServerProfile } from "@/lib/server-profile";

export const dynamic = "force-dynamic";

function configuredSiteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (!value) return undefined;
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getServerProfile();
  const siteUrl = configuredSiteUrl();
  const description = profile.bio || `${profile.name}'s developer profile and links.`;

  return {
    metadataBase: siteUrl,
    title: profile.name,
    description,
    alternates: siteUrl ? { canonical: "/" } : undefined,
    openGraph: {
      type: "profile",
      title: profile.name,
      description,
      url: "/",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${profile.name}'s profile` }]
    },
    twitter: {
      card: "summary_large_image",
      title: profile.name,
      description,
      images: ["/twitter-image"]
    }
  };
}

export default async function HomePage() {
  const profile = await getServerProfile();
  return <ProfileView initialProfile={profile} />;
}
