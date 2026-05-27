export type AssetLicense =
  | "CC0"
  | "Public Domain"
  | "CC-BY"
  | "MIT"
  | "Internal Placeholder"
  | "Custom Permissive";

export type VisualAssetType =
  | "image"
  | "spriteSheet"
  | "atlas"
  | "parallaxLayer"
  | "icon";

export type VisualBlendMode =
  | "normal"
  | "screen"
  | "lighter"
  | "additive"
  | "multiply";

export interface AssetSourceMeta {
  readonly sourceName: string;
  readonly sourceUrl: string;
  readonly author: string;
  readonly license: AssetLicense;
  readonly attributionRequired: boolean;
  readonly downloadDate: string;
  readonly notes?: string;
}

export interface VisualAssetDefinition extends AssetSourceMeta {
  readonly id: string;
  readonly path: string;
  readonly type: VisualAssetType;
  readonly category: string;
  readonly required: boolean;
  readonly planned?: boolean;

  readonly frameWidth?: number;
  readonly frameHeight?: number;
  readonly frameCount?: number;
  readonly fps?: number;
  readonly loop?: boolean;
  readonly blendMode?: VisualBlendMode;
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly recommendedScale?: number;
  readonly animationClips?: Readonly<Record<string, VisualSpriteAnimationClip>>;
}

export interface VisualSpriteAnimationClip {
  readonly startFrame: number;
  readonly frameCount: number;
  readonly fps: number;
  readonly loop: boolean;
}

export interface AudioAssetDefinition extends AssetSourceMeta {
  readonly id: string;
  readonly path: string;
  readonly category: string;
  readonly mixGroup: string;
  readonly required: boolean;
  readonly planned?: boolean;
  readonly loop?: boolean;

  readonly durationMs?: number;
  readonly volume: number;
  readonly cooldownMs: number;
  readonly maxInstances: number;
}

export interface SpritePlaybackRequest {
  readonly assetId: string;
  readonly x: number;
  readonly y: number;
  readonly rotation?: number;
  readonly scale?: number;
  readonly alpha?: number;
  readonly loopOverride?: boolean;
  readonly blendModeOverride?: VisualBlendMode;
}

export interface CombatSfxRequest {
  readonly assetId: string;
  readonly x?: number;
  readonly y?: number;
  readonly volumeScale?: number;
  readonly pitchJitter?: number;
  readonly priority?: number;
}
