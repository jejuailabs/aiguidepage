import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const source = await readFile(
  new URL("../public/icons/gallery.svg", import.meta.url),
);
for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
  ["favicon-32.png", 32],
])
  await sharp(source)
    .resize(size, size)
    .png()
    .toFile(fileURLToPath(new URL(`../public/icons/${name}`, import.meta.url)));
const sizes = [16, 32, 48, 256],
  images = await Promise.all(
    sizes.map((size) => sharp(source).resize(size, size).png().toBuffer()),
  );
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
images.forEach((buffer, index) => {
  const entry = 6 + index * 16,
    size = sizes[index];
  header[entry] = size === 256 ? 0 : size;
  header[entry + 1] = header[entry];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(buffer.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += buffer.length;
});
await writeFile(
  new URL("../public/icons/favicon.ico", import.meta.url),
  Buffer.concat([header, ...images]),
);
console.log(
  "Generated app icons: 192, 512, Apple 180, favicon 32 and multi-size ICO.",
);
