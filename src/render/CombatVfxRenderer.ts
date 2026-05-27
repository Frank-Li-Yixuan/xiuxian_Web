import type { CombatVisualBlendMode } from "../assets/CombatAssetRegistry";
import type {
  CanvasPresentationSpriteVfxRequest,
  CanvasPresentationState
} from "./CanvasPresentationState";
import type { CanvasLikeContext } from "./PrimitiveDrawing";
import type { RenderCommand } from "./RenderLayerStack";
import { SpriteAssetRegistry, type LoadedSpriteAsset } from "./SpriteAssetRegistry";
import { SpriteSheetAnimator, type SpriteSourceRect } from "./SpriteSheetAnimator";

export interface CombatVfxRendererOptions {
  readonly spriteRegistry: SpriteAssetRegistry;
}

export class CombatVfxRenderer {
  private readonly spriteRegistry: SpriteAssetRegistry;

  public constructor(options: CombatVfxRendererOptions) {
    this.spriteRegistry = options.spriteRegistry;
  }

  public createCommands(presentation: Pick<CanvasPresentationState, "frame" | "spriteVfx">): readonly RenderCommand[] {
    const commands: RenderCommand[] = [];
    for (const request of presentation.spriteVfx ?? []) {
      const asset = this.spriteRegistry.get(request.assetId);
      if (asset.entry.type === "spriteSheet") {
        const animator = new SpriteSheetAnimator(asset.entry, asset.image);
        if (animator.isComplete(spriteFrameOptions(request, presentation.frame))) {
          continue;
        }
      }
      commands.push({
        id: `sprite_vfx_${request.id}`,
        layerId: request.layerId ?? "foreground_effects",
        draw: (context) => drawSpriteVfx(context, asset, request, presentation.frame)
      });
    }
    return Object.freeze(commands);
  }
}

function drawSpriteVfx(
  context: CanvasLikeContext,
  asset: LoadedSpriteAsset,
  request: CanvasPresentationSpriteVfxRequest,
  currentFrame: number
): void {
  if (context.drawImage === undefined) {
    throw new Error("Canvas context does not support drawImage for sprite VFX");
  }

  const source = sourceRectFor(asset, request, currentFrame);
  const anchor = asset.entry.anchor ?? { x: 0.5, y: 0.5 };
  const scale = (asset.entry.recommendedScale ?? 1) * (request.scale ?? 1);
  const alpha = clamp01(request.alpha ?? 1);
  const blendMode = mapBlendMode(request.blendModeOverride ?? asset.entry.blendMode ?? "normal");

  context.recordCommand?.(request.layerId ?? "foreground_effects", `sprite_vfx_${request.id}`);
  context.save();
  try {
    context.globalAlpha = alpha;
    (context as CanvasLikeContext & { globalCompositeOperation: GlobalCompositeOperation }).globalCompositeOperation = blendMode;
    context.translate?.(request.position.x, request.position.y);
    context.rotate?.(request.rotation ?? 0);
    context.scale?.(scale, scale);
    context.drawImage(
      asset.image,
      source.x,
      source.y,
      source.width,
      source.height,
      -source.width * anchor.x,
      -source.height * anchor.y,
      source.width,
      source.height
    );
  } finally {
    context.restore();
  }
}

function sourceRectFor(asset: LoadedSpriteAsset, request: CanvasPresentationSpriteVfxRequest, currentFrame: number): SpriteSourceRect {
  if (asset.entry.type === "spriteSheet") {
    return new SpriteSheetAnimator(asset.entry, asset.image).frameAt(spriteFrameOptions(request, currentFrame)).source;
  }
  return {
    x: 0,
    y: 0,
    width: asset.image.width,
    height: asset.image.height
  };
}

function spriteFrameOptions(request: CanvasPresentationSpriteVfxRequest, currentFrame: number): {
  readonly currentFrame: number;
  readonly startFrame: number;
  readonly loopOverride?: boolean;
} {
  return request.loopOverride === undefined
    ? { currentFrame, startFrame: request.startFrame }
    : { currentFrame, startFrame: request.startFrame, loopOverride: request.loopOverride };
}

function mapBlendMode(blendMode: CombatVisualBlendMode): GlobalCompositeOperation {
  switch (blendMode) {
    case "screen":
      return "screen";
    case "lighter":
    case "additive":
      return "lighter";
    case "multiply":
      return "multiply";
    default:
      return "source-over";
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 1));
}
