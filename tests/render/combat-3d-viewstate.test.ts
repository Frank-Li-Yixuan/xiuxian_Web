import { describe, expect, it } from "vitest";

import {
  buildCombat3dViewState,
  mapEnemyKindToAssetId,
  mapPickupKindToAssetId,
  mapSimToWorld
} from "../../src/render/three/Combat3dViewState";
import {
  ThreeAssetRegistry,
  type ThreeAssetInspectionAsset,
  type ThreeAssetInspectionReport,
  type ThreeAssetManifest
} from "../../src/assets/ThreeAssetRegistry";

describe("Combat3dViewState", () => {
  it("maps sim screen coordinates onto the world x/z plane", () => {
    const screen = { width: 1920, height: 1080 };

    expect(mapSimToWorld({ x: 960, y: 540 }, screen)).toEqual({ x: 0, y: 0, z: 0 });
    expect(mapSimToWorld({ x: 480, y: 540 }, screen).x).toBeLessThan(mapSimToWorld({ x: 1440, y: 540 }, screen).x);
    expect(mapSimToWorld({ x: 960, y: 160 }, screen).z).toBeLessThan(mapSimToWorld({ x: 960, y: 920 }, screen).z);
  });

  it("maps presentation entities to 3D asset ids and fallback status", () => {
    const view = buildCombat3dViewState(createSnapshotInput(), createRegistry());

    expect(view.players[0]).toEqual(
      expect.objectContaining({ playerId: "p1", model: expect.objectContaining({ assetId: "player.baseHumanoid", usesFallback: false }) })
    );
    expect(view.artifacts[0]).toEqual(
      expect.objectContaining({ ownerPlayerId: "p1", model: expect.objectContaining({ assetId: "artifact.sword", usesFallback: true }) })
    );
    expect(view.enemies.map((enemy) => enemy.model.assetId)).toEqual(["enemy.smallImp", "enemy.wolfBeast", "enemy.stoneGolem"]);
    expect(view.pickups[0]).toEqual(expect.objectContaining({ model: expect.objectContaining({ assetId: "pickup.qiOrb", usesFallback: true }) }));
    expect(view.boss).toEqual(expect.objectContaining({ model: expect.objectContaining({ assetId: "boss.floatingCrystal", usesFallback: false }) }));
    expect(view.metrics.activeBullets).toBe(2);
    expect(view.metrics.modelCount).toBe(5);
    expect(view.metrics.fallbackCount).toBe(2);
  });

  it("keeps asset mapping deterministic for known combat render kinds", () => {
    expect(mapEnemyKindToAssetId("mountain_imp")).toBe("enemy.smallImp");
    expect(mapEnemyKindToAssetId("unknown")).toBe("enemy.smallImp");
    expect(mapEnemyKindToAssetId("wolf_demon")).toBe("enemy.wolfBeast");
    expect(mapEnemyKindToAssetId("elite_split_wind_wolf")).toBe("enemy.wolfBeast");
    expect(mapEnemyKindToAssetId("stone_armor_demon")).toBe("enemy.stoneGolem");
    expect(mapPickupKindToAssetId("spirit_exp")).toBe("pickup.qiOrb");
    expect(mapPickupKindToAssetId("qi_orb")).toBe("pickup.qiOrb");
  });

  it("adds render-only stress bullets without mutating the source snapshot", () => {
    const input = createSnapshotInput();
    const before = JSON.stringify(input.presentation);

    const view = buildCombat3dViewState(input, createRegistry(), { stressBulletCount: 1000 });

    expect(view.enemyBullets).toHaveLength(1001);
    expect(view.metrics.activeBullets).toBe(1002);
    expect(JSON.stringify(input.presentation)).toBe(before);
  });
});

