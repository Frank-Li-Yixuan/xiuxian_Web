import type { EffectEvent } from "../sim/spells/SpellEffects";
import type {
  CanvasPresentationBoss,
  CanvasPresentationEnemy,
  CanvasPresentationEnemyProjectile,
  CanvasPresentationPickup,
  CanvasPresentationPlayer,
  CanvasPresentationPlayerProjectile,
  CanvasPresentationState,
  CanvasPresentationWarning
} from "./CanvasPresentationState";
import type {
  BossHudViewState,
  InRunUiViewState,
  LightningWarningViewState,
  PlayerHudViewState
} from "../view/InRunViewState";
import {
  clearCanvas,
  drawFilledCircle,
  drawLine,
  drawRing,
  drawText,
  fillRect,
  type CanvasLikeContext,
  type Vec2
} from "./PrimitiveDrawing";
import {
  createRenderLayerStack,
  type RenderCommand,
  type RenderLayerDefinition,
  type RenderLayerStack
} from "./RenderLayerStack";
import type { AbilityVfxRenderer } from "./AbilityVfxRenderer";
import type { CombatVfxRenderer } from "./CombatVfxRenderer";
import { computeImpactScreenShake, ImpactVfxRenderer } from "./ImpactVfxRenderer";
import type { PickupPresentationSystem } from "./PickupPresentationSystem";
import type { ProjectileSkinRenderer } from "./ProjectileSkinRenderer";
import type { SpriteEntityRenderer } from "./SpriteEntityRenderer";

export interface CanvasRendererOptions {
  readonly layerStack?: RenderLayerStack;
  readonly abilityVfxRenderer?: AbilityVfxRenderer;
  readonly combatVfxRenderer?: CombatVfxRenderer;
  readonly impactVfxRenderer?: ImpactVfxRenderer;
  readonly projectileSkinRenderer?: ProjectileSkinRenderer;
  readonly pickupPresentationSystem?: PickupPresentationSystem;
  readonly spriteEntityRenderer?: SpriteEntityRenderer;
}

export interface CanvasRenderFrame {
  readonly viewState: InRunUiViewState;
  readonly effectEvents: readonly EffectEvent[];
  readonly presentation?: CanvasPresentationState;
  readonly outgameSummary?: CanvasSettlementSummary;
}

export interface CanvasSettlementSummary {
  readonly receiptId: string;
  readonly resourcesKept: Readonly<Record<string, number>>;
  readonly upgrades: readonly string[];
  readonly secondRunPowerDelta: number;
}

const DEFAULT_RENDER_LAYERS: readonly RenderLayerDefinition[] = [
  { id: "background_far", z: 0, description: "星空、云雾、远山" },
  { id: "background_near", z: 10, description: "地面卷轴、灵脉纹理" },
  { id: "pickup_trails", z: 20, description: "掉落吸附尾迹" },
  { id: "player_projectiles_low", z: 30, description: "普通飞剑、葫芦火苗" },
  { id: "enemies", z: 40, description: "小怪、精英" },
  { id: "boss", z: 50, description: "Boss 本体" },
  { id: "player_projectiles_high", z: 60, description: "法术核心线条，仍低于敌弹" },
  { id: "enemy_bullets", z: 70, description: "普通敌弹，高对比" },
  { id: "tribulation_warnings", z: 80, description: "雷劫预警圈/锁定光柱" },
  { id: "tribulation_strikes", z: 90, description: "天雷实体" },
  { id: "players", z: 100, description: "玩家与队友" },
  { id: "rescue_and_soul", z: 110, description: "聚灵阵、神魂" },
  { id: "foreground_effects", z: 120, description: "浮字、碎片、清场余波" },
  { id: "player_hitbox", z: 140, description: "专注模式判定点" },
  { id: "hud", z: 200, description: "局内 HUD" },
  { id: "major_overlay", z: 300, description: "顿悟、暂停、结算" }
];

export class CanvasRenderer {
  private readonly layerStack: RenderLayerStack;
  private readonly abilityVfxRenderer: AbilityVfxRenderer | undefined;
  private readonly combatVfxRenderer: CombatVfxRenderer | undefined;
  private readonly impactVfxRenderer: ImpactVfxRenderer;
  private readonly projectileSkinRenderer: ProjectileSkinRenderer | undefined;
  private readonly pickupPresentationSystem: PickupPresentationSystem | undefined;
  private readonly spriteEntityRenderer: SpriteEntityRenderer | undefined;

  public constructor(options: CanvasRendererOptions = {}) {
    this.layerStack = options.layerStack ?? createRenderLayerStack(DEFAULT_RENDER_LAYERS);
    this.abilityVfxRenderer = options.abilityVfxRenderer;
    this.combatVfxRenderer = options.combatVfxRenderer;
    this.impactVfxRenderer = options.impactVfxRenderer ?? new ImpactVfxRenderer();
    this.projectileSkinRenderer = options.projectileSkinRenderer;
    this.pickupPresentationSystem = options.pickupPresentationSystem;
    this.spriteEntityRenderer = options.spriteEntityRenderer;
  }

