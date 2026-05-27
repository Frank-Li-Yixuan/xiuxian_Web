import { describe, expect, it } from "vitest";

import {
  ThreeAssetRegistry,
  shouldUseFallbackPreview,
  type ThreeAssetInspectionReport,
  type ThreeAssetInspectionAsset,
  type ThreeAssetManifest
} from "../../src/assets/ThreeAssetRegistry";

type InspectionOverrides = Partial<ThreeAssetInspectionAsset> & {
  readonly maxDimension?: number;
  readonly reason?: string;
  readonly runtimeReady?: boolean;
};

describe("ThreeAssetRegistry", () => {
  it("merges manifest and inspection report metadata by id", () => {
    const registry = new ThreeAssetRegistry(createManifest(), createInspectionReport());

    const sword = registry.get("artifact.sword");

    expect(sword.id).toBe("artifact.sword");
    expect(sword.sourceName).toBe("Kenney");
    expect(sword.license).toBe("CC0");
    expect(sword.fileSizeBytes).toBe(9284);
    expect(sword.runtimeReady).toBe(false);
    expect(sword.warnings).toEqual(["missing external texture references: Textures/colormap.png"]);
    expect(sword.animations).toEqual([]);
    expect(sword.boundingBox?.maxDimension).toBe(0.448046);
  });

  it("sorts assets by preview category and id", () => {
    const registry = new ThreeAssetRegistry(createManifest(), createInspectionReport());

    expect(registry.all().map((asset) => asset.id)).toEqual(["player.baseHumanoid", "artifact.sword", "enemy.smallImp"]);
  });

  it("throws for unknown manifest ids", () => {
    const registry = new ThreeAssetRegistry(createManifest(), createInspectionReport());

    expect(() => registry.get("missing.asset")).toThrow("Unknown 3D asset id: missing.asset");
  });

  it("uses fallback previews for missing, invalid, unsupported, or non-runtime-ready assets", () => {
    const registry = new ThreeAssetRegistry(createManifest(), createInspectionReport());

    expect(shouldUseFallbackPreview(registry.get("artifact.sword"))).toBe(true);
    expect(shouldUseFallbackPreview(registry.get("enemy.smallImp"))).toBe(false);
  });
});

function createManifest(): ThreeAssetManifest {
  return {
    version: "0.1",
    namespace: "assets.3d.combat",
    root: "/assets/3d/",
    assets: [
      asset({
        id: "enemy.smallImp",
        category: "enemy",
        path: "/assets/3d/combat/enemies/enemy.smallImp/Orc.gltf",
        sourceName: "Quaternius",
        author: "Quaternius",
        displayName: "Small Imp Placeholder"
      }),
      asset({
        id: "artifact.sword",
        category: "artifact",
        path: "/assets/3d/combat/artifacts/artifact.sword/weapon-sword.glb",
        sourceName: "Kenney",
        author: "Kenney",
        displayName: "Qingshuang Sword Placeholder"
      }),
      asset({
        id: "player.baseHumanoid",
        category: "player",
        path: "/assets/3d/combat/player/player.baseHumanoid/Superhero_Male_FullBody.gltf",
        sourceName: "Quaternius",
        author: "Quaternius",
        displayName: "Base Humanoid Placeholder"
      })
    ]
  };
}

function createInspectionReport(): ThreeAssetInspectionReport {
  return {
    version: "0.1",
    namespace: "assets.3d.combat.inspection",
    generatedAt: "2026-05-26T03:17:35.798Z",
    manifestPath: "public/assets/3d/manifest.v0.1.json",
    summary: {
      total: 3,
      inspected: 3,
      planned: 0,
      runtimeReady: 2,
      needsCleanup: 1,
      warnings: 1,
      errors: 0,
      byCategory: { player: 1, artifact: 1, enemy: 1 }
    },
    assets: [
      inspectionAsset({
        id: "player.baseHumanoid",
        runtimeReady: true,
        fileSizeBytes: 30989,
        maxDimension: 1.858865
      }),
      inspectionAsset({
        id: "artifact.sword",
        runtimeReady: false,
        fileSizeBytes: 9284,
        maxDimension: 0.448046,
        warnings: ["missing external texture references: Textures/colormap.png"],
        reason: "missing external references"
      }),
      inspectionAsset({
        id: "enemy.smallImp",
        runtimeReady: true,
        fileSizeBytes: 213802,
        maxDimension: 2.637699,
        animations: [{ index: 0, name: "Idle" }, { index: 1, name: "Walk" }]
      })
    ]
  };
}

function asset(overrides: Partial<ThreeAssetManifest["assets"][number]>): ThreeAssetManifest["assets"][number] {
  return {
    id: "asset.test",
    displayName: "Test Asset",
    category: "pickup",
    path: "/assets/3d/test.glb",
    format: "glb",
    sourceName: "Kenney",
    sourceUrl: "https://kenney.nl/assets/prototype-kit",
    author: "Kenney",
    license: "CC0",
    attributionRequired: false,
    downloadDate: "2026-05-26",
    originalFileName: "test.glb",
    scale: { x: 1, y: 1, z: 1 },
    rotation: { xDeg: 0, yDeg: 0, zDeg: 0 },
    anchor: { x: 0, y: 0, z: 0 },
    gameplayRole: "test placeholder",
    required: true,
    fallbackPrimitive: "sphere",
    notes: "Test fixture.",
    pipelineStatus: "runtime_ready",
    ...overrides
  };
}

function inspectionAsset(overrides: InspectionOverrides): ThreeAssetInspectionReport["assets"][number] {
  return {
    id: "asset.test",
    displayName: "Test Asset",
    category: "pickup",
    path: "/assets/3d/test.glb",
    format: "glb",
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
    boundingBox: {
      available: true,
      min: { x: 0, y: 0, z: 0 },
      max: { x: 1, y: 1, z: 1 },
      size: { x: 1, y: 1, z: 1 },
      maxDimension: overrides.maxDimension ?? 1
    },
    normalization: {
      recommendedScale: { x: 1, y: 1, z: 1 },
      recommendedRotation: { xDeg: 0, yDeg: 0, zDeg: 0 },
      anchor: "center",
      runtimeReady: overrides.runtimeReady ?? true,
      reason: overrides.reason ?? ""
    },
    warnings: [],
    errors: [],
    ...overrides
  };
}
