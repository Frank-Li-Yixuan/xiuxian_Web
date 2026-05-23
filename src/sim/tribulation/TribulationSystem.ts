import type { SeededRng } from "../core/SeededRng";
import { secondsToFrames } from "../SimConstants";
import type { EntityId } from "../entity/EntityManager";
import type { CultivationData, CultivationPlayerState } from "../progression/CultivationSystem";
import type { PlayerCultivationState, Vec2State } from "../state/SimState";

export interface DynamicTribulationEventPack {
  readonly dynamicInRunEvents: readonly DynamicTribulationEventDefinition[];
}

export interface DynamicTribulationEventDefinition {
  readonly id: string;
  readonly trigger: {
    readonly type: "cultivation_full";
    readonly realmFrom: string;
    readonly realmTo: string;
  };
  readonly duration: number;
  readonly mechanics: readonly TribulationMechanicDefinition[];
  readonly success: readonly TribulationOutcomeDefinition[];
  readonly failure: readonly TribulationOutcomeDefinition[];
}

export interface TribulationMechanicDefinition {
  readonly at: number;
  readonly patternId: string;
  readonly repeat?: {
    readonly count: number;
    readonly interval: number;
  };
  readonly params: Readonly<Record<string, unknown>>;
}

export interface TribulationOutcomeDefinition {
  readonly effectId: string;
  readonly type: "clear_bullets" | "buff";
  readonly params: Readonly<Record<string, unknown>>;
}

export interface DynamicTribulationEvents {
  readonly events: Readonly<Record<string, DynamicTribulationEventDefinition>>;
}

export interface ActiveTribulationState {
  readonly id: string;
  readonly triggeringPlayerId: string;
  readonly startFrame: number;
  readonly endFrame: number;
  readonly phase: "active";
  readonly debug: boolean;
}

export interface StartDebugTribulationOptions {
  readonly frame: number;
  readonly playerId: string;
  readonly eventId: string;
  readonly tribulationEvents: DynamicTribulationEvents;
}

export interface TribulationWarningEvent {
  readonly frame: number;
  readonly tribulationId: string;
  readonly playerId: string;
  readonly patternId: string;
  readonly index: number;
  readonly position: Vec2State;
  readonly warningFrames: number;
  readonly damage: number;
  readonly unbreakable: boolean;
}

export interface StepTribulationSystemOptions {
  readonly frame: number;
  readonly activeTribulations: readonly ActiveTribulationState[];
  readonly players: readonly CultivationPlayerState[];
  readonly tribulationEvents: DynamicTribulationEvents;
  readonly tribulationRng: SeededRng;
  readonly combatBounds?: CombatBounds;
}

export interface CombatBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface StepTribulationSystemResult {
  readonly activeTribulations: readonly ActiveTribulationState[];
  readonly warningEvents: readonly TribulationWarningEvent[];
}

export interface TribulationEnemyState {
  readonly entityId: EntityId;
  readonly enemyId: string;
  readonly hp: number;
  readonly position: Vec2State;
}

export interface TribulationEnemyProjectileState {
  readonly entityId: EntityId;
  readonly ownerKind: string;
  readonly ownerId: string;
  readonly damage: number;
  readonly position: Vec2State;
}

export type TribulationResolutionEvent =
  | {
      readonly frame: number;
      readonly type: "tribulation_success";
      readonly playerId: string;
      readonly eventId: string;
    }
  | {
      readonly frame: number;
      readonly type: "screen_clear";
      readonly playerId: string;
      readonly eventId: string;
    }
  | {
      readonly frame: number;
      readonly type: "major_breakthrough";
      readonly playerId: string;
      readonly realmFrom: string;
      readonly realmTo: string;
    };

