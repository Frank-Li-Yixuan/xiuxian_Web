#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

const MANIFEST_PATH = join(process.cwd(), "public", "assets", "3d", "manifest.v0.1.json");
const PUBLIC_3D_ROOT = join(process.cwd(), "public", "assets", "3d");
const CATEGORIES = ["player", "artifact", "enemy", "pickup", "boss", "environment"];
const ALLOWED_LICENSES = new Set(["CC0", "CC-BY", "MIT", "Public Domain", "Internal Placeholder"]);
const TRUSTED_SOURCE_NAMES = new Set(["Quaternius", "Kenney"]);
const PREFERRED_FORMATS = new Set(["glb", "gltf"]);
const CONVERSION_FORMATS = new Set(["fbx", "obj"]);
const PIPELINE_STATUSES = new Set(["runtime_ready", "needs_conversion", "planned"]);
const ASSET_FOLDER_WARN_BYTES = 20 * 1024 * 1024;
const TEXTURE_MAX_DIMENSION = 2048;
const REQUIRED_FIELDS = [
  "id",
  "displayName",
  "category",
  "path",
  "format",
  "sourceName",
  "sourceUrl",
  "author",
  "license",
  "attributionRequired",
  "downloadDate",
  "originalFileName",
  "scale",
  "rotation",
  "anchor",
  "gameplayRole",
  "required",
  "fallbackPrimitive",
  "notes"
];

const errors = [];
const warnings = [];

main();

function main() {
  const manifest = readManifest();
  validateTopLevel(manifest);

  const counts = Object.fromEntries(CATEGORIES.map((category) => [category, 0]));
  const ids = new Set();
  const assets = Array.isArray(manifest.assets) ? manifest.assets : [];

  assets.forEach((asset, index) => {
    validateAsset(asset, index, ids, counts);
  });

  for (const warning of warnings) {
    console.warn(`WARN ${warning}`);
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`ERROR ${error}`);
    }
    process.exit(1);
  }

  console.log("3D asset manifest OK");
  console.log(`Manifest: ${relative(process.cwd(), MANIFEST_PATH).replaceAll("\\", "/")}`);
  console.log(`Assets: ${assets.length}`);
  console.log("Summary by category:");
  for (const category of CATEGORIES) {
    console.log(`  ${category}: ${counts[category] ?? 0}`);
  }
}

function readManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    errors.push(`Manifest not found: ${MANIFEST_PATH}`);
    return { assets: [] };
  }

  try {
    return JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  } catch (error) {
    errors.push(`Manifest JSON parse failed: ${error instanceof Error ? error.message : String(error)}`);
    return { assets: [] };
  }
}

function validateTopLevel(manifest) {
  if (!isObject(manifest)) {
    errors.push("Manifest must be a JSON object.");
    return;
  }
  if (manifest.version !== "0.1") {
    errors.push('Manifest version must be "0.1".');
  }
  if (manifest.namespace !== "assets.3d.combat") {
    errors.push('Manifest namespace must be "assets.3d.combat".');
  }
  if (manifest.root !== "/assets/3d/") {
    errors.push('Manifest root must be "/assets/3d/".');
  }
  if (!Array.isArray(manifest.assets)) {
    errors.push("Manifest assets must be an array.");
  }
}

function validateAsset(asset, index, ids, counts) {
  const label = assetLabel(asset, index);
  if (!isObject(asset)) {
    errors.push(`${label}: asset entry must be an object.`);
    return;
  }

  for (const field of REQUIRED_FIELDS) {
    if (!Object.hasOwn(asset, field)) {
      errors.push(`${label}: missing required field "${field}".`);
    }
  }

  const id = stringValue(asset.id);
  if (id.length === 0) {
    errors.push(`${label}: id must be a non-empty string.`);
  } else if (ids.has(id)) {
    errors.push(`${label}: duplicate id "${id}".`);
  } else {
    ids.add(id);
  }

  const category = stringValue(asset.category);
  if (!CATEGORIES.includes(category)) {
    errors.push(`${label}: category must be one of ${CATEGORIES.join(", ")}.`);
  } else {
    counts[category] = (counts[category] ?? 0) + 1;
  }

  validateTextFields(asset, label);
  validateLicense(asset, label);
  validateSourceName(asset, label);
  validateSourceUrl(asset, label);
  validateFormat(asset, label);
  validatePipelineStatus(asset, label);
  validateTransform(asset.scale, ["x", "y", "z"], `${label}: scale`);
  validateTransform(asset.rotation, ["xDeg", "yDeg", "zDeg"], `${label}: rotation`);
  validateTransform(asset.anchor, ["x", "y", "z"], `${label}: anchor`);
  validateBoolean(asset.attributionRequired, `${label}: attributionRequired`);
  validateBoolean(asset.required, `${label}: required`);
  if (Object.hasOwn(asset, "planned")) {
    validateBoolean(asset.planned, `${label}: planned`);
  }
  validateSketchfabPolicy(asset, label);
  validateLocalFile(asset, label);
}