  public buildRenderCommands(frame: CanvasRenderFrame): readonly RenderCommand[] {
    const commands: RenderCommand[] = [
      {
        id: "background_far",
        layerId: "background_far",
        draw: (context) => drawBackgroundFar(context, frame.viewState)
      },
      {
        id: "background_near",
        layerId: "background_near",
        draw: (context) => drawBackgroundNear(context, frame.viewState)
      }
    ];

    if (frame.presentation !== undefined) {
      const presentationOptions: {
        abilityVfxRenderer?: AbilityVfxRenderer;
        impactVfxRenderer: ImpactVfxRenderer;
        projectileSkinRenderer?: ProjectileSkinRenderer;
        pickupPresentationSystem?: PickupPresentationSystem;
        spriteEntityRenderer?: SpriteEntityRenderer;
      } = { impactVfxRenderer: this.impactVfxRenderer };
      if (this.abilityVfxRenderer !== undefined) {
        presentationOptions.abilityVfxRenderer = this.abilityVfxRenderer;
      }
      if (this.projectileSkinRenderer !== undefined) {
        presentationOptions.projectileSkinRenderer = this.projectileSkinRenderer;
      }
      if (this.pickupPresentationSystem !== undefined) {
        presentationOptions.pickupPresentationSystem = this.pickupPresentationSystem;
      }
      if (this.spriteEntityRenderer !== undefined) {
        presentationOptions.spriteEntityRenderer = this.spriteEntityRenderer;
      }
      commands.push(...createPresentationCommands(frame.presentation, presentationOptions));
      if (this.combatVfxRenderer !== undefined) {
        commands.push(...this.combatVfxRenderer.createCommands(frame.presentation));
      }
    }

    for (let index = 0; index < frame.effectEvents.length; index += 1) {
      const event = frame.effectEvents[index];
      if (event === undefined) {
        continue;
      }
      if (frame.presentation !== undefined && isPresentationBackedEffect(event.effectId)) {
        continue;
      }
      if (frame.presentation !== undefined && this.abilityVfxRenderer !== undefined && isAbilityBackedEffect(event.effectId)) {
        continue;
      }
      commands.push(createEffectCommand(event, index));
    }

    for (const warning of frame.viewState.tribulation?.lightningWarnings ?? []) {
      commands.push(createTribulationWarningCommand(warning));
    }

    if (frame.viewState.rescue?.visible === true) {
      commands.push({
        id: `rescue_${frame.viewState.rescue.downedPlayerId}`,
        layerId: "rescue_and_soul",
        draw: (context) => drawRescueOverlay(context, frame.viewState)
      });
    }

    if (frame.presentation === undefined) {
      commands.push({
        id: "hud_stage",
        layerId: "hud",
        draw: (context) => drawStageHud(context, frame.viewState)
      });
    }
    commands.push({
      id: "hud_team_insight",
      layerId: "hud",
      draw: (context) => drawTeamInsightHud(context, frame.viewState)
    });

    const boss = frame.viewState.boss;
    if (boss?.visible === true) {
      commands.push({
        id: "hud_boss",
        layerId: "hud",
        draw: (context) => drawBossHud(context, boss)
      });
    }

    if (frame.presentation === undefined) {
      for (const player of frame.viewState.players) {
        commands.push({
          id: `hud_${player.playerId}`,
          layerId: "hud",
          draw: (context) => drawPlayerHud(context, player)
        });
      }
    }

    if (frame.viewState.insight?.visible === true) {
      commands.push({
        id: "insight_overlay",
        layerId: "major_overlay",
        draw: (context) => drawMajorOverlay(context, frame.viewState)
      });
    }
    const outgameSummary = frame.outgameSummary;
    if (outgameSummary !== undefined) {
      commands.push({
        id: "settlement_overlay",
        layerId: "major_overlay",
        draw: (context) => drawSettlementOverlay(context, frame.viewState, outgameSummary)
      });
    } else if (isStartBannerVisible(frame.viewState)) {
      commands.push({
        id: "start_overlay",
        layerId: "major_overlay",
        draw: (context) => drawStartOverlay(context, frame.viewState)
      });
    }

    return this.layerStack.sortCommands(commands);
  }

  public renderFrame(context: CanvasLikeContext, frame: CanvasRenderFrame): void {
    clearCanvas(context, frame.viewState.screen.width, frame.viewState.screen.height);
    const shake = computeScreenShake(frame.effectEvents, frame.presentation);
    context.save();
    try {
      context.translate?.(shake.x, shake.y);
      this.renderCommands(context, this.buildRenderCommands(frame));
    } finally {
      context.restore();
    }
  }

  public renderCommands(context: CanvasLikeContext, commands: readonly RenderCommand[]): void {
    this.layerStack.flush(context, commands);
  }
}

