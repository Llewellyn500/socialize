const GOOGLE_FONT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1";

/** Load a Google Font for next/og ImageResponse (woff2). */
export async function loadGoogleFont(family: string, weight: number) {
  const familyParam = family.replace(/ /g, "+");
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${weight}&display=swap`,
    { headers: { "User-Agent": GOOGLE_FONT_USER_AGENT } },
  ).then((response) => response.text());

  const match = css.match(/src: url\(([^)]+)\) format\('woff2'\)/);
  if (!match?.[1]) {
    throw new Error(`Could not load ${family} ${weight} for Open Graph images.`);
  }

  return fetch(match[1]).then((response) => response.arrayBuffer());
}

/** Hero sans stack: Helvetica Neue on site; Arimo embeds cleanly for OG images. */
export const OG_SANS = "Arimo";

/** Mono accents used on hero labels and profile chrome. */
export const OG_MONO = "Roboto Mono";

export async function loadOgFonts() {
  const [sansSemiBold, sansBold, monoBold] = await Promise.all([
    loadGoogleFont(OG_SANS, 600),
    loadGoogleFont(OG_SANS, 700),
    loadGoogleFont(OG_MONO, 700),
  ]);

  return [
    { name: OG_SANS, data: sansSemiBold, weight: 600 as const, style: "normal" as const },
    { name: OG_SANS, data: sansBold, weight: 700 as const, style: "normal" as const },
    { name: OG_MONO, data: monoBold, weight: 700 as const, style: "normal" as const },
  ];
}

export const ogFontStyles = {
  sans: `${OG_SANS}, "Helvetica Neue", Arial, sans-serif`,
  mono: `${OG_MONO}, ui-monospace, SFMono-Regular, Consolas, monospace`,
};
