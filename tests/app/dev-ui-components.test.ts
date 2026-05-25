import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DevUiComponentsScreen } from "../../src/app/screens/DevUiComponentsScreen";
import { NormalizedUiAssetRegistry, type NormalizedUiAssetManifest } from "../../src/assets/normalizedUiAssets";

describe("dev normalized UI components showcase", () => {
  it("renders the primitive showcase without hardcoded screen composition", () => {
    const registry = new NormalizedUiAssetRegistry(createShowcaseManifest());

    const markup = renderToStaticMarkup(createElement(DevUiComponentsScreen, { registry }));

    expect(markup).toContain("normalized-ui-showcase");
    expect(markup).toContain("Button State Group");
    expect(markup).toContain("Save Slot Card");
    expect(markup).toContain("Destiny Card");
    expect(markup).toContain("Scalable Panel");
    expect(markup.match(/data-showcase-panel-size=/g) ?? []).toHaveLength(3);
    expect(markup).toContain("/assets/generated/ui/common/close_button_normal.png");
    expect(markup).toContain("/assets/generated/ui/save/save_slot_empty.png");
    expect(markup).toContain("/assets/generated/ui/character_creation/destiny_card_legendary.png");
  });

  it("routes /dev/ui-components through the React entrypoint", () => {
    const mainSource = readFileSync("src/app/main.tsx", "utf8");

    expect(mainSource).toContain("/dev/ui-components");
    expect(mainSource).toContain("DevUiComponentsScreen");
  });
});

function createShowcaseManifest(): NormalizedUiAssetManifest {
  return {
    version: "0.3",
    namespace: "ui.normalized",
    generatedAtMs: 1,
    assets: {
      "ui.common.closeButton.normal": buttonAsset("ui.common.closeButton.normal", "/assets/generated/ui/common/close_button_normal.png"),
      "ui.common.closeButton.hover": buttonAsset("ui.common.closeButton.hover", "/assets/generated/ui/common/close_button_hover.png"),
      "ui.common.closeButton.pressed": buttonAsset("ui.common.closeButton.pressed", "/assets/generated/ui/common/close_button_pressed.png"),
      "ui.common.closeButton.disabled": buttonAsset("ui.common.closeButton.disabled", "/assets/generated/ui/common/close_button_disabled.png"),
      "ui.save.saveSlotEmpty": panelAsset("ui.save.saveSlotEmpty", "/assets/generated/ui/save/save_slot_empty.png", { w: 520, h: 120 }),
      "ui.save.savePanelFrame": panelAsset("ui.save.savePanelFrame", "/assets/generated/ui/save/save_panel_frame.png", { w: 760, h: 470 }),
      "ui.characterCreation.destinyCard.legendary": panelAsset(
        "ui.characterCreation.destinyCard.legendary",
        "/assets/generated/ui/character_creation/destiny_card_legendary.png",
        { w: 300, h: 174 },
        "card"
      )
    },
    stateGroups: {
      "ui.common.closeButton": {
        ids: [
          "ui.common.closeButton.normal",
          "ui.common.closeButton.hover",
          "ui.common.closeButton.pressed",
          "ui.common.closeButton.disabled"
        ],
        warnings: []
      }
    }
  };
}

function buttonAsset(id: string, path: string) {
  return {
    id,
    path,
    category: "button" as const,
    required: true as const,
    imageSize: { w: 128, h: 128 },
    visualBounds: { x: 16, y: 16, w: 96, h: 96 },
    transparentPadding: { left: 16, right: 16, top: 16, bottom: 16, paddingRatio: 0.44 },
    recommendedDisplaySize: { w: 64, h: 64 },
    contentRect: { x: 38, y: 38, w: 52, h: 52 },
    scalingMode: "fixed" as const,
    stateGroup: "ui.common.closeButton"
  };
}

function panelAsset(id: string, path: string, recommendedDisplaySize: { readonly w: number; readonly h: number }, category: "panel" | "card" | "slot" = "panel") {
  return {
    id,
    path,
    category,
    required: true as const,
    imageSize: { w: 1000, h: 700 },
    visualBounds: { x: 50, y: 40, w: 900, h: 620 },
    transparentPadding: { left: 50, right: 50, top: 40, bottom: 40, paddingRatio: 0.2 },
    recommendedDisplaySize,
    contentRect: { x: 158, y: 127, w: 684, h: 446 },
    scalingMode: "nineSlice" as const,
    nineSlice: { left: 108, right: 108, top: 74, bottom: 74 }
  };
}