function createPresentationCommands(
  presentation: CanvasPresentationState,
  options: {
    readonly abilityVfxRenderer?: AbilityVfxRenderer;
    readonly impactVfxRenderer: ImpactVfxRenderer;
    readonly projectileSkinRenderer?: ProjectileSkinRenderer;
    readonly pickupPresentationSystem?: PickupPresentationSystem;
    readonly spriteEntityRenderer?: SpriteEntityRenderer;
  }
): readonly RenderCommand[] {
  const commands: RenderCommand[] = [];

  if (options.pickupPresentationSystem !== undefined) {
    commands.push(...options.pickupPresentationSystem.createCommands({ frame: presentation.frame, pickups: presentation.pickups }));
  } else {
    for (const pickup of presentation.pickups) {
      commands.push({
        id: `presentation_pickup_${pickup.entityId}`,
        layerId: "pickup_trails",
        draw: (context) => drawPresentationPickup(context, pickup)
      });
    }
  }

  if (options.projectileSkinRenderer !== undefined) {
    commands.push(...options.projectileSkinRenderer.createCommands(presentation));
  } else {
    for (const projectile of presentation.playerProjectiles) {
      commands.push({
        id: `presentation_player_projectile_${projectile.entityId}`,
        layerId: projectile.renderKind === "seal_impact" ? "player_projectiles_high" : "player_projectiles_low",
        draw: (context) => drawPresentationPlayerProjectile(context, projectile)
      });
    }
  }
  if (options.spriteEntityRenderer !== undefined) {
    commands.push(...options.spriteEntityRenderer.createCommands(presentation));
  } else {
    for (const enemy of presentation.enemies) {
      commands.push({
        id: `presentation_enemy_${enemy.entityId}`,
        layerId: "enemies",
        draw: (context) => drawPresentationEnemy(context, enemy)
      });
    }
  }
  const boss = presentation.boss;
  if (boss !== undefined) {
    commands.push({
      id: "presentation_boss",
      layerId: "boss",
      draw: (context) => drawPresentationBoss(context, boss)
    });
  }
  if (options.projectileSkinRenderer === undefined) {
    for (const projectile of presentation.enemyProjectiles) {
      commands.push({
        id: `presentation_enemy_projectile_${projectile.entityId}`,
        layerId: "enemy_bullets",
        draw: (context) => drawPresentationEnemyProjectile(context, projectile)
      });
    }
  }
  for (const warning of presentation.warnings) {
    if (warning.kind !== "tribulation") {
      if (options.spriteEntityRenderer !== undefined && warning.kind === "wolf_charge") {
        continue;
      }
      commands.push({
        id: `presentation_warning_${warning.id}`,
        layerId: "tribulation_warnings",
        draw: (context) => drawPresentationWarning(context, warning)
      });
    }
  }
  for (const player of presentation.players) {
    if (options.spriteEntityRenderer === undefined) {
      commands.push({
        id: `presentation_player_${player.playerId}`,
        layerId: player.aliveState === "soul" ? "rescue_and_soul" : "players",
        draw: (context) => drawPresentationPlayer(context, player)
      });
    }
    commands.push({
      id: `presentation_player_hitbox_${player.playerId}`,
      layerId: "player_hitbox",
      draw: (context) => drawPresentationPlayerHitbox(context, player)
    });
  }
  commands.push(...options.impactVfxRenderer.createCommands(presentation));
  if (options.abilityVfxRenderer !== undefined) {
    commands.push(...options.abilityVfxRenderer.createCommands(presentation));
  }
  return commands;
}

function createEffectCommand(event: EffectEvent, index: number): RenderCommand {
  const layerId = layerForEffect(event.effectId);
  return {
    id: `effect_${event.effectId}_${index}`,
    layerId,
    draw: (context) => drawEffectEvent(context, event, layerId)
  };
}

function isPresentationBackedEffect(effectId: string): boolean {
  return [
    "enemy_body",
    "boss_body",
    "player_body",
    "soul_body",
    "player_hitbox",
    "pickup_trail",
    "player_projectile_low",
    "enemy_bullet"
  ].includes(effectId);
}

function isAbilityBackedEffect(effectId: string): boolean {
  return [
    "thunder_gather",
    "thunder_chain_hit",
    "lotus_area_warning",
    "low_flame_field",
    "bagua_ring_open",
    "void_fan_open",
    "bullet_absorb_lines",
    "void_core_compress",
    "sword_qi_reflect",
    "spell_damage_field",
    "spell_cast_failed"
  ].includes(effectId);
}

function createTribulationWarningCommand(warning: LightningWarningViewState): RenderCommand {
  return {
    id: `tribulation_warning_${warning.id}`,
    layerId: "tribulation_warnings",
    draw: (context) => drawTribulationWarning(context, warning)
  };
}

function drawPresentationPickup(context: CanvasLikeContext, pickup: CanvasPresentationPickup): void {
  context.recordCommand?.("pickup_trails", `presentation_pickup_${pickup.entityId}`);
  const color = pickup.renderKind === "spirit_exp" ? "#34d399" : pickup.renderKind === "qi_orb" ? "#38bdf8" : "#facc15";
  withGlow(context, color, 18, () => {
    drawRing(context, pickup.position, 15, color, 2, 0.78);
    drawFilledCircle(context, pickup.position, 8, color, 0.62);
    drawText(context, pickup.label, pickup.position, "#ffffff", "bold 12px system-ui, sans-serif", "center", 0.96);
  });
}

function drawPresentationPlayerProjectile(context: CanvasLikeContext, projectile: CanvasPresentationPlayerProjectile): void {
  context.recordCommand?.("player_projectiles_low", `presentation_player_projectile_${projectile.entityId}`);
  const color = playerColor(projectile.ownerPlayerId);
  if (projectile.renderKind === "seal_impact") {
    withGlow(context, "#facc15", 18, () => {
      drawRing(context, projectile.position, 22, "#facc15", 3, 0.8);
      drawLine(context, { x: projectile.position.x - 18, y: projectile.position.y }, { x: projectile.position.x + 18, y: projectile.position.y }, "#fef3c7", 2, 0.8);
    });
    return;
  }
  if (projectile.renderKind === "gourd_flame") {
    withGlow(context, "#f97316", 16, () => {
      drawPolygon(
        context,
        [
          { x: projectile.position.x, y: projectile.position.y - 20 },
          { x: projectile.position.x + 9, y: projectile.position.y + 8 },
          { x: projectile.position.x, y: projectile.position.y + 18 },
          { x: projectile.position.x - 9, y: projectile.position.y + 8 }
        ],
        "#f97316",
        "#fed7aa",
        1.5,
        0.86
      );
    });
    return;
  }
  withGlow(context, color, 16, () => {
    drawPolygon(
      context,
      [
        { x: projectile.position.x, y: projectile.position.y - 24 },
        { x: projectile.position.x + 8, y: projectile.position.y + 6 },
        { x: projectile.position.x, y: projectile.position.y + 24 },
        { x: projectile.position.x - 8, y: projectile.position.y + 6 }
      ],
      color,
      "#ffffff",
      1.4,
      0.88
    );
    drawLine(context, { x: projectile.position.x, y: projectile.position.y + 22 }, { x: projectile.position.x, y: projectile.position.y + 42 }, color, 2, 0.28);
  });
}

