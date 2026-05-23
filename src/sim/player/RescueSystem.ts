import { assertNonNegativeInteger, secondsToFrames, SIM_FPS } from "../SimConstants";
import { hasInputButton, InputButtonBit, validateFrameInput, type FrameInput, type PlayerId } from "../input/FrameInput";
import type { AliveState, PlayerState, RescueState, Vec2State } from "../state/SimState";

export const DEFAULT_RESCUE_RADIUS = 130;
export const DEFAULT_RESCUER_HP_COST_PER_SECOND_PERCENT = 0.05;
export const DEFAULT_REVIVED_HP_PERCENT = 0.35;
export const DEFAULT_REVIVE_INVULNERABLE_FRAMES = secondsToFrames(2);

export type RescueSystemEvent = RescueStartEvent | RescueSuccessEvent;

export interface RescueStartEvent {
  readonly type: "rescue_start";
  readonly effectId: "rescue_ring";
  readonly frame: number;
  readonly downedPlayerId: PlayerId;
  readonly rescuerPlayerId: PlayerId;
}

export interface RescueSuccessEvent {
  readonly type: "rescue_success";
  readonly effectId: "rescue_ring";
  readonly frame: number;
  readonly downedPlayerId: PlayerId;
  readonly rescuerPlayerId: PlayerId;
  readonly revivedHp: number;
  readonly invulnerableFrames: number;
}

export interface RescueSystemConfig {
  readonly radius?: number;
  readonly hpCostPerSecondPercent?: number;
  readonly revivedHpPercent?: number;
  readonly reviveInvulnerableFrames?: number;
  readonly interruptedProgressDecayFrames?: number;
}

export interface StepRescueSystemOptions {
  readonly frame: number;
  readonly players: readonly PlayerState[];
  readonly rescueStates: readonly RescueState[];
  readonly frameInputs: readonly FrameInput[];
  readonly config?: RescueSystemConfig;
}

export interface RescueSystemResult {
  readonly players: readonly PlayerState[];
  readonly rescueStates: readonly RescueState[];
  readonly events: readonly RescueSystemEvent[];
}

export function stepRescueSystem(options: StepRescueSystemOptions): RescueSystemResult {
  assertNonNegativeInteger(options.frame, "frame");
  const config = resolveConfig(options.config);
  const inputByPlayer = buildInputMap(options.frameInputs);
  const playerById = new Map<PlayerId, PlayerState>();
  const playerOrder = options.players.map((player) => {
    validatePlayer(player);
    playerById.set(player.playerId, freezePlayer({ ...player }));
    return player.playerId;
  });

  const events: RescueSystemEvent[] = [];
  const rescueStates: RescueState[] = [];

  for (const rescueState of options.rescueStates) {
    validateRescueState(rescueState);
    const downedPlayer = playerById.get(rescueState.downedPlayerId);
    if (downedPlayer === undefined || downedPlayer.aliveState !== "soul") {
      continue;
    }

    const rescuer = chooseRescuer({
      downedPlayer,
      players: [...playerById.values()],
      inputByPlayer,
      radius: config.radius
    });

    if (rescuer === undefined) {
      rescueStates.push(freezeRescueState(decayRescueState(rescueState, config.interruptedProgressDecayFrames)));
      continue;
    }

    if (rescueState.rescuerPlayerId !== rescuer.playerId) {
      events.push(
        freezeEvent({
          type: "rescue_start",
          effectId: "rescue_ring",
          frame: options.frame,
          downedPlayerId: downedPlayer.playerId,
          rescuerPlayerId: rescuer.playerId
        })
      );
    }

    const chargedRescuer = chargeRescuer(rescuer, config.hpCostPerFrame);
    playerById.set(rescuer.playerId, chargedRescuer);

    const progressFrames = rescueState.progressFrames + 1;
    if (progressFrames >= rescueState.requiredFrames) {
      const revivedHp = round3(downedPlayer.maxHp * config.revivedHpPercent);
      playerById.set(
        downedPlayer.playerId,
        freezePlayer({
          ...downedPlayer,
          aliveState: "yang_shen",
          hp: revivedHp
        })
      );
      events.push(
        freezeEvent({
          type: "rescue_success",
          effectId: "rescue_ring",
          frame: options.frame,
          downedPlayerId: downedPlayer.playerId,
          rescuerPlayerId: rescuer.playerId,
          revivedHp,
          invulnerableFrames: config.reviveInvulnerableFrames
        })
      );
    } else {
      rescueStates.push(
        freezeRescueState({
          downedPlayerId: rescueState.downedPlayerId,
          rescuerPlayerId: rescuer.playerId,
          progressFrames,
          requiredFrames: rescueState.requiredFrames
        })
      );
    }
  }

  return deepFreeze({
    players: playerOrder.map((playerId) => requirePlayer(playerById, playerId)),
    rescueStates,
    events
  });
}

