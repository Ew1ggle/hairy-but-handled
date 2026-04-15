import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";

const svg = readFileSync("public/icon.svg");
const sizes = { "icon-192.png": 192, "icon-512.png": 512, "apple-touch-icon.png": 180, "icon-maskable.png": 512 };

for (const [name, size] of Object.entries(sizes)) {
  const buf = await sharp(svg).resize(size, size).png().toBuffer();
  writeFileSync(`public/${name}`, buf);
  console.log("wrote", name);
}
