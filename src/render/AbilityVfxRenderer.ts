import type {
  CanvasPresentationAbilityVfxEvent,
  CanvasPresentationAbilityVfxKind,
  CanvasPresentationState
} from "./CanvasPresentationState";
import {
  drawFilledCircle,
  drawLine,
  drawRing,
  drawText,
  type CanvasLikeContext,
  type Vec2
} from "./PrimitiveDrawing";
import type { RenderCommand } from "./RenderLayerStack";

export interface AbilityVfxProfile {
  readonly sourceId: string;
  readonly kind: CanvasPresentationAbilityVfxKind;
  readonly layerId: string;
  readonly color: string;
  readonly secondaryColor: string;
  readonly radius: number;
  readonly fillAlphaMax: number;
  readonly sfxCueId?: string;
}

const HIGH_PRESSURE_ENEMY_BULLET_THRESHOLD = 80;
const PROTECTED_HITBOX_RADIUS_PX = 24;

const ABILITY_VFX_PROFILES: Readonly<Record<string, AbilityVfxProfile>> = Object.freeze({
  spell_five_thunder: profile("spell", "spell_five_thunder", "#a78bfa", "#facc15", 86, 0.42, {
    sfxCueId: "sfx.spell.five_thunder_cast_01"
  }),
  spell_bagua_sword_ring: profile("spell", "spell_bagua_sword_ring", "#f8fafc", "#fbbf24", 150, 0.38),
  spell_red_lotus_fire: profile("spell", "spell_red_lotus_fire", "#f97316", "#ef4444", 180, 0.32),
  spell_sleeve_universe: profile("spell", "spell_sleeve_universe", "#8b5cf6", "#0f172a", 220, 0.55),

  artifact_qingshuang_sword: profile("artifact", "artifact_qingshuang_sword", "#22d3ee", "#fef3c7", 28, 0.42, {
    sfxCueId: "sfx.artifact.flying_sword_fire_01"
  }),
  artifact_ziyang_gourd: profile("artifact", "artifact_ziyang_gourd", "#f97316", "#fed7aa", 36, 0.38, {
    sfxCueId: "sfx.artifact.flying_sword_fire_01"
  }),
  artifact_xuanyue_seal: profile("artifact", "artifact_xuanyue_seal", "#ca8a04", "#facc15", 92, 0.34, {
    sfxCueId: "sfx.explosion.elite_heavy_01"
  }),

  pill_rejuvenation: profile("pill", "pill_rejuvenation", "#22c55e", "#bbf7d0", 42, 0.34, {
    sfxCueId: "sfx.pill.rejuvenation_heal_01"
  }),
  pill_burning_blood: profile("pill", "pill_burning_blood", "#fb7185", "#f97316", 46, 0.32, {
    sfxCueId: "sfx.pill.rejuvenation_heal_01"
  }),
  pill_clear_mind: profile("pill", "pill_clear_mind", "#38bdf8", "#f8fafc", 42, 0.3, {
    sfxCueId: "sfx.pill.rejuvenation_heal_01"
  }),
  pill_minor_breakthrough: profile("pill", "pill_minor_breakthrough", "#facc15", "#ffffff", 48, 0.34, {
    sfxCueId: "sfx.pill.rejuvenation_heal_01"
  }),

  treasure_minor_sword_array: profile("treasure", "treasure_minor_sword_array", "#f8fafc", "#fbbf24", 72, 0.3),
  treasure_bagua_jade: profile("treasure", "treasure_bagua_jade", "#bfdbfe", "#38bdf8", 58, 0.28),
  treasure_gold_toad: profile("treasure", "treasure_gold_toad", "#facc15", "#34d399", 96, 0.3, {
    layerId: "pickup_trails",
    sfxCueId: "sfx.pickup.rare_drop_01"
  }),
  treasure_tongxin_lock: profile("treasure", "treasure_tongxin_lock", "#d946ef", "#fef3c7", 260, 0.28)
});

export class AbilityVfxRenderer {
  public createCommands(
    presentation: Pick<CanvasPresentationState, "frame" | "abilityVfx" | "enemyProjectiles" | "warnings" | "players">
  ): readonly RenderCommand[] {
    const pressure = isHighPressure(presentation);
    const commands: RenderCommand[] = [];

    for (const event of presentation.abilityVfx ?? []) {
      if (!isEventActive(event, presentation.frame)) {
        continue;
      }
      const profile = getAbilityVfxProfile(event.sourceId);
      commands.push({
        id: `ability_vfx_${event.id}`,
        layerId: profile.layerId,
        draw: (context) => drawAbilityEvent(context, event, profile, presentation, pressure)
      });
    }

    return Object.freeze(commands);
  }
}

