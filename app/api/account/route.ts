import { NextResponse } from "next/server";
import { deleteHostedAccount } from "@/lib/account-deletion-server";
import { verifyFirebaseRequest } from "@/lib/firebase-auth-server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_AUTH_AGE_SECONDS = 5 * 60;

function response(error: string, status: number) {
  return NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(request: Request) {
  const identity = await verifyFirebaseRequest(request);
  if (!identity) {
    return response("Sign in again before deleting this account.", 401);
  }

  const now = Math.floor(Date.now() / 1_000);
  if (
    identity.authTime === null ||
    identity.authTime > now + 60 ||
    now - identity.authTime > MAX_AUTH_AGE_SECONDS
  ) {
    return response("Confirm your identity again before deleting this account.", 401);
  }

  try {
    await deleteHostedAccount(identity.uid);
    return NextResponse.json(
      { deleted: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Hosted account deletion failed", error);
    const configurationFailure =
      error instanceof Error && error.message.includes("not configured");
    return response(
      configurationFailure
        ? "Account deletion is temporarily unavailable. Contact support if this continues."
        : "We could not delete every account record. Your sign-in remains active so you can retry.",
      configurationFailure ? 503 : 502,
    );
  }
}
