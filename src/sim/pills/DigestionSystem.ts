import { SIM_FPS, assertNonNegativeInteger, secondsToFrames } from "../SimConstants";
import type { CombatPlayerState } from "../player/PlayerSystem";
import type { PlayerCultivationState, TeamInsightExpState } from "../state/SimState";
import type {
  ActivePillAfterEffect,
  ActivePillDigestion,
  PillDefinitionsById,
  PillEffectDefinition,
  PillEffectEvent,
  PillRuntimePlayerState
} from "./PillSystem";

export interface PillCultivationGainEvent {
  readonly playerId: string;
  readonly pillId: string;
  readonly effectId: string;
  readonly amount: number;
}

export interface StepDigestionSystemOptions {
  readonly frame: number;
  readonly players: readonly CombatPlayerState[];
  readonly pillDefinitions: PillDefinitionsById;
  readonly pillState: readonly PillRuntimePlayerState[];
  readonly teamInsightExp: TeamInsightExpState;
  readonly playerCultivations: readonly PlayerCultivationState[];
}

export interface StepDigestionSystemResult {
  readonly players: readonly CombatPlayerState[];
  readonly pillState: readonly PillRuntimePlayerState[];
  readonly teamInsightExp: TeamInsightExpState;
  readonly playerCultivations: readonly PlayerCultivationState[];
  readonly effectEvents: readonly PillEffectEvent[];
  readonly cultivationGains: readonly PillCultivationGainEvent[];
}

export function stepDigestionSystem(options: StepDigestionSystemOptions): StepDigestionSystemResult {
  assertNonNegativeInteger(options.frame, "frame");

  let players: readonly CombatPlayerState[] = options.players;
  let playerCultivations: readonly PlayerCultivationState[] = options.playerCultivations;
  const effectEvents: PillEffectEvent[] = [];
  const cultivationGains: PillCultivationGainEvent[] = [];
  const nextPillState: PillRuntimePlayerState[] = [];

  for (const runtime of [...options.pillState].sort((a, b) => a.playerId.localeCompare(b.playerId))) {
    const activeDigestions: ActivePillDigestion[] = [];
    const activeAfterEffects: ActivePillAfterEffect[] = [];

    for (const digestion of runtime.activeDigestions) {
      const definition = options.pillDefinitions[digestion.pillId];
      if (definition === undefined) {
        throw new Error(`Missing pill definition: ${digestion.pillId}`);
      }

      players = applyPerFrameEffects(players, runtime.playerId, definition.effects);
      const remainingFrames = Math.max(0, digestion.remainingFrames - 1);

      if (remainingFrames > 0) {
        activeDigestions.push({ ...digestion, remainingFrames });
        continue;
      }

      effectEvents.push({
        frame: options.frame,
        playerId: runtime.playerId,
        event: "pill_digest_completed",
        pillId: digestion.pillId
      });

      const completion = applyCompletionEffects({
        playerId: runtime.playerId,
        pillId: digestion.pillId,
        effects: definition.effects,
        playerCultivations
      });
      playerCultivations = completion.playerCultivations;
      cultivationGains.push(...completion.cultivationGains);

      for (const afterEffect of definition.afterEffects ?? []) {
        const totalFrames = secondsToFrames(optionalNumberParam(afterEffect.params, "duration", 0));
        if (totalFrames <= 0) {
          continue;
        }
        activeAfterEffects.push({
          pillId: digestion.pillId,
          effectId: afterEffect.effectId,
          type: afterEffect.type,
          params: afterEffect.params,
          startFrame: options.frame,
          totalFrames,
          remainingFrames: totalFrames
        });
        effectEvents.push({
          frame: options.frame,
          playerId: runtime.playerId,
          event: "pill_after_effect_started",
          pillId: digestion.pillId,
          effectId: afterEffect.effectId
        });
      }
    }

    for (const afterEffect of runtime.activeAfterEffects) {
      const remainingFrames = Math.max(0, afterEffect.remainingFrames - 1);
      if (remainingFrames > 0) {
        activeAfterEffects.push({ ...afterEffect, remainingFrames });
      }
    }

    nextPillState.push({
      ...runtime,
      activeDigestions: activeDigestions.sort((a, b) => a.pillId.localeCompare(b.pillId) || a.startFrame - b.startFrame),
      activeAfterEffects: activeAfterEffects.sort(
        (a, b) => a.pillId.localeCompare(b.pillId) || a.effectId.localeCompare(b.effectId) || a.startFrame - b.startFrame
      )
    });
  }

  return {
    players,
    pillState: nextPillState.sort((a, b) => a.playerId.localeCompare(b.playerId)),
    teamInsightExp: options.teamInsightExp,
    playerCultivations: [...playerCultivations].sort((a, b) => a.playerId.localeCompare(b.playerId)),
    effectEvents,
    cultivationGains
  };
}

function applyPerFrameEffects(
  players: readonly CombatPlayerState[],
  playerId: string,
  effects: readonly PillEffectDefinition[]
): readonly CombatPlayerState[] {
  let nextPlayers = players;
  for (const effect of effects) {
    if (effect.type !== "heal_over_time") {
      continue;
    }
    const healPerSecond = numberParam(effect.params, "healPerSecond");
    const healPerFrame = healPerSecond / SIM_FPS;
    nextPlayers = nextPlayers.map((player) =>
      player.playerId === playerId ? { ...player, hp: Math.min(player.maxHp, player.hp + healPerFrame) } : player
    );
  }
  return nextPlayers;
}

function applyCompletionEffects(options: {
  readonly playerId: string;
  readonly pillId: string;
  readonly effects: readonly PillEffectDefinition[];
  readonly playerCultivations: readonly PlayerCultivationState[];
}): {
  readonly playerCultivations: readonly PlayerCultivationState[];
  readonly cultivationGains: readonly PillCultivationGainEvent[];
} {
  let playerCultivations = options.playerCultivations;
  const cultivationGains: PillCultivationGainEvent[] = [];

  for (const effect of options.effects) {
    if (effect.type !== "cultivation_gain") {
      continue;
    }

    const amount = numberParam(effect.params, "amount");
    playerCultivations = playerCultivations.map((cultivation) =>
      cultivation.playerId === options.playerId
        ? { ...cultivation, cultivation: cultivation.cultivation + amount }
        : cultivation
    );
    cultivationGains.push({
      playerId: options.playerId,
      pillId: options.pillId,
      effectId: effect.effectId,
      amount
    });
  }

  return { playerCultivations, cultivationGains };
}

function numberParam(params: Readonly<Record<string, unknown>>, key: string): number {
  const value = params[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`pill param ${key} must be a finite number`);
  }
  return value;
}

function optionalNumberParam(params: Readonly<Record<string, unknown>>, key: string, fallback: number): number {
  const value = params[key];
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`pill param ${key} must be a finite number`);
  }
  return value;
}
