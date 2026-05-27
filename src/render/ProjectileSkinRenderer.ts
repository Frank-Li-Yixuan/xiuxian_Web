import type { CombatVisualBlendMode } from "../assets/CombatAssetRegistry";
import type {
  CanvasPresentationEnemyProjectile,
  CanvasPresentationPlayerProjectile,
  CanvasPresentationState
} from "./CanvasPresentationState";
import {
  drawFilledCircle,
  drawLine,
  drawRing,
  type CanvasLikeContext,
  type Vec2
} from "./PrimitiveDrawing";
import type { RenderCommand } from "./RenderLayerStack";
import type { LoadedSpriteAsset, SpriteAssetRegistry } from "./SpriteAssetRegistry";

export type ProjectileDensityMode = "full" | "simplified";

export interface ProjectileSkinRendererOptions {
  readonly spriteRegistry: SpriteAssetRegistry;
  readonly highDensityEnemyBulletThreshold?: number;
}

const PLAYER_PROJECTILE_ASSET_ID = "projectile.player_energy_01";
const ENEMY_PROJECTILE_ASSET_ID = "projectile.enemy_danger_01";

export class ProjectileSkinRenderer {
  private readonly spriteRegistry: SpriteAssetRegistry;
  private readonly highDensityEnemyBulletThreshold: number;

  public constructor(options: ProjectileSkinRendererOptions) {
    this.spriteRegistry = options.spriteRegistry;
    this.highDensityEnemyBulletThreshold = options.highDensityEnemyBulletThreshold ?? 80;
  }

  public resolveDensityMode(presentation: Pick<CanvasPresentationState, "enemyProjectiles">): ProjectileDensityMode {
    return presentation.enemyProjectiles.length > this.highDensityEnemyBulletThreshold ? "simplified" : "full";
  }

  public createCommands(
    presentation: Pick<CanvasPresentationState, "playerProjectiles" | "enemyProjectiles">
  ): readonly RenderCommand[] {
    const densityMode = this.resolveDensityMode(presentation);
    const commands: RenderCommand[] = [];

    for (const projectile of presentation.playerProjectiles) {
      commands.push({
        id: `projectile_skin_player_${projectile.entityId}`,
        layerId: playerProjectileLayer(projectile),
        draw: (context) => this.drawPlayerProjectile(context, projectile)
      });
    }

    for (const projectile of presentation.enemyProjectiles) {
      commands.push({
        id: `projectile_skin_enemy_${projectile.entityId}`,
        layerId: "enemy_bullets",
        draw: (context) => this.drawEnemyProjectile(context, projectile, densityMode)
      });
    }

    return Object.freeze(commands);
  }

  private drawPlayerProjectile(context: CanvasLikeContext, projectile: CanvasPresentationPlayerProjectile): void {
    const layerId = playerProjectileLayer(projectile);
    const commandId = `projectile_skin_player_${projectile.entityId}`;
    context.recordCommand?.(layerId, commandId);

    const color = projectile.ownerPlayerId === "p2" ? "#d946ef" : "#22d3ee";
    const rotation = rotationFromVelocity(projectile.velocity);

    if (projectile.renderKind === "flying_sword") {
      const asset = this.spriteRegistry.get(PLAYER_PROJECTILE_ASSET_ID);
      drawSpriteImage(context, asset, {
        position: projectile.position,
        rotation,
        scale: Math.max(0.72, projectile.radius / 7),
        alpha: 0.96,
        layerId,
        commandId
      });
      drawLine(
        context,
        trailingPoint(projectile.position, rotation, 15),
        trailingPoint(projectile.position, rotation, 42),
        color,
        2,
        0.34
      );
      return;
    }

    if (projectile.renderKind === "gourd_flame") {
      drawFilledCircle(context, projectile.position, projectile.radius + 9, "#f97316", 0.28);
      drawFilledCircle(context, projectile.position, projectile.radius + 3, "#fed7aa", 0.72);
      drawRing(context, projectile.position, projectile.radius + 9, "#f97316", 2, 0.82);
      return;
    }

    drawRing(context, projectile.position, projectile.radius + 18, "#facc15", 3, 0.78);
    drawLine(
      context,
      { x: projectile.position.x - 18, y: projectile.position.y },
      { x: projectile.position.x + 18, y: projectile.position.y },
      "#fef3c7",
      2,
      0.82
    );
    drawLine(
      context,
      { x: projectile.position.x, y: projectile.position.y - 18 },
      { x: projectile.position.x, y: projectile.position.y + 18 },
      "#fef3c7",
      2,
      0.62
    );
  }