function validateTextFields(asset, label) {
  const planned = asset.planned === true;
  const textFields = [
    "id",
    "displayName",
    "category",
    "path",
    "format",
    "sourceName",
    "sourceUrl",
    "author",
    "license",
    "downloadDate",
    "originalFileName",
    "gameplayRole",
    "fallbackPrimitive",
    "notes"
  ];

  for (const field of textFields) {
    const value = asset[field];
    if (typeof value !== "string") {
      errors.push(`${label}: ${field} must be a string.`);
      continue;
    }
    if (!planned && value.trim().length === 0) {
      errors.push(`${label}: ${field} must be non-empty for non-planned assets.`);
    }
  }
}

function validateLicense(asset, label) {
  const license = stringValue(asset.license);
  if (license.length === 0) {
    errors.push(`${label}: license is required.`);
    return;
  }
  if (!ALLOWED_LICENSES.has(license)) {
    warnings.push(`${label}: license "${license}" is outside the approved list.`);
  }
  if (license === "CC-BY" && asset.attributionRequired !== true) {
    warnings.push(`${label}: CC-BY assets should set attributionRequired to true.`);
  }
}

function validateSourceName(asset, label) {
  const sourceName = stringValue(asset.sourceName);
  const license = stringValue(asset.license);
  if (license === "Internal Placeholder" || sourceName === "Internal Placeholder") {
    return;
  }
  if (!TRUSTED_SOURCE_NAMES.has(sourceName)) {
    errors.push(`${label}: sourceName must be Quaternius or Kenney for this intake phase.`);
  }
}

function validateSourceUrl(asset, label) {
  const sourceUrl = stringValue(asset.sourceUrl);
  if (sourceUrl.length === 0) {
    errors.push(`${label}: sourceUrl is required.`);
    return;
  }
  if (!sourceUrl.startsWith("https://") && !sourceUrl.startsWith("internal://")) {
    errors.push(`${label}: sourceUrl must start with https:// or internal://.`);
  }
}

function validateFormat(asset, label) {
  const format = stringValue(asset.format).toLowerCase();
  if (format.length === 0) {
    errors.push(`${label}: format is required.`);
    return;
  }
  if (PREFERRED_FORMATS.has(format)) {
    return;
  }
  if (CONVERSION_FORMATS.has(format)) {
    const notes = stringValue(asset.notes);
    warnings.push(`${label}: ${format.toUpperCase()} needs conversion before runtime use.`);
    if (!/(converted|conversion|source file|source-only|pending conversion|retained as source)/i.test(notes)) {
      warnings.push(`${label}: ${format.toUpperCase()} entries must record conversion or source-file status in notes.`);
    }
    return;
  }
  warnings.push(`${label}: format "${asset.format}" is not GLB/glTF-first.`);
}

function validatePipelineStatus(asset, label) {
  if (!Object.hasOwn(asset, "pipelineStatus")) {
    return;
  }
  const pipelineStatus = stringValue(asset.pipelineStatus);
  if (!PIPELINE_STATUSES.has(pipelineStatus)) {
    errors.push(`${label}: pipelineStatus must be runtime_ready, needs_conversion, or planned.`);
    return;
  }
  const format = stringValue(asset.format).toLowerCase();
  if (CONVERSION_FORMATS.has(format) && pipelineStatus === "runtime_ready") {
    errors.push(`${label}: FBX/OBJ assets cannot be marked runtime_ready.`);
  }
}

