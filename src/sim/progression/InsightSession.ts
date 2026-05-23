import type { SeededRng } from "../core/SeededRng";
import type { PlayerCultivationState, TeamInsightExpState } from "../state/SimState";
import {
  generateRewardChoices,
  type RewardChoice,
  type RewardPlayerContext,
  type RewardPoolsById
} from "../rewards/RewardGenerator";

export interface InsightPlayerPanelState {
  readonly playerId: string;
  readonly selectedOptionId: string | undefined;
  readonly guardianState: boolean;
  readonly options: readonly RewardChoice[];
}

export interface InsightSessionState {
  readonly sessionId: string;
  readonly frame: number;
  readonly rewardPoolId: string;
  readonly mode: "single" | "coop";
  readonly sharedFortuneReroll: number;
  readonly players: readonly InsightPlayerPanelState[];
  readonly completed: boolean;
  readonly playerCultivations: readonly PlayerCultivationState[];
}

export interface CreateInsightSessionOptions {
  readonly frame: number;
  readonly sessionId: string;
  readonly rewardPoolId: string;
  readonly playerIds: readonly string[];
  readonly teamInsightExp: TeamInsightExpState;
  readonly rewardPools: RewardPoolsById;
  readonly rewardRng: SeededRng;
  readonly playerContexts: Readonly<Record<string, RewardPlayerContext>>;
  readonly playerCultivations?: readonly PlayerCultivationState[];
}

export interface InsightSessionEvent {
  readonly frame: number;
  readonly type: "insight_option_selected" | "insight_session_completed" | "insight_reroll" | "insight_reroll_failed";
  readonly playerId?: string;
  readonly optionId?: string;
  readonly sessionId?: string;
  readonly remainingSharedFortuneReroll?: number;
  readonly reason?: "no_shared_fortune" | "unknown_player" | "unknown_option";
}

export interface RerollInsightOptionsInput {
  readonly frame: number;
  readonly session: InsightSessionState;
  readonly playerId: string;
  readonly rewardPools: RewardPoolsById;
  readonly rewardRng: SeededRng;
  readonly playerContexts: Readonly<Record<string, RewardPlayerContext>>;
}

export interface InsightSessionMutationResult {
  readonly session: InsightSessionState;
  readonly events: readonly InsightSessionEvent[];
  readonly playerCultivations: readonly PlayerCultivationState[];
}

export interface ChooseInsightOptionInput {
  readonly frame: number;
  readonly session: InsightSessionState;
  readonly playerId: string;
  readonly optionId: string;
}

export function createInsightSession(options: CreateInsightSessionOptions): InsightSessionState {
  validateSessionInput(options.frame, options.sessionId, options.playerIds);

  const rewardPool = options.rewardPools[options.rewardPoolId];
  if (rewardPool === undefined) {
    throw new Error(`Missing reward pool: ${options.rewardPoolId}`);
  }

  const excludedTargetIds = new Set<string>();
  const players = [...new Set(options.playerIds)]
    .sort((a, b) => a.localeCompare(b))
    .map((playerId) => {
      const context = options.playerContexts[playerId];
      if (context === undefined) {
        throw new Error(`Missing reward context for player: ${playerId}`);
      }
      const choices = generateRewardChoices({
        rewardPool,
        playerId,
        choicesPerPlayer: rewardPool.rules.choicesPerPlayer,
        rewardRng: options.rewardRng,
        excludedTargetIds: rewardPool.rules.allowDuplicateAcrossPlayers ? new Set<string>() : excludedTargetIds,
        context
      });
      return {
        playerId,
        selectedOptionId: undefined,
        guardianState: false,
        options: choices
      };
    });

  return {
    sessionId: options.sessionId,
    frame: options.frame,
    rewardPoolId: options.rewardPoolId,
    mode: players.length > 1 ? "coop" : "single",
    sharedFortuneReroll: options.teamInsightExp.sharedFortuneReroll,
    players,
    completed: false,
    playerCultivations: options.playerCultivations ?? []
  };
}

