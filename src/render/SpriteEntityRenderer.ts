import type { CombatSpriteAnimationClip, CombatVisualBlendMode } from "../assets/CombatAssetRegistry";
import type {
  CanvasPresentationEnemy,
  CanvasPresentationEntityAnimationEvent,
  CanvasPresentationEntityAnimationName,
  CanvasPresentationPlayer,
  CanvasPresentationState,
  CanvasPresentationWarning
} from "./CanvasPresentationState";
import { drawFilledCircle, drawLine, drawRing, type CanvasLikeContext, type Vec2 } from "./PrimitiveDrawing";
import type { RenderCommand } from "./RenderLayerStack";
import type { LoadedSpriteAsset, SpriteAssetRegistry } from "./SpriteAssetRegistry";

export interface SpriteEntityRendererOptions {
  readonly spriteRegistry: SpriteAssetRegistry;
}

export type SpriteEntityResolveInput =
  | { readonly entityKind: "player"; readonly player: CanvasPresentationPlayer }
  | { readonly entityKind: "enemy"; readonly enemy: CanvasPresentationEnemy };

export interface SpriteEntityAnimationDescription {
  readonly clip: CanvasPresentationEntityAnimationName;
  readonly startFrame: number;
  readonly event?: CanvasPresentationEntityAnimationEvent;
}

const PLAYER_BODY_ASSET_ID = "entity.player.cultivator_01";
const PLAYER_SOUL_ASSET_ID = "entity.player.soul_01";

export class SpriteEntityRenderer {
  private readonly spriteRegistry: SpriteAssetRegistry;

  public constructor(options: SpriteEntityRendererOptions) {
    this.spriteRegistry = options.spriteRegistry;
  }

  public createCommands(presentation: Pick<CanvasPresentationState, "frame" | "players" | "enemies" | "warnings" | "entityAnimationEvents">): readonly RenderCommand[] {
    const commands: RenderCommand[] = [];

    for (const warning of presentation.warnings) {
      if (warning.kind === "wolf_charge") {
        commands.push({
          id: `sprite_entity_wolf_charge_${warning.id.replace(/^charge_/, "")}`,
          layerId: "tribulation_warnings",
          draw: (context) => drawWolfChargeWarning(context, warning)
        });
      }
    }

    for (const enemy of presentation.enemies) {
      const assetId = resolveSpriteEntityAssetId({ entityKind: "enemy", enemy });
      if (assetId === undefined || !this.spriteRegistry.has(assetId)) {
        commands.push({
          id: `sprite_entity_enemy_fallback_${enemy.entityId}`,
          layerId: "enemies",
          draw: (context) => drawEnemyFallback(context, enemy)
        });
        continue;
      }
      commands.push({
        id: `sprite_entity_enemy_${enemy.entityId}`,
        layerId: "enemies",
        draw: (context) => this.drawEnemy(context, presentation, enemy, assetId)
      });
    }

    for (const player of presentation.players) {
      const assetId = resolveSpriteEntityAssetId({ entityKind: "player", player });
      if (assetId === undefined || !this.spriteRegistry.has(assetId)) {
        commands.push({
          id: `sprite_entity_player_fallback_${player.playerId}`,
          layerId: player.aliveState === "soul" ? "rescue_and_soul" : "players",
          draw: (context) => drawPlayerFallback(context, player)
        });
        continue;
      }
      commands.push({
        id: `sprite_entity_player_${player.playerId}`,
        layerId: player.aliveState === "soul" ? "rescue_and_soul" : "players",
        draw: (context) => this.drawPlayer(context, presentation, player, assetId)
      });
    }

    return Object.freeze(commands);
  }

