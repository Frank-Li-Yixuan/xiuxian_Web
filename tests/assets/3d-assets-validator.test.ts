import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

interface Combat3dAssetManifest {
  readonly version: string;
  readonly namespace: string;
  readonly root: string;
  readonly assets: readonly unknown[];
}

const MANIFEST_PATH = join(process.cwd(), "public/assets/3d/manifest.v0.1.json");
const VALIDATOR_PATH = join(process.cwd(), "scripts/validate-3d-assets.mjs");

describe("3D combat asset manifest validation", () => {
  it("ships a v0.1 combat asset manifest with a local asset root", () => {
    expect(existsSync(MANIFEST_PATH)).toBe(true);
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Combat3dAssetManifest;

    expect(manifest.version).toBe("0.1");
    expect(manifest.namespace).toBe("assets.3d.combat");
    expect(manifest.root).toBe("/assets/3d/");
    expect(Array.isArray(manifest.assets)).toBe(true);
  });

  it("validates the current 3D asset manifest through the CLI", () => {
    const output = execFileSync(process.execPath, [VALIDATOR_PATH], {
      cwd: process.cwd(),
      encoding: "utf8"
    });

    expect(output).toContain("3D asset manifest OK");
    expect(output).toContain("Assets: 8");
    expect(output).toContain("player: 1");
    expect(output).toContain("artifact: 1");
    expect(output).toContain("enemy: 4");
    expect(output).toContain("pickup: 1");
    expect(output).toContain("boss: 1");
    expect(output).toContain("environment: 0");
  });

  it("allows an empty intake manifest before assets are downloaded", () => {
    withTempProject((projectRoot) => {
      writeManifest(projectRoot, []);

      const result = runValidator(projectRoot);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("3D asset manifest OK");
      expect(result.stdout).toContain("Assets: 0");
    });
  });

  it("allows planned Quaternius or Kenney entries to reference files that are not downloaded yet", () => {
    withTempProject((projectRoot) => {
      writeManifest(projectRoot, [
        makeAsset({
          id: "enemy.plannedImp",
          category: "enemy",
          sourceName: "Quaternius",
          path: "/assets/3d/combat/enemies/enemy.plannedImp/planned_imp.glb",
          planned: true,
          required: false,
          pipelineStatus: "planned"
        })
      ]);

      const result = runValidator(projectRoot);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("3D asset manifest OK");
      expect(result.stdout).toContain("enemy: 1");
    });
  });

  it("fails third-party asset entries that are not sourced from Quaternius or Kenney", () => {
    withTempProject((projectRoot) => {
      writeManifest(projectRoot, [
        makeAsset({
          id: "enemy.untrusted",
          category: "enemy",
          sourceName: "Example Asset Store",
          sourceUrl: "https://example.com/untrusted.glb",
          path: "/assets/3d/combat/enemies/enemy.untrusted/untrusted.glb",
          planned: true,
          required: false,
          pipelineStatus: "planned"
        })
      ]);

      const result = runValidator(projectRoot);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("sourceName must be Quaternius or Kenney");
    });
  });

  it("warns for FBX/OBJ entries that need conversion without failing validation", () => {
    withTempProject((projectRoot) => {
      writeManifest(projectRoot, [
        makeAsset({
          id: "artifact.sourceSword",
          category: "artifact",
          sourceName: "Kenney",
          path: "/assets/3d/combat/artifacts/artifact.sourceSword/source_sword.fbx",
          format: "fbx",
          planned: true,
          required: false,
          pipelineStatus: "needs_conversion",
          notes: "needs_conversion: source FBX retained until a GLB export is available."
        })
      ]);

      const result = runValidator(projectRoot);

      expect(result.status).toBe(0);
      expect(result.stderr).toContain("needs conversion before runtime use");
    });
  });

  it("warns when an asset folder exceeds the size budget without failing validation", () => {
    withTempProject((projectRoot) => {
      const assetDir = join(projectRoot, "public/assets/3d/combat/pickups/pickup.largeOrb");
      mkdirSync(assetDir, { recursive: true });
      writeFileSync(join(assetDir, "large_orb.glb"), Buffer.alloc(21 * 1024 * 1024));
      writeManifest(projectRoot, [
        makeAsset({
          id: "pickup.largeOrb",
          category: "pickup",
          sourceName: "Kenney",
          path: "/assets/3d/combat/pickups/pickup.largeOrb/large_orb.glb"
        })
      ]);

      const result = runValidator(projectRoot);

      expect(result.status).toBe(0);
      expect(result.stderr).toContain("asset folder exceeds 20 MB");
    });
  });

  it("warns when a texture exceeds 2048 pixels on either axis without failing validation", () => {
    withTempProject((projectRoot) => {
      const assetDir = join(projectRoot, "public/assets/3d/combat/bosses/boss.largeTexture");
      mkdirSync(assetDir, { recursive: true });
      writeFileSync(join(assetDir, "boss.glb"), Buffer.from("glb-placeholder"));
      writeFileSync(join(assetDir, "texture.png"), makePngHeader(2049, 16));
      writeManifest(projectRoot, [
        makeAsset({
          id: "boss.largeTexture",
          category: "boss",
          sourceName: "Quaternius",
          path: "/assets/3d/combat/bosses/boss.largeTexture/boss.glb"
        })
      ]);

      const result = runValidator(projectRoot);

      expect(result.status).toBe(0);
      expect(result.stderr).toContain("texture exceeds 2048px");
    });
  });
});

function withTempProject(callback: (projectRoot: string) => void): void {
  const projectRoot = mkdtempSync(join(tmpdir(), "xiuxian-3d-assets-"));
  try {
    callback(projectRoot);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
}

function runValidator(projectRoot: string): { readonly status: number | null; readonly stdout: string; readonly stderr: string } {
  const result = spawnSync(process.execPath, [VALIDATOR_PATH], {
    cwd: projectRoot,
    encoding: "utf8"
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr
  };
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
    path: "/assets/3d/combat/pickups/pickup.test/test.glb",
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

function makePngHeader(width: number, height: number): Buffer {
  const bytes = Buffer.alloc(33);
  bytes.writeUInt32BE(0x89504e47, 0);
  bytes.writeUInt32BE(0x0d0a1a0a, 4);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  bytes[24] = 8;
  bytes[25] = 6;
  bytes[26] = 0;
  bytes[27] = 0;
  bytes[28] = 0;
  return bytes;
}
