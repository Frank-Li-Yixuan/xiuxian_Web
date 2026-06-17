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
    const silhouetteRule = ruleBody(".ccui2-meditation-silhouette");

    expect(sidePanelRule).toContain("height: 100%");
    expect(sidePanelRule).toContain("overflow: hidden");
    expect(fateAltarRule).toContain("width: min(40vh, 34vw, 480px)");
    expect(silhouetteRule).toContain("object-fit: contain");
    expect(silhouetteRule).toContain("pointer-events: none");
  });

  it("disables nonessential CCUI2 animation and transitions for reduced motion", () => {
    const reducedMotionSection = /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.life-simulation-layout/.exec(css)?.[0] ?? "";

    expect(reducedMotionSection).toContain(".ccui2-orbit-outer");
    expect(reducedMotionSection).toContain(".ccui2-orbit-inner");
    expect(reducedMotionSection).toContain(".ccui2-fate-altar");
    expect(reducedMotionSection).toContain(".ccui2-root-effect-layer");
    expect(reducedMotionSection).toContain(".ccui2-destiny-effect-layer");
    expect(reducedMotionSection).toContain(".ccui2-meditation-silhouette");
    expect(reducedMotionSection).toContain('[data-ccui2-fx="reroll"]');
    expect(reducedMotionSection).toContain('[data-ccui2-fx="lock"]');
    expect(reducedMotionSection).toContain('[data-ccui2-fx="confirm"]');
    expect(reducedMotionSection).toContain(".ccui2-destiny-card");
    expect(reducedMotionSection).toContain(".ccui2-action-button.xianxia-button");
    expect(reducedMotionSection).toContain("animation: none");
    expect(reducedMotionSection).toContain("transition: none");
  });

  it("defines CCUI2-C006 motion, feedback, root aura, and compact viewport rules", () => {
    expect(css).toContain("@keyframes ccui2AltarIdle");
    expect(css).toContain("@keyframes ccui2RootBreath");
    expect(css).toContain("@keyframes ccui2SilhouetteBreath");
    expect(css).toContain("@keyframes ccui2RerollSweep");
    expect(css).toContain("@keyframes ccui2CardFlash");
    expect(css).toContain("@keyframes ccui2LockSeal");
    expect(css).toContain("@keyframes ccui2ConfirmGlow");
    expect(css).toContain('.ccui2-character-creation[data-ccui2-fx="reroll"]');
    expect(css).toContain('.ccui2-character-creation[data-ccui2-fx="lock"]');
    expect(css).toContain('.ccui2-character-creation[data-ccui2-fx="confirm"]');
    expect(css).toContain('.ccui2-root-effect-layer[data-root~="fire"]');
    expect(css).toContain('.ccui2-root-effect-layer[data-root~="thunder"]');
    expect(css).toContain(".ccui2-root-metric-strip.is-locked");
    expect(css).toContain(".ccui2-destiny-card.is-locked");
    expect(css).toContain("@media (max-width: 1366px), (max-height: 768px)");
  });

  it("keeps long CCUI2 drawer text scrolling only inside the detail body", () => {
    const detailScrollRule = ruleBody(".ccui2-detail-scroll");
    const destinyCardRowRule = ruleBody(".ccui2-destiny-card-row");
    const actionBarRule = ruleBody(".ccui2-action-bar");
    const drawerContentRule = ruleBody(".ccui2-detail-drawer > .xianxia-panel-content");

    expect(drawerContentRule).toContain("grid-template-rows: auto minmax(0, 1fr)");
    expect(detailScrollRule).toContain("overflow-y: auto");
    expect(detailScrollRule).toContain("min-height: 0");
    expect(destinyCardRowRule).not.toContain("overflow");
    expect(actionBarRule).not.toContain("overflow");
  });

  it("prevents closed dialogs from intercepting CCUI2 interaction clicks", () => {
    const hiddenDialogRule = /\.xianxia-dialog-overlay\.is-hidden,\s*\.xianxia-dialog-positioner\.is-hidden\s*\{(?<body>[^}]*)\}/.exec(css)?.groups?.body ?? "";

    expect(hiddenDialogRule).toContain("pointer-events: none !important");
    expect(hiddenDialogRule).toContain("visibility: hidden");
  });

  it("defines LPI-C006 interlude flow surfaces and reduced-motion rules", () => {
    expect(css).toContain(".life-interlude-confirm-marker");
    expect(css).toContain(".life-interlude-transition");
    expect(css).toContain(".life-interlude-result-panel");
    expect(css).toContain(".life-interlude-seal");
    expect(css).toContain(".life-interlude-fact-grid");
    expect(css).toContain("@keyframes lifeInterludeSealPulse");

    const interludeIndex = css.indexOf(".life-interlude-seal");
    const reducedMotionSection = css.slice(interludeIndex).match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.life-interlude-result-panel[\s\S]*?\}/)?.[0] ?? "";
    expect(reducedMotionSection).toContain(".life-interlude-seal");
    expect(reducedMotionSection).toContain("animation: none");
    expect(reducedMotionSection).toContain("transition: none");
  });
});
