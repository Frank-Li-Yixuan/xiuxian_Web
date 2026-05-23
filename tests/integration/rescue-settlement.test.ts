import { describe, expect, it } from "vitest";

import { secondsToFrames } from "../../src/sim/SimConstants";
import { createEmptyFrameInput, InputButtonBit, type FrameInput } from "../../src/sim/input/FrameInput";
import { stepRescueSystem } from "../../src/sim/player/RescueSystem";
import { stepSoulSystem } from "../../src/sim/player/SoulSystem";
import {
  createRunSettlementReceipt,
  type SettlementRewardConfig
} from "../../src/sim/settlement/RunSettlement";
import type { PlayerState, RescueState } from "../../src/sim/state/SimState";
import settlementRewardData from "../../data/outgame/settlement_rewards_stage01.v0.1.json";

const SETTLEMENT_REWARDS = settlementRewardData as SettlementRewardConfig;

describe("Soul, rescue, and run settlement", () => {
  it("moves zero-HP body players into soul and opens deterministic rescue state", () => {
    const players = [
      createPlayer({ playerId: "p1", aliveState: "body", hp: 0, position: { x: 820, y: 860 } }),
      createPlayer({ playerId: "p2", aliveState: "body", hp: 64, position: { x: 980, y: 870 } })
    ];
    const before = structuredClone(players);

    const result = stepSoulSystem({
      frame: 240,
      players,
      rescueStates: []
    });

    expect(players).toEqual(before);
    expect(result.players).toEqual([
      expect.objectContaining({ playerId: "p1", aliveState: "soul", hp: 0 }),
      expect.objectContaining({ playerId: "p2", aliveState: "body", hp: 64 })
    ]);
    expect(result.rescueStates).toEqual([
      {
        downedPlayerId: "p1",
        progressFrames: 0,
        requiredFrames: secondsToFrames(2.8)
      }
    ]);
    expect(result.events).toEqual([
      {
        type: "player_soul",
        effectId: "soul_out",
        frame: 240,
        playerId: "p1",
        position: { x: 820, y: 860 }
      }
    ]);
  });

  it("advances blood rescue while Interact is held in range and revives with yang-shen invulnerability", () => {
    let players = [
      createPlayer({ playerId: "p1", aliveState: "body", hp: 80, maxHp: 100, position: { x: 880, y: 900 } }),
      createPlayer({ playerId: "p2", aliveState: "soul", hp: 0, maxHp: 100, position: { x: 950, y: 920 } })
    ];
    let rescueStates: readonly RescueState[] = [{ downedPlayerId: "p2", progressFrames: 0, requiredFrames: 3 }];
    const events: unknown[] = [];

    for (const frame of [300, 301, 302]) {
      const result = stepRescueSystem({
        frame,
        players,
        rescueStates,
        frameInputs: [interactInput(frame, "p1"), createEmptyFrameInput(frame, "p2")]
      });
      players = [...result.players];
      rescueStates = result.rescueStates;
      events.push(...result.events);
    }

    expect(players.find((player) => player.playerId === "p1")?.hp).toBeCloseTo(79.75, 2);
    expect(players.find((player) => player.playerId === "p2")).toEqual(
      expect.objectContaining({
        aliveState: "yang_shen",
        hp: 35
      })
    );
    expect(rescueStates).toEqual([]);
    expect(events).toEqual([
      {
        type: "rescue_start",
        effectId: "rescue_ring",
        frame: 300,
        downedPlayerId: "p2",
        rescuerPlayerId: "p1"
      },
      {
        type: "rescue_success",
        effectId: "rescue_ring",
        frame: 302,
        downedPlayerId: "p2",
        rescuerPlayerId: "p1",
        revivedHp: 35,
        invulnerableFrames: secondsToFrames(2)
      }
    ]);
  });

  it("does not progress rescue out of range or without Interact and decays existing progress", () => {
    const players = [
      createPlayer({ playerId: "p1", aliveState: "body", hp: 80, position: { x: 400, y: 400 } }),
      createPlayer({ playerId: "p2", aliveState: "soul", hp: 0, position: { x: 950, y: 920 } })
    ];

    const result = stepRescueSystem({
      frame: 410,
      players,
      rescueStates: [{ downedPlayerId: "p2", rescuerPlayerId: "p1", progressFrames: 2, requiredFrames: 5 }],
      frameInputs: [createEmptyFrameInput(410, "p1"), createEmptyFrameInput(410, "p2")]
    });

    expect(result.players).toEqual(players);
    expect(result.rescueStates).toEqual([{ downedPlayerId: "p2", progressFrames: 1, requiredFrames: 5 }]);
    expect(result.events).toEqual([]);
  });

  it("creates a deterministic boss victory settlement receipt and keeps collected base materials", () => {
    const receipt = createRunSettlementReceipt({
      runId: "run_018_clear",
      profileId: "profile_local",
      mode: "local_coop_shared_profile",
      stageId: "stage_01_qingyun",
      difficulty: "normal",
      reachedSegment: "1-5",
      outcome: "boss_victory",
      rewardConfig: SETTLEMENT_REWARDS,
      firstClear: true,
      bossKilled: "boss_qingyun_tribulation_spirit",
      collectedBaseRewards: {
        spirit_stone_low: 12,
        material_stone_core: 2
      },
      bossSettlementMaterials: [
        { pickupId: "material_thunder_core", type: "outer_material", amount: 1 },
        {
          pickupId: "heavenly_material_creation_breath",
          type: "heavenly_material",
          amount: 1,
          params: { cultivationGain: 180 }
        }
      ]
    });

    expect(receipt).toEqual({
      receiptId: "receipt_run_018_clear_stage_01_qingyun_boss_victory",
      runId: "run_018_clear",
      profileId: "profile_local",
      mode: "local_coop_shared_profile",
      stageId: "stage_01_qingyun",
      difficulty: "normal",
      reachedSegment: "1-5",
      bossKilled: "boss_qingyun_tribulation_spirit",
      baseRewards: {
        spirit_stone_low: 382,
        material_stone_core: 2,
        qingling_herb: 23,
        clear_mind_grass: 6,
        black_iron_essence: 13,
        demon_core_small: 11,
        spirit_jade: 2,
        thunder_marow: 1,
        jade_slip_fragment: 3
      },
      bonusRewards: {
        material_thunder_core: 1,
        heavenly_material_creation_breath: 1
      },
      firstClearBonus: {
        spirit_vein_seed: 1,
        spell_page_thunder: 1
      },
      cultivationRewards: 180,
      appliedAtMs: null
    });
  });

  it("creates a deterministic team-wipe receipt with partial progress rewards", () => {
    const receipt = createRunSettlementReceipt({
      runId: "run_018_wipe",
      profileId: "profile_local",
      mode: "single_player",
      stageId: "stage_01_qingyun",
      difficulty: "normal",
      reachedSegment: "1-3",
      outcome: "team_wipe",
      rewardConfig: SETTLEMENT_REWARDS,
      firstClear: false,
      collectedBaseRewards: {
        spirit_stone_low: 15,
        qingling_herb: 4
      }
    });

    expect(receipt).toEqual({
      receiptId: "receipt_run_018_wipe_stage_01_qingyun_team_wipe",
      runId: "run_018_wipe",
      profileId: "profile_local",
      mode: "single_player",
      stageId: "stage_01_qingyun",
      difficulty: "normal",
      reachedSegment: "1-3",
      baseRewards: {
        spirit_stone_low: 225,
        qingling_herb: 16,
        black_iron_essence: 8,
        jade_slip_fragment: 2,
        demon_core_small: 6
      },
      appliedAtMs: null
    });
  });
});

function createPlayer(overrides: Partial<PlayerState> & { readonly playerId: string }): PlayerState {
  return {
    playerId: overrides.playerId,
    aliveState: overrides.aliveState ?? "body",
    hp: overrides.hp ?? 100,
    maxHp: overrides.maxHp ?? 100,
    qi: overrides.qi ?? 100,
    maxQi: overrides.maxQi ?? 100,
    position: overrides.position ?? { x: 960, y: 900 },
    cooldowns: overrides.cooldowns ?? {},
    digestionSlots: overrides.digestionSlots ?? []
  };
}

function interactInput(frame: number, playerId: string): FrameInput {
  return {
    ...createEmptyFrameInput(frame, playerId, frame),
    downMask: InputButtonBit.Interact
  };
}
