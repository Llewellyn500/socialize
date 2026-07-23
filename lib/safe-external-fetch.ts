import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; SocializeBot/1.0; +https://www.socialize.you)",
  "Accept-Language": "en-US,en;q=0.9",
};

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_RESPONSE_BYTES = 1_000_000;
const DEFAULT_MAX_REDIRECTS = 3;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export type SafeExternalFetchOptions = RequestInit & {
  /** Exact hostnames allowed for this fetch (redirects must remain on the list). */
  allowedHosts?: readonly string[];
  /** Per-request timeout, clamped to a conservative range. */
  timeoutMs?: number;
  /** Maximum downloaded response size. */
  maxResponseBytes?: number;
  /** Maximum redirects to follow after validating each destination. */
  maxRedirects?: number;
};

function clamp(value: number | undefined, fallback: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(value!)));
}

function isPrivateIpv4(address: string) {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) return true;
  const [first, second] = octets;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && (second === 0 || second === 168)) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

function isPrivateIp(address: string) {
  const kind = isIP(address);
  if (kind === 4) return isPrivateIpv4(address);
  if (kind !== 6) return true;

  const value = address.toLowerCase().split("%")[0] ?? "";
  // Block loopback, unspecified, IPv4-mapped, unique-local, link-local,
  // multicast and documentation ranges. Blocking all IPv4-mapped IPv6 is
  // intentionally conservative and avoids representation bypasses.
  return (
    value === "::" ||
    value === "::1" ||
    /^0(?::0){6}:1$/.test(value) ||
    /^0(?::0){7}$/.test(value) ||
    value.startsWith("::ffff:") ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    /^fe[89ab]/.test(value) ||
    value.startsWith("ff") ||
    value.startsWith("2001:db8")
  );
}

function isBlockedHostname(hostname: string) {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal"
  );
}

function matchesAllowedHost(hostname: string, allowedHosts: readonly string[] | undefined) {
  if (!allowedHosts?.length) return true;
  const normalized = hostname.toLowerCase();
  return allowedHosts.some((host) => normalized === host.toLowerCase());
}

async function validateExternalUrl(
  rawUrl: string,
  allowedHosts: readonly string[] | undefined,
) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    isBlockedHostname(url.hostname) ||
    !matchesAllowedHost(url.hostname, allowedHosts)
  ) {
    return null;
  }

  try {
    const addresses = await lookup(url.hostname, { all: true, verbatim: true });
    if (addresses.length === 0 || addresses.some(({ address }) => isPrivateIp(address))) {
      return null;
    }
  } catch {
    return null;
  }

  return url;
}

function createTimeoutSignal(parent: AbortSignal | null | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const abortFromParent = () => controller.abort();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (parent) {
    if (parent.aborted) abortFromParent();
    else parent.addEventListener("abort", abortFromParent, { once: true });
  }

  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timer);
      parent?.removeEventListener("abort", abortFromParent);
    },
  };
}

async function boundedResponse(response: Response, maxResponseBytes: number) {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxResponseBytes) {
    await response.body?.cancel();
    return null;
  }

  if (!response.body) return response;

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxResponseBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    await reader.cancel().catch(() => undefined);
    return null;
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
  });
}

/**
 * Fetch a public HTTPS URL with DNS/IP checks, bounded redirects, timeout and
 * a capped response body. Callers should pass exact `allowedHosts` whenever
 * the upstream is known.
 */
export async function safeExternalFetch(
  url: string,
  options: SafeExternalFetchOptions = {},
): Promise<Response | null> {
  const {
    allowedHosts,
    timeoutMs: requestedTimeout,
    maxResponseBytes: requestedMaxResponseBytes,
    maxRedirects: requestedMaxRedirects,
    headers: requestedHeaders,
    signal: parentSignal,
    ...init
  } = options;
  const timeoutMs = clamp(requestedTimeout, DEFAULT_TIMEOUT_MS, 1_000, 15_000);
  const maxResponseBytes = clamp(
    requestedMaxResponseBytes,
    DEFAULT_MAX_RESPONSE_BYTES,
    1_024,
    2_000_000,
  );
  const maxRedirects = clamp(requestedMaxRedirects, DEFAULT_MAX_REDIRECTS, 0, 5);
  const requestHeaders = new Headers(DEFAULT_HEADERS);
  new Headers(requestedHeaders).forEach((value, key) => requestHeaders.set(key, value));
  const timeout = createTimeoutSignal(parentSignal, timeoutMs);

  try {
    let currentUrl = url;
    let previousOrigin: string | null = null;

    for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
      const parsed = await validateExternalUrl(currentUrl, allowedHosts);
      if (!parsed) return null;

      if (previousOrigin && previousOrigin !== parsed.origin) {
        requestHeaders.delete("authorization");
        requestHeaders.delete("cookie");
        requestHeaders.delete("proxy-authorization");
      }
      previousOrigin = parsed.origin;

      const response = await fetch(parsed, {
        ...init,
        cache: "no-store",
        headers: requestHeaders,
        redirect: "manual",
        signal: timeout.signal,
      });

      if (!REDIRECT_STATUSES.has(response.status)) {
        return boundedResponse(response, maxResponseBytes);
      }

      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location || redirectCount === maxRedirects) return null;

      try {
        currentUrl = new URL(location, parsed).toString();
      } catch {
        return null;
      }
    }
  } catch {
    return null;
  } finally {
    timeout.cleanup();
  }

  return null;
}

export async function safeExternalJson<T>(
  url: string,
  options: SafeExternalFetchOptions = {},
): Promise<T | null> {
  const response = await safeExternalFetch(url, options);
  if (!response?.ok) return null;

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function safeExternalText(
  url: string,
  options: SafeExternalFetchOptions = {},
): Promise<string | null> {
  const response = await safeExternalFetch(url, options);
  if (!response?.ok) return null;

  try {
    return await response.text();
  } catch {
    return null;
  }
}