  private drawEnemyProjectile(
    context: CanvasLikeContext,
    projectile: CanvasPresentationEnemyProjectile,
    densityMode: ProjectileDensityMode
  ): void {
    const layerId = "enemy_bullets";
    const commandId = `projectile_skin_enemy_${projectile.entityId}`;
    context.recordCommand?.(layerId, commandId);

    const color = enemyProjectileDangerColor(projectile);
    const radius = Math.max(7, projectile.radius);

    if (densityMode === "full") {
      const asset = this.spriteRegistry.get(ENEMY_PROJECTILE_ASSET_ID);
      drawSpriteImage(context, asset, {
        position: projectile.position,
        rotation: rotationFromVelocity(projectile.velocity),
        scale: Math.max(0.72, radius / 8),
        alpha: 0.72,
        layerId,
        commandId
      });
    }

    drawFilledCircle(context, projectile.position, radius + 5, color, projectile.renderKind === "boss_big" ? 0.28 : 0.2);
    drawFilledCircle(context, projectile.position, Math.max(3, radius * 0.42), "#ffffff", 0.98);
    drawRing(context, projectile.position, radius, color, projectile.renderKind === "boss_big" ? 4 : 3, 0.98);

    if (projectile.renderKind === "boss_big" || projectile.ownerKind === "tribulation") {
      drawLine(
        context,
        { x: projectile.position.x - radius * 1.45, y: projectile.position.y },
        { x: projectile.position.x + radius * 1.45, y: projectile.position.y },
        "#ffffff",
        1,
        0.86
      );
      drawLine(
        context,
        { x: projectile.position.x, y: projectile.position.y - radius * 1.45 },
        { x: projectile.position.x, y: projectile.position.y + radius * 1.45 },
        "#ffffff",
        1,
        0.86
      );
    }
  }
}

function playerProjectileLayer(projectile: CanvasPresentationPlayerProjectile): string {
  return projectile.renderKind === "seal_impact" ? "player_projectiles_high" : "player_projectiles_low";
}

function enemyProjectileDangerColor(projectile: CanvasPresentationEnemyProjectile): string {
  if (projectile.ownerKind === "tribulation") {
    return "#b91c1c";
  }
  if (projectile.renderKind === "boss_big") {
    return "#f97316";
  }
  if (projectile.ownerKind === "boss") {
    return "#ff3b7f";
  }
  return "#ef4444";
}

function drawSpriteImage(
  context: CanvasLikeContext,
  asset: LoadedSpriteAsset,
  options: {
    readonly position: Vec2;
    readonly rotation: number;
    readonly scale: number;
    readonly alpha: number;
    readonly layerId: string;
    readonly commandId: string;
  }
): void {
  if (context.drawImage === undefined) {
    return;
  }

  const anchor = asset.entry.anchor ?? { x: 0.5, y: 0.5 };
  const scale = (asset.entry.recommendedScale ?? 1) * options.scale;
  const blendMode = mapBlendMode(asset.entry.blendMode ?? "normal");

  context.save();
  try {
    context.globalAlpha = clamp01(options.alpha);
    (context as CanvasLikeContext & { globalCompositeOperation: GlobalCompositeOperation }).globalCompositeOperation = blendMode;
    context.translate?.(options.position.x, options.position.y);
    context.rotate?.(options.rotation);
    context.scale?.(scale, scale);
    context.drawImage(
      asset.image,
      0,
      0,
      asset.image.width,
      asset.image.height,
      -asset.image.width * anchor.x,
      -asset.image.height * anchor.y,
      asset.image.width,
      asset.image.height
    );
  } finally {
    context.restore();
  }
}

function rotationFromVelocity(velocity: Vec2): number {
  if (velocity.x === 0 && velocity.y === 0) {
    return 0;
  }
  return Math.atan2(velocity.y, velocity.x) + Math.PI / 2;
}

function trailingPoint(position: Vec2, rotation: number, distance: number): Vec2 {
  return {
    x: position.x - Math.sin(rotation) * distance,
    y: position.y + Math.cos(rotation) * distance
  };
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