  private drawEnemy(
    context: CanvasLikeContext,
    presentation: Pick<CanvasPresentationState, "frame" | "entityAnimationEvents">,
    enemy: CanvasPresentationEnemy,
    assetId: string
  ): void {
    const commandId = `sprite_entity_enemy_${enemy.entityId}`;
    context.recordCommand?.("enemies", commandId);
    const asset = this.spriteRegistry.get(assetId);
    const animation = resolveSpriteEntityAnimation(presentation, enemy);
    const scale = enemy.renderKind === "elite_split_wind_wolf" ? 0.82 : enemy.renderKind === "stone_armor_demon" ? 0.9 : 0.72;
    const lean = enemy.animationHint === "attack" ? 0.15 : (enemy.velocity?.x ?? 0) / 1800;
    drawEntitySprite(context, asset, {
      frame: presentation.frame,
      animation,
      position: visualEnemyPosition(enemy, presentation.frame),
      scale,
      rotation: lean,
      alpha: animation.clip === "death" ? 0.72 : 0.98,
      layerId: "enemies",
      commandId
    });
    drawEnemyCue(context, enemy, animation);
    if (enemy.hpRatio < 0.95 && animation.clip !== "death") {
      drawLine(context, { x: enemy.position.x - 24, y: enemy.position.y + 34 }, { x: enemy.position.x + 24, y: enemy.position.y + 34 }, "#1f2937", 4, 0.8);
      drawLine(
        context,
        { x: enemy.position.x - 24, y: enemy.position.y + 34 },
        { x: enemy.position.x - 24 + 48 * enemy.hpRatio, y: enemy.position.y + 34 },
        enemy.renderKind === "stone_armor_demon" ? "#facc15" : "#22c55e",
        4,
        0.88
      );
    }
  }

  private drawPlayer(
    context: CanvasLikeContext,
    presentation: Pick<CanvasPresentationState, "frame" | "entityAnimationEvents">,
    player: CanvasPresentationPlayer,
    assetId: string
  ): void {
    const layerId = player.aliveState === "soul" ? "rescue_and_soul" : "players";
    const commandId = `sprite_entity_player_${player.playerId}`;
    context.recordCommand?.(layerId, commandId);
    const asset = this.spriteRegistry.get(assetId);
    const animation = resolveSpriteEntityAnimation(presentation, player);
    const color = player.renderColor === "player2" ? "#d946ef" : "#22d3ee";
    const hover = animation.clip === "soul" ? Math.sin(presentation.frame / 12) * 5 : Math.sin(presentation.frame / 20) * 3;
    const lean = animation.clip === "move" ? Math.max(-0.22, Math.min(0.22, (player.velocity?.x ?? 0) / 1200)) : 0;
    drawEntitySprite(context, asset, {
      frame: presentation.frame,
      animation,
      position: { x: player.position.x, y: player.position.y + hover },
      scale: animation.clip === "soul" ? 0.58 : 0.66,
      rotation: lean,
      alpha: player.focusActive ? 0.82 : 0.98,
      layerId,
      commandId
    });
    if (animation.clip === "cast") {
      drawRing(context, player.position, 34, color, 2.4, 0.72);
      drawRing(context, player.position, 48, "#fef3c7", 1.2, 0.38);
    } else if (animation.clip === "hit") {
      drawFilledCircle(context, player.position, 28, "#ffffff", 0.22);
    } else if (animation.clip === "soul") {
      drawRing(context, player.position, 28, "#facc15", 2.4, 0.7);
    }
  }
}

export function resolveSpriteEntityAssetId(input: SpriteEntityResolveInput): string | undefined {
  if (input.entityKind === "player") {
    return input.player.aliveState === "soul" || input.player.aliveState === "yang_shen" || input.player.aliveState === "reshaping"
      ? PLAYER_SOUL_ASSET_ID
      : PLAYER_BODY_ASSET_ID;
  }
  switch (input.enemy.renderKind) {
    case "mountain_imp":
      return "entity.enemy.mountain_imp_01";
    case "wolf_demon":
      return "entity.enemy.wolf_demon_01";
    case "elite_split_wind_wolf":
      return "entity.enemy.elite_split_wind_wolf_01";
    case "rogue_cultivator_shadow":
      return "entity.enemy.rogue_cultivator_shadow_01";
    case "stone_armor_demon":
      return "entity.enemy.stone_armor_demon_01";
    default:
      return undefined;
  }
}

