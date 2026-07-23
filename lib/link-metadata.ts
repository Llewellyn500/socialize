import { fetchGitHubMetadata } from "@/lib/github-metadata";
import { isGitHubUrl } from "@/lib/github-url";
import { fetchLinkedInMetadata } from "@/lib/linkedin-metadata";
import { isLinkedInUrl } from "@/lib/linkedin-url";
import { fetchYouTubeMetadata } from "@/lib/youtube-metadata";
import { isYouTubeUrl } from "@/lib/youtube-url";

export type LinkMetadata = {
  title: string;
  description: string;
};

export function isEnrichableLinkUrl(value: string) {
  return isYouTubeUrl(value) || isGitHubUrl(value) || isLinkedInUrl(value);
}

export async function fetchEnrichedLinkMetadata(url: string): Promise<LinkMetadata | null> {
  if (isYouTubeUrl(url)) return fetchYouTubeMetadata(url);
  if (isGitHubUrl(url)) return fetchGitHubMetadata(url);
  if (isLinkedInUrl(url)) return fetchLinkedInMetadata(url);
  return null;
}