export function getAbilityVfxProfile(sourceId: string): AbilityVfxProfile {
  const profile = ABILITY_VFX_PROFILES[sourceId];
  if (profile === undefined) {
    throw new Error(`Unknown ability VFX source: ${sourceId}`);
  }
  return profile;
}

function profile(
  kind: CanvasPresentationAbilityVfxKind,
  sourceId: string,
  color: string,
  secondaryColor: string,
  radius: number,
  fillAlphaMax: number,
  options: { readonly layerId?: string; readonly sfxCueId?: string } = {}
): AbilityVfxProfile {
  return Object.freeze({
    sourceId,
    kind,
    layerId: options.layerId ?? "player_projectiles_high",
    color,
    secondaryColor,
    radius,
    fillAlphaMax,
    ...(options.sfxCueId === undefined ? {} : { sfxCueId: options.sfxCueId })
  });
}

function drawAbilityEvent(
  context: CanvasLikeContext,
  event: CanvasPresentationAbilityVfxEvent,
  profile: AbilityVfxProfile,
  presentation: Pick<CanvasPresentationState, "frame" | "players">,
  highPressure: boolean
): void {
  context.recordCommand?.(profile.layerId, `ability_vfx_${event.id}`);
  const radius = event.radius ?? profile.radius;
  const alpha = effectAlpha(event, profile, highPressure);

  switch (event.sourceId) {
    case "spell_five_thunder":
      drawFiveThunder(context, event, profile, radius, alpha);
      break;
    case "spell_bagua_sword_ring":
      drawBaguaSwordRing(context, event, profile, radius, alpha, presentation.frame);
      break;
    case "spell_red_lotus_fire":
      drawRedLotusFire(context, event, profile, radius, alpha, presentation.frame);
      break;
    case "spell_sleeve_universe":
      drawSleeveUniverse(context, event, profile, radius, alpha);
      break;
    case "artifact_qingshuang_sword":
      drawSwordHit(context, event.position, profile, radius, alpha);
      break;
    case "artifact_ziyang_gourd":
      drawGourdEmbers(context, event.position, profile, radius, alpha);
      break;
    case "artifact_xuanyue_seal":
      drawSealImpact(context, event.position, profile, radius, alpha);
      break;
    case "pill_rejuvenation":
    case "pill_burning_blood":
    case "pill_clear_mind":
    case "pill_minor_breakthrough":
      drawPillAura(context, event, profile, radius, alpha);
      break;
    case "treasure_minor_sword_array":
      drawMinorSwordArray(context, event, profile, radius, alpha, presentation.frame);
      break;
    case "treasure_bagua_jade":
      drawBaguaJade(context, event, profile, radius, alpha);
      break;
    case "treasure_gold_toad":
      drawGoldToadPull(context, event, profile, radius, alpha);
      break;
    case "treasure_tongxin_lock":
      drawTongxinLock(context, event, profile, alpha);
      break;
    default:
      drawRing(context, event.position, radius, profile.color, 2, alpha);
  }

  drawProtectedHitboxHoles(context, event, radius, presentation.players);
}

function drawFiveThunder(
  context: CanvasLikeContext,
  event: CanvasPresentationAbilityVfxEvent,
  profile: AbilityVfxProfile,
  radius: number,
  alpha: number
): void {
  const target = event.targetPosition ?? { x: event.position.x, y: event.position.y - radius };
  drawRing(context, event.position, 22, profile.secondaryColor, 2, alpha * 0.82);
  drawLightning(context, event.position, target, profile.color, 3, alpha);
  drawRing(context, target, radius * 0.42, profile.secondaryColor, 2, alpha * 0.55);
}

function drawBaguaSwordRing(
  context: CanvasLikeContext,
  event: CanvasPresentationAbilityVfxEvent,
  profile: AbilityVfxProfile,
  radius: number,
  alpha: number,
  frame: number
): void {
  drawRing(context, event.position, radius, profile.color, 2, alpha);
  drawRing(context, event.position, radius * 0.64, profile.secondaryColor, 1.5, alpha * 0.44);
  for (let index = 0; index < 8; index += 1) {
    const angle = frame / 30 + (Math.PI * 2 * index) / 8;
    const center = pointOnCircle(event.position, radius, angle);
    const tip = pointOnCircle(center, 18, angle - Math.PI / 2);
    const tail = pointOnCircle(center, 14, angle + Math.PI / 2);
    drawLine(context, tail, tip, index % 2 === 0 ? profile.color : profile.secondaryColor, 2, alpha * 0.82);
  }
}

