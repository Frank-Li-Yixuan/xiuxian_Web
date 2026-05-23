// 双人雷霆战机修仙版 · VFX 类型契约 v0.1
// 目标：表现层可数据驱动，且不污染确定性战斗模拟。

export type Id = string;
export type Frame = number;

export interface Vec2 {
  x: number;
  y: number;
}

export type RenderLayerId =
  | "background_far"
  | "background_near"
  | "pickup_trails"
  | "player_projectiles_low"
  | "enemies"
  | "boss"
  | "player_projectiles_high"
  | "enemy_bullets"
  | "tribulation_warnings"
  | "tribulation_strikes"
  | "players"
  | "player_hitbox"
  | "rescue_and_soul"
  | "foreground_effects"
  | "hud"
  | "major_overlay";

export interface RenderLayerDefinition {
  id: RenderLayerId;
  z: number;
  description: string;
}

export type EffectCategory =
  | "hit"
  | "death"
  | "player"
  | "spell"
  | "artifact"
  | "pill"
  | "tribulation"
  | "boss"
  | "pickup"
  | "coop"
  | "ui";

export type ScreenShakeProfileId = "micro" | "small" | "medium" | "large" | "ultimate";

export interface ScreenShakeRequest {
  profileId: ScreenShakeProfileId;
  intensityOverridePx?: number;
  durationOverrideFrames?: Frame;
  protectTribulationWarning?: boolean;
}

export interface ScreenFlashRequest {
  alpha: number;
  frames: Frame;
  color?: string;
  requiresClear?: boolean;
}

export type ParticleShape =
  | "point"
  | "line"
  | "star"
  | "diamond"
  | "ring"
  | "multi_ring"
  | "sword"
  | "flame_tongue"
  | "rune"
  | "lightning_branch"
  | "spirit_mote"
  | "short_trail";

export interface ParticleEmitterDefinition {
  shape: ParticleShape | string;
  count?: [number, number];
  lifeFrames?: [Frame, Frame];
  speed?: [number, number];
  size?: [number, number];
  colors?: string[];
  blendMode?: "normal" | "additive" | "screen";
  alpha?: number;
}

export interface EffectDefinition {
  id: Id;
  name: string;
  category: EffectCategory;
  defaultLayer: RenderLayerId;
  durationFrames: Frame; // -1 means attached/controlled by owning state.
  maxInstances: number;
  screenShake?: ScreenShakeProfileId | ScreenShakeRequest | null;
  screenFlash?: ScreenFlashRequest | null;
  particles?: ParticleEmitterDefinition | Record<string, unknown>;
  readability?: ReadabilityHint;
}

export interface ReadabilityHint {
  belowEnemyBullets?: boolean;
  enemyBulletsAbove?: boolean;
  protectedHitboxHole?: boolean;
  fillAlphaMax?: number;
  ringAlphaMax?: number;
  fieldFillAlphaMax?: number;
  unabsorbableBulletOutline?: string;
  chainLineAlphaMax?: number;
  maxConcurrentChainLines?: number;
}

export interface EffectEvent {
  id: Id;
  effectId: Id;
  frame: Frame;
  position?: Vec2;
  rotationRad?: number;
  attachedEntityId?: Id;
  intensity?: number;
  seed?: number;
  layerOverride?: RenderLayerId;
  durationFramesOverride?: Frame;
  tags?: string[];
  payload?: Record<string, unknown>;
}

export interface EffectEventQueue {
  push(event: EffectEvent): void;
  drainFrame(frame: Frame): EffectEvent[];
  clear(): void;
}

export interface VfxQualityProfile {
  normalParticles: number;
  spellParticles: number;
  backgroundParticles: number;
  pickupTrails: number;
  audioVoices: number;
  targetFps: number;
}

export type VfxQuality = "low" | "medium" | "high";

export interface ParticleBudgetConfig {
  defaultQuality: VfxQuality;
  qualityProfiles: Record<VfxQuality, VfxQualityProfile>;
  autoDowngrade: {
    fpsBelow: number;
    frames: Frame;
    poolUsageAbove: number;
  };
  autoUpgrade: {
    fpsAbove: number;
    frames: Frame;
  };
  mergeThresholds: Record<string, number>;
}

export interface ReadabilityRules {
  protectedHitboxRadiusPx: number;
  largeSpellAlphaMax: number;
  flashAlphaMaxWhileBulletsAlive: number;
  enemyBulletCoreMinRadiusPx: number;
  enemyBulletAlphaMin: number;
  tribulationWarningFrames: Frame;
  lastWarningFlashFrames: Frame;
  pickupTrailMaxFrames: Frame;
  maxDisplayedPickupTrailsHighPressure: number;
}

export interface ReadabilityGuardContext {
  enemyBulletCount: number;
  tribulationActive: boolean;
  bossActive: boolean;
  playerHitboxPositions: Vec2[];
  quality: VfxQuality;
}

export interface ProceduralAudioCueDefinition {
  osc: "sine" | "square" | "triangle" | "sawtooth" | "noise";
  freqHz?: number[];
  filter?: "lowpass" | "highpass" | "bandpass";
  durationMs: number;
  gain: number;
}

export interface ProceduralAudioConfig {
  externalAudioAllowed: false;
  engine: "WebAudio procedural cues" | string;
  priority: string[];
  cues: Record<Id, ProceduralAudioCueDefinition>;
  throttling: {
    sameCueMinGapFrames: Frame;
    enemyDeathVoiceLimitPerFrame: number;
    pickupCueBatchWindowFrames: Frame;
  };
}

export interface ScreenShakeState {
  remainingFrames: Frame;
  intensityPx: number;
  seed: number;
}

export interface VfxRuntimeState {
  quality: VfxQuality;
  activeEffects: number;
  activeParticles: number;
  screenShake?: ScreenShakeState;
  frame: Frame;
}
