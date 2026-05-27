import type {
  CanvasPresentationSpriteVfxRequest,
  CanvasPresentationState,
  CanvasPresentationVisualEvent,
  CanvasPresentationVisualEventKind,
  CanvasPresentationVisualIntensity,
  CanvasPresentationVisualPriority
} from "./CanvasPresentationState";
import {
  drawFilledCircle,
  drawLine,
  drawRing,
  drawText,
  type CanvasLikeContext,
  type Vec2
} from "./PrimitiveDrawing";
import { createRenderVfxParticles } from "./RenderVfxTimeline";
import type { RenderCommand } from "./RenderLayerStack";

export interface ImpactVfxProfile {
  readonly kind: CanvasPresentationVisualEventKind;
  readonly layerId: string;
  readonly color: string;
  readonly secondaryColor: string;
  readonly defaultText?: string;
  readonly defaultIntensity: CanvasPresentationVisualIntensity;
  readonly priority: CanvasPresentationVisualPriority;
  readonly durationFrames: number;
  readonly radius: number;
  readonly alpha: number;
  readonly sfxCueId?: string;
  readonly shakeIntensity?: CanvasPresentationVisualIntensity;
  readonly spriteAssetId?: string;
  readonly spriteScale?: number;
}

interface ImpactPressureState {
  readonly highPressure: boolean;
  readonly enemyBulletsAlive: boolean;
}

const HIGH_PRESSURE_ENEMY_BULLET_THRESHOLD = 80;
const HIGH_PRESSURE_HIT_SPARK_LIMIT = 12;

