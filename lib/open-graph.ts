import { safeExternalText } from "@/lib/safe-external-fetch";

export type OpenGraphMetadata = {
  title: string;
  description: string;
};

export function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function readMetaContent(html: string, property: string) {
  const patterns = [
    new RegExp(`property="${property}" content="([^"]+)"`, "i"),
    new RegExp(`name="${property}" content="([^"]+)"`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]).trim();
  }
  return "";
}

export async function fetchOpenGraph(url: string): Promise<OpenGraphMetadata | null> {
  try {
    const html = await safeExternalText(url);
    if (!html) return null;

    const title = readMetaContent(html, "og:title");
    const description = readMetaContent(html, "og:description");

    if (!title && !description) return null;
    return { title, description };
  } catch {
    return null;
  }
}
