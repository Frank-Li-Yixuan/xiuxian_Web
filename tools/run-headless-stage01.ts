import { pathToFileURL } from "node:url";

import { craftAlchemyRecipe, type AlchemyRecipePack } from "../src/outgame/AlchemySystem";
import { upgradeArtifactStar, type ArtifactProgressionPack } from "../src/outgame/ArtifactProgressionSystem";
import {
  trainMethod,
  upgradeSpellMastery,
  type CultivationMethodPack,
  type SpellCompendiumPack
} from "../src/outgame/CultivationTrainingSystem";
import { claimIdleYield, type IdleYieldConfig } from "../src/outgame/IdleYieldSystem";
import {
  buildPlayerLoadoutFromProfile,
  type BuiltPlayerLoadout,
  type LoadoutPresetPack
} from "../src/outgame/LoadoutBuilder";
import {
  applyRunSettlementReceipt,
  cloneOutgameProfile,
  type OutgameProfileState
} from "../src/outgame/ProfileState";
import {
  createSecondRunConfig,
  type RunConfigTemplate,
  type SecondRunConfig
} from "../src/outgame/RunConfigFactory";
import {
  createBossState,
  stepBossFrame,
  type BossCombatState,
  type BossDeathRewards,
  type BossDefinition,
  type BossSystemDropTablePack
} from "../src/sim/boss/BossSystem";
import { computeStateHash } from "../src/sim/core/StateHash";
import { createRunRngStreams } from "../src/sim/core/SeededRng";
import {
  EnemyManager,
  indexEnemyDefinitions,
  type EnemyDefinition,
  type EnemyDefinitionPack,
  type EnemyState
} from "../src/sim/enemies/EnemySystem";
import { createRunSettlementReceipt, type RunSettlementReceipt, type SettlementRewardConfig } from "../src/sim/settlement/RunSettlement";
import { secondsToFrames } from "../src/sim/SimConstants";
import { StageRunner, type StageDefinition } from "../src/sim/stage/StageRunner";
import { WaveSpawner } from "../src/sim/stage/WaveSpawner";
import alchemyRecipeData from "../data/outgame/alchemy_recipes.v0.1.json";
import artifactProgressionData from "../data/outgame/artifact_progression.v0.1.json";
import cultivationMethodData from "../data/outgame/cultivation_methods.v0.1.json";
import defaultProfileData from "../data/outgame/default_profile.v0.1.json";
import idleYieldData from "../data/outgame/idle_yield.v0.1.json";
import loadoutPresetData from "../data/outgame/loadout_presets.v0.1.json";
import settlementRewardData from "../data/outgame/settlement_rewards_stage01.v0.1.json";
import spellCompendiumData from "../data/outgame/spell_compendium.v0.1.json";
import bossesData from "../data/bosses/bosses.v0.1.json";
import enemyData from "../data/enemies/enemies.v0.1.json";
import dropTableData from "../data/rewards/drop_tables.v0.1.json";
import debugRunConfigData from "../data/run/debug_run_config.v0.1.json";
import stageData from "../data/stages/stage_01_qingyun.v0.1.json";

export interface RunFirstPlayableHeadlessOptions {
  readonly runId?: string;
  readonly seed?: number;
  readonly secondRunSeed?: number;
}

export interface RunFirstPlayableReplaySetOptions {
  readonly runId?: string;
  readonly seed?: number;
  readonly secondRunSeed?: number;
  readonly replayCount?: number;
}

export interface FirstPlayableHeadlessResult {
  readonly firstRun: {
    readonly runId: string;
    readonly seed: number;
    readonly loadout: BuiltPlayerLoadout;
    readonly stage: HeadlessStage01Result;
    readonly receipt: RunSettlementReceipt;
  };
  readonly outgame: {
    readonly profile: OutgameProfileState;
    readonly steps: readonly OutgameStepSummary[];
  };
  readonly secondRun: {
    readonly config: SecondRunConfig;
    readonly openingPowerDelta: number;
  };
  readonly finalStateHash: string;
}