const IMPACT_VFX_PROFILES: Readonly<Record<CanvasPresentationVisualEventKind, ImpactVfxProfile>> = Object.freeze({
  projectile_hit: {
    kind: "projectile_hit",
    layerId: "player_projectiles_high",
    color: "#fef3c7",
    secondaryColor: "#facc15",
    defaultIntensity: "micro",
    priority: "low",
    durationFrames: 12,
    radius: 16,
    alpha: 0.86,
    sfxCueId: "sfx.hit.enemy_light_01"
  },
  enemy_damaged: {
    kind: "enemy_damaged",
    layerId: "player_projectiles_high",
    color: "#fde68a",
    secondaryColor: "#f97316",
    defaultText: "伤",
    defaultIntensity: "micro",
    priority: "low",
    durationFrames: 14,
    radius: 18,
    alpha: 0.78,
    sfxCueId: "sfx.hit.enemy_light_01"
  },
  enemy_killed: {
    kind: "enemy_killed",
    layerId: "player_projectiles_high",
    color: "#f43f5e",
    secondaryColor: "#fef3c7",
    defaultText: "破",
    defaultIntensity: "small",
    priority: "normal",
    durationFrames: 28,
    radius: 46,
    alpha: 0.72,
    sfxCueId: "sfx.death.enemy_small_burst_01",
    shakeIntensity: "small",
    spriteAssetId: "vfx.explosion.small_01",
    spriteScale: 0.72
  },
  elite_killed: {
    kind: "elite_killed",
    layerId: "player_projectiles_high",
    color: "#f97316",
    secondaryColor: "#facc15",
    defaultText: "破阵",
    defaultIntensity: "medium",
    priority: "high",
    durationFrames: 55,
    radius: 72,
    alpha: 0.78,
    sfxCueId: "sfx.explosion.elite_heavy_01",
    shakeIntensity: "medium",
    spriteAssetId: "vfx.explosion.small_01",
    spriteScale: 1.18
  },
  player_hit: {
    kind: "player_hit",
    layerId: "players",
    color: "#ffffff",
    secondaryColor: "#fb7185",
    defaultIntensity: "small",
    priority: "high",
    durationFrames: 30,
    radius: 34,
    alpha: 0.82,
    sfxCueId: "sfx.shield.impact_break_01",
    shakeIntensity: "small"
  },
  shield_break: {
    kind: "shield_break",
    layerId: "player_projectiles_high",
    color: "#bfdbfe",
    secondaryColor: "#38bdf8",
    defaultText: "盾碎",
    defaultIntensity: "medium",
    priority: "high",
    durationFrames: 32,
    radius: 60,
    alpha: 0.72,
    sfxCueId: "sfx.shield.impact_break_01",
    shakeIntensity: "small",
    spriteAssetId: "vfx.shield.barrier_01",
    spriteScale: 1.05
  },
  boss_phase_changed: {
    kind: "boss_phase_changed",
    layerId: "player_projectiles_high",
    color: "#38bdf8",
    secondaryColor: "#facc15",
    defaultText: "劫灵换相",
    defaultIntensity: "large",
    priority: "critical",
    durationFrames: 72,
    radius: 96,
    alpha: 0.66,
    sfxCueId: "sfx.warning.boss_tribulation_01",
    shakeIntensity: "large",
    spriteAssetId: "vfx.lightning.chain_01",
    spriteScale: 2.2
  },
  boss_killed: {
    kind: "boss_killed",
    layerId: "foreground_effects",
    color: "#facc15",
    secondaryColor: "#ffffff",
    defaultText: "青云劫灵崩解",
    defaultIntensity: "ultimate",
    priority: "critical",
    durationFrames: 180,
    radius: 132,
    alpha: 0.64,
    sfxCueId: "sfx.explosion.elite_heavy_01",
    shakeIntensity: "ultimate",
    spriteAssetId: "vfx.explosion.small_01",
    spriteScale: 2.35
  },
  hit_spark: {
    kind: "hit_spark",
    layerId: "player_projectiles_high",
    color: "#fef3c7",
    secondaryColor: "#facc15",
    defaultIntensity: "micro",
    priority: "low",
    durationFrames: 12,
    radius: 16,
    alpha: 0.78,
    sfxCueId: "sfx.hit.enemy_light_01"
  },
  kill_burst: {
    kind: "kill_burst",
    layerId: "player_projectiles_high",
    color: "#f43f5e",
    secondaryColor: "#fef3c7",
    defaultText: "破",
    defaultIntensity: "small",
    priority: "normal",
    durationFrames: 28,
    radius: 46,
    alpha: 0.72,
    sfxCueId: "sfx.death.enemy_small_burst_01",
    shakeIntensity: "small",
    spriteAssetId: "vfx.explosion.small_01",
    spriteScale: 0.72
  },
  pickup: {
    kind: "pickup",
    layerId: "pickup_trails",
    color: "#34d399",
    secondaryColor: "#fef3c7",
    defaultIntensity: "micro",
    priority: "low",
    durationFrames: 14,
    radius: 20,
    alpha: 0.62
  },
  boss_phase: {
    kind: "boss_phase",
    layerId: "player_projectiles_high",
    color: "#38bdf8",
    secondaryColor: "#facc15",
    defaultText: "劫灵换相",
    defaultIntensity: "large",
    priority: "critical",
    durationFrames: 72,
    radius: 96,
    alpha: 0.66,
    sfxCueId: "sfx.warning.boss_tribulation_01",
    shakeIntensity: "large",
    spriteAssetId: "vfx.lightning.chain_01",
    spriteScale: 2.2
  },
  boss_death: {
    kind: "boss_death",
    layerId: "foreground_effects",
    color: "#facc15",
    secondaryColor: "#ffffff",
    defaultText: "青云劫灵崩解",
    defaultIntensity: "ultimate",
    priority: "critical",
    durationFrames: 180,
    radius: 132,
    alpha: 0.64,
    sfxCueId: "sfx.explosion.elite_heavy_01",
    shakeIntensity: "ultimate",
    spriteAssetId: "vfx.explosion.small_01",
    spriteScale: 2.35
  },
  floating_text: {
    kind: "floating_text",
    layerId: "foreground_effects",
    color: "#ffffff",
    secondaryColor: "#facc15",
    defaultIntensity: "micro",
    priority: "normal",
    durationFrames: 36,
    radius: 24,
    alpha: 0.82
  }
});

const SHAKE_PIXELS: Readonly<Record<CanvasPresentationVisualIntensity, number>> = Object.freeze({
  micro: 2,
  small: 4,
  medium: 8,
  large: 14,
  ultimate: 20
});

const SHAKE_DURATION_FRAMES: Readonly<Record<CanvasPresentationVisualIntensity, number>> = Object.freeze({
  micro: 6,
  small: 10,
  medium: 18,
  large: 30,
  ultimate: 45
});

export class ImpactVfxRenderer {
  public createCommands(
    presentation: Pick<CanvasPresentationState, "frame" | "visualEvents" | "enemyProjectiles" | "warnings">
  ): readonly RenderCommand[] {
    const pressure = pressureStateFor(presentation);
    const lowPriorityHitCounts = new Map<string, number>();
    const commands: RenderCommand[] = [];

    for (const event of presentation.visualEvents) {
      const profile = getImpactVfxProfile(event.kind);
      if (!isImpactEventActive(event, profile, presentation.frame)) {
        continue;
      }
      if (!shouldDrawEvent(event, profile, pressure, lowPriorityHitCounts)) {
        continue;
      }
      commands.push({
        id: `impact_vfx_${event.id}`,
        layerId: profile.layerId,
        draw: (context) => drawImpactEvent(context, event, profile, presentation.frame, pressure)
      });
    }

    return Object.freeze(commands);
  }
}

