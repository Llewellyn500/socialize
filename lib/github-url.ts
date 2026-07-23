export type GitHubUrlKind = "user" | "repo" | "org";

export type ParsedGitHubUrl = {
  kind: GitHubUrlKind;
  owner: string;
  repo?: string;
  canonicalUrl: string;
};

const RESERVED_SEGMENTS = new Set([
  "about",
  "apps",
  "collections",
  "customer-stories",
  "enterprise",
  "explore",
  "features",
  "login",
  "marketplace",
  "new",
  "notifications",
  "organizations",
  "orgs",
  "pricing",
  "search",
  "security",
  "settings",
  "signup",
  "sponsors",
  "team",
  "topics",
  "trending",
]);

export function isGitHubUrl(value: string) {
  return Boolean(parseGitHubUrl(value));
}

export function parseGitHubUrl(value: string): ParsedGitHubUrl | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();

    if (host !== "github.com" && host !== "gist.github.com") return null;

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return null;

    if (parts[0] === "orgs" && parts[1]) {
      return {
        kind: "org",
        owner: parts[1],
        canonicalUrl: `https://github.com/${parts[1]}`,
      };
    }

    const owner = parts[0];
    if (!owner || RESERVED_SEGMENTS.has(owner.toLowerCase())) return null;

    if (parts.length === 1) {
      return {
        kind: "user",
        owner,
        canonicalUrl: `https://github.com/${owner}`,
      };
    }

    const repo = parts[1];
    if (!repo || ["repositories", "projects", "packages"].includes(repo.toLowerCase())) {
      return null;
    }

    return {
      kind: "repo",
      owner,
      repo,
      canonicalUrl: `https://github.com/${owner}/${repo}`,
    };
  } catch {
    return null;
  }
}
