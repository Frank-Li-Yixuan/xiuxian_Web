import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  Dev3dAssetsScreen,
  computePreviewCameraPose,
  preparePreviewObjectForTransforms,
  scaleBoundingBoxForPreview
} from "../../src/app/screens/Dev3dAssetsScreen";
import {
  ThreeAssetRegistry,
  type ThreeAssetInspectionAsset,
  type ThreeAssetInspectionReport,
  type ThreeAssetManifest
} from "../../src/assets/ThreeAssetRegistry";

type InspectionOverrides = Partial<ThreeAssetInspectionAsset> & {
  readonly reason?: string;
  readonly runtimeReady?: boolean;
};

describe("dev 3D asset preview page", () => {
  it("renders the asset list, metadata, warnings, and animation names", () => {
    const registry = new ThreeAssetRegistry(createManifest(), createInspectionReport());

    const markup = renderToStaticMarkup(createElement(Dev3dAssetsScreen, { registry, enableViewer: false, initialAssetId: "enemy.smallImp" }));

    expect(markup).toContain("dev-3d-assets-screen");
    expect(markup).toContain("enemy.smallImp");
    expect(markup).toContain("artifact.sword");
    expect(markup).toContain("Small Imp Placeholder");
    expect(markup).toContain("Quaternius");
    expect(markup).toContain("CC0");
    expect(markup).toContain("208.8 KB");
    expect(markup).toContain("runtimeReady");
    expect(markup).toContain("Idle");
    expect(markup).toContain("Walk");
    expect(markup).toContain("Bounding Box");
  });

  it("renders fallback status for non-runtime-ready assets", () => {
    const registry = new ThreeAssetRegistry(createManifest(), createInspectionReport());

    const markup = renderToStaticMarkup(createElement(Dev3dAssetsScreen, { registry, enableViewer: false, initialAssetId: "artifact.sword" }));

    expect(markup).toContain("Fallback preview");
    expect(markup).toContain("missing external texture references: Textures/colormap.png");
    expect(markup).toContain("missing external references");
  });

  it("routes /dev/3d-assets through the React entrypoint", () => {
    const mainSource = readFileSync("src/app/main.tsx", "utf8");

    expect(mainSource).toContain("/dev/3d-assets");
    expect(mainSource).toContain("Dev3dAssetsScreen");
  });

  it("orbits the preview camera when the view rotation changes", () => {
    const boundingBox = inspectionAsset({}).boundingBox;

    const front = computePreviewCameraPose(boundingBox, 0);
    const side = computePreviewCameraPose(boundingBox, Math.PI / 2);

    expect(front.target).toEqual({ x: 0.5, y: 0.5, z: 0.5 });
    expect(front.position.x).toBeCloseTo(0.5);
    expect(front.position.z).toBeGreaterThan(front.target.z);
    expect(side.position.x).toBeGreaterThan(side.target.x);
    expect(side.position.z).toBeCloseTo(side.target.z);
  });

  it("scales inspection bounds to match the displayed manifest scale", () => {
    const boundingBox = inspectionAsset({}).boundingBox;

    const scaled = scaleBoundingBoxForPreview(boundingBox, { x: 0.5, y: 2, z: 3 });

    expect(scaled?.min).toEqual({ x: 0, y: 0, z: 0 });
    expect(scaled?.max).toEqual({ x: 0.5, y: 2, z: 3 });
    expect(scaled?.size).toEqual({ x: 0.5, y: 2, z: 3 });
    expect(scaled?.maxDimension).toBe(3);
  });

  it("enables transform updates on loaded preview objects", () => {
    const scene = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    scene.matrixAutoUpdate = false;
    scene.matrixWorldAutoUpdate = false;
    mesh.matrixAutoUpdate = false;
    mesh.matrixWorldAutoUpdate = false;
    scene.add(mesh);

    preparePreviewObjectForTransforms(scene);

    expect(scene.matrixAutoUpdate).toBe(true);
    expect(scene.matrixWorldAutoUpdate).toBe(true);
    expect(mesh.matrixAutoUpdate).toBe(true);
    expect(mesh.matrixWorldAutoUpdate).toBe(true);
  });
});

function createManifest(): ThreeAssetManifest {
  return {
    version: "0.1",
    namespace: "assets.3d.combat",
    root: "/assets/3d/",
    assets: [
      asset({
        id: "artifact.sword",
        category: "artifact",
        displayName: "Qingshuang Sword Placeholder",
        path: "/assets/3d/combat/artifacts/artifact.sword/weapon-sword.glb",
        sourceName: "Kenney",
        author: "Kenney"
      }),
      asset({
        id: "enemy.smallImp",
        category: "enemy",
        displayName: "Small Imp Placeholder",
        path: "/assets/3d/combat/enemies/enemy.smallImp/Orc.gltf",
        sourceName: "Quaternius",
        author: "Quaternius"
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
      total: 2,
      inspected: 2,
      planned: 0,
      runtimeReady: 1,
      needsCleanup: 1,
      warnings: 1,
      errors: 0,
      byCategory: { artifact: 1, enemy: 1 }
    },
    assets: [
      inspectionAsset({
        id: "artifact.sword",
        runtimeReady: false,
        reason: "missing external references",
        fileSizeBytes: 9284,
        warnings: ["missing external texture references: Textures/colormap.png"]
      }),
      inspectionAsset({
        id: "enemy.smallImp",
        runtimeReady: true,
        fileSizeBytes: 213802,
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
      maxDimension: 1
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
