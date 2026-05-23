import { describe, expect, it } from "vitest";

import bossesData from "../../data/bosses/bosses.v0.1.json";
import dropTableData from "../../data/rewards/drop_tables.v0.1.json";
import { SIM_FPS, secondsToFrames } from "../../src/sim/SimConstants";
import {
  createBossState,
  stepBossFrame,
  type BossDefinition,
  type BossSystemDropTablePack
} from "../../src/sim/boss/BossSystem";
import { BossTimelineRunner } from "../../src/sim/boss/BossTimelineRunner";

const QINGYUN_BOSS = getBossDefinition("boss_qingyun_tribulation_spirit");
const DROP_TABLE_PACK = dropTableData as BossSystemDropTablePack;

describe("BossTimelineRunner", () => {
  it("expands Qingyun boss phase timelines into deterministic fixed-frame attack events", () => {
    expect(SIM_FPS).toBe(60);
    const runner = new BossTimelineRunner(getBossPhase(QINGYUN_BOSS, 0));
    const phaseStartFrame = 1_000;

    expect(runner.getEventsForFrame(phaseStartFrame + secondsToFrames(0.5), phaseStartFrame)).toEqual([
      expect.objectContaining({
        frame: 1_030,
        phaseFrame: 30,
        phaseId: "phase_1_thunder_orbs",
        patternId: "boss_five_way_slow_orbs",
        repeatIndex: 0,
        params: { speed: 190, damage: 12 }
      })
    ]);
    expect(runner.getEventsForFrame(phaseStartFrame + secondsToFrames(0.5 + 3.2), phaseStartFrame)).toEqual([
      expect.objectContaining({
        frame: 1_222,
        phaseFrame: 222,
        patternId: "boss_five_way_slow_orbs",
        repeatIndex: 1
      })
    ]);
    expect(runner.getEventsForFrame(phaseStartFrame + secondsToFrames(2), phaseStartFrame)).toEqual([
      expect.objectContaining({
        frame: 1_120,
        phaseFrame: 120,
        patternId: "boss_targeted_triple_thunder",
        repeatIndex: 0,
        params: { warningTime: 0.35 }
      })
    ]);
    expect(runner.getEventsForFrame(phaseStartFrame + secondsToFrames(10), phaseStartFrame)).toEqual([
      expect.objectContaining({
        patternId: "boss_targeted_triple_thunder",
        repeatIndex: 2
      }),
      expect.objectContaining({
        patternId: "summon_stage01_imps",
        repeatIndex: 0,
        params: { count: 10 }
      })
    ]);
    expect(Object.isFrozen(runner.getEventsForFrame(phaseStartFrame + secondsToFrames(10), phaseStartFrame))).toBe(true);
  });
});

