import type { Combat2dAssetEntry } from "../assets/CombatAssetRegistry";
import type { SpriteImageLike } from "./SpriteAssetRegistry";

export interface SpriteSheetFrameOptions {
  readonly currentFrame: number;
  readonly startFrame: number;
  readonly loopOverride?: boolean;
}

export interface SpriteSourceRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface SpriteSheetFrame {
  readonly index: number;
  readonly source: SpriteSourceRect;
}

export class SpriteSheetAnimator {
  private readonly frameWidth: number;
  private readonly frameHeight: number;
  private readonly frameCount: number;
  private readonly fps: number;
  private readonly framesPerRow: number;

  public constructor(
    private readonly asset: Combat2dAssetEntry,
    image: Pick<SpriteImageLike, "width" | "height">
  ) {
    this.frameWidth = requirePositive(asset.frameWidth, `${asset.id}.frameWidth`);
    this.frameHeight = requirePositive(asset.frameHeight, `${asset.id}.frameHeight`);
    this.frameCount = requirePositive(asset.frameCount, `${asset.id}.frameCount`);
    this.fps = requirePositive(asset.fps, `${asset.id}.fps`);
    this.framesPerRow = Math.max(1, Math.floor(image.width / this.frameWidth));
  }

  public frameAt(options: SpriteSheetFrameOptions): SpriteSheetFrame {
    const animationFrame = this.animationFrame(options);
    const looping = options.loopOverride ?? this.asset.loop === true;
    const index = looping ? animationFrame % this.frameCount : Math.min(this.frameCount - 1, animationFrame);
    return {
      index,
      source: {
        x: (index % this.framesPerRow) * this.frameWidth,
        y: Math.floor(index / this.framesPerRow) * this.frameHeight,
        width: this.frameWidth,
        height: this.frameHeight
      }
    };
  }

  public isComplete(options: SpriteSheetFrameOptions): boolean {
    const looping = options.loopOverride ?? this.asset.loop === true;
    return !looping && this.animationFrame(options) >= this.frameCount;
  }

  private animationFrame(options: SpriteSheetFrameOptions): number {
    const elapsedRenderFrames = Math.max(0, Math.trunc(options.currentFrame) - Math.trunc(options.startFrame));
    return Math.floor((elapsedRenderFrames * this.fps) / 60);
  }
}

function requirePositive(value: number | undefined, label: string): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    throw new Error(`Sprite sheet metadata must be positive: ${label}`);
  }
  return value;
}
