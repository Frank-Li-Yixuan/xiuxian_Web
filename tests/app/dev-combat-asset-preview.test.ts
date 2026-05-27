import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Dev2dAssetsScreen } from "../../src/app/screens/Dev2dAssetsScreen";
import { DevAudioAssetsScreen } from "../../src/app/screens/DevAudioAssetsScreen";
import { Combat2dAssetRegistry, CombatAudioAssetRegistry, type Combat2dManifest, type CombatAudioManifest } from "../../src/assets/CombatAssetRegistry";

describe("dev combat asset preview pages", () => {
  it("routes /dev/2d-assets and /dev/audio-assets through the React entrypoint", () => {
    const mainSource = readFileSync("src/app/main.tsx", "utf8");

    expect(mainSource).toContain("/dev/2d-assets");
    expect(mainSource).toContain("Dev2dAssetsScreen");
    expect(mainSource).toContain("/dev/audio-assets");
    expect(mainSource).toContain("DevAudioAssetsScreen");
  });

  it("renders grouped 2D assets, sprite metadata, source metadata, and missing placeholders", () => {
    const registry = new Combat2dAssetRegistry(create2dManifest());

    const markup = renderToStaticMarkup(createElement(Dev2dAssetsScreen, { registry, initialAssetId: "vfx.explosion.small_01" }));

    expect(markup).toContain("dev-2d-assets-screen");
    expect(markup).toContain("2D Combat Assets");
    expect(markup).toContain("explosion");
    expect(markup).toContain("vfx.explosion.small_01");
    expect(markup).toContain("frameWidth");
    expect(markup).toContain("frameCount");
    expect(markup).toContain("screen");
    expect(markup).toContain("OpenGameArt");
    expect(markup).toContain("CC0");
    expect(markup).toContain("Dark");

    const plannedMarkup = renderToStaticMarkup(createElement(Dev2dAssetsScreen, { registry, initialAssetId: "vfx.missing.planned" }));

    expect(plannedMarkup).toContain("Missing asset placeholder");
  });

  it("renders grouped audio assets, controls, playback metadata, and attribution warnings", () => {
    const registry = new CombatAudioAssetRegistry(createAudioManifest());

    const markup = renderToStaticMarkup(createElement(DevAudioAssetsScreen, { enablePlayback: false, registry, initialAssetId: "sfx.spell.cc_by_01" }));

    expect(markup).toContain("dev-audio-assets-screen");
    expect(markup).toContain("Audio Combat Assets");
    expect(markup).toContain("spells");
    expect(markup).toContain("sfx.spell.cc_by_01");
    expect(markup).toContain("Play");
    expect(markup).toContain("Stop");
    expect(markup).toContain("Mix Group Controls");
    expect(markup).toContain("Mute spells");
    expect(markup).toContain("Volume");
    expect(markup).toContain("Cooldown");
    expect(markup).toContain("Max Instances");
    expect(markup).toContain("1.20 s");
    expect(markup).toContain("CC-BY attribution required");
    expect(markup).toContain("Test CC-BY Source");
  });
});

function create2dManifest(): Combat2dManifest {
  return {
    version: "0.1",
    namespace: "assets.2d.combat",
    root: "/assets/2d/",
    assets: {
      "projectile.player_energy_01": visualAsset({
        path: "/assets/2d/combat/bullets/player_energy_01.png",
        type: "image",
        category: "projectile",
        sourceName: "Kenney"
      }),
      "vfx.explosion.small_01": visualAsset({
        path: "/assets/2d/combat/vfx/explosion_small_01.png",
        type: "spriteSheet",
        category: "explosion",
        sourceName: "OpenGameArt",
        frameWidth: 100,
        frameHeight: 100,
        frameCount: 50,
        fps: 24,
        loop: false,
        blendMode: "screen",
        anchor: { x: 0.5, y: 0.5 },
        recommendedScale: 1
      }),
      "vfx.missing.planned": visualAsset({
        path: "/assets/2d/combat/vfx/missing.png",
        type: "spriteSheet",
        category: "missing",
        planned: true,
        required: false,
        frameWidth: 64,
        frameHeight: 64,
        frameCount: 8,
        fps: 12,
        notes: "Planned placeholder fixture."
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
      "sfx.hit.enemy_light_01": audioAsset({
        path: "/assets/audio/combat/hit_enemy_light_01.ogg",
        category: "hit",
        mixGroup: "combat",
        sourceName: "Kenney Impact Sounds",
        durationMs: 240
      }),
      "sfx.spell.cc_by_01": audioAsset({
        path: "/assets/audio/spells/cc_by_01.ogg",
        category: "spell",
        mixGroup: "spells",
        sourceName: "Test CC-BY Source",
        author: "Attribution Author",
        license: "CC-BY",
        attributionRequired: true,
        durationMs: 1200,
        volume: 0.7,
        cooldownMs: 250,
        maxInstances: 2
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
