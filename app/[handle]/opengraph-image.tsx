import { renderProfileOgImage } from "@/lib/og-profile-image";
import { OG_SIZE } from "@/lib/og-mark";
import { loadPublicProfileServer } from "@/lib/profile-server";

export const alt = "Socialize profile";
export const size = OG_SIZE;
export const contentType = "image/png";
export const runtime = "nodejs";
export const revalidate = 3600;

type Props = { params: Promise<{ handle: string }> };

/** Render the canonical social card from the current published profile. */
export default async function ProfileOpenGraphImage({ params }: Props) {
  const { handle } = await params;
  const profile = await loadPublicProfileServer(handle);

  if (!profile) {
    return renderProfileOgImage({
      handle: handle.toLowerCase().slice(0, 30) || "profile",
      displayName: "Socialize",
      role: "Developer profile",
      bio: "This profile is unavailable.",
      accent: "#8a2be2",
    });
  }

  return renderProfileOgImage(profile);
}
