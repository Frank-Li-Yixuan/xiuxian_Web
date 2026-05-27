import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const INSPECTOR_PATH = join(process.cwd(), "scripts/inspect-3d-assets.mjs");
const REPORT_PATH = join(process.cwd(), "public/assets/3d/asset_inspection_report.v0.1.json");

describe("3D combat asset inspection", () => {
  it("inspects the current repo manifest and emits a v0.1 report", () => {
    const result = runInspector(process.cwd());

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("3D asset inspection complete");
    expect(existsSync(REPORT_PATH)).toBe(true);

    const report = readReport(process.cwd());
    expect(report.version).toBe("0.1");
    expect(report.namespace).toBe("assets.3d.combat.inspection");
    expect(report.assets.length).toBeGreaterThan(0);
  });

  it("marks a minimal bounded glTF fixture as runtime-ready", () => {
    withTempProject((projectRoot) => {
      const assetDir = join(projectRoot, "public/assets/3d/combat/pickups/pickup.readyOrb");
      mkdirSync(assetDir, { recursive: true });
      writeFileSync(join(assetDir, "ready_orb.gltf"), JSON.stringify(makeGltf({ max: [1, 2, 3] })), "utf8");
      writeManifest(projectRoot, [
        makeAsset({
          id: "pickup.readyOrb",
          path: "/assets/3d/combat/pickups/pickup.readyOrb/ready_orb.gltf"
        })
      ]);

      const result = runInspector(projectRoot);
      const report = readReport(projectRoot);
      const asset = report.assets[0];

      expect(result.status).toBe(0);
      expect(asset.nodeCount).toBe(1);
      expect(asset.meshCount).toBe(1);
      expect(asset.visibleMeshNodeCount).toBe(1);
      expect(asset.boundingBox.available).toBe(true);
      expect(asset.boundingBox.size).toEqual({ x: 1, y: 2, z: 3 });
      expect(asset.normalization.runtimeReady).toBe(true);
      expect(asset.normalization.recommendedScale).toEqual({ x: 0.3333, y: 0.3333, z: 0.3333 });
    });
  });

  it("reports planned missing assets without crashing", () => {
    withTempProject((projectRoot) => {
      writeManifest(projectRoot, [
        makeAsset({
          id: "enemy.plannedImp",
          category: "enemy",
          path: "/assets/3d/combat/enemies/enemy.plannedImp/planned_imp.gltf",
          planned: true,
          required: false,
          pipelineStatus: "planned"
        })
      ]);

      const result = runInspector(projectRoot);
      const asset = readReport(projectRoot).assets[0];

      expect(result.status).toBe(0);
      expect(asset.skipped).toBe(true);
      expect(asset.fileExists).toBe(false);
      expect(asset.normalization.runtimeReady).toBe(false);
      expect(asset.normalization.reason).toContain("planned");
    });
  });

  it("marks a glTF with a missing external image as not runtime-ready", () => {
    withTempProject((projectRoot) => {
      const assetDir = join(projectRoot, "public/assets/3d/combat/artifacts/artifact.missingTexture");
      mkdirSync(assetDir, { recursive: true });
      writeFileSync(
        join(assetDir, "missing_texture.gltf"),
        JSON.stringify(makeGltf({ images: [{ uri: "missing.png" }], textures: [{ source: 0 }] })),
        "utf8"
      );
      writeManifest(projectRoot, [
        makeAsset({
          id: "artifact.missingTexture",
          category: "artifact",
          path: "/assets/3d/combat/artifacts/artifact.missingTexture/missing_texture.gltf"
        })
      ]);

      const result = runInspector(projectRoot);
      const asset = readReport(projectRoot).assets[0];

      expect(result.status).toBe(0);
      expect(asset.externalTextures).toEqual(["missing.png"]);
      expect(asset.missingExternalTextures).toEqual(["missing.png"]);
      expect(asset.normalization.runtimeReady).toBe(false);
      expect(asset.normalization.reason).toContain("missing external references");
    });
  });

  it("marks meshless glTF files as not runtime-ready", () => {
    withTempProject((projectRoot) => {
      const assetDir = join(projectRoot, "public/assets/3d/combat/bosses/boss.meshless");
      mkdirSync(assetDir, { recursive: true });
      writeFileSync(join(assetDir, "meshless.gltf"), JSON.stringify({ asset: { version: "2.0" }, scenes: [{ nodes: [] }], scene: 0 }), "utf8");
      writeManifest(projectRoot, [
        makeAsset({
          id: "boss.meshless",
          category: "boss",
          path: "/assets/3d/combat/bosses/boss.meshless/meshless.gltf"
        })
      ]);

      const result = runInspector(projectRoot);
      const asset = readReport(projectRoot).assets[0];

      expect(result.status).toBe(0);
      expect(asset.meshCount).toBe(0);
      expect(asset.normalization.runtimeReady).toBe(false);
      expect(asset.normalization.reason).toContain("no visible mesh");
    });
  });

  it("warns for tiny and huge bounding boxes while still writing the report", () => {
    withTempProject((projectRoot) => {
      const tinyDir = join(projectRoot, "public/assets/3d/combat/pickups/pickup.tiny");
      const hugeDir = join(projectRoot, "public/assets/3d/combat/bosses/boss.huge");
      mkdirSync(tinyDir, { recursive: true });
      mkdirSync(hugeDir, { recursive: true });
      writeFileSync(join(tinyDir, "tiny.gltf"), JSON.stringify(makeGltf({ max: [0.001, 0.001, 0.001] })), "utf8");
      writeFileSync(join(hugeDir, "huge.gltf"), JSON.stringify(makeGltf({ max: [200, 1, 1] })), "utf8");
      writeManifest(projectRoot, [
        makeAsset({
          id: "pickup.tiny",
          category: "pickup",
          path: "/assets/3d/combat/pickups/pickup.tiny/tiny.gltf"
        }),
        makeAsset({
          id: "boss.huge",
          category: "boss",
          path: "/assets/3d/combat/bosses/boss.huge/huge.gltf"
        })
      ]);

      const result = runInspector(projectRoot);
      const report = readReport(projectRoot);

      expect(result.status).toBe(0);
      expect(report.assets[0].warnings.join("\n")).toContain("extremely tiny");
      expect(report.assets[1].warnings.join("\n")).toContain("extremely large");
      expect(report.summary.warnings).toBeGreaterThanOrEqual(2);
    });
  });
});

