import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  AssetButton,
  AssetCard,
  NineSlicePanel,
  UiAssetImage,
  isKeyboardActivationKey
} from "../../src/app/components/NormalizedUiPrimitives";
import { NormalizedUiAssetRegistry, type NormalizedUiAssetManifest } from "../../src/assets/normalizedUiAssets";

describe("normalized UI primitives", () => {
  it("renders UiAssetImage from manifest metadata with optional debug overlays", () => {
    const registry = createFixtureRegistry();

    const markup = renderToStaticMarkup(
      createElement(UiAssetImage, {
        assetId: "ui.save.saveSlotEmpty",
        debug: true,
        registry
      })
    );

    expect(markup).toContain("/assets/generated/ui/save/save_slot_empty.png");
    expect(markup).toContain('data-asset-id="ui.save.saveSlotEmpty"');
    expect(markup).toContain("normalized-ui-image");
    expect(markup).toContain("normalized-ui-debug-visual-bounds");
    expect(markup).toContain("normalized-ui-debug-content-rect");
    expect(markup).toContain("width:520px");
    expect(markup).toContain("height:120px");
  });

  it("renders NineSlicePanel as nine background slices and places children inside contentRect", () => {
    const registry = createFixtureRegistry();

    const markup = renderToStaticMarkup(
      createElement(
        NineSlicePanel,
        {
          assetId: "ui.save.panelFrame",
          debug: true,
          height: 360,
          registry,
          width: 640
        },
        "Panel Body"
      )
    );

    expect(markup.match(/normalized-ui-nine-slice-part/g) ?? []).toHaveLength(9);
    expect(markup).not.toContain("<img");
    expect(markup).toContain("/assets/generated/ui/save/save_panel_frame.png");
    expect(markup).toContain("normalized-ui-content-layer");
    expect(markup).toContain("Panel Body");
    expect(markup).toContain("normalized-ui-debug-content-rect");
  });

  it("resolves AssetButton states from a state group without changing layout size", () => {
    const registry = createFixtureRegistry();

    const markup = renderToStaticMarkup(
      createElement(
        AssetButton,
        {
          debug: true,
          registry,
          stateGroupId: "ui.common.closeButton"
        },
        "关闭"
      )
    );

    expect(markup).toContain("/assets/generated/ui/common/close_button_normal.png");
    expect(markup).toContain("/assets/generated/ui/common/close_button_hover.png");
    expect(markup).toContain("/assets/generated/ui/common/close_button_pressed.png");
    expect(markup).toContain("/assets/generated/ui/common/close_button_disabled.png");
    expect(markup).toContain("width:64px");
    expect(markup).toContain("height:64px");
    expect(markup).toContain("关闭");
    expect(markup).toContain("normalized-ui-debug-visual-bounds");
  });

  it("falls back missing button states conservatively and recognizes keyboard activation keys", () => {
    const registry = createFixtureRegistry();

    expect(registry.getStateAsset("ui.characterCreation.rerollFateButton", "selected").id).toBe(
      "ui.characterCreation.rerollFateButton.hover"
    );
    expect(registry.getStateAsset("ui.characterCreation.rerollFateButton", "pressed").id).toBe(
      "ui.characterCreation.rerollFateButton.hover"
    );
    expect(registry.getStateAsset("ui.characterCreation.rerollFateButton", "disabled").id).toBe(
      "ui.characterCreation.rerollFateButton.normal"
    );
    expect(isKeyboardActivationKey("Enter")).toBe(true);
    expect(isKeyboardActivationKey(" ")).toBe(true);
    expect(isKeyboardActivationKey("Escape")).toBe(false);
  });

  it("renders AssetCard frame with DOM title, icon, and description inside content layer", () => {
    const registry = createFixtureRegistry();

    const markup = renderToStaticMarkup(
      createElement(AssetCard, {
        description: "雷法加成，真元消耗增加。",
        icon: createElement("span", { className: "test-card-icon" }, "符"),
        rarity: "legendary",
        registry,
        title: "天雷道体"
      })
    );

    expect(markup).toContain("/assets/generated/ui/character_creation/destiny_card_legendary.png");
    expect(markup).toContain("normalized-ui-card-title");
    expect(markup).toContain("normalized-ui-card-description");
    expect(markup).toContain("天雷道体");
    expect(markup).toContain("雷法加成，真元消耗增加。");
    expect(markup).toContain("test-card-icon");
  });
});