export interface ResolveTribulationSuccessOptions {
  readonly frame: number;
  readonly activeTribulation: ActiveTribulationState;
  readonly players: readonly CultivationPlayerState[];
  readonly enemies: readonly TribulationEnemyState[];
  readonly enemyProjectiles: readonly TribulationEnemyProjectileState[];
  readonly playerCultivations: readonly PlayerCultivationState[];
  readonly cultivationData: CultivationData;
  readonly tribulationEvents: DynamicTribulationEvents;
}

export interface ResolveTribulationSuccessResult {
  readonly players: readonly CultivationPlayerState[];
  readonly enemies: readonly TribulationEnemyState[];
  readonly enemyProjectiles: readonly TribulationEnemyProjectileState[];
  readonly playerCultivations: readonly PlayerCultivationState[];
  readonly events: readonly TribulationResolutionEvent[];
}

const DEFAULT_COMBAT_BOUNDS: CombatBounds = { x: 360, y: 0, width: 1080, height: 1080 };

export function indexDynamicTribulationEvents(pack: DynamicTribulationEventPack): DynamicTribulationEvents {
  const events: Record<string, DynamicTribulationEventDefinition> = {};
  for (const event of pack.dynamicInRunEvents) {
    validateEventDefinition(event);
    if (events[event.id] !== undefined) {
      throw new Error(`Duplicate tribulation event id: ${event.id}`);
    }
    events[event.id] = event;
  }
  return { events };
}

export function startDebugTribulation(options: StartDebugTribulationOptions): ActiveTribulationState {
  assertFrame(options.frame);
  if (options.playerId.length === 0) {
    throw new Error("playerId must not be empty");
  }
  const definition = getEvent(options.tribulationEvents, options.eventId);

  return {
    id: definition.id,
    triggeringPlayerId: options.playerId,
    startFrame: options.frame,
    endFrame: options.frame + secondsToFrames(definition.duration),
    phase: "active",
    debug: true
  };
}

export function stepTribulationSystem(options: StepTribulationSystemOptions): StepTribulationSystemResult {
  assertFrame(options.frame);
  const combatBounds = options.combatBounds ?? DEFAULT_COMBAT_BOUNDS;
  const playerById = new Map(options.players.map((player) => [player.playerId, player]));
  const warningEvents: TribulationWarningEvent[] = [];
  const activeTribulations = [...options.activeTribulations]
    .sort((a, b) => a.triggeringPlayerId.localeCompare(b.triggeringPlayerId) || a.startFrame - b.startFrame)
    .filter((active) => options.frame >= active.startFrame && options.frame < active.endFrame);

  for (const active of activeTribulations) {
    const definition = getEvent(options.tribulationEvents, active.id);
    for (const mechanic of definition.mechanics) {
      if (!isMechanicDue(options.frame, active, mechanic)) {
        continue;
      }
      warningEvents.push(
        ...createWarningsForMechanic({
          frame: options.frame,
          active,
          mechanic,
          player: playerById.get(active.triggeringPlayerId),
          tribulationRng: options.tribulationRng,
          combatBounds
        })
      );
    }
  }

  return {
    activeTribulations,
    warningEvents
  };
}

