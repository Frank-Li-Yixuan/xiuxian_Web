import type { CombatVisualBlendMode } from "../assets/CombatAssetRegistry";
import type { CanvasPresentationPickup, CanvasPresentationState } from "./CanvasPresentationState";
import {
  drawFilledCircle,
  drawLine,
  drawRing,
  type CanvasLikeContext,
  type Vec2
} from "./PrimitiveDrawing";
import type { RenderCommand } from "./RenderLayerStack";
import type { LoadedSpriteAsset, SpriteAssetRegistry } from "./SpriteAssetRegistry";
import { SpriteSheetAnimator, type SpriteSourceRect } from "./SpriteSheetAnimator";

export type PickupPresentationPhase =
  | "spawnBurst"
  | "floatIdle"
  | "magnetAcquire"
  | "magnetTravel"
  | "collectFlash";

export interface PickupPresentationDescription {
  readonly phase: PickupPresentationPhase;
  readonly assetId: string;
  readonly color: string;
  readonly sfxCueId: string;
  readonly ageFrames: number;
  readonly firstSeenFrame: number;
}

export interface PickupPresentationSystemOptions {
  readonly spriteRegistry: SpriteAssetRegistry;
}

const QI_ORB_ASSET_ID = "pickup.qi_orb_01";
const ZHENYUAN_ORB_ASSET_ID = "pickup.zhenyuan_orb_01";

export class PickupPresentationSystem {
  private readonly spriteRegistry: SpriteAssetRegistry;
  private readonly firstSeenFrameByEntityId = new Map<number, number>();

  public constructor(options: PickupPresentationSystemOptions) {
    this.spriteRegistry = options.spriteRegistry;
  }

  public describePickup(pickup: CanvasPresentationPickup, frame: number): PickupPresentationDescription {
    const firstSeenFrame = this.getFirstSeenFrame(pickup.entityId, frame);
    const ageFrames = Math.max(0, Math.trunc(frame) - firstSeenFrame);
    const visual = pickupVisualProfile(pickup);
    return {
      phase: phaseForAge(ageFrames),
      assetId: visual.assetId,
      color: visual.color,
      sfxCueId: pickup.sfxCueId ?? visual.sfxCueId,
      ageFrames,
      firstSeenFrame
    };
  }

  public createCommands(presentation: Pick<CanvasPresentationState, "frame" | "pickups">): readonly RenderCommand[] {
    this.pruneMissingPickups(presentation.pickups);
    const commands: RenderCommand[] = presentation.pickups.map((pickup) => {
      const description = this.describePickup(pickup, presentation.frame);
      return {
        id: `pickup_presentation_${pickup.entityId}`,
        layerId: "pickup_trails",
        draw: (context: CanvasLikeContext) => this.drawPickup(context, pickup, description, presentation.frame)
      };
    });
    return Object.freeze(commands);
  }

  private drawPickup(
    context: CanvasLikeContext,
    pickup: CanvasPresentationPickup,
    description: PickupPresentationDescription,
    frame: number
  ): void {
    context.recordCommand?.("pickup_trails", `pickup_presentation_${pickup.entityId}`);
    const position = visualPickupPosition(pickup.position, pickup.entityId, frame, description);
    const phaseScale = scaleForPhase(description.phase, description.ageFrames);
    const alpha = alphaForPhase(description.phase);

    if (this.spriteRegistry.has(description.assetId)) {
      const asset = this.spriteRegistry.get(description.assetId);
      drawPickupSprite(context, asset, position, description, phaseScale, alpha, frame);
    } else {
      drawFilledCircle(context, position, 10 * phaseScale, description.color, 0.62 * alpha);
    }

    drawProceduralGlint(context, position, description, phaseScale, alpha);
    if (description.phase === "magnetAcquire" || description.phase === "magnetTravel") {
      drawMagnetTrail(context, pickup.position, position, description.color, description.phase === "magnetTravel" ? 0.72 : 0.42);
    }
  }

  private getFirstSeenFrame(entityId: number, frame: number): number {
    const existing = this.firstSeenFrameByEntityId.get(entityId);
    if (existing !== undefined) {
      return existing;
    }
    const firstSeenFrame = Math.trunc(frame);
    this.firstSeenFrameByEntityId.set(entityId, firstSeenFrame);
    return firstSeenFrame;
  }

  private pruneMissingPickups(pickups: readonly CanvasPresentationPickup[]): void {
    const visibleIds = new Set(pickups.map((pickup) => pickup.entityId));
    for (const entityId of this.firstSeenFrameByEntityId.keys()) {
      if (!visibleIds.has(entityId)) {
        this.firstSeenFrameByEntityId.delete(entityId);
      }
    }
  }
}

