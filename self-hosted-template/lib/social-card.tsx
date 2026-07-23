import { ImageResponse } from "next/og";
import { profileInitials } from "@/lib/profile-utils";
import type { Profile } from "@/types/profile";

export const socialCardSize = { width: 1200, height: 630 } as const;

export function renderSocialCard(profile: Profile) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "#0e1117",
          color: "#f3f5f8",
          fontFamily: "Arial, Helvetica, sans-serif"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div
            style={{
              width: 104,
              height: 104,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `3px solid ${profile.accent}`,
              borderRadius: 28,
              background: "#171c25",
              color: "#ffffff",
              fontSize: 38,
              fontWeight: 700
            }}
          >
            {profileInitials(profile.name)}
          </div>
          <div
            style={{
              display: "flex",
              padding: "13px 20px",
              border: "1px solid #303846",
              borderRadius: 999,
              color: "#b7c0cf",
              fontSize: 22
            }}
          >
            {profile.handle}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 980 }}>
          <div style={{ color: profile.accent, fontSize: 24, fontWeight: 700, marginBottom: 18 }}>
            Developer profile
          </div>
          <div style={{ fontSize: 74, fontWeight: 700, letterSpacing: "-0.055em", lineHeight: 1 }}>
            {profile.name}
          </div>
          <div style={{ marginTop: 24, color: "#c2cad7", fontSize: 30, lineHeight: 1.35 }}>
            {profile.role || profile.bio}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 13, color: "#8f9aab", fontSize: 21 }}>
          <div style={{ width: 10, height: 10, borderRadius: 99, background: profile.accent }} />
          Powered by Socialize
        </div>
      </div>
    ),
    socialCardSize
  );
}
