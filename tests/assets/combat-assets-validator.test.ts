import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const VALIDATOR_PATH = join(process.cwd(), "scripts/validate-combat-assets.mjs");
const MANIFEST_2D_PATH = join(process.cwd(), "public/assets/2d/manifest.v0.1.json");
const MANIFEST_AUDIO_PATH = join(process.cwd(), "public/assets/audio/manifest.v0.1.json");

describe("2D and audio combat asset manifest validation", () => {
  it("ships v0.1 intake manifests for 2D and audio assets", () => {
    expect(existsSync(MANIFEST_2D_PATH)).toBe(true);
    expect(existsSync(MANIFEST_AUDIO_PATH)).toBe(true);

    const twoDManifest = JSON.parse(readFileSync(MANIFEST_2D_PATH, "utf8"));
    const audioManifest = JSON.parse(readFileSync(MANIFEST_AUDIO_PATH, "utf8"));

    expect(twoDManifest).toMatchObject({
      version: "0.1",
      namespace: "assets.2d.combat",
      root: "/assets/2d/"
    });
    expect(audioManifest).toMatchObject({
      version: "0.1",
      namespace: "assets.audio.combat",
      root: "/assets/audio/"
    });
    expect(isPlainObject(twoDManifest.assets)).toBe(true);
    expect(isPlainObject(audioManifest.assets)).toBe(true);
  });

  it("exposes the validator through npm scripts", () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));

    expect(packageJson.scripts["validate:combat-assets"]).toBe("node scripts/validate-combat-assets.mjs");
  });

  it("validates the current intake manifests through the CLI", () => {
    const output = execFileSync(process.execPath, [VALIDATOR_PATH], {
      cwd: process.cwd(),
      encoding: "utf8"
    });

    expect(output).toContain("Combat asset manifests OK");
    expect(output).toContain("2D assets: 17");
    expect(output).toContain("Audio assets: 12");
  });

  it("registers the BAS-C002 CC0/Public Domain 2D combat asset intake", () => {
    const manifest = JSON.parse(readFileSync(MANIFEST_2D_PATH, "utf8"));
    const assets = manifest.assets as Record<string, Record<string, unknown>>;

    expect(Object.keys(assets).sort()).toEqual([
      "background.space_dark_01",
      "entity.enemy.elite_split_wind_wolf_01",
      "entity.enemy.mountain_imp_01",
      "entity.enemy.rogue_cultivator_shadow_01",
      "entity.enemy.stone_armor_demon_01",
      "entity.enemy.wolf_demon_01",
      "entity.player.cultivator_01",
      "entity.player.soul_01",
      "pickup.qi_orb_01",
      "pickup.zhenyuan_orb_01",
      "projectile.enemy_danger_01",
      "projectile.player_energy_01",
      "vfx.explosion.small_01",
      "vfx.heal.green_01",
      "vfx.lightning.chain_01",
      "vfx.shield.barrier_01",
      "vfx.slash.sword_01"
    ]);

    for (const [id, asset] of Object.entries(assets)) {
      expect(asset.license, id).toMatch(/^(CC0|Public Domain)$/);
      expect(asset.attributionRequired, id).toBe(false);
      expect(asset.sourceUrl, id).toMatch(/^(https:\/\/|internal:\/\/)/);
    }
  });

  it("registers BAS-C009 baked entity sprite sheets with animation clips and local provenance", () => {
    const manifest = JSON.parse(readFileSync(MANIFEST_2D_PATH, "utf8"));
    const assets = manifest.assets as Record<string, Record<string, unknown>>;
    const entityIds = [
      "entity.player.cultivator_01",
      "entity.player.soul_01",
      "entity.enemy.mountain_imp_01",
      "entity.enemy.wolf_demon_01",
      "entity.enemy.elite_split_wind_wolf_01",
      "entity.enemy.rogue_cultivator_shadow_01",
      "entity.enemy.stone_armor_demon_01"
    ];

    for (const id of entityIds) {
      expect(assets[id], id).toEqual(
        expect.objectContaining({
          type: "spriteSheet",
          license: "CC0",
          attributionRequired: false,
          required: true,
          frameWidth: 128,
          frameHeight: 128,
          sourceUrl: expect.stringMatching(/^internal:\/\/baked\/3d-to-2d\//)
        })
      );
      expect(assets[id]?.path, id).toMatch(/^\/assets\/2d\/combat\/(player|enemies)\/.*\.png$/);
      expect(assets[id]?.animationClips, id).toEqual(
        expect.objectContaining({
          idle: expect.objectContaining({ startFrame: expect.any(Number), frameCount: expect.any(Number), fps: expect.any(Number) }),
          move: expect.objectContaining({ startFrame: expect.any(Number), frameCount: expect.any(Number), fps: expect.any(Number) }),
          attack: expect.objectContaining({ startFrame: expect.any(Number), frameCount: expect.any(Number), fps: expect.any(Number) }),
          hit: expect.objectContaining({ startFrame: expect.any(Number), frameCount: expect.any(Number), fps: expect.any(Number) }),
          death: expect.objectContaining({ startFrame: expect.any(Number), frameCount: expect.any(Number), fps: expect.any(Number) })
        })
      );
    }
  });

  it("registers the BAS-C003 CC0/Public Domain combat audio asset intake", () => {
    const manifest = JSON.parse(readFileSync(MANIFEST_AUDIO_PATH, "utf8"));
    const assets = manifest.assets as Record<string, Record<string, unknown>>;

    expect(Object.keys(assets).sort()).toEqual([
      "ambience.outer_battlefield_loop_01",
      "sfx.artifact.flying_sword_fire_01",
      "sfx.death.enemy_small_burst_01",
      "sfx.explosion.elite_heavy_01",
      "sfx.hit.enemy_light_01",
      "sfx.pickup.qi_orb_01",
      "sfx.pickup.rare_drop_01",
      "sfx.pill.rejuvenation_heal_01",
      "sfx.shield.impact_break_01",
      "sfx.spell.chain_lightning_jump_01",
      "sfx.spell.five_thunder_cast_01",
      "sfx.warning.boss_tribulation_01"
    ]);

    for (const [id, asset] of Object.entries(assets)) {
      expect(asset.license, id).toMatch(/^(CC0|Public Domain)$/);
      expect(asset.attributionRequired, id).toBe(false);
      expect(asset.sourceUrl, id).toMatch(/^https:\/\//);
      expect(asset.path, id).toMatch(/^\/assets\/audio\/.*\.(ogg|wav|mp3)$/);
      expect(asset.durationMs, id).toEqual(expect.any(Number));
      expect(asset.required, id).toBe(true);
    }
  });

  it("accepts schema-complete 2D sprite sheets and audio assets with local files", () => {
    withTempProject((projectRoot) => {
      writeFile(projectRoot, "public/assets/2d/combat/vfx/explosion_small_01.png", "png-placeholder");
      writeFile(projectRoot, "public/assets/audio/combat/hit_enemy_light_01.ogg", "ogg-placeholder");
      write2dManifest(projectRoot, {
        "vfx.explosion.small_01": make2dAsset({
          animationClips: {
            idle: { startFrame: 0, frameCount: 4, fps: 8, loop: true },
            death: { startFrame: 4, frameCount: 4, fps: 12, loop: false }
          }
        })
      });
      writeAudioManifest(projectRoot, {
        "sfx.hit.enemy_light_01": makeAudioAsset()
      });

      const result = runValidator(projectRoot);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Combat asset manifests OK");
    });
  });

  it("allows empty notes fields because notes are optional prose", () => {
    withTempProject((projectRoot) => {
      writeFile(projectRoot, "public/assets/2d/combat/vfx/explosion_small_01.png", "png-placeholder");
      writeFile(projectRoot, "public/assets/audio/combat/hit_enemy_light_01.ogg", "ogg-placeholder");
      write2dManifest(projectRoot, {
        "vfx.explosion.small_01": make2dAsset({ notes: "" })
      });
      writeAudioManifest(projectRoot, {
        "sfx.hit.enemy_light_01": makeAudioAsset({ notes: "" })
      });

      const result = runValidator(projectRoot);

      expect(result.status).toBe(0);
    });
  });

  it("fails required assets whose local files are missing", () => {
    withTempProject((projectRoot) => {
      write2dManifest(projectRoot, {
        "vfx.explosion.small_01": make2dAsset()
      });
      writeAudioManifest(projectRoot, {});

      const result = runValidator(projectRoot);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("required asset file is missing");
    });
  });

  it("allows planned non-required 2D assets whose local files are missing", () => {
    withTempProject((projectRoot) => {
      write2dManifest(projectRoot, {
        "projectile.enemy_danger_01": make2dAsset({
          path: "/assets/2d/combat/bullets/enemy_danger_01.png",
          category: "projectile",
          required: false,
          planned: true,
          notes: "No CC0/Public Domain enemy bullet candidate was accepted in this intake."
        })
      });
      writeAudioManifest(projectRoot, {});

      const result = runValidator(projectRoot);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("2D assets: 1");
    });
  });

  it("allows planned non-required audio assets whose local files are missing", () => {
    withTempProject((projectRoot) => {
      write2dManifest(projectRoot, {});
      writeAudioManifest(projectRoot, {
        "sfx.warning.planned": makeAudioAsset({
          path: "/assets/audio/combat/planned_warning.ogg",
          required: false,
          planned: true,
          notes: "No CC0/Public Domain warning candidate was accepted in this intake."
        })
      });

      const result = runValidator(projectRoot);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Audio assets: 1");
    });
  });

  it("fails assets without sourceUrl, license, or an allowed license", () => {
    withTempProject((projectRoot) => {
      write2dManifest(projectRoot, {
        "vfx.explosion.missing_license": make2dAsset({ license: undefined }),
        "vfx.explosion.missing_source": make2dAsset({ sourceUrl: "" }),
        "vfx.explosion.nc": make2dAsset({ license: "CC-BY-NC" })
      });
      writeAudioManifest(projectRoot, {});

      const result = runValidator(projectRoot);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("license is required");
      expect(result.stderr).toContain("sourceUrl is required");
      expect(result.stderr).toContain('license "CC-BY-NC" is not allowed');
    });
  });

  it("fails spriteSheet assets without frame metadata", () => {
    withTempProject((projectRoot) => {
      write2dManifest(projectRoot, {
        "vfx.explosion.incomplete_sheet": make2dAsset({ fps: undefined })
      });
      writeAudioManifest(projectRoot, {});

      const result = runValidator(projectRoot);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("spriteSheet missing fps");
    });
  });

  it("fails spriteSheet animation clips with incomplete metadata", () => {
    withTempProject((projectRoot) => {
      writeFile(projectRoot, "public/assets/2d/combat/vfx/explosion_small_01.png", "png-placeholder");
      write2dManifest(projectRoot, {
        "vfx.explosion.bad_clip": make2dAsset({
          animationClips: {
            idle: { startFrame: 0, frameCount: 4, loop: true }
          }
        })
      });
      writeAudioManifest(projectRoot, {});

      const result = runValidator(projectRoot);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("animationClips.idle missing fps");
    });
  });

  it("fails audio assets without mix and playback metadata", () => {
    withTempProject((projectRoot) => {
      write2dManifest(projectRoot, {});
      writeAudioManifest(projectRoot, {
        "sfx.hit.incomplete": makeAudioAsset({ mixGroup: undefined, volume: undefined })
      });

      const result = runValidator(projectRoot);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("audio asset missing mixGroup");
      expect(result.stderr).toContain("audio asset missing volume");
    });
  });

  it("fails audio assets with unsupported licenses, extensions, or missing duration", () => {
    withTempProject((projectRoot) => {
      writeFile(projectRoot, "public/assets/audio/combat/hit_enemy_light_01.flac", "flac-placeholder");
      write2dManifest(projectRoot, {});
      writeAudioManifest(projectRoot, {
        "sfx.hit.cc_by": makeAudioAsset({ license: "CC-BY" }),
        "sfx.hit.bad_extension": makeAudioAsset({ path: "/assets/audio/combat/hit_enemy_light_01.flac" }),
        "sfx.hit.missing_duration": makeAudioAsset({ durationMs: undefined })
      });

      const result = runValidator(projectRoot);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('license "CC-BY" is not allowed');
      expect(result.stderr).toContain("path must use one of .ogg, .wav, .mp3");
      expect(result.stderr).toContain("missing required field \"durationMs\"");
      expect(result.stderr).toContain("audio asset missing durationMs");
    });
  });
});

