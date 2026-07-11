import type { Metadata } from "next";
import { PublicProfileClient } from "@/components/public-profile/public-profile-client";

type ProfilePageProps = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { handle } = await params;
  return {
    title: `@${handle}`,
    description: `View @${handle}'s developer profile on Socialize.`,
    alternates: { canonical: `/${handle}` },
    openGraph: {
      title: `@${handle} on Socialize`,
      description: "Projects, writing, and places to connect.",
      url: `/${handle}`,
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { handle } = await params;
  return <PublicProfileClient handle={handle.toLowerCase()} />;
}
