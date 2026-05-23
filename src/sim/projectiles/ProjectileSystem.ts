import { EntityManager, type EntityAllocatorState, type EntityId } from "../entity/EntityManager";
import type { PlayerId } from "../input/FrameInput";
import type { Vec2 } from "../player/PlayerSystem";

export type PlayerProjectileKind = "linear" | "delayed_area";

export interface ProjectileState {
  readonly entityId: EntityId;
  readonly ownerPlayerId: PlayerId;
  readonly artifactId: string;
  readonly patternId: string;
  readonly kind: PlayerProjectileKind;
  readonly position: Vec2;
  readonly velocity: Vec2;
  readonly damage: number;
  readonly radius: number;
  readonly pierce: number;
  readonly spawnFrame: number;
  readonly delayFrames: number;
}

export type ProjectileSpawnInput = Omit<ProjectileState, "entityId">;

export class ProjectileManager {
  private readonly entities: EntityManager<ProjectileSpawnInput>;

  public constructor(state?: EntityAllocatorState) {
    this.entities = new EntityManager<ProjectileSpawnInput>(state);
  }

  public spawnProjectile(input: ProjectileSpawnInput): ProjectileState {
    validateProjectileSpawn(input);
    return this.entities.create(input);
  }

  public getProjectilesSorted(): readonly ProjectileState[] {
    return this.entities.getAllSorted();
  }

  public clear(): void {
    this.entities.clear();
  }

  public getAllocatorState(): EntityAllocatorState {
    return this.entities.getAllocatorState();
  }
}

function validateProjectileSpawn(input: ProjectileSpawnInput): void {
  assertNonEmpty(input.ownerPlayerId, "ownerPlayerId");
  assertNonEmpty(input.artifactId, "artifactId");
  assertNonEmpty(input.patternId, "patternId");
  assertFinite(input.position.x, "position.x");
  assertFinite(input.position.y, "position.y");
  assertFinite(input.velocity.x, "velocity.x");
  assertFinite(input.velocity.y, "velocity.y");
  assertPositiveFinite(input.damage, "damage");
  assertPositiveFinite(input.radius, "radius");
  assertNonNegativeInteger(input.pierce, "pierce");
  assertNonNegativeInteger(input.spawnFrame, "spawnFrame");
  assertNonNegativeInteger(input.delayFrames, "delayFrames");
}

function assertNonEmpty(value: string, label: string): void {
  if (value.length === 0) {
    throw new Error(`${label} must not be empty`);
  }
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

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
}
