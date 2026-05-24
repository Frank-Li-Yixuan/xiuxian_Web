export interface AssetContentRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export type AssetRegions = Readonly<Record<string, AssetContentRect>>;

export interface AssetManifestEntry {
  readonly path: string;
  readonly type: "background" | "ui" | "reference" | string;
  readonly required: boolean;
  readonly contentRect?: AssetContentRect;
  readonly regions?: AssetRegions;
}

export interface AssetManifest {
  readonly version: string;
  readonly namespace: string;
  readonly assets: Readonly<Record<string, AssetManifestEntry>>;
}

export class AssetRegistry<TAssetId extends string = string> {
  private readonly entries: Readonly<Record<string, AssetManifestEntry>>;

  public constructor(public readonly manifest: AssetManifest) {
    this.entries = Object.freeze({ ...manifest.assets });
  }

  public get(assetId: TAssetId): AssetManifestEntry {
    const entry = this.entries[assetId];
    if (entry === undefined) {
      throw new Error(`Unknown asset id: ${assetId}`);
    }
    return entry;
  }

  public path(assetId: TAssetId): string {
    return this.get(assetId).path;
  }

  public has(assetId: TAssetId): boolean {
    return this.entries[assetId] !== undefined;
  }
}

export async function loadAssetRegistry<TAssetId extends string>(manifestUrl: string): Promise<AssetRegistry<TAssetId>> {
  const response = await fetch(manifestUrl);
  if (!response.ok) {
    throw new Error(`Failed to load asset manifest ${manifestUrl}: ${response.status}`);
  }
  return new AssetRegistry<TAssetId>((await response.json()) as AssetManifest);
}