function withTempProject(callback: (projectRoot: string) => void): void {
  const projectRoot = mkdtempSync(join(tmpdir(), "xiuxian-3d-inspector-"));
  try {
    callback(projectRoot);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
}

function runInspector(projectRoot: string): { readonly status: number | null; readonly stdout: string; readonly stderr: string } {
  const result = spawnSync(process.execPath, [INSPECTOR_PATH], {
    cwd: projectRoot,
    encoding: "utf8"
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr
  };
}

function readReport(projectRoot: string): any {
  return JSON.parse(readFileSync(join(projectRoot, "public/assets/3d/asset_inspection_report.v0.1.json"), "utf8"));
}

function writeManifest(projectRoot: string, assets: readonly unknown[]): void {
  const manifestPath = join(projectRoot, "public/assets/3d/manifest.v0.1.json");
  mkdirSync(join(projectRoot, "public/assets/3d"), { recursive: true });
  writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        version: "0.1",
        namespace: "assets.3d.combat",
        root: "/assets/3d/",
        assets
      },
      null,
      2
    )}\n`,
    "utf8"
  );
}

function makeAsset(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    id: "pickup.test",
    displayName: "Test Asset",
    category: "pickup",
    path: "/assets/3d/combat/pickups/pickup.test/test.gltf",
    format: "gltf",
    sourceName: "Kenney",
    sourceUrl: "https://kenney.nl/assets/prototype-kit",
    author: "Kenney",
    license: "CC0",
    attributionRequired: false,
    downloadDate: "2026-05-26",
    originalFileName: "test.gltf",
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

function makeGltf(options: {
  readonly min?: readonly [number, number, number];
  readonly max?: readonly [number, number, number];
  readonly images?: readonly Record<string, unknown>[];
  readonly textures?: readonly Record<string, unknown>[];
} = {}): Record<string, unknown> {
  return {
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0 }
          }
        ]
      }
    ],
    accessors: [
      {
        componentType: 5126,
        count: 3,
        type: "VEC3",
        min: options.min ?? [0, 0, 0],
        max: options.max ?? [1, 1, 1]
      }
    ],
    images: options.images ?? [],
    textures: options.textures ?? []
  };
}
