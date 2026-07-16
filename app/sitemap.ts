import type { MetadataRoute } from "next";

type StaticRoute = {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
};

// This sitemap contains only public, product-owned pages. Published profiles
// remain crawlable through public links, but should not be bulk-listed until
// the product has an explicit discoverability setting and a safe index source.
const routes: StaticRoute[] = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/self-host", changeFrequency: "monthly", priority: 0.8 },
  { path: "/docs", changeFrequency: "monthly", priority: 0.8 },
  { path: "/sponsor", changeFrequency: "monthly", priority: 0.6 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.4 },
  { path: "/acceptable-use", changeFrequency: "yearly", priority: 0.4 },
  { path: "/cookies", changeFrequency: "yearly", priority: 0.4 },
  { path: "/security", changeFrequency: "monthly", priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://socialize.you").replace(
    /\/$/,
    "",
  );

  return routes.map((route) => ({
    url: base + route.path,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
