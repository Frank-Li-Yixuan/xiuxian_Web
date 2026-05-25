import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { deflateSync } from "node:zlib";

const outDir = join(process.cwd(), "public/assets/generated/ui/character_creation");

const assets = [
  ["black_meditation_silhouette.png", () => makeSilhouette()],
  ["fate_altar_disc.png", () => makeDisc(false)],
  ["fate_altar_disc_active.png", () => makeDisc(true)],
  ["root_aura_metal.png", () => makeAura([220, 244, 236], [240, 209, 122])],
  ["root_aura_wood.png", () => makeAura([93, 224, 145], [235, 214, 129])],
  ["root_aura_water.png", () => makeAura([88, 204, 235], [228, 249, 255])],
  ["root_aura_fire.png", () => makeAura([255, 132, 78], [255, 219, 119])],
  ["root_aura_earth.png", () => makeAura([191, 175, 107], [240, 213, 128])],
  ["root_aura_thunder.png", () => makeAura([165, 232, 255], [181, 116, 255], true)],
  ["root_aura_yin.png", () => makeAura([139, 136, 229], [232, 238, 255])],
  ["root_aura_mixed.png", () => makeAura([80, 221, 192], [220, 177, 255], true)]
];

function makeSilhouette() {
  const img = createImage(512, 512);
  glow(img, 256, 292, 178, [0, 0, 0], 72);
  ellipse(img, 256, 118, 42, 48, 0, [3, 5, 6, 255]);
  ellipse(img, 256, 222, 72, 112, 0, [4, 6, 7, 255]);
  ellipse(img, 210, 246, 95, 24, -0.4, [2, 4, 5, 245]);
  ellipse(img, 302, 246, 95, 24, 0.4, [2, 4, 5, 245]);
  ellipse(img, 204, 337, 118, 34, -0.16, [2, 3, 4, 252]);
  ellipse(img, 308, 337, 118, 34, 0.16, [2, 3, 4, 252]);
  ellipse(img, 256, 386, 148, 26, 0, [0, 0, 0, 150]);
  ring(img, 256, 258, 170, 3, [22, 31, 32], 120);
  return img;
}

function makeDisc(active) {
  const img = createImage(768, 768);
  const center = 384;
  const jade = active ? [86, 247, 216] : [68, 214, 190];
  const gold = active ? [255, 234, 155] : [218, 189, 105];
  glow(img, center, center, 330, jade, active ? 60 : 36);
  glow(img, center, center, 230, gold, active ? 35 : 18);
  for (const [radius, thick, color, alpha] of [
    [312, 5, gold, active ? 210 : 160],
    [268, 3, jade, active ? 190 : 130],
    [220, 2, gold, active ? 150 : 100],
    [154, 3, jade, active ? 170 : 120],
    [86, 2, gold, active ? 160 : 110]
  ]) {
    ring(img, center, center, radius, thick, color, alpha);
  }
  for (let i = 0; i < 12; i += 1) {
    const a = (Math.PI * 2 * i) / 12;
    line(img, center + Math.cos(a) * 92, center + Math.sin(a) * 92, center + Math.cos(a) * 304, center + Math.sin(a) * 304, 2, jade, active ? 112 : 76);
  }
  for (let i = 0; i < 8; i += 1) {
    const a = (Math.PI * 2 * i) / 8 + Math.PI / 8;
    line(img, center + Math.cos(a) * 170, center + Math.sin(a) * 170, center + Math.cos(a + Math.PI / 3) * 250, center + Math.sin(a + Math.PI / 3) * 250, 2, gold, active ? 138 : 88);
  }
  for (let i = 0; i < 8; i += 1) {
    const a = (Math.PI * 2 * i) / 8;
    ellipse(img, center + Math.cos(a) * 300, center + Math.sin(a) * 300, 22, 10, a, gold, active ? 180 : 115);
  }
  return img;
}

