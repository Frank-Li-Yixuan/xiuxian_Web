import { describe, expect, it } from "vitest";

import { SeededRng } from "../../src/sim/core/SeededRng";
import { createCombatPlayer } from "../../src/sim/player/PlayerSystem";
import { SIM_FPS } from "../../src/sim/SimConstants";
import {
  StageRunner,
  type StageDefinition,
  type StageFrameContext
} from "../../src/sim/stage/StageRunner";
import { WaveSpawner } from "../../src/sim/stage/WaveSpawner";
import {
  EnemyManager,
  indexEnemyDefinitions,
  stepEnemies,
  type EnemyDefinition,
  type EnemyDefinitionPack
} from "../../src/sim/enemies/EnemySystem";
import stageData from "../../data/stages/stage_01_qingyun.v0.1.json";
import enemyData from "../../data/enemies/enemies.v0.1.json";

const STAGE = stageData as StageDefinition;
const ENEMY_DEFINITIONS = indexEnemyDefinitions((enemyData as EnemyDefinitionPack).items);
const STAGE_01_01_TO_04 = ["stage_01_01", "stage_01_02", "stage_01_03", "stage_01_04"] as const;

describe("StageRunner and WaveSpawner", () => {
  it("spawns stage 1-1 through 1-4 from Stage JSON with deterministic stageRng", () => {
    const firstRun = runStage01Waves(20260523);
    const secondRun = runStage01Waves(20260523);

    expect(firstRun.spawnSummary).toEqual(secondRun.spawnSummary);
    expect(firstRun.rngState).toEqual(secondRun.rngState);
    expect(firstRun.spawnSummary.bySegment).toEqual({
      stage_01_01: 52,
      stage_01_02: 33,
      stage_01_03: 52,
      stage_01_04: 95
    });
    expect(firstRun.spawnSummary.byEnemyId).toEqual({
      enemy_mountain_imp: 170,
      enemy_wolf_demon: 44,
      enemy_rogue_cultivator_shadow: 14,
      enemy_stone_armor_demon: 3,
      elite_split_wind_wolf: 1
    });
    expect(firstRun.spawnSummary.total).toBe(232);
    expect(firstRun.spawnSummary.entityIds).toEqual(Array.from({ length: 232 }, (_, index) => index + 1));
    expect(firstRun.rngState.draws).toBeGreaterThan(0);
  });

  it("keeps StageRunner segment timing in fixed 60 FPS frames", () => {
    const runner = new StageRunner(STAGE, { segmentIds: STAGE_01_01_TO_04 });

    expect(runner.totalFrames).toBe((55 + 60 + 60 + 70) * SIM_FPS);
    expect(runner.getFrameContext(0)?.segmentId).toBe("stage_01_01");
    expect(runner.getFrameContext(55 * SIM_FPS - 1)?.segmentId).toBe("stage_01_01");
    expect(runner.getFrameContext(55 * SIM_FPS)?.segmentId).toBe("stage_01_02");
    expect(runner.getFrameContext((55 + 60 + 60 + 70) * SIM_FPS)).toBeUndefined();
  });
});

