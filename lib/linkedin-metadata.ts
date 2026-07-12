import type { LinkMetadata } from "@/lib/link-metadata";

export async function fetchLinkedInMetadata(url: string): Promise<LinkMetadata | null> {
  try {
    const response = await fetch(
      `/api/linkedin-metadata?url=${encodeURIComponent(url.trim())}`,
    );
    const data = (await response.json()) as Partial<LinkMetadata> & { error?: string };
    if (!data.title && !data.description) return null;
    return {
      title: data.title?.trim() ?? "",
      description: data.description?.trim() ?? "",
    };
  } catch {
    return null;
  }
}
