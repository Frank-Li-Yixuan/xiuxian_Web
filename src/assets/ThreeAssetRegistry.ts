export type ThreeAssetCategory = "player" | "artifact" | "enemy" | "pickup" | "boss" | "environment";
export type ThreeAssetPipelineStatus = "runtime_ready" | "needs_conversion" | "planned";
export type ThreeAssetAnchorRecommendation = "center" | "base" | "custom";

export interface ThreeAssetVector {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface ThreeAssetRotation {
  readonly xDeg: number;
  readonly yDeg: number;
  readonly zDeg: number;
}

export interface ThreeAssetManifestEntry {
  readonly id: string;
  readonly displayName: string;
  readonly category: ThreeAssetCategory;
  readonly path: string;
  readonly format: string;
  readonly sourceName: string;
  readonly sourceUrl: string;
  readonly author: string;
  readonly license: string;
  readonly attributionRequired: boolean;
  readonly downloadDate: string;
  readonly originalFileName: string;
  readonly scale: ThreeAssetVector;
  readonly rotation: ThreeAssetRotation;
  readonly anchor: ThreeAssetVector;
  readonly gameplayRole: string;
  readonly required: boolean;
  readonly fallbackPrimitive: string;
  readonly notes: string;
  readonly planned?: boolean;
  readonly pipelineStatus?: ThreeAssetPipelineStatus;
}

export interface ThreeAssetManifest {
  readonly version: "0.1";
  readonly namespace: "assets.3d.combat";
  readonly root: "/assets/3d/";
  readonly assets: readonly ThreeAssetManifestEntry[];
}

export interface ThreeAssetBoundingBox {
  readonly available: boolean;
  readonly min: ThreeAssetVector | null;
  readonly max: ThreeAssetVector | null;
  readonly size: ThreeAssetVector | null;
  readonly maxDimension: number | null;
}

export interface ThreeAssetAnimationClip {
  readonly index: number;
  readonly name: string;
}

export interface ThreeAssetInspectionAsset {
  readonly id: string;
  readonly displayName: string;
  readonly category: ThreeAssetCategory;
  readonly path: string;
  readonly format: string;
  readonly pipelineStatus: string;
  readonly planned: boolean;
  readonly skipped: boolean;
  readonly fileExists: boolean;
  readonly fileSizeBytes: number;
  readonly nodeCount: number;
  readonly meshCount: number;
  readonly visibleMeshNodeCount: number;
  readonly textureCount: number;
  readonly externalTextures: readonly string[];
  readonly missingExternalTextures: readonly string[];
  readonly externalBuffers: readonly string[];
  readonly missingExternalBuffers: readonly string[];
  readonly animations: readonly ThreeAssetAnimationClip[];
  readonly boundingBox: ThreeAssetBoundingBox;
  readonly normalization: {
    readonly recommendedScale: ThreeAssetVector;
    readonly recommendedRotation: ThreeAssetRotation;
    readonly anchor: ThreeAssetAnchorRecommendation;
    readonly runtimeReady: boolean;
    readonly reason: string;
  };
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
}

export interface ThreeAssetInspectionReport {
  readonly version: "0.1";
  readonly namespace: "assets.3d.combat.inspection";
  readonly generatedAt: string;
  readonly manifestPath: string;
  readonly summary: {
    readonly total: number;
    readonly inspected: number;
    readonly planned: number;
    readonly runtimeReady: number;
    readonly needsCleanup: number;
    readonly warnings: number;
    readonly errors: number;
    readonly byCategory: Readonly<Record<string, number>>;
  };
  readonly assets: readonly ThreeAssetInspectionAsset[];
}

export interface ThreeAssetPreviewEntry extends ThreeAssetManifestEntry {
  readonly inspection: ThreeAssetInspectionAsset | undefined;
  readonly fileExists: boolean | undefined;
  readonly fileSizeBytes: number | undefined;
  readonly runtimeReady: boolean;
  readonly runtimeReason: string;
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
  readonly animations: readonly string[];
  readonly boundingBox: ThreeAssetBoundingBox | undefined;
}

const CATEGORY_ORDER: readonly ThreeAssetCategory[] = ["player", "artifact", "enemy", "pickup", "boss", "environment"];
const RUNTIME_FORMATS = new Set(["glb", "gltf"]);
export const THREE_ASSET_MANIFEST_URL = "/assets/3d/manifest.v0.1.json";
export const THREE_ASSET_INSPECTION_REPORT_URL = "/assets/3d/asset_inspection_report.v0.1.json";

export class ThreeAssetRegistry {
  private readonly entries: ReadonlyMap<string, ThreeAssetPreviewEntry>;
  private readonly sortedEntries: readonly ThreeAssetPreviewEntry[];

