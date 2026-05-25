import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DevUiWorkbenchScreen } from "../../src/app/screens/DevUiWorkbenchScreen";
import type { NormalizedUiAssetManifest } from "../../src/assets/normalizedUiAssets";

describe("dev UI asset workbench", () => {
  it("renders calibration, slicing, and layout workspaces from manifest assets", () => {
    const markup = renderToStaticMarkup(createElement(DevUiWorkbenchScreen, { manifest: createFixtureManifest() }));

    expect(markup).toContain("ui-workbench");
    expect(markup).toContain("标定");
    expect(markup).toContain("切分");
    expect(markup).toContain("布局");
    expect(markup).toContain("data-workbench-tab=\"calibration\"");
    expect(markup).toContain("data-workbench-tab=\"slicing\"");
    expect(markup).toContain("data-workbench-tab=\"layout\"");
    expect(markup).toContain("data-calibration-overlay=\"visualBounds\"");
    expect(markup).toContain("data-calibration-overlay=\"contentRect\"");
    expect(markup).toContain("data-layout-design-size=\"1920x1080\"");
    expect(markup).toContain("/assets/generated/ui/save/save_slot_empty.png");
    expect(markup).not.toContain("/assets/generated/ui/main_menu/");
  });

  it("routes /dev/ui-workbench through the React entrypoint", () => {
    const mainSource = readFileSync("src/app/main.tsx", "utf8");

    expect(mainSource).toContain("/dev/ui-workbench");
    expect(mainSource).toContain("DevUiWorkbenchScreen");
  });
});

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
