import type { EffectEvent } from "../sim/spells/SpellEffects";
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

export interface CanvasRendererOptions {
  readonly layerStack?: RenderLayerStack;
}

export interface CanvasRenderFrame {
  readonly viewState: InRunUiViewState;
  readonly effectEvents: readonly EffectEvent[];
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

  public constructor(options: CanvasRendererOptions = {}) {
    this.layerStack = options.layerStack ?? createRenderLayerStack(DEFAULT_RENDER_LAYERS);
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

    for (let index = 0; index < frame.effectEvents.length; index += 1) {
      const event = frame.effectEvents[index];
      if (event === undefined) {
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

    commands.push(
      {
        id: "hud_stage",
        layerId: "hud",
        draw: (context) => drawStageHud(context, frame.viewState)
      },
      {
        id: "hud_team_insight",
        layerId: "hud",
        draw: (context) => drawTeamInsightHud(context, frame.viewState)
      }
    );

    const boss = frame.viewState.boss;
    if (boss?.visible === true) {
      commands.push({
        id: "hud_boss",
        layerId: "hud",
        draw: (context) => drawBossHud(context, boss)
      });
    }

    for (const player of frame.viewState.players) {
      commands.push({
        id: `hud_${player.playerId}`,
        layerId: "hud",
        draw: (context) => drawPlayerHud(context, player)
      });
    }

    if (frame.viewState.insight?.visible === true) {
      commands.push({
        id: "insight_overlay",
        layerId: "major_overlay",
        draw: (context) => drawMajorOverlay(context, frame.viewState)
      });
    }

    return this.layerStack.sortCommands(commands);
  }

  public renderFrame(context: CanvasLikeContext, frame: CanvasRenderFrame): void {
    clearCanvas(context, frame.viewState.screen.width, frame.viewState.screen.height);
    this.renderCommands(context, this.buildRenderCommands(frame));
  }

  public renderCommands(context: CanvasLikeContext, commands: readonly RenderCommand[]): void {
    this.layerStack.flush(context, commands);
  }
}

function createEffectCommand(event: EffectEvent, index: number): RenderCommand {
  const layerId = layerForEffect(event.effectId);
  return {
    id: `effect_${event.effectId}_${index}`,
    layerId,
    draw: (context) => drawEffectEvent(context, event, layerId)
  };
}

function createTribulationWarningCommand(warning: LightningWarningViewState): RenderCommand {
  return {
    id: `tribulation_warning_${warning.id}`,
    layerId: "tribulation_warnings",
    draw: (context) => drawTribulationWarning(context, warning)
  };
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
  fillRect(context, { x: 0, y: 0, width: viewState.screen.width, height: viewState.screen.height }, "#08111f", 1);
}

function drawBackgroundNear(context: CanvasLikeContext, viewState: InRunUiViewState): void {
  fillRect(context, viewState.screen.safeArea, "#0f1f2c", 0.28);
  drawLine(context, { x: 360, y: 0 }, { x: 360, y: viewState.screen.height }, "#203848", 1, 0.5);
  drawLine(context, { x: 1560, y: 0 }, { x: 1560, y: viewState.screen.height }, "#203848", 1, 0.5);
}

function drawEffectEvent(context: CanvasLikeContext, event: EffectEvent, layerId: string): void {
  context.recordCommand?.(layerId, `effect_${event.effectId}`);
  switch (layerId) {
    case "enemy_bullets":
      drawEnemyBullet(context, event.position);
      return;
    case "tribulation_strikes":
      drawLine(context, { x: event.position.x, y: 0 }, event.position, "#ffffff", 4, 0.95);
      drawLine(context, { x: event.position.x - 8, y: 0 }, { x: event.position.x + 12, y: event.position.y }, "#a855f7", 2, 0.8);
      return;
    case "player_hitbox":
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
  drawFilledCircle(context, position, 7, "#ef4444", 0.94);
  drawFilledCircle(context, position, 3, "#ffffff", 1);
}

function drawEnemyBody(context: CanvasLikeContext, position: Vec2): void {
  drawFilledCircle(context, position, 16, "#7f1d1d", 0.88);
  drawRing(context, position, 19, "#fca5a5", 1.5, 0.62);
}

function drawBossBody(context: CanvasLikeContext, position: Vec2): void {
  drawFilledCircle(context, position, 58, "#581c87", 0.9);
  drawRing(context, position, 68, "#fbbf24", 4, 0.75);
  drawFilledCircle(context, { x: position.x - 20, y: position.y + 12 }, 9, "#ffffff", 0.88);
  drawFilledCircle(context, { x: position.x + 20, y: position.y + 12 }, 9, "#ffffff", 0.88);
}

function drawPlayerBody(context: CanvasLikeContext, position: Vec2): void {
  drawFilledCircle(context, position, 18, "#14b8a6", 0.86);
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
  const width = 420;
  const ratio = boss.maxHp === undefined || boss.maxHp <= 0 ? 0 : Math.max(0, Math.min(1, (boss.hp ?? 0) / boss.maxHp));
  fillRect(context, { x: 750, y: 58, width, height: 10 }, "#450a0a", 0.9);
  fillRect(context, { x: 750, y: 58, width: width * ratio, height: 10 }, "#f97316", 0.9);
  drawText(context, boss.name ?? "Boss", { x: 960, y: 48 }, "#fed7aa", undefined, "center");
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
  fillRect(context, { x: 0, y: 0, width: viewState.screen.width, height: viewState.screen.height }, "#020617", 0.58);
  drawText(context, "顿悟", { x: viewState.screen.width / 2, y: 150 }, "#a7f3d0", "28px system-ui, sans-serif", "center", 0.95);
}
