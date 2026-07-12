import { NextResponse } from "next/server";
import { fetchOpenGraph } from "@/lib/open-graph";
import { safeExternalJson } from "@/lib/safe-external-fetch";
import { parseYouTubeUrl } from "@/lib/youtube-url";

export const runtime = "nodejs";

type YouTubeMetadata = {
  title: string;
  description: string;
};

function cleanYouTubeTitle(value: string) {
  return value
    .replace(/\s*-\s*YouTube\s*$/i, "")
    .trim();
}

async function fetchYouTubeOpenGraph(url: string): Promise<YouTubeMetadata | null> {
  const metadata = await fetchOpenGraph(url);
  if (!metadata) return null;
  return {
    title: cleanYouTubeTitle(metadata.title),
    description: metadata.description,
  };
}

async function fetchVideoOEmbed(url: string): Promise<YouTubeMetadata | null> {
  const data = await safeExternalJson<{ author_name?: string; title?: string }>(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  );
  const title = data?.author_name?.trim() ?? "";
  if (!title) return null;
  return { title, description: "" };
}

async function fetchWithYouTubeApi(
  parsed: NonNullable<ReturnType<typeof parseYouTubeUrl>>,
  apiKey: string,
): Promise<YouTubeMetadata | null> {
  try {
    if (parsed.kind === "channel") {
      const params = new URLSearchParams({
        part: "snippet",
        key: apiKey,
      });
      if (parsed.handle) params.set("forHandle", parsed.handle);
      else if (parsed.channelId) params.set("id", parsed.channelId);
      else return null;

      const data = await safeExternalJson<{
        items?: Array<{ snippet?: { title?: string; description?: string } }>;
      }>(`https://www.googleapis.com/youtube/v3/channels?${params.toString()}`);

      const snippet = data?.items?.[0]?.snippet;
      if (!snippet?.title) return null;
      return {
        title: snippet.title.trim(),
        description: snippet.description?.trim() ?? "",
      };
    }

    if (!parsed.videoId) return null;

    const videoData = await safeExternalJson<{
      items?: Array<{
        snippet?: {
          channelId?: string;
          channelTitle?: string;
          description?: string;
        };
      }>;
    }>(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${parsed.videoId}&key=${apiKey}`,
    );

    const videoSnippet = videoData?.items?.[0]?.snippet;
    if (!videoSnippet) return null;

    let title = videoSnippet.channelTitle?.trim() ?? "";
    let description = videoSnippet.description?.trim() ?? "";

    if (videoSnippet.channelId) {
      const channelData = await safeExternalJson<{
        items?: Array<{ snippet?: { title?: string; description?: string } }>;
      }>(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${videoSnippet.channelId}&key=${apiKey}`,
      );
      const channelSnippet = channelData?.items?.[0]?.snippet;
      if (channelSnippet?.title) title = channelSnippet.title.trim();
      if (channelSnippet?.description) description = channelSnippet.description.trim();
    }

    if (!title) return null;
    return { title, description };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url")?.trim();
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter." }, { status: 400 });
  }

  const parsed = parseYouTubeUrl(url);
  if (!parsed) {
    return NextResponse.json({ error: "Not a supported YouTube URL." }, { status: 400 });
  }

  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (apiKey) {
      const fromApi = await fetchWithYouTubeApi(parsed, apiKey);
      if (fromApi) return NextResponse.json(fromApi);
    }

    if (parsed.kind === "video") {
      const fromOEmbed = await fetchVideoOEmbed(parsed.canonicalUrl);
      if (fromOEmbed) return NextResponse.json(fromOEmbed);
    }

    const fromOpenGraph = await fetchYouTubeOpenGraph(parsed.canonicalUrl);
    if (fromOpenGraph) return NextResponse.json(fromOpenGraph);
  } catch {
    // Fall through to 502 below.
  }

  return NextResponse.json(
    { error: "Could not load YouTube metadata." },
    { status: 502 },
  );
}
