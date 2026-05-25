import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { inflateSync } from "node:zlib";

const VERSION = "0.3";
const NAMESPACE = "ui.normalized";
const UI_ROOT = join(process.cwd(), "public", "assets", "generated", "ui");
const TARGET_DIRS = ["common", "save", "character_creation", "life_simulation"];
const STATE_SUFFIXES = ["normal", "hover", "pressed", "selected", "disabled", "locked", "unlocked"];
const ALPHA_VISIBLE_THRESHOLD = 8;

const cliOptions = parseCliOptions(process.argv.slice(2));
const outputDir = cliOptions.outDir ?? UI_ROOT;

const analyzedAssets = TARGET_DIRS.flatMap((dirName) => listPngFiles(join(UI_ROOT, dirName)))
  .sort((a, b) => a.localeCompare(b))
  .map((absolutePath) => analyzeAsset(absolutePath));

const stateGroups = buildStateGroups(analyzedAssets);
for (const entry of analyzedAssets) {
  const group = entry.stateGroup === undefined ? undefined : stateGroups[entry.stateGroup];
  if (group !== undefined && group.warnings.length > 0) {
    entry.warnings = uniqueStrings([...(entry.warnings ?? []), ...group.warnings]);
  }
}

const manifest = {
  version: VERSION,
  namespace: NAMESPACE,
  generatedAtMs: Date.now(),
  rootDirs: TARGET_DIRS.map((dirName) => `/assets/generated/ui/${dirName}/`),
  assets: Object.fromEntries(analyzedAssets.map((entry) => [entry.id, entry])),
  stateGroups
};

const reportWarnings = analyzedAssets.flatMap((entry) =>
  (entry.warnings ?? []).map((code) => ({
    id: entry.id,
    code,
    path: entry.path
  }))
);

const report = {
  version: VERSION,
  namespace: NAMESPACE,
  generatedAtMs: manifest.generatedAtMs,
  rootDirs: manifest.rootDirs,
  assetCount: analyzedAssets.length,
  assets: analyzedAssets,
  warnings: reportWarnings,
  stateGroups
};

mkdirSync(outputDir, { recursive: true });
writeJson(join(outputDir, "ui_asset_report.v0.3.json"), report);
writeJson(join(outputDir, "ui_manifest.v0.3.json"), manifest);

console.log(`Analyzed ${analyzedAssets.length} UI assets.`);
console.log(`Wrote ${join(outputDir, "ui_asset_report.v0.3.json")}`);
console.log(`Wrote ${join(outputDir, "ui_manifest.v0.3.json")}`);

function parseCliOptions(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--out-dir") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error("--out-dir requires a value");
      }
      options.outDir = value;
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      console.log("Usage: node scripts/analyze-ui-assets.mjs [--out-dir <directory>]");
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function listPngFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(dir, entry.name);
    if (entry.isDirectory()) {
      return listPngFiles(absolutePath);
    }
    return entry.isFile() && entry.name.toLowerCase().endsWith(".png") ? [absolutePath] : [];
  });
}

function analyzeAsset(absolutePath) {
  const png = decodePng(absolutePath);
  const relativePath = relative(UI_ROOT, absolutePath).replace(/\\/g, "/");
  const publicPath = `/assets/generated/ui/${relativePath}`;
  const name = basename(absolutePath, ".png");
  const category = categorizeAsset(relativePath, name);
  const state = detectState(name);
  const id = makeAssetId(relativePath, state);
  const visualBounds = computeVisualBounds(png);
  const transparentPadding = computeTransparentPadding(png.width, png.height, visualBounds);
  const contentRect = recommendContentRect(visualBounds, category);
  const scalingMode = recommendScalingMode(category);
  const entry = {
    id,
    path: publicPath,
    category,
    required: true,
    imageSize: { w: png.width, h: png.height },
    visualBounds,
    transparentPadding,
    mostlyEmpty: visualBounds.w * visualBounds.h === 0 || png.visiblePixelCount / (png.width * png.height) < 0.03,
    recommendedDisplaySize: recommendDisplaySize(visualBounds, category),
    contentRect,
    scalingMode,
    ...(scalingMode === "nineSlice" ? { nineSlice: recommendNineSlice(visualBounds, category) } : {}),
    ...(state === undefined ? {} : { stateGroup: makeStateGroupId(relativePath, state) })
  };
  const warnings = buildAssetWarnings(entry);
  return warnings.length > 0 ? { ...entry, warnings } : entry;
}

