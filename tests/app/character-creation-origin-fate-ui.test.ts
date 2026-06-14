import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AssetRegistry } from "../../src/assets/AssetRegistry";
import type { GeneratedUiAssetId, GeneratedUiAssetRegistry } from "../../src/assets/generatedUiAssets";
import { CharacterCreationScreen } from "../../src/app/screens/CharacterCreationScreen";
import { createCharacterCreationViewModel } from "../../src/app/screens/CharacterCreationViewModel";
import { CharacterCreationController } from "../../src/character/CharacterCreationController";
import { loadOriginFateRegistry } from "../../src/originFate/OriginFateRegistry";

describe("CharacterCreationScreen origin fate UI", () => {
  it("renders origin fate background, visible omen, carried items, and conversion hints without hidden fate spoilers", () => {
    const registry = loadOriginFateRegistry();
    const controller = new CharacterCreationController({ seed: "hfo-c005-ui" });
    const draft = controller.generate({ slotId: "slot_origin_ui", nowMs: 1_000 });
    const hiddenFate = registry.getHiddenFate(draft.originFate.hiddenFateInternal.hiddenFateId);

    const markup = renderToStaticMarkup(
      createElement(CharacterCreationScreen, {
        assets: loadGeneratedUiRegistry(),
        initialDraft: draft,
        nowMs: () => 1_000
      })
    );

    expect(markup).toContain(draft.originFate.backgroundOrigin.name);
    expect(markup).toContain(draft.originFate.backgroundOrigin.visibleDescription);
    expect(markup).toContain(draft.originFate.visibleHiddenOmen.levelLabel);
    expect(markup).toContain(draft.originFate.visibleHiddenOmen.hints[0]);
    expect(markup).toContain(draft.originFate.visibleHiddenOmen.riskHint);
    for (const item of draft.originFate.carriedItems) {
      expect(markup).toContain(item.name);
      expect(markup).toContain(item.conversion.label);
    }
    expectNoHiddenFateSpoilers(markup, hiddenFate, draft.originFate.hiddenFateInternal);
  });

  it("renders real opening attributes, spiritual root metrics, four destiny cards, and safe origin data", () => {
    const registry = loadOriginFateRegistry();
    const controller = new CharacterCreationController({ seed: "ccui2-c002-screen" });
    const draft = controller.generate({ slotId: "slot_ccui2_c002_screen", nowMs: 1_000 });
    const hiddenFate = registry.getHiddenFate(draft.originFate.hiddenFateInternal.hiddenFateId);

    const markup = renderToStaticMarkup(
      createElement(CharacterCreationScreen, {
        assets: loadGeneratedUiRegistry(),
        initialDraft: draft,
        nowMs: () => 1_000
      })
    );

    expect(markup).toContain(`data-destiny-card-slot="main"`);
    expect(markup).toContain(`data-destiny-card-slot="secondary0"`);
    expect(markup).toContain(`data-destiny-card-slot="secondary1"`);
    expect(markup).toContain(`data-destiny-card-slot="flaw"`);
    expect(markup).toContain(String(draft.openingInnateDraft.coreSeed.jing));
    expect(markup).toContain(String(draft.openingInnateDraft.coreSeed.qi));
    expect(markup).toContain(String(draft.openingInnateDraft.coreSeed.shen));
    expect(markup).toContain(String(draft.openingInnateDraft.aptitude.rootBone));
    expect(markup).toContain(String(draft.openingInnateDraft.aptitude.comprehension));
    expect(markup).toContain(String(draft.openingInnateDraft.aptitude.inspiration));
    expect(markup).toContain(draft.openingInnateDraft.spiritualRoot.displayName);
    expect(markup).toContain(`data-root-metric="purity"`);
    expect(markup).toContain(String(draft.openingInnateDraft.spiritualRoot.purity));
    expect(markup).toContain(`data-root-metric="stability"`);
    expect(markup).toContain(String(draft.openingInnateDraft.spiritualRoot.stability));
    expect(markup).toContain(`data-root-metric="conflict"`);
    expect(markup).toContain(String(draft.openingInnateDraft.spiritualRoot.conflict));
    expect(markup).toContain(`data-root-metric="breadth"`);
    expect(markup).toContain(String(draft.openingInnateDraft.spiritualRoot.breadth));
    expect(markup).toContain(draft.originFate.backgroundOrigin.name);
    expect(markup).toContain(draft.originFate.visibleHiddenOmen.levelLabel);
    for (const item of draft.originFate.carriedItems) {
      expect(markup).toContain(item.name);
      expect(markup).toContain(item.conversion.label);
    }
    expectNoHiddenFateSpoilers(markup, hiddenFate, draft.originFate.hiddenFateInternal);
  });

  it("keeps hidden fate internals private after reroll, lock, and divination actions", () => {
    const registry = loadOriginFateRegistry();
    const controller = new CharacterCreationController({ seed: "ccui2-c003-private-actions" });
    const first = controller.generate({ slotId: "slot_private_actions", nowMs: 1_000 });
    const locked = controller.toggleLock(first, { lockKey: "background", nowMs: 1_500 });
    const rerolled = controller.reroll(locked, { nowMs: 2_000 });
    const divined = controller.reroll(rerolled, { nowMs: 3_000, useDivination: true });
    const hiddenFate = registry.getHiddenFate(divined.originFate.hiddenFateInternal.hiddenFateId);
    const viewModel = createCharacterCreationViewModel(divined, {
      activeTab: "origin",
      selectedSlot: "main"
    });

    const markup = renderToStaticMarkup(
      createElement(CharacterCreationScreen, {
        assets: loadGeneratedUiRegistry(),
        initialDraft: divined,
        nowMs: () => 3_000
      })
    );
    const visibleText = `${markup}\n${JSON.stringify(viewModel.originFate)}`;

    expectNoHiddenFateSpoilers(visibleText, hiddenFate, divined.originFate.hiddenFateInternal);
  });

  it("renders stats, root, origin, and item drawer bodies with explanatory visible text only", () => {
    const registry = loadOriginFateRegistry();
    const controller = new CharacterCreationController({ seed: "ccui2-c004-detail-bodies" });
    const draft = controller.generate({ slotId: "slot_detail_bodies", nowMs: 1_000 });
    const hiddenFate = registry.getHiddenFate(draft.originFate.hiddenFateInternal.hiddenFateId);

    const statsMarkup = renderForDetail(draft, "stats");
    const rootMarkup = renderForDetail(draft, "root");
    const originMarkup = renderForDetail(draft, "origin");
    const itemMarkup = renderForDetail(draft, "items");
    const combined = `${statsMarkup}\n${rootMarkup}\n${originMarkup}\n${itemMarkup}`;

    expect(statsMarkup).toContain('data-detail-section="stats"');
    expect(statsMarkup).toContain("体魄血气");
    expect(statsMarkup).toContain("根骨");
    expect(rootMarkup).toContain('data-detail-section="root"');
    expect(rootMarkup).toContain(draft.openingInnateDraft.spiritualRoot.displayName);
    expect(rootMarkup).toContain("纯度代表灵气集中程度");
    expect(rootMarkup).toContain("稳定影响开局灵根风险");
    expect(originMarkup).toContain('data-detail-section="origin"');
    expect(originMarkup).toContain(draft.originFate.backgroundOrigin.name);
    expect(originMarkup).toContain(draft.originFate.visibleHiddenOmen.levelLabel);
    expect(originMarkup).toContain(draft.originFate.visibleHiddenOmen.riskHint);
    expect(itemMarkup).toContain('data-detail-section="items"');
    for (const item of draft.originFate.carriedItems) {
      expect(itemMarkup).toContain(item.name);
      expect(itemMarkup).toContain(item.conversion.label);
      expect(itemMarkup).toContain(item.conversion.dongfuHook);
    }
    expectNoHiddenFateSpoilers(combined, hiddenFate, draft.originFate.hiddenFateInternal);
  });
});

function expectNoHiddenFateSpoilers(
  visibleText: string,
  hiddenFate: { readonly trueName: string },
  hiddenFateInternal: { readonly hiddenFateId: string; readonly progress: number }
): void {
  expect(visibleText).not.toContain(hiddenFate.trueName);
  expect(visibleText).not.toContain(hiddenFateInternal.hiddenFateId);
  expect(visibleText).not.toContain("hiddenFateInternal");
  expect(visibleText).not.toContain(`"progress":${hiddenFateInternal.progress}`);
}

function renderForDetail(draft: ReturnType<CharacterCreationController["generate"]>, activeTab: "stats" | "root" | "origin" | "items"): string {
  return renderToStaticMarkup(
    createElement(CharacterCreationScreen, {
      assets: loadGeneratedUiRegistry(),
      initialDraft: draft,
      initialActiveTab: activeTab,
      nowMs: () => 1_000
    })
  );
}

function loadGeneratedUiRegistry(): GeneratedUiAssetRegistry {
  return new AssetRegistry<GeneratedUiAssetId>(
    JSON.parse(readFileSync(join(process.cwd(), "public/assets/generated/ui/manifest.v0.4.json"), "utf8"))
  );
}