export function resolveTribulationSuccess(options: ResolveTribulationSuccessOptions): ResolveTribulationSuccessResult {
  assertFrame(options.frame);
  const definition = getEvent(options.tribulationEvents, options.activeTribulation.id);
  const statSurge = definition.success.find((effect) => effect.effectId === "foundation_stat_surge");
  const baseStatMultiplier = numberParam(statSurge?.params ?? {}, "baseStatMultiplier", 1);
  const maxQiMultiplier = numberParam(statSurge?.params ?? {}, "qiPoolMultiplier", 1);
  const shenMultiplier = numberParam(statSurge?.params ?? {}, "shenMultiplier", 1);

  const players = options.players.map((player) => {
    if (player.playerId !== options.activeTribulation.triggeringPlayerId) {
      return player;
    }
    const maxHp = roundStat(player.maxHp * baseStatMultiplier);
    const maxQi = roundStat(player.maxQi * maxQiMultiplier);
    return {
      ...player,
      jing: roundStat(player.jing * baseStatMultiplier),
      qiRoot: roundStat(player.qiRoot * baseStatMultiplier),
      shen: roundStat(player.shen * shenMultiplier),
      maxHp,
      hp: maxHp,
      maxQi,
      qi: maxQi
    };
  });

  const playerCultivations = options.playerCultivations
    .map((cultivation) => {
      if (cultivation.playerId !== options.activeTribulation.triggeringPlayerId) {
        return cultivation;
      }
      return {
        playerId: cultivation.playerId,
        realmId: definition.trigger.realmTo,
        layer: 1,
        cultivation: 0,
        cultivationToNext: getCultivationToNext(options.cultivationData, definition.trigger.realmTo, 1),
        inTribulation: false
      };
    })
    .sort((a, b) => a.playerId.localeCompare(b.playerId));

  return {
    players,
    enemies: [],
    enemyProjectiles: [],
    playerCultivations,
    events: [
      {
        frame: options.frame,
        type: "tribulation_success",
        playerId: options.activeTribulation.triggeringPlayerId,
        eventId: options.activeTribulation.id
      },
      {
        frame: options.frame,
        type: "screen_clear",
        playerId: options.activeTribulation.triggeringPlayerId,
        eventId: options.activeTribulation.id
      },
      {
        frame: options.frame,
        type: "major_breakthrough",
        playerId: options.activeTribulation.triggeringPlayerId,
        realmFrom: definition.trigger.realmFrom,
        realmTo: definition.trigger.realmTo
      }
    ]
  };
}

function isMechanicDue(frame: number, active: ActiveTribulationState, mechanic: TribulationMechanicDefinition): boolean {
  const firstFrame = active.startFrame + secondsToFrames(mechanic.at);
  if (frame === firstFrame) {
    return true;
  }
  if (mechanic.repeat === undefined) {
    return false;
  }
  const intervalFrames = secondsToFrames(mechanic.repeat.interval);
  if (mechanic.repeat.count <= 1 || intervalFrames <= 0 || frame < firstFrame) {
    return false;
  }
  const offsetFrames = frame - firstFrame;
  if (offsetFrames % intervalFrames !== 0) {
    return false;
  }
  const occurrenceIndex = offsetFrames / intervalFrames;
  return occurrenceIndex >= 0 && occurrenceIndex < mechanic.repeat.count;
}

function createWarningsForMechanic(options: {
  readonly frame: number;
  readonly active: ActiveTribulationState;
  readonly mechanic: TribulationMechanicDefinition;
  readonly player: CultivationPlayerState | undefined;
  readonly tribulationRng: SeededRng;
  readonly combatBounds: CombatBounds;
}): readonly TribulationWarningEvent[] {
  switch (options.mechanic.patternId) {
    case "trib_warning_columns_random":
      return createRandomColumnWarnings(options);
    case "trib_player_lock_columns":
      return createPlayerLockWarning(options);
    case "trib_cross_screen_sweep":
      return createCrossScreenWarnings(options);
    default:
      return [];
  }
}

function createRandomColumnWarnings(options: {
  readonly frame: number;
  readonly active: ActiveTribulationState;
  readonly mechanic: TribulationMechanicDefinition;
  readonly tribulationRng: SeededRng;
  readonly combatBounds: CombatBounds;
}): readonly TribulationWarningEvent[] {
  const columns = integerParam(options.mechanic.params, "columns", 1);
  const warningFrames = secondsToFrames(numberParam(options.mechanic.params, "warningTime", 1));
  const damage = numberParam(options.mechanic.params, "damage", 0);
  const unbreakable = booleanParam(options.mechanic.params, "unbreakable", false);
  const events: TribulationWarningEvent[] = [];

  for (let index = 0; index < columns; index += 1) {
    events.push({
      frame: options.frame,
      tribulationId: options.active.id,
      playerId: options.active.triggeringPlayerId,
      patternId: options.mechanic.patternId,
      index,
      position: {
        x: roundPosition(options.tribulationRng.rangeFloat(options.combatBounds.x, options.combatBounds.x + options.combatBounds.width)),
        y: roundPosition(options.tribulationRng.rangeFloat(options.combatBounds.y, options.combatBounds.y + options.combatBounds.height))
      },
      warningFrames,
      damage,
      unbreakable
    });
  }

  return events;
}