function decodePng(path) {
  const bytes = readFileSync(path);
  if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error(`${path} is not a PNG file`);
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

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

  if (width <= 0 || height <= 0) {
    throw new Error(`${path} has invalid PNG dimensions`);
  }
  if (bitDepth !== 8 || colorType !== 6) {
    return {
      width,
      height,
      pixels: Buffer.alloc(width * height * 4, 255),
      visiblePixelCount: width * height,
      colorType,
      bitDepth
    };
  }

  const bpp = 4;
  const stride = width * bpp;
  const inflated = inflateSync(Buffer.concat(idatChunks));
  const pixels = Buffer.alloc(width * height * bpp);
  let sourceOffset = 0;
  let targetOffset = 0;
  let previous = Buffer.alloc(stride);
  let visiblePixelCount = 0;

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
      row[x] = ((raw[x] ?? 0) + filterByte(filter, left, up, upLeft)) & 0xff;
    }
    row.copy(pixels, targetOffset);
    for (let x = 3; x < stride; x += bpp) {
      if ((row[x] ?? 0) > ALPHA_VISIBLE_THRESHOLD) {
        visiblePixelCount += 1;
      }
    }
    targetOffset += stride;
    previous = row;
  }

  return { width, height, pixels, visiblePixelCount, colorType, bitDepth };
}

