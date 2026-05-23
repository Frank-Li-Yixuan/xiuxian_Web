import { describe, expect, it } from "vitest";

import {
  runFirstPlayableHeadless,
  runFirstPlayableReplaySet
} from "../../tools/run-headless-stage01";

describe("First Playable headless end-to-end integration", () => {
  it("runs default profile through stage 01 settlement, outgame upgrades, and second-run config without Canvas", () => {
    const result = runFirstPlayableHeadless({
      runId: "e2e_stage01_seed_20260523",
      seed: 20260523,
      secondRunSeed: 20260524
    });

    expect(result.firstRun.loadout).toEqual(
      expect.objectContaining({
        playerId: "p1",
        presetId: "preset_safe_push",
        natalArtifact: { itemId: "artifact_qingshuang_sword", star: 1 },
        spellIds: ["spell_five_thunder", "spell_bagua_sword_ring", null, null],
        pillIds: ["pill_rejuvenation", null, null]
      })
    );
    expect(result.firstRun.stage).toEqual(
      expect.objectContaining({
        stageId: "stage_01_qingyun",
        segmentIds: ["stage_01_01", "stage_01_02", "stage_01_03", "stage_01_04", "stage_01_05"],
        spawnedEnemies: 232,
        bossId: "boss_qingyun_tribulation_spirit",
        bossDefeated: true,
        outcome: "boss_victory"
      })
    );
    expect(result.firstRun.stage.spawnCountsBySegment).toEqual({
      stage_01_01: 52,
      stage_01_02: 33,
      stage_01_03: 52,
      stage_01_04: 95
    });
    expect(result.firstRun.receipt).toEqual(
      expect.objectContaining({
        runId: "e2e_stage01_seed_20260523",
        profileId: "debug_profile_001",
        stageId: "stage_01_qingyun",
        difficulty: "normal",
        reachedSegment: "1-5",
        bossKilled: "boss_qingyun_tribulation_spirit"
      })
    );

    expect(result.outgame.steps.map((step) => step.id)).toEqual([
      "settlement",
      "idle_yield",
      "alchemy_rejuvenation",
      "artifact_qingshuang_star_2",
      "method_sharp_metal_level_2",
      "spell_five_thunder_mastery_2"
    ]);
    expect(result.outgame.profile.flags.firstStageCleared).toBe(true);
    expect(result.outgame.profile.artifacts.artifact_qingshuang_sword).toEqual({ unlocked: true, star: 2 });
    expect(result.outgame.profile.methods.method_sharp_metal).toEqual({
      unlocked: true,
      level: 2,
      trainingProgress: 0
    });
    expect(result.outgame.profile.spells.spell_five_thunder).toEqual({ unlocked: true, masteryLevel: 2 });
    expect(result.outgame.profile.pills.rejuvenation_pill).toBe(2);
    expect(result.outgame.profile.wallet).not.toHaveProperty("insight_exp");

    expect(result.secondRun.config).toEqual(
      expect.objectContaining({
        schema: "RunConfig",
        version: "0.1",
        runId: "second_run_e2e_stage01_seed_20260524",
        seed: 20260524,
        difficulty: "normal",
        stageId: "stage_01_qingyun"
      })
    );
    expect(result.secondRun.config.players.p1).toEqual(
      expect.objectContaining({
        natalArtifactId: "artifact_qingshuang_sword",
        artifactStars: { artifact_qingshuang_sword: 2 },
        spellLevels: { spell_five_thunder: 2, spell_bagua_sword_ring: 1 },
        pillIds: ["pill_rejuvenation", null, null]
      })
    );
    expect(result.secondRun.openingPowerDelta).toBeGreaterThan(0);
    expect(result.secondRun.config.players.p1?.openingPowerScore).toBeGreaterThan(
      result.firstRun.loadout.openingPowerScore
    );
  });

  it("is reproducible for the same seed and diverges for a different seed", () => {
    const replays = runFirstPlayableReplaySet({
      runId: "e2e_replay",
      seed: 20260523,
      replayCount: 3
    });
    const differentSeed = runFirstPlayableHeadless({
      runId: "e2e_replay",
      seed: 20260524,
      secondRunSeed: 20260525
    });

    expect(replays.runs).toHaveLength(3);
    expect(new Set(replays.finalStateHashes).size).toBe(1);
    expect(replays.runs[0]?.firstRun.stage.spawnCountsByEnemyId).toEqual(
      replays.runs[1]?.firstRun.stage.spawnCountsByEnemyId
    );
    expect(replays.runs[0]?.finalStateHash).toBe(replays.runs[2]?.finalStateHash);
    expect(differentSeed.finalStateHash).not.toBe(replays.runs[0]?.finalStateHash);
  });
});
