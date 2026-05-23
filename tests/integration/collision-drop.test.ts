import { describe, expect, it } from "vitest";

import { createCombatPlayer } from "../../src/sim/player/PlayerSystem";
import { ProjectileManager } from "../../src/sim/projectiles/ProjectileSystem";
import { EnemyManager, type EnemyDefinition } from "../../src/sim/enemies/EnemySystem";
import {
  resolveCollisionFrame,
  type EnemyProjectileState
} from "../../src/sim/combat/CollisionSystem";
import { applyDamageEvents } from "../../src/sim/combat/DamageSystem";
import {
  createDropTableIndex,
  materializeDrops,
  type DropTablePack
} from "../../src/sim/drops/DropSystem";
import {
  applyPickupFrame,
  type PickupPlayerState,
  type PickupTeamInsightState
} from "../../src/sim/drops/PickupSystem";
import dropTableData from "../../data/rewards/drop_tables.v0.1.json";

const DROP_TABLES = createDropTableIndex((dropTableData as DropTablePack).items);

const MOUNTAIN_IMP: EnemyDefinition = {
  id: "enemy_mountain_imp",
  hp: 22,
  speed: 120,
  contactDamage: 10,
  behaviorId: "straight_down",
  behaviorParams: {},
  tags: ["normal", "stage01"]
};

