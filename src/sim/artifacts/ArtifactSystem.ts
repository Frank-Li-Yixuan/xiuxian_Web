import { assertNonNegativeInteger, secondsToFrames } from "../SimConstants";
import type { CombatPlayerState, Vec2 } from "../player/PlayerSystem";
import type { ProjectileManager, ProjectileSpawnInput } from "../projectiles/ProjectileSystem";

export interface ArtifactDefinition {
  readonly id: string;
  readonly attack: ArtifactAttackDefinition;
}

export interface ArtifactAttackDefinition {
  readonly patternId: string;
  readonly fireInterval: number;
  readonly projectileSpeed?: number;
  readonly damage: number;
  readonly projectileCount?: number;
  readonly pierce?: number;
  readonly spreadAngleDeg?: number;
  readonly radius?: number;
  readonly delay?: number;
}

export interface PlayerArtifactRuntimeState {
  readonly playerId: string;
  readonly artifactId: string;
  readonly nextFireFrame: number;
}

export type ArtifactRuntimeState = readonly PlayerArtifactRuntimeState[];

export interface StepArtifactSystemOptions {
  readonly frame: number;
  readonly players: readonly CombatPlayerState[];
  readonly artifactState: ArtifactRuntimeState;
  readonly artifactDefinitions: Readonly<Record<string, ArtifactDefinition>>;
  readonly projectileManager: ProjectileManager;
}

const DEFAULT_LINEAR_PROJECTILE_RADIUS = 4;
const DEFAULT_FAN_PROJECTILE_RADIUS = 12;
const DEFAULT_SLAM_FORWARD_OFFSET_Y = -320;

export function createArtifactRuntimeState(
  players: readonly CombatPlayerState[],
  startFrame = 0
): ArtifactRuntimeState {
  assertNonNegativeInteger(startFrame, "startFrame");

  return players.map((player) => ({
    playerId: player.playerId,
    artifactId: player.natalArtifactId,
    nextFireFrame: startFrame
  }));
}

export function stepArtifactSystem(options: StepArtifactSystemOptions): ArtifactRuntimeState {
  assertNonNegativeInteger(options.frame, "frame");

  const playerById = new Map(options.players.map((player) => [player.playerId, player]));
  return options.artifactState.map((runtime) => {
    const player = playerById.get(runtime.playerId);
    if (player === undefined || player.aliveState !== "body" || options.frame < runtime.nextFireFrame) {
      return runtime;
    }

    const definition = options.artifactDefinitions[runtime.artifactId];
    if (definition === undefined) {
      throw new Error(`Missing artifact definition: ${runtime.artifactId}`);
    }

    spawnArtifactAttack({
      frame: options.frame,
      player,
      definition,
      projectileManager: options.projectileManager
    });

    return {
      ...runtime,
      nextFireFrame: options.frame + getFireIntervalFrames(definition.attack)
    };
  });
}

function spawnArtifactAttack(options: {
  readonly frame: number;
  readonly player: CombatPlayerState;
  readonly definition: ArtifactDefinition;
  readonly projectileManager: ProjectileManager;
}): void {
  const attack = options.definition.attack;

  switch (attack.patternId) {
    case "straight_pierce_sword":
      spawnStraightPierceSword(options.frame, options.player, options.definition, options.projectileManager);
      return;
    case "fan_flame_breath":
      spawnFanFlameBreath(options.frame, options.player, options.definition, options.projectileManager);
      return;
    case "delayed_area_slam":
      spawnDelayedAreaSlam(options.frame, options.player, options.definition, options.projectileManager);
      return;
    default:
      throw new Error(`Unsupported artifact attack pattern: ${attack.patternId}`);
  }
}

