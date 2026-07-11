import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";

const iconSource = "public/app-icon.svg";
const maskableSource = "public/maskable-icon.svg";

const assets = [
  [iconSource, 16, "public/favicon-16x16.png"],
  [iconSource, 32, "public/favicon-32x32.png"],
  [maskableSource, 180, "public/apple-touch-icon.png"],
  [iconSource, 192, "public/android-chrome-192x192.png"],
  [iconSource, 512, "public/android-chrome-512x512.png"],
  [iconSource, 512, "public/socialize-logo.png"],
  [maskableSource, 512, "public/maskable-icon-512x512.png"],
];

await Promise.all(
  assets.map(([source, size, destination]) =>
    sharp(source)
      .resize(size, size)
      .png({ compressionLevel: 9, palette: true })
      .toFile(destination),
  ),
);

const faviconPngs = await Promise.all([
  readFile("public/favicon-16x16.png"),
  readFile("public/favicon-32x32.png"),
]);
const directorySize = 6 + faviconPngs.length * 16;
let imageOffset = directorySize;
const iconDirectory = Buffer.alloc(directorySize);

iconDirectory.writeUInt16LE(0, 0);
iconDirectory.writeUInt16LE(1, 2);
iconDirectory.writeUInt16LE(faviconPngs.length, 4);

faviconPngs.forEach((png, index) => {
  const size = index === 0 ? 16 : 32;
  const entryOffset = 6 + index * 16;
  iconDirectory.writeUInt8(size, entryOffset);
  iconDirectory.writeUInt8(size, entryOffset + 1);
  iconDirectory.writeUInt8(0, entryOffset + 2);
  iconDirectory.writeUInt8(0, entryOffset + 3);
  iconDirectory.writeUInt16LE(1, entryOffset + 4);
  iconDirectory.writeUInt16LE(32, entryOffset + 6);
  iconDirectory.writeUInt32LE(png.length, entryOffset + 8);
  iconDirectory.writeUInt32LE(imageOffset, entryOffset + 12);
  imageOffset += png.length;
});

await writeFile("app/favicon.ico", Buffer.concat([iconDirectory, ...faviconPngs]));

console.log(`Generated ${assets.length + 1} Socialize brand assets.`);
