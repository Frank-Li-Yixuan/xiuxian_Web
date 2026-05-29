import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/main-menu.css", "utf8");

function ruleBody(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escapedSelector}\\s*\\{(?<body>[^}]*)\\}`).exec(css);
  return match?.groups?.body ?? "";
}

describe("main menu image button css", () => {
  it("keeps image buttons transparent and contained during hover", () => {
    const hoverRule = ruleBody(".asset-button:hover:not(:disabled)");
    const mainMenuHoverRule = ruleBody(".main-menu-actions .asset-button:hover:not(:disabled)");

    for (const body of [hoverRule, mainMenuHoverRule]) {
      expect(body).toContain("background-color: transparent");
      expect(body).toContain("background-position: center");
      expect(body).toContain("background-repeat: no-repeat");
      expect(body).toContain("background-size: contain");
    }

    expect(mainMenuHoverRule).toContain("background-image: var(--button-normal)");
    expect(mainMenuHoverRule).toContain("transform: scale(1.025)");
  });

  it("keeps generated image buttons transparent and contained across states", () => {
    for (const selector of [
      ".generated-ui-button:hover:not(:disabled)",
      ".generated-ui-button:active:not(:disabled)",
      ".generated-ui-button:disabled"
    ]) {
      const body = ruleBody(selector);

      expect(body).toContain("background-color: transparent");
      expect(body).toContain("background-position: center");
      expect(body).toContain("background-repeat: no-repeat");
      expect(body).toContain("background-size: contain");
    }
  });

  it("keeps the generated save slots inside the decorative panel safe area", () => {
    const panelRule = ruleBody(".save-slot-panel.generated-ui-panel");
    const innerRule = ruleBody(".save-panel-inner-bg");
    const listRule = ruleBody(".save-slot-panel.generated-ui-panel .save-slot-list");
    const copyRule = ruleBody(".save-slot-panel.generated-ui-panel .save-slot-copy");
    const selectedRule = ruleBody(".save-slot-card.is-selected");

    expect(panelRule).toContain("width: min(1220px, calc(100vw - 8px))");
    expect(innerRule).toContain("inset: 14.5% 7.2% 5.4%");
    expect(listRule).toContain("left: 50%");
    expect(listRule).toContain("top: 24%");
    expect(listRule).toContain("width: min(392px, 42.5%)");
    expect(copyRule).toContain("left: 12%");
    expect(copyRule).toContain("right: 12%");
    expect(copyRule).toContain("text-align: center");
    expect(selectedRule).toContain("transform: scale(1.006)");
  });

  it("keeps the CCUI2 fate altar stage contained above destiny cards", () => {
    const sidePanelRule = ruleBody(".ccui2-side-panel");
    const fateAltarRule = ruleBody(".ccui2-fate-altar");

    expect(sidePanelRule).toContain("height: 100%");
    expect(sidePanelRule).toContain("overflow: hidden");
    expect(fateAltarRule).toContain("width: min(40vh, 34vw, 480px)");
  });
});