function withTempProject(callback: (projectRoot: string) => void): void {
  const projectRoot = mkdtempSync(join(tmpdir(), "xiuxian-combat-assets-"));
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

function write2dManifest(projectRoot: string, assets: Record<string, unknown>): void {
  writeJson(projectRoot, "public/assets/2d/manifest.v0.1.json", {
    version: "0.1",
    namespace: "assets.2d.combat",
    root: "/assets/2d/",
    assets
  });
}

function writeAudioManifest(projectRoot: string, assets: Record<string, unknown>): void {
  writeJson(projectRoot, "public/assets/audio/manifest.v0.1.json", {
    version: "0.1",
    namespace: "assets.audio.combat",
    root: "/assets/audio/",
    assets
  });
}

function writeJson(projectRoot: string, relativePath: string, value: unknown): void {
  const absolutePath = join(projectRoot, relativePath);
  mkdirSync(join(absolutePath, ".."), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeFile(projectRoot: string, relativePath: string, contents: string): void {
  const absolutePath = join(projectRoot, relativePath);
  mkdirSync(join(absolutePath, ".."), { recursive: true });
  writeFileSync(absolutePath, contents, "utf8");
}

function make2dAsset(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return withoutUndefined({
    path: "/assets/2d/combat/vfx/explosion_small_01.png",
    type: "spriteSheet",
    category: "explosion",
    sourceName: "Internal Placeholder",
    sourceUrl: "internal://placeholder/2d/combat/vfx/explosion_small_01",
    author: "Xiuxian STG Team",
    license: "Internal Placeholder",
    attributionRequired: false,
    downloadDate: "2026-05-26",
    originalFileName: "explosion_small_01.png",
    frameWidth: 128,
    frameHeight: 128,
    frameCount: 16,
    fps: 24,
    loop: false,
    blendMode: "screen",
    anchor: { x: 0.5, y: 0.5 },
    recommendedScale: 1,
    required: true,
    notes: "Test placeholder.",
    ...overrides
  });
}

function makeAudioAsset(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return withoutUndefined({
    path: "/assets/audio/combat/hit_enemy_light_01.ogg",
    category: "hit",
    mixGroup: "combat",
    sourceName: "Test CC0 Fixture",
    sourceUrl: "https://example.com/audio/combat/hit_enemy_light_01",
    author: "Test Fixture Author",
    license: "CC0",
    attributionRequired: false,
    downloadDate: "2026-05-26",
    originalFileName: "hit_enemy_light_01.ogg",
    durationMs: 240,
    volume: 0.55,
    cooldownMs: 35,
    maxInstances: 4,
    required: true,
    notes: "Test placeholder.",
    ...overrides
  });
}

function withoutUndefined(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
