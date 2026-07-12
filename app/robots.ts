import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://socialize.you";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/onboarding", "/auth", "/report"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