function spawnStraightPierceSword(
  frame: number,
  player: CombatPlayerState,
  definition: ArtifactDefinition,
  projectileManager: ProjectileManager
): void {
  const attack = definition.attack;
  const projectileCount = getPositiveInteger(attack.projectileCount ?? 1, "projectileCount");
  const speed = getPositiveFinite(attack.projectileSpeed ?? 0, "projectileSpeed");
  const damage = getPositiveFinite(attack.damage, "damage");
  const pierce = getNonNegativeInteger(attack.pierce ?? 0, "pierce");
  const centerOffset = (projectileCount - 1) / 2;

  for (let index = 0; index < projectileCount; index += 1) {
    projectileManager.spawnProjectile({
      ownerPlayerId: player.playerId,
      artifactId: definition.id,
      patternId: attack.patternId,
      kind: "linear",
      position: {
        x: player.position.x + (index - centerOffset) * 14,
        y: player.position.y
      },
      velocity: { x: 0, y: -speed },
      damage,
      radius: DEFAULT_LINEAR_PROJECTILE_RADIUS,
      pierce,
      spawnFrame: frame,
      delayFrames: 0
    });
  }
}

function spawnFanFlameBreath(
  frame: number,
  player: CombatPlayerState,
  definition: ArtifactDefinition,
  projectileManager: ProjectileManager
): void {
  const attack = definition.attack;
  const projectileCount = getPositiveInteger(attack.projectileCount ?? 1, "projectileCount");
  const speed = getPositiveFinite(attack.projectileSpeed ?? 0, "projectileSpeed");
  const damage = getPositiveFinite(attack.damage, "damage");
  const spreadAngleDeg = getNonNegativeFinite(attack.spreadAngleDeg ?? 0, "spreadAngleDeg");
  const startAngle = -90 - spreadAngleDeg / 2;
  const stepAngle = projectileCount === 1 ? 0 : spreadAngleDeg / (projectileCount - 1);

  for (let index = 0; index < projectileCount; index += 1) {
    const angleRad = degToRad(startAngle + stepAngle * index);
    projectileManager.spawnProjectile({
      ownerPlayerId: player.playerId,
      artifactId: definition.id,
      patternId: attack.patternId,
      kind: "linear",
      position: player.position,
      velocity: {
        x: roundTiny(Math.cos(angleRad) * speed),
        y: roundTiny(Math.sin(angleRad) * speed)
      },
      damage,
      radius: DEFAULT_FAN_PROJECTILE_RADIUS,
      pierce: 0,
      spawnFrame: frame,
      delayFrames: 0
    });
  }
}

function spawnDelayedAreaSlam(
  frame: number,
  player: CombatPlayerState,
  definition: ArtifactDefinition,
  projectileManager: ProjectileManager
): void {
  const attack = definition.attack;
  const damage = getPositiveFinite(attack.damage, "damage");
  const radius = getPositiveFinite(attack.radius ?? 0, "radius");
  const delayFrames = secondsToFrames(getNonNegativeFinite(attack.delay ?? 0, "delay"));
  const targetPosition = getDeterministicForwardTarget(player.position);

  projectileManager.spawnProjectile({
    ownerPlayerId: player.playerId,
    artifactId: definition.id,
    patternId: attack.patternId,
    kind: "delayed_area",
    position: targetPosition,
    velocity: { x: 0, y: 0 },
    damage,
    radius,
    pierce: 0,
    spawnFrame: frame,
    delayFrames
  });
}

function getDeterministicForwardTarget(playerPosition: Vec2): Vec2 {
  return {
    x: playerPosition.x,
    y: playerPosition.y + DEFAULT_SLAM_FORWARD_OFFSET_Y
  };
}

function getFireIntervalFrames(attack: ArtifactAttackDefinition): number {
  return Math.max(1, secondsToFrames(getNonNegativeFinite(attack.fireInterval, "fireInterval")));
}

function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function roundTiny(value: number): number {
  return Math.abs(value) < 1e-12 ? 0 : value;
}

function getPositiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value;
}

function getNonNegativeInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return value;
}

function getPositiveFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number`);
  }
  return value;
}

function getNonNegativeFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative finite number`);
  }
  return value;
}

export type { ProjectileSpawnInput };
