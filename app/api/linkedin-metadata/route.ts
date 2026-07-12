import { NextResponse } from "next/server";
import { fetchLinkedInHeadline, LINKEDIN_LINK_TITLE } from "@/lib/linkedin-headline";
import { parseLinkedInUrl } from "@/lib/linkedin-url";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url")?.trim();
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter." }, { status: 400 });
  }

  const parsed = parseLinkedInUrl(url);
  if (!parsed) {
    return NextResponse.json({ error: "Not a supported LinkedIn URL." }, { status: 400 });
  }

  try {
    const description = await fetchLinkedInHeadline(parsed.canonicalUrl);
    return NextResponse.json({
      title: LINKEDIN_LINK_TITLE,
      description,
    });
  } catch {
    return NextResponse.json({
      title: LINKEDIN_LINK_TITLE,
      description: "",
    });
  }
}
