import type { MetadataRoute } from "next";

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  if (!configuredSiteUrl) return [];

  return [
    {
      url: configuredSiteUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
