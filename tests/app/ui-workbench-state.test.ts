import { describe, expect, it } from "vitest";

import {
  addSliceJob,
  applyWorkbenchOverrides,
  createDefaultLayoutDraft,
  moveLayoutElement,
  resizeLayoutElement,
  updateCalibrationRect,
  type UiAssetOverride,
  type UiWorkbenchState
} from "../../src/app/screens/UiWorkbenchState";
import type { NormalizedUiAssetManifest } from "../../src/assets/normalizedUiAssets";

describe("UI workbench state reducers", () => {
  it("merges sidecar overrides without mutating the base manifest", () => {
    const base = createFixtureManifest();
    const overrides: readonly UiAssetOverride[] = [
      {
        assetId: "ui.save.saveSlotEmpty",
        contentRect: { x: 120, y: 40, w: 700, h: 120 },
        notes: "center text"
      }
    ];

    const resolved = applyWorkbenchOverrides(base, overrides);

    expect(resolved.assets["ui.save.saveSlotEmpty"]?.contentRect).toEqual({ x: 120, y: 40, w: 700, h: 120 });
    expect(base.assets["ui.save.saveSlotEmpty"]?.contentRect).toEqual({ x: 80, y: 30, w: 800, h: 140 });
    expect(resolved.assets["ui.save.saveSlotEmpty"]?.warnings).toContain("editorOverride");
  });

  it("updates calibration rectangles with image-bound clamping", () => {
    const state = createState();

    const next = updateCalibrationRect(state, {
      assetId: "ui.save.saveSlotEmpty",
      rectKind: "contentRect",
      rect: { x: -10, y: 20, w: 2000, h: 500 }
    });

    expect(next.overrides).toEqual([
      {
        assetId: "ui.save.saveSlotEmpty",
        contentRect: { x: 0, y: 20, w: 1000, h: 220 }
      }
    ]);
  });

  it("records slice jobs with constrained output paths", () => {
    const state = createState();

    const next = addSliceJob(state, {
      category: "button",
      outputAssetId: "ui.editor.testButton.normal",
      outputPath: "/assets/generated/ui/editor/slices/test_button_normal.png",
      rect: { x: 10, y: 10, w: 120, h: 48 },
      sourceAssetId: "ui.save.saveSlotEmpty",
      state: "normal",
      stateGroup: "ui.editor.testButton",
      trimTransparentPadding: true
    });

    expect(next.sliceJobs).toHaveLength(1);
    expect(next.sliceJobs[0]?.outputPath).toBe("/assets/generated/ui/editor/slices/test_button_normal.png");
  });

  it("moves and resizes layout elements in 1920x1080 design coordinates", () => {
    const layout = createDefaultLayoutDraft("main_menu");
    const elementId = layout.elements[0]?.id ?? "";

    const moved = moveLayoutElement(layout, elementId, { dx: 280, dy: 120 });
    const resized = resizeLayoutElement(moved, elementId, { dw: 160, dh: 90 });

    expect(resized.designSize).toEqual({ w: 1920, h: 1080 });
    expect(resized.elements[0]).toMatchObject({ x: 280, y: 120, w: 480, h: 170 });
  });
});

function createState(): UiWorkbenchState {
  return {
    activeAssetId: "ui.save.saveSlotEmpty",
    activeTab: "calibration",
    baseManifest: createFixtureManifest(),
    layout: createDefaultLayoutDraft("main_menu"),
    overrides: [],
    sliceJobs: []
  };
}

function createFixtureManifest(): NormalizedUiAssetManifest {
  return {
    version: "0.3",
    namespace: "ui.normalized",
    generatedAtMs: 1,
    assets: {
      "ui.save.saveSlotEmpty": {
        id: "ui.save.saveSlotEmpty",
        path: "/assets/generated/ui/save/save_slot_empty.png",
        category: "slot",
        required: true,
        imageSize: { w: 1000, h: 240 },
        visualBounds: { x: 40, y: 20, w: 920, h: 200 },
        transparentPadding: { left: 40, right: 40, top: 20, bottom: 20, paddingRatio: 0.23 },
        recommendedDisplaySize: { w: 520, h: 125 },
        contentRect: { x: 80, y: 30, w: 800, h: 140 },
        scalingMode: "nineSlice",
        nineSlice: { left: 90, right: 90, top: 36, bottom: 36 }
      }
    },
    stateGroups: {}
  };
}
