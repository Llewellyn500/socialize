import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://socialize.you").replace(
    /\/$/,
    "",
  );

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Let crawlers fetch private HTML routes so their `noindex` metadata is
      // honored. API routes have no indexable document.
      disallow: ["/api/"],
    },
    sitemap: base + "/sitemap.xml",
  };
}
