import { readFile, writeFile, mkdir } from "node:fs/promises";
const folder = new URL("../public/downloads/", import.meta.url);
await mkdir(folder, { recursive: true });
const icon = await readFile(
  new URL("../public/icons/favicon.ico", import.meta.url),
);
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function zip(files) {
  const entries = [],
    central = [];
  let offset = 0;
  for (const [name, content] of files) {
    const filename = Buffer.from(name),
      data = Buffer.isBuffer(content) ? content : Buffer.from(content),
      crc = crc32(data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x800, 6);
    header.writeUInt16LE(0x21, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(data.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(filename.length, 26);
    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50, 0);
    directory.writeUInt16LE(20, 4);
    header.copy(directory, 6, 4, 30);
    directory.writeUInt32LE(offset, 42);
    entries.push(header, filename, data);
    central.push(directory, filename);
    offset += header.length + filename.length + data.length;
  }
  const index = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(index.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...entries, index, end]);
}
for (const language of ["ko", "en"]) {
  const url = new URL(
    `/${language}`,
    process.env.NEXT_PUBLIC_SITE_URL || "https://aiguidepage.vercel.app",
  ).href;
  const name = language === "ko" ? "AI 전시관" : "AI Gallery";
  const notes =
    language === "ko"
      ? "압축을 풀고 .url 파일을 바탕화면으로 옮기세요. 기본 브라우저로 열립니다. 선반 아이콘은 .ico를 보관하고 바로가기 속성 → 아이콘 변경에서 선택하세요."
      : "Extract the ZIP and move the .url file to your desktop. It opens in your default browser. Keep the .ico file and select it via shortcut Properties → Change Icon.";
  await writeFile(
    new URL(`AI-gallery-${language}.zip`, folder),
    zip([
      [`${name}.url`, `[InternetShortcut]\r\nURL=${url}\r\n`],
      ["AI-gallery.ico", icon],
      ["Readme.txt", notes],
    ]),
  );
}
console.log("Generated browser-independent .url shortcut bundles.");
