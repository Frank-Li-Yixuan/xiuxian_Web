import { describe, expect, it } from "vitest";

import { createRunRngStreams } from "../../src/sim/core/SeededRng";
import { createCombatPlayer } from "../../src/sim/player/PlayerSystem";
import { secondsToFrames } from "../../src/sim/SimConstants";
import type { PlayerCultivationState, TeamInsightExpState } from "../../src/sim/state/SimState";
import {
  indexCultivationData,
  stepCultivationSystem,
  type CultivationDataPack,
  type CultivationPlayerState
} from "../../src/sim/progression/CultivationSystem";
import {
  indexDynamicTribulationEvents,
  resolveTribulationSuccess,
  startDebugTribulation,
  stepTribulationSystem,
  type DynamicTribulationEventPack
} from "../../src/sim/tribulation/TribulationSystem";
import cultivationData from "../../data/progression/cultivation_realms.v0.1.json";
import tribulationData from "../../data/events/tribulations.v0.1.json";

const CULTIVATION = indexCultivationData(cultivationData as CultivationDataPack);
const TRIBULATIONS = indexDynamicTribulationEvents(tribulationData as DynamicTribulationEventPack);

const TEAM_INSIGHT: TeamInsightExpState = {
  level: 2,
  exp: 40,
  expToNext: 130,
  sharedFortuneReroll: 1
};

