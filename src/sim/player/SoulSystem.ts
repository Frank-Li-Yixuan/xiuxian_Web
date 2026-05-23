import { assertNonNegativeInteger, secondsToFrames } from "../SimConstants";
import type { PlayerId } from "../input/FrameInput";
import type { AliveState, PlayerState, RescueState, Vec2State } from "../state/SimState";

export const DEFAULT_RESCUE_REQUIRED_FRAMES = secondsToFrames(2.8);

export interface SoulSystemEffectEvent {
  readonly type: "player_soul";
  readonly effectId: "soul_out";
  readonly frame: number;
  readonly playerId: PlayerId;
  readonly position: Vec2State;
}

export interface StepSoulSystemOptions {
  readonly frame: number;
  readonly players: readonly PlayerState[];
  readonly rescueStates: readonly RescueState[];
  readonly requiredFrames?: number;
}

export interface SoulSystemResult {
  readonly players: readonly PlayerState[];
  readonly rescueStates: readonly RescueState[];
  readonly events: readonly SoulSystemEffectEvent[];
}

export function stepSoulSystem(options: StepSoulSystemOptions): SoulSystemResult {
  assertNonNegativeInteger(options.frame, "frame");
  const requiredFrames = options.requiredFrames ?? DEFAULT_RESCUE_REQUIRED_FRAMES;
  assertPositiveInteger(requiredFrames, "requiredFrames");

  const events: SoulSystemEffectEvent[] = [];
  const players = options.players.map((player) => {
    validatePlayer(player);
    if (player.hp <= 0 && canSoulOut(player.aliveState)) {
      events.push(
        freezeEvent({
          type: "player_soul",
          effectId: "soul_out",
          frame: options.frame,
          playerId: player.playerId,
          position: copyPosition(player.position)
        })
      );
      return freezePlayer({
        ...player,
        hp: 0,
        aliveState: "soul"
      });
    }
    if (player.aliveState === "soul" && player.hp !== 0) {
      return freezePlayer({
        ...player,
        hp: 0
      });
    }
    return freezePlayer({ ...player });
  });

  const existingRescueByDownedPlayer = new Map<PlayerId, RescueState>();
  for (const rescueState of options.rescueStates) {
    validateRescueState(rescueState);
    existingRescueByDownedPlayer.set(rescueState.downedPlayerId, rescueState);
  }

  const rescueStates = players
    .filter((player) => player.aliveState === "soul")
    .map((player) => {
      const existing = existingRescueByDownedPlayer.get(player.playerId);
      return freezeRescueState(
        existing === undefined
          ? {
              downedPlayerId: player.playerId,
              progressFrames: 0,
              requiredFrames
            }
          : {
              ...existing,
              requiredFrames: existing.requiredFrames > 0 ? existing.requiredFrames : requiredFrames
            }
      );
    });

  return deepFreeze({
    players,
    rescueStates,
    events
  });
}

function canSoulOut(aliveState: AliveState): boolean {
  return aliveState === "body" || aliveState === "yang_shen" || aliveState === "reshaping";
}

function validatePlayer(player: PlayerState): void {
  if (player.playerId.length === 0) {
    throw new Error("playerId must not be empty");
  }
  assertFiniteNumber(player.hp, "player.hp");
  assertFiniteNumber(player.maxHp, "player.maxHp");
  assertFiniteNumber(player.position.x, "player.position.x");
  assertFiniteNumber(player.position.y, "player.position.y");
}

function validateRescueState(rescueState: RescueState): void {
  if (rescueState.downedPlayerId.length === 0) {
    throw new Error("downedPlayerId must not be empty");
  }
  assertNonNegativeInteger(rescueState.progressFrames, "rescueState.progressFrames");
  assertNonNegativeInteger(rescueState.requiredFrames, "rescueState.requiredFrames");
}

function assertPositiveInteger(value: number, label: string): void {
  assertNonNegativeInteger(value, label);
  if (value <= 0) {
    throw new Error(`${label} must be positive`);
  }
}

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`);
  }
}

function copyPosition(position: Vec2State): Vec2State {
  return {
    x: position.x,
    y: position.y
  };
}

function freezePlayer(player: PlayerState): PlayerState {
  return deepFreeze(player);
}

function freezeRescueState(rescueState: RescueState): RescueState {
  return Object.freeze(rescueState);
}

function freezeEvent(event: SoulSystemEffectEvent): SoulSystemEffectEvent {
  return deepFreeze(event);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}
