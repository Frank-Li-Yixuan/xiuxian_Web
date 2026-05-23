import {
  buildPlayerLoadoutFromProfile,
  type BuiltEquipmentSlot,
  type BuiltPlayerLoadout,
  type LoadoutPresetPack
} from "./LoadoutBuilder";
import type { OutgameProfileState } from "./ProfileState";

export interface RuntimeStats {
  jing: number;
  qiRoot: number;
  shen: number;
  comprehension: number;
  fortune: number;
  constitution: number;
  karma: number;
  [statId: string]: number;
}

export interface RunConfigTemplatePlayer {
  readonly selectedMainMethodId?: string;
  readonly natalArtifactId: string;
  readonly spiritTreasureIds: readonly string[];
  readonly spellIds: readonly (string | null)[];
  readonly pillIds: readonly (string | null)[];
  readonly baseStats: RuntimeStats;
  readonly startingRealmId: string;
  readonly startingLayer: number;
}

export interface RunConfigTemplatePlayers extends Readonly<Record<string, RunConfigTemplatePlayer | undefined>> {
  readonly p1: RunConfigTemplatePlayer;
  readonly p2?: RunConfigTemplatePlayer;
}

export interface RunConfigTemplate {
  readonly schema: string;
  readonly version: string;
  readonly runId: string;
  readonly seed: number;
  readonly difficulty: string;
  readonly stageId: string;
  readonly players: RunConfigTemplatePlayers;
}

export interface SecondRunPlayerConfig {
  readonly selectedMainMethodId: string;
  readonly natalArtifactId: string;
  readonly artifactStars: Readonly<Record<string, number>>;
  readonly spiritTreasureIds: readonly string[];
  readonly treasureStars: Readonly<Record<string, number>>;
  readonly spellIds: readonly (string | null)[];
  readonly spellLevels: Readonly<Record<string, number>>;
  readonly pillIds: readonly (string | null)[];
  readonly baseStats: RuntimeStats;
  readonly startingRealmId: string;
  readonly startingLayer: number;
  readonly openingPowerScore: number;
}

export interface SecondRunConfig {
  readonly schema: string;
  readonly version: string;
  readonly runId: string;
  readonly seed: number;
  readonly difficulty: string;
  readonly stageId: string;
  readonly players: Readonly<Record<string, SecondRunPlayerConfig>>;
}

export interface CreateSecondRunConfigOptions {
  readonly profile: OutgameProfileState;
  readonly presets: LoadoutPresetPack;
  readonly baseRunConfig: RunConfigTemplate;
  readonly presetId: string;
  readonly runId: string;
  readonly seed: number;
  readonly playerIds: readonly string[];
}

export function createSecondRunConfig(options: CreateSecondRunConfigOptions): SecondRunConfig {
  if (options.playerIds.length === 0) {
    throw new Error("second run config requires at least one player");
  }
  if (options.runId.length === 0) {
    throw new Error("runId must not be empty");
  }
  if (!Number.isInteger(options.seed)) {
    throw new Error("seed must be an integer");
  }

  const players: Record<string, SecondRunPlayerConfig> = {};
  for (const playerId of options.playerIds) {
    if (playerId.length === 0) {
      throw new Error("playerId must not be empty");
    }
    if (players[playerId] !== undefined) {
      throw new Error(`duplicate playerId ${playerId}`);
    }

    const basePlayer = options.baseRunConfig.players[playerId];
    if (basePlayer === undefined) {
      throw new Error(`missing base RunConfig player ${playerId}`);
    }

    const loadout = buildPlayerLoadoutFromProfile({
      profile: options.profile,
      presets: options.presets,
      presetId: options.presetId,
      playerId
    });

    players[playerId] = buildSecondRunPlayerConfig(options.profile, basePlayer, loadout);
  }

  return deepFreeze({
    schema: options.baseRunConfig.schema,
    version: options.baseRunConfig.version,
    runId: options.runId,
    seed: options.seed,
    difficulty: options.baseRunConfig.difficulty,
    stageId: options.baseRunConfig.stageId,
    players
  });
}