function computeVisualBounds(png) {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const alpha = png.pixels[(y * png.width + x) * 4 + 3] ?? 255;
      if (alpha > ALPHA_VISIBLE_THRESHOLD) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return { x: 0, y: 0, w: png.width, h: png.height };
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function computeTransparentPadding(width, height, visualBounds) {
  const left = visualBounds.x;
  const top = visualBounds.y;
  const right = width - visualBounds.x - visualBounds.w;
  const bottom = height - visualBounds.y - visualBounds.h;
  const imageArea = width * height;
  const visualArea = visualBounds.w * visualBounds.h;
  return {
    left,
    right,
    top,
    bottom,
    paddingRatio: round((imageArea - visualArea) / imageArea, 4)
  };
}

function categorizeAsset(relativePath, name) {
  const normalized = `${relativePath}/${name}`.toLowerCase();
  if (/aura|overlay|silhouette|disc_active/.test(normalized)) {
    return "overlay";
  }
  if (/slot/.test(normalized)) {
    return "slot";
  }
  if (/panel|dialog|main_panel|event_log/.test(normalized)) {
    return "panel";
  }
  if (/choice_event|card|destiny/.test(normalized)) {
    return "card";
  }
  if (/button|close|reroll|confirm|load|create|danger|choice/.test(normalized)) {
    return "button";
  }
  if (/frame|badge|disc/.test(normalized)) {
    return "iconFrame";
  }
  return "ornament";
}

function recommendScalingMode(category) {
  if (category === "panel" || category === "card" || category === "slot") {
    return "nineSlice";
  }
  if (category === "overlay") {
    return "contain";
  }
  return "fixed";
}

function recommendContentRect(visualBounds, category) {
  const inset =
    category === "button"
      ? { x: 0.22, y: 0.28 }
      : category === "slot" || category === "card"
        ? { x: 0.12, y: 0.18 }
        : category === "panel"
          ? { x: 0.12, y: 0.14 }
          : { x: 0, y: 0 };
  const xInset = Math.floor(visualBounds.w * inset.x);
  const yInset = Math.floor(visualBounds.h * inset.y);
  return clampRect({
    x: visualBounds.x + xInset,
    y: visualBounds.y + yInset,
    w: Math.max(1, visualBounds.w - xInset * 2),
    h: Math.max(1, visualBounds.h - yInset * 2)
  });
}

function recommendNineSlice(visualBounds, category) {
  const ratio = category === "panel" ? { x: 0.12, y: 0.12 } : { x: 0.14, y: 0.16 };
  const maxX = Math.max(1, Math.floor(visualBounds.w / 2) - 1);
  const maxY = Math.max(1, Math.floor(visualBounds.h / 2) - 1);
  return {
    left: Math.min(maxX, Math.max(8, Math.round(visualBounds.w * ratio.x))),
    right: Math.min(maxX, Math.max(8, Math.round(visualBounds.w * ratio.x))),
    top: Math.min(maxY, Math.max(8, Math.round(visualBounds.h * ratio.y))),
    bottom: Math.min(maxY, Math.max(8, Math.round(visualBounds.h * ratio.y)))
  };
}

function recommendDisplaySize(visualBounds, category) {
  const aspect = visualBounds.w / Math.max(1, visualBounds.h);
  if (category === "button") {
    return fitByWidth(320, aspect, 44, 96);
  }
  if (category === "slot") {
    return fitByWidth(560, aspect, 116, 188);
  }
  if (category === "card") {
    return fitByHeight(190, aspect, 132, 420);
  }
  if (category === "panel") {
    const width = clamp(visualBounds.w, 520, 1180);
    return { w: Math.round(width), h: Math.round(width / aspect) };
  }
  if (category === "iconFrame") {
    return fitByHeight(72, aspect, 48, 120);
  }
  if (category === "overlay") {
    const width = clamp(visualBounds.w, 96, 512);
    return { w: Math.round(width), h: Math.round(width / aspect) };
  }
  return fitByWidth(180, aspect, 48, 240);
}

function buildAssetWarnings(entry) {
  const warnings = [];
  const padding = entry.transparentPadding;
  if (
    padding.paddingRatio > 0.2 ||
    padding.left / entry.imageSize.w > 0.2 ||
    padding.right / entry.imageSize.w > 0.2 ||
    padding.top / entry.imageSize.h > 0.2 ||
    padding.bottom / entry.imageSize.h > 0.2
  ) {
    warnings.push("hugeTransparentPadding");
  }
  if (entry.mostlyEmpty) {
    warnings.push("mostlyEmpty");
  }
  if (entry.contentRect === undefined) {
    warnings.push("missingContentRect");
  }
  if ((entry.category === "panel" || entry.category === "card" || entry.category === "slot") && entry.nineSlice === undefined) {
    warnings.push("missingNineSlice");
  }
  return warnings;
}

function buildStateGroups(entries) {
  const grouped = new Map();
  for (const entry of entries) {
    if (entry.stateGroup === undefined) {
      continue;
    }
    const existing = grouped.get(entry.stateGroup) ?? [];
    existing.push(entry);
    grouped.set(entry.stateGroup, existing);
  }

  return Object.fromEntries(
    [...grouped.entries()].map(([groupId, groupEntries]) => {
      const first = groupEntries[0];
      const warnings = [];
      if (
        groupEntries.some(
          (entry) => entry.imageSize.w !== first.imageSize.w || entry.imageSize.h !== first.imageSize.h
        )
      ) {
        warnings.push("stateGroupImageSizeMismatch");
      }
      const firstAspect = first.visualBounds.w / Math.max(1, first.visualBounds.h);
      if (groupEntries.some((entry) => Math.abs(entry.visualBounds.w / Math.max(1, entry.visualBounds.h) - firstAspect) > 0.08)) {
        warnings.push("stateGroupVisualAspectMismatch");
      }
      if (
        groupEntries.some(
          (entry) =>
            Math.abs(entry.recommendedDisplaySize.w - first.recommendedDisplaySize.w) > 2 ||
            Math.abs(entry.recommendedDisplaySize.h - first.recommendedDisplaySize.h) > 2
        )
      ) {
        warnings.push("stateGroupDisplaySizeMismatch");
      }
      return [
        groupId,
        {
          ids: groupEntries.map((entry) => entry.id),
          warnings
        }
      ];
    })
  );
}

function detectState(name) {
  const match = name.match(new RegExp(`_(${STATE_SUFFIXES.join("|")})$`));
  return match?.[1];
}

function makeAssetId(relativePath, state) {
  const parts = relativePath.replace(/\.png$/i, "").split("/");
  const root = parts[0];
  const name = parts.slice(1).join("_");
  const namespace =
    root === "character_creation" ? "characterCreation" : root === "life_simulation" ? "lifeSimulation" : root;
  const baseName = state === undefined ? name : name.slice(0, -1 * (`_${state}`).length);
  const semantic = semanticAssetId(baseName, state);
  return `ui.${namespace}.${semantic}`;
}

function makeStateGroupId(relativePath, state) {
  return makeAssetId(relativePath, state).replace(new RegExp(`\\.${state}$`), "");
}

function semanticAssetId(baseName, state) {
  const rootAuraMatch = baseName.match(/^root_aura_(.+)$/);
  if (rootAuraMatch?.[1] !== undefined) {
    return `rootAura.${camelToken(rootAuraMatch[1])}`;
  }
  const destinyMatch = baseName.match(/^destiny_card_(.+)$/);
  if (destinyMatch?.[1] !== undefined) {
    return `destinyCard.${camelToken(destinyMatch[1])}`;
  }
  const saveSlotExisting = baseName.match(/^save_slot_existing$/);
  if (saveSlotExisting !== null && state !== undefined) {
    return `saveSlotExisting.${state}`;
  }
  const suffix = state === undefined ? "" : `.${state}`;
  return `${camelToken(baseName)}${suffix}`;
}

function camelToken(value) {
  return value
    .split("_")
    .filter((part) => part.length > 0)
    .map((part, index) => (index === 0 ? part : part[0].toUpperCase() + part.slice(1)))
    .join("");
}

function filterByte(filter, left, up, upLeft) {
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

function paeth(left, up, upLeft) {
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

function fitByWidth(width, aspect, minHeight, maxHeight) {
  const height = clamp(width / aspect, minHeight, maxHeight);
  return { w: Math.round(height * aspect), h: Math.round(height) };
}

function fitByHeight(height, aspect, minWidth, maxWidth) {
  const width = clamp(height * aspect, minWidth, maxWidth);
  return { w: Math.round(width), h: Math.round(width / aspect) };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampRect(rect) {
  return {
    x: Math.max(0, Math.round(rect.x)),
    y: Math.max(0, Math.round(rect.y)),
    w: Math.max(1, Math.round(rect.w)),
    h: Math.max(1, Math.round(rect.h))
  };
}

function round(value, decimals) {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}

function uniqueStrings(values) {
  return [...new Set(values)];
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
