import { readFile } from "node:fs/promises";
import path from "node:path";

const bundledNotoSans = readFile(
  path.join(
    process.cwd(),
    "node_modules",
    "next",
    "dist",
    "compiled",
    "@vercel",
    "og",
    "noto-sans-v27-latin-regular.ttf",
  ),
).then((font) =>
  font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength) as ArrayBuffer,
);

/**
 * Use the font bundled with the exact pinned Next.js release. This keeps image
 * generation deterministic without making a production request to Google Fonts.
 */
export async function loadOgFonts() {
  const data = await bundledNotoSans;
  return [
    { name: "Socialize Sans", data, weight: 400 as const, style: "normal" as const },
    { name: "Socialize Sans", data, weight: 600 as const, style: "normal" as const },
    { name: "Socialize Sans", data, weight: 700 as const, style: "normal" as const },
  ];
}

export const ogFontStyles = {
  sans: "Socialize Sans",
  mono: "Socialize Sans",
};
