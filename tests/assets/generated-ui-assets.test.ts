import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { GENERATED_UI_ASSET_IDS } from "../../src/assets/generatedUiAssets";

interface GeneratedUiManifest {
  readonly version: string;
  readonly namespace: string;
  readonly assets: Readonly<Record<string, GeneratedUiAssetEntry>>;
}

interface GeneratedUiAssetEntry {
  readonly path: string;
  readonly type: string;
  readonly required: boolean;
  readonly contentRect?: Rect;
  readonly regions?: Readonly<Record<string, Rect>>;
}

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

interface PngInfo {
  readonly width: number;
  readonly height: number;
  readonly colorType: number;
  readonly cornerAlpha: readonly [number, number, number, number];
}

const MANIFEST_PATH = join(process.cwd(), "public/assets/generated/ui/manifest.v0.4.json");
const REQUIRED_ASSET_IDS = Object.values(GENERATED_UI_ASSET_IDS);
const FATE_ALTAR_REQUIRED_ASSET_IDS = [
  "ui.characterCreation.blackMeditationSilhouette",
  "ui.characterCreation.fateAltarDisc",
  "ui.characterCreation.fateAltarDiscActive",
  "ui.characterCreation.rootAura.metal",
  "ui.characterCreation.rootAura.wood",
  "ui.characterCreation.rootAura.water",
  "ui.characterCreation.rootAura.fire",
  "ui.characterCreation.rootAura.earth",
  "ui.characterCreation.rootAura.thunder",
  "ui.characterCreation.rootAura.yin",
  "ui.characterCreation.rootAura.mixed"
] as const;
const ALL_REQUIRED_ASSET_IDS = [...new Set([...REQUIRED_ASSET_IDS, ...FATE_ALTAR_REQUIRED_ASSET_IDS])];

describe("generated UI asset manifest", () => {
  it("ships a v0.4 generated UI manifest with all required local asset ids", () => {
    const manifest = readManifest();

    expect(manifest.version).toBe("0.4");
    expect(manifest.namespace).toBe("ui.generated");
    expect(REQUIRED_ASSET_IDS).toEqual(expect.arrayContaining([...FATE_ALTAR_REQUIRED_ASSET_IDS]));

    for (const assetId of ALL_REQUIRED_ASSET_IDS) {
      const entry = manifest.assets[assetId];
      expect(entry, assetId).toBeDefined();
      expect(entry?.required, assetId).toBe(true);
      expect(entry?.path, assetId).toMatch(/^\/assets\/generated\/ui\/(common|save|character_creation|life_simulation)\//);
      expect(entry?.path, assetId).not.toMatch(/https?:\/\/|cdn|fonts\.googleapis|@font-face/i);
    }
  });

  it("points every required entry at a non-empty transparent PNG with transparent corners", () => {
    const manifest = readManifest();

    for (const assetId of ALL_REQUIRED_ASSET_IDS) {
      const entry = manifest.assets[assetId];
      if (entry === undefined) {
        throw new Error(`Missing ${assetId}`);
      }
      const absolutePath = join(process.cwd(), "public", entry.path.replace(/^\//, ""));

      expect(existsSync(absolutePath), `${assetId} missing ${absolutePath}`).toBe(true);
      expect(readFileSync(absolutePath).byteLength, assetId).toBeGreaterThan(0);
      const png = readPngInfo(absolutePath);
      expect(png.width, assetId).toBeGreaterThan(0);
      expect(png.height, assetId).toBeGreaterThan(0);
      expect(png.colorType, assetId).toBe(6);
      expect(png.cornerAlpha, assetId).toEqual([0, 0, 0, 0]);
    }
  });

  it("keeps content rectangles and regions inside image bounds", () => {
    const manifest = readManifest();

    for (const assetId of ALL_REQUIRED_ASSET_IDS) {
      const entry = manifest.assets[assetId];
      if (entry === undefined) {
        throw new Error(`Missing ${assetId}`);
      }
      const png = readPngInfo(join(process.cwd(), "public", entry.path.replace(/^\//, "")));
      if (entry.contentRect !== undefined) {
        expectRectInside(assetId, entry.contentRect, png.width, png.height);
      }
      for (const [regionName, region] of Object.entries(entry.regions ?? {})) {
        expectRectInside(`${assetId}.${regionName}`, region, png.width, png.height);
      }
    }
  });
});

function readManifest(): GeneratedUiManifest {
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as GeneratedUiManifest;
}

function expectRectInside(label: string, rect: Rect, width: number, height: number): void {
  expect(rect.x, label).toBeGreaterThanOrEqual(0);
  expect(rect.y, label).toBeGreaterThanOrEqual(0);
  expect(rect.w, label).toBeGreaterThan(0);
  expect(rect.h, label).toBeGreaterThan(0);
  expect(rect.x + rect.w, label).toBeLessThanOrEqual(width);
  expect(rect.y + rect.h, label).toBeLessThanOrEqual(height);
}

function readPngInfo(path: string): PngInfo {
  const bytes = readFileSync(path);
  if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error(`${path} is not a PNG file`);
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks: Buffer[] = [];

  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString("ascii");
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8] ?? 0;
      colorType = data[9] ?? 0;
    } else if (type === "IDAT") {
      idatChunks.push(Buffer.from(data));
    } else if (type === "IEND") {
      break;
    }
    offset += length + 12;
  }

  if (bitDepth !== 8 || colorType !== 6) {
    return { width, height, colorType, cornerAlpha: [255, 255, 255, 255] };
  }

  const bpp = 4;
  const stride = width * bpp;
  const inflated = inflateSync(Buffer.concat(idatChunks));
  const rows: Buffer[] = [];
  let sourceOffset = 0;
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset] ?? 0;
    sourceOffset += 1;
    const raw = inflated.subarray(sourceOffset, sourceOffset + stride);
    sourceOffset += stride;
    const row = Buffer.alloc(stride);

    for (let x = 0; x < stride; x += 1) {
      const left = x >= bpp ? row[x - bpp] ?? 0 : 0;
      const up = previous[x] ?? 0;
      const upLeft = x >= bpp ? previous[x - bpp] ?? 0 : 0;
      const value = raw[x] ?? 0;
      row[x] = (value + filterByte(filter, left, up, upLeft)) & 0xff;
    }
    rows.push(row);
    previous = row;
  }

  const top = rows[0];
  const bottom = rows[height - 1];
  if (top === undefined || bottom === undefined) {
    throw new Error(`${path} has no decoded rows`);
  }

  return {
    width,
    height,
    colorType,
    cornerAlpha: [top[3] ?? 255, top[(width - 1) * bpp + 3] ?? 255, bottom[3] ?? 255, bottom[(width - 1) * bpp + 3] ?? 255]
  };
}

function filterByte(filter: number, left: number, up: number, upLeft: number): number {
  switch (filter) {
    case 0:
      return 0;
    case 1:
      return left;
    case 2:
      return up;
    case 3:
      return Math.floor((left + up) / 2);
    case 4:
      return paeth(left, up, upLeft);
    default:
      throw new Error(`Unsupported PNG filter ${filter}`);
  }
}

function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);
  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) {
    return left;
  }
  if (upDistance <= upLeftDistance) {
    return up;
  }
  return upLeft;
}
