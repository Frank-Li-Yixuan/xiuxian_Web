import type { Vec2 } from "../sim/player/PlayerSystem";

export type CanvasPlayerRenderColor = "player1" | "player2";

export interface CanvasPresentationState {
  readonly frame: number;
  readonly screen: {
    readonly width: number;
    readonly height: number;
  };
  readonly players: readonly CanvasPresentationPlayer[];
  readonly enemies: readonly CanvasPresentationEnemy[];
  readonly playerProjectiles: readonly CanvasPresentationPlayerProjectile[];
  readonly enemyProjectiles: readonly CanvasPresentationEnemyProjectile[];
  readonly pickups: readonly CanvasPresentationPickup[];
  readonly warnings: readonly CanvasPresentationWarning[];
  readonly visualEvents: readonly CanvasPresentationVisualEvent[];
  readonly boss?: CanvasPresentationBoss;
}

export interface CanvasPresentationPlayer {
  readonly playerId: string;
  readonly position: Vec2;
  readonly renderColor: CanvasPlayerRenderColor;
  readonly realmLayer: number;
  readonly aliveState: "body" | "soul" | "yang_shen" | "reshaping" | "dead";
  readonly focusActive: boolean;
  readonly hpRatio: number;
  readonly qiRatio: number;
}

export interface CanvasPresentationEnemy {
  readonly entityId: number;
  readonly enemyId: string;
  readonly renderKind:
    | "mountain_imp"
    | "wolf_demon"
    | "rogue_cultivator_shadow"
    | "stone_armor_demon"
    | "elite_split_wind_wolf"
    | "unknown";
  readonly position: Vec2;
  readonly hpRatio: number;
}

export interface CanvasPresentationPlayerProjectile {
  readonly entityId: number;
  readonly ownerPlayerId: string;
  readonly artifactId: string;
  readonly renderKind: "flying_sword" | "gourd_flame" | "seal_impact";
  readonly position: Vec2;
  readonly velocity: Vec2;
  readonly radius: number;
  readonly pierce: number;
}

export interface CanvasPresentationEnemyProjectile {
  readonly entityId: number;
  readonly ownerKind: "enemy" | "boss" | "tribulation";
  readonly ownerId: string;
  readonly renderKind: "enemy_basic" | "enemy_spread" | "boss_orb" | "boss_big" | "tribulation";
  readonly position: Vec2;
  readonly velocity: Vec2;
  readonly radius: number;
}

export interface CanvasPresentationPickup {
  readonly entityId: number;
  readonly pickupId: string;
  readonly position: Vec2;
  readonly label: string;
  readonly renderKind: "spirit_exp" | "qi_orb" | "material" | "pill" | "unknown";
}

export interface CanvasPresentationBoss {
  readonly entityId: number;
  readonly bossId: string;
  readonly renderKind: "qingyun_tribulation_spirit";
  readonly position: Vec2;
  readonly hpRatio: number;
  readonly phaseIndex: number;
  readonly phaseCount: number;
  readonly status: "entering" | "active" | "defeated";
  readonly warningText?: string;
}

export interface CanvasPresentationWarning {
  readonly id: string;
  readonly kind: "tribulation" | "wolf_charge" | "boss_warning";
  readonly position: Vec2;
  readonly radius: number;
  readonly severity: "medium" | "high" | "lethal";
}

export interface CanvasPresentationVisualEvent {
  readonly id: string;
  readonly kind: "hit_spark" | "kill_burst" | "pickup" | "boss_phase" | "boss_death" | "floating_text";
  readonly frame: number;
  readonly position: Vec2;
  readonly color: string;
  readonly text?: string;
  readonly intensity?: "micro" | "small" | "medium" | "large" | "ultimate";
}
