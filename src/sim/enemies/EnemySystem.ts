import { SIM_FPS, assertNonNegativeInteger } from "../SimConstants";
import { EntityManager, type EntityAllocatorState, type EntityId } from "../entity/EntityManager";
import type { CombatPlayerState, Vec2 } from "../player/PlayerSystem";

export interface EnemyDefinitionPack {
  readonly items: readonly EnemyDefinition[];
}

export interface EnemyDefinition {
  readonly id: string;
  readonly hp: number;
  readonly speed: number;
  readonly contactDamage: number;
  readonly behaviorId: EnemyBehaviorId;
  readonly behaviorParams?: Readonly<Record<string, unknown>>;
  readonly bulletPatternId?: string;
  readonly tags?: readonly string[];
}

export type EnemyBehaviorId =
  | "straight_down"
  | "charge_nearest_player"
  | "stop_and_shoot"
  | "slow_tank"
  | "elite_charge";

export type EnemyBehaviorPhase = "spawning" | "moving" | "charging" | "stationary";

export interface EnemyState {
  readonly entityId: EntityId;
  readonly enemyId: string;
  readonly hp: number;
  readonly maxHp: number;
  readonly speed: number;
  readonly contactDamage: number;
  readonly behaviorId: EnemyBehaviorId;
  readonly behaviorParams: Readonly<Record<string, unknown>>;
  readonly behaviorPhase: EnemyBehaviorPhase;
  readonly position: Vec2;
  readonly velocity: Vec2;
  readonly spawnFrame: number;
  readonly sourceSegmentId: string;
  readonly sourceWaveIndex: number;
  readonly sourceGroupIndex: number;
  readonly spawnIndex: number;
  readonly armor: number;
  readonly tags: readonly string[];
  readonly bulletPatternId?: string;
  readonly targetRule?: string;
  readonly targetPlayerId?: string;
}

export interface EnemySpawnInput {
  readonly enemyId?: string;
  readonly enemyDefinition: EnemyDefinition;
  readonly position: Vec2;
  readonly spawnFrame: number;
  readonly sourceSegmentId: string;
  readonly sourceWaveIndex: number;
  readonly sourceGroupIndex: number;
  readonly spawnIndex: number;
  readonly targetRule?: string;
}

type EnemyPayload = Omit<EnemyState, "entityId">;

export class EnemyManager {
  private readonly entities: EntityManager<EnemyPayload>;

  public constructor(state?: EntityAllocatorState) {
    this.entities = new EntityManager<EnemyPayload>(state);
  }

  public spawnEnemy(input: EnemySpawnInput): EnemyState {
    validateSpawnInput(input);
    const definition = input.enemyDefinition;
    const behaviorParams = definition.behaviorParams ?? {};
    const payloadBase = {
      enemyId: definition.id,
      hp: definition.hp,
      maxHp: definition.hp,
      speed: definition.speed,
      contactDamage: definition.contactDamage,
      behaviorId: definition.behaviorId,
      behaviorParams,
      behaviorPhase: "spawning" as const,
      position: input.position,
      velocity: { x: 0, y: 0 },
      spawnFrame: input.spawnFrame,
      sourceSegmentId: input.sourceSegmentId,
      sourceWaveIndex: input.sourceWaveIndex,
      sourceGroupIndex: input.sourceGroupIndex,
      spawnIndex: input.spawnIndex,
      armor: getNumberParam(behaviorParams, "armor", 0),
      tags: definition.tags ?? []
    };

    const withBulletPattern =
      definition.bulletPatternId === undefined ? payloadBase : { ...payloadBase, bulletPatternId: definition.bulletPatternId };
    const withTargetRule = input.targetRule === undefined ? withBulletPattern : { ...withBulletPattern, targetRule: input.targetRule };

    return this.entities.create(withTargetRule);
  }

  public getEnemiesSorted(): readonly EnemyState[] {
    return this.entities.getAllSorted();
  }

  public clear(): void {
    this.entities.clear();
  }
}

export interface StepEnemiesOptions {
  readonly frame: number;
  readonly enemies: readonly EnemyState[];
  readonly players: readonly CombatPlayerState[];
}

export function stepEnemies(options: StepEnemiesOptions): readonly EnemyState[] {
  assertNonNegativeInteger(options.frame, "frame");

  return options.enemies
    .map((enemy) => stepEnemy(enemy, options.players))
    .sort((a, b) => a.entityId - b.entityId);
}

export function indexEnemyDefinitions(
  definitions: readonly EnemyDefinition[]
): Readonly<Record<string, EnemyDefinition>> {
  const indexed: Record<string, EnemyDefinition> = {};
  for (const definition of definitions) {
    validateEnemyDefinition(definition);
    if (indexed[definition.id] !== undefined) {
      throw new Error(`Duplicate enemy definition id: ${definition.id}`);
    }
    indexed[definition.id] = definition;
  }
  return indexed;
}