export function resolveSpriteEntityAnimation(
  presentation: Pick<CanvasPresentationState, "frame" | "entityAnimationEvents">,
  entity: CanvasPresentationPlayer | CanvasPresentationEnemy
): SpriteEntityAnimationDescription {
  const entityKind = "playerId" in entity ? "player" : "enemy";
  const entityId = "playerId" in entity ? entity.playerId : String(entity.entityId);
  if ("playerId" in entity) {
    if (entity.aliveState === "soul" || entity.aliveState === "yang_shen" || entity.aliveState === "reshaping") {
      return { clip: "soul", startFrame: entity.spawnFrame ?? 0 };
    }
    const active = activeAnimationEvent(presentation, entityKind, entityId);
    if (active !== undefined && (active.animation !== "cast" || active.sourceId !== undefined || speedOf(entity.velocity) > 1)) {
      return { clip: active.animation, startFrame: active.startFrame, event: active };
    }
    if (entity.animationHint !== undefined) {
      return { clip: entity.animationHint, startFrame: entity.spawnFrame ?? 0 };
    }
    return { clip: speedOf(entity.velocity) > 1 ? "move" : "idle", startFrame: entity.spawnFrame ?? 0 };
  }
  const active = activeAnimationEvent(presentation, entityKind, entityId);
  if (active !== undefined) {
    return { clip: active.animation, startFrame: active.startFrame, event: active };
  }
  if (entity.animationHint !== undefined) {
    return { clip: entity.animationHint, startFrame: entity.spawnFrame ?? 0 };
  }
  return { clip: speedOf(entity.velocity) > 1 ? "move" : "idle", startFrame: entity.spawnFrame ?? 0 };
}

function activeAnimationEvent(
  presentation: Pick<CanvasPresentationState, "frame" | "entityAnimationEvents">,
  entityKind: "player" | "enemy",
  entityId: string
): CanvasPresentationEntityAnimationEvent | undefined {
  const activeEvents = (presentation.entityAnimationEvents ?? []).filter(
    (event) =>
      event.entityKind === entityKind &&
      event.entityId === entityId &&
      event.startFrame <= presentation.frame &&
      event.endFrame >= presentation.frame
  );
  return activeEvents.sort((left, right) => animationPriority(right.animation) - animationPriority(left.animation) || right.startFrame - left.startFrame)[0];
}

function animationPriority(animation: CanvasPresentationEntityAnimationName): number {
  switch (animation) {
    case "death":
      return 5;
    case "hit":
      return 4;
    case "cast":
      return 3;
    case "attack":
      return 2;
    case "move":
      return 1;
    default:
      return 0;
  }
}

