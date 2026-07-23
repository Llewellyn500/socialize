import { ImageResponse } from "next/og";
import { getServerProfile } from "@/lib/server-profile";
import { profileInitials } from "@/lib/profile-utils";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const revalidate = 0;

export default async function AppleIcon() {
  const profile = await getServerProfile();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `10px solid ${profile.accent}`,
          borderRadius: 38,
          background: "#0e1117",
          color: "#ffffff",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: 64,
          fontWeight: 700
        }}
      >
        {profileInitials(profile.name)}
      </div>
    ),
    size
  );
}