function makeAura(primary, secondary, lightning = false) {
  const img = createImage(768, 768);
  const center = 384;
  glow(img, center, center, 330, primary, 78);
  glow(img, center, center, 220, secondary, 44);
  ring(img, center, center, 288, 12, primary, 106);
  ring(img, center, center, 215, 7, secondary, 94);
  ring(img, center, center, 142, 4, primary, 84);
  for (let i = 0; i < 10; i += 1) {
    const a = (Math.PI * 2 * i) / 10;
    ellipse(img, center + Math.cos(a) * 250, center + Math.sin(a) * 250, 44, 12, a, secondary, 84);
  }
  if (lightning) {
    for (let i = 0; i < 6; i += 1) {
      const a = (Math.PI * 2 * i) / 6 + 0.18;
      lightningBolt(img, center + Math.cos(a) * 130, center + Math.sin(a) * 130, center + Math.cos(a) * 310, center + Math.sin(a) * 310, secondary, 128);
    }
  }
  return img;
}

function createImage(width, height) {
  return { width, height, rgba: new Uint8Array(width * height * 4) };
}

function writePng(path, image) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encodePng(image.width, image.height, image.rgba));
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    chunk("IHDR", Buffer.from([...u32(width), ...u32(height), 8, 6, 0, 0, 0])),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.from(u32(data.length));
  const crc = Buffer.from(u32(crc32(Buffer.concat([typeBuffer, data]))));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function u32(value) {
  return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function blend(image, x, y, rgb, alpha) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 0 || iy < 0 || ix >= image.width || iy >= image.height || alpha <= 0) return;
  const offset = (iy * image.width + ix) * 4;
  const sa = Math.min(255, alpha) / 255;
  const da = image.rgba[offset + 3] / 255;
  const outA = sa + da * (1 - sa);
  if (outA <= 0) return;
  for (let i = 0; i < 3; i += 1) {
    image.rgba[offset + i] = Math.round((rgb[i] * sa + image.rgba[offset + i] * da * (1 - sa)) / outA);
  }
  image.rgba[offset + 3] = Math.round(outA * 255);
}

function glow(image, cx, cy, radius, rgb, alpha) {
  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(image.width - 1, Math.ceil(cx + radius));
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxY = Math.min(image.height - 1, Math.ceil(cy + radius));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const d = Math.hypot(x - cx, y - cy) / radius;
      if (d <= 1) blend(image, x, y, rgb, alpha * (1 - d) ** 2);
    }
  }
}

function ring(image, cx, cy, radius, thickness, rgb, alpha) {
  const limit = thickness * 1.8;
  for (let y = Math.floor(cy - radius - limit); y <= Math.ceil(cy + radius + limit); y += 1) {
    for (let x = Math.floor(cx - radius - limit); x <= Math.ceil(cx + radius + limit); x += 1) {
      const delta = Math.abs(Math.hypot(x - cx, y - cy) - radius);
      if (delta <= thickness) blend(image, x, y, rgb, alpha * (1 - delta / thickness));
    }
  }
}

function ellipse(image, cx, cy, rx, ry, rotation, rgb, alpha = 255) {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const r = Math.max(rx, ry);
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y += 1) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const px = dx * cos + dy * sin;
      const py = -dx * sin + dy * cos;
      const d = (px * px) / (rx * rx) + (py * py) / (ry * ry);
      if (d <= 1) blend(image, x, y, rgb, alpha * Math.min(1, (1 - d) * 6));
    }
  }
}

function line(image, x1, y1, x2, y2, thickness, rgb, alpha) {
  const minX = Math.floor(Math.min(x1, x2) - thickness);
  const maxX = Math.ceil(Math.max(x1, x2) + thickness);
  const minY = Math.floor(Math.min(y1, y2) - thickness);
  const maxY = Math.ceil(Math.max(y1, y2) + thickness);
  const vx = x2 - x1;
  const vy = y2 - y1;
  const len2 = vx * vx + vy * vy;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const t = Math.max(0, Math.min(1, ((x - x1) * vx + (y - y1) * vy) / len2));
      const px = x1 + t * vx;
      const py = y1 + t * vy;
      const d = Math.hypot(x - px, y - py);
      if (d <= thickness) blend(image, x, y, rgb, alpha * (1 - d / thickness));
    }
  }
}

function lightningBolt(image, x1, y1, x2, y2, rgb, alpha) {
  const mx = (x1 + x2) / 2 + (y2 - y1) * 0.09;
  const my = (y1 + y2) / 2 - (x2 - x1) * 0.09;
  line(image, x1, y1, mx, my, 3, rgb, alpha);
  line(image, mx, my, x2, y2, 3, rgb, alpha);
}

mkdirSync(outDir, { recursive: true });
for (const [fileName, render] of assets) {
  writePng(join(outDir, fileName), render());
}