function drawPresentationEnemy(context: CanvasLikeContext, enemy: CanvasPresentationEnemy): void {
  context.recordCommand?.("enemies", `presentation_enemy_${enemy.entityId}`);
  const style = enemyStyle(enemy.renderKind);
  withGlow(context, style.stroke, style.glow, () => {
    drawPolygon(context, enemyShape(enemy), style.fill, style.stroke, style.lineWidth, 0.92);
    drawFilledCircle(context, enemy.position, style.coreRadius, style.stroke, 0.84);
    if (enemy.hpRatio < 0.95) {
      fillRect(context, { x: enemy.position.x - 24, y: enemy.position.y + 30, width: 48, height: 4 }, "#1f2937", 0.8);
      fillRect(context, { x: enemy.position.x - 24, y: enemy.position.y + 30, width: 48 * enemy.hpRatio, height: 4 }, style.stroke, 0.88);
    }
  });
}

function drawPresentationBoss(context: CanvasLikeContext, boss: CanvasPresentationBoss): void {
  context.recordCommand?.("boss", "presentation_boss");
  const color = boss.phaseIndex >= 3 ? "#f97316" : boss.phaseIndex >= 2 ? "#a855f7" : "#22d3ee";
  const x = boss.position.x;
  const y = boss.position.y;
  withGlow(context, color, 36, () => {
    drawFilledCircle(context, boss.position, 108, color, 0.08);
    drawRing(context, boss.position, 94, color, 3, 0.42);
    drawPolygon(
      context,
      [
        { x, y: y + 78 },
        { x: x + 82, y: y + 4 },
        { x: x + 66, y: y - 72 },
        { x: x + 26, y: y - 34 },
        { x: x - 26, y: y - 34 },
        { x: x - 66, y: y - 72 },
        { x: x - 82, y: y + 4 }
      ],
      "#0f172a",
      color,
      5,
      0.96
    );
    drawFilledCircle(context, boss.position, 16 + boss.phaseIndex * 2, "#ffffff", 0.94);
    drawRing(context, boss.position, 34 + boss.phaseIndex * 7, "#fef3c7", 1.5, 0.38);
  });
  if (boss.warningText !== undefined) {
    drawText(context, boss.warningText, { x: 960, y: 84 }, "#fecaca", "14px system-ui, sans-serif", "center", 0.92);
  }
}

function drawPresentationEnemyProjectile(context: CanvasLikeContext, projectile: CanvasPresentationEnemyProjectile): void {
  context.recordCommand?.("enemy_bullets", `presentation_enemy_projectile_${projectile.entityId}`);
  const color = projectile.renderKind === "boss_big" ? "#f97316" : projectile.ownerKind === "boss" ? "#ff3b7f" : "#ef4444";
  const radius = Math.max(7, projectile.radius);
  withGlow(context, color, projectile.renderKind === "boss_big" ? 22 : 13, () => {
    drawFilledCircle(context, projectile.position, radius + 5, color, 0.2);
    drawFilledCircle(context, projectile.position, radius, "#ffffff", 0.98);
    drawRing(context, projectile.position, radius, color, projectile.renderKind === "boss_big" ? 4 : 3, 0.98);
    if (projectile.renderKind === "boss_big") {
      drawLine(context, { x: projectile.position.x - radius * 1.5, y: projectile.position.y }, { x: projectile.position.x + radius * 1.5, y: projectile.position.y }, "#ffffff", 1, 0.9);
      drawLine(context, { x: projectile.position.x, y: projectile.position.y - radius * 1.5 }, { x: projectile.position.x, y: projectile.position.y + radius * 1.5 }, "#ffffff", 1, 0.9);
    }
  });
}

function drawPresentationWarning(context: CanvasLikeContext, warning: CanvasPresentationWarning): void {
  context.recordCommand?.("tribulation_warnings", `presentation_warning_${warning.id}`);
  const color = warning.severity === "lethal" ? "#ff1f3d" : "#f97316";
  drawRing(context, warning.position, warning.radius, color, 3, 0.68);
  drawLine(context, { x: warning.position.x - warning.radius, y: warning.position.y }, { x: warning.position.x + warning.radius, y: warning.position.y }, color, 2, 0.5);
}

function drawPresentationPlayer(context: CanvasLikeContext, player: CanvasPresentationPlayer): void {
  context.recordCommand?.(player.aliveState === "soul" ? "rescue_and_soul" : "players", `presentation_player_${player.playerId}`);
  const color = player.renderColor === "player2" ? "#d946ef" : "#22d3ee";
  const x = player.position.x;
  const y = player.position.y;
  if (player.aliveState === "soul") {
    withGlow(context, "#facc15", 22, () => {
      drawRing(context, player.position, 26, "#facc15", 2.5, 0.7);
      drawFilledCircle(context, player.position, 10, "#fde68a", 0.46);
    });
    return;
  }
  withGlow(context, color, 24, () => {
    drawPolygon(
      context,
      [
        { x, y: y - 32 },
        { x: x + 24, y: y + 28 },
        { x, y: y + 12 },
        { x: x - 24, y: y + 28 }
      ],
      "#0f172a",
      color,
      3,
      player.focusActive ? 0.78 : 0.96
    );
    drawFilledCircle(context, player.position, 5 + Math.min(6, player.realmLayer), "#fef3c7", 0.95);
    drawRing(context, player.position, 31, color, 1.8, 0.24 + player.qiRatio * 0.25);
  });
}

