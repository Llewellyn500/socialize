export type LinkedInUrlKind = "profile" | "company" | "school";

export type ParsedLinkedInUrl = {
  kind: LinkedInUrlKind;
  slug: string;
  canonicalUrl: string;
};

export function isLinkedInUrl(value: string) {
  return Boolean(parseLinkedInUrl(value));
}

export function parseLinkedInUrl(value: string): ParsedLinkedInUrl | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();

    if (host !== "linkedin.com") return null;

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;

    const kindMap: Record<string, LinkedInUrlKind> = {
      in: "profile",
      company: "company",
      school: "school",
      pub: "profile",
    };

    const kind = kindMap[parts[0].toLowerCase()];
    const slug = parts[1];
    if (!kind || !slug) return null;

    const prefix = parts[0].toLowerCase() === "pub" ? "pub" : parts[0].toLowerCase();
    return {
      kind,
      slug,
      canonicalUrl: `https://www.linkedin.com/${prefix}/${slug}`,
    };
  } catch {
    return null;
  }
}

export function titleFromLinkedInSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