function drawEntitySprite(
  context: CanvasLikeContext,
  asset: LoadedSpriteAsset,
  options: {
    readonly frame: number;
    readonly animation: SpriteEntityAnimationDescription;
    readonly position: Vec2;
    readonly scale: number;
    readonly rotation: number;
    readonly alpha: number;
    readonly layerId: string;
    readonly commandId: string;
  }
): void {
  if (context.drawImage === undefined) {
    return;
  }
  const source = sourceRectFor(asset, options.animation, options.frame);
  const anchor = asset.entry.anchor ?? { x: 0.5, y: 0.68 };
  const scale = (asset.entry.recommendedScale ?? 1) * options.scale;

  context.save();
  try {
    context.globalAlpha = options.alpha;
    (context as CanvasLikeContext & { globalCompositeOperation: GlobalCompositeOperation }).globalCompositeOperation = mapBlendMode(asset.entry.blendMode ?? "normal");
    context.translate?.(options.position.x, options.position.y);
    context.rotate?.(options.rotation);
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

function sourceRectFor(asset: LoadedSpriteAsset, animation: SpriteEntityAnimationDescription, currentFrame: number): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  const width = positive(asset.entry.frameWidth, asset.image.width);
  const height = positive(asset.entry.frameHeight, asset.image.height);
  const fallbackClip = {
    startFrame: 0,
    frameCount: Math.max(1, asset.entry.frameCount ?? Math.floor(asset.image.width / width)),
    fps: asset.entry.fps ?? 12,
    loop: asset.entry.loop === true
  };
  const clip: CombatSpriteAnimationClip = asset.entry.animationClips?.[animation.clip] ?? fallbackClip;
  const elapsed = Math.max(0, Math.trunc(currentFrame) - Math.trunc(animation.startFrame));
  const clipFrame = Math.floor((elapsed * clip.fps) / 60);
  const localIndex = clip.loop ? clipFrame % clip.frameCount : Math.min(clip.frameCount - 1, clipFrame);
  const index = clip.startFrame + localIndex;
  const framesPerRow = Math.max(1, Math.floor(asset.image.width / width));
  return {
    x: (index % framesPerRow) * width,
    y: Math.floor(index / framesPerRow) * height,
    width,
    height
  };
}

function drawEnemyCue(context: CanvasLikeContext, enemy: CanvasPresentationEnemy, animation: SpriteEntityAnimationDescription): void {
  if (enemy.renderKind === "rogue_cultivator_shadow" && animation.clip === "attack") {
    drawRing(context, enemy.position, 38, "#a855f7", 2.4, 0.7);
    drawLine(context, { x: enemy.position.x - 22, y: enemy.position.y }, { x: enemy.position.x + 22, y: enemy.position.y }, "#d8b4fe", 1.4, 0.55);
  }
  if (enemy.renderKind === "stone_armor_demon" && animation.clip === "hit") {
    drawFilledCircle(context, { x: enemy.position.x - 12, y: enemy.position.y - 8 }, 4, "#facc15", 0.9);
    drawLine(context, { x: enemy.position.x - 24, y: enemy.position.y - 10 }, { x: enemy.position.x + 22, y: enemy.position.y + 12 }, "#fef3c7", 2.2, 0.82);
    drawLine(context, { x: enemy.position.x + 20, y: enemy.position.y - 18 }, { x: enemy.position.x - 12, y: enemy.position.y + 18 }, "#facc15", 1.8, 0.72);
  }
  if ((enemy.renderKind === "wolf_demon" || enemy.renderKind === "elite_split_wind_wolf") && animation.clip === "attack") {
    drawLine(context, enemy.position, { x: enemy.position.x, y: enemy.position.y + 80 }, "#f97316", 2.4, 0.6);
  }
}

function drawWolfChargeWarning(context: CanvasLikeContext, warning: CanvasPresentationWarning): void {
  context.recordCommand?.("tribulation_warnings", `sprite_entity_wolf_charge_${warning.id.replace(/^charge_/, "")}`);
  const color = warning.severity === "high" ? "#f97316" : "#fb7185";
  drawRing(context, warning.position, warning.radius, color, 3, 0.6);
  drawLine(context, { x: warning.position.x, y: warning.position.y - warning.radius * 0.9 }, { x: warning.position.x, y: warning.position.y + warning.radius * 1.45 }, color, 4, 0.62);
  drawLine(context, { x: warning.position.x - 18, y: warning.position.y + warning.radius * 0.8 }, { x: warning.position.x + 18, y: warning.position.y + warning.radius * 0.8 }, "#ffffff", 1.4, 0.48);
}

function drawEnemyFallback(context: CanvasLikeContext, enemy: CanvasPresentationEnemy): void {
  context.recordCommand?.("enemies", `sprite_entity_enemy_fallback_${enemy.entityId}`);
  drawFilledCircle(context, enemy.position, enemy.renderKind === "stone_armor_demon" ? 28 : 20, "#111827", 0.9);
  drawRing(context, enemy.position, enemy.renderKind === "unknown" ? 19 : 24, "#f97316", 2, 0.78);
}

function drawPlayerFallback(context: CanvasLikeContext, player: CanvasPresentationPlayer): void {
  const layerId = player.aliveState === "soul" ? "rescue_and_soul" : "players";
  context.recordCommand?.(layerId, `sprite_entity_player_fallback_${player.playerId}`);
  const color = player.renderColor === "player2" ? "#d946ef" : "#22d3ee";
  drawFilledCircle(context, player.position, player.aliveState === "soul" ? 14 : 20, "#0f172a", 0.9);
  drawRing(context, player.position, player.aliveState === "soul" ? 25 : 28, color, 2.2, 0.78);
}

function visualEnemyPosition(enemy: CanvasPresentationEnemy, frame: number): Vec2 {
  if (enemy.renderKind === "rogue_cultivator_shadow") {
    return { x: enemy.position.x, y: enemy.position.y + Math.sin((frame + enemy.entityId) / 18) * 2 };
  }
  return enemy.position;
}

function speedOf(velocity: Vec2 | undefined): number {
  if (velocity === undefined) {
    return 0;
  }
  return Math.hypot(velocity.x, velocity.y);
}

function positive(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;
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
