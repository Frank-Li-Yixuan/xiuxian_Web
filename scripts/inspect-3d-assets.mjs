#!/usr/bin/env node
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

const PROJECT_ROOT = process.cwd();
const MANIFEST_PATH = join(PROJECT_ROOT, "public", "assets", "3d", "manifest.v0.1.json");
const REPORT_PATH = join(PROJECT_ROOT, "public", "assets", "3d", "asset_inspection_report.v0.1.json");
const PUBLIC_ROOT = join(PROJECT_ROOT, "public");
const PUBLIC_3D_ROOT = join(PUBLIC_ROOT, "assets", "3d");
const REPORT_NAMESPACE = "assets.3d.combat.inspection";
const GLB_MAGIC = "glTF";
const GLB_VERSION = 2;
const GLB_JSON_CHUNK = 0x4e4f534a;
const SUPPORTED_FORMATS = new Set([".glb", ".gltf"]);
const TINY_MAX_DIMENSION = 0.01;
const HUGE_MAX_DIMENSION = 100;

const TARGET_MAX_DIMENSION_BY_CATEGORY = {
  player: 1.8,
  enemy: 1.8,
  boss: 3,
  artifact: 1,
  pickup: 1,
  environment: 1
};

const ANCHOR_BY_CATEGORY = {
  player: "base",
  enemy: "base",
  artifact: "center",
  pickup: "center",
  boss: "center",
  environment: "custom"
};

main();

