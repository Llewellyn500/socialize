import type { MetadataRoute } from "next";

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  let siteUrl: string | undefined;
  try {
    siteUrl = configuredSiteUrl ? new URL(configuredSiteUrl).toString().replace(/\/+$/, "") : undefined;
  } catch {
    siteUrl = undefined;
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/login", "/manage"],
    },
    ...(siteUrl ? { sitemap: `${siteUrl}/sitemap.xml` } : {}),
  };
}