function drawPresentationPlayerHitbox(context: CanvasLikeContext, player: CanvasPresentationPlayer): void {
  context.recordCommand?.("player_hitbox", `presentation_player_hitbox_${player.playerId}`);
  drawRing(context, player.position, 14, "#fef3c7", 1.5, player.focusActive ? 0.88 : 0.34);
  drawFilledCircle(context, player.position, 7, "#ffffff", player.focusActive ? 0.98 : 0.72);
}

function drawPolygon(
  context: CanvasLikeContext,
  points: readonly Vec2[],
  fillStyle: string,
  strokeStyle: string,
  lineWidth = 2,
  alpha = 1
): void {
  if (points.length === 0) {
    return;
  }
  context.save();
  try {
    context.globalAlpha = alpha;
    context.fillStyle = fillStyle;
    context.strokeStyle = strokeStyle;
    context.lineWidth = lineWidth;
    context.beginPath();
    context.moveTo(points[0]?.x ?? 0, points[0]?.y ?? 0);
    for (let index = 1; index < points.length; index += 1) {
      const point = points[index];
      if (point !== undefined) {
        context.lineTo(point.x, point.y);
      }
    }
    context.closePath();
    context.fill();
    context.stroke();
  } finally {
    context.restore();
  }
}

function withGlow(context: CanvasLikeContext, color: string, blur: number, draw: () => void): void {
  context.save();
  try {
    const glowContext = context as CanvasLikeContext & { shadowBlur?: number; shadowColor?: string };
    glowContext.shadowBlur = blur;
    glowContext.shadowColor = color;
    draw();
  } finally {
    context.restore();
  }
}

function playerColor(playerId: string): string {
  return playerId === "p2" ? "#d946ef" : "#22d3ee";
}

function enemyStyle(kind: CanvasPresentationEnemy["renderKind"]): {
  readonly fill: string;
  readonly stroke: string;
  readonly glow: number;
  readonly lineWidth: number;
  readonly coreRadius: number;
} {
  switch (kind) {
    case "wolf_demon":
      return { fill: "#160b12", stroke: "#f43f5e", glow: 18, lineWidth: 2.6, coreRadius: 4 };
    case "rogue_cultivator_shadow":
      return { fill: "#100824", stroke: "#a855f7", glow: 20, lineWidth: 2.4, coreRadius: 5 };
    case "stone_armor_demon":
      return { fill: "#18120b", stroke: "#ca8a04", glow: 16, lineWidth: 3.2, coreRadius: 7 };
    case "elite_split_wind_wolf":
      return { fill: "#120a14", stroke: "#fb7185", glow: 24, lineWidth: 3.4, coreRadius: 7 };
    case "mountain_imp":
      return { fill: "#061711", stroke: "#22c55e", glow: 14, lineWidth: 2.2, coreRadius: 4 };
    default:
      return { fill: "#111827", stroke: "#f97316", glow: 14, lineWidth: 2.2, coreRadius: 4 };
  }
}

function enemyShape(enemy: CanvasPresentationEnemy): readonly Vec2[] {
  const x = enemy.position.x;
  const y = enemy.position.y;
  switch (enemy.renderKind) {
    case "wolf_demon":
    case "elite_split_wind_wolf":
      return [
        { x, y: y + 27 },
        { x: x + 28, y: y - 28 },
        { x, y: y - 12 },
        { x: x - 28, y: y - 28 }
      ];
    case "stone_armor_demon":
      return [
        { x: x + 32, y },
        { x: x + 16, y: y + 30 },
        { x: x - 16, y: y + 30 },
        { x: x - 32, y },
        { x: x - 16, y: y - 30 },
        { x: x + 16, y: y - 30 }
      ];
    case "rogue_cultivator_shadow":
      return [
        { x, y: y - 30 },
        { x: x + 24, y: y - 4 },
        { x: x + 14, y: y + 28 },
        { x, y: y + 12 },
        { x: x - 14, y: y + 28 },
        { x: x - 24, y: y - 4 }
      ];
    default:
      return [
        { x, y: y + 24 },
        { x: x + 24, y: y - 12 },
        { x: x + 12, y: y - 26 },
        { x: x - 12, y: y - 26 },
        { x: x - 24, y: y - 12 }
      ];
  }
}

function layerForEffect(effectId: string): string {
  switch (effectId) {
    case "enemy_bullet":
      return "enemy_bullets";
    case "enemy_body":
      return "enemies";
    case "boss_body":
      return "boss";
    case "player_body":
      return "players";
    case "soul_body":
      return "rescue_and_soul";
    case "player_hitbox":
      return "player_hitbox";
    case "tribulation_strike":
      return "tribulation_strikes";
    case "pickup_trail":
      return "pickup_trails";
    case "player_projectile_low":
      return "player_projectiles_low";
    case "thunder_gather":
    case "thunder_chain_hit":
    case "lotus_area_warning":
    case "low_flame_field":
    case "bagua_ring_open":
    case "void_fan_open":
    case "bullet_absorb_lines":
    case "spell_damage_field":
      return "player_projectiles_high";
    default:
      return "foreground_effects";
  }
}

