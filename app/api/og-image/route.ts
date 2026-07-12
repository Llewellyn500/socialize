import { NextResponse } from "next/server";
import { renderProfileOgImage, type ProfileOgInput } from "@/lib/og-profile-image";

export const runtime = "edge";

function isProfilePayload(value: unknown): value is ProfileOgInput {
  if (!value || typeof value !== "object") return false;
  const profile = value as Record<string, unknown>;
  return (
    typeof profile.handle === "string" &&
    typeof profile.displayName === "string" &&
    typeof profile.role === "string" &&
    typeof profile.bio === "string" &&
    typeof profile.accent === "string"
  );
}

/** Generate a profile Open Graph PNG for upload to Storage. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { profile?: unknown };
    if (!isProfilePayload(body.profile)) {
      return NextResponse.json({ error: "Invalid profile payload." }, { status: 400 });
    }

    const image = await renderProfileOgImage({
      handle: body.profile.handle.slice(0, 30),
      displayName: body.profile.displayName.slice(0, 60),
      role: body.profile.role.slice(0, 100),
      bio: body.profile.bio.slice(0, 240),
      accent: body.profile.accent,
      avatarUrl:
        typeof body.profile.avatarUrl === "string"
          ? body.profile.avatarUrl.slice(0, 2048)
          : undefined,
    });

    return new NextResponse(image.body, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("OG image generation failed", error);
    return NextResponse.json(
      { error: "Could not generate Open Graph image." },
      { status: 500 },
    );
  }
}