  public constructor(
    public readonly manifest: ThreeAssetManifest,
    public readonly inspectionReport?: ThreeAssetInspectionReport
  ) {
    validateManifest(manifest);
    if (inspectionReport !== undefined) {
      validateInspectionReport(inspectionReport);
    }

    const inspectionById = new Map((inspectionReport?.assets ?? []).map((asset) => [asset.id, asset]));
    const entries = manifest.assets.map((asset) => mergeAsset(asset, inspectionById.get(asset.id)));
    this.sortedEntries = Object.freeze([...entries].sort(compareAssets));
    this.entries = new Map(entries.map((entry) => [entry.id, entry]));
  }

  public all(): readonly ThreeAssetPreviewEntry[] {
    return this.sortedEntries;
  }

  public get(assetId: string): ThreeAssetPreviewEntry {
    const entry = this.entries.get(assetId);
    if (entry === undefined) {
      throw new Error(`Unknown 3D asset id: ${assetId}`);
    }
    return entry;
  }

  public has(assetId: string): boolean {
    return this.entries.has(assetId);
  }
}

export async function loadThreeAssetRegistry(
  manifestUrl = THREE_ASSET_MANIFEST_URL,
  inspectionReportUrl = THREE_ASSET_INSPECTION_REPORT_URL
): Promise<ThreeAssetRegistry> {
  const manifest = await fetchJson<ThreeAssetManifest>(manifestUrl, true);
  const inspectionReport = await fetchJson<ThreeAssetInspectionReport>(inspectionReportUrl, false);
  return new ThreeAssetRegistry(manifest, inspectionReport);
}

export function shouldUseFallbackPreview(asset: ThreeAssetPreviewEntry): boolean {
  return (
    asset.planned === true ||
    asset.fileExists === false ||
    asset.runtimeReady !== true ||
    !RUNTIME_FORMATS.has(asset.format.toLowerCase())
  );
}

function mergeAsset(asset: ThreeAssetManifestEntry, inspection: ThreeAssetInspectionAsset | undefined): ThreeAssetPreviewEntry {
  const runtimeReady = inspection?.normalization.runtimeReady ?? (asset.pipelineStatus === "runtime_ready" && asset.planned !== true);
  return {
    ...asset,
    inspection,
    fileExists: inspection?.fileExists,
    fileSizeBytes: inspection?.fileSizeBytes,
    runtimeReady,
    runtimeReason: inspection?.normalization.reason ?? "",
    warnings: inspection?.warnings ?? [],
    errors: inspection?.errors ?? [],
    animations: inspection?.animations.map((animation) => animation.name) ?? [],
    boundingBox: inspection?.boundingBox
  };
}

async function fetchJson<T>(url: string, required: true): Promise<T>;
async function fetchJson<T>(url: string, required: false): Promise<T | undefined>;
async function fetchJson<T>(url: string, required: boolean): Promise<T | undefined> {
  const response = await fetch(url);
  if (!response.ok) {
    if (!required && response.status === 404) {
      return undefined;
    }
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return (await response.json()) as T;
}

function validateManifest(manifest: ThreeAssetManifest): void {
  if (manifest.version !== "0.1") {
    throw new Error(`Unsupported 3D asset manifest version: ${manifest.version}`);
  }
  if (manifest.namespace !== "assets.3d.combat") {
    throw new Error(`Unsupported 3D asset manifest namespace: ${manifest.namespace}`);
  }
  if (manifest.root !== "/assets/3d/") {
    throw new Error(`Unsupported 3D asset manifest root: ${manifest.root}`);
  }
  const ids = new Set<string>();
  for (const asset of manifest.assets) {
    if (ids.has(asset.id)) {
      throw new Error(`Duplicate 3D asset id: ${asset.id}`);
    }
    ids.add(asset.id);
    if (!asset.path.startsWith("/assets/3d/")) {
      throw new Error(`3D asset path must be local under /assets/3d/: ${asset.id}`);
    }
    if (/https?:\/\/|cdn/i.test(asset.path)) {
      throw new Error(`3D asset path must not use external resources: ${asset.id}`);
    }
  }
}

function validateInspectionReport(report: ThreeAssetInspectionReport): void {
  if (report.version !== "0.1") {
    throw new Error(`Unsupported 3D asset inspection report version: ${report.version}`);
  }
  if (report.namespace !== "assets.3d.combat.inspection") {
    throw new Error(`Unsupported 3D asset inspection report namespace: ${report.namespace}`);
  }
}

function compareAssets(left: ThreeAssetPreviewEntry, right: ThreeAssetPreviewEntry): number {
  const categoryDelta = categoryIndex(left.category) - categoryIndex(right.category);
  if (categoryDelta !== 0) {
    return categoryDelta;
  }
  return left.id.localeCompare(right.id);
}

function categoryIndex(category: ThreeAssetCategory): number {
  const index = CATEGORY_ORDER.indexOf(category);
  return index === -1 ? CATEGORY_ORDER.length : index;
}
