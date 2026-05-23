import type { PlayerCultivationState, TeamInsightExpState } from "../state/SimState";

export interface InsightExpTablePack {
  readonly teamInsightExp: {
    readonly levels: readonly InsightExpLevelDefinition[];
  };
}

export interface InsightExpLevelDefinition {
  readonly level: number;
  readonly expToNext: number;
  readonly expectedTrigger?: string;
}

export interface InsightExpTable {
  readonly levels: readonly InsightExpLevelDefinition[];
}

export interface TeamInsightEvent {
  readonly frame: number;
  readonly type: "insight_pause";
  readonly source: string;
  readonly triggeredLevel: number;
  readonly overflowExp: number;
}

export interface ApplyTeamInsightExpGainOptions {
  readonly frame: number;
  readonly source: string;
  readonly amount: number;
  readonly teamInsightExp: TeamInsightExpState;
  readonly playerCultivations: readonly PlayerCultivationState[];
  readonly insightTable: InsightExpTable;
}

export interface TeamInsightExpGainResult {
  readonly teamInsightExp: TeamInsightExpState;
  readonly playerCultivations: readonly PlayerCultivationState[];
  readonly events: readonly TeamInsightEvent[];
}

export function indexInsightExpTable(pack: InsightExpTablePack): InsightExpTable {
  const levels = [...pack.teamInsightExp.levels].sort((a, b) => a.level - b.level);
  if (levels.length === 0) {
    throw new Error("insight exp table must contain at least one level");
  }
  for (const level of levels) {
    if (!Number.isInteger(level.level) || level.level <= 0) {
      throw new Error("insight level must be a positive integer");
    }
    if (!Number.isFinite(level.expToNext) || level.expToNext <= 0) {
      throw new Error(`insight level ${level.level} expToNext must be positive`);
    }
  }
  return { levels };
}

export function applyTeamInsightExpGain(options: ApplyTeamInsightExpGainOptions): TeamInsightExpGainResult {
  if (!Number.isInteger(options.frame) || options.frame < 0) {
    throw new Error("frame must be a non-negative integer");
  }
  if (!Number.isFinite(options.amount) || options.amount < 0) {
    throw new Error("insight exp amount must be non-negative");
  }
  if (options.source.length === 0) {
    throw new Error("insight exp source must not be empty");
  }

  const currentThreshold = getExpToNext(options.insightTable, options.teamInsightExp.level);
  const totalExp = options.teamInsightExp.exp + options.amount;
  if (totalExp < currentThreshold) {
    return {
      teamInsightExp: {
        ...options.teamInsightExp,
        exp: totalExp,
        expToNext: currentThreshold
      },
      playerCultivations: options.playerCultivations,
      events: []
    };
  }

  const nextLevel = options.teamInsightExp.level + 1;
  const overflowExp = totalExp - currentThreshold;
  const nextTeamInsightExp: TeamInsightExpState = {
    ...options.teamInsightExp,
    level: nextLevel,
    exp: overflowExp,
    expToNext: getExpToNext(options.insightTable, nextLevel)
  };

  return {
    teamInsightExp: nextTeamInsightExp,
    playerCultivations: options.playerCultivations,
    events: [
      {
        frame: options.frame,
        type: "insight_pause",
        source: options.source,
        triggeredLevel: nextLevel,
        overflowExp
      }
    ]
  };
}

function getExpToNext(table: InsightExpTable, level: number): number {
  const explicit = table.levels.find((entry) => entry.level === level);
  if (explicit !== undefined) {
    return explicit.expToNext;
  }
  return Math.floor(60 * level ** 1.55);
}
