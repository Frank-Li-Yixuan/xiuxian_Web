import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CHARACTER_CREATION_UI_MANIFEST_URL,
  CHARACTER_CREATION_UI_REQUIRED_IDS,
  configureUiAssetManifest,
  getUiAsset,
  preloadUiAssets,
  validateRequiredUiAssets,
  type UiAssetManifest
} from "../../src/assets/UiAssetRegistry";

const MANIFEST_PATH = join(process.cwd(), "public/assets/generated/ui/character_creation_manifest.v0.1.json");
const FATE_ALTAR_CC_IDS = [
  "cc.blackMeditationSilhouette",
  "cc.fateAltarDisc",
  "cc.fateAltarDiscActive",
  "cc.rootAura.metal",
  "cc.rootAura.wood",
  "cc.rootAura.water",
  "cc.rootAura.fire",
  "cc.rootAura.earth",
  "cc.rootAura.thunder",
  "cc.rootAura.yin",
  "cc.rootAura.mixed"
] as const;

describe("character creation UI asset registry", () => {
  it("ships the character creation manifest with every required local PNG asset", () => {
    const manifest = readManifest();

    expect(CHARACTER_CREATION_UI_MANIFEST_URL).toBe("/assets/generated/ui/character_creation_manifest.v0.1.json");
    expect(manifest.version).toBe("0.1");
    expect(manifest.namespace).toBe("ui.character_creation");
    expect(CHARACTER_CREATION_UI_REQUIRED_IDS).toEqual(expect.arrayContaining([...FATE_ALTAR_CC_IDS]));
    expect(() => validateRequiredUiAssets(manifest)).not.toThrow();

    for (const assetId of CHARACTER_CREATION_UI_REQUIRED_IDS) {
      const entry = manifest.assets[assetId];
      expect(entry, assetId).toBeDefined();
      expect(entry?.required, assetId).toBe(true);
      expect(entry?.path, assetId).toMatch(/^\/assets\/generated\/ui\/(common|character_creation)\//);
      expect(entry?.path, assetId).toMatch(/\.png$/);
      expect(entry?.path, assetId).not.toMatch(/https?:\/\/|cdn|fonts\.googleapis|@font-face/i);
      expect(existsSync(join(process.cwd(), "public", entry?.path.replace(/^\//, "") ?? "")), assetId).toBe(true);
    }
  });

  it("fails validation when a required asset id is missing", () => {
    const manifest = readManifest();
    const { ["cc.mainPanel"]: _removed, ...assets } = manifest.assets;
    const brokenManifest: UiAssetManifest = {
      ...manifest,
      assets
    };

    expect(() => validateRequiredUiAssets(brokenManifest)).toThrow(/cc\.mainPanel/);
  });

  it("returns assets from the configured registry by id", () => {
    const manifest = readManifest();
    configureUiAssetManifest(manifest);

    expect(getUiAsset("cc.mainPanel").path).toBe("/assets/generated/ui/character_creation/character_creation_main_panel.png");
    expect(getUiAsset("common.close.hover").path).toBe("/assets/generated/ui/common/close_button_hover.png");
  });

  it("preloads required assets through an injectable loader", async () => {
    const manifest = readManifest();

    const preloaded = await preloadUiAssets(manifest, async (path, id) => ({ id, path }));

    expect(preloaded.size).toBe(CHARACTER_CREATION_UI_REQUIRED_IDS.length);
    expect(preloaded.get("cc.reroll.normal")).toEqual({
      id: "cc.reroll.normal",
      path: "/assets/generated/ui/character_creation/reroll_fate_button_normal.png"
    });
  });
});

function readManifest(): UiAssetManifest {
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as UiAssetManifest;
}
