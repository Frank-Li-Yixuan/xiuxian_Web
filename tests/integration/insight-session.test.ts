import { describe, expect, it } from "vitest";

import { createRunRngStreams } from "../../src/sim/core/SeededRng";
import type { PlayerCultivationState, TeamInsightExpState } from "../../src/sim/state/SimState";
import {
  applyTeamInsightExpGain,
  indexInsightExpTable,
  type InsightExpTablePack
} from "../../src/sim/progression/TeamInsightSystem";
import {
  chooseInsightOption,
  createInsightSession,
  rerollInsightOptions
} from "../../src/sim/progression/InsightSession";
import {
  generateRewardChoices,
  indexRewardPools,
  type RewardPoolPack
} from "../../src/sim/rewards/RewardGenerator";
import insightExpData from "../../data/progression/insight_exp_tables.v0.1.json";
import rewardPoolsData from "../../data/rewards/reward_pools.v0.1.json";

const INSIGHT_TABLE = indexInsightExpTable(insightExpData as InsightExpTablePack);
const REWARD_POOLS = indexRewardPools((rewardPoolsData as RewardPoolPack).items);

const CULTIVATIONS: readonly PlayerCultivationState[] = [
  {
    playerId: "p1",
    realmId: "realm_qi_refining",
    layer: 2,
    cultivation: 120,
    cultivationToNext: 380,
    inTribulation: false
  },
  {
    playerId: "p2",
    realmId: "realm_qi_refining",
    layer: 1,
    cultivation: 70,
    cultivationToNext: 300,
    inTribulation: false
  }
];

