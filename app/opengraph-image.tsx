import { ImageResponse } from "next/og";
import { loadOgFonts, ogFontStyles } from "@/lib/og-fonts";
import { OG_SIZE, SocializeMark } from "@/lib/og-mark";

export const alt = "Socialize, the link page built for developers";
export const size = OG_SIZE;
export const contentType = "image/png";

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
            <SocializeMark color="rgba(247,243,251,.52)" dimension={96} />
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