function buildSecondRunPlayerConfig(
  profile: OutgameProfileState,
  basePlayer: RunConfigTemplatePlayer,
  loadout: BuiltPlayerLoadout
): SecondRunPlayerConfig {
  if (loadout.mainMethodId === null) {
    throw new Error(`loadout preset ${loadout.presetId} did not resolve a main method`);
  }
  if (loadout.natalArtifact === null) {
    throw new Error(`loadout preset ${loadout.presetId} did not resolve a natal artifact`);
  }

  const baseStats = copyRuntimeStats(basePlayer.baseStats);
  const boostedStats = applyMethodStatBonuses(baseStats, profile, loadout.mainMethodId);

  return {
    selectedMainMethodId: loadout.mainMethodId,
    natalArtifactId: loadout.natalArtifact.itemId,
    artifactStars: starsByItemId([loadout.natalArtifact]),
    spiritTreasureIds: idsFromSlots(loadout.spiritTreasures),
    treasureStars: starsByItemId(loadout.spiritTreasures),
    spellIds: loadout.spellIds,
    spellLevels: loadout.spellLevels,
    pillIds: loadout.pillIds,
    baseStats: boostedStats,
    startingRealmId: basePlayer.startingRealmId,
    startingLayer: basePlayer.startingLayer,
    openingPowerScore: round3(loadout.openingPowerScore + statDeltaPower(baseStats, boostedStats))
  };
}

function applyMethodStatBonuses(stats: RuntimeStats, profile: OutgameProfileState, methodId: string): RuntimeStats {
  const boosted = copyRuntimeStats(stats);
  const methodLevel = profile.methods[methodId]?.level ?? 0;
  if (methodLevel <= 0) {
    return boosted;
  }

  switch (methodId) {
    case "method_turtle_breath":
      boosted.jing = round3(boosted.jing + methodLevel * 4);
      boosted.constitution = round3(boosted.constitution + methodLevel);
      break;
    case "method_pure_yang":
      boosted.qiRoot = round3(boosted.qiRoot + methodLevel * 4);
      boosted.comprehension = round3(boosted.comprehension + methodLevel);
      break;
    case "method_sharp_metal":
      boosted.shen = round3(boosted.shen + methodLevel * 2);
      boosted.fortune = round3(boosted.fortune + methodLevel);
      break;
    default:
      boosted.comprehension = round3(boosted.comprehension + methodLevel);
      break;
  }
  return boosted;
}

function idsFromSlots(slots: readonly (BuiltEquipmentSlot | null)[]): readonly string[] {
  return Object.freeze(slots.flatMap((slot) => (slot === null ? [] : [slot.itemId])));
}

function starsByItemId(slots: readonly (BuiltEquipmentSlot | null)[]): Readonly<Record<string, number>> {
  const stars: Record<string, number> = {};
  for (const slot of slots) {
    if (slot !== null) {
      stars[slot.itemId] = slot.star;
    }
  }
  return Object.freeze(stars);
}

function copyRuntimeStats(stats: RuntimeStats): RuntimeStats {
  return { ...stats };
}

function statDeltaPower(before: RuntimeStats, after: RuntimeStats): number {
  const jingDelta = after.jing - before.jing;
  const qiDelta = after.qiRoot - before.qiRoot;
  const shenDelta = after.shen - before.shen;
  const secondaryDelta =
    after.comprehension -
    before.comprehension +
    after.fortune -
    before.fortune +
    after.constitution -
    before.constitution;
  return round3(jingDelta * 0.15 + qiDelta * 0.15 + shenDelta * 0.25 + secondaryDelta * 0.1);
}

function round3(value: number): number {
  return Math.round(value * 1_000) / 1_000;
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