function drawBackgroundFar(context: CanvasLikeContext, viewState: InRunUiViewState): void {
  fillRect(context, { x: 0, y: 0, width: viewState.screen.width, height: viewState.screen.height }, "#060b14", 1);
  const starCount = 42;
  for (let index = 0; index < starCount; index += 1) {
    const x = (index * 173 + 97) % viewState.screen.width;
    const y = (index * 251 + viewState.stage.segmentIndex * 31) % viewState.screen.height;
    const radius = index % 9 === 0 ? 2 : 1;
    drawFilledCircle(context, { x, y }, radius, index % 4 === 0 ? "#fde68a" : "#bfdbfe", index % 5 === 0 ? 0.7 : 0.35);
  }
}

function drawBackgroundNear(context: CanvasLikeContext, viewState: InRunUiViewState): void {
  fillRect(context, viewState.screen.safeArea, "#0d1f26", 0.22);
  for (let band = 0; band < 5; band += 1) {
    const y = 180 + band * 150;
    drawLine(context, { x: 420, y }, { x: 1500, y: y - 86 }, "#284051", 3, 0.12);
    drawLine(context, { x: 440, y: y + 38 }, { x: 1480, y: y - 40 }, "#86efac", 1, 0.08);
  }
  drawLine(context, { x: 360, y: 0 }, { x: 360, y: viewState.screen.height }, "#6ee7b7", 1, 0.35);
  drawLine(context, { x: 1560, y: 0 }, { x: 1560, y: viewState.screen.height }, "#6ee7b7", 1, 0.35);
}

function drawEffectEvent(context: CanvasLikeContext, event: EffectEvent, layerId: string): void {
  context.recordCommand?.(layerId, `effect_${event.effectId}`);
  if (event.effectId === "boss_death_cascade") {
    drawBossDeathCascade(context, event.position);
    return;
  }
  if (event.effectId === "boss_phase_shift") {
    drawBossPhaseShift(context, event.position);
    return;
  }
  switch (layerId) {
    case "enemy_bullets":
      drawEnemyBullet(context, event.position);
      return;
    case "tribulation_strikes":
      drawLine(context, { x: event.position.x, y: 0 }, event.position, "#ffffff", 4, 0.95);
      drawLine(context, { x: event.position.x - 8, y: 0 }, { x: event.position.x + 12, y: event.position.y }, "#a855f7", 2, 0.8);
      return;
    case "player_hitbox":
      drawRing(context, event.position, 18, "#fef3c7", 3, 0.25);
      drawRing(context, event.position, 14, "#fefce8", 1.5, 0.85);
      drawFilledCircle(context, event.position, 7, "#ffffff", 0.95);
      return;
    case "pickup_trails":
      drawFilledCircle(context, event.position, 4, "#34d399", 0.75);
      return;
    case "player_projectiles_low":
      drawFilledCircle(context, event.position, 5, "#22d3ee", 0.65);
      return;
    case "enemies":
      drawEnemyBody(context, event.position);
      return;
    case "boss":
      drawBossBody(context, event.position);
      return;
    case "players":
      drawPlayerBody(context, event.position);
      return;
    case "rescue_and_soul":
      drawSoulBody(context, event.position);
      return;
    case "player_projectiles_high":
      drawRing(context, event.position, 28, "#a78bfa", 2, 0.42);
      drawFilledCircle(context, event.position, 3, "#facc15", 0.8);
      return;
    default:
      drawFilledCircle(context, event.position, 6, "#f8fafc", 0.5);
  }
}

function drawEnemyBullet(context: CanvasLikeContext, position: Vec2): void {
  drawFilledCircle(context, position, 15, "#ef4444", 0.18);
  drawFilledCircle(context, position, 7, "#ef4444", 0.94);
  drawFilledCircle(context, position, 3, "#ffffff", 1);
}

function drawEnemyBody(context: CanvasLikeContext, position: Vec2): void {
  drawFilledCircle(context, position, 24, "#f97316", 0.12);
  drawFilledCircle(context, position, 16, "#7f1d1d", 0.88);
  drawRing(context, position, 19, "#fca5a5", 1.5, 0.62);
}

function drawBossBody(context: CanvasLikeContext, position: Vec2): void {
  drawFilledCircle(context, position, 88, "#a855f7", 0.1);
  drawRing(context, position, 82, "#7dd3fc", 2, 0.28);
  drawFilledCircle(context, position, 58, "#581c87", 0.9);
  drawRing(context, position, 68, "#fbbf24", 4, 0.75);
  drawRing(context, position, 48, "#f5d0fe", 2, 0.42);
  drawFilledCircle(context, { x: position.x - 20, y: position.y + 12 }, 9, "#ffffff", 0.88);
  drawFilledCircle(context, { x: position.x + 20, y: position.y + 12 }, 9, "#ffffff", 0.88);
}

function drawPlayerBody(context: CanvasLikeContext, position: Vec2): void {
  drawFilledCircle(context, position, 30, "#14b8a6", 0.16);
  drawFilledCircle(context, position, 18, "#14b8a6", 0.86);
  drawRing(context, position, 22, "#ccfbf1", 2, 0.55);
  drawLine(context, { x: position.x, y: position.y - 26 }, { x: position.x, y: position.y - 52 }, "#e5e7eb", 3, 0.9);
}

function drawSoulBody(context: CanvasLikeContext, position: Vec2): void {
  drawRing(context, position, 24, "#facc15", 2.5, 0.7);
  drawFilledCircle(context, position, 10, "#fde68a", 0.45);
}

function drawTribulationWarning(context: CanvasLikeContext, warning: LightningWarningViewState): void {
  context.recordCommand?.("tribulation_warnings", `tribulation_warning_${warning.id}`);
  drawFilledCircle(context, warning, warning.radius, "#ff1f3d", 0.28);
  drawRing(context, warning, warning.radius, "#ffffff", 2, 0.95);
  drawLine(context, { x: warning.x, y: 0 }, { x: warning.x, y: warning.y }, "#ff1f3d", 3, 0.55);
}

