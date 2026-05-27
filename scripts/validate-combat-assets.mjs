#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const PROJECT_ROOT = process.cwd();
const ALLOWED_LICENSES = new Set(["CC0", "Public Domain", "CC-BY", "MIT", "Internal Placeholder", "Custom Permissive"]);
const AUDIO_INTAKE_LICENSES = new Set(["CC0", "Public Domain"]);
const AUDIO_EXTENSIONS = new Set([".ogg", ".wav", ".mp3"]);
const MAX_AUDIO_FILE_BYTES = 20 * 1024 * 1024;

const MANIFESTS = [
  {
    kind: "2D",
    path: join(PROJECT_ROOT, "public", "assets", "2d", "manifest.v0.1.json"),
    namespace: "assets.2d.combat",
    root: "/assets/2d/",
    publicRoot: join(PROJECT_ROOT, "public", "assets", "2d"),
    pathPrefix: "/assets/2d/",
    allowedLicenses: ALLOWED_LICENSES,
    requiredFields: ["path", "type", "category", "sourceName", "sourceUrl", "author", "license", "attributionRequired", "required", "notes"]
  },
  {
    kind: "Audio",
    path: join(PROJECT_ROOT, "public", "assets", "audio", "manifest.v0.1.json"),
    namespace: "assets.audio.combat",
    root: "/assets/audio/",
    publicRoot: join(PROJECT_ROOT, "public", "assets", "audio"),
    pathPrefix: "/assets/audio/",
    allowedLicenses: AUDIO_INTAKE_LICENSES,
    allowedExtensions: AUDIO_EXTENSIONS,
    maxFileBytes: MAX_AUDIO_FILE_BYTES,
    requiredFields: [
      "path",
      "category",
      "mixGroup",
      "sourceName",
      "sourceUrl",
      "author",
      "license",
      "attributionRequired",
      "durationMs",
      "volume",
      "cooldownMs",
      "maxInstances",
      "required",
      "notes"
    ]
  }
];

const errors = [];

main();

function main() {
  const counts = new Map();

  for (const config of MANIFESTS) {
    const manifest = readManifest(config);
    const assets = validateTopLevel(manifest, config) ? manifest.assets : {};
    const count = validateAssets(assets, config);
    counts.set(config.kind, count);
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`ERROR ${error}`);
    }
    process.exit(1);
  }

  console.log("Combat asset manifests OK");
  for (const config of MANIFESTS) {
    console.log(`${config.kind} manifest: ${toProjectPath(config.path)}`);
    console.log(`${config.kind} assets: ${counts.get(config.kind) ?? 0}`);
  }
}

function readManifest(config) {
  if (!existsSync(config.path)) {
    errors.push(`${config.kind} manifest not found: ${toProjectPath(config.path)}`);
    return {};
  }

  try {
    return JSON.parse(readFileSync(config.path, "utf8"));
  } catch (error) {
    errors.push(`${config.kind} manifest JSON parse failed: ${error instanceof Error ? error.message : String(error)}`);
    return {};
  }
}

function validateTopLevel(manifest, config) {
  if (!isPlainObject(manifest)) {
    errors.push(`${config.kind} manifest must be a JSON object.`);
    return false;
  }
  if (manifest.version !== "0.1") {
    errors.push(`${config.kind} manifest version must be "0.1".`);
  }
  if (manifest.namespace !== config.namespace) {
    errors.push(`${config.kind} manifest namespace must be "${config.namespace}".`);
  }
  if (manifest.root !== config.root) {
    errors.push(`${config.kind} manifest root must be "${config.root}".`);
  }
  if (!isPlainObject(manifest.assets)) {
    errors.push(`${config.kind} manifest assets must be an object map.`);
    return false;
  }
  return true;
}

function validateAssets(assets, config) {
  let count = 0;

  for (const [id, asset] of Object.entries(assets)) {
    count += 1;
    validateAsset(id, asset, config);
  }

  return count;
}

function validateAsset(id, asset, config) {
  const label = `${config.kind} asset "${id}"`;
  if (!isPlainObject(asset)) {
    errors.push(`${label}: entry must be a JSON object.`);
    return;
  }

  for (const field of config.requiredFields) {
    if (!Object.hasOwn(asset, field)) {
      errors.push(`${label}: missing required field "${field}".`);
    }
  }

  if (Object.hasOwn(asset, "id") && asset.id !== id) {
    errors.push(`${label}: optional id field must match the manifest key.`);
  }

  validateRequiredString(asset.path, `${label}: path`);
  validateRequiredString(asset.sourceName, `${label}: sourceName`);
  validateRequiredString(asset.author, `${label}: author`);
  validateString(asset.notes, `${label}: notes`);
  validateLicense(asset.license, label, config.allowedLicenses ?? ALLOWED_LICENSES);
  validateSourceUrl(asset.sourceUrl, label);
  validateBoolean(asset.attributionRequired, `${label}: attributionRequired`);
  validateBoolean(asset.required, `${label}: required`);
  if (Object.hasOwn(asset, "planned")) {
    validateBoolean(asset.planned, `${label}: planned`);
  }
  validateLocalPath(asset, label, config);

  if (config.kind === "2D") {
    validate2dAsset(asset, label);
  }
  if (config.kind === "Audio") {
    validateAudioAsset(asset, label);
  }
}

function validate2dAsset(asset, label) {
  validateRequiredString(asset.type, `${label}: type`);
  validateRequiredString(asset.category, `${label}: category`);

  if (asset.type !== "spriteSheet") {
    return;
  }

  for (const field of ["frameWidth", "frameHeight", "frameCount", "fps"]) {
    if (!Object.hasOwn(asset, field)) {
      errors.push(`${label}: spriteSheet missing ${field}.`);
      continue;
    }
    validatePositiveNumber(asset[field], `${label}: ${field}`);
  }

  if (Object.hasOwn(asset, "animationClips")) {
    validateAnimationClips(asset.animationClips, label);
  }
}