export interface FirstPlayableReplaySet {
  readonly runs: readonly FirstPlayableHeadlessResult[];
  readonly finalStateHashes: readonly string[];
}

export interface HeadlessStage01Result {
  readonly stageId: string;
  readonly segmentIds: readonly string[];
  readonly totalFrames: number;
  readonly spawnedEnemies: number;
  readonly spawnCountsBySegment: Readonly<Record<string, number>>;
  readonly spawnCountsByEnemyId: Readonly<Record<string, number>>;
  readonly bossId: string;
  readonly bossDefeated: boolean;
  readonly bossDefeatedFrame: number;
  readonly bossAttackPatternIds: readonly string[];
  readonly bossDeathRewards: BossDeathRewards;
  readonly outcome: "boss_victory";
  readonly finalStateHash: string;
}

export interface OutgameStepSummary {
  readonly id: string;
  readonly detail: Readonly<Record<string, number | string | boolean>>;
}

const DEFAULT_RUN_ID = "headless_stage01_seed_20260523";
const DEFAULT_SEED = 20260523;
const STAGE_COMBAT_SEGMENT_IDS = ["stage_01_01", "stage_01_02", "stage_01_03", "stage_01_04"] as const;
const STAGE_FULL_SEGMENT_IDS = [...STAGE_COMBAT_SEGMENT_IDS, "stage_01_05"] as const;
const QINGYUN_BOSS_ID = "boss_qingyun_tribulation_spirit";
const DATA_PACK_HASH = "stage01-e2e-v0.1";

const DEFAULT_PROFILE = defaultProfileData as unknown as OutgameProfileState;
const LOADOUT_PRESETS = loadoutPresetData as unknown as LoadoutPresetPack;
const DEBUG_RUN_CONFIG = debugRunConfigData as unknown as RunConfigTemplate;
const STAGE = stageData as unknown as StageDefinition;
const ENEMY_DEFINITIONS = indexEnemyDefinitions((enemyData as EnemyDefinitionPack).items);
const BOSSES = bossesData as { readonly items: readonly BossDefinition[] };
const DROP_TABLES = dropTableData as BossSystemDropTablePack;
const SETTLEMENT_REWARDS = settlementRewardData as unknown as SettlementRewardConfig;
const IDLE_YIELD = idleYieldData as unknown as IdleYieldConfig;
const ALCHEMY_RECIPES = alchemyRecipeData as unknown as AlchemyRecipePack;
const ARTIFACT_PROGRESSION = artifactProgressionData as unknown as ArtifactProgressionPack;
const CULTIVATION_METHODS = cultivationMethodData as unknown as CultivationMethodPack;
const SPELL_COMPENDIUM = spellCompendiumData as unknown as SpellCompendiumPack;