describe("EnemySystem", () => {
  it("applies baseline movement and behavior for all stage 01 enemy types", () => {
    const enemyManager = new EnemyManager();
    const spawnFrame = 0;

    const mountainImp = enemyManager.spawnEnemy({
      enemyDefinition: getEnemyDefinition("enemy_mountain_imp"),
      position: { x: 960, y: 0 },
      spawnFrame,
      sourceSegmentId: "test",
      sourceWaveIndex: 0,
      sourceGroupIndex: 0,
      spawnIndex: 0
    });
    const wolf = enemyManager.spawnEnemy({
      enemyDefinition: getEnemyDefinition("enemy_wolf_demon"),
      position: { x: 960, y: 100 },
      spawnFrame,
      sourceSegmentId: "test",
      sourceWaveIndex: 0,
      sourceGroupIndex: 0,
      spawnIndex: 0
    });
    const rogueShadow = enemyManager.spawnEnemy({
      enemyDefinition: getEnemyDefinition("enemy_rogue_cultivator_shadow"),
      position: { x: 820, y: 210 },
      spawnFrame,
      sourceSegmentId: "test",
      sourceWaveIndex: 0,
      sourceGroupIndex: 0,
      spawnIndex: 0
    });
    const stoneDemon = enemyManager.spawnEnemy({
      enemyDefinition: getEnemyDefinition("enemy_stone_armor_demon"),
      position: { x: 620, y: 0 },
      spawnFrame,
      sourceSegmentId: "test",
      sourceWaveIndex: 0,
      sourceGroupIndex: 0,
      spawnIndex: 0
    });
    const eliteWolf = enemyManager.spawnEnemy({
      enemyDefinition: getEnemyDefinition("elite_split_wind_wolf"),
      position: { x: 960, y: 80 },
      spawnFrame,
      sourceSegmentId: "test",
      sourceWaveIndex: 0,
      sourceGroupIndex: 0,
      spawnIndex: 0
    });

    const stepped = stepEnemies({
      frame: 1,
      enemies: [mountainImp, wolf, rogueShadow, stoneDemon, eliteWolf],
      players: [
        createCombatPlayer({
          playerId: "p1",
          natalArtifactId: "artifact_qingshuang_sword",
          position: { x: 700, y: 900 }
        }),
        createCombatPlayer({
          playerId: "p2",
          natalArtifactId: "artifact_ziyang_gourd",
          position: { x: 960, y: 900 }
        })
      ]
    });

    expect(stepped.find((enemy) => enemy.entityId === mountainImp.entityId)).toMatchObject({
      behaviorId: "straight_down",
      position: { x: 960, y: 120 / SIM_FPS },
      velocity: { x: 0, y: 120 }
    });
    expect(stepped.find((enemy) => enemy.entityId === wolf.entityId)).toMatchObject({
      behaviorId: "charge_nearest_player",
      targetPlayerId: "p2",
      velocity: { x: 0, y: 310 },
      position: { x: 960, y: 100 + 310 / SIM_FPS }
    });
    expect(stepped.find((enemy) => enemy.entityId === rogueShadow.entityId)).toMatchObject({
      behaviorId: "stop_and_shoot",
      behaviorPhase: "stationary",
      bulletPatternId: "pattern_triple_down",
      position: { x: 820, y: 210 },
      velocity: { x: 0, y: 0 }
    });
    expect(stepped.find((enemy) => enemy.entityId === stoneDemon.entityId)).toMatchObject({
      behaviorId: "slow_tank",
      armor: 0.25,
      position: { x: 620, y: 65 / SIM_FPS },
      velocity: { x: 0, y: 65 }
    });
    expect(stepped.find((enemy) => enemy.entityId === eliteWolf.entityId)).toMatchObject({
      behaviorId: "elite_charge",
      targetPlayerId: "p2",
      velocity: { x: 0, y: 360 },
      position: { x: 960, y: 80 + 360 / SIM_FPS }
    });
  });
});

function runStage01Waves(seed: number): {
  readonly spawnSummary: SpawnSummary;
  readonly rngState: ReturnType<SeededRng["getState"]>;
} {
  const stageRng = new SeededRng(seed, "stage");
  const runner = new StageRunner(STAGE, { segmentIds: STAGE_01_01_TO_04 });
  const spawner = new WaveSpawner({ stageRng });
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

  return {
    spawnSummary: summarizeSpawns(enemyManager.getEnemiesSorted()),
    rngState: stageRng.getState()
  };
}

interface SpawnSummary {
  readonly total: number;
  readonly bySegment: Readonly<Record<string, number>>;
  readonly byEnemyId: Readonly<Record<string, number>>;
  readonly entityIds: readonly number[];
}

function summarizeSpawns(enemies: readonly ReturnType<EnemyManager["getEnemiesSorted"]>[number][]): SpawnSummary {
  return {
    total: enemies.length,
    bySegment: countBy(enemies, (enemy) => enemy.sourceSegmentId),
    byEnemyId: countBy(enemies, (enemy) => enemy.enemyId),
    entityIds: enemies.map((enemy) => enemy.entityId)
  };
}

function countBy<T>(items: readonly T[], getKey: (item: T) => string): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function getEnemyDefinition(enemyId: string): EnemyDefinition {
  const definition = ENEMY_DEFINITIONS[enemyId];
  if (definition === undefined) {
    throw new Error(`Missing enemy definition fixture: ${enemyId}`);
  }
  return definition;
}