function validateTransform(value, keys, label) {
  if (!isObject(value)) {
    errors.push(`${label} must be an object.`);
    return;
  }
  for (const key of keys) {
    if (typeof value[key] !== "number" || !Number.isFinite(value[key])) {
      errors.push(`${label}.${key} must be a finite number.`);
    }
  }
}

function validateBoolean(value, label) {
  if (typeof value !== "boolean") {
    errors.push(`${label} must be a boolean.`);
  }
}

function validateSketchfabPolicy(asset, label) {
  const sourceName = stringValue(asset.sourceName).toLowerCase();
  const sourceUrl = stringValue(asset.sourceUrl).toLowerCase();
  if (!sourceName.includes("sketchfab") && !sourceUrl.includes("sketchfab.com")) {
    return;
  }

  const license = stringValue(asset.license);
  if (license !== "CC0" && license !== "CC-BY") {
    errors.push(`${label}: Sketchfab is allowed only for explicit CC0 or CC-BY assets in this phase.`);
  }
  if (license === "CC-BY" && asset.attributionRequired !== true) {
    errors.push(`${label}: Sketchfab CC-BY assets must set attributionRequired to true.`);
  }
}

function validateLocalFile(asset, label) {
  const path = stringValue(asset.path);
  if (path.length === 0) {
    return;
  }
  if (/^https?:\/\//i.test(path)) {
    errors.push(`${label}: path must be a local public asset path, not a URL.`);
    return;
  }
  if (!path.startsWith("/assets/3d/")) {
    errors.push(`${label}: path must start with /assets/3d/.`);
    return;
  }

  const absolutePath = resolve(process.cwd(), "public", path.replace(/^\//, ""));
  const relativeTo3dRoot = relative(PUBLIC_3D_ROOT, absolutePath);
  if (relativeTo3dRoot.startsWith("..") || relativeTo3dRoot === "") {
    errors.push(`${label}: path must stay inside public/assets/3d.`);
    return;
  }

  if (asset.planned === true) {
    return;
  }
  if (!existsSync(absolutePath)) {
    if (asset.required === true) {
      errors.push(`${label}: required asset file is missing at ${path}.`);
    } else {
      warnings.push(`${label}: optional asset file is missing at ${path}.`);
    }
    return;
  }

  validateAssetFolderBudget(dirname(absolutePath), label);
  validateTextureBudgets(dirname(absolutePath), label);
}

function assetLabel(asset, index) {
  return isObject(asset) && typeof asset.id === "string" && asset.id.trim().length > 0
    ? `asset "${asset.id}"`
    : `asset[${index}]`;
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateAssetFolderBudget(assetDir, label) {
  const totalBytes = sumFileBytes(assetDir);
  if (totalBytes > ASSET_FOLDER_WARN_BYTES) {
    warnings.push(`${label}: asset folder exceeds 20 MB (${formatBytes(totalBytes)}).`);
  }
}

function validateTextureBudgets(assetDir, label) {
  for (const file of listFiles(assetDir)) {
    const extension = extname(file).toLowerCase();
    if (extension !== ".png") {
      continue;
    }
    const dimensions = readPngDimensions(file);
    if (dimensions === undefined) {
      continue;
    }
    if (dimensions.width > TEXTURE_MAX_DIMENSION || dimensions.height > TEXTURE_MAX_DIMENSION) {
      warnings.push(
        `${label}: texture exceeds 2048px (${dimensions.width}x${dimensions.height}) at ${relative(process.cwd(), file).replaceAll("\\", "/")}.`
      );
    }
  }
}

function sumFileBytes(dir) {
  return listFiles(dir).reduce((sum, file) => sum + statSync(file).size, 0);
}

function listFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(dir, entry.name);
    if (entry.isDirectory()) {
      return listFiles(absolutePath);
    }
    return entry.isFile() ? [absolutePath] : [];
  });
}

function readPngDimensions(file) {
  const bytes = readFileSync(file);
  if (bytes.length < 24 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    return undefined;
  }
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20)
  };
}

function formatBytes(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
