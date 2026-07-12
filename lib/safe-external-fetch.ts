const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; SocializeBot/1.0; +https://socialize.you)",
  "Accept-Language": "en-US,en;q=0.9",
};

/** Fetch external URLs without throwing or tripping Next.js cache on bad upstream status codes. */
export async function safeExternalFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response | null> {
  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: {
        ...DEFAULT_HEADERS,
        ...init.headers,
      },
    });

    if (response.status < 200 || response.status > 599) return null;
    return response;
  } catch {
    return null;
  }
}

export async function safeExternalJson<T>(url: string, init: RequestInit = {}): Promise<T | null> {
  const response = await safeExternalFetch(url, init);
  if (!response?.ok) return null;

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function safeExternalText(url: string, init: RequestInit = {}): Promise<string | null> {
  const response = await safeExternalFetch(url, init);
  if (!response?.ok) return null;

  try {
    return await response.text();
  } catch {
    return null;
  }
}
