export const CHARACTER_CREATION_UI_MANIFEST_URL = "/assets/generated/ui/character_creation_manifest.v0.1.json";

export const CHARACTER_CREATION_UI_REQUIRED_IDS = [
  "cc.mainPanel",
  "cc.portraitFrame",
  "cc.blackMeditationSilhouette",
  "cc.fateAltarDisc",
  "cc.fateAltarDiscActive",
  "cc.rootAura.metal",
  "cc.rootAura.wood",
  "cc.rootAura.water",
  "cc.rootAura.fire",
  "cc.rootAura.earth",
  "cc.rootAura.thunder",
  "cc.rootAura.yin",
  "cc.rootAura.mixed",
  "cc.nameInput",
  "cc.attributePanel",
  "cc.attributeRow",
  "cc.spiritualRootDisc",
  "cc.elementBadgeFrame",
  "cc.destiny.common",
  "cc.destiny.rare",
  "cc.destiny.epic",
  "cc.destiny.legendary",
  "cc.destiny.flaw",
  "cc.traitLock.locked",
  "cc.traitLock.unlocked",
  "cc.reroll.normal",
  "cc.reroll.hover",
  "cc.confirmLife.normal",
  "cc.backgroundOriginPanel",
  "cc.hiddenBloodlinePanel",
  "cc.divinationTokenBadge",
  "common.close.normal",
  "common.close.hover",
  "common.close.pressed",
  "common.close.disabled"
] as const;

export type UiAssetId = (typeof CHARACTER_CREATION_UI_REQUIRED_IDS)[number];

export interface UiAssetRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export type UiAssetRegions = Readonly<Record<string, UiAssetRect>>;

export interface UiAssetManifestEntry {
  readonly path: string;
  readonly category: string;
  readonly required: boolean;
  readonly recommendedWidth?: number;
  readonly recommendedHeight?: number;
  readonly contentRect?: UiAssetRect;
  readonly regions?: UiAssetRegions;
}

export interface UiAssetManifest {
  readonly version: string;
  readonly namespace: string;
  readonly assets: Readonly<Record<string, UiAssetManifestEntry>>;
}

export type UiAssetPreloadLoader<TLoaded> = (
  path: string,
  id: UiAssetId,
  entry: UiAssetManifestEntry
) => Promise<TLoaded> | TLoaded;

let configuredManifest: UiAssetManifest | undefined;

export function configureUiAssetManifest(manifest: UiAssetManifest): UiAssetManifest {
  validateRequiredUiAssets(manifest);
  configuredManifest = {
    ...manifest,
    assets: Object.freeze({ ...manifest.assets })
  };
  return configuredManifest;
}

export async function loadUiAssetManifest(url = CHARACTER_CREATION_UI_MANIFEST_URL): Promise<UiAssetManifest> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load UI asset manifest ${url}: ${response.status}`);
  }
  return configureUiAssetManifest((await response.json()) as UiAssetManifest);
}

export function getUiAsset(id: UiAssetId): UiAssetManifestEntry {
  if (configuredManifest === undefined) {
    throw new Error("UI asset manifest has not been configured");
  }

  const entry = configuredManifest.assets[id];
  if (entry === undefined) {
    throw new Error(`Unknown UI asset id: ${id}`);
  }
  return entry;
}

export function validateRequiredUiAssets(
  manifest: UiAssetManifest,
  requiredIds: readonly UiAssetId[] = CHARACTER_CREATION_UI_REQUIRED_IDS
): void {
  if (manifest.version !== "0.1") {
    throw new Error(`Unsupported UI asset manifest version: ${manifest.version}`);
  }
  if (manifest.namespace !== "ui.character_creation") {
    throw new Error(`Unsupported UI asset manifest namespace: ${manifest.namespace}`);
  }

  for (const id of requiredIds) {
    const entry = manifest.assets[id];
    if (entry === undefined) {
      throw new Error(`Missing required UI asset: ${id}`);
    }
    if (entry.required !== true) {
      throw new Error(`Required UI asset must be marked required: ${id}`);
    }
    validateAssetPath(id, entry.path);
    validateRect(id, entry.contentRect);
    for (const [regionName, region] of Object.entries(entry.regions ?? {})) {
      validateRect(`${id}.${regionName}`, region);
    }
  }
}

export function preloadUiAssets(manifest: UiAssetManifest): Promise<ReadonlyMap<UiAssetId, HTMLImageElement>>;
export function preloadUiAssets<TLoaded>(
  manifest: UiAssetManifest,
  loader: UiAssetPreloadLoader<TLoaded>
): Promise<ReadonlyMap<UiAssetId, TLoaded>>;
export async function preloadUiAssets<TLoaded = HTMLImageElement>(
  manifest: UiAssetManifest,
  loader?: UiAssetPreloadLoader<TLoaded>
): Promise<ReadonlyMap<UiAssetId, TLoaded>> {
  validateRequiredUiAssets(manifest);
  const loadedAssets = new Map<UiAssetId, TLoaded>();

  await Promise.all(
    CHARACTER_CREATION_UI_REQUIRED_IDS.map(async (id) => {
      const entry = manifest.assets[id];
      if (entry === undefined) {
        throw new Error(`Missing required UI asset: ${id}`);
      }
      const loaded =
        loader === undefined ? ((await preloadImage(entry.path)) as TLoaded) : await loader(entry.path, id, entry);
      loadedAssets.set(id, loaded);
    })
  );

  return loadedAssets;
}

function validateAssetPath(id: UiAssetId, path: string): void {
  if (!path.startsWith("/assets/generated/ui/common/") && !path.startsWith("/assets/generated/ui/character_creation/")) {
    throw new Error(`UI asset ${id} must be under /assets/generated/ui/common/ or /assets/generated/ui/character_creation/`);
  }
  if (!path.endsWith(".png")) {
    throw new Error(`UI asset ${id} must point to a PNG file`);
  }
  if (/https?:\/\/|cdn|fonts\.googleapis|@font-face/i.test(path)) {
    throw new Error(`UI asset ${id} must not use an external URL`);
  }
}

function validateRect(label: string, rect: UiAssetRect | undefined): void {
  if (rect === undefined) {
    return;
  }
  if (rect.x < 0 || rect.y < 0 || rect.w <= 0 || rect.h <= 0) {
    throw new Error(`Invalid UI asset rect: ${label}`);
  }
}

function preloadImage(path: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (typeof Image === "undefined") {
      reject(new Error("Image constructor is unavailable; pass a custom preload loader outside the browser"));
      return;
    }

    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to preload UI asset: ${path}`));
    image.src = path;
  });
}
