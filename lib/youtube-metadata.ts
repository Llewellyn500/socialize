export type YouTubeMetadata = {
  title: string;
  description: string;
};

export async function fetchYouTubeMetadata(url: string): Promise<YouTubeMetadata | null> {
  try {
    const response = await fetch(
      `/api/youtube-metadata?url=${encodeURIComponent(url.trim())}`,
    );
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<YouTubeMetadata>;
    if (!data.title && !data.description) return null;
    return {
      title: data.title?.trim() ?? "",
      description: data.description?.trim() ?? "",
    };
  } catch {
    return null;
  }
}