export function runFirstPlayableHeadless(options: RunFirstPlayableHeadlessOptions = {}): FirstPlayableHeadlessResult {
  const runId = options.runId ?? DEFAULT_RUN_ID;
  const seed = options.seed ?? DEFAULT_SEED;
  const secondRunSeed = options.secondRunSeed ?? seed + 1;
  assertRunOptions(runId, seed, secondRunSeed);

  const defaultProfile = cloneOutgameProfile(DEFAULT_PROFILE);
  const firstLoadout = buildPlayerLoadoutFromProfile({
    profile: defaultProfile,
    presets: LOADOUT_PRESETS,
    presetId: "preset_safe_push",
    playerId: "p1"
  });
  const stage = runHeadlessStage01({
    runId,
    seed,
    loadout: firstLoadout
  });
  const receipt = createRunSettlementReceipt({
    runId,
    profileId: defaultProfile.profileId,
    mode: "single_player",
    stageId: STAGE.id,
    difficulty: DEBUG_RUN_CONFIG.difficulty,
    reachedSegment: "1-5",
    outcome: stage.outcome,
    rewardConfig: SETTLEMENT_REWARDS,
    firstClear: defaultProfile.flags.firstStageCleared !== true,
    bossKilled: stage.bossId,
    collectedBaseRewards: {
      spirit_stone_low: 12,
      qingling_herb: 3,
      black_iron_essence: 2
    },
    bossSettlementMaterials: stage.bossDeathRewards.settlementMaterials
  });
  const outgame = runOutgameStrengthening(defaultProfile, receipt);
  const secondRunConfig = createSecondRunConfig({
    profile: outgame.profile,
    presets: LOADOUT_PRESETS,
    baseRunConfig: DEBUG_RUN_CONFIG,
    presetId: "preset_safe_push",
    runId: `second_run_${runId.replace(/_seed_\d+$/, "")}_seed_${secondRunSeed}`,
    seed: secondRunSeed,
    playerIds: ["p1"]
  });
  const p1SecondRun = secondRunConfig.players.p1;
  if (p1SecondRun === undefined) {
    throw new Error("second run config did not include p1");
  }

  return deepFreeze({
    firstRun: {
      runId,
      seed,
      loadout: firstLoadout,
      stage,
      receipt
    },
    outgame,
    secondRun: {
      config: secondRunConfig,
      openingPowerDelta: round3(p1SecondRun.openingPowerScore - firstLoadout.openingPowerScore)
    },
    finalStateHash: stage.finalStateHash
  });
}

export function runFirstPlayableReplaySet(options: RunFirstPlayableReplaySetOptions = {}): FirstPlayableReplaySet {
  const replayCount = options.replayCount ?? 3;
  if (!Number.isInteger(replayCount) || replayCount <= 0) {
    throw new Error("replayCount must be a positive integer");
  }
  const runOptions = {
    ...(options.runId === undefined ? {} : { runId: options.runId }),
    ...(options.seed === undefined ? {} : { seed: options.seed }),
    ...(options.secondRunSeed === undefined ? {} : { secondRunSeed: options.secondRunSeed })
  };
  const runs = Array.from({ length: replayCount }, () =>
    runFirstPlayableHeadless(runOptions)
  );

  return deepFreeze({
    runs,
    finalStateHashes: runs.map((run) => run.finalStateHash)
  });
}

