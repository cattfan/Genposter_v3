// Generates a simple 1024x1024 brand placeholder PNG (orange with a white ring)
// so `tauri icon` has a source image. Replace later with a real logo.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const SIZE = 1024;
const ORANGE = [0xff, 0x66, 0x00];
const WHITE = [0xff, 0xff, 0xff];

const cx = SIZE / 2;
const cy = SIZE / 2;
const rOuter = SIZE * 0.34;
const rInner = SIZE * 0.22;

const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
let p = 0;
for (let y = 0; y < SIZE; y++) {
  raw[p++] = 0; // filter: none
  for (let x = 0; x < SIZE; x++) {
    const d = Math.hypot(x - cx, y - cy);
    const ring = d <= rOuter && d >= rInner;
    const [r, g, b] = ring ? WHITE : ORANGE;
    raw[p++] = r;
    raw[p++] = g;
    raw[p++] = b;
    raw[p++] = 0xff;
  }
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  sig,
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const out = process.argv[2] || "apps/desktop/app-icon.png";
writeFileSync(out, png);
console.log(`wrote ${out} (${png.length} bytes)`);
