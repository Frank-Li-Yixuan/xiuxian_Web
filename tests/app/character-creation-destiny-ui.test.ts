import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CharacterCreationScreen } from "../../src/app/screens/CharacterCreationScreen";
import { AssetRegistry } from "../../src/assets/AssetRegistry";
import type { GeneratedUiAssetId, GeneratedUiAssetRegistry } from "../../src/assets/generatedUiAssets";
import { CharacterCreationController } from "../../src/character/CharacterCreationController";

describe("CharacterCreationScreen destiny reroll UI", () => {
  it("renders DT-C004 reroll metadata in the existing DOM layout without PNG control imports", () => {
    const controller = new CharacterCreationController({ seed: "dt-c004-screen" });
    const draft = controller.generate({ slotId: "slot_destiny_ui", nowMs: 1_000 });

    const markup = renderToStaticMarkup(
      createElement(CharacterCreationScreen, {
        assets: loadGeneratedUiRegistry(),
        initialDraft: draft,
        nowMs: () => 1_000
      })
    );
    const source = readFileSync(join(process.cwd(), "src/app/screens/CharacterCreationScreen.tsx"), "utf8");

    expect(markup).toContain("天机值");
    expect(markup).toContain("剩余锁");
    expect(markup).toContain("天机推演");
    expect(markup).toContain(draft.destinies.main.name);
    const altarCaption = markup.match(/<div class="ccui2-altar-caption">[\s\S]*?<\/div>/)?.[0] ?? "";
    expect(altarCaption).toContain(draft.openingInnateDraft.spiritualRoot.displayName);
    expect(altarCaption).not.toContain(draft.destinies.main.name);
    expect(markup).toContain('data-lock-key="none"');
    expect(markup).toContain('data-lock-state="unavailable"');
    expect(markup).toContain('data-reroll-enabled="true"');
    expect(markup).toContain('data-divination-enabled="true"');
    expect(markup).toContain('data-detail-target="stats"');
    expect(markup).toContain('data-detail-target="root"');
    expect(markup).toContain('data-detail-target="origin"');
    expect(markup).toContain('data-detail-target="items"');
    expect(markup).toContain("选择可锁定项");
    expect(markup).toContain("灵根|主天命|副天命 1|副天命 2|劫命|身世|随身物");
    expect(source).not.toMatch(/from\s+["'][^"']*UiAssetRegistry["']/);
    expect(source).not.toMatch(/from\s+["'][^"']*AssetButton["']/);
    expect(source).not.toMatch(/from\s+["'][^"']*AssetPanel["']/);
  });

  it("renders selected destiny detail text with description, effects, warnings, and selected slot", () => {
    const controller = new CharacterCreationController({ seed: "ccui2-c004-destiny-detail" });
    const draft = controller.generate({ slotId: "slot_destiny_detail", nowMs: 1_000 });
    const selectedCard = draft.destinies.secondary[0];

    const markup = renderToStaticMarkup(
      createElement(CharacterCreationScreen, {
        assets: loadGeneratedUiRegistry(),
        initialDraft: draft,
        initialActiveTab: "destiny",
        initialSelectedSlot: "secondary0",
        nowMs: () => 1_000
      })
    );
    const description = selectedCard.description ?? "";

    expect(markup).toContain('data-detail-section="destiny"');
    expect(markup).toContain('data-selected-detail-slot="secondary0"');
    expect(markup).toContain(selectedCard.name);
    expect(description.length).toBeGreaterThan(0);
    expect(markup).toContain(description);
    for (const effect of selectedCard.positiveEffects) {
      expect(markup).toContain(effect);
    }
    for (const effect of selectedCard.negativeEffects) {
      expect(markup).toContain(effect);
    }
  });
});

function loadGeneratedUiRegistry(): GeneratedUiAssetRegistry {
  return new AssetRegistry<GeneratedUiAssetId>(
    JSON.parse(readFileSync(join(process.cwd(), "public/assets/generated/ui/manifest.v0.4.json"), "utf8"))
  );
}
