export type NormalizedUiAssetCategory = "button" | "panel" | "card" | "slot" | "iconFrame" | "ornament" | "overlay";
export type NormalizedUiScalingMode = "fixed" | "contain" | "cover" | "nineSlice";

export interface NormalizedUiRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface NormalizedUiSize {
  readonly w: number;
  readonly h: number;
}

export interface NormalizedUiTransparentPadding {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly paddingRatio: number;
}

export interface NormalizedUiNineSlice {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export interface NormalizedUiAssetEntry {
  readonly id: string;
  readonly path: string;
  readonly category: NormalizedUiAssetCategory;
  readonly required: true;
  readonly imageSize: NormalizedUiSize;
  readonly visualBounds: NormalizedUiRect;
  readonly transparentPadding: NormalizedUiTransparentPadding;
  readonly mostlyEmpty?: boolean;
  readonly recommendedDisplaySize: NormalizedUiSize;
  readonly contentRect: NormalizedUiRect;
  readonly scalingMode: NormalizedUiScalingMode;
  readonly nineSlice?: NormalizedUiNineSlice;
  readonly stateGroup?: string;
  readonly warnings?: readonly string[];
}

export interface NormalizedUiStateGroup {
  readonly ids: readonly string[];
  readonly warnings: readonly string[];
}

export interface NormalizedUiAssetManifest {
  readonly version: "0.3";
  readonly namespace: "ui.normalized";
  readonly generatedAtMs: number;
  readonly rootDirs?: readonly string[];
  readonly assets: Readonly<Record<string, NormalizedUiAssetEntry>>;
  readonly stateGroups: Readonly<Record<string, NormalizedUiStateGroup>>;
}

export const NORMALIZED_UI_ASSET_MANIFEST_URL = "/assets/generated/ui/ui_manifest.v0.3.json";

export type NormalizedUiAssetState = "normal" | "hover" | "pressed" | "selected" | "disabled";

const STATE_FALLBACKS: Readonly<Record<NormalizedUiAssetState, readonly string[]>> = {
  normal: ["normal"],
  hover: ["hover", "normal"],
  pressed: ["pressed", "hover", "normal"],
  selected: ["selected", "hover", "normal"],
  disabled: ["disabled", "normal"]
};

export class NormalizedUiAssetRegistry {
  private readonly entries: Readonly<Record<string, NormalizedUiAssetEntry>>;
  private readonly groups: Readonly<Record<string, NormalizedUiStateGroup>>;

  public constructor(public readonly manifest: NormalizedUiAssetManifest) {
    validateNormalizedUiAssetManifest(manifest);
    this.entries = Object.freeze({ ...manifest.assets });
    this.groups = Object.freeze({ ...manifest.stateGroups });
  }

  public getAsset(assetId: string): NormalizedUiAssetEntry {
    const entry = this.entries[assetId];
    if (entry === undefined) {
      throw new Error(`Unknown normalized UI asset id: ${assetId}`);
    }
    return entry;
  }

  public getStateGroup(stateGroupId: string): NormalizedUiStateGroup {
    const group = this.groups[stateGroupId];
    if (group === undefined) {
      throw new Error(`Unknown normalized UI state group: ${stateGroupId}`);
    }
    return group;
  }

  public getStateAsset(stateGroupId: string, state: NormalizedUiAssetState): NormalizedUiAssetEntry {
    const group = this.getStateGroup(stateGroupId);
    for (const suffix of STATE_FALLBACKS[state]) {
      const matchingId = group.ids.find((id) => id.endsWith(`.${suffix}`));
      if (matchingId !== undefined) {
        return this.getAsset(matchingId);
      }
    }
    const firstId = group.ids[0];
    if (firstId === undefined) {
      throw new Error(`Normalized UI state group is empty: ${stateGroupId}`);
    }
    return this.getAsset(firstId);
  }

  public hasAsset(assetId: string): boolean {
    return this.entries[assetId] !== undefined;
  }
}

export async function loadNormalizedUiAssetManifest(
  manifestUrl = NORMALIZED_UI_ASSET_MANIFEST_URL
): Promise<NormalizedUiAssetManifest> {
  const response = await fetch(manifestUrl);
  if (!response.ok) {
    throw new Error(`Failed to load normalized UI asset manifest ${manifestUrl}: ${response.status}`);
  }
  const manifest = (await response.json()) as NormalizedUiAssetManifest;
  validateNormalizedUiAssetManifest(manifest);
  return manifest;
}

export async function loadNormalizedUiAssetRegistry(
  manifestUrl = NORMALIZED_UI_ASSET_MANIFEST_URL
): Promise<NormalizedUiAssetRegistry> {
  return new NormalizedUiAssetRegistry(await loadNormalizedUiAssetManifest(manifestUrl));
}

export function validateNormalizedUiAssetManifest(manifest: NormalizedUiAssetManifest): void {
  if (manifest.version !== "0.3") {
    throw new Error(`Unsupported normalized UI asset manifest version: ${manifest.version}`);
  }
  if (manifest.namespace !== "ui.normalized") {
    throw new Error(`Unsupported normalized UI asset manifest namespace: ${manifest.namespace}`);
  }
  for (const [id, entry] of Object.entries(manifest.assets)) {
    if (entry.id !== id) {
      throw new Error(`Normalized UI asset id mismatch: ${id}`);
    }
    if (!entry.path.startsWith("/assets/generated/ui/")) {
      throw new Error(`Normalized UI asset path must be local: ${id}`);
    }
    if (/https?:\/\/|cdn|fonts\.googleapis|@font-face/i.test(entry.path)) {
      throw new Error(`Normalized UI asset must not use external resources: ${id}`);
    }
    validateRect(`${id}.visualBounds`, entry.visualBounds, entry.imageSize);
    validateRect(`${id}.contentRect`, entry.contentRect, entry.imageSize);
  }
  for (const [groupId, group] of Object.entries(manifest.stateGroups)) {
    if (group.ids.length === 0) {
      throw new Error(`Normalized UI state group is empty: ${groupId}`);
    }
    for (const assetId of group.ids) {
      if (manifest.assets[assetId] === undefined) {
        throw new Error(`Normalized UI state group ${groupId} references missing asset: ${assetId}`);
      }
    }
  }
}

function validateRect(label: string, rect: NormalizedUiRect, size: NormalizedUiSize): void {
  if (rect.x < 0 || rect.y < 0 || rect.w <= 0 || rect.h <= 0 || rect.x + rect.w > size.w || rect.y + rect.h > size.h) {
    throw new Error(`Invalid normalized UI asset rect: ${label}`);
  }
}