describe("Collision, damage, drops, and pickups", () => {
  it("applies player projectile damage to enemies and materializes deterministic drops on kill", () => {
    const projectileManager = new ProjectileManager();
    const projectile = projectileManager.spawnProjectile({
      ownerPlayerId: "p1",
      artifactId: "artifact_qingshuang_sword",
      patternId: "straight_pierce_sword",
      kind: "linear",
      position: { x: 800, y: 400 },
      velocity: { x: 0, y: -850 },
      damage: 25,
      radius: 6,
      pierce: 0,
      spawnFrame: 12,
      delayFrames: 0
    });

    const enemyManager = new EnemyManager();
    const enemy = enemyManager.spawnEnemy({
      enemyDefinition: MOUNTAIN_IMP,
      position: { x: 804, y: 403 },
      spawnFrame: 0,
      sourceSegmentId: "stage_01_01",
      sourceWaveIndex: 0,
      sourceGroupIndex: 0,
      spawnIndex: 0
    });

    const collision = resolveCollisionFrame({
      frame: 18,
      players: [],
      enemies: [enemy],
      playerProjectiles: [projectile],
      enemyProjectiles: []
    });

    expect(collision.damageEvents).toEqual([
      expect.objectContaining({
        targetKind: "enemy",
        targetEntityId: enemy.entityId,
        sourceKind: "player_projectile",
        sourceEntityId: projectile.entityId,
        amount: 25
      })
    ]);
    expect(collision.consumedPlayerProjectileIds).toEqual([projectile.entityId]);

    const damageResult = applyDamageEvents({
      players: [],
      enemies: [enemy],
      damageEvents: collision.damageEvents
    });
    expect(damageResult.enemies).toEqual([]);
    expect(damageResult.killedEnemies).toEqual([
      expect.objectContaining({
        enemyId: "enemy_mountain_imp",
        position: { x: 804, y: 403 },
        dropTableId: "drop_mountain_imp"
      })
    ]);

    const pickups = materializeDrops({
      frame: 18,
      killedEnemies: damageResult.killedEnemies,
      dropTables: DROP_TABLES,
      dropRolls: { drop_mountain_imp: [0.1, 0.1] }
    });

    expect(pickups.map((pickup) => pickup.pickupId)).toEqual(["orb_insight_small", "orb_qi_tiny"]);
    expect(pickups.map((pickup) => pickup.amount)).toEqual([6, 3]);
    expect(pickups.map((pickup) => pickup.position)).toEqual([
      { x: 804, y: 403 },
      { x: 816, y: 403 }
    ]);
  });

  it("applies enemy projectile and contact damage to players", () => {
    const p1 = createPickupPlayer("p1", { x: 700, y: 900 }, 100, 20);
    const p2 = createPickupPlayer("p2", { x: 960, y: 900 }, 100, 20);
    const enemyProjectile: EnemyProjectileState = {
      entityId: 101,
      ownerKind: "enemy",
      ownerId: "enemy_rogue_cultivator_shadow",
      position: { x: 700, y: 900 },
      velocity: { x: 0, y: 240 },
      damage: 12,
      radius: 6,
      spawnFrame: 20
    };
    const enemyManager = new EnemyManager();
    const wolf = enemyManager.spawnEnemy({
      enemyDefinition: {
        id: "enemy_wolf_demon",
        hp: 34,
        speed: 170,
        contactDamage: 14,
        behaviorId: "charge_nearest_player",
        behaviorParams: { chargeSpeed: 310 },
        tags: ["normal"]
      },
      position: { x: 960, y: 904 },
      spawnFrame: 0,
      sourceSegmentId: "stage_01_01",
      sourceWaveIndex: 0,
      sourceGroupIndex: 0,
      spawnIndex: 0
    });

    const collision = resolveCollisionFrame({
      frame: 21,
      players: [p1, p2],
      enemies: [wolf],
      playerProjectiles: [],
      enemyProjectiles: [enemyProjectile]
    });

    expect(collision.damageEvents).toEqual([
      expect.objectContaining({
        targetKind: "player",
        targetPlayerId: "p1",
        sourceKind: "enemy_projectile",
        amount: 12
      }),
      expect.objectContaining({
        targetKind: "player",
        targetPlayerId: "p2",
        sourceKind: "contact",
        amount: 14
      })
    ]);
    expect(collision.consumedEnemyProjectileIds).toEqual([101]);

    const damageResult = applyDamageEvents({
      players: [p1, p2],
      enemies: [wolf],
      damageEvents: collision.damageEvents
    });

    expect(damageResult.players.find((player) => player.playerId === "p1")?.hp).toBe(88);
    expect(damageResult.players.find((player) => player.playerId === "p2")?.hp).toBe(86);
  });

  it("picks up insight for TeamInsight only and qi with 30 percent co-op echo", () => {
    const p1 = createPickupPlayer("p1", { x: 800, y: 800 }, 100, 10);
    const p2 = createPickupPlayer("p2", { x: 1100, y: 820 }, 100, 20);
    const teamInsight: PickupTeamInsightState = {
      level: 1,
      exp: 10,
      expToNext: 160,
      sharedFortuneReroll: 0
    };

    const result = applyPickupFrame({
      players: [p1, p2],
      teamInsightExp: teamInsight,
      pickups: [
        {
          entityId: 1,
          pickupId: "orb_insight_small",
          type: "insight_exp_orb",
          amount: 6,
          position: { x: 830, y: 800 },
          spawnFrame: 18
        },
        {
          entityId: 2,
          pickupId: "orb_qi_tiny",
          type: "qi_orb",
          amount: 10,
          position: { x: 820, y: 800 },
          spawnFrame: 18
        },
        {
          entityId: 3,
          pickupId: "cultivation_earth_essence",
          type: "cultivation_material",
          amount: 35,
          position: { x: 830, y: 800 },
          spawnFrame: 18
        }
      ]
    });

    expect(result.teamInsightExp.exp).toBe(16);
    expect(result.players.find((player) => player.playerId === "p1")?.qi).toBe(20);
    expect(result.players.find((player) => player.playerId === "p2")?.qi).toBe(23);
    expect(result.playerCultivationGains).toEqual([{ playerId: "p1", amount: 35, pickupId: "cultivation_earth_essence" }]);
    expect(result.collectedPickupIds).toEqual([1, 2, 3]);
    expect(result.remainingPickups).toEqual([]);
  });
});

function createPickupPlayer(
  playerId: string,
  position: { readonly x: number; readonly y: number },
  hp: number,
  qi: number
): PickupPlayerState {
  return {
    ...createCombatPlayer({
      playerId,
      natalArtifactId: "artifact_qingshuang_sword",
      position,
      hp,
      qi
    }),
    pickupRadius: 90
  };
}