function drawRedLotusFire(
  context: CanvasLikeContext,
  event: CanvasPresentationAbilityVfxEvent,
  profile: AbilityVfxProfile,
  radius: number,
  alpha: number,
  frame: number
): void {
  drawFilledCircle(context, event.position, radius, profile.color, alpha);
  drawRing(context, event.position, radius, profile.secondaryColor, 3, alpha * 1.35);
  for (let index = 0; index < 6; index += 1) {
    const angle = frame / 45 + (Math.PI * 2 * index) / 6;
    drawRing(context, pointOnCircle(event.position, radius * 0.42, angle), radius * 0.22, profile.secondaryColor, 1.2, alpha * 0.72);
  }
}

function drawSleeveUniverse(
  context: CanvasLikeContext,
  event: CanvasPresentationAbilityVfxEvent,
  profile: AbilityVfxProfile,
  radius: number,
  alpha: number
): void {
  drawFilledCircle(context, event.position, radius * 0.48, profile.secondaryColor, alpha);
  drawRing(context, event.position, radius * 0.62, profile.color, 3, alpha * 0.9);
  const target = event.targetPosition ?? { x: event.position.x, y: event.position.y - radius };
  for (let index = -2; index <= 2; index += 1) {
    drawLine(context, { x: target.x + index * 18, y: target.y }, event.position, profile.color, 1.5, alpha * 0.72);
  }
}

function drawSwordHit(context: CanvasLikeContext, position: Vec2, profile: AbilityVfxProfile, radius: number, alpha: number): void {
  drawLine(context, { x: position.x - radius, y: position.y }, { x: position.x + radius, y: position.y }, profile.color, 2, alpha);
  drawLine(context, { x: position.x, y: position.y - radius }, { x: position.x, y: position.y + radius }, profile.secondaryColor, 2, alpha * 0.78);
  drawRing(context, position, radius * 0.48, profile.secondaryColor, 1.5, alpha * 0.44);
}

function drawGourdEmbers(context: CanvasLikeContext, position: Vec2, profile: AbilityVfxProfile, radius: number, alpha: number): void {
  drawFilledCircle(context, position, radius * 0.44, profile.secondaryColor, alpha * 0.74);
  drawRing(context, position, radius, profile.color, 3, alpha);
  drawRing(context, { x: position.x + radius * 0.22, y: position.y - radius * 0.18 }, radius * 0.38, profile.color, 2, alpha * 0.58);
}

function drawSealImpact(context: CanvasLikeContext, position: Vec2, profile: AbilityVfxProfile, radius: number, alpha: number): void {
  drawRing(context, position, radius, profile.color, 3, alpha);
  drawRing(context, position, radius * 0.56, profile.secondaryColor, 2, alpha * 0.62);
  drawLine(context, { x: position.x - radius, y: position.y }, { x: position.x + radius, y: position.y }, profile.secondaryColor, 2, alpha * 0.56);
  drawLine(context, { x: position.x, y: position.y - radius }, { x: position.x, y: position.y + radius }, profile.secondaryColor, 2, alpha * 0.56);
}

function drawPillAura(
  context: CanvasLikeContext,
  event: CanvasPresentationAbilityVfxEvent,
  profile: AbilityVfxProfile,
  radius: number,
  alpha: number
): void {
  const label = pillLabel(event.sourceId, event.phase);
  drawRing(context, event.position, radius, profile.color, event.phase === "complete" ? 3 : 2, alpha);
  drawFilledCircle(context, event.position, Math.max(5, radius * 0.12), profile.secondaryColor, alpha * 0.72);
  if (event.phase === "swallow") {
    drawLine(context, { x: event.position.x - 26, y: event.position.y + 34 }, event.position, profile.color, 2, alpha * 0.72);
  }
  drawText(context, label, { x: event.position.x, y: event.position.y - radius - 12 }, profile.color, "12px system-ui, sans-serif", "center", alpha);
}

function drawMinorSwordArray(
  context: CanvasLikeContext,
  event: CanvasPresentationAbilityVfxEvent,
  profile: AbilityVfxProfile,
  radius: number,
  alpha: number,
  frame: number
): void {
  drawRing(context, event.position, radius, profile.secondaryColor, 1.5, alpha * 0.42);
  for (let index = 0; index < 4; index += 1) {
    const angle = frame / 24 + (Math.PI * 2 * index) / 4;
    drawLine(context, pointOnCircle(event.position, radius - 14, angle), pointOnCircle(event.position, radius + 12, angle), profile.color, 2, alpha);
  }
}

