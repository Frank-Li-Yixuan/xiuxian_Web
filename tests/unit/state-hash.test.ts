import { describe, expect, it } from "vitest";

import { computeStateHash, normalizeStateForHash } from "../../src/sim/core/StateHash";
import { EntityManager } from "../../src/sim/entity/EntityManager";
import { createInitialSimState, type SimState } from "../../src/sim/state/SimState";

describe("EntityManager", () => {
  it("allocates stable increasing entity ids and returns entities in id order", () => {
    const manager = new EntityManager<{ readonly kind: string; readonly hp: number }>();

    const first = manager.create({ kind: "enemy", hp: 20 });
    const second = manager.create({ kind: "projectile", hp: 1 });
    manager.remove(second.entityId);
    const third = manager.create({ kind: "pickup", hp: 0 });

    expect(first.entityId).toBe(1);
    expect(second.entityId).toBe(2);
    expect(third.entityId).toBe(3);
    expect(manager.getAllSorted().map((entity) => entity.entityId)).toEqual([1, 3]);
    expect(manager.getAllocatorState()).toEqual({ nextEntityId: 4 });
  });
});

describe("SimState", () => {
  it("creates explicit gameplay containers for deterministic simulation", () => {
    const state = createInitialSimState({
      runId: "run_state_001",
      seed: 20260523,
      dataPackHash: "content_hash",
      stageId: "stage_01_qingyun"
    });

    expect(state.players).toEqual([]);
    expect(state.enemies).toEqual([]);
    expect(state.projectiles).toEqual([]);
    expect(state.pickups).toEqual([]);
    expect(state.bosses).toEqual([]);
    expect(state.tribulations).toEqual([]);
    expect(state.teamInsightExp).toEqual({ level: 1, exp: 0, expToNext: 100, sharedFortuneReroll: 0 });
    expect(state.playerCultivations).toEqual([]);
    expect(state.rescueStates).toEqual([]);
    expect(state.rng).toEqual({});
  });
});

describe("StateHash", () => {
  it("produces the same hash for equivalent state regardless of object field order", () => {
    const base = createHashFixtureState();
    const reordered: SimState = {
      rng: base.rng,
      rescueStates: base.rescueStates,
      playerCultivations: base.playerCultivations,
      teamInsightExp: {
        expToNext: base.teamInsightExp.expToNext,
        sharedFortuneReroll: base.teamInsightExp.sharedFortuneReroll,
        exp: base.teamInsightExp.exp,
        level: base.teamInsightExp.level
      },
      tribulations: base.tribulations,
      bosses: base.bosses,
      pickups: base.pickups,
      projectiles: base.projectiles,
      enemies: base.enemies,
      players: base.players,
      frame: base.frame,
      stageId: base.stageId,
      dataPackHash: base.dataPackHash,
      seed: base.seed,
      runId: base.runId
    };

    expect(computeStateHash(base)).toBe(computeStateHash(reordered));
  });

  it("normalizes gameplay arrays by stable identity before hashing", () => {
    const a = createHashFixtureState();
    const b: SimState = {
      ...a,
      players: [...a.players].reverse(),
      enemies: [...a.enemies].reverse(),
      projectiles: [...a.projectiles].reverse(),
      pickups: [...a.pickups].reverse()
    };

    expect(normalizeStateForHash(b).players.map((player) => player.playerId)).toEqual(["p1", "p2"]);
    expect(normalizeStateForHash(b).enemies.map((enemy) => enemy.entityId)).toEqual([2, 7]);
    expect(computeStateHash(a)).toBe(computeStateHash(b));
  });

  it("excludes renderer, UI, audio, and real-time fields from gameplay hash", () => {
    const state = createHashFixtureState();
    const polluted = {
      ...state,
      ui: { selectedPanel: "inventory", animationFrame: 9001 },
      vfx: { particles: [{ x: 999, y: 111, alpha: 0.5 }] },
      audio: { lastCue: "boss_roar" },
      realTime: { nowMs: 123456789, fps: 48 }
    } as SimState & Record<string, unknown>;

    expect(computeStateHash(polluted)).toBe(computeStateHash(state));
  });

  it("changes when gameplay state changes", () => {
    const before = createHashFixtureState();
    const after: SimState = {
      ...before,
      players: before.players.map((player) => (player.playerId === "p1" ? { ...player, hp: player.hp - 1 } : player))
    };

    expect(computeStateHash(after)).not.toBe(computeStateHash(before));
  });
});

function createHashFixtureState(): SimState {
  return {
    ...createInitialSimState({
      runId: "run_hash_001",
      seed: 20260523,
      dataPackHash: "content_hash",
      stageId: "stage_01_qingyun"
    }),
    frame: 120,
    players: [
      {
        playerId: "p2",
        aliveState: "body",
        hp: 90,
        maxHp: 100,
        qi: 30,
        maxQi: 50,
        position: { x: 720, y: 900 },
        cooldowns: { spell_bagua_sword_ring: 12 },
        digestionSlots: []
      },
      {
        playerId: "p1",
        aliveState: "body",
        hp: 100,
        maxHp: 100,
        qi: 50,
        maxQi: 50,
        position: { y: 920, x: 540 },
        cooldowns: { spell_five_thunder: 0 },
        digestionSlots: [{ pillId: "pill_rejuvenation", remainingFrames: 120, totalFrames: 300 }]
      }
    ],
    enemies: [
      { entityId: 7, enemyId: "enemy_wolf_demon", hp: 34, position: { x: 800, y: 100 } },
      { entityId: 2, enemyId: "enemy_mountain_imp", hp: 22, position: { x: 600, y: 80 } }
    ],
    projectiles: [
      { entityId: 9, ownerKind: "player", ownerId: "p1", damage: 12, position: { x: 600, y: 700 } },
      { entityId: 4, ownerKind: "enemy", ownerId: "enemy_mountain_imp", damage: 8, position: { x: 650, y: 450 } }
    ],
    pickups: [
      { entityId: 11, pickupId: "drop_qi_orb", amount: 1, position: { x: 700, y: 600 } },
      { entityId: 10, pickupId: "drop_spirit_orb", amount: 5, position: { x: 500, y: 500 } }
    ],
    bosses: [{ entityId: 20, bossId: "boss_qingyun_tribulation_spirit", hp: 5200, phaseIndex: 0 }],
    tribulations: [{ id: "trib_inrun_qi_to_foundation", triggeringPlayerId: "p1", startFrame: 100, phase: "warning" }],
    teamInsightExp: { level: 2, exp: 30, expToNext: 180, sharedFortuneReroll: 1 },
    playerCultivations: [
      { playerId: "p2", realmId: "realm_qi_refining", layer: 2, cultivation: 40, cultivationToNext: 100, inTribulation: false },
      { playerId: "p1", realmId: "realm_qi_refining", layer: 3, cultivation: 90, cultivationToNext: 100, inTribulation: false }
    ],
    rescueStates: [{ downedPlayerId: "p2", progressFrames: 0, requiredFrames: 180 }],
    rng: {
      gameplay: { algorithm: "lcg32", seed: 1, state: 2, streamName: "gameplay", draws: 3 },
      stage: { algorithm: "lcg32", seed: 4, state: 5, streamName: "stage", draws: 6 }
    }
  };
}
