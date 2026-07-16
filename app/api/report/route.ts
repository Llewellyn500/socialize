import { NextResponse } from "next/server";
import {
  firestoreAdminRequest,
  isFirebaseAppCheckConfigured,
  verifyFirebaseAppCheckToken,
} from "@/lib/firebase-admin-rest";
import {
  consumeRequestRateLimit,
  NO_STORE_CACHE_CONTROL,
  requestRateLimitHeaders,
} from "@/lib/request-safety";

export const runtime = "nodejs";

const REPORT_RATE_LIMIT = {
  namespace: "profile-report",
  limit: 3,
  windowMs: 60 * 60 * 1_000,
} as const;
const HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REPORT_REASONS = new Set([
  "Impersonation or deceptive identity",
  "Phishing, malware, or unsafe link",
  "Harassment, threats, or private information",
  "Intellectual-property concern",
  "Another policy concern",
]);

type ReportInput = {
  handle: string;
  reason: string;
  details: string;
  contactEmail?: string;
};

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin") || request.headers.get("referer");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function appCheckToken(request: Request) {
  return request.headers.get("x-firebase-appcheck")?.trim() || "";
}

function validReport(value: unknown): value is ReportInput {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<ReportInput>;
  const email = report.contactEmail?.trim() || "";
  return (
    typeof report.handle === "string" &&
    HANDLE_PATTERN.test(report.handle) &&
    report.handle.length >= 3 &&
    report.handle.length <= 30 &&
    typeof report.reason === "string" &&
    REPORT_REASONS.has(report.reason) &&
    typeof report.details === "string" &&
    report.details.trim().length >= 20 &&
    report.details.trim().length <= 1_000 &&
    (!email || (email.length <= 254 && EMAIL_PATTERN.test(email)))
  );
}

function errorResponse(
  error: string,
  status: 400 | 403 | 413 | 429 | 500 | 503,
  headers: Record<string, string>,
) {
  return NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": NO_STORE_CACHE_CONTROL, ...headers } },
  );
}

/** Server-owned moderation queue; direct anonymous Firestore writes are denied. */
export async function POST(request: Request) {
  if (!isFirebaseAppCheckConfigured()) {
    return errorResponse(
      "The report queue is not configured. Please use the safety email.",
      503,
      {},
    );
  }
  const token = appCheckToken(request);
  if (!token) {
    return errorResponse(
      "Report submission is unavailable. Please use the safety email.",
      503,
      {},
    );
  }

  const rateLimit = consumeRequestRateLimit(request, REPORT_RATE_LIMIT);
  const rateHeaders = requestRateLimitHeaders(rateLimit);
  if (!rateLimit.allowed) {
    return errorResponse(
      "Too many reports from this network. Please use the safety email if the risk is urgent.",
      429,
      { "Retry-After": String(rateLimit.retryAfter), ...rateHeaders },
    );
  }
  if (!sameOrigin(request)) return errorResponse("Invalid request origin.", 403, rateHeaders);

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 2_000) return errorResponse("Report payload is too large.", 413, rateHeaders);
  if (!(await verifyFirebaseAppCheckToken(token))) {
    return errorResponse("Unable to verify this report submission.", 403, rateHeaders);
  }

  try {
    const body = (await request.json()) as unknown;
    if (!validReport(body)) return errorResponse("Invalid report details.", 400, rateHeaders);

    const response = await firestoreAdminRequest("reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          handle: { stringValue: body.handle },
          reason: { stringValue: body.reason },
          details: { stringValue: body.details.trim() },
          contactEmail: body.contactEmail?.trim()
            ? { stringValue: body.contactEmail.trim() }
            : { nullValue: null },
          createdAt: { timestampValue: new Date().toISOString() },
          status: { stringValue: "new" },
        },
      }),
    });
    if (!response?.ok) {
      return errorResponse("The report queue is temporarily unavailable. Please use the safety email.", 503, rateHeaders);
    }

    return NextResponse.json(
      { ok: true },
      { status: 201, headers: { "Cache-Control": NO_STORE_CACHE_CONTROL, ...rateHeaders } },
    );
  } catch {
    return errorResponse("The report queue is temporarily unavailable. Please use the safety email.", 500, rateHeaders);
  }
}