export function getImpactVfxProfile(kind: CanvasPresentationVisualEventKind): ImpactVfxProfile {
  return IMPACT_VFX_PROFILES[kind];
}

export function createImpactSpriteVfxRequests(
  presentation: Pick<CanvasPresentationState, "frame" | "visualEvents" | "enemyProjectiles" | "warnings">
): readonly CanvasPresentationSpriteVfxRequest[] {
  const pressure = pressureStateFor(presentation);
  const lowPriorityHitCounts = new Map<string, number>();
  const requests: CanvasPresentationSpriteVfxRequest[] = [];

  for (const event of presentation.visualEvents) {
    const profile = getImpactVfxProfile(event.kind);
    if (profile.spriteAssetId === undefined || !isImpactEventActive(event, profile, presentation.frame)) {
      continue;
    }
    if (!shouldDrawEvent(event, profile, pressure, lowPriorityHitCounts)) {
      continue;
    }
    requests.push({
      id: `impact_${event.id}`,
      assetId: profile.spriteAssetId,
      position: event.position,
      startFrame: event.frame,
      layerId: profile.layerId,
      scale: profile.spriteScale ?? 1,
      alpha: pressure.highPressure && profile.priority === "normal" ? 0.46 : 0.74,
      loopOverride: false,
      blendModeOverride: profile.kind === "boss_killed" || profile.kind === "elite_killed" ? "screen" : "lighter"
    });
  }

  return Object.freeze(requests);
}

export function computeImpactScreenShake(
  presentation: Pick<CanvasPresentationState, "frame" | "visualEvents" | "enemyProjectiles" | "warnings">
): Vec2 {
  const pressure = pressureStateFor(presentation);
  let strongest:
    | {
        readonly event: CanvasPresentationVisualEvent;
        readonly intensity: CanvasPresentationVisualIntensity;
        readonly ageFrames: number;
      }
    | undefined;

  for (const event of presentation.visualEvents) {
    const profile = getImpactVfxProfile(event.kind);
    const rawIntensity = event.shakeIntensity ?? profile.shakeIntensity;
    if (rawIntensity === undefined) {
      continue;
    }
    const durationFrames = SHAKE_DURATION_FRAMES[rawIntensity];
    const ageFrames = Math.max(0, presentation.frame - event.frame);
    if (ageFrames > durationFrames) {
      continue;
    }
    const intensity = capShakeIntensity(rawIntensity, pressure);
    if (strongest === undefined || SHAKE_PIXELS[intensity] > SHAKE_PIXELS[strongest.intensity]) {
      strongest = { event, intensity, ageFrames };
    }
  }

  if (strongest === undefined) {
    return { x: 0, y: 0 };
  }

  const durationFrames = SHAKE_DURATION_FRAMES[strongest.intensity];
  const fade = 1 - strongest.ageFrames / Math.max(1, durationFrames);
  const magnitude = SHAKE_PIXELS[strongest.intensity] * fade;
  const seed = hash(`${strongest.event.id}:${presentation.frame}`);
  const xSign = seed % 2 === 0 ? 1 : -1;
  const ySign = (seed >>> 1) % 2 === 0 ? 1 : -1;
  return {
    x: round2(xSign * magnitude),
    y: round2(ySign * magnitude * 0.68)
  };
}