function resolveConfig(config: RescueSystemConfig | undefined): Required<RescueSystemConfig> & { readonly hpCostPerFrame: number } {
  const radius = config?.radius ?? DEFAULT_RESCUE_RADIUS;
  const hpCostPerSecondPercent = config?.hpCostPerSecondPercent ?? DEFAULT_RESCUER_HP_COST_PER_SECOND_PERCENT;
  const revivedHpPercent = config?.revivedHpPercent ?? DEFAULT_REVIVED_HP_PERCENT;
  const reviveInvulnerableFrames = config?.reviveInvulnerableFrames ?? DEFAULT_REVIVE_INVULNERABLE_FRAMES;
  const interruptedProgressDecayFrames = config?.interruptedProgressDecayFrames ?? 1;
  assertPositiveFinite(radius, "rescue radius");
  assertNonNegativeFinite(hpCostPerSecondPercent, "hpCostPerSecondPercent");
  assertNonNegativeFinite(revivedHpPercent, "revivedHpPercent");
  assertNonNegativeInteger(reviveInvulnerableFrames, "reviveInvulnerableFrames");
  assertNonNegativeInteger(interruptedProgressDecayFrames, "interruptedProgressDecayFrames");

  return {
    radius,
    hpCostPerSecondPercent,
    revivedHpPercent,
    reviveInvulnerableFrames,
    interruptedProgressDecayFrames,
    hpCostPerFrame: hpCostPerSecondPercent / SIM_FPS
  };
}

function buildInputMap(frameInputs: readonly FrameInput[]): ReadonlyMap<PlayerId, FrameInput> {
  const inputByPlayer = new Map<PlayerId, FrameInput>();
  for (const input of frameInputs) {
    validateFrameInput(input);
    inputByPlayer.set(input.playerId, input);
  }
  return inputByPlayer;
}

function chooseRescuer(options: {
  readonly downedPlayer: PlayerState;
  readonly players: readonly PlayerState[];
  readonly inputByPlayer: ReadonlyMap<PlayerId, FrameInput>;
  readonly radius: number;
}): PlayerState | undefined {
  const candidates = options.players
    .filter((player) => player.playerId !== options.downedPlayer.playerId)
    .filter((player) => canRescue(player.aliveState))
    .filter((player) => hasInteract(options.inputByPlayer.get(player.playerId)))
    .filter((player) => distance(player.position, options.downedPlayer.position) <= options.radius)
    .sort((a, b) => a.playerId.localeCompare(b.playerId));
  return candidates[0];
}

function hasInteract(input: FrameInput | undefined): boolean {
  return input !== undefined && hasInputButton(input.downMask, InputButtonBit.Interact);
}

function canRescue(aliveState: AliveState): boolean {
  return aliveState === "body" || aliveState === "yang_shen";
}

function chargeRescuer(player: PlayerState, hpCostPerFramePercent: number): PlayerState {
  const hpCost = player.maxHp * hpCostPerFramePercent;
  return freezePlayer({
    ...player,
    hp: round3(Math.max(1, player.hp - hpCost))
  });
}

function decayRescueState(rescueState: RescueState, decayFrames: number): RescueState {
  return {
    downedPlayerId: rescueState.downedPlayerId,
    progressFrames: Math.max(0, rescueState.progressFrames - decayFrames),
    requiredFrames: rescueState.requiredFrames
  };
}

function distance(a: Vec2State, b: Vec2State): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function validatePlayer(player: PlayerState): void {
  if (player.playerId.length === 0) {
    throw new Error("playerId must not be empty");
  }
  assertNonNegativeFinite(player.maxHp, "player.maxHp");
  assertNonNegativeFinite(player.hp, "player.hp");
  assertFiniteNumber(player.position.x, "player.position.x");
  assertFiniteNumber(player.position.y, "player.position.y");
}

function validateRescueState(rescueState: RescueState): void {
  if (rescueState.downedPlayerId.length === 0) {
    throw new Error("downedPlayerId must not be empty");
  }
  assertNonNegativeInteger(rescueState.progressFrames, "rescueState.progressFrames");
  assertPositiveInteger(rescueState.requiredFrames, "rescueState.requiredFrames");
}

function requirePlayer(playerById: ReadonlyMap<PlayerId, PlayerState>, playerId: PlayerId): PlayerState {
  const player = playerById.get(playerId);
  if (player === undefined) {
    throw new Error(`Missing player ${playerId}`);
  }
  return player;
}

function assertPositiveInteger(value: number, label: string): void {
  assertNonNegativeInteger(value, label);
  if (value <= 0) {
    throw new Error(`${label} must be positive`);
  }
}

function assertPositiveFinite(value: number, label: string): void {
  assertFiniteNumber(value, label);
  if (value <= 0) {
    throw new Error(`${label} must be positive`);
  }
}

function assertNonNegativeFinite(value: number, label: string): void {
  assertFiniteNumber(value, label);
  if (value < 0) {
    throw new Error(`${label} must be non-negative`);
  }
}

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`);
  }
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function freezePlayer(player: PlayerState): PlayerState {
  return deepFreeze(player);
}

function freezeRescueState(rescueState: RescueState): RescueState {
  return Object.freeze(rescueState);
}

function freezeEvent<T extends RescueSystemEvent>(event: T): T {
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
