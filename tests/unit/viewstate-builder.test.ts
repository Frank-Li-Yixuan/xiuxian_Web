import { describe, expect, it } from "vitest";

import { secondsToFrames } from "../../src/sim/SimConstants";
import type { InsightSessionState } from "../../src/sim/progression/InsightSession";
import { createInitialSimState, type SimState } from "../../src/sim/state/SimState";
import {
  buildInRunViewState,
  createViewContentIndex,
  type ViewContentInput,
  type ViewPlayerLoadout
} from "../../src/view/ViewStateBuilder";
import artifactsData from "../../data/artifacts/artifacts.v0.1.json";
import bossesData from "../../data/bosses/bosses.v0.1.json";
import tribulationsData from "../../data/events/tribulations.v0.1.json";
import pillsData from "../../data/pills/pills.v0.1.json";
import cultivationData from "../../data/progression/cultivation_realms.v0.1.json";
import spellsData from "../../data/spells/spells.v0.1.json";
import stageData from "../../data/stages/stage_01_qingyun.v0.1.json";
import treasuresData from "../../data/treasures/spirit_treasures.v0.1.json";

const CONTENT = createViewContentIndex({
  artifacts: artifactsData.items,
  bosses: bossesData.items,
  cultivationRules: cultivationData.cultivationRules,
  pills: pillsData.items,
  realms: cultivationData.items,
  spells: spellsData.items,
  stages: [stageData],
  treasures: treasuresData.items,
  tribulations: tribulationsData.dynamicInRunEvents
} as ViewContentInput);

