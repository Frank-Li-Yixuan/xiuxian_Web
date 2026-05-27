import { describe, expect, it } from "vitest";

import {
  COMBAT_2D_ASSET_MANIFEST_URL,
  COMBAT_AUDIO_ASSET_MANIFEST_URL,
  Combat2dAssetRegistry,
  CombatAudioAssetRegistry,
  requiresAttribution,
  type Combat2dManifest,
  type CombatAudioManifest
} from "../../src/assets/CombatAssetRegistry";

describe("combat asset preview registries", () => {
  it("uses the public 2D and audio manifest URLs", () => {
    expect(COMBAT_2D_ASSET_MANIFEST_URL).toBe("/assets/2d/manifest.v0.1.json");
    expect(COMBAT_AUDIO_ASSET_MANIFEST_URL).toBe("/assets/audio/manifest.v0.1.json");
  });

  it("merges manifest keys into 2D entry IDs and groups by category", () => {
    const registry = new Combat2dAssetRegistry(create2dManifest());

    expect(registry.all().map((asset) => asset.id)).toEqual(["background.space_dark_01", "vfx.explosion.small_01", "projectile.player_energy_01"]);
    expect(registry.get("vfx.explosion.small_01").frameCount).toBe(50);
    expect(registry.groupByCategory()).toEqual([
      ["background", [expect.objectContaining({ id: "background.space_dark_01" })]],
      ["explosion", [expect.objectContaining({ id: "vfx.explosion.small_01" })]],
      ["projectile", [expect.objectContaining({ id: "projectile.player_energy_01" })]]
    ]);
  });

  it("merges manifest keys into audio entry IDs and groups by mixGroup", () => {
    const registry = new CombatAudioAssetRegistry(createAudioManifest());

    expect(registry.all().map((asset) => asset.id)).toEqual(["sfx.hit.enemy_light_01", "sfx.spell.cast_01"]);
    expect(registry.get("sfx.spell.cast_01").durationMs).toBe(1200);
    expect(registry.groupByMixGroup()).toEqual([
      ["combat", [expect.objectContaining({ id: "sfx.hit.enemy_light_01" })]],
      ["spells", [expect.objectContaining({ id: "sfx.spell.cast_01" })]]
    ]);
  });

  it("detects attribution-required audio assets", () => {
    expect(requiresAttribution(audioAsset({ license: "CC-BY", attributionRequired: true }))).toBe(true);
    expect(requiresAttribution(audioAsset({ license: "CC0", attributionRequired: false }))).toBe(false);
  });

  it("rejects unsupported manifest top-level fields", () => {
    expect(() => new Combat2dAssetRegistry({ ...create2dManifest(), namespace: "wrong.namespace" } as unknown as Combat2dManifest)).toThrow(
      "Unsupported 2D combat asset manifest namespace"
    );
    expect(() => new CombatAudioAssetRegistry({ ...createAudioManifest(), root: "/bad/" } as unknown as CombatAudioManifest)).toThrow(
      "Unsupported audio combat asset manifest root"
    );
    expect(() => new CombatAudioAssetRegistry({ ...createAudioManifest(), assets: [] } as unknown as CombatAudioManifest)).toThrow(
      "audio combat asset manifest assets must be an object map"
    );
  });
});

function create2dManifest(): Combat2dManifest {
  return {
    version: "0.1",
    namespace: "assets.2d.combat",
    root: "/assets/2d/",
    assets: {
      "vfx.explosion.small_01": visualAsset({
        path: "/assets/2d/combat/vfx/explosion_small_01.png",
        type: "spriteSheet",
        category: "explosion",
        frameWidth: 100,
        frameHeight: 100,
        frameCount: 50,
        fps: 24,
        blendMode: "screen"
      }),
      "projectile.player_energy_01": visualAsset({
        path: "/assets/2d/combat/bullets/player_energy_01.png",
        type: "image",
        category: "projectile"
      }),
      "background.space_dark_01": visualAsset({
        path: "/assets/2d/combat/backgrounds/space_dark_01.png",
        type: "parallaxLayer",
        category: "background"
      })
    }
  };
}

function createAudioManifest(): CombatAudioManifest {
  return {
    version: "0.1",
    namespace: "assets.audio.combat",
    root: "/assets/audio/",
    assets: {
      "sfx.spell.cast_01": audioAsset({
        path: "/assets/audio/spells/cast_01.ogg",
        category: "spell",
        mixGroup: "spells",
        durationMs: 1200
      }),
      "sfx.hit.enemy_light_01": audioAsset({
        path: "/assets/audio/combat/hit_enemy_light_01.ogg",
        category: "hit",
        mixGroup: "combat",
        durationMs: 240
      })
    }
  };
}

function visualAsset(overrides: Partial<Combat2dManifest["assets"][string]>): Combat2dManifest["assets"][string] {
  return {
    path: "/assets/2d/test.png",
    type: "image",
    category: "test",
    sourceName: "Test Source",
    sourceUrl: "https://example.com/test",
    author: "Test Author",
    license: "CC0",
    attributionRequired: false,
    downloadDate: "2026-05-26",
    originalFileName: "test.png",
    required: true,
    notes: "Fixture.",
    ...overrides
  };
}

function audioAsset(overrides: Partial<CombatAudioManifest["assets"][string]>): CombatAudioManifest["assets"][string] {
  return {
    path: "/assets/audio/test.ogg",
    category: "test",
    mixGroup: "combat",
    sourceName: "Test Source",
    sourceUrl: "https://example.com/test",
    author: "Test Author",
    license: "CC0",
    attributionRequired: false,
    downloadDate: "2026-05-26",
    originalFileName: "test.ogg",
    durationMs: 100,
    volume: 0.5,
    cooldownMs: 30,
    maxInstances: 4,
    required: true,
    notes: "Fixture.",
    ...overrides
  };
}
