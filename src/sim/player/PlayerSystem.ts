import { SIM_FPS } from "../SimConstants";
import { InputButtonBit, hasInputButton, type FrameInput, type PlayerId, validateFrameInput } from "../input/FrameInput";
import type { AliveState, Vec2State } from "../state/SimState";

export type Vec2 = Vec2State;

export interface CombatBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CombatPlayerState {
  readonly playerId: PlayerId;
  readonly aliveState: AliveState;
  readonly hp: number;
  readonly maxHp: number;
  readonly qi: number;
  readonly maxQi: number;
  readonly position: Vec2;
  readonly moveSpeed: number;
  readonly hitboxRadius: number;
  readonly focusSpeedMultiplier: number;
  readonly natalArtifactId: string;
}

export interface CreateCombatPlayerOptions {
  readonly playerId: PlayerId;
  readonly position: Vec2;
  readonly natalArtifactId: string;
  readonly aliveState?: AliveState;
  readonly hp?: number;
  readonly maxHp?: number;
  readonly qi?: number;
  readonly maxQi?: number;
  readonly moveSpeed?: number;
  readonly hitboxRadius?: number;
  readonly focusSpeedMultiplier?: number;
}

export interface StepPlayersOptions {
  readonly players: readonly CombatPlayerState[];
  readonly frameInputs: readonly FrameInput[];
  readonly combatBounds?: CombatBounds;
}

export const DEFAULT_PLAYER_MOVE_SPEED = 400;
export const DEFAULT_PLAYER_HITBOX_RADIUS = 7;
export const DEFAULT_FOCUS_SPEED_MULTIPLIER = 0.5;
export const DEFAULT_COMBAT_BOUNDS = {
  x: 360,
  y: 0,
  width: 1080,
  height: 1080
} as const satisfies CombatBounds;

export function createCombatPlayer(options: CreateCombatPlayerOptions): CombatPlayerState {
  assertPlayerId(options.playerId);
  assertVec2(options.position, "position");
  assertArtifactId(options.natalArtifactId);

  const maxHp = options.maxHp ?? 100;
  const maxQi = options.maxQi ?? 100;
  const hp = options.hp ?? maxHp;
  const qi = options.qi ?? maxQi;
  const moveSpeed = options.moveSpeed ?? DEFAULT_PLAYER_MOVE_SPEED;
  const hitboxRadius = options.hitboxRadius ?? DEFAULT_PLAYER_HITBOX_RADIUS;
  const focusSpeedMultiplier = options.focusSpeedMultiplier ?? DEFAULT_FOCUS_SPEED_MULTIPLIER;

  assertPositiveFinite(maxHp, "maxHp");
  assertPositiveFinite(maxQi, "maxQi");
  assertNonNegativeFinite(hp, "hp");
  assertNonNegativeFinite(qi, "qi");
  assertPositiveFinite(moveSpeed, "moveSpeed");
  assertPositiveFinite(hitboxRadius, "hitboxRadius");
  assertPositiveFinite(focusSpeedMultiplier, "focusSpeedMultiplier");

  return {
    playerId: options.playerId,
    aliveState: options.aliveState ?? "body",
    hp,
    maxHp,
    qi,
    maxQi,
    position: options.position,
    moveSpeed,
    hitboxRadius,
    focusSpeedMultiplier,
    natalArtifactId: options.natalArtifactId
  };
}

export function stepPlayers(options: StepPlayersOptions): readonly CombatPlayerState[] {
  const combatBounds = options.combatBounds ?? DEFAULT_COMBAT_BOUNDS;
  assertCombatBounds(combatBounds);

  const inputByPlayer = new Map<PlayerId, FrameInput>();
  for (const frameInput of options.frameInputs) {
    validateFrameInput(frameInput);
    inputByPlayer.set(frameInput.playerId, frameInput);
  }

  return options.players.map((player) => {
    const frameInput = inputByPlayer.get(player.playerId);
    if (frameInput === undefined || !canMove(player.aliveState)) {
      return {
        ...player,
        position: clampPositionToBounds(player.position, player.hitboxRadius, combatBounds)
      };
    }

    const axisX = frameInput.moveX;
    const axisY = frameInput.moveY;
    const diagonalMultiplier = axisX !== 0 && axisY !== 0 ? Math.SQRT1_2 : 1;
    const focusMultiplier = hasInputButton(frameInput.downMask, InputButtonBit.Focus) ? player.focusSpeedMultiplier : 1;
    const frameDistance = (player.moveSpeed * focusMultiplier * diagonalMultiplier) / SIM_FPS;
    const nextPosition = {
      x: player.position.x + axisX * frameDistance,
      y: player.position.y + axisY * frameDistance
    };

    return {
      ...player,
      position: clampPositionToBounds(nextPosition, player.hitboxRadius, combatBounds)
    };
  });
}

function canMove(aliveState: AliveState): boolean {
  return aliveState === "body" || aliveState === "yang_shen";
}

function clampPositionToBounds(position: Vec2, hitboxRadius: number, bounds: CombatBounds): Vec2 {
  const minX = bounds.x + hitboxRadius;
  const maxX = bounds.x + bounds.width - hitboxRadius;
  const minY = bounds.y + hitboxRadius;
  const maxY = bounds.y + bounds.height - hitboxRadius;

  return {
    x: clamp(position.x, minX, maxX),
    y: clamp(position.y, minY, maxY)
  };
}

function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    return (min + max) / 2;
  }
  return Math.min(Math.max(value, min), max);
}

function assertCombatBounds(bounds: CombatBounds): void {
  assertVec2({ x: bounds.x, y: bounds.y }, "combatBounds");
  assertPositiveFinite(bounds.width, "combatBounds.width");
  assertPositiveFinite(bounds.height, "combatBounds.height");
}

function assertVec2(position: Vec2, label: string): void {
  assertFinite(position.x, `${label}.x`);
  assertFinite(position.y, `${label}.y`);
}

function assertPlayerId(playerId: PlayerId): void {
  if (playerId.length === 0) {
    throw new Error("playerId must not be empty");
  }
}

function assertArtifactId(artifactId: string): void {
  if (artifactId.length === 0) {
    throw new Error("natalArtifactId must not be empty");
  }
}

function assertPositiveFinite(value: number, label: string): void {
  assertFinite(value, label);
  if (value <= 0) {
    throw new Error(`${label} must be positive`);
  }
}

function assertNonNegativeFinite(value: number, label: string): void {
  assertFinite(value, label);
  if (value < 0) {
    throw new Error(`${label} must be non-negative`);
  }
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`);
  }
}
