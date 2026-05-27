export type CombatAssetLicense = "CC0" | "Public Domain" | "CC-BY" | "MIT" | "Internal Placeholder" | "Custom Permissive";
export type CombatVisualAssetType = "image" | "spriteSheet" | "atlas" | "parallaxLayer" | "icon";
export type CombatVisualBlendMode = "normal" | "screen" | "lighter" | "additive" | "multiply";

export interface CombatSpriteAnimationClip {
  readonly startFrame: number;
  readonly frameCount: number;
  readonly fps: number;
  readonly loop: boolean;
}

interface CombatAssetSourceMeta {
  readonly sourceName: string;
  readonly sourceUrl: string;
  readonly author: string;
  readonly license: CombatAssetLicense;
  readonly attributionRequired: boolean;
  readonly downloadDate: string;
  readonly originalFileName?: string;
  readonly notes: string;
}

export interface Combat2dManifestAsset extends CombatAssetSourceMeta {
  readonly path: string;
  readonly type: CombatVisualAssetType;
  readonly category: string;
  readonly required: boolean;
  readonly planned?: boolean;
  readonly frameWidth?: number;
  readonly frameHeight?: number;
  readonly frameCount?: number;
  readonly fps?: number;
  readonly loop?: boolean;
  readonly blendMode?: CombatVisualBlendMode;
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly recommendedScale?: number;
  readonly animationClips?: Readonly<Record<string, CombatSpriteAnimationClip>>;
}

export interface CombatAudioManifestAsset extends CombatAssetSourceMeta {
  readonly path: string;
  readonly category: string;
  readonly mixGroup: string;
  readonly required: boolean;
  readonly planned?: boolean;
  readonly loop?: boolean;
  readonly durationMs: number;
  readonly volume: number;
  readonly cooldownMs: number;
  readonly maxInstances: number;
}

export interface Combat2dAssetEntry extends Combat2dManifestAsset {
  readonly id: string;
}

export interface CombatAudioAssetEntry extends CombatAudioManifestAsset {
  readonly id: string;
}

export interface Combat2dManifest {
  readonly version: "0.1";
  readonly namespace: "assets.2d.combat";
  readonly root: "/assets/2d/";
  readonly assets: Readonly<Record<string, Combat2dManifestAsset>>;
}

export interface CombatAudioManifest {
  readonly version: "0.1";
  readonly namespace: "assets.audio.combat";
  readonly root: "/assets/audio/";
  readonly assets: Readonly<Record<string, CombatAudioManifestAsset>>;
}

export const COMBAT_2D_ASSET_MANIFEST_URL = "/assets/2d/manifest.v0.1.json";
export const COMBAT_AUDIO_ASSET_MANIFEST_URL = "/assets/audio/manifest.v0.1.json";

export class Combat2dAssetRegistry {
  private readonly entries: readonly Combat2dAssetEntry[];
  private readonly byId: ReadonlyMap<string, Combat2dAssetEntry>;
  private readonly byCategory: ReadonlyMap<string, readonly Combat2dAssetEntry[]>;

  public constructor(public readonly manifest: Combat2dManifest) {
    validateManifestTopLevel(manifest, {
      label: "2D combat asset manifest",
      namespace: "assets.2d.combat",
      root: "/assets/2d/"
    });

    this.entries = Object.freeze(Object.entries(manifest.assets).map(([id, asset]) => ({ id, ...asset })).sort(compare2dAssets));
    this.byId = new Map(this.entries.map((entry) => [entry.id, entry]));
    this.byCategory = groupBy(this.entries, (entry) => entry.category);
  }

  public all(): readonly Combat2dAssetEntry[] {
    return this.entries;
  }

  public get(assetId: string): Combat2dAssetEntry {
    const entry = this.byId.get(assetId);
    if (entry === undefined) {
      throw new Error(`Unknown 2D combat asset id: ${assetId}`);
    }
    return entry;
  }

  public has(assetId: string): boolean {
    return this.byId.has(assetId);
  }

