import { ImageResponse } from "next/og";
import { loadOgFonts, ogFontStyles } from "@/lib/og-fonts";

export const alt = "Socialize, the link page built for developers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function SocializeMark() {
  return (
    <svg fill="none" height="70" viewBox="0 0 64 64" width="70">
      <path
        d="M23 9.5 9.5 32 23 54.5M41 9.5 54.5 32 41 54.5"
        stroke="#8a2be2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="5.5"
      />
      <circle cx="32" cy="23" fill="#f7f3fb" r="5.5" />
      <path
        d="M21.5 46.5c0-9.3 4.7-15 10.5-15s10.5 5.7 10.5 15"
        stroke="#f7f3fb"
        strokeLinecap="round"
        strokeWidth="5.5"
      />
    </svg>
  );
}

export default async function OpenGraphImage() {
  const fonts = await loadOgFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#111014",
          color: "#f7f3fb",
          fontFamily: ogFontStyles.sans,
        }}
      >
        <div
          style={{
            width: "68%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "58px 66px 52px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <SocializeMark />
            <span
              style={{
                fontSize: 31,
                fontWeight: 700,
                letterSpacing: "-0.04em",
              }}
            >
              socialize
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                marginBottom: 20,
                color: "#b97aef",
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "0.11em",
                textTransform: "uppercase",
              }}
            >
              A DEVELOPER&apos;S FIRST LINK PAGE
            </span>
            <div
              style={{
                maxWidth: 720,
                fontSize: 76,
                fontWeight: 600,
                letterSpacing: "-0.04em",
                lineHeight: 0.84,
              }}
            >
              Put your work within reach.
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 30,
              color: "rgba(247,243,251,.66)",
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            <span>Hosted when you want it</span>
            <span
              style={{
                width: 8,
                height: 8,
                marginTop: 7,
                borderRadius: 999,
                background: "#8a2be2",
              }}
            />
            <span>Self-hosted when you do not</span>
          </div>
        </div>
        <div
          style={{
            position: "relative",
            width: "32%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            overflow: "hidden",
            padding: "62px 50px 54px",
            background: "#8a2be2",
            color: "#f7f3fb",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: ogFontStyles.mono,
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: "0.11em",
              textTransform: "uppercase",
            }}
          >
            SOCIALIZE.YOU
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: "scale(2.5)",
            }}
          >
            <svg fill="none" height="96" viewBox="0 0 64 64" width="96">
              <path
                d="M23 9.5 9.5 32 23 54.5M41 9.5 54.5 32 41 54.5"
                stroke="rgba(247,243,251,.42)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="5.5"
              />
              <circle cx="32" cy="23" fill="#f7f3fb" r="5.5" />
              <path
                d="M21.5 46.5c0-9.3 4.7-15 10.5-15s10.5 5.7 10.5 15"
                stroke="#f7f3fb"
                strokeLinecap="round"
                strokeWidth="5.5"
              />
            </svg>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            <span style={{ opacity: 0.72 }}>One profile shape.</span>
            <strong style={{ fontSize: 24, fontWeight: 700 }}>Your domain or ours.</strong>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts,
    },
  );
}
