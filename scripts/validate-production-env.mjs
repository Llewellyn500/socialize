import { resolveMx } from "node:dns/promises";

const args = new Set(process.argv.slice(3));
const edition = process.argv[2];
const forceProduction = args.has("--production");
const production = forceProduction || process.env.VERCEL_ENV === "production";
const vercelProduction =
  process.env.VERCEL_ENV === "production" || args.has("--vercel");
const publicOnly = args.has("--public");
const checkNetwork = args.has("--network");
const errors = [];

if (edition !== "hosted" && edition !== "self-hosted") {
  console.error("Usage: validate-production-env.mjs <hosted|self-hosted> [--production] [--public] [--network]");
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

function requireTrue(name, description) {
  const raw = requireValue(name);
  if (raw && raw.toLowerCase() !== "true") {
    errors.push(`${name} must be explicitly set to true ${description}.`);
  }
}

function validateHttpsUrl(name, { allowPath = true } = {}) {
  const raw = requireValue(name);
  if (!raw) return;

  try {
    const url = new URL(raw);
    const placeholderHost =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname.endsWith(".example") ||
      ["example.com", "example.org", "example.net"].includes(url.hostname);
    if (url.protocol !== "https:" || placeholderHost) {
      errors.push(`${name} must be a non-placeholder https:// URL.`);
    }
    if (!allowPath && (url.pathname !== "/" || url.search || url.hash)) {
      errors.push(`${name} must contain only an origin, without a path, query, or fragment.`);
    }
  } catch {
    errors.push(`${name} must be a valid URL.`);
  }
}

function validateEmail(name) {
  const email = requireValue(name);
  if (!email) return;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push(`${name} must be a valid email address.`);
  }
}

function validateIsoDate(name) {
  const raw = requireValue(name);
  if (!raw) return;
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) {
    errors.push(`${name} must use a real YYYY-MM-DD date.`);
  }
}

const firebasePublicVariables = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];

validateHttpsUrl("NEXT_PUBLIC_SITE_URL", { allowPath: false });
firebasePublicVariables.forEach(requireValue);

const authDomain = read("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
if (authDomain && (/^https?:\/\//i.test(authDomain) || /[/?#\s]/.test(authDomain))) {
  errors.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN must be a hostname, not a URL.");
}

if (edition === "hosted") {
  requireValue("NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY");

  const legalTextVariables = [
    "NEXT_PUBLIC_LEGAL_OPERATOR_NAME",
    "NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS",
    "NEXT_PUBLIC_LEGAL_GOVERNING_LAW",
    "NEXT_PUBLIC_LEGAL_VENUE",
    "NEXT_PUBLIC_LEGAL_LIABILITY_CAP",
  ];
  legalTextVariables.forEach(requireValue);
  validateIsoDate("NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE");

  const contactEmailVariables = [
    "NEXT_PUBLIC_SUPPORT_EMAIL",
    "NEXT_PUBLIC_SECURITY_EMAIL",
    "NEXT_PUBLIC_PRIVACY_EMAIL",
    "NEXT_PUBLIC_SAFETY_EMAIL",
    "NEXT_PUBLIC_LEGAL_EMAIL",
    "NEXT_PUBLIC_SPONSORS_EMAIL",
  ];
  contactEmailVariables.forEach(validateEmail);

  const gaId = read("NEXT_PUBLIC_GA_MEASUREMENT_ID") || read("NEXT_PUBLIC_MEASURING_ID");
  if (gaId && !/^G-[A-Z0-9]+$/i.test(gaId)) {
    errors.push("NEXT_PUBLIC_GA_MEASUREMENT_ID must be a GA4 measurement ID such as G-XXXXXXXXXX.");
  }

  const sponsorUrl = read("NEXT_PUBLIC_GITHUB_SPONSOR_URL");
  if (sponsorUrl) {
    try {
      const url = new URL(sponsorUrl);
      if (url.protocol !== "https:") errors.push("NEXT_PUBLIC_GITHUB_SPONSOR_URL must use https://.");
    } catch {
      errors.push("NEXT_PUBLIC_GITHUB_SPONSOR_URL must be a valid URL.");
    }
  }

  if (!publicOnly) {
    requireTrue(
      "FIREBASE_APP_CHECK_ENFORCED",
      "after legitimate production traffic has been verified and App Check enforcement is enabled",
    );
    const serviceAccountRaw = requireValue("FIREBASE_SERVICE_ACCOUNT_JSON");
    if (serviceAccountRaw) {
      try {
        const serviceAccount = JSON.parse(serviceAccountRaw);
        const requiredFields = ["project_id", "client_email", "private_key"];
        for (const field of requiredFields) {
          if (typeof serviceAccount[field] !== "string" || !serviceAccount[field].trim()) {
            errors.push(`FIREBASE_SERVICE_ACCOUNT_JSON is missing ${field}.`);
          }
        }
        if (
          typeof serviceAccount.project_id === "string" &&
          read("NEXT_PUBLIC_FIREBASE_PROJECT_ID") &&
          serviceAccount.project_id !== read("NEXT_PUBLIC_FIREBASE_PROJECT_ID")
        ) {
          errors.push("FIREBASE_SERVICE_ACCOUNT_JSON project_id must match NEXT_PUBLIC_FIREBASE_PROJECT_ID.");
        }
        if (
          typeof serviceAccount.private_key === "string" &&
          !serviceAccount.private_key.includes("PRIVATE KEY")
        ) {
          errors.push("FIREBASE_SERVICE_ACCOUNT_JSON private_key is not a PEM private key.");
        }
      } catch {
        errors.push("FIREBASE_SERVICE_ACCOUNT_JSON must be valid JSON.");
      }
    }
  }

  if (vercelProduction) {
    requireTrue(
      "VERCEL_FIREWALL_CONFIGURED",
      "after Vercel WAF rate limits have been applied to the public API routes",
    );
  }

  if (checkNetwork && errors.length === 0) {
    const domains = new Set(
      contactEmailVariables.map((name) => read(name).split("@")[1]?.toLowerCase()).filter(Boolean),
    );
    for (const domain of domains) {
      try {
        let timeout;
        const records = await Promise.race([
          resolveMx(domain),
          new Promise((_, reject) => {
            timeout = setTimeout(() => reject(new Error("DNS lookup timed out")), 8_000);
          }),
        ]).finally(() => clearTimeout(timeout));
        if (!Array.isArray(records) || records.length === 0) {
          errors.push(`Contact email domain ${domain} has no MX record.`);
        }
      } catch (error) {
        errors.push(`Contact email domain ${domain} failed its MX check: ${error instanceof Error ? error.message : "unknown DNS error"}.`);
      }
    }
  }
}

if (errors.length) {
  console.error("Production environment validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const networkSummary = checkNetwork && edition === "hosted" ? " and contact-email MX records" : "";
console.log(`Validated ${edition} production environment${networkSummary}.`);