function drawImpactEvent(
  context: CanvasLikeContext,
  event: CanvasPresentationVisualEvent,
  profile: ImpactVfxProfile,
  frame: number,
  pressure: ImpactPressureState
): void {
  const ageFrames = Math.max(0, frame - event.frame);
  const lifeFade = 1 - ageFrames / Math.max(1, profile.durationFrames);
  const alpha = clamp01(profile.alpha * lifeFade * (pressure.highPressure && profile.priority === "normal" ? 0.72 : 1));
  const radius = eventRadius(event, profile, ageFrames);

  context.recordCommand?.(profile.layerId, `impact_vfx_${event.id}`);
  if (profile.kind === "projectile_hit" || profile.kind === "hit_spark") {
    drawImpactStar(context, event.position, radius, event.color || profile.color, profile.secondaryColor, alpha);
    return;
  }

  if (profile.kind === "enemy_damaged") {
    drawImpactStar(context, event.position, radius, event.color || profile.color, profile.secondaryColor, alpha * 0.82);
    return;
  }

  if (profile.kind === "player_hit") {
    drawFilledCircle(context, event.position, Math.max(6, radius * 0.38), profile.color, alpha * 0.72);
    drawRing(context, event.position, radius, profile.secondaryColor, 3, alpha);
    return;
  }

  drawRing(context, event.position, radius, event.color || profile.color, profile.kind === "boss_killed" ? 5 : 3, alpha);
  drawRing(context, event.position, radius * 0.55, profile.secondaryColor, 2, alpha * 0.58);
  for (const particle of createRenderVfxParticles({ frame, events: [event], budget: pressure.highPressure ? 18 : 64 })) {
    drawFilledCircle(context, particle.position, particle.size, particle.color, particle.alpha * alpha);
  }
  if (profile.kind === "elite_killed" || profile.kind === "boss_phase_changed" || profile.kind === "boss_killed") {
    drawLine(context, { x: event.position.x - radius, y: event.position.y }, { x: event.position.x + radius, y: event.position.y }, profile.secondaryColor, 2, alpha * 0.54);
    drawLine(context, { x: event.position.x, y: event.position.y - radius }, { x: event.position.x, y: event.position.y + radius }, profile.secondaryColor, 2, alpha * 0.54);
  }

  const text = pressure.highPressure && profile.priority === "normal" ? undefined : event.text ?? profile.defaultText;
  if (text !== undefined) {
    drawText(context, text, { x: event.position.x, y: event.position.y - profile.radius }, event.color || profile.color, "16px system-ui, sans-serif", "center", alpha);
  }
}

function drawImpactStar(context: CanvasLikeContext, position: Vec2, radius: number, color: string, secondaryColor: string, alpha: number): void {
  drawFilledCircle(context, position, Math.max(2, radius * 0.18), "#ffffff", alpha);
  drawLine(context, { x: position.x - radius, y: position.y }, { x: position.x + radius, y: position.y }, color, 2, alpha);
  drawLine(context, { x: position.x, y: position.y - radius }, { x: position.x, y: position.y + radius }, secondaryColor, 2, alpha * 0.82);
  drawRing(context, position, radius * 0.6, color, 1.5, alpha * 0.46);
}

function shouldDrawEvent(
  event: CanvasPresentationVisualEvent,
  profile: ImpactVfxProfile,
  pressure: ImpactPressureState,
  lowPriorityHitCounts: Map<string, number>
): boolean {
  if (!pressure.highPressure) {
    return true;
  }
  if (profile.kind === "enemy_damaged") {
    return false;
  }
  if (profile.kind === "projectile_hit" || profile.kind === "hit_spark") {
    const count = lowPriorityHitCounts.get(profile.kind) ?? 0;
    lowPriorityHitCounts.set(profile.kind, count + 1);
    return count < HIGH_PRESSURE_HIT_SPARK_LIMIT;
  }
  return event.priority === "critical" || profile.priority !== "low";
}

function isImpactEventActive(event: CanvasPresentationVisualEvent, profile: ImpactVfxProfile, frame: number): boolean {
  return frame - event.frame <= profile.durationFrames;
}

function eventRadius(event: CanvasPresentationVisualEvent, profile: ImpactVfxProfile, ageFrames: number): number {
  const intensity = event.intensity ?? profile.defaultIntensity;
  const multiplier =
    intensity === "ultimate" ? 1.12 : intensity === "large" ? 1.02 : intensity === "medium" ? 0.92 : intensity === "small" ? 0.78 : 0.56;
  return round2(profile.radius * multiplier + Math.min(ageFrames, profile.durationFrames) * 0.45);
}

function pressureStateFor(
  presentation: Pick<CanvasPresentationState, "enemyProjectiles" | "warnings">
): ImpactPressureState {
  const enemyBulletsAlive = presentation.enemyProjectiles.length > 0;
  return {
    enemyBulletsAlive,
    highPressure:
      presentation.enemyProjectiles.length > HIGH_PRESSURE_ENEMY_BULLET_THRESHOLD ||
      presentation.warnings.some((warning) => warning.kind === "tribulation")
  };
}

function capShakeIntensity(
  intensity: CanvasPresentationVisualIntensity,
  pressure: ImpactPressureState
): CanvasPresentationVisualIntensity {
  if (!pressure.enemyBulletsAlive) {
    return intensity;
  }
  if (intensity === "ultimate" || intensity === "large") {
    return "medium";
  }
  return intensity;
}

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 1));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
