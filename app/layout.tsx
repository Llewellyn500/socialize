import type { Metadata, Viewport } from "next";
import { AnalyticsConsent } from "@/components/analytics/analytics-consent";
import { SiteCursor } from "@/components/site-cursor";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://socialize.you";
const analyticsMeasurementId =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
  process.env.NEXT_PUBLIC_MEASURING_ID;
const appThemeScript = `
  try {
    var savedTheme = window.localStorage.getItem("socialize-app-theme");
    document.documentElement.dataset.appTheme = savedTheme === "light" ? "light" : "dark";
  } catch (error) {
    document.documentElement.dataset.appTheme = "dark";
  }
  try {
    var motionPref = window.localStorage.getItem("socialize-motion") || "system";
    if (motionPref !== "full" && motionPref !== "reduce" && motionPref !== "system") {
      motionPref = "system";
    }
    document.documentElement.dataset.motion = motionPref;
    var systemReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var reduce = motionPref === "reduce" || (motionPref === "system" && systemReduce);
    if (reduce) document.documentElement.setAttribute("data-reduce-motion", "");
    else document.documentElement.removeAttribute("data-reduce-motion");
  } catch (error) {}
`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Socialize — the link page built for developers",
    template: "%s · Socialize",
  },
  description:
    "Publish a focused developer profile on Socialize or self-host the open-source edition on your own stack.",
  keywords: [
    "developer profile",
    "link in bio for developers",
    "open source link page",
    "self-hosted portfolio",
  ],
  authors: [{ name: "Socialize" }],
  creator: "Socialize",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Socialize",
    title: "Socialize — your work deserves more than a list",
    description:
      "A hosted or self-hosted link page designed around projects, writing, and developer identity.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Socialize — the link page built for developers",
    description: "Hosted when you want it. Self-hosted when you do not.",
    images: ["/twitter-image"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#8a2be2",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-app-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#8a2be2" />
        <meta name="msapplication-TileColor" content="#8a2be2" />
        <script dangerouslySetInnerHTML={{ __html: appThemeScript }} />
      </head>
      <body>
        <SiteCursor />
        {children}
        <AnalyticsConsent measurementId={analyticsMeasurementId} />
      </body>
    </html>
  );
}
