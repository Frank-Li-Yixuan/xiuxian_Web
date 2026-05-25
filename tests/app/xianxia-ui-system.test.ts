import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DevUiSystemScreen } from "../../src/app/screens/DevUiSystemScreen";
import { MainMenuScreen } from "../../src/app/screens/MainMenuScreen";
import { AssetRegistry } from "../../src/assets/AssetRegistry";
import type { MainMenuAssetId, MainMenuAssetRegistry } from "../../src/assets/mainMenuAssets";

describe("xianxia UI system", () => {
  it("renders the main menu with atmospheric cloud and mist layers", () => {
    const markup = renderToStaticMarkup(
      createElement(MainMenuScreen, {
        assets: loadMainMenuRegistry(),
        canContinue: false,
        onContinue: () => undefined,
        onExit: () => undefined,
        onNewGame: () => undefined,
        onSettings: () => undefined
      })
    );

    expect(markup).toContain("xianxia-mist-layer");
    expect(markup).toContain("xianxia-cloud-layer");
    expect(markup).toContain("data-cloud-layer=\"auspicious\"");
    expect(markup).not.toContain("xianxia-crane");
    expect(markup).toContain("新的游戏");
    expect(markup).toContain("继续游戏");
  });

  it("routes the dev UI system showcase and renders core component states", () => {
    const mainSource = readFileSync("src/app/main.tsx", "utf8");
    const markup = renderToStaticMarkup(createElement(DevUiSystemScreen));

    expect(mainSource).toContain("/dev/ui-system");
    expect(markup).toContain("Xianxia UI System");
    expect(markup).toContain("xianxia-button");
    expect(markup).toContain("xianxia-save-card");
    expect(markup).toContain("xianxia-dialog");
    expect(markup).toContain("xianxia-cloud-layer");
  });
});

function loadMainMenuRegistry(): MainMenuAssetRegistry {
  return new AssetRegistry<MainMenuAssetId>(
    JSON.parse(readFileSync("public/assets/generated/ui/main_menu/manifest.v0.3.json", "utf8"))
  );
}
