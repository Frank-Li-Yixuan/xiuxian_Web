import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

interface RectSize {
  readonly w: number;
  readonly h: number;
}

interface NormalizedEntry {
  readonly id: string;
  readonly path: string;
  readonly category: string;
  readonly required: true;
  readonly imageSize: RectSize;
  readonly visualBounds: Rect;
  readonly transparentPadding: {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
    readonly paddingRatio: number;
  };
  readonly recommendedDisplaySize: RectSize;
  readonly contentRect: Rect;
  readonly scalingMode: string;
  readonly nineSlice?: {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
  };
  readonly stateGroup?: string;
  readonly warnings?: readonly string[];
}

interface NormalizedManifest {
  readonly version: string;
  readonly namespace: string;
  readonly assets: Readonly<Record<string, NormalizedEntry>>;
  readonly stateGroups: Readonly<Record<string, { readonly ids: readonly string[]; readonly warnings: readonly string[] }>>;
}

interface UiAssetReport {
  readonly version: string;
  readonly assetCount: number;
  readonly assets: readonly NormalizedEntry[];
  readonly warnings: readonly { readonly id: string; readonly code: string }[];
}

const TARGET_ASSET_DIRS = ["common", "save", "character_creation", "life_simulation"] as const;

describe("UI asset normalization analyzer", () => {
  it("generates a report and normalized manifest into a custom output directory", () => {
    const outDir = mkdtempSync(join(tmpdir(), "ui-normalization-"));
    try {
      execFileSync("node", ["scripts/analyze-ui-assets.mjs", "--out-dir", outDir], {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: "pipe"
      });

      const reportPath = join(outDir, "ui_asset_report.v0.3.json");
      const manifestPath = join(outDir, "ui_manifest.v0.3.json");
      expect(existsSync(reportPath)).toBe(true);
      expect(existsSync(manifestPath)).toBe(true);

      const report = JSON.parse(readFileSync(reportPath, "utf8")) as UiAssetReport;
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as NormalizedManifest;
      const manifestEntries = Object.values(manifest.assets);

      expect(report.version).toBe("0.3");
      expect(manifest.version).toBe("0.3");
      expect(manifest.namespace).toBe("ui.normalized");
      expect(report.assetCount).toBe(manifestEntries.length);
      expect(manifestEntries.length).toBeGreaterThan(40);

      for (const entry of manifestEntries) {
        expect(entry.id).toMatch(/^ui\.(common|save|characterCreation|lifeSimulation)\./);
        expect(entry.path).toMatch(/^\/assets\/generated\/ui\/(common|save|character_creation|life_simulation)\//);
        expect(entry.path).not.toContain("/main_menu/");
        expect(entry.path).not.toMatch(/https?:\/\/|cdn|fonts\.googleapis|@font-face/i);
        expect(entry.required).toBe(true);
        expect(entry.imageSize.w).toBeGreaterThan(0);
        expect(entry.imageSize.h).toBeGreaterThan(0);
        expect(entry.recommendedDisplaySize.w).toBeGreaterThan(0);
        expect(entry.recommendedDisplaySize.h).toBeGreaterThan(0);
        expectRectInside(entry.id, entry.visualBounds, entry.imageSize);
        expectRectInside(entry.id, entry.contentRect, entry.imageSize);
      }

      const assetPaths = manifestEntries.map((entry) => entry.path);
      for (const dir of TARGET_ASSET_DIRS) {
        expect(assetPaths.some((path) => path.startsWith(`/assets/generated/ui/${dir}/`))).toBe(true);
      }
      expect(assetPaths.some((path) => path.includes("/main_menu/"))).toBe(false);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it("adds content rectangles, scaling recommendations, and warnings for composition risks", () => {
    const outDir = mkdtempSync(join(tmpdir(), "ui-normalization-"));
    try {
      execFileSync("node", ["scripts/analyze-ui-assets.mjs", "--out-dir", outDir], {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: "pipe"
      });
      const report = JSON.parse(readFileSync(join(outDir, "ui_asset_report.v0.3.json"), "utf8")) as UiAssetReport;
      const manifest = JSON.parse(readFileSync(join(outDir, "ui_manifest.v0.3.json"), "utf8")) as NormalizedManifest;
      const entries = Object.values(manifest.assets);

      const scalableEntries = entries.filter((entry) => ["panel", "card", "slot"].includes(entry.category));
      expect(scalableEntries.length).toBeGreaterThan(0);
      for (const entry of scalableEntries) {
        expect(entry.scalingMode, entry.id).toBe("nineSlice");
        expect(entry.nineSlice, entry.id).toBeDefined();
        expect(entry.contentRect.w, entry.id).toBeLessThanOrEqual(entry.visualBounds.w);
        expect(entry.contentRect.h, entry.id).toBeLessThanOrEqual(entry.visualBounds.h);
      }

      const riskyPaddingEntries = entries.filter(
        (entry) =>
          entry.transparentPadding.paddingRatio > 0.2 ||
          entry.transparentPadding.left / entry.imageSize.w > 0.2 ||
          entry.transparentPadding.right / entry.imageSize.w > 0.2 ||
          entry.transparentPadding.top / entry.imageSize.h > 0.2 ||
          entry.transparentPadding.bottom / entry.imageSize.h > 0.2
      );
      expect(riskyPaddingEntries.length).toBeGreaterThan(0);
      for (const entry of riskyPaddingEntries) {
        expect(entry.warnings ?? [], entry.id).toContain("hugeTransparentPadding");
      }
      expect(report.warnings.some((warning) => warning.code === "hugeTransparentPadding")).toBe(true);

      expect(manifest.stateGroups["ui.common.closeButton"]?.ids).toEqual(
        expect.arrayContaining([
          "ui.common.closeButton.normal",
          "ui.common.closeButton.hover",
          "ui.common.closeButton.pressed",
          "ui.common.closeButton.disabled"
        ])
      );
      expect(manifest.stateGroups["ui.characterCreation.rerollFateButton"]?.ids).toEqual(
        expect.arrayContaining(["ui.characterCreation.rerollFateButton.normal", "ui.characterCreation.rerollFateButton.hover"])
      );
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

function expectRectInside(label: string, rect: Rect, size: RectSize): void {
  expect(rect.x, label).toBeGreaterThanOrEqual(0);
  expect(rect.y, label).toBeGreaterThanOrEqual(0);
  expect(rect.w, label).toBeGreaterThan(0);
  expect(rect.h, label).toBeGreaterThan(0);
  expect(rect.x + rect.w, label).toBeLessThanOrEqual(size.w);
  expect(rect.y + rect.h, label).toBeLessThanOrEqual(size.h);
}
