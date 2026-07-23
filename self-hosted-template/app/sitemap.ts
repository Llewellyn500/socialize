import type { MetadataRoute } from "next";

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  if (!configuredSiteUrl) return [];
  let siteUrl: string;
  try {
    siteUrl = new URL(configuredSiteUrl).toString().replace(/\/+$/, "");
  } catch {
    return [];
  }

  return [
    {
      url: siteUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