function createSnapshotInput() {
  const screen = { width: 1920, height: 1080 };
  return {
    viewState: {
      mode: "combat_boss",
      screen: { ...screen, scale: 1, safeArea: { x: 0, y: 0, width: 1920, height: 1080 } },
      players: [],
      teamInsight: { visible: true, teamLevel: 1, exp: 0, expToNext: 60, progress01: 0, nextTriggerText: "test", sharedFortuneReroll: 2, isReadyToInsight: false },
      stage: { stageName: "Stage", segmentName: "Boss", segmentIndex: 5, segmentCount: 5, intensity: "boss" },
      prompts: []
    },
    presentation: {
      frame: 120,
      screen,
      players: [
        {
          playerId: "p1",
          position: { x: 960, y: 860 },
          renderColor: "player1",
          realmLayer: 9,
          aliveState: "body",
          focusActive: false,
          hpRatio: 0.9,
          qiRatio: 0.7
        }
      ],
      enemies: [
        { entityId: 1, enemyId: "enemy_mountain_imp", renderKind: "mountain_imp", position: { x: 820, y: 300 }, hpRatio: 0.6 },
        { entityId: 2, enemyId: "enemy_wolf", renderKind: "wolf_demon", position: { x: 1060, y: 340 }, hpRatio: 0.8 },
        { entityId: 3, enemyId: "enemy_stone", renderKind: "stone_armor_demon", position: { x: 960, y: 260 }, hpRatio: 1 }
      ],
      playerProjectiles: [
        {
          entityId: 10,
          ownerPlayerId: "p1",
          artifactId: "artifact_qingshuang_sword",
          renderKind: "flying_sword",
          position: { x: 960, y: 620 },
          velocity: { x: 0, y: -520 },
          radius: 6,
          pierce: 1
        }
      ],
      enemyProjectiles: [
        {
          entityId: 20,
          ownerKind: "enemy",
          ownerId: "enemy_mountain_imp",
          renderKind: "enemy_basic",
          position: { x: 900, y: 500 },
          velocity: { x: 0, y: 220 },
          radius: 7
        }
      ],
      pickups: [{ entityId: 30, pickupId: "spirit_exp", position: { x: 1000, y: 420 }, label: "Qi", renderKind: "spirit_exp" }],
      warnings: [],
      visualEvents: [],
      boss: {
        entityId: 40,
        bossId: "boss_qingyun_tribulation_spirit",
        renderKind: "qingyun_tribulation_spirit",
        position: { x: 960, y: 180 },
        hpRatio: 0.75,
        phaseIndex: 1,
        phaseCount: 3,
        status: "active"
      }
    }
  } as const;
}

function createRegistry(): ThreeAssetRegistry {
  return new ThreeAssetRegistry(createManifest(), createInspectionReport());
}

function createManifest(): ThreeAssetManifest {
  return {
    version: "0.1",
    namespace: "assets.3d.combat",
    root: "/assets/3d/",
    assets: [
      asset("player.baseHumanoid", "player"),
      asset("artifact.sword", "artifact"),
      asset("enemy.smallImp", "enemy"),
      asset("enemy.wolfBeast", "enemy"),
      asset("enemy.stoneGolem", "enemy"),
      asset("enemy.insect", "enemy"),
      asset("pickup.qiOrb", "pickup"),
      asset("boss.floatingCrystal", "boss")
    ]
  };
}

function createInspectionReport(): ThreeAssetInspectionReport {
  return {
    version: "0.1",
    namespace: "assets.3d.combat.inspection",
    generatedAt: "2026-05-26T00:00:00.000Z",
    manifestPath: "public/assets/3d/manifest.v0.1.json",
    summary: { total: 8, inspected: 8, planned: 0, runtimeReady: 6, needsCleanup: 2, warnings: 0, errors: 0, byCategory: {} },
    assets: [
      inspection("player.baseHumanoid", true),
      inspection("artifact.sword", false),
      inspection("enemy.smallImp", true),
      inspection("enemy.wolfBeast", true),
      inspection("enemy.stoneGolem", true),
      inspection("enemy.insect", true),
      inspection("pickup.qiOrb", false),
      inspection("boss.floatingCrystal", true)
    ]
  };
}

function asset(id: string, category: ThreeAssetManifest["assets"][number]["category"]): ThreeAssetManifest["assets"][number] {
  return {
    id,
    displayName: id,
    category,
    path: `/assets/3d/${id}.gltf`,
    format: "gltf",
    sourceName: "Quaternius",
    sourceUrl: "https://quaternius.com/",
    author: "Quaternius",
    license: "CC0",
    attributionRequired: false,
    downloadDate: "2026-05-26",
    originalFileName: `${id}.gltf`,
    scale: { x: 1, y: 1, z: 1 },
    rotation: { xDeg: 0, yDeg: 0, zDeg: 0 },
    anchor: { x: 0, y: 0, z: 0 },
    gameplayRole: "test",
    required: true,
    fallbackPrimitive: "box",
    notes: "test",
    pipelineStatus: "runtime_ready"
  };
}

function inspection(id: string, runtimeReady: boolean): ThreeAssetInspectionAsset {
  return {
    id,
    displayName: id,
    category: "enemy",
    path: `/assets/3d/${id}.gltf`,
    format: "gltf",
    pipelineStatus: "runtime_ready",
    planned: false,
    skipped: false,
    fileExists: true,
    fileSizeBytes: 100,
    nodeCount: 1,
    meshCount: 1,
    visibleMeshNodeCount: 1,
    textureCount: 0,
    externalTextures: [],
    missingExternalTextures: [],
    externalBuffers: [],
    missingExternalBuffers: [],
    animations: [],
    boundingBox: { available: true, min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 }, size: { x: 1, y: 1, z: 1 }, maxDimension: 1 },
    normalization: { recommendedScale: { x: 1, y: 1, z: 1 }, recommendedRotation: { xDeg: 0, yDeg: 0, zDeg: 0 }, anchor: "center", runtimeReady, reason: runtimeReady ? "" : "test fallback" },
    warnings: [],
    errors: []
  };
}
