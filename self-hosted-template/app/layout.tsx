import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { selfHostedConfig } from "@/profile.config";
import "./globals.css";

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
const metadataBase = configuredSiteUrl ? new URL(configuredSiteUrl) : undefined;

const sans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: selfHostedConfig.profile.name,
    template: `%s · ${selfHostedConfig.profile.name}`,
  },
  description: selfHostedConfig.profile.bio,
  alternates: configuredSiteUrl ? { canonical: "/" } : undefined,
  openGraph: {
    type: "website",
    title: selfHostedConfig.profile.name,
    description: selfHostedConfig.profile.bio,
    url: "/",
  },
  twitter: {
    card: "summary",
    title: selfHostedConfig.profile.name,
    description: selfHostedConfig.profile.bio,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