function main() {
  try {
    const manifest = readManifest();
    const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
    const reports = assets.map((asset, index) => inspectAsset(asset, index));
    const summary = summarizeReports(reports);
    const report = {
      version: "0.1",
      namespace: REPORT_NAMESPACE,
      generatedAt: new Date().toISOString(),
      manifestPath: relative(PROJECT_ROOT, MANIFEST_PATH).replaceAll("\\", "/"),
      summary,
      assets: reports
    };

    writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    printSummary(report);
  } catch (error) {
    console.error(`ERROR ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

function readManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(`Manifest not found: ${MANIFEST_PATH}`);
  }
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
}

function inspectAsset(asset, index) {
  const id = typeof asset?.id === "string" && asset.id.length > 0 ? asset.id : `asset[${index}]`;
  const category = typeof asset?.category === "string" ? asset.category : "unknown";
  const format = typeof asset?.format === "string" ? asset.format.toLowerCase() : "";
  const pipelineStatus = typeof asset?.pipelineStatus === "string" ? asset.pipelineStatus : "";
  const warnings = [];
  const errors = [];
  const externalTextures = [];
  const missingExternalTextures = [];
  const externalBuffers = [];
  const missingExternalBuffers = [];
  const publicPath = typeof asset?.path === "string" ? asset.path : "";
  const absolutePath = resolvePublicPath(publicPath, errors);
  const fileExists = absolutePath !== undefined && existsSync(absolutePath);

  const report = {
    id,
    displayName: typeof asset?.displayName === "string" ? asset.displayName : "",
    category,
    path: publicPath,
    format,
    pipelineStatus,
    planned: asset?.planned === true,
    skipped: false,
    fileExists,
    fileSizeBytes: fileExists && absolutePath !== undefined ? statSync(absolutePath).size : 0,
    nodeCount: 0,
    meshCount: 0,
    visibleMeshNodeCount: 0,
    textureCount: 0,
    externalTextures,
    missingExternalTextures,
    externalBuffers,
    missingExternalBuffers,
    animations: [],
    boundingBox: unavailableBoundingBox(),
    normalization: defaultNormalization(category, false, "not inspected"),
    warnings,
    errors
  };

  if (report.planned) {
    report.skipped = true;
    report.normalization = defaultNormalization(category, false, "planned asset not downloaded");
    return report;
  }

  if (absolutePath === undefined) {
    report.normalization = defaultNormalization(category, false, "invalid local path");
    return report;
  }

  if (!fileExists) {
    errors.push("local asset file is missing");
    report.normalization = defaultNormalization(category, false, "file missing");
    return report;
  }

  const extension = extname(absolutePath).toLowerCase();
  if (!SUPPORTED_FORMATS.has(extension)) {
    warnings.push(`unsupported runtime inspection format: ${extension || "unknown"}`);
    report.normalization = defaultNormalization(category, false, "unsupported format");
    return report;
  }

  let parsed;
  try {
    parsed = readGltfOrGlb(absolutePath);
  } catch (error) {
    errors.push(`parse failed: ${error instanceof Error ? error.message : String(error)}`);
    report.normalization = defaultNormalization(category, false, "parse failed");
    return report;
  }

  const gltf = parsed.gltf;
  const assetDir = dirname(absolutePath);
  const nodes = Array.isArray(gltf.nodes) ? gltf.nodes : [];
  const meshes = Array.isArray(gltf.meshes) ? gltf.meshes : [];
  const images = Array.isArray(gltf.images) ? gltf.images : [];
  const textures = Array.isArray(gltf.textures) ? gltf.textures : images;
  const animations = Array.isArray(gltf.animations) ? gltf.animations : [];

  report.nodeCount = nodes.length;
  report.meshCount = meshes.length;
  report.textureCount = textures.length;
  report.animations = animations.map((animation, animationIndex) => ({
    index: animationIndex,
    name: typeof animation?.name === "string" && animation.name.length > 0 ? animation.name : `animation_${animationIndex}`
  }));

  collectExternalReferences(gltf, assetDir, externalTextures, missingExternalTextures, externalBuffers, missingExternalBuffers);

  const meshInspection = inspectSceneMeshes(gltf);
  report.visibleMeshNodeCount = meshInspection.visibleMeshNodeCount;
  report.boundingBox = meshInspection.boundingBox;
  warnings.push(...meshInspection.warnings);

  if (missingExternalTextures.length > 0) {
    warnings.push(`missing external texture references: ${missingExternalTextures.join(", ")}`);
  }
  if (missingExternalBuffers.length > 0) {
    warnings.push(`missing external buffer references: ${missingExternalBuffers.join(", ")}`);
  }

  const reasons = [];
  if (report.visibleMeshNodeCount === 0) {
    warnings.push("model has no visible mesh");
    reasons.push("no visible mesh");
  }
  if (!report.boundingBox.available) {
    reasons.push("missing bounding box");
  } else {
    const maxDimension = report.boundingBox.maxDimension;
    if (maxDimension < TINY_MAX_DIMENSION) {
      warnings.push(`bounding box is extremely tiny (max dimension ${roundNumber(maxDimension)})`);
      reasons.push("extremely tiny bounding box");
    }
    if (maxDimension > HUGE_MAX_DIMENSION) {
      warnings.push(`bounding box is extremely large (max dimension ${roundNumber(maxDimension)})`);
      reasons.push("extremely large bounding box");
    }
  }
  if (missingExternalTextures.length > 0 || missingExternalBuffers.length > 0) {
    reasons.push("missing external references");
  }
  if (errors.length > 0) {
    reasons.push("inspection errors");
  }

  report.normalization = makeNormalization(category, report.boundingBox, reasons);
  return report;
}

function resolvePublicPath(publicPath, errors) {
  if (typeof publicPath !== "string" || publicPath.length === 0) {
    errors.push("asset path is missing");
    return undefined;
  }
  if (/^https?:\/\//i.test(publicPath)) {
    errors.push("asset path must be local, not a URL");
    return undefined;
  }
  if (!publicPath.startsWith("/assets/3d/")) {
    errors.push("asset path must start with /assets/3d/");
    return undefined;
  }
  const absolutePath = resolve(PUBLIC_ROOT, publicPath.replace(/^\//, ""));
  const relativeTo3dRoot = relative(PUBLIC_3D_ROOT, absolutePath);
  if (relativeTo3dRoot.startsWith("..") || relativeTo3dRoot === "") {
    errors.push("asset path must stay inside public/assets/3d");
    return undefined;
  }
  return absolutePath;
}

function readGltfOrGlb(filePath) {
  const extension = extname(filePath).toLowerCase();
  if (extension === ".gltf") {
    return { gltf: JSON.parse(readFileSync(filePath, "utf8")), binChunk: undefined };
  }
  const bytes = readFileSync(filePath);
  if (bytes.length < 20) {
    throw new Error("GLB file is too short");
  }
  if (bytes.subarray(0, 4).toString("ascii") !== GLB_MAGIC) {
    throw new Error("invalid GLB magic");
  }
  const version = bytes.readUInt32LE(4);
  if (version !== GLB_VERSION) {
    throw new Error(`unsupported GLB version ${version}`);
  }
  const declaredLength = bytes.readUInt32LE(8);
  if (declaredLength > bytes.length) {
    throw new Error("GLB declared length exceeds file size");
  }

  let jsonChunk;
  let binChunk;
  let offset = 12;
  while (offset + 8 <= declaredLength) {
    const chunkLength = bytes.readUInt32LE(offset);
    const chunkType = bytes.readUInt32LE(offset + 4);
    offset += 8;
    const chunkEnd = offset + chunkLength;
    if (chunkEnd > bytes.length) {
      throw new Error("GLB chunk length exceeds file size");
    }
    const chunk = bytes.subarray(offset, chunkEnd);
    if (chunkType === GLB_JSON_CHUNK) {
      jsonChunk = chunk;
    } else if (chunkType === 0x004e4942) {
      binChunk = chunk;
    }
    offset = chunkEnd;
  }
  if (jsonChunk === undefined) {
    throw new Error("GLB JSON chunk is missing");
  }
  return { gltf: JSON.parse(jsonChunk.toString("utf8").trim()), binChunk };
}

function collectExternalReferences(gltf, assetDir, externalTextures, missingExternalTextures, externalBuffers, missingExternalBuffers) {
  const images = Array.isArray(gltf.images) ? gltf.images : [];
  for (const image of images) {
    if (typeof image?.uri !== "string" || image.uri.length === 0 || isDataUri(image.uri)) {
      continue;
    }
    externalTextures.push(image.uri);
    if (!existsSync(resolve(assetDir, image.uri))) {
      missingExternalTextures.push(image.uri);
    }
  }

  const buffers = Array.isArray(gltf.buffers) ? gltf.buffers : [];
  for (const buffer of buffers) {
    if (typeof buffer?.uri !== "string" || buffer.uri.length === 0 || isDataUri(buffer.uri)) {
      continue;
    }
    externalBuffers.push(buffer.uri);
    if (!existsSync(resolve(assetDir, buffer.uri))) {
      missingExternalBuffers.push(buffer.uri);
    }
  }
}

function inspectSceneMeshes(gltf) {
  const nodes = Array.isArray(gltf.nodes) ? gltf.nodes : [];
  const meshes = Array.isArray(gltf.meshes) ? gltf.meshes : [];
  const accessors = Array.isArray(gltf.accessors) ? gltf.accessors : [];
  const warnings = [];
  const rootNodes = getSceneRootNodes(gltf, nodes);
  let visibleMeshNodeCount = 0;
  let bounds;
  let meshPrimitivePositionCount = 0;
  let boundedPrimitiveCount = 0;

  const visited = new Set();
  for (const rootNodeIndex of rootNodes) {
    traverseNode(rootNodeIndex, identityMatrix(), (node, worldMatrix) => {
      if (!Number.isInteger(node?.mesh)) {
        return;
      }
      const mesh = meshes[node.mesh];
      if (!mesh || !Array.isArray(mesh.primitives)) {
        return;
      }
      let nodeHasVisibleMesh = false;
      for (const primitive of mesh.primitives) {
        const positionAccessorIndex = primitive?.attributes?.POSITION;
        if (!Number.isInteger(positionAccessorIndex)) {
          continue;
        }
        meshPrimitivePositionCount += 1;
        nodeHasVisibleMesh = true;
        const accessor = accessors[positionAccessorIndex];
        if (!hasAccessorBounds(accessor)) {
          continue;
        }
        boundedPrimitiveCount += 1;
        bounds = unionBounds(bounds, transformAccessorBounds(accessor.min, accessor.max, worldMatrix));
      }
      if (nodeHasVisibleMesh) {
        visibleMeshNodeCount += 1;
      }
    });
  }

  if (meshPrimitivePositionCount > 0 && boundedPrimitiveCount === 0) {
    warnings.push("model has mesh primitives but no POSITION accessor bounds");
  } else if (meshPrimitivePositionCount > boundedPrimitiveCount) {
    warnings.push("some mesh primitives are missing POSITION accessor bounds");
  }

  return {
    visibleMeshNodeCount,
    boundingBox: bounds === undefined ? unavailableBoundingBox() : makeBoundingBox(bounds),
    warnings
  };

  function traverseNode(nodeIndex, parentMatrix, visit) {
    if (!Number.isInteger(nodeIndex) || nodeIndex < 0 || nodeIndex >= nodes.length) {
      return;
    }
    const visitKey = `${nodeIndex}:${parentMatrix.join(",")}`;
    if (visited.has(visitKey)) {
      return;
    }
    visited.add(visitKey);
    const node = nodes[nodeIndex];
    const worldMatrix = multiplyMatrices(parentMatrix, localMatrixForNode(node));
    visit(node, worldMatrix);
    if (!Array.isArray(node?.children)) {
      return;
    }
    for (const childIndex of node.children) {
      traverseNode(childIndex, worldMatrix, visit);
    }
  }
}

function getSceneRootNodes(gltf, nodes) {
  const scenes = Array.isArray(gltf.scenes) ? gltf.scenes : [];
  const sceneIndex = Number.isInteger(gltf.scene) ? gltf.scene : 0;
  const scene = scenes[sceneIndex] ?? scenes[0];
  if (scene && Array.isArray(scene.nodes) && scene.nodes.length > 0) {
    return scene.nodes.filter(Number.isInteger);
  }
  return nodes.map((_, index) => index);
}

function hasAccessorBounds(accessor) {
  return Array.isArray(accessor?.min) && Array.isArray(accessor?.max) && accessor.min.length >= 3 && accessor.max.length >= 3;
}

function transformAccessorBounds(min, max, matrix) {
  const corners = [
    [min[0], min[1], min[2]],
    [min[0], min[1], max[2]],
    [min[0], max[1], min[2]],
    [min[0], max[1], max[2]],
    [max[0], min[1], min[2]],
    [max[0], min[1], max[2]],
    [max[0], max[1], min[2]],
    [max[0], max[1], max[2]]
  ];
  return corners.reduce((bounds, corner) => unionPoint(bounds, transformPoint(matrix, corner)), undefined);
}

function makeBoundingBox(bounds) {
  const min = roundVector(bounds.min);
  const max = roundVector(bounds.max);
  const size = roundVector({
    x: bounds.max.x - bounds.min.x,
    y: bounds.max.y - bounds.min.y,
    z: bounds.max.z - bounds.min.z
  });
  return {
    available: true,
    min,
    max,
    size,
    maxDimension: roundNumber(Math.max(size.x, size.y, size.z))
  };
}

function unavailableBoundingBox() {
  return {
    available: false,
    min: null,
    max: null,
    size: null,
    maxDimension: null
  };
}

function makeNormalization(category, boundingBox, reasons) {
  const runtimeReady = reasons.length === 0;
  const recommendedScale = recommendedScaleForCategory(category, boundingBox);
  return {
    recommendedScale,
    recommendedRotation: { xDeg: 0, yDeg: 0, zDeg: 0 },
    anchor: ANCHOR_BY_CATEGORY[category] ?? "custom",
    runtimeReady,
    reason: runtimeReady ? "" : reasons.join("; ")
  };
}

function defaultNormalization(category, runtimeReady, reason) {
  return {
    recommendedScale: { x: 1, y: 1, z: 1 },
    recommendedRotation: { xDeg: 0, yDeg: 0, zDeg: 0 },
    anchor: ANCHOR_BY_CATEGORY[category] ?? "custom",
    runtimeReady,
    reason
  };
}

function recommendedScaleForCategory(category, boundingBox) {
  if (!boundingBox.available || typeof boundingBox.maxDimension !== "number" || boundingBox.maxDimension <= 0) {
    return { x: 1, y: 1, z: 1 };
  }
  const target = TARGET_MAX_DIMENSION_BY_CATEGORY[category] ?? 1;
  const scale = roundNumber(target / boundingBox.maxDimension, 4);
  const normalizedScale = Math.abs(scale - 1) <= 0.05 ? 1 : scale;
  return { x: normalizedScale, y: normalizedScale, z: normalizedScale };
}

function summarizeReports(reports) {
  return {
    total: reports.length,
    inspected: reports.filter((report) => !report.skipped && report.fileExists).length,
    planned: reports.filter((report) => report.planned).length,
    runtimeReady: reports.filter((report) => report.normalization.runtimeReady).length,
    needsCleanup: reports.filter((report) => !report.skipped && !report.normalization.runtimeReady).length,
    warnings: reports.reduce((sum, report) => sum + report.warnings.length, 0),
    errors: reports.reduce((sum, report) => sum + report.errors.length, 0),
    byCategory: reports.reduce((counts, report) => {
      counts[report.category] = (counts[report.category] ?? 0) + 1;
      return counts;
    }, {})
  };
}

function printSummary(report) {
  console.log("3D asset inspection complete");
  console.log(`Report: ${relative(PROJECT_ROOT, REPORT_PATH).replaceAll("\\", "/")}`);
  console.log(`Assets: ${report.summary.total}`);
  console.log(`Inspected: ${report.summary.inspected}`);
  console.log(`Runtime ready: ${report.summary.runtimeReady}`);
  console.log(`Needs cleanup: ${report.summary.needsCleanup}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Errors: ${report.summary.errors}`);

  for (const asset of report.assets) {
    for (const warning of asset.warnings) {
      console.warn(`WARN ${asset.id}: ${warning}`);
    }
    for (const error of asset.errors) {
      console.error(`ERROR ${asset.id}: ${error}`);
    }
  }
}

function isDataUri(uri) {
  return /^data:/i.test(uri);
}

function localMatrixForNode(node) {
  if (Array.isArray(node?.matrix) && node.matrix.length === 16) {
    return node.matrix.map((value) => (Number.isFinite(value) ? value : 0));
  }

  const translation = arrayOrDefault(node?.translation, [0, 0, 0]);
  const rotation = arrayOrDefault(node?.rotation, [0, 0, 0, 1]);
  const scale = arrayOrDefault(node?.scale, [1, 1, 1]);
  return composeMatrix(translation, rotation, scale);
}

function arrayOrDefault(value, fallback) {
  if (!Array.isArray(value) || value.length < fallback.length) {
    return fallback;
  }
  return fallback.map((_, index) => (Number.isFinite(value[index]) ? value[index] : fallback[index]));
}

function identityMatrix() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function composeMatrix(translation, rotation, scale) {
  const [x, y, z, w] = rotation;
  const [sx, sy, sz] = scale;
  const x2 = x + x;
  const y2 = y + y;
  const z2 = z + z;
  const xx = x * x2;
  const xy = x * y2;
  const xz = x * z2;
  const yy = y * y2;
  const yz = y * z2;
  const zz = z * z2;
  const wx = w * x2;
  const wy = w * y2;
  const wz = w * z2;

  return [
    (1 - (yy + zz)) * sx,
    (xy + wz) * sx,
    (xz - wy) * sx,
    0,
    (xy - wz) * sy,
    (1 - (xx + zz)) * sy,
    (yz + wx) * sy,
    0,
    (xz + wy) * sz,
    (yz - wx) * sz,
    (1 - (xx + yy)) * sz,
    0,
    translation[0],
    translation[1],
    translation[2],
    1
  ];
}

function multiplyMatrices(a, b) {
  const out = new Array(16).fill(0);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      out[column * 4 + row] =
        a[0 * 4 + row] * b[column * 4 + 0] +
        a[1 * 4 + row] * b[column * 4 + 1] +
        a[2 * 4 + row] * b[column * 4 + 2] +
        a[3 * 4 + row] * b[column * 4 + 3];
    }
  }
  return out;
}

function transformPoint(matrix, point) {
  const [x, y, z] = point;
  return {
    x: matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    y: matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    z: matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]
  };
}

function unionPoint(bounds, point) {
  if (bounds === undefined) {
    return {
      min: { x: point.x, y: point.y, z: point.z },
      max: { x: point.x, y: point.y, z: point.z }
    };
  }
  return {
    min: {
      x: Math.min(bounds.min.x, point.x),
      y: Math.min(bounds.min.y, point.y),
      z: Math.min(bounds.min.z, point.z)
    },
    max: {
      x: Math.max(bounds.max.x, point.x),
      y: Math.max(bounds.max.y, point.y),
      z: Math.max(bounds.max.z, point.z)
    }
  };
}

function unionBounds(left, right) {
  if (left === undefined) {
    return right;
  }
  return {
    min: {
      x: Math.min(left.min.x, right.min.x),
      y: Math.min(left.min.y, right.min.y),
      z: Math.min(left.min.z, right.min.z)
    },
    max: {
      x: Math.max(left.max.x, right.max.x),
      y: Math.max(left.max.y, right.max.y),
      z: Math.max(left.max.z, right.max.z)
    }
  };
}

function roundVector(vector) {
  return {
    x: roundNumber(vector.x),
    y: roundNumber(vector.y),
    z: roundNumber(vector.z)
  };
}

function roundNumber(value, digits = 6) {
  if (!Number.isFinite(value)) {
    return value;
  }
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
