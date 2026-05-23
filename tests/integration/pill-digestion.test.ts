import { describe, expect, it } from "vitest";

import { InputButtonBit, type FrameInput } from "../../src/sim/input/FrameInput";
import { createCombatPlayer, type CombatPlayerState } from "../../src/sim/player/PlayerSystem";
import { secondsToFrames } from "../../src/sim/SimConstants";
import type { PlayerCultivationState, TeamInsightExpState } from "../../src/sim/state/SimState";
import {
  createPillRuntimeState,
  getPillModifiers,
  indexPillDefinitions,
  stepPillSystem,
  type PillDefinitionPack,
  type PillRuntimePlayerState
} from "../../src/sim/pills/PillSystem";
import { stepDigestionSystem } from "../../src/sim/pills/DigestionSystem";
import pillsData from "../../data/pills/pills.v0.1.json";

const PILLS = indexPillDefinitions((pillsData as PillDefinitionPack).items);

describe("Pill digestion system", () => {
  it("swallows Rejuvenation Pill into a frame digestion slot and heals over time instead of instantly", () => {
    const p1 = player("p1", { hp: 20 });
    const pillState = createPillRuntimeState([
      {
        playerId: "p1",
        pillSlots: ["pill_rejuvenation", null, null],
        inventory: { pill_rejuvenation: 1 }
      }
    ]);

    const swallowed = stepPillSystem({
      frame: 30,
      players: [p1],
      frameInputs: [input("p1", InputButtonBit.Pill1)],
      pillDefinitions: PILLS,
      pillState
    });

    expect(swallowed.players[0]?.hp).toBe(20);
    expect(swallowed.pillState[0]?.inventory.pill_rejuvenation).toBe(0);
    expect(swallowed.pillState[0]?.activeDigestions).toEqual([
      expect.objectContaining({
        pillId: "pill_rejuvenation",
        startFrame: 30,
        totalFrames: secondsToFrames(12),
        remainingFrames: secondsToFrames(12)
      })
    ]);
    expect(swallowed.effectEvents).toEqual([expect.objectContaining({ event: "pill_swallowed", pillId: "pill_rejuvenation" })]);

    const afterOneSecond = runDigestionFrames({
      startFrame: 31,
      frames: secondsToFrames(1),
      players: swallowed.players,
      pillState: swallowed.pillState
    });

    expect(afterOneSecond.players[0]?.hp).toBeCloseTo(28, 5);
    expect(afterOneSecond.pillState[0]?.activeDigestions[0]?.remainingFrames).toBe(secondsToFrames(11));

    const afterFullDigest = runDigestionFrames({
      startFrame: 91,
      frames: secondsToFrames(11),
      players: afterOneSecond.players,
      pillState: afterOneSecond.pillState
    });

    expect(afterFullDigest.players[0]?.hp).toBe(100);
    expect(afterFullDigest.pillState[0]?.activeDigestions).toEqual([]);
  });

  it("applies Burning Blood buffs during digestion and starts weakness as a frame after-effect", () => {
    const pillState = createPillRuntimeState([
      {
        playerId: "p1",
        pillSlots: ["pill_burning_blood", null, null],
        inventory: { pill_burning_blood: 1 }
      }
    ]);

    const swallowed = stepPillSystem({
      frame: 0,
      players: [player("p1")],
      frameInputs: [input("p1", InputButtonBit.Pill1)],
      pillDefinitions: PILLS,
      pillState
    });

    expect(getPillModifiers({ pillDefinitions: PILLS, pillState: swallowed.pillState, playerId: "p1" })).toEqual(
      expect.objectContaining({
        attackSpeedMultiplier: 1.35,
        spellDamageMultiplier: 1.25,
        qiCostMultiplier: 0.9,
        moveSpeedMultiplier: 1
      })
    );

    const afterDigest = runDigestionFrames({
      startFrame: 1,
      frames: secondsToFrames(8),
      players: swallowed.players,
      pillState: swallowed.pillState
    });

    expect(afterDigest.pillState[0]?.activeDigestions).toEqual([]);
    expect(afterDigest.pillState[0]?.activeAfterEffects).toEqual([
      expect.objectContaining({
        pillId: "pill_burning_blood",
        effectId: "burning_blood_weakness",
        totalFrames: secondsToFrames(3),
        remainingFrames: secondsToFrames(3)
      })
    ]);
    expect(afterDigest.effectEvents).toContainEqual(
      expect.objectContaining({ event: "pill_after_effect_started", effectId: "burning_blood_weakness" })
    );
    expect(getPillModifiers({ pillDefinitions: PILLS, pillState: afterDigest.pillState, playerId: "p1" })).toEqual(
      expect.objectContaining({
        attackSpeedMultiplier: 1,
        spellDamageMultiplier: 1,
        moveSpeedMultiplier: 0.82
      })
    );

    const afterWeakness = runDigestionFrames({
      startFrame: 1 + secondsToFrames(8),
      frames: secondsToFrames(3),
      players: afterDigest.players,
      pillState: afterDigest.pillState
    });

    expect(afterWeakness.pillState[0]?.activeAfterEffects).toEqual([]);
    expect(getPillModifiers({ pillDefinitions: PILLS, pillState: afterWeakness.pillState, playerId: "p1" }).moveSpeedMultiplier).toBe(1);
  });

  it("cleanses configured status tags and exposes Clear Mind movement buff while digesting", () => {
    const pillState = createPillRuntimeState([
      {
        playerId: "p1",
        pillSlots: [null, "pill_clear_mind", null],
        inventory: { pill_clear_mind: 1 }
      }
    ]);

    const swallowed = stepPillSystem({
      frame: 12,
      players: [player("p1")],
      frameInputs: [input("p1", InputButtonBit.Pill2)],
      pillDefinitions: PILLS,
      pillState,
      statusTagsByPlayer: { p1: ["slow", "burn", "poison"] }
    });

    expect(swallowed.statusTagsByPlayer.p1).toEqual(["poison"]);
    expect(swallowed.cleanseEvents).toEqual([
      expect.objectContaining({
        playerId: "p1",
        pillId: "pill_clear_mind",
        removedTags: ["slow", "burn"]
      })
    ]);
    expect(getPillModifiers({ pillDefinitions: PILLS, pillState: swallowed.pillState, playerId: "p1" }).moveSpeedMultiplier).toBe(1.15);
  });

  it("adds Minor Breakthrough cultivation only after digestion completes and never changes team insight exp", () => {
    const teamInsightExp: TeamInsightExpState = {
      level: 1,
      exp: 99,
      expToNext: 160,
      sharedFortuneReroll: 1
    };
    const playerCultivations: readonly PlayerCultivationState[] = [
      {
        playerId: "p1",
        realmId: "realm_qi_refining",
        layer: 1,
        cultivation: 40,
        cultivationToNext: 300,
        inTribulation: false
      }
    ];
    const pillState = createPillRuntimeState([
      {
        playerId: "p1",
        pillSlots: [null, null, "pill_minor_breakthrough"],
        inventory: { pill_minor_breakthrough: 1 }
      }
    ]);

    const swallowed = stepPillSystem({
      frame: 100,
      players: [player("p1")],
      frameInputs: [input("p1", InputButtonBit.Pill3)],
      pillDefinitions: PILLS,
      pillState
    });

    const afterOneFrame = stepDigestionSystem({
      frame: 101,
      players: swallowed.players,
      pillDefinitions: PILLS,
      pillState: swallowed.pillState,
      teamInsightExp,
      playerCultivations
    });

    expect(afterOneFrame.playerCultivations[0]?.cultivation).toBe(40);
    expect(afterOneFrame.teamInsightExp).toEqual(teamInsightExp);

    const fullDuration = secondsToFrames(PILLS.pill_minor_breakthrough?.digestTime ?? 0);
    const afterFullDigest = runDigestionFrames({
      startFrame: 102,
      frames: fullDuration - 1,
      players: afterOneFrame.players,
      pillState: afterOneFrame.pillState,
      teamInsightExp: afterOneFrame.teamInsightExp,
      playerCultivations: afterOneFrame.playerCultivations
    });

    expect(afterFullDigest.playerCultivations[0]?.cultivation).toBe(160);
    expect(afterFullDigest.teamInsightExp).toEqual(teamInsightExp);
    expect(afterFullDigest.cultivationGains).toEqual([
      {
        playerId: "p1",
        pillId: "pill_minor_breakthrough",
        effectId: "minor_cultivation_boost",
        amount: 120
      }
    ]);
  });

  it("rejects swallowing the same pill while it is already digesting", () => {
    const p1 = player("p1");
    const pillState = createPillRuntimeState([
      {
        playerId: "p1",
        pillSlots: ["pill_rejuvenation", null, null],
        inventory: { pill_rejuvenation: 2 }
      }
    ]);

    const first = stepPillSystem({
      frame: 1,
      players: [p1],
      frameInputs: [input("p1", InputButtonBit.Pill1)],
      pillDefinitions: PILLS,
      pillState
    });
    const second = stepPillSystem({
      frame: 2,
      players: first.players,
      frameInputs: [input("p1", InputButtonBit.Pill1)],
      pillDefinitions: PILLS,
      pillState: first.pillState
    });

    expect(second.pillState[0]?.inventory.pill_rejuvenation).toBe(1);
    expect(second.pillState[0]?.activeDigestions).toHaveLength(1);
    expect(second.effectEvents).toEqual([
      expect.objectContaining({
        event: "pill_swallow_failed",
        pillId: "pill_rejuvenation",
        reason: "same_pill_digesting"
      })
    ]);
  });
});

