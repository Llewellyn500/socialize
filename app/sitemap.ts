import type { MetadataRoute } from "next";

const routes = [
  "",
  "/self-host",
  "/docs",
  "/sponsor",
  "/privacy",
  "/terms",
  "/acceptable-use",
  "/cookies",
  "/security",
  "/sign-in",
  "/sign-up",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://socialize.you";
  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/sign-up" ? 0.9 : 0.6,
  }));
}