function createFixtureRegistry(): NormalizedUiAssetRegistry {
  return new NormalizedUiAssetRegistry(createFixtureManifest());
}

function createFixtureManifest(): NormalizedUiAssetManifest {
  return {
    version: "0.3",
    namespace: "ui.normalized",
    generatedAtMs: 1,
    assets: {
      "ui.common.closeButton.normal": buttonAsset("ui.common.closeButton.normal", "/assets/generated/ui/common/close_button_normal.png"),
      "ui.common.closeButton.hover": buttonAsset("ui.common.closeButton.hover", "/assets/generated/ui/common/close_button_hover.png"),
      "ui.common.closeButton.pressed": buttonAsset("ui.common.closeButton.pressed", "/assets/generated/ui/common/close_button_pressed.png"),
      "ui.common.closeButton.disabled": buttonAsset("ui.common.closeButton.disabled", "/assets/generated/ui/common/close_button_disabled.png"),
      "ui.characterCreation.rerollFateButton.normal": buttonAsset(
        "ui.characterCreation.rerollFateButton.normal",
        "/assets/generated/ui/character_creation/reroll_fate_button_normal.png",
        { w: 320, h: 80 }
      ),
      "ui.characterCreation.rerollFateButton.hover": buttonAsset(
        "ui.characterCreation.rerollFateButton.hover",
        "/assets/generated/ui/character_creation/reroll_fate_button_hover.png",
        { w: 320, h: 80 }
      ),
      "ui.save.saveSlotEmpty": {
        id: "ui.save.saveSlotEmpty",
        path: "/assets/generated/ui/save/save_slot_empty.png",
        category: "slot",
        required: true,
        imageSize: { w: 1040, h: 240 },
        visualBounds: { x: 40, y: 30, w: 960, h: 180 },
        transparentPadding: { left: 40, right: 40, top: 30, bottom: 30, paddingRatio: 0.31 },
        recommendedDisplaySize: { w: 520, h: 120 },
        contentRect: { x: 155, y: 62, w: 730, h: 116 },
        scalingMode: "nineSlice",
        nineSlice: { left: 96, right: 96, top: 36, bottom: 36 }
      },
      "ui.save.panelFrame": {
        id: "ui.save.panelFrame",
        path: "/assets/generated/ui/save/save_panel_frame.png",
        category: "panel",
        required: true,
        imageSize: { w: 1000, h: 700 },
        visualBounds: { x: 50, y: 40, w: 900, h: 620 },
        transparentPadding: { left: 50, right: 50, top: 40, bottom: 40, paddingRatio: 0.2 },
        recommendedDisplaySize: { w: 900, h: 620 },
        contentRect: { x: 158, y: 127, w: 684, h: 446 },
        scalingMode: "nineSlice",
        nineSlice: { left: 108, right: 108, top: 74, bottom: 74 }
      },
      "ui.characterCreation.destinyCard.legendary": {
        id: "ui.characterCreation.destinyCard.legendary",
        path: "/assets/generated/ui/character_creation/destiny_card_legendary.png",
        category: "card",
        required: true,
        imageSize: { w: 420, h: 260 },
        visualBounds: { x: 20, y: 20, w: 380, h: 220 },
        transparentPadding: { left: 20, right: 20, top: 20, bottom: 20, paddingRatio: 0.24 },
        recommendedDisplaySize: { w: 300, h: 174 },
        contentRect: { x: 66, y: 60, w: 288, h: 140 },
        scalingMode: "nineSlice",
        nineSlice: { left: 53, right: 53, top: 35, bottom: 35 }
      }
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
      },
      "ui.characterCreation.rerollFateButton": {
        ids: ["ui.characterCreation.rerollFateButton.normal", "ui.characterCreation.rerollFateButton.hover"],
        warnings: []
      }
    }
  };
}

function buttonAsset(id: string, path: string, recommendedDisplaySize = { w: 64, h: 64 }) {
  return {
    id,
    path,
    category: "button" as const,
    required: true as const,
    imageSize: { w: 128, h: 128 },
    visualBounds: { x: 16, y: 16, w: 96, h: 96 },
    transparentPadding: { left: 16, right: 16, top: 16, bottom: 16, paddingRatio: 0.44 },
    recommendedDisplaySize,
    contentRect: { x: 38, y: 38, w: 52, h: 52 },
    scalingMode: "fixed" as const,
    stateGroup: id.replace(/\.(normal|hover|pressed|disabled)$/, "")
  };
}