describe("Team insight and reward session", () => {
  it("adds insight exp to the shared team track and triggers insight_pause without modifying cultivation", () => {
    const teamInsightExp: TeamInsightExpState = {
      level: 1,
      exp: 50,
      expToNext: 60,
      sharedFortuneReroll: 2
    };

    const result = applyTeamInsightExpGain({
      frame: 420,
      source: "orb_insight_large",
      amount: 46,
      teamInsightExp,
      playerCultivations: CULTIVATIONS,
      insightTable: INSIGHT_TABLE
    });

    expect(result.teamInsightExp).toEqual({
      level: 2,
      exp: 36,
      expToNext: 130,
      sharedFortuneReroll: 2
    });
    expect(result.events).toEqual([
      {
        frame: 420,
        type: "insight_pause",
        source: "orb_insight_large",
        triggeredLevel: 2,
        overflowExp: 36
      }
    ]);
    expect(result.playerCultivations).toEqual(CULTIVATIONS);
  });

  it("generates visible three-choice rewards for P1/P2 with rewardRng in stable player order", () => {
    const firstRun = createRunRngStreams("insight-session-stable-order");
    const secondRun = createRunRngStreams("insight-session-stable-order");

    const reversedPlayers = createInsightSession({
      frame: 900,
      sessionId: "insight_001",
      rewardPoolId: "reward_pool_qingyun_basic",
      playerIds: ["p2", "p1"],
      teamInsightExp: { level: 2, exp: 0, expToNext: 130, sharedFortuneReroll: 1 },
      rewardPools: REWARD_POOLS,
      rewardRng: firstRun.reward,
      playerContexts: {
        p1: rewardContext({ playerId: "p1", spellSlots: [null, "spell_five_thunder", null, null] }),
        p2: rewardContext({ playerId: "p2", spellSlots: [null, null, null, null] })
      }
    });
    const sortedPlayers = createInsightSession({
      frame: 900,
      sessionId: "insight_001",
      rewardPoolId: "reward_pool_qingyun_basic",
      playerIds: ["p1", "p2"],
      teamInsightExp: { level: 2, exp: 0, expToNext: 130, sharedFortuneReroll: 1 },
      rewardPools: REWARD_POOLS,
      rewardRng: secondRun.reward,
      playerContexts: {
        p1: rewardContext({ playerId: "p1", spellSlots: [null, "spell_five_thunder", null, null] }),
        p2: rewardContext({ playerId: "p2", spellSlots: [null, null, null, null] })
      }
    });

    expect(reversedPlayers.players.map((panel) => panel.playerId)).toEqual(["p1", "p2"]);
    expect(reversedPlayers.players.map((panel) => panel.options)).toEqual(sortedPlayers.players.map((panel) => panel.options));
    expect(reversedPlayers.players).toEqual([
      expect.objectContaining({ playerId: "p1", selectedOptionId: undefined, guardianState: false }),
      expect.objectContaining({ playerId: "p2", selectedOptionId: undefined, guardianState: false })
    ]);
    expect(reversedPlayers.players.every((panel) => panel.options.length === 3)).toBe(true);
    expect(new Set(reversedPlayers.players.flatMap((panel) => panel.options.map((option) => option.reward.targetId))).size).toBe(6);
    expect(firstRun.reward.getState().draws).toBeGreaterThan(0);
  });

  it("rerolls one player's options through shared fortune and leaves the other player visible choices unchanged", () => {
    const rng = createRunRngStreams("insight-reroll").reward;
    const session = createInsightSession({
      frame: 1000,
      sessionId: "insight_reroll",
      rewardPoolId: "reward_pool_qingyun_basic",
      playerIds: ["p1", "p2"],
      teamInsightExp: { level: 3, exp: 0, expToNext: 240, sharedFortuneReroll: 2 },
      rewardPools: REWARD_POOLS,
      rewardRng: rng,
      playerContexts: {
        p1: rewardContext({ playerId: "p1" }),
        p2: rewardContext({ playerId: "p2" })
      }
    });

    const p1Before = session.players.find((panel) => panel.playerId === "p1")?.options.map((option) => option.optionId);
    const p2Before = session.players.find((panel) => panel.playerId === "p2")?.options.map((option) => option.optionId);

    const rerolled = rerollInsightOptions({
      frame: 1010,
      session,
      playerId: "p1",
      rewardPools: REWARD_POOLS,
      rewardRng: rng,
      playerContexts: {
        p1: rewardContext({ playerId: "p1" }),
        p2: rewardContext({ playerId: "p2" })
      }
    });

    expect(rerolled.session.sharedFortuneReroll).toBe(1);
    expect(rerolled.events).toEqual([{ frame: 1010, type: "insight_reroll", playerId: "p1", remainingSharedFortuneReroll: 1 }]);
    expect(rerolled.session.players.find((panel) => panel.playerId === "p1")?.options.map((option) => option.optionId)).not.toEqual(p1Before);
    expect(rerolled.session.players.find((panel) => panel.playerId === "p2")?.options.map((option) => option.optionId)).toEqual(p2Before);
  });

  it("records both player choices, marks completed session, and never mutates cultivation", () => {
    const session = createInsightSession({
      frame: 1200,
      sessionId: "insight_choose",
      rewardPoolId: "reward_pool_qingyun_basic",
      playerIds: ["p1", "p2"],
      teamInsightExp: { level: 2, exp: 0, expToNext: 130, sharedFortuneReroll: 0 },
      rewardPools: REWARD_POOLS,
      rewardRng: createRunRngStreams("insight-choose").reward,
      playerContexts: {
        p1: rewardContext({ playerId: "p1" }),
        p2: rewardContext({ playerId: "p2" })
      },
      playerCultivations: CULTIVATIONS
    });

    const p1Option = session.players[0]?.options[0]?.optionId ?? "";
    const p2Option = session.players[1]?.options[1]?.optionId ?? "";
    const p1Chosen = chooseInsightOption({ frame: 1210, session, playerId: "p1", optionId: p1Option });
    const p2Chosen = chooseInsightOption({ frame: 1220, session: p1Chosen.session, playerId: "p2", optionId: p2Option });

    expect(p1Chosen.session.completed).toBe(false);
    expect(p1Chosen.events).toEqual([{ frame: 1210, type: "insight_option_selected", playerId: "p1", optionId: p1Option }]);
    expect(p2Chosen.session.completed).toBe(true);
    expect(p2Chosen.events).toEqual([
      { frame: 1220, type: "insight_option_selected", playerId: "p2", optionId: p2Option },
      { frame: 1220, type: "insight_session_completed", sessionId: "insight_choose" }
    ]);
    expect(p2Chosen.session.players.map((panel) => panel.guardianState)).toEqual([true, true]);
    expect(p2Chosen.playerCultivations).toEqual(CULTIVATIONS);
  });

  it("filters reward conditions before stable weighted choice generation", () => {
    const rng = createRunRngStreams("condition-filter").reward;
    const rewardPool = REWARD_POOLS.reward_pool_qingyun_artifact;
    expect(rewardPool).toBeDefined();
    const choices = generateRewardChoices({
      rewardPool: rewardPool!,
      playerId: "p1",
      choicesPerPlayer: 3,
      rewardRng: rng,
      excludedTargetIds: new Set(),
      context: rewardContext({
        playerId: "p1",
        innerArtifactId: "artifact_qingshuang_sword"
      })
    });

    expect(choices).toEqual([]);
    expect(rng.getState().draws).toBe(0);
  });
});

function rewardContext(overrides: {
  readonly playerId: string;
  readonly spellSlots?: readonly (string | null)[];
  readonly innerTreasureSlots?: readonly (string | null)[];
  readonly innerArtifactId?: string | null;
}) {
  return {
    playerId: overrides.playerId,
    spellSlots: overrides.spellSlots ?? [null, null, null, null],
    innerTreasureSlots: overrides.innerTreasureSlots ?? [null, null],
    innerArtifactId: overrides.innerArtifactId ?? null,
    inTribulation: false
  };
}
