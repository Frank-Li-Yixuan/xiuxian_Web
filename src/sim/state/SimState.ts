import type { RngStreamState } from "../core/SeededRng";
import type { EntityId } from "../entity/EntityManager";
import type { PlayerId } from "../input/FrameInput";

export interface Vec2State {
  readonly x: number;
  readonly y: number;
}

export type AliveState = "body" | "soul" | "yang_shen" | "reshaping" | "dead";

export interface PillDigestionState {
  readonly pillId: string;
  readonly remainingFrames: number;
  readonly totalFrames: number;
}

export interface PlayerState {
  readonly playerId: PlayerId;
  readonly aliveState: AliveState;
  readonly hp: number;
  readonly maxHp: number;
  readonly qi: number;
  readonly maxQi: number;
  readonly position: Vec2State;
  readonly cooldowns: Readonly<Record<string, number>>;
  readonly digestionSlots: readonly PillDigestionState[];
}

export interface EnemyState {
  readonly entityId: EntityId;
  readonly enemyId: string;
  readonly hp: number;
  readonly position: Vec2State;
}

export interface ProjectileState {
  readonly entityId: EntityId;
  readonly ownerKind: "player" | "enemy" | "boss" | "tribulation";
  readonly ownerId: string;
  readonly damage: number;
  readonly position: Vec2State;
}

export interface PickupState {
  readonly entityId: EntityId;
  readonly pickupId: string;
  readonly amount: number;
  readonly position: Vec2State;
}

export interface BossState {
  readonly entityId: EntityId;
  readonly bossId: string;
  readonly hp: number;
  readonly phaseIndex: number;
}

export interface TribulationState {
  readonly id: string;
  readonly triggeringPlayerId: PlayerId;
  readonly startFrame: number;
  readonly phase: string;
}

export interface TeamInsightExpState {
  readonly level: number;
  readonly exp: number;
  readonly expToNext: number;
  readonly sharedFortuneReroll: number;
}

export interface PlayerCultivationState {
  readonly playerId: PlayerId;
  readonly realmId: string;
  readonly layer: number;
  readonly cultivation: number;
  readonly cultivationToNext: number;
  readonly inTribulation: boolean;
}

export interface RescueState {
  readonly downedPlayerId: PlayerId;
  readonly rescuerPlayerId?: PlayerId;
  readonly progressFrames: number;
  readonly requiredFrames: number;
}

export interface SimState {
  readonly runId: string;
  readonly seed: number;
  readonly dataPackHash: string;
  readonly stageId: string;
  readonly frame: number;
  readonly players: readonly PlayerState[];
  readonly enemies: readonly EnemyState[];
  readonly projectiles: readonly ProjectileState[];
  readonly pickups: readonly PickupState[];
  readonly bosses: readonly BossState[];
  readonly tribulations: readonly TribulationState[];
  readonly teamInsightExp: TeamInsightExpState;
  readonly playerCultivations: readonly PlayerCultivationState[];
  readonly rescueStates: readonly RescueState[];
  readonly rng: Readonly<Record<string, RngStreamState>>;
}

export interface InitialSimStateOptions {
  readonly runId: string;
  readonly seed: number;
  readonly dataPackHash: string;
  readonly stageId: string;
}

export function createInitialSimState(options: InitialSimStateOptions): SimState {
  return {
    runId: options.runId,
    seed: options.seed,
    dataPackHash: options.dataPackHash,
    stageId: options.stageId,
    frame: 0,
    players: [],
    enemies: [],
    projectiles: [],
    pickups: [],
    bosses: [],
    tribulations: [],
    teamInsightExp: {
      level: 1,
      exp: 0,
      expToNext: 100,
      sharedFortuneReroll: 0
    },
    playerCultivations: [],
    rescueStates: [],
    rng: {}
  };
}
