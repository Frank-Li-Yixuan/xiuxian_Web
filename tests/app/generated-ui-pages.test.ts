import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AssetRegistry } from "../../src/assets/AssetRegistry";
import type { GeneratedUiAssetId, GeneratedUiAssetRegistry } from "../../src/assets/generatedUiAssets";
import type { MainMenuAssetId, MainMenuAssetRegistry } from "../../src/assets/mainMenuAssets";
import { CharacterCreationScreen } from "../../src/app/screens/CharacterCreationScreen";
import { LifeSimulationScreen } from "../../src/app/screens/LifeSimulationScreen";
import { SaveSlotScreen } from "../../src/app/screens/SaveSlotScreen";
import { createDefaultProfileForSlot } from "../../src/save/ProfileFactory";
import { createSaveSlotService } from "../../src/save/SaveSlotService";

describe("generated UI page usage", () => {
  it("renders SaveSlotScreen with save/common generated assets while preserving slot behavior", () => {
    const storage = new MemoryStorage();
    const service = createSaveSlotService({ storage, nowMs: () => 2_000 });
    service.writeProfile("slot_1", createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 1_000 }));

    const markup = renderToStaticMarkup(
      createElement(SaveSlotScreen, {
        assets: loadMainMenuRegistry(),
        generatedUiAssets: loadGeneratedUiRegistry(),
        mode: "continue",
        service,
        onBack: () => undefined,
        onProfileReady: () => undefined
      })
    );

    expect(markup).toContain("/assets/generated/ui/save/save_panel_frame.png");
    expect(markup).toContain("/assets/generated/ui/save/save_panel_inner_bg.png");
    expect(markup).toContain("/assets/generated/ui/save/save_slot_empty.png");
    expect(markup).toContain("/assets/generated/ui/common/close_button_normal.png");
    expect(markup).not.toContain("/assets/generated/ui/save/save_slot_existing_normal.png");
    expect(markup).not.toContain("/assets/generated/ui/save/save_slot_disabled.png");
    expect(markup).not.toContain("/assets/generated/ui/save/save_avatar_frame.png");
    expect(markup).not.toContain("/assets/generated/ui/main_menu/controls/save_slot_");
    expect(markup).not.toContain("创建新存档");
  });

  it("renders CharacterCreationScreen with its generated UI controls", () => {
    const markup = renderToStaticMarkup(createElement(CharacterCreationScreen, { assets: loadGeneratedUiRegistry() }));

    expect(markup).toContain("/assets/generated/ui/character_creation/character_creation_main_panel.png");
    expect(markup).toContain("/assets/generated/ui/character_creation/character_portrait_frame.png");
    expect(markup).toContain("/assets/generated/ui/character_creation/spiritual_root_disc.png");
    expect(markup).toContain("/assets/generated/ui/character_creation/destiny_card_legendary.png");
    expect(markup).toContain("/assets/generated/ui/character_creation/confirm_life_button_normal.png");
  });

  it("renders LifeSimulationScreen with timeline, log, event card, and choice buttons", () => {
    const markup = renderToStaticMarkup(createElement(LifeSimulationScreen, { assets: loadGeneratedUiRegistry() }));

    expect(markup).toContain("/assets/generated/ui/life_simulation/life_timeline_vertical.png");
    expect(markup).toContain("/assets/generated/ui/life_simulation/life_event_log_panel.png");
    expect(markup).toContain("/assets/generated/ui/life_simulation/life_choice_event_card.png");
    expect(markup).toContain("/assets/generated/ui/life_simulation/life_choice_button_normal.png");
    expect(markup).toContain("/assets/generated/ui/life_simulation/life_choice_button_hover.png");
  });
});

function loadGeneratedUiRegistry(): GeneratedUiAssetRegistry {
  return new AssetRegistry<GeneratedUiAssetId>(
    JSON.parse(readFileSync(join(process.cwd(), "public/assets/generated/ui/manifest.v0.4.json"), "utf8"))
  );
}

function loadMainMenuRegistry(): MainMenuAssetRegistry {
  return new AssetRegistry<MainMenuAssetId>(
    JSON.parse(readFileSync(join(process.cwd(), "public/assets/generated/ui/main_menu/manifest.v0.3.json"), "utf8"))
  );
}

class MemoryStorage implements Storage {
  public readonly store = new Map<string, string>();

  public get length(): number {
    return this.store.size;
  }

  public clear(): void {
    this.store.clear();
  }

  public getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  public key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }

  public removeItem(key: string): void {
    this.store.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}
