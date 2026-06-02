import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AssetRegistry } from "../../src/assets/AssetRegistry";
import type { GeneratedUiAssetId, GeneratedUiAssetRegistry } from "../../src/assets/generatedUiAssets";
import { CharacterCreationScreen } from "../../src/app/screens/CharacterCreationScreen";
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
    expect(markup).not.toContain(draft.originFate.hiddenFateInternal.hiddenFateId);
    expect(markup).not.toContain(hiddenFate.trueName);
    expect(markup).not.toContain(String(draft.originFate.hiddenFateInternal.progress));
  });
});

function loadGeneratedUiRegistry(): GeneratedUiAssetRegistry {
  return new AssetRegistry<GeneratedUiAssetId>(
    JSON.parse(readFileSync(join(process.cwd(), "public/assets/generated/ui/manifest.v0.4.json"), "utf8"))
  );
}