describe("BossSystem Qingyun Tribulation Spirit", () => {
  it("handles entry movement, three HP-threshold phases, and frame-based phase attack timelines", () => {
    const spawnFrame = 600;
    const boss = createBossState({
      definition: QINGYUN_BOSS,
      entityId: 20,
      spawnFrame,
      x: 960
    });

    expect(boss).toEqual(
      expect.objectContaining({
        entityId: 20,
        bossId: "boss_qingyun_tribulation_spirit",
        hp: 5200,
        maxHp: 5200,
        phaseIndex: 0,
        phaseId: "phase_1_thunder_orbs",
        spawnFrame,
        phaseStartFrame: spawnFrame + secondsToFrames(2.2),
        status: "entering",
        position: { x: 960, y: -260 }
      })
    );

    const midEntry = stepBossFrame({
      definition: QINGYUN_BOSS,
      boss,
      frame: spawnFrame + secondsToFrames(1.1)
    });
    expect(midEntry.boss.position.y).toBe(-95);
    expect(midEntry.boss.status).toBe("entering");
    expect(midEntry.attackEvents).toEqual([]);

    const phaseOneFirstAttack = stepBossFrame({
      definition: QINGYUN_BOSS,
      boss,
      frame: boss.phaseStartFrame + secondsToFrames(0.5)
    });
    expect(phaseOneFirstAttack.boss.status).toBe("active");
    expect(phaseOneFirstAttack.boss.position).toEqual({ x: 960, y: 70 });
    expect(phaseOneFirstAttack.attackEvents).toEqual([
      expect.objectContaining({
        frame: boss.phaseStartFrame + 30,
        phaseId: "phase_1_thunder_orbs",
        patternId: "boss_five_way_slow_orbs",
        projectileCount: 5,
        projectileOwnerKind: "boss"
      })
    ]);

    const phaseTwo = stepBossFrame({
      definition: QINGYUN_BOSS,
      boss: phaseOneFirstAttack.boss,
      frame: boss.phaseStartFrame + secondsToFrames(31),
      incomingDamage: 1800
    });
    expect(phaseTwo.boss).toEqual(
      expect.objectContaining({
        hp: 3400,
        phaseIndex: 1,
        phaseId: "phase_2_cloud_press",
        phaseStartFrame: boss.phaseStartFrame + secondsToFrames(31),
        status: "active"
      })
    );
    expect(phaseTwo.phaseTransitions).toEqual([
      { frame: phaseTwo.boss.phaseStartFrame, fromPhaseId: "phase_1_thunder_orbs", toPhaseId: "phase_2_cloud_press" }
    ]);
    expect(phaseTwo.effectEvents).toEqual([
      expect.objectContaining({
        frame: phaseTwo.boss.phaseStartFrame,
        effectId: "boss_phase_shift",
        bossId: "boss_qingyun_tribulation_spirit"
      })
    ]);
    expect(phaseTwo.attackEvents).toEqual([
      expect.objectContaining({
        patternId: "tribulation_warning_columns",
        projectileOwnerKind: "tribulation",
        warningFrames: 48
      })
    ]);

    const phaseThree = stepBossFrame({
      definition: QINGYUN_BOSS,
      boss: phaseTwo.boss,
      frame: phaseTwo.boss.phaseStartFrame + secondsToFrames(35),
      incomingDamage: 1710
    });
    expect(phaseThree.boss).toEqual(
      expect.objectContaining({
        hp: 1690,
        phaseIndex: 2,
        phaseId: "phase_3_heavenly_torrent"
      })
    );
    expect(phaseThree.attackEvents).toEqual([
      expect.objectContaining({
        patternId: "boss_fast_tracking_thunder",
        projectileOwnerKind: "boss",
        projectileCount: 2
      })
    ]);
  });

  it("defeats Phase 3, emits boss death EffectEvent, and materializes deterministic settlement materials", () => {
    const boss = createBossState({
      definition: QINGYUN_BOSS,
      entityId: 20,
      spawnFrame: 0,
      x: 960
    });
    const phaseThree = stepBossFrame({
      definition: QINGYUN_BOSS,
      boss,
      frame: boss.phaseStartFrame + secondsToFrames(80),
      incomingDamage: 3600
    }).boss;

    const defeated = stepBossFrame({
      definition: QINGYUN_BOSS,
      boss: phaseThree,
      frame: boss.phaseStartFrame + secondsToFrames(112),
      incomingDamage: 9999,
      dropTables: DROP_TABLE_PACK.items,
      dropRolls: { drop_boss_qingyun_tribulation_spirit: [0.0, 0.0, 0.0, 0.0, 0.2] }
    });

    expect(defeated.boss).toEqual(
      expect.objectContaining({
        hp: 0,
        phaseIndex: 2,
        phaseId: "phase_3_heavenly_torrent",
        status: "defeated",
        defeatedFrame: boss.phaseStartFrame + secondsToFrames(112)
      })
    );
    expect(defeated.attackEvents).toEqual([]);
    expect(defeated.effectEvents).toEqual([
      expect.objectContaining({
        frame: defeated.boss.defeatedFrame,
        effectId: "boss_death_cascade",
        bossId: "boss_qingyun_tribulation_spirit",
        position: { x: 960, y: 70 }
      })
    ]);
    expect(defeated.deathRewards).toEqual(
      expect.objectContaining({
        bossId: "boss_qingyun_tribulation_spirit",
        dropTableId: "drop_boss_qingyun_tribulation_spirit",
        rewardPoolIds: ["reward_pool_qingyun_boss"],
        settlementMaterials: [
          expect.objectContaining({ pickupId: "material_thunder_core", type: "outer_material", amount: 1 }),
          expect.objectContaining({ pickupId: "material_demon_core", type: "outer_material", amount: 2 }),
          expect.objectContaining({ pickupId: "heavenly_material_creation_breath", type: "heavenly_material", amount: 1 })
        ]
      })
    );
  });

  it("keeps boss combat deterministic across repeated frame scripts", () => {
    const first = runBossDamageScript();
    const second = runBossDamageScript();

    expect(first).toEqual(second);
    expect(first.finalBoss.status).toBe("defeated");
    expect(first.attackPatternIds).toEqual([
      "boss_five_way_slow_orbs",
      "tribulation_warning_columns",
      "boss_fast_tracking_thunder"
    ]);
  });
});

function runBossDamageScript() {
  let boss = createBossState({
    definition: QINGYUN_BOSS,
    entityId: 20,
    spawnFrame: 0,
    x: 960
  });
  const attackPatternIds: string[] = [];

  const frames = [
    boss.phaseStartFrame + secondsToFrames(0.5),
    boss.phaseStartFrame + secondsToFrames(32),
    boss.phaseStartFrame + secondsToFrames(68),
    boss.phaseStartFrame + secondsToFrames(112)
  ];
  const damage = [0, 1800, 1710, 9999];

  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    const result = stepBossFrame({
      definition: QINGYUN_BOSS,
      boss,
      frame: frame ?? 0,
      incomingDamage: damage[index] ?? 0,
      dropTables: DROP_TABLE_PACK.items,
      dropRolls: { drop_boss_qingyun_tribulation_spirit: [0, 0, 0, 0, 0.2] }
    });
    attackPatternIds.push(...result.attackEvents.map((event) => event.patternId));
    boss = result.boss;
  }

  return {
    finalBoss: boss,
    attackPatternIds
  };
}

function getBossDefinition(bossId: string): BossDefinition {
  const boss = (bossesData.items as readonly BossDefinition[]).find((definition) => definition.id === bossId);
  if (boss === undefined) {
    throw new Error(`Missing ${bossId} fixture`);
  }
  return boss;
}

function getBossPhase(boss: BossDefinition, phaseIndex: number) {
  const phase = boss.phases[phaseIndex];
  if (phase === undefined) {
    throw new Error(`Missing phase ${phaseIndex} for ${boss.id}`);
  }
  return phase;
}
