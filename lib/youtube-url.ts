export type YouTubeUrlKind = "channel" | "video";

export type ParsedYouTubeUrl = {
  kind: YouTubeUrlKind;
  handle?: string;
  channelId?: string;
  videoId?: string;
  canonicalUrl: string;
};

export function isYouTubeUrl(value: string) {
  return Boolean(parseYouTubeUrl(value));
}

export function parseYouTubeUrl(value: string): ParsedYouTubeUrl | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();

    if (host === "youtu.be") {
      const videoId = url.pathname.replace(/^\//, "").split("/")[0];
      if (!videoId) return null;
      return {
        kind: "video",
        videoId,
        canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
      };
    }

    if (host !== "youtube.com" && host !== "m.youtube.com") return null;

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0]?.startsWith("@")) {
      const handle = parts[0].slice(1);
      if (!handle) return null;
      return {
        kind: "channel",
        handle,
        canonicalUrl: `https://www.youtube.com/@${handle}`,
      };
    }

    if (parts[0] === "channel" && parts[1]) {
      return {
        kind: "channel",
        channelId: parts[1],
        canonicalUrl: `https://www.youtube.com/channel/${parts[1]}`,
      };
    }

    if (parts[0] === "watch") {
      const videoId = url.searchParams.get("v");
      if (!videoId) return null;
      return {
        kind: "video",
        videoId,
        canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
      };
    }

    if (parts[0] === "shorts" && parts[1]) {
      return {
        kind: "video",
        videoId: parts[1],
        canonicalUrl: `https://www.youtube.com/watch?v=${parts[1]}`,
      };
    }

    return null;
  } catch {
    return null;
  }
}
