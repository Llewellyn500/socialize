const edition = process.argv[2];
const args = new Set(process.argv.slice(3));
const production = args.has("--production") || process.env.VERCEL_ENV === "production";
const vercelProduction =
  process.env.VERCEL_ENV === "production" || args.has("--vercel");
const errors = [];

if (edition !== "self-hosted") {
  console.error("Usage: validate-production-env.mjs self-hosted [--production]");
  process.exit(2);
}

if (!production) {
  console.log(`Production environment validation skipped (${process.env.VERCEL_ENV || "local"} build).`);
  process.exit(0);
}

function read(name) {
  return process.env[name]?.trim() || "";
}

function requireValue(name) {
  const result = read(name);
  if (!result) errors.push(`${name} is required.`);
  return result;
}

if (vercelProduction) {
  const firewallConfigured = requireValue("VERCEL_FIREWALL_CONFIGURED");
  if (firewallConfigured && firewallConfigured.toLowerCase() !== "true") {
    errors.push(
      "VERCEL_FIREWALL_CONFIGURED must be explicitly set to true after Vercel WAF rate limits have been applied to the public API routes.",
    );
  }
}

const siteUrl = requireValue("NEXT_PUBLIC_SITE_URL");
if (siteUrl) {
  try {
    const url = new URL(siteUrl);
    const placeholderHost =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname.endsWith(".example") ||
      ["example.com", "example.org", "example.net"].includes(url.hostname);
    if (
      url.protocol !== "https:" ||
      placeholderHost ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      errors.push("NEXT_PUBLIC_SITE_URL must be a non-placeholder https:// origin.");
    }
  } catch {
    errors.push("NEXT_PUBLIC_SITE_URL must be a valid URL.");
  }
}

[
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
].forEach(requireValue);

const authDomain = read("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
if (authDomain && (/^https?:\/\//i.test(authDomain) || /[/?#\s]/.test(authDomain))) {
  errors.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN must be a hostname, not a URL.");
}

if (errors.length) {
  console.error("Self-hosted production environment validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Validated self-hosted production environment.");