function stepEnemy(enemy: EnemyState, players: readonly CombatPlayerState[]): EnemyState {
  switch (enemy.behaviorId) {
    case "straight_down":
      return moveEnemy(enemy, { x: 0, y: enemy.speed }, "moving");
    case "slow_tank":
      return moveEnemy(enemy, { x: 0, y: enemy.speed }, "moving");
    case "stop_and_shoot":
      return stepStopAndShoot(enemy);
    case "charge_nearest_player":
      return stepCharge(enemy, players, getNumberParam(enemy.behaviorParams, "chargeSpeed", enemy.speed));
    case "elite_charge":
      return stepCharge(enemy, players, getNumberParam(enemy.behaviorParams, "chargeSpeed", enemy.speed));
    default:
      throw new Error(`Unsupported enemy behavior: ${enemy.behaviorId}`);
  }
}

function stepStopAndShoot(enemy: EnemyState): EnemyState {
  const stopY = getNumberParam(enemy.behaviorParams, "stopY", enemy.position.y);
  if (enemy.position.y >= stopY) {
    return {
      ...enemy,
      behaviorPhase: "stationary",
      position: { x: enemy.position.x, y: stopY },
      velocity: { x: 0, y: 0 }
    };
  }

  const velocity = { x: 0, y: enemy.speed };
  const nextY = Math.min(stopY, enemy.position.y + velocity.y / SIM_FPS);
  return {
    ...enemy,
    behaviorPhase: nextY >= stopY ? "stationary" : "moving",
    position: { x: enemy.position.x, y: nextY },
    velocity: nextY >= stopY ? { x: 0, y: 0 } : velocity
  };
}

function stepCharge(enemy: EnemyState, players: readonly CombatPlayerState[], chargeSpeed: number): EnemyState {
  const target = findNearestBodyPlayer(enemy.position, players);
  if (target === undefined) {
    return moveEnemy(enemy, { x: 0, y: enemy.speed }, "moving");
  }

  const direction = normalize({
    x: target.position.x - enemy.position.x,
    y: target.position.y - enemy.position.y
  });
  const velocity = {
    x: roundTiny(direction.x * chargeSpeed),
    y: roundTiny(direction.y * chargeSpeed)
  };

  return {
    ...moveEnemy(enemy, velocity, "charging"),
    targetPlayerId: target.playerId
  };
}

function moveEnemy(enemy: EnemyState, velocity: Vec2, behaviorPhase: EnemyBehaviorPhase): EnemyState {
  return {
    ...enemy,
    behaviorPhase,
    velocity,
    position: {
      x: enemy.position.x + velocity.x / SIM_FPS,
      y: enemy.position.y + velocity.y / SIM_FPS
    }
  };
}

function findNearestBodyPlayer(position: Vec2, players: readonly CombatPlayerState[]): CombatPlayerState | undefined {
  let nearest: CombatPlayerState | undefined;
  let nearestDistanceSq = Number.POSITIVE_INFINITY;

  for (const player of players) {
    if (player.aliveState !== "body" && player.aliveState !== "yang_shen") {
      continue;
    }

    const dx = player.position.x - position.x;
    const dy = player.position.y - position.y;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq < nearestDistanceSq || (distanceSq === nearestDistanceSq && player.playerId < (nearest?.playerId ?? ""))) {
      nearest = player;
      nearestDistanceSq = distanceSq;
    }
  }

  return nearest;
}

function normalize(vector: Vec2): Vec2 {
  const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  if (magnitude === 0) {
    return { x: 0, y: 1 };
  }
  return { x: vector.x / magnitude, y: vector.y / magnitude };
}

function getNumberParam(params: Readonly<Record<string, unknown>>, key: string, fallback: number): number {
  const value = params[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function validateSpawnInput(input: EnemySpawnInput): void {
  validateEnemyDefinition(input.enemyDefinition);
  if (input.enemyId !== undefined && input.enemyId !== input.enemyDefinition.id) {
    throw new Error(`Spawn enemyId '${input.enemyId}' does not match definition '${input.enemyDefinition.id}'`);
  }
  assertFinite(input.position.x, "position.x");
  assertFinite(input.position.y, "position.y");
  assertNonNegativeInteger(input.spawnFrame, "spawnFrame");
  assertNonNegativeInteger(input.sourceWaveIndex, "sourceWaveIndex");
  assertNonNegativeInteger(input.sourceGroupIndex, "sourceGroupIndex");
  assertNonNegativeInteger(input.spawnIndex, "spawnIndex");
  if (input.sourceSegmentId.length === 0) {
    throw new Error("sourceSegmentId must not be empty");
  }
}

function validateEnemyDefinition(definition: EnemyDefinition): void {
  if (definition.id.length === 0) {
    throw new Error("enemy definition id must not be empty");
  }
  assertPositiveFinite(definition.hp, "enemy hp");
  assertPositiveFinite(definition.speed, "enemy speed");
  assertPositiveFinite(definition.contactDamage, "enemy contactDamage");
}

function assertPositiveFinite(value: number, label: string): void {
  assertFinite(value, label);
  if (value <= 0) {
    throw new Error(`${label} must be positive`);
  }
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`);
  }
}

function roundTiny(value: number): number {
  return Math.abs(value) < 1e-12 ? 0 : value;
}
