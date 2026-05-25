import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DevUiAtlasScreen } from "../../src/app/screens/DevUiAtlasScreen";
import type { NormalizedUiAssetManifest } from "../../src/assets/normalizedUiAssets";

describe("dev UI atlas preview", () => {
  it("renders asset previews with visual bounds, content rect, recommended size, and warnings", () => {
    const manifest: NormalizedUiAssetManifest = {
      version: "0.3",
      namespace: "ui.normalized",
      generatedAtMs: 1,
      assets: {
        "ui.common.closeButton.normal": {
          id: "ui.common.closeButton.normal",
          path: "/assets/generated/ui/common/close_button_normal.png",
          category: "button",
          required: true,
          imageSize: { w: 128, h: 128 },
          visualBounds: { x: 20, y: 18, w: 88, h: 90 },
          transparentPadding: { left: 20, right: 20, top: 18, bottom: 20, paddingRatio: 0.52 },
          recommendedDisplaySize: { w: 64, h: 64 },
          contentRect: { x: 39, y: 43, w: 49, h: 40 },
          scalingMode: "fixed",
          stateGroup: "ui.common.closeButton",
          warnings: ["hugeTransparentPadding"]
        },
        "ui.save.panel.frame": {
          id: "ui.save.panel.frame",
          path: "/assets/generated/ui/save/save_panel_frame.png",
          category: "panel",
          required: true,
          imageSize: { w: 1400, h: 900 },
          visualBounds: { x: 100, y: 90, w: 1200, h: 720 },
          transparentPadding: { left: 100, right: 100, top: 90, bottom: 90, paddingRatio: 0.31 },
          recommendedDisplaySize: { w: 960, h: 576 },
          contentRect: { x: 244, y: 191, w: 912, h: 518 },
          scalingMode: "nineSlice",
          nineSlice: { left: 144, right: 144, top: 86, bottom: 86 },
          warnings: ["hugeTransparentPadding"]
        }
      },
      stateGroups: {
        "ui.common.closeButton": {
          ids: ["ui.common.closeButton.normal"],
          warnings: []
        }
      }
    };

    const markup = renderToStaticMarkup(createElement(DevUiAtlasScreen, { manifest }));

    expect(markup).toContain("/assets/generated/ui/common/close_button_normal.png");
    expect(markup).toContain("/assets/generated/ui/save/save_panel_frame.png");
    expect(markup).toContain("ui-atlas-visual-bounds");
    expect(markup).toContain("ui-atlas-content-rect");
    expect(markup).toContain('loading="lazy"');
    expect(markup).toContain('decoding="async"');
    expect(markup).toContain("64 x 64");
    expect(markup).toContain("hugeTransparentPadding");
  });

  it("routes /dev/ui-atlas through the React entrypoint", () => {
    const mainSource = readFileSync("src/app/main.tsx", "utf8");

    expect(mainSource).toContain("/dev/ui-atlas");
    expect(mainSource).toContain("DevUiAtlasScreen");
  });
});