function runHeadlessStage01(options: {
  readonly runId: string;
  readonly seed: number;
  readonly loadout: BuiltPlayerLoadout;
}): HeadlessStage01Result {
  const rng = createRunRngStreams(options.seed);
  const runner = new StageRunner(STAGE, { segmentIds: STAGE_COMBAT_SEGMENT_IDS });
  const spawner = new WaveSpawner({ stageRng: rng.stage });
  const enemyManager = new EnemyManager();

  for (let frame = 0; frame < runner.totalFrames; frame += 1) {
    const context = runner.getFrameContext(frame);
    if (context === undefined) {
      continue;
    }
    for (const spawn of spawner.getSpawnsForFrame(context)) {
      enemyManager.spawnEnemy({
        ...spawn,
        enemyDefinition: getEnemyDefinition(spawn.enemyId)
      });
    }
  }

  const enemies = enemyManager.getEnemiesSorted();
  const bossResult = runQingyunBossScript({
    spawnFrame: runner.totalFrames,
    entityId: enemies.length + 1
  });
  const defeatedFrame = bossResult.finalBoss.defeatedFrame;
  if (defeatedFrame === undefined || bossResult.deathRewards === undefined) {
    throw new Error("Qingyun boss script must end in a defeated boss with death rewards");
  }
  const hashPlayers = [
    {
      playerId: options.loadout.playerId,
      aliveState: "body",
      hp: 100,
      maxHp: 100,
      qi: 100,
      maxQi: 100,
      position: { x: 960, y: 900 },
      cooldowns: {},
      digestionSlots: [],
      loadout: {
        presetId: options.loadout.presetId,
        mainMethodId: options.loadout.mainMethodId,
        artifact: options.loadout.natalArtifact,
        spells: options.loadout.spellIds,
        pills: options.loadout.pillIds
      }
    }
  ];
  const hashBosses = [
    {
      entityId: bossResult.finalBoss.entityId,
      bossId: bossResult.finalBoss.bossId,
      hp: bossResult.finalBoss.hp,
      phaseIndex: bossResult.finalBoss.phaseIndex
    }
  ];
  const hashCultivations = [
    {
      playerId: options.loadout.playerId,
      realmId: "realm_qi_refining",
      layer: 1,
      cultivation: 180,
      cultivationToNext: 300,
      inTribulation: false
    }
  ];
  const finalStateHash = computeStateHash({
    runId: options.runId,
    seed: options.seed,
    dataPackHash: DATA_PACK_HASH,
    stageId: STAGE.id,
    frame: defeatedFrame,
    players: hashPlayers,
    enemies,
    projectiles: [],
    pickups: [],
    bosses: hashBosses,
    tribulations: [],
    teamInsightExp: {
      level: 4,
      exp: 0,
      expToNext: 360,
      sharedFortuneReroll: 1,
      scriptedInsightPauses: 3
    },
    playerCultivations: hashCultivations,
    rescueStates: [],
    rng: {
      gameplay: rng.gameplay.getState(),
      stage: rng.stage.getState(),
      drop: rng.drop.getState(),
      reward: rng.reward.getState(),
      boss: rng.boss.getState(),
      tribulation: rng.tribulation.getState()
    }
  });

  return deepFreeze({
    stageId: STAGE.id,
    segmentIds: STAGE_FULL_SEGMENT_IDS,
    totalFrames: defeatedFrame,
    spawnedEnemies: enemies.length,
    spawnCountsBySegment: countBy(enemies, (enemy) => enemy.sourceSegmentId),
    spawnCountsByEnemyId: countBy(enemies, (enemy) => enemy.enemyId),
    bossId: bossResult.finalBoss.bossId,
    bossDefeated: bossResult.finalBoss.status === "defeated",
    bossDefeatedFrame: defeatedFrame,
    bossAttackPatternIds: bossResult.attackPatternIds,
    bossDeathRewards: bossResult.deathRewards,
    outcome: "boss_victory",
    finalStateHash
  });
}

function runQingyunBossScript(options: {
  readonly spawnFrame: number;
  readonly entityId: number;
}): {
  readonly finalBoss: BossCombatState;
  readonly attackPatternIds: readonly string[];
  readonly deathRewards?: BossDeathRewards;
} {
  let boss = createBossState({
    definition: getBossDefinition(QINGYUN_BOSS_ID),
    entityId: options.entityId,
    spawnFrame: options.spawnFrame,
    x: 960
  });
  const attackPatternIds: string[] = [];
  let deathRewards: BossDeathRewards | undefined;

  const frames = [
    boss.phaseStartFrame + secondsToFrames(0.5),
    boss.phaseStartFrame + secondsToFrames(32),
    boss.phaseStartFrame + secondsToFrames(68),
    boss.phaseStartFrame + secondsToFrames(112)
  ];
  const incomingDamage = [0, 1800, 1710, 9999] as const;

  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    if (frame === undefined) {
      throw new Error(`Missing boss script frame at index ${index}`);
    }
    const result = stepBossFrame({
      definition: getBossDefinition(QINGYUN_BOSS_ID),
      boss,
      frame,
      incomingDamage: incomingDamage[index] ?? 0,
      dropTables: DROP_TABLES.items,
      dropRolls: { drop_boss_qingyun_tribulation_spirit: [0, 0, 0, 0, 0.2] }
    });
    attackPatternIds.push(...result.attackEvents.map((event) => event.patternId));
    boss = result.boss;
    deathRewards = result.deathRewards ?? deathRewards;
  }

  return {
    finalBoss: boss,
    attackPatternIds: Object.freeze(attackPatternIds),
    ...(deathRewards === undefined ? {} : { deathRewards })
  };
}