function drawRescueOverlay(context: CanvasLikeContext, viewState: InRunUiViewState): void {
  const rescue = viewState.rescue;
  if (rescue === undefined) {
    return;
  }
  const y = viewState.screen.height - 92;
  drawRing(context, { x: viewState.screen.width / 2, y }, 36, "#facc15", 3, 0.5);
  drawText(context, `渡魂 ${Math.round(rescue.progress01 * 100)}%`, { x: viewState.screen.width / 2, y }, "#fef3c7", undefined, "center");
}

function drawStageHud(context: CanvasLikeContext, viewState: InRunUiViewState): void {
  drawText(
    context,
    `${viewState.stage.stageName} ${viewState.stage.segmentIndex}/${viewState.stage.segmentCount}`,
    { x: 382, y: 30 },
    "#e5e7eb"
  );
}

function drawTeamInsightHud(context: CanvasLikeContext, viewState: InRunUiViewState): void {
  const x = viewState.screen.width / 2 - 180;
  const y = 24;
  fillRect(context, { x, y, width: 360, height: 12 }, "#064e3b", 0.8);
  fillRect(context, { x, y, width: 360 * viewState.teamInsight.progress01, height: 12 }, "#34d399", 0.9);
  drawText(context, viewState.teamInsight.nextTriggerText, { x: viewState.screen.width / 2, y: y + 28 }, "#a7f3d0", undefined, "center");
}

function drawBossHud(context: CanvasLikeContext, boss: BossHudViewState): void {
  const width = 520;
  const ratio = boss.maxHp === undefined || boss.maxHp <= 0 ? 0 : Math.max(0, Math.min(1, (boss.hp ?? 0) / boss.maxHp));
  fillRect(context, { x: 700, y: 52, width, height: 14 }, "#260617", 0.88);
  fillRect(context, { x: 700, y: 52, width: width * ratio, height: 14 }, "#f97316", 0.92);
  drawRing(context, { x: 960, y: 59 }, 22, "#fbbf24", 1.5, 0.3);
  drawText(context, boss.name ?? "Boss", { x: 960, y: 38 }, "#fed7aa", "15px system-ui, sans-serif", "center");
  if (boss.currentWarning !== undefined) {
    drawText(context, boss.currentWarning.text, { x: 960, y: 84 }, "#fecaca", "14px system-ui, sans-serif", "center", 0.9);
  }
}

function drawPlayerHud(context: CanvasLikeContext, player: PlayerHudViewState): void {
  const x = player.playerId === "p2" ? 1580 : 24;
  const y = player.playerId === "p2" ? 96 : 72;
  const hpRatio = player.core.maxHp <= 0 ? 0 : Math.max(0, Math.min(1, player.core.hp / player.core.maxHp));
  const qiRatio = player.core.maxQi <= 0 ? 0 : Math.max(0, Math.min(1, player.core.qi / player.core.maxQi));
  drawText(context, `${player.core.displayName} ${player.core.realmName}${player.core.realmLayer}`, { x, y }, "#f8fafc");
  fillRect(context, { x, y: y + 16, width: 260, height: 8 }, "#4c0519", 0.85);
  fillRect(context, { x, y: y + 16, width: 260 * hpRatio, height: 8 }, "#fb7185", 0.92);
  fillRect(context, { x, y: y + 30, width: 260, height: 8 }, "#0c4a6e", 0.85);
  fillRect(context, { x, y: y + 30, width: 260 * qiRatio, height: 8 }, "#38bdf8", 0.92);
}

function drawMajorOverlay(context: CanvasLikeContext, viewState: InRunUiViewState): void {
  fillRect(context, { x: 0, y: 0, width: viewState.screen.width, height: viewState.screen.height }, "#020617", 0.65);
  drawText(context, "顿悟", { x: viewState.screen.width / 2, y: 150 }, "#a7f3d0", "30px system-ui, sans-serif", "center", 0.96);
  drawText(
    context,
    `公共气运 ${viewState.insight?.sharedFortuneReroll ?? viewState.teamInsight.sharedFortuneReroll}`,
    { x: viewState.screen.width / 2, y: 190 },
    "#fef3c7",
    "14px system-ui, sans-serif",
    "center",
    0.88
  );
  for (let playerIndex = 0; playerIndex < (viewState.insight?.players.length ?? 0); playerIndex += 1) {
    const player = viewState.insight?.players[playerIndex];
    if (player === undefined) {
      continue;
    }
    const y = 360 + playerIndex * 150;
    drawText(context, player.playerId.toUpperCase(), { x: 600, y: y + 70 }, "#bfdbfe", "16px system-ui, sans-serif", "center", 0.9);
    for (let optionIndex = 0; optionIndex < player.options.length; optionIndex += 1) {
      const option = player.options[optionIndex];
      if (option === undefined) {
        continue;
      }
      const x = 760 + optionIndex * 220;
      fillRect(context, { x: x - 88, y: y + 28, width: 176, height: 86 }, "#10251f", option.disabled === true ? 0.45 : 0.82);
      drawRing(context, { x, y: y + 70 }, 52, rarityColor(option.rarity), 2, player.selected ? 0.3 : 0.7);
      drawText(context, option.name, { x, y: y + 70 }, "#ecfdf5", "14px system-ui, sans-serif", "center", option.disabled === true ? 0.55 : 0.95);
      drawText(context, option.keyLabel, { x, y: y + 100 }, "#fef3c7", "12px system-ui, sans-serif", "center", 0.85);
    }
  }
}