function validateAnimationClips(animationClips, label) {
  if (!isPlainObject(animationClips)) {
    errors.push(`${label}: animationClips must be an object map.`);
    return;
  }
  for (const [clipName, clip] of Object.entries(animationClips)) {
    const clipLabel = `${label}: animationClips.${clipName}`;
    if (!isPlainObject(clip)) {
      errors.push(`${clipLabel} must be a JSON object.`);
      continue;
    }
    for (const field of ["startFrame", "frameCount", "fps", "loop"]) {
      if (!Object.hasOwn(clip, field)) {
        errors.push(`${clipLabel} missing ${field}.`);
      }
    }
    if (Object.hasOwn(clip, "startFrame")) {
      validateNonNegativeNumber(clip.startFrame, `${clipLabel}: startFrame`);
    }
    if (Object.hasOwn(clip, "frameCount")) {
      validatePositiveNumber(clip.frameCount, `${clipLabel}: frameCount`);
    }
    if (Object.hasOwn(clip, "fps")) {
      validatePositiveNumber(clip.fps, `${clipLabel}: fps`);
    }
    if (Object.hasOwn(clip, "loop")) {
      validateBoolean(clip.loop, `${clipLabel}: loop`);
    }
  }
}

function validateAudioAsset(asset, label) {
  validateRequiredString(asset.category, `${label}: category`);

  if (!Object.hasOwn(asset, "mixGroup")) {
    errors.push(`${label}: audio asset missing mixGroup.`);
  } else {
    validateRequiredString(asset.mixGroup, `${label}: mixGroup`);
  }

  for (const field of ["volume", "cooldownMs", "maxInstances"]) {
    if (!Object.hasOwn(asset, field)) {
      errors.push(`${label}: audio asset missing ${field}.`);
      continue;
    }
    validateFiniteNumber(asset[field], `${label}: ${field}`);
  }

  if (!Object.hasOwn(asset, "durationMs")) {
    errors.push(`${label}: audio asset missing durationMs.`);
  } else {
    validatePositiveNumber(asset.durationMs, `${label}: durationMs`);
  }

  if ((asset.license === "CC0" || asset.license === "Public Domain") && asset.attributionRequired !== false) {
    errors.push(`${label}: CC0/Public Domain audio assets must set attributionRequired to false.`);
  }
}

function validateLicense(license, label, allowedLicenses) {
  if (typeof license !== "string" || license.trim().length === 0) {
    errors.push(`${label}: license is required.`);
    return;
  }
  if (!allowedLicenses.has(license)) {
    errors.push(`${label}: license "${license}" is not allowed.`);
  }
  if (license === "CC-BY") {
    return;
  }
}

function validateSourceUrl(sourceUrl, label) {
  if (typeof sourceUrl !== "string" || sourceUrl.trim().length === 0) {
    errors.push(`${label}: sourceUrl is required.`);
    return;
  }
  if (/^https?:\/\//i.test(sourceUrl) || sourceUrl.startsWith("internal://")) {
    return;
  }
  errors.push(`${label}: sourceUrl must be an https:// URL or internal:// placeholder URI.`);
}

function validateLocalPath(asset, label, config) {
  const assetPath = typeof asset.path === "string" ? asset.path.trim() : "";
  if (assetPath.length === 0) {
    return;
  }
  if (/^https?:\/\//i.test(assetPath)) {
    errors.push(`${label}: path must be a local public asset path, not a URL.`);
    return;
  }
  if (!assetPath.startsWith(config.pathPrefix)) {
    errors.push(`${label}: path must start with ${config.pathPrefix}.`);
    return;
  }
  if (config.allowedExtensions && !config.allowedExtensions.has(extname(assetPath).toLowerCase())) {
    errors.push(`${label}: path must use one of ${Array.from(config.allowedExtensions).join(", ")}.`);
  }

  const absolutePath = resolve(PROJECT_ROOT, "public", assetPath.replace(/^\//, ""));
  const relativeToRoot = relative(config.publicRoot, absolutePath);
  if (relativeToRoot === "" || relativeToRoot.startsWith("..")) {
    errors.push(`${label}: path must stay inside ${config.pathPrefix}.`);
    return;
  }

  if (asset.required === true && !existsSync(absolutePath)) {
    errors.push(`${label}: required asset file is missing at ${assetPath}.`);
  }
  if (existsSync(absolutePath) && typeof config.maxFileBytes === "number" && statSync(absolutePath).size > config.maxFileBytes) {
    errors.push(`${label}: asset file must be ${config.maxFileBytes} bytes or smaller.`);
  }
}

function validateRequiredString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${label} must be a non-empty string.`);
  }
}

function validateString(value, label) {
  if (typeof value !== "string") {
    errors.push(`${label} must be a string.`);
  }
}

function validateBoolean(value, label) {
  if (typeof value !== "boolean") {
    errors.push(`${label} must be a boolean.`);
  }
}

function validatePositiveNumber(value, label) {
  validateFiniteNumber(value, label);
  if (typeof value === "number" && Number.isFinite(value) && value <= 0) {
    errors.push(`${label} must be greater than 0.`);
  }
}

function validateNonNegativeNumber(value, label) {
  validateFiniteNumber(value, label);
  if (typeof value === "number" && Number.isFinite(value) && value < 0) {
    errors.push(`${label} must be greater than or equal to 0.`);
  }
}

function validateFiniteNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`${label} must be a finite number.`);
  }
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toProjectPath(filePath) {
  return relative(PROJECT_ROOT, filePath).replaceAll("\\", "/");
}
