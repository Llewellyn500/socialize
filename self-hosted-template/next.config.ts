import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";
const configuredAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim();
const firebaseAuthOrigin = configuredAuthDomain
  ? `https://${configuredAuthDomain.replace(/^https?:\/\//, "").replace(/\/.*$/, "")}`
  : "";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  [
    "script-src 'self' 'unsafe-inline'",
    isDevelopment ? "'unsafe-eval'" : "",
    "https://www.gstatic.com",
    "https://www.google.com",
    "https://www.recaptcha.net",
  ].filter(Boolean).join(" "),
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  [
    "connect-src 'self'",
    isDevelopment ? "http: ws: wss:" : "",
    "https://*.googleapis.com",
    "https://*.firebaseio.com",
    "wss://*.firebaseio.com",
    "https://accounts.google.com",
    "https://*.googleusercontent.com",
    "https://www.google.com",
    "https://www.recaptcha.net",
    firebaseAuthOrigin,
  ].filter(Boolean).join(" "),
  [
    "frame-src 'self'",
    "https://accounts.google.com",
    "https://*.firebaseapp.com",
    "https://*.web.app",
    "https://www.google.com",
    "https://recaptcha.google.com",
    "https://www.recaptcha.net",
    firebaseAuthOrigin,
  ].filter(Boolean).join(" "),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