describe("Cultivation and debug tribulation", () => {
  it("grows personal cultivation independently and does not modify team insight exp", () => {
    const result = stepCultivationSystem({
      frame: 60,
      deltaFrames: 60,
      players: [cultivationPlayer("p2"), cultivationPlayer("p1")],
      playerCultivations: [
        cultivation("p2", { cultivation: 50 }),
        cultivation("p1", { cultivation: 100 })
      ],
      teamInsightExp: TEAM_INSIGHT,
      cultivationData: CULTIVATION,
      gains: [{ playerId: "p1", amount: 20, source: "cultivation_earth_essence" }]
    });

    expect(result.playerCultivations.map((state) => state.playerId)).toEqual(["p1", "p2"]);
    expect(result.playerCultivations.find((state) => state.playerId === "p1")?.cultivation).toBeCloseTo(121.6, 5);
    expect(result.playerCultivations.find((state) => state.playerId === "p2")?.cultivation).toBeCloseTo(51.6, 5);
    expect(result.teamInsightExp).toEqual(TEAM_INSIGHT);
    expect(result.events).toEqual([
      {
        frame: 60,
        type: "cultivation_gain",
        playerId: "p1",
        source: "cultivation_earth_essence",
        amount: 20
      }
    ]);
  });

  it("performs minor layer breakthrough and increases jing qiRoot shen without creating insight events", () => {
    const result = stepCultivationSystem({
      frame: 120,
      deltaFrames: 0,
      players: [cultivationPlayer("p1")],
      playerCultivations: [cultivation("p1", { layer: 1, cultivation: 149, cultivationToNext: 150 })],
      teamInsightExp: TEAM_INSIGHT,
      cultivationData: CULTIVATION,
      gains: [{ playerId: "p1", amount: 2, source: "minor_cultivation_boost" }]
    });

    expect(result.playerCultivations[0]).toEqual({
      playerId: "p1",
      realmId: "realm_qi_refining",
      layer: 2,
      cultivation: 1,
      cultivationToNext: 190,
      inTribulation: false
    });
    expect(result.players[0]).toEqual(
      expect.objectContaining({
        playerId: "p1",
        jing: 13,
        qiRoot: 12,
        shen: 11
      })
    );
    expect(result.teamInsightExp).toEqual(TEAM_INSIGHT);
    expect(result.events).toContainEqual({
      frame: 120,
      type: "minor_breakthrough",
      playerId: "p1",
      fromLayer: 1,
      toLayer: 2,
      statAdd: { jing: 3, qiRoot: 2, shen: 1 }
    });
  });

  it("caps at major realm bottleneck and emits an in-run tribulation request instead of changing insight exp", () => {
    const result = stepCultivationSystem({
      frame: 180,
      deltaFrames: 0,
      players: [cultivationPlayer("p1")],
      playerCultivations: [
        cultivation("p1", {
          layer: 9,
          cultivation: 855,
          cultivationToNext: 860
        })
      ],
      teamInsightExp: TEAM_INSIGHT,
      cultivationData: CULTIVATION,
      gains: [{ playerId: "p1", amount: 20, source: "pill_minor_breakthrough" }]
    });

    expect(result.playerCultivations[0]).toEqual({
      playerId: "p1",
      realmId: "realm_qi_refining",
      layer: 9,
      cultivation: 860,
      cultivationToNext: 860,
      inTribulation: true
    });
    expect(result.teamInsightExp).toEqual(TEAM_INSIGHT);
    expect(result.tribulationRequests).toEqual([
      {
        frame: 180,
        playerId: "p1",
        eventId: "trib_inrun_qi_to_foundation",
        realmFrom: "realm_qi_refining",
        realmTo: "realm_foundation",
        reason: "major_bottleneck"
      }
    ]);
    expect(result.events).toContainEqual({
      frame: 180,
      type: "tribulation_triggered",
      playerId: "p1",
      eventId: "trib_inrun_qi_to_foundation"
    });
  });

  it("can debug-force Three-Nine tribulation and produces deterministic RNG-driven warning locations", () => {
    const active = startDebugTribulation({
      frame: 240,
      playerId: "p1",
      eventId: "trib_inrun_qi_to_foundation",
      tribulationEvents: TRIBULATIONS
    });
    const firstRng = createRunRngStreams("debug-tribulation").tribulation;
    const secondRng = createRunRngStreams("debug-tribulation").tribulation;
    const differentRng = createRunRngStreams("debug-tribulation-other").tribulation;

    const first = stepTribulationSystem({
      frame: 240,
      activeTribulations: [active],
      players: [cultivationPlayer("p1", { position: { x: 800, y: 840 } })],
      tribulationEvents: TRIBULATIONS,
      tribulationRng: firstRng
    });
    const second = stepTribulationSystem({
      frame: 240,
      activeTribulations: [active],
      players: [cultivationPlayer("p1", { position: { x: 800, y: 840 } })],
      tribulationEvents: TRIBULATIONS,
      tribulationRng: secondRng
    });
    const different = stepTribulationSystem({
      frame: 240,
      activeTribulations: [active],
      players: [cultivationPlayer("p1", { position: { x: 800, y: 840 } })],
      tribulationEvents: TRIBULATIONS,
      tribulationRng: differentRng
    });
    const repeated = stepTribulationSystem({
      frame: 240 + secondsToFrames(2.4),
      activeTribulations: [active],
      players: [cultivationPlayer("p1", { position: { x: 800, y: 840 } })],
      tribulationEvents: TRIBULATIONS,
      tribulationRng: createRunRngStreams("debug-tribulation-repeat").tribulation
    });
    const expired = stepTribulationSystem({
      frame: active.endFrame,
      activeTribulations: [active],
      players: [cultivationPlayer("p1", { position: { x: 800, y: 840 } })],
      tribulationEvents: TRIBULATIONS,
      tribulationRng: createRunRngStreams("debug-tribulation-expired").tribulation
    });

    expect(active.debug).toBe(true);
    expect(active.endFrame).toBe(240 + secondsToFrames(24));
    expect(first.warningEvents).toHaveLength(2);
    expect(first.warningEvents).toEqual(second.warningEvents);
    expect(first.warningEvents).not.toEqual(different.warningEvents);
    expect(firstRng.getState().draws).toBeGreaterThan(0);
    expect(first.warningEvents.every((warning) => warning.unbreakable)).toBe(true);
    expect(repeated.warningEvents).toHaveLength(2);
    expect(repeated.warningEvents.every((warning) => warning.patternId === "trib_warning_columns_random")).toBe(true);
    expect(expired.activeTribulations).toEqual([]);
  });

  it("resolves successful tribulation by clearing the screen, restoring the player, and breaking through", () => {
    const active = startDebugTribulation({
      frame: 300,
      playerId: "p1",
      eventId: "trib_inrun_qi_to_foundation",
      tribulationEvents: TRIBULATIONS
    });

    const result = resolveTribulationSuccess({
      frame: active.endFrame,
      activeTribulation: active,
      players: [cultivationPlayer("p1", { hp: 30, maxHp: 100, qi: 10, maxQi: 100 })],
      enemies: [{ entityId: 1, enemyId: "enemy_mountain_imp", hp: 20, position: { x: 800, y: 320 } }],
      enemyProjectiles: [{ entityId: 11, ownerKind: "enemy", ownerId: "enemy_rogue_cultivator_shadow", damage: 12, position: { x: 760, y: 720 } }],
      playerCultivations: [
        cultivation("p1", {
          layer: 9,
          cultivation: 860,
          cultivationToNext: 860,
          inTribulation: true
        })
      ],
      cultivationData: CULTIVATION,
      tribulationEvents: TRIBULATIONS
    });

    expect(result.enemies).toEqual([]);
    expect(result.enemyProjectiles).toEqual([]);
    expect(result.players[0]).toEqual(
      expect.objectContaining({
        playerId: "p1",
        jing: 16.5,
        qiRoot: 16.5,
        shen: 14.5,
        maxHp: 165,
        hp: 165,
        maxQi: 180,
        qi: 180
      })
    );
    expect(result.playerCultivations[0]).toEqual({
      playerId: "p1",
      realmId: "realm_foundation",
      layer: 1,
      cultivation: 0,
      cultivationToNext: 0,
      inTribulation: false
    });
    expect(result.events).toEqual([
      { frame: active.endFrame, type: "tribulation_success", playerId: "p1", eventId: "trib_inrun_qi_to_foundation" },
      { frame: active.endFrame, type: "screen_clear", playerId: "p1", eventId: "trib_inrun_qi_to_foundation" },
      { frame: active.endFrame, type: "major_breakthrough", playerId: "p1", realmFrom: "realm_qi_refining", realmTo: "realm_foundation" }
    ]);
  });
});

function cultivation(
  playerId: string,
  overrides: Partial<PlayerCultivationState> = {}
): PlayerCultivationState {
  return {
    playerId,
    realmId: "realm_qi_refining",
    layer: 1,
    cultivation: 0,
    cultivationToNext: 150,
    inTribulation: false,
    ...overrides
  };
}

function cultivationPlayer(
  playerId: string,
  overrides: Partial<CultivationPlayerState> = {}
): CultivationPlayerState {
  return {
    ...createCombatPlayer({
      playerId,
      natalArtifactId: "artifact_qingshuang_sword",
      position: { x: 800, y: 900 }
    }),
    jing: 10,
    qiRoot: 10,
    shen: 10,
    ...overrides
  };
}