describe("ViewStateBuilder", () => {
  it("builds a frozen UI ViewState without mutating SimState and keeps insight exp, cultivation, qi, and pill digestion separate", () => {
    const simState = createViewStateFixture();
    const before = structuredClone(simState);

    const view = buildInRunViewState({
      simState,
      content: CONTENT,
      screen: { width: 1920, height: 1080, scale: 1 },
      playerLoadouts: LOADOUTS,
      stageProgress: {
        stageId: "stage_01_qingyun",
        segmentId: "stage_01_04",
        segmentIndex: 3,
        segmentCount: 5,
        segmentStartFrame: 600,
        segmentEndFrame: 4800,
        nextEventText: "Boss将临"
      }
    });

    expect(simState).toEqual(before);
    expect(Object.isFrozen(view)).toBe(true);
    expect(Object.isFrozen(view.players)).toBe(true);
    expect(Object.isFrozen(view.players[0]?.spells)).toBe(true);
    expect(() => (view.players as unknown as unknown[]).push({})).toThrow(TypeError);

    expect(view.screen).toEqual({
      width: 1920,
      height: 1080,
      scale: 1,
      safeArea: { x: 0, y: 0, width: 1920, height: 1080 }
    });
    expect(view.players.map((player) => player.playerId)).toEqual(["p1", "p2"]);
    expect(view.teamInsight).toEqual({
      visible: true,
      teamLevel: 3,
      exp: 180,
      expToNext: 180,
      progress01: 1,
      nextTriggerText: "下一次顿悟",
      sharedFortuneReroll: 2,
      isReadyToInsight: true
    });

    const p1 = view.players[0];
    expect(p1?.core).toEqual(
      expect.objectContaining({
        playerId: "p1",
        displayName: "P1",
        colorToken: "player1",
        realmName: "练气",
        realmLayer: 9,
        hp: 35,
        maxHp: 100,
        qi: 30,
        maxQi: 100,
        aliveState: "body",
        lowHp: true,
        canBeRescued: false
      })
    );
    expect(p1?.cultivation).toEqual({
      playerId: "p1",
      realmName: "练气",
      layer: 9,
      cultivation: 860,
      cultivationToNext: 860,
      progress01: 1,
      regenPerSecond: 1.6,
      bottleneck: {
        type: "major_realm",
        targetRealmName: "筑基",
        tribulationIncoming: true
      }
    });
    expect(p1?.spells).toEqual([
      expect.objectContaining({
        slotIndex: 0,
        keyLabel: "J",
        spellId: "spell_five_thunder",
        name: "五雷正法",
        level: 2,
        costQi: 45,
        cooldownRemaining: 2,
        cooldownTotal: 8,
        state: "cooldown",
        element: "thunder"
      }),
      expect.objectContaining({
        slotIndex: 1,
        keyLabel: "K",
        spellId: "spell_bagua_sword_ring",
        name: "八卦剑阵",
        costQi: 35,
        state: "qi_insufficient",
        element: "metal"
      }),
      { slotIndex: 2, keyLabel: "L", state: "empty" },
      { slotIndex: 3, keyLabel: "I", state: "empty" }
    ]);
    expect(p1?.pills).toEqual([
      expect.objectContaining({
        slotIndex: 0,
        keyLabel: "1",
        pillId: "pill_rejuvenation",
        name: "回春丹",
        state: "digesting",
        remainingTime: 6,
        totalTime: 12
      }),
      expect.objectContaining({
        slotIndex: 1,
        keyLabel: "2",
        pillId: "pill_minor_breakthrough",
        name: "小破境丹",
        state: "ready"
      }),
      { slotIndex: 2, keyLabel: "3", state: "empty" }
    ]);

    expect(p1?.artifacts.outer).toEqual(
      expect.objectContaining({ slotType: "outer", itemId: "artifact_qingshuang_sword", name: "青霜飞剑", star: 2 })
    );
    expect(p1?.treasures.slots.map((slot) => slot.itemId)).toEqual([
      "treasure_minor_sword_array",
      "treasure_bagua_jade",
      null,
      null
    ]);
  });

  it("exposes boss, tribulation, rescue, and insight overlay status for renderer and UI consumers", () => {
    const view = buildInRunViewState({
      simState: createViewStateFixture(),
      content: CONTENT,
      screen: { width: 1920, height: 1080, scale: 1 },
      playerLoadouts: LOADOUTS,
      insightSession: INSIGHT_SESSION,
      lightningWarnings: [
        {
          id: "warn_001",
          tribulationId: "trib_inrun_qi_to_foundation",
          x: 760,
          y: 500,
          radius: 80,
          impactFrame: 700,
          severity: "lethal"
        }
      ],
      stageProgress: {
        stageId: "stage_01_qingyun",
        segmentId: "stage_01_04",
        segmentIndex: 3,
        segmentCount: 5,
        segmentStartFrame: 600,
        segmentEndFrame: 4800,
        nextEventText: "Boss将临"
      }
    });

    expect(view.mode).toBe("insight_paused");
    expect(view.stage).toEqual({
      stageName: "青云山·妖潮初临",
      segmentName: "妖潮压境",
      segmentIndex: 4,
      segmentCount: 5,
      timeRemaining: 69.333,
      nextEventText: "Boss将临",
      intensity: "high"
    });
    expect(view.boss).toEqual({
      visible: true,
      bossId: "boss_qingyun_tribulation_spirit",
      name: "青云劫灵",
      hp: 2600,
      maxHp: 5200,
      phaseIndex: 2,
      phaseCount: 3,
      phaseName: "phase_2_cloud_press"
    });
    expect(view.tribulation).toEqual({
      active: true,
      playerId: "p1",
      tribulationName: "练气破筑基·局内三九雷劫",
      phase: "active",
      remainingTime: 23.333,
      warningText: "天象异变 · 三九雷劫",
      canClearThunder: false,
      targetRealmName: "筑基",
      lightningWarnings: [
        {
          id: "warn_001",
          x: 760,
          y: 500,
          radius: 80,
          timeToImpact: 1,
          severity: "lethal"
        }
      ]
    });
    expect(view.rescue).toEqual({
      visible: true,
      downedPlayerId: "p2",
      rescuerPlayerId: "p1",
      canRescue: true,
      inRange: true,
      progress01: 0.5,
      hpCostPreviewPercent: 0.35,
      keyLabel: "H",
      decayActive: false
    });
    expect(view.players[1]?.core).toEqual(
      expect.objectContaining({
        playerId: "p2",
        aliveState: "soul",
        canBeRescued: true,
        rescueProgress: 0.5
      })
    );
    expect(view.insight).toEqual({
      visible: true,
      mode: "coop",
      sharedFortuneReroll: 2,
      players: [
        {
          playerId: "p1",
          selected: true,
          guardianState: true,
          options: [
            expect.objectContaining({ optionId: "p1_choice_spell", rewardType: "spell_upgrade", name: "五雷正法", keyLabel: "J" }),
            expect.objectContaining({ optionId: "p1_choice_pill", rewardType: "pill", name: "回春丹", keyLabel: "K" })
          ]
        },
        {
          playerId: "p2",
          selected: false,
          guardianState: false,
          options: [
            expect.objectContaining({ optionId: "p2_choice_cultivation", rewardType: "cultivation_boost", name: "修为助益", keyLabel: "Num1" })
          ]
        }
      ]
    });
  });
});

