import {
  Combat2dAssetRegistry,
  loadCombat2dAssetRegistry,
  type Combat2dAssetEntry
} from "../assets/CombatAssetRegistry";

export type SpriteImageLike = CanvasImageSource & {
  readonly width: number;
  readonly height: number;
};

export type SpriteImageLoader = (path: string, asset: Combat2dAssetEntry) => Promise<SpriteImageLike> | SpriteImageLike;

export interface LoadedSpriteAsset {
  readonly id: string;
  readonly entry: Combat2dAssetEntry;
  readonly image: SpriteImageLike;
  readonly available: boolean;
  readonly fallback: boolean;
}

export interface SpriteAssetRegistryPreloadOptions {
  readonly imageLoader?: SpriteImageLoader;
  readonly fallbackImage?: SpriteImageLike;
}

export interface LoadSpriteAssetRegistryOptions extends SpriteAssetRegistryPreloadOptions {
  readonly manifestUrl?: string;
}

export class SpriteAssetRegistry {
  private readonly byId: ReadonlyMap<string, LoadedSpriteAsset>;

  private constructor(
    public readonly combatRegistry: Combat2dAssetRegistry,
    loadedAssets: readonly LoadedSpriteAsset[]
  ) {
    this.byId = new Map(loadedAssets.map((asset) => [asset.id, asset]));
  }

  public static async preload(
    combatRegistry: Combat2dAssetRegistry,
    options: SpriteAssetRegistryPreloadOptions = {}
  ): Promise<SpriteAssetRegistry> {
    const imageLoader = options.imageLoader ?? preloadBrowserImage;
    const fallbackImage = options.fallbackImage ?? createFallbackImage();
    const loadedAssets: LoadedSpriteAsset[] = [];

    for (const entry of combatRegistry.all()) {
      try {
        const image = await imageLoader(entry.path, entry);
        loadedAssets.push({
          id: entry.id,
          entry,
          image,
          available: true,
          fallback: false
        });
      } catch (reason) {
        if (entry.required === true && entry.planned !== true) {
          const detail = reason instanceof Error ? reason.message : String(reason);
          throw new Error(`Failed to preload required sprite asset ${entry.id}: ${entry.path} (${detail})`);
        }
        loadedAssets.push({
          id: entry.id,
          entry,
          image: fallbackImage,
          available: false,
          fallback: true
        });
      }
    }

    return new SpriteAssetRegistry(combatRegistry, Object.freeze(loadedAssets));
  }

  public all(): readonly LoadedSpriteAsset[] {
    return Object.freeze([...this.byId.values()]);
  }

  public get(assetId: string): LoadedSpriteAsset {
    const asset = this.byId.get(assetId);
    if (asset === undefined) {
      throw new Error(`Unknown sprite asset id: ${assetId}`);
    }
    return asset;
  }

  public has(assetId: string): boolean {
    return this.byId.has(assetId);
  }
}

export async function loadSpriteAssetRegistry(options: LoadSpriteAssetRegistryOptions = {}): Promise<SpriteAssetRegistry> {
  const combatRegistry = await loadCombat2dAssetRegistry(options.manifestUrl);
  return SpriteAssetRegistry.preload(combatRegistry, options);
}

function preloadBrowserImage(path: string): Promise<SpriteImageLike> {
  return new Promise((resolve, reject) => {
    if (typeof Image === "undefined") {
      reject(new Error("Image constructor is unavailable; pass a custom sprite image loader outside the browser"));
      return;
    }

    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${path}`));
    image.src = path;
  });
}

function createFallbackImage(): SpriteImageLike {
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas;
  }
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(1, 1);
  }
  return { width: 1, height: 1 } as unknown as SpriteImageLike;
}
