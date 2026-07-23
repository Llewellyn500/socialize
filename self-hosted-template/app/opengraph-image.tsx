import { getServerProfile } from "@/lib/server-profile";
import { renderSocialCard, socialCardSize } from "@/lib/social-card";

export const alt = "Developer profile";
export const size = socialCardSize;
export const contentType = "image/png";
export const revalidate = 0;

export default async function OpenGraphImage() {
  return renderSocialCard(await getServerProfile());
}