const LOADOUTS: readonly ViewPlayerLoadout[] = [
  {
    playerId: "p1",
    displayName: "P1",
    spellSlots: ["spell_five_thunder", "spell_bagua_sword_ring", null, null],
    spellLevels: { spell_five_thunder: 2 },
    pillSlots: ["pill_rejuvenation", "pill_minor_breakthrough", null],
    outerArtifact: { itemId: "artifact_qingshuang_sword", star: 2 },
    innerArtifact: { itemId: "artifact_ziyang_gourd", star: 1 },
    treasureSlots: [
      { source: "outer", itemId: "treasure_minor_sword_array" },
      { source: "outer", itemId: "treasure_bagua_jade" },
      { source: "inner", itemId: null },
      { source: "inner", itemId: null }
    ],
    techniqueTags: ["metal"],
    talentTags: ["chain"],
    constitutionTags: ["root_qi"]
  },
  {
    playerId: "p2",
    displayName: "P2",
    spellSlots: ["spell_red_lotus_fire", null, null, null],
    pillSlots: ["pill_clear_mind", null, null],
    outerArtifact: { itemId: "artifact_xuanyue_seal", star: 1 },
    innerArtifact: { itemId: null },
    treasureSlots: [
      { source: "outer", itemId: "treasure_gold_toad" },
      { source: "outer", itemId: "treasure_tongxin_lock" },
      { source: "inner", itemId: null },
      { source: "inner", itemId: null }
    ]
  }
];

const INSIGHT_SESSION: InsightSessionState = {
  sessionId: "insight_001",
  frame: 640,
  rewardPoolId: "reward_pool_qingyun_basic",
  mode: "coop",
  sharedFortuneReroll: 2,
  completed: false,
  playerCultivations: [],
  players: [
    {
      playerId: "p1",
      selectedOptionId: "p1_choice_spell",
      guardianState: true,
      options: [
        {
          optionId: "p1_choice_spell",
          playerId: "p1",
          rewardPoolId: "reward_pool_qingyun_basic",
          reward: { type: "spell_upgrade", targetId: "spell_five_thunder", rarity: "rare" }
        },
        {
          optionId: "p1_choice_pill",
          playerId: "p1",
          rewardPoolId: "reward_pool_qingyun_basic",
          reward: { type: "pill", targetId: "pill_rejuvenation", rarity: "common" }
        }
      ]
    },
    {
      playerId: "p2",
      selectedOptionId: undefined,
      guardianState: false,
      options: [
        {
          optionId: "p2_choice_cultivation",
          playerId: "p2",
          rewardPoolId: "reward_pool_qingyun_basic",
          reward: { type: "cultivation_boost", targetId: "cultivation_boost_minor", rarity: "uncommon" }
        }
      ]
    }
  ]
};

function createViewStateFixture(): SimState {
  return {
    ...createInitialSimState({
      runId: "run_view_001",
      seed: 20260523,
      dataPackHash: "hash_view",
      stageId: "stage_01_qingyun"
    }),
    frame: 640,
    players: [
      {
        playerId: "p2",
        aliveState: "soul",
        hp: 0,
        maxHp: 100,
        qi: 70,
        maxQi: 100,
        position: { x: 1040, y: 880 },
        cooldowns: {},
        digestionSlots: []
      },
      {
        playerId: "p1",
        aliveState: "body",
        hp: 35,
        maxHp: 100,
        qi: 30,
        maxQi: 100,
        position: { x: 880, y: 900 },
        cooldowns: {
          spell_five_thunder: 640 + secondsToFrames(2),
          spell_bagua_sword_ring: 600
        },
        digestionSlots: [
          {
            pillId: "pill_rejuvenation",
            remainingFrames: secondsToFrames(6),
            totalFrames: secondsToFrames(12)
          }
        ]
      }
    ],
    bosses: [{ entityId: 20, bossId: "boss_qingyun_tribulation_spirit", hp: 2600, phaseIndex: 1 }],
    tribulations: [{ id: "trib_inrun_qi_to_foundation", triggeringPlayerId: "p1", startFrame: 600, phase: "active" }],
    teamInsightExp: { level: 3, exp: 180, expToNext: 180, sharedFortuneReroll: 2 },
    playerCultivations: [
      { playerId: "p2", realmId: "realm_qi_refining", layer: 2, cultivation: 40, cultivationToNext: 190, inTribulation: false },
      { playerId: "p1", realmId: "realm_qi_refining", layer: 9, cultivation: 860, cultivationToNext: 860, inTribulation: true }
    ],
    rescueStates: [{ downedPlayerId: "p2", rescuerPlayerId: "p1", progressFrames: 90, requiredFrames: 180 }]
  };
}