function drawBaguaJade(context: CanvasLikeContext, event: CanvasPresentationAbilityVfxEvent, profile: AbilityVfxProfile, radius: number, alpha: number): void {
  drawRing(context, event.position, radius, profile.color, 2, alpha);
  drawRing(context, event.position, radius * 0.72, profile.secondaryColor, 1.4, alpha * 0.48);
}

function drawGoldToadPull(
  context: CanvasLikeContext,
  event: CanvasPresentationAbilityVfxEvent,
  profile: AbilityVfxProfile,
  radius: number,
  alpha: number
): void {
  const target = event.targetPosition ?? { x: event.position.x - radius, y: event.position.y - radius * 0.5 };
  drawLine(context, target, event.position, profile.color, 2, alpha * 0.72);
  drawLine(context, { x: target.x - 8, y: target.y + 4 }, { x: event.position.x - 4, y: event.position.y + 4 }, profile.secondaryColor, 1, alpha * 0.42);
  drawRing(context, event.position, 34, profile.color, 2, alpha);
}

function drawTongxinLock(context: CanvasLikeContext, event: CanvasPresentationAbilityVfxEvent, profile: AbilityVfxProfile, alpha: number): void {
  const target = event.targetPosition ?? event.position;
  drawLine(context, event.position, target, profile.color, 2.5, alpha * 0.78);
  drawRing(context, event.position, 32, profile.secondaryColor, 1.5, alpha * 0.58);
  drawRing(context, target, 32, profile.secondaryColor, 1.5, alpha * 0.58);
}

function drawLightning(context: CanvasLikeContext, from: Vec2, to: Vec2, color: string, lineWidth: number, alpha: number): void {
  let previous = from;
  for (let index = 1; index <= 5; index += 1) {
    const t = index / 5;
    const wobble = index % 2 === 0 ? 16 : -16;
    const point = {
      x: from.x + (to.x - from.x) * t + wobble,
      y: from.y + (to.y - from.y) * t
    };
    drawLine(context, previous, point, color, lineWidth, alpha);
    previous = point;
  }
  drawLine(context, previous, to, "#ffffff", Math.max(1, lineWidth - 1), alpha * 0.78);
}

function drawProtectedHitboxHoles(
  context: CanvasLikeContext,
  event: CanvasPresentationAbilityVfxEvent,
  radius: number,
  players: CanvasPresentationState["players"]
): void {
  if (event.kind !== "spell" && event.kind !== "artifact") {
    return;
  }
  for (const player of players) {
    const dx = player.position.x - event.position.x;
    const dy = player.position.y - event.position.y;
    if (dx * dx + dy * dy <= (radius + PROTECTED_HITBOX_RADIUS_PX) * (radius + PROTECTED_HITBOX_RADIUS_PX)) {
      drawFilledCircle(context, player.position, PROTECTED_HITBOX_RADIUS_PX, "#020617", 0.55);
    }
  }
}

function effectAlpha(event: CanvasPresentationAbilityVfxEvent, profile: AbilityVfxProfile, highPressure: boolean): number {
  const life = Math.max(1, event.endFrame - event.startFrame);
  const age = Math.max(0, event.frame - event.startFrame);
  const fade = event.phase === "hit" || event.phase === "complete" ? Math.max(0.35, 1 - age / life) : 1;
  const pressureScale = highPressure && (event.kind === "spell" || event.sourceId === "treasure_gold_toad") ? 0.6 : 1;
  return round3(profile.fillAlphaMax * fade * pressureScale);
}

function isHighPressure(presentation: Pick<CanvasPresentationState, "enemyProjectiles" | "warnings">): boolean {
  return (
    presentation.enemyProjectiles.length > HIGH_PRESSURE_ENEMY_BULLET_THRESHOLD ||
    presentation.warnings.some((warning) => warning.kind === "tribulation")
  );
}

function isEventActive(event: CanvasPresentationAbilityVfxEvent, frame: number): boolean {
  return frame >= event.startFrame && frame <= event.endFrame;
}

function pointOnCircle(center: Vec2, radius: number, angle: number): Vec2 {
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius
  };
}

function pillLabel(sourceId: string, phase: CanvasPresentationAbilityVfxEvent["phase"]): string {
  if (phase === "swallow") {
    return "吞服";
  }
  if (phase === "complete") {
    return sourceId === "pill_minor_breakthrough" ? "雷纹" : "炼成";
  }
  if (phase === "after_effect") {
    return "后效";
  }
  return "炼化";
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