function runOutgameStrengthening(
  defaultProfile: OutgameProfileState,
  receipt: RunSettlementReceipt
): FirstPlayableHeadlessResult["outgame"] {
  const steps: OutgameStepSummary[] = [];

  const settled = applyRunSettlementReceipt({ profile: defaultProfile, receipt }).profile;
  steps.push({
    id: "settlement",
    detail: { firstStageCleared: settled.flags.firstStageCleared === true }
  });

  const claimed = claimIdleYield({
    profile: settled,
    idleYield: IDLE_YIELD,
    nowMs: 60 * 60 * 1000,
    eventRoll: 0.99
  });
  steps.push({
    id: "idle_yield",
    detail: {
      cultivationGain: claimed.claim.cultivationGain,
      spiritStoneLow: claimed.claim.rewards.spirit_stone_low ?? 0
    }
  });

  const crafted = craftAlchemyRecipe({
    profile: claimed.profile,
    recipes: ALCHEMY_RECIPES,
    recipeId: "recipe_rejuvenation_pill"
  });
  steps.push({
    id: "alchemy_rejuvenation",
    detail: { rejuvenationPill: crafted.profile.pills.rejuvenation_pill ?? 0 }
  });

  const forged = upgradeArtifactStar({
    profile: crafted.profile,
    progression: ARTIFACT_PROGRESSION,
    artifactId: "artifact_qingshuang_sword"
  });
  steps.push({
    id: "artifact_qingshuang_star_2",
    detail: { star: forged.toStar }
  });

  const trained = trainMethod({
    profile: forged.profile,
    methods: CULTIVATION_METHODS,
    methodId: "method_sharp_metal",
    trainingPower: 210
  });
  steps.push({
    id: "method_sharp_metal_level_2",
    detail: { leveledUp: trained.leveledUp, level: trained.profile.methods.method_sharp_metal?.level ?? 0 }
  });

  const mastered = upgradeSpellMastery({
    profile: trained.profile,
    compendium: SPELL_COMPENDIUM,
    spellId: "spell_five_thunder"
  });
  steps.push({
    id: "spell_five_thunder_mastery_2",
    detail: { masteryLevel: mastered.toLevel }
  });

  return deepFreeze({
    profile: mastered.profile,
    steps
  });
}

function getEnemyDefinition(enemyId: string): EnemyDefinition {
  const definition = ENEMY_DEFINITIONS[enemyId];
  if (definition === undefined) {
    throw new Error(`Missing enemy definition fixture: ${enemyId}`);
  }
  return definition;
}

function getBossDefinition(bossId: string): BossDefinition {
  const boss = BOSSES.items.find((definition) => definition.id === bossId);
  if (boss === undefined) {
    throw new Error(`Missing boss definition fixture: ${bossId}`);
  }
  return boss;
}

function countBy<T>(items: readonly T[], getKey: (item: T) => string): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.freeze(counts);
}

function assertRunOptions(runId: string, seed: number, secondRunSeed: number): void {
  if (runId.length === 0) {
    throw new Error("runId must not be empty");
  }
  if (!Number.isInteger(seed)) {
    throw new Error("seed must be an integer");
  }
  if (!Number.isInteger(secondRunSeed)) {
    throw new Error("secondRunSeed must be an integer");
  }
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

function isCliEntry(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && import.meta.url === pathToFileURL(entry).href;
}

if (isCliEntry()) {
  const result = runFirstPlayableHeadless();
  console.log(
    JSON.stringify(
      {
        runId: result.firstRun.runId,
        seed: result.firstRun.seed,
        outcome: result.firstRun.stage.outcome,
        spawnedEnemies: result.firstRun.stage.spawnedEnemies,
        bossDefeated: result.firstRun.stage.bossDefeated,
        receiptId: result.firstRun.receipt.receiptId,
        secondRunId: result.secondRun.config.runId,
        openingPowerDelta: result.secondRun.openingPowerDelta,
        finalStateHash: result.finalStateHash
      },
      null,
      2
    )
  );
}
