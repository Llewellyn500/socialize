import type { ProfileConfig } from "@/lib/profile";

export const OG_SIZE = { width: 1200, height: 630 } as const;

export function SocializeMark({
  color = "#8A2BE2",
  dimension = 70,
}: {
  color?: string;
  dimension?: number;
}) {
  return (
    <svg fill="none" height={dimension} viewBox="0 0 64 64" width={dimension}>
      <g
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6.5"
      >
        <rect
          width="28"
          height="15"
          x="6"
          y="28"
          rx="7.5"
          transform="rotate(-45 20 35.5)"
        />
        <rect
          width="28"
          height="15"
          x="30"
          y="20"
          rx="7.5"
          transform="rotate(-45 44 27.5)"
        />
      </g>
    </svg>
  );
}

type ProfileOgCardProps = {
  profile: Pick<
    ProfileConfig,
    "handle" | "displayName" | "role" | "bio" | "avatarUrl" | "accent"
  >;
  avatarSrc?: string | null;
  fontFamily: string;
  monoFamily: string;
};

/** JSX tree for next/og ImageResponse (Satori-compatible styles only). */
export function ProfileOgCard({
  profile,
  avatarSrc,
  fontFamily,
  monoFamily,
}: ProfileOgCardProps) {
  const accent = /^#[0-9a-f]{6}$/i.test(profile.accent) ? profile.accent : "#8a2be2";
  const initials = profile.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#121212",
        color: "#f7f3fb",
        fontFamily,
      }}
    >
      <div
        style={{
          width: 14,
          height: "100%",
          background: accent,
        }}
      />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <SocializeMark color={accent} dimension={48} />
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.03em",
            }}
          >
            socialize
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <div
            style={{
              width: 168,
              height: 168,
              borderRadius: 999,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: accent,
              border: "4px solid rgba(247,243,251,0.16)",
              flexShrink: 0,
            }}
          >
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt=""
                width={168}
                height={168}
                style={{ width: 168, height: 168, objectFit: "cover" }}
              />
            ) : (
              <span style={{ fontSize: 56, fontWeight: 700 }}>{initials || "?"}</span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
            <span
              style={{
                fontFamily: monoFamily,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "0.06em",
                color: accent,
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              @{profile.handle}
            </span>
            <div
              style={{
                fontSize: 64,
                fontWeight: 600,
                letterSpacing: "-0.045em",
                lineHeight: 0.92,
                marginBottom: 16,
              }}
            >
              {profile.displayName || profile.handle}
            </div>
            {profile.role ? (
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 600,
                  color: "rgba(247,243,251,0.72)",
                  letterSpacing: "-0.02em",
                  marginBottom: 14,
                }}
              >
                {profile.role}
              </div>
            ) : null}
            {profile.bio ? (
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 500,
                  color: "rgba(247,243,251,0.55)",
                  lineHeight: 1.35,
                  letterSpacing: "-0.01em",
                }}
              >
                {profile.bio.length > 140 ? `${profile.bio.slice(0, 137)}…` : profile.bio}
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "rgba(247,243,251,0.45)",
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
        >
          <span>Developer profile</span>
          <span style={{ fontFamily: monoFamily, letterSpacing: "0.08em" }}>
            SOCIALIZE.YOU/{profile.handle.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
