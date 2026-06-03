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
    expect(source).not.toMatch(/from\s+["'][^"']*UiAssetRegistry["']/);
    expect(source).not.toMatch(/from\s+["'][^"']*AssetButton["']/);
    expect(source).not.toMatch(/from\s+["'][^"']*AssetPanel["']/);
  });
});

function loadGeneratedUiRegistry(): GeneratedUiAssetRegistry {
  return new AssetRegistry<GeneratedUiAssetId>(
    JSON.parse(readFileSync(join(process.cwd(), "public/assets/generated/ui/manifest.v0.4.json"), "utf8"))
  );
}