function drawBossDeathCascade(context: CanvasLikeContext, position: Vec2): void {
  drawFilledCircle(context, position, 118, "#ffffff", 0.18);
  drawRing(context, position, 96, "#fde68a", 5, 0.85);
  drawRing(context, position, 126, "#a78bfa", 3, 0.5);
  for (let index = 0; index < 10; index += 1) {
    const angle = (Math.PI * 2 * index) / 10;
    const from = { x: position.x + Math.cos(angle) * 28, y: position.y + Math.sin(angle) * 28 };
    const to = { x: position.x + Math.cos(angle) * 132, y: position.y + Math.sin(angle) * 132 };
    drawLine(context, from, to, index % 2 === 0 ? "#fef3c7" : "#c4b5fd", 2, 0.55);
  }
  drawText(context, "青云劫灵崩解", { x: position.x, y: position.y - 118 }, "#fef3c7", "16px system-ui, sans-serif", "center", 0.9);
}

function drawBossPhaseShift(context: CanvasLikeContext, position: Vec2): void {
  drawRing(context, position, 86, "#38bdf8", 3, 0.42);
  drawRing(context, position, 112, "#f0abfc", 2, 0.28);
}

function drawSettlementOverlay(context: CanvasLikeContext, viewState: InRunUiViewState, summary: CanvasSettlementSummary): void {
  fillRect(context, { x: 0, y: 0, width: viewState.screen.width, height: viewState.screen.height }, "#020617", 0.72);
  fillRect(context, { x: 660, y: 252, width: 600, height: 280 }, "#102018", 0.88);
  drawRing(context, { x: 960, y: 382 }, 168, "#fbbf24", 2, 0.32);
  drawText(context, "归府结算", { x: 960, y: 302 }, "#fde68a", "28px system-ui, sans-serif", "center", 0.96);
  drawText(context, formatResourceLine("spirit_stone_low", summary.resourcesKept.spirit_stone_low ?? 0), { x: 960, y: 358 }, "#ecfdf5", "16px system-ui, sans-serif", "center", 0.95);
  drawText(context, formatRareResourceSummary(summary.resourcesKept), { x: 960, y: 386 }, "#bfdbfe", "13px system-ui, sans-serif", "center", 0.88);
  drawText(context, `第二局战力 +${summary.secondRunPowerDelta}`, { x: 960, y: 494 }, "#a7f3d0", "14px system-ui, sans-serif", "center", 0.9);
  for (let index = 0; index < Math.min(2, summary.upgrades.length); index += 1) {
    const upgrade = summary.upgrades[index];
    if (upgrade !== undefined) {
      drawText(context, upgrade, { x: 960, y: 430 + index * 24 }, "#fef3c7", "14px system-ui, sans-serif", "center", 0.92);
    }
  }
}

function drawStartOverlay(context: CanvasLikeContext, viewState: InRunUiViewState): void {
  fillRect(context, { x: 0, y: 0, width: viewState.screen.width, height: viewState.screen.height }, "#020617", 0.22);
  drawText(context, viewState.stage.stageName, { x: viewState.screen.width / 2, y: 245 }, "#d9f99d", "26px system-ui, sans-serif", "center", 0.92);
  drawText(context, viewState.stage.segmentName, { x: viewState.screen.width / 2, y: 282 }, "#bfdbfe", "16px system-ui, sans-serif", "center", 0.86);
}

function computeScreenShake(events: readonly EffectEvent[], presentation: CanvasPresentationState | undefined): Vec2 {
  const legacyShake = legacyEffectShake(events);
  const impactShake = presentation === undefined ? { x: 0, y: 0 } : computeImpactScreenShake(presentation);
  return Math.hypot(impactShake.x, impactShake.y) >= Math.hypot(legacyShake.x, legacyShake.y) ? impactShake : legacyShake;
}

function legacyEffectShake(events: readonly EffectEvent[]): Vec2 {
  if (events.some((event) => event.effectId === "boss_death_cascade")) {
    return { x: 6, y: -4 };
  }
  if (events.some((event) => event.effectId === "boss_phase_shift")) {
    return { x: 3, y: -2 };
  }
  return { x: 0, y: 0 };
}

function isStartBannerVisible(viewState: InRunUiViewState): boolean {
  return viewState.mode === "combat" && viewState.stage.segmentIndex === 1 && (viewState.stage.timeRemaining ?? 0) > 51;
}

function rarityColor(rarity: string): string {
  switch (rarity) {
    case "legendary":
      return "#fde68a";
    case "epic":
      return "#c4b5fd";
    case "rare":
      return "#93c5fd";
    case "uncommon":
      return "#86efac";
    default:
      return "#cbd5e1";
  }
}

function formatResourceLine(resourceId: string, amount: number): string {
  return `${resourceLabel(resourceId)} +${amount}`;
}

function formatRareResourceSummary(resources: Readonly<Record<string, number>>): string {
  const parts = ["thunder_marow", "spirit_vein_seed", "spell_page_thunder", "spirit_jade"]
    .map((resourceId) => {
      const amount = resources[resourceId] ?? 0;
      return amount > 0 ? formatResourceLine(resourceId, amount) : undefined;
    })
    .filter((part): part is string => part !== undefined);
  return parts.length === 0 ? "材料已入库" : parts.join("  ");
}

function resourceLabel(resourceId: string): string {
  switch (resourceId) {
    case "spirit_stone_low":
      return "灵石";
    case "thunder_marow":
      return "雷髓";
    case "spirit_vein_seed":
      return "灵脉之种";
    case "spell_page_thunder":
      return "五雷法页";
    case "spirit_jade":
      return "灵玉";
    default:
      return resourceId;
  }
}
