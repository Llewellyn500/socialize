import { decodeHtml, readMetaContent } from "@/lib/open-graph";
import { safeExternalText } from "@/lib/safe-external-fetch";

export const LINKEDIN_LINK_TITLE = "LinkedIn";

function headlineFromLinkedInTitle(title: string) {
  const trimmed = title
    .replace(/\s*\|\s*LinkedIn\s*$/i, "")
    .replace(/\s*-\s*LinkedIn\s*$/i, "")
    .trim();
  const match = trimmed.match(/^[^-–|]+?\s[-–]\s(.+)$/);
  return match?.[1]?.trim() ?? "";
}

function readJsonLdHeadline(html: string) {
  const blocks = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  if (!blocks) return "";

  for (const block of blocks) {
    const payload = block.replace(/^[\s\S]*?>/, "").replace(/<\/script>\s*$/i, "").trim();
    if (!payload) continue;

    try {
      const parsed = JSON.parse(payload) as unknown;
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        if (
          node &&
          typeof node === "object" &&
          "headline" in node &&
          typeof node.headline === "string" &&
          node.headline.trim()
        ) {
          return decodeHtml(node.headline.trim());
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  return "";
}

export function extractLinkedInHeadline(html: string) {
  const ogDescription = readMetaContent(html, "og:description");
  if (ogDescription) return ogDescription;

  const metaDescription = readMetaContent(html, "description");
  if (metaDescription) return metaDescription;

  const twitterDescription = readMetaContent(html, "twitter:description");
  if (twitterDescription) return twitterDescription;

  const jsonLdHeadline = readJsonLdHeadline(html);
  if (jsonLdHeadline) return jsonLdHeadline;

  const ogTitle = readMetaContent(html, "og:title");
  return headlineFromLinkedInTitle(ogTitle);
}

export async function fetchLinkedInHeadline(url: string) {
  try {
    const html = await safeExternalText(url, {
      allowedHosts: ["www.linkedin.com"],
    });
    if (!html) return "";
    return extractLinkedInHeadline(html);
  } catch {
    return "";
  }
}
