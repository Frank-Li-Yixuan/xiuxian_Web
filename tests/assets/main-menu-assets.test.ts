import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

interface MainMenuAssetManifest {
  readonly version: string;
  readonly namespace: string;
  readonly assets: Readonly<Record<string, MainMenuAssetEntry>>;
}

interface MainMenuAssetEntry {
  readonly path: string;
  readonly type: string;
  readonly required: boolean;
  readonly contentRect?: {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
  };
}

const MANIFEST_PATH = join(process.cwd(), "public/assets/generated/ui/main_menu/manifest.v0.3.json");
const REQUIRED_ASSET_IDS = [
  "mainMenu.background.qingyun",
  "mainMenu.titlePlaque",
  "mainMenu.button.normal",
  "mainMenu.button.hover",
  "mainMenu.button.pressed",
  "mainMenu.button.selected",
  "mainMenu.button.disabled",
  "mainMenu.secondaryButton.normal",
  "mainMenu.secondaryButton.hover",
  "mainMenu.secondaryButton.pressed",
  "mainMenu.secondaryButton.disabled",
  "mainMenu.saveSlot.normal",
  "mainMenu.saveSlot.hover",
  "mainMenu.saveSlot.selected",
  "mainMenu.saveSlot.empty",
  "mainMenu.saveSlot.disabled",
  "mainMenu.dialog.frame",
  "mainMenu.settings.panel",
  "mainMenu.closeButton.normal",
  "mainMenu.closeButton.hover",
  "mainMenu.backButton.normal",
  "mainMenu.backButton.hover"
] as const;

const TEXT_BEARING_ASSET_IDS = [
  "mainMenu.titlePlaque",
  "mainMenu.button.normal",
  "mainMenu.button.hover",
  "mainMenu.button.pressed",
  "mainMenu.button.selected",
  "mainMenu.button.disabled",
  "mainMenu.secondaryButton.normal",
  "mainMenu.secondaryButton.hover",
  "mainMenu.secondaryButton.pressed",
  "mainMenu.secondaryButton.disabled",
  "mainMenu.saveSlot.normal",
  "mainMenu.saveSlot.hover",
  "mainMenu.saveSlot.selected",
  "mainMenu.saveSlot.empty",
  "mainMenu.saveSlot.disabled",
  "mainMenu.dialog.frame",
  "mainMenu.settings.panel",
  "mainMenu.backButton.normal",
  "mainMenu.backButton.hover"
] as const;

describe("main menu generated UI assets", () => {
  it("ships a v0.3 manifest with all required asset ids and local paths", () => {
    const manifest = readManifest();

    expect(manifest.version).toBe("0.3");
    expect(manifest.namespace).toBe("ui.main_menu");

    for (const assetId of REQUIRED_ASSET_IDS) {
      const entry = manifest.assets[assetId];
      expect(entry, assetId).toBeDefined();
      expect(entry?.required, assetId).toBe(true);
      expect(entry?.path, assetId).toMatch(/^\/assets\/generated\/ui\/main_menu\//);
      expect(entry?.path, assetId).not.toMatch(/https?:\/\/|cdn|fonts\.googleapis|@font-face/i);
    }
  });

  it("points every required manifest entry at a non-empty PNG inside public assets", () => {
    const manifest = readManifest();

    for (const assetId of REQUIRED_ASSET_IDS) {
      const entry = manifest.assets[assetId];
      expect(entry, assetId).toBeDefined();
      if (entry === undefined) {
        throw new Error(`Missing ${assetId}`);
      }
      const absolutePath = join(process.cwd(), "public", entry.path.replace(/^\//, ""));

      expect(existsSync(absolutePath), `${assetId} missing ${absolutePath}`).toBe(true);
      const dimensions = readPngDimensions(absolutePath);
      expect(dimensions.width, assetId).toBeGreaterThan(0);
      expect(dimensions.height, assetId).toBeGreaterThan(0);
    }
  });

  it("defines valid text content rectangles for text-bearing controls", () => {
    const manifest = readManifest();

    for (const assetId of TEXT_BEARING_ASSET_IDS) {
      const entry = manifest.assets[assetId];
      expect(entry?.contentRect, assetId).toBeDefined();
      if (entry === undefined) {
        throw new Error(`Missing ${assetId}`);
      }
      const absolutePath = join(process.cwd(), "public", entry.path.replace(/^\//, ""));
      const dimensions = readPngDimensions(absolutePath);
      const rect = entry.contentRect;
      if (rect === undefined) {
        throw new Error(`Missing contentRect for ${assetId}`);
      }

      expect(rect.x, assetId).toBeGreaterThanOrEqual(0);
      expect(rect.y, assetId).toBeGreaterThanOrEqual(0);
      expect(rect.w, assetId).toBeGreaterThan(0);
      expect(rect.h, assetId).toBeGreaterThan(0);
      expect(rect.x + rect.w, assetId).toBeLessThanOrEqual(dimensions.width);
      expect(rect.y + rect.h, assetId).toBeLessThanOrEqual(dimensions.height);
    }
  });

  it("keeps interactive state images in each control family at stable dimensions", () => {
    const manifest = readManifest();
    const groups = [
      [
        "mainMenu.button.normal",
        "mainMenu.button.hover",
        "mainMenu.button.pressed",
        "mainMenu.button.selected",
        "mainMenu.button.disabled"
      ],
      [
        "mainMenu.secondaryButton.normal",
        "mainMenu.secondaryButton.hover",
        "mainMenu.secondaryButton.pressed",
        "mainMenu.secondaryButton.disabled",
        "mainMenu.backButton.normal",
        "mainMenu.backButton.hover"
      ],
      [
        "mainMenu.saveSlot.normal",
        "mainMenu.saveSlot.hover",
        "mainMenu.saveSlot.selected",
        "mainMenu.saveSlot.empty",
        "mainMenu.saveSlot.disabled"
      ]
    ] as const;

    for (const group of groups) {
      const dimensions = group.map((assetId) => {
        const entry = manifest.assets[assetId];
        if (entry === undefined) {
          throw new Error(`Missing ${assetId}`);
        }
        return readPngDimensions(join(process.cwd(), "public", entry.path.replace(/^\//, "")));
      });
      expect(new Set(dimensions.map(({ width }) => width)).size, group.join(",")).toBe(1);
      expect(new Set(dimensions.map(({ height }) => height)).size, group.join(",")).toBe(1);
    }
  });
});

function readManifest(): MainMenuAssetManifest {
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as MainMenuAssetManifest;
}

function readPngDimensions(path: string): { readonly width: number; readonly height: number } {
  const bytes = readFileSync(path);
  const signature = bytes.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") {
    throw new Error(`${path} is not a PNG file`);
  }
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20)
  };
}