function createPlayerLockWarning(options: {
  readonly frame: number;
  readonly active: ActiveTribulationState;
  readonly mechanic: TribulationMechanicDefinition;
  readonly player: CultivationPlayerState | undefined;
}): readonly TribulationWarningEvent[] {
  if (options.player === undefined) {
    return [];
  }
  return [
    {
      frame: options.frame,
      tribulationId: options.active.id,
      playerId: options.active.triggeringPlayerId,
      patternId: options.mechanic.patternId,
      index: 0,
      position: options.player.position,
      warningFrames: secondsToFrames(numberParam(options.mechanic.params, "warningTime", 1)),
      damage: numberParam(options.mechanic.params, "damage", 0),
      unbreakable: booleanParam(options.mechanic.params, "unbreakable", true)
    }
  ];
}

function createCrossScreenWarnings(options: {
  readonly frame: number;
  readonly active: ActiveTribulationState;
  readonly mechanic: TribulationMechanicDefinition;
  readonly combatBounds: CombatBounds;
}): readonly TribulationWarningEvent[] {
  const laneCount = integerParam(options.mechanic.params, "laneCount", 1);
  const warningFrames = secondsToFrames(numberParam(options.mechanic.params, "warningTime", 1));
  const damage = numberParam(options.mechanic.params, "damage", 0);
  const events: TribulationWarningEvent[] = [];

  for (let index = 0; index < laneCount; index += 1) {
    events.push({
      frame: options.frame,
      tribulationId: options.active.id,
      playerId: options.active.triggeringPlayerId,
      patternId: options.mechanic.patternId,
      index,
      position: {
        x: roundPosition(options.combatBounds.x + ((index + 0.5) * options.combatBounds.width) / laneCount),
        y: roundPosition(options.combatBounds.y + options.combatBounds.height / 2)
      },
      warningFrames,
      damage,
      unbreakable: true
    });
  }

  return events;
}

function getEvent(events: DynamicTribulationEvents, eventId: string): DynamicTribulationEventDefinition {
  const event = events.events[eventId];
  if (event === undefined) {
    throw new Error(`Missing tribulation event: ${eventId}`);
  }
  return event;
}

function getCultivationToNext(data: CultivationData, realmId: string, layer: number): number {
  return data.layerProgression[`${realmId}:${layer}`]?.cultivationToNext ?? 0;
}

function validateEventDefinition(event: DynamicTribulationEventDefinition): void {
  if (event.id.length === 0) {
    throw new Error("tribulation event id must not be empty");
  }
  if (!Number.isFinite(event.duration) || event.duration <= 0) {
    throw new Error(`tribulation ${event.id} duration must be positive`);
  }
}

function assertFrame(frame: number): void {
  if (!Number.isInteger(frame) || frame < 0) {
    throw new Error("frame must be a non-negative integer");
  }
}

function numberParam(params: Readonly<Record<string, unknown>>, key: string, fallback: number): number {
  const value = params[key];
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`tribulation param ${key} must be a finite number`);
  }
  return value;
}

function integerParam(params: Readonly<Record<string, unknown>>, key: string, fallback: number): number {
  const value = numberParam(params, key, fallback);
  if (!Number.isInteger(value)) {
    throw new Error(`tribulation param ${key} must be an integer`);
  }
  return value;
}

function booleanParam(params: Readonly<Record<string, unknown>>, key: string, fallback: boolean): boolean {
  const value = params[key];
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== "boolean") {
    throw new Error(`tribulation param ${key} must be a boolean`);
  }
  return value;
}

function roundPosition(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function roundStat(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}