function pickupVisualProfile(pickup: CanvasPresentationPickup): {
  readonly assetId: string;
  readonly color: string;
  readonly sfxCueId: string;
} {
  switch (pickup.renderKind) {
    case "qi_orb":
      return { assetId: QI_ORB_ASSET_ID, color: "#38bdf8", sfxCueId: "sfx.pickup.qi_orb_01" };
    case "spirit_exp":
      return { assetId: ZHENYUAN_ORB_ASSET_ID, color: "#34d399", sfxCueId: "sfx.pickup.qi_orb_01" };
    case "material":
      return { assetId: ZHENYUAN_ORB_ASSET_ID, color: "#facc15", sfxCueId: "sfx.pickup.rare_drop_01" };
    case "pill":
      return { assetId: QI_ORB_ASSET_ID, color: "#fb7185", sfxCueId: "sfx.pill.rejuvenation_heal_01" };
    default:
      return { assetId: ZHENYUAN_ORB_ASSET_ID, color: "#facc15", sfxCueId: "sfx.pickup.rare_drop_01" };
  }
}

function phaseForAge(ageFrames: number): PickupPresentationPhase {
  if (ageFrames < 18) {
    return "spawnBurst";
  }
  if (ageFrames < 90) {
    return "floatIdle";
  }
  if (ageFrames < 118) {
    return "magnetAcquire";
  }
  if (ageFrames < 154) {
    return "magnetTravel";
  }
  return "collectFlash";
}

function visualPickupPosition(
  position: Vec2,
  entityId: number,
  frame: number,
  description: PickupPresentationDescription
): Vec2 {
  const bob = Math.sin((frame + entityId * 17) / 18) * 3;
  if (description.phase === "spawnBurst") {
    const burst = Math.min(1, description.ageFrames / 18);
    return {
      x: position.x,
      y: position.y - 10 * burst + bob
    };
  }
  if (description.phase === "magnetAcquire") {
    const t = (description.ageFrames - 90) / 28;
    return {
      x: position.x + 10 * t,
      y: position.y - 18 * t + bob
    };
  }
  if (description.phase === "magnetTravel") {
    const t = (description.ageFrames - 118) / 36;
    return {
      x: position.x + 42 * t,
      y: position.y - 74 * t + bob
    };
  }
  if (description.phase === "collectFlash") {
    return {
      x: position.x + 42,
      y: position.y - 74
    };
  }
  return { x: position.x, y: position.y + bob };
}

function scaleForPhase(phase: PickupPresentationPhase, ageFrames: number): number {
  switch (phase) {
    case "spawnBurst":
      return 0.62 + Math.min(1, ageFrames / 18) * 0.46;
    case "magnetAcquire":
      return 1.08;
    case "magnetTravel":
      return 1.16;
    case "collectFlash":
      return 1.32;
    default:
      return 1;
  }
}

function alphaForPhase(phase: PickupPresentationPhase): number {
  return phase === "collectFlash" ? 0.78 : 0.96;
}

function drawPickupSprite(
  context: CanvasLikeContext,
  asset: LoadedSpriteAsset,
  position: Vec2,
  description: PickupPresentationDescription,
  phaseScale: number,
  alpha: number,
  frame: number
): void {
  if (context.drawImage === undefined) {
    return;
  }
  const source = sourceRectFor(asset, description, frame);
  const anchor = asset.entry.anchor ?? { x: 0.5, y: 0.5 };
  const scale = (asset.entry.recommendedScale ?? 1) * phaseScale;

  context.save();
  try {
    context.globalAlpha = alpha;
    (context as CanvasLikeContext & { globalCompositeOperation: GlobalCompositeOperation }).globalCompositeOperation = mapBlendMode(asset.entry.blendMode ?? "normal");
    context.translate?.(position.x, position.y);
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

function sourceRectFor(asset: LoadedSpriteAsset, description: PickupPresentationDescription, frame: number): SpriteSourceRect {
  if (asset.entry.type === "spriteSheet") {
    return new SpriteSheetAnimator(asset.entry, asset.image).frameAt({
      currentFrame: frame,
      startFrame: description.firstSeenFrame,
      loopOverride: true
    }).source;
  }
  return {
    x: 0,
    y: 0,
    width: asset.image.width,
    height: asset.image.height
  };
}

function drawProceduralGlint(
  context: CanvasLikeContext,
  position: Vec2,
  description: PickupPresentationDescription,
  phaseScale: number,
  alpha: number
): void {
  const radius = 14 * phaseScale;
  drawRing(context, position, radius, description.color, 2, 0.76 * alpha);
  drawFilledCircle(context, position, Math.max(3, 4 * phaseScale), "#fef3c7", 0.82 * alpha);
  drawLine(context, { x: position.x - radius, y: position.y }, { x: position.x + radius, y: position.y }, description.color, 1, 0.42 * alpha);
  drawLine(context, { x: position.x, y: position.y - radius }, { x: position.x, y: position.y + radius }, description.color, 1, 0.42 * alpha);

  if (description.phase === "spawnBurst" || description.phase === "collectFlash") {
    drawRing(context, position, radius + 12, "#fef3c7", 1.5, 0.36 * alpha);
  }
}

function drawMagnetTrail(context: CanvasLikeContext, from: Vec2, to: Vec2, color: string, alpha: number): void {
  drawLine(context, from, to, color, 2, alpha);
  drawLine(context, { x: from.x - 9, y: from.y + 8 }, { x: to.x - 3, y: to.y + 4 }, "#fef3c7", 1, alpha * 0.38);
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
