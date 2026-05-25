export type ScenarioId =
  | "five_thunder_chain"
  | "red_lotus_field"
  | "sleeve_universe_absorb"
  | "tribulation_warning"
  | "boss_death_cascade"
  | "impact_gallery";

export type ImpactFeedbackTypeId =
  | "light_hit"
  | "thunder_hit"
  | "fire_dot_hit"
  | "armor_break_hit"
  | "kill_pop"
  | "enemy_bullet_blocked"
  | "enemy_bullet_clear"
  | "player_bullet_impact"
  | "boss_bullet_impact"
  | "graze_flash";

export type PresetId = "readable" | "balanced" | "flashy";

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface VfxPreset {
  readonly id: PresetId;
  readonly name: string;
  readonly particleScale: number;
  readonly filterStrength: number;
  readonly flashAlpha: number;
}

export interface VfxScenario {
  readonly id: ScenarioId;
  readonly name: string;
  readonly reviewNote: string;
  readonly durationFrames: number;
  readonly enemyBullets: number;
  readonly playerPosition: Vec2;
}

export interface ImpactFeedback {
  readonly id: ImpactFeedbackTypeId;
  readonly name: string;
  readonly reviewNote: string;
  readonly family: "enemy_hit" | "bullet_impact";
}