export function rerollInsightOptions(options: RerollInsightOptionsInput): InsightSessionMutationResult {
  assertFrame(options.frame);
  const rewardPool = options.rewardPools[options.session.rewardPoolId];
  if (rewardPool === undefined) {
    throw new Error(`Missing reward pool: ${options.session.rewardPoolId}`);
  }
  const targetPanel = options.session.players.find((panel) => panel.playerId === options.playerId);
  if (targetPanel === undefined) {
    return failedMutation(options.session, options.frame, "insight_reroll_failed", "unknown_player", options.playerId);
  }
  if (options.session.sharedFortuneReroll <= 0) {
    return failedMutation(options.session, options.frame, "insight_reroll_failed", "no_shared_fortune", options.playerId);
  }

  const context = options.playerContexts[options.playerId];
  if (context === undefined) {
    throw new Error(`Missing reward context for player: ${options.playerId}`);
  }

  const excludedTargetIds = new Set<string>();
  if (!rewardPool.rules.allowDuplicateAcrossPlayers) {
    for (const panel of options.session.players) {
      if (panel.playerId === options.playerId) {
        continue;
      }
      for (const option of panel.options) {
        excludedTargetIds.add(option.reward.targetId);
      }
    }
  }

  const optionsForPlayer = generateRewardChoices({
    rewardPool,
    playerId: options.playerId,
    choicesPerPlayer: rewardPool.rules.choicesPerPlayer,
    rewardRng: options.rewardRng,
    excludedTargetIds,
    context
  });

  const session: InsightSessionState = {
    ...options.session,
    sharedFortuneReroll: options.session.sharedFortuneReroll - 1,
    completed: false,
    players: options.session.players.map((panel) =>
      panel.playerId === options.playerId
        ? {
            playerId: panel.playerId,
            selectedOptionId: undefined,
            guardianState: false,
            options: optionsForPlayer
          }
        : panel
    )
  };

  return {
    session,
    playerCultivations: session.playerCultivations,
    events: [
      {
        frame: options.frame,
        type: "insight_reroll",
        playerId: options.playerId,
        remainingSharedFortuneReroll: session.sharedFortuneReroll
      }
    ]
  };
}

export function chooseInsightOption(options: ChooseInsightOptionInput): InsightSessionMutationResult {
  assertFrame(options.frame);
  if (options.optionId.length === 0) {
    throw new Error("optionId must not be empty");
  }

  const panel = options.session.players.find((candidate) => candidate.playerId === options.playerId);
  if (panel === undefined) {
    return failedMutation(options.session, options.frame, "insight_reroll_failed", "unknown_player", options.playerId);
  }
  if (!panel.options.some((candidate) => candidate.optionId === options.optionId)) {
    return failedMutation(options.session, options.frame, "insight_reroll_failed", "unknown_option", options.playerId);
  }

  const players = options.session.players.map((candidate) =>
    candidate.playerId === options.playerId
      ? {
          ...candidate,
          selectedOptionId: options.optionId,
          guardianState: true
        }
      : candidate
  );
  const completed = players.every((candidate) => candidate.selectedOptionId !== undefined);
  const session: InsightSessionState = {
    ...options.session,
    players,
    completed
  };

  const events: InsightSessionEvent[] = [
    {
      frame: options.frame,
      type: "insight_option_selected",
      playerId: options.playerId,
      optionId: options.optionId
    }
  ];
  if (completed) {
    events.push({
      frame: options.frame,
      type: "insight_session_completed",
      sessionId: options.session.sessionId
    });
  }

  return {
    session,
    events,
    playerCultivations: session.playerCultivations
  };
}

function failedMutation(
  session: InsightSessionState,
  frame: number,
  type: "insight_reroll_failed",
  reason: "no_shared_fortune" | "unknown_player" | "unknown_option",
  playerId: string
): InsightSessionMutationResult {
  return {
    session,
    playerCultivations: session.playerCultivations,
    events: [{ frame, type, playerId, reason }]
  };
}

function validateSessionInput(frame: number, sessionId: string, playerIds: readonly string[]): void {
  assertFrame(frame);
  if (sessionId.length === 0) {
    throw new Error("sessionId must not be empty");
  }
  if (playerIds.length === 0) {
    throw new Error("InsightSession requires at least one player");
  }
  for (const playerId of playerIds) {
    if (playerId.length === 0) {
      throw new Error("playerId must not be empty");
    }
  }
}

function assertFrame(frame: number): void {
  if (!Number.isInteger(frame) || frame < 0) {
    throw new Error("frame must be a non-negative integer");
  }
}