  public groupByCategory(): readonly [string, readonly Combat2dAssetEntry[]][] {
    return [...this.byCategory.entries()];
  }
}

export class CombatAudioAssetRegistry {
  private readonly entries: readonly CombatAudioAssetEntry[];
  private readonly byId: ReadonlyMap<string, CombatAudioAssetEntry>;
  private readonly byMixGroup: ReadonlyMap<string, readonly CombatAudioAssetEntry[]>;

  public constructor(public readonly manifest: CombatAudioManifest) {
    validateManifestTopLevel(manifest, {
      label: "audio combat asset manifest",
      namespace: "assets.audio.combat",
      root: "/assets/audio/"
    });

    this.entries = Object.freeze(Object.entries(manifest.assets).map(([id, asset]) => ({ id, ...asset })).sort(compareAudioAssets));
    this.byId = new Map(this.entries.map((entry) => [entry.id, entry]));
    this.byMixGroup = groupBy(this.entries, (entry) => entry.mixGroup);
  }

  public all(): readonly CombatAudioAssetEntry[] {
    return this.entries;
  }

  public get(assetId: string): CombatAudioAssetEntry {
    const entry = this.byId.get(assetId);
    if (entry === undefined) {
      throw new Error(`Unknown audio combat asset id: ${assetId}`);
    }
    return entry;
  }

  public has(assetId: string): boolean {
    return this.byId.has(assetId);
  }

  public groupByMixGroup(): readonly [string, readonly CombatAudioAssetEntry[]][] {
    return [...this.byMixGroup.entries()];
  }
}

export async function loadCombat2dAssetRegistry(manifestUrl = COMBAT_2D_ASSET_MANIFEST_URL): Promise<Combat2dAssetRegistry> {
  return new Combat2dAssetRegistry(await fetchJson<Combat2dManifest>(manifestUrl));
}

export async function loadCombatAudioAssetRegistry(manifestUrl = COMBAT_AUDIO_ASSET_MANIFEST_URL): Promise<CombatAudioAssetRegistry> {
  return new CombatAudioAssetRegistry(await fetchJson<CombatAudioManifest>(manifestUrl));
}

export function requiresAttribution(asset: Pick<CombatAssetSourceMeta, "license" | "attributionRequired">): boolean {
  return asset.license === "CC-BY" || asset.attributionRequired === true;
}

function validateManifestTopLevel(
  manifest: { readonly version: string; readonly namespace: string; readonly root: string; readonly assets: unknown },
  expected: { readonly label: string; readonly namespace: string; readonly root: string }
): void {
  if (manifest.version !== "0.1") {
    throw new Error(`Unsupported ${expected.label} version: ${manifest.version}`);
  }
  if (manifest.namespace !== expected.namespace) {
    throw new Error(`Unsupported ${expected.label} namespace: ${manifest.namespace}`);
  }
  if (manifest.root !== expected.root) {
    throw new Error(`Unsupported ${expected.label} root: ${manifest.root}`);
  }
  if (!isPlainRecord(manifest.assets)) {
    throw new Error(`${expected.label} assets must be an object map.`);
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load asset manifest ${url}: ${response.status}`);
  }
  return (await response.json()) as T;
}

function compare2dAssets(left: Combat2dAssetEntry, right: Combat2dAssetEntry): number {
  return left.category.localeCompare(right.category) || left.id.localeCompare(right.id);
}

function compareAudioAssets(left: CombatAudioAssetEntry, right: CombatAudioAssetEntry): number {
  return left.mixGroup.localeCompare(right.mixGroup) || left.id.localeCompare(right.id);
}

function groupBy<TEntry>(entries: readonly TEntry[], getGroup: (entry: TEntry) => string): ReadonlyMap<string, readonly TEntry[]> {
  const grouped = new Map<string, TEntry[]>();
  for (const entry of entries) {
    const key = getGroup(entry);
    const group = grouped.get(key);
    if (group === undefined) {
      grouped.set(key, [entry]);
    } else {
      group.push(entry);
    }
  }
  return new Map([...grouped.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => [key, Object.freeze([...value])]));
}

function isPlainRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