function input(playerId: string, pressedMask: number): FrameInput {
  return {
    frame: 0,
    playerId,
    moveX: 0,
    moveY: 0,
    downMask: pressedMask,
    pressedMask,
    releasedMask: 0,
    inputSeq: 0
  };
}

function player(playerId: string, overrides: Partial<CombatPlayerState> = {}): CombatPlayerState {
  return {
    ...createCombatPlayer({
      playerId,
      natalArtifactId: "artifact_qingshuang_sword",
      position: { x: 800, y: 900 }
    }),
    ...overrides
  };
}

function runDigestionFrames(options: {
  readonly startFrame: number;
  readonly frames: number;
  readonly players: readonly CombatPlayerState[];
  readonly pillState: readonly PillRuntimePlayerState[];
  readonly teamInsightExp?: TeamInsightExpState;
  readonly playerCultivations?: readonly PlayerCultivationState[];
}) {
  let players = options.players;
  let pillState = options.pillState;
  let teamInsightExp = options.teamInsightExp ?? { level: 1, exp: 0, expToNext: 160, sharedFortuneReroll: 0 };
  let playerCultivations = options.playerCultivations ?? [];
  const effectEvents = [];
  const cultivationGains = [];

  for (let offset = 0; offset < options.frames; offset += 1) {
    const result = stepDigestionSystem({
      frame: options.startFrame + offset,
      players,
      pillDefinitions: PILLS,
      pillState,
      teamInsightExp,
      playerCultivations
    });
    players = result.players;
    pillState = result.pillState;
    teamInsightExp = result.teamInsightExp;
    playerCultivations = result.playerCultivations;
    effectEvents.push(...result.effectEvents);
    cultivationGains.push(...result.cultivationGains);
  }

  return {
    players,
    pillState,
    teamInsightExp,
    playerCultivations,
    effectEvents,
    cultivationGains
  };
}
