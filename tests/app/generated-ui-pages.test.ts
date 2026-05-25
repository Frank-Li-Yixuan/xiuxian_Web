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
import { SettingsScreen } from "../../src/app/screens/SettingsScreen";
import { completeLifeSimulationForProfile, createDefaultProfileForSlot } from "../../src/save/ProfileFactory";
import { createSaveSlotService } from "../../src/save/SaveSlotService";

describe("generated UI page usage", () => {
  it("renders SaveSlotScreen with DOM save cards instead of generated save-slot controls", () => {
    const storage = new MemoryStorage();
    const service = createSaveSlotService({ storage, nowMs: () => 2_000 });
    service.writeProfile("slot_1", createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 1_000, saveName: "青云初试" }));

    const markup = renderToStaticMarkup(
      createElement(SaveSlotScreen, {
        assets: loadMainMenuRegistry(),
        generatedUiAssets: loadGeneratedUiRegistry(),
        mode: "continue",
        service,
        onBack: () => undefined,
        onProfileCreated: () => undefined,
        onProfileReady: () => undefined
      })
    );

    expect(markup).toContain("xianxia-save-card");
    expect(markup).toContain("xianxia-panel");
    expect(markup).not.toContain("/assets/generated/ui/save/save_panel_frame.png");
    expect(markup).not.toContain("/assets/generated/ui/save/save_panel_inner_bg.png");
    expect(markup).not.toContain("/assets/generated/ui/save/save_slot_empty.png");
    expect(markup).not.toContain("/assets/generated/ui/common/close_button_normal.png");
    expect(markup).not.toContain("/assets/generated/ui/save/create_save_button_");
    expect(markup).not.toContain("/assets/generated/ui/save/load_save_button_normal.png");
    expect(markup).not.toContain("/assets/generated/ui/save/danger_button_normal.png");
    expect(markup).not.toContain("/assets/generated/ui/save/save_slot_existing_normal.png");
    expect(markup).not.toContain("/assets/generated/ui/save/save_slot_disabled.png");
    expect(markup).not.toContain("/assets/generated/ui/save/save_avatar_frame.png");
    expect(markup).not.toContain("/assets/generated/ui/main_menu/controls/save_slot_");
    expect(markup).not.toContain("创建新存档");
    expect(markup).toContain("青云初试");
    expect(markup).toContain("未定道友");
    expect(markup).toContain("当前进度：模拟中");
    expect(markup).toContain("0岁 · 练气 1层 · 修为 0/300");
    expect(markup).not.toContain("存档 1");
  });

  it("renders completed save slots without the life-simulation progress line", () => {
    const storage = new MemoryStorage();
    const service = createSaveSlotService({ storage, nowMs: () => 3_000 });
    const completedProfile = completeLifeSimulationForProfile({
      profile: createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 1_000, saveName: "出山档" }),
      nowMs: 2_000,
      ageYears: 18,
      characterName: "李青云"
    });
    service.writeProfile("slot_1", completedProfile);

    const markup = renderToStaticMarkup(
      createElement(SaveSlotScreen, {
        assets: loadMainMenuRegistry(),
        generatedUiAssets: loadGeneratedUiRegistry(),
        mode: "continue",
        service,
        onBack: () => undefined,
        onProfileCreated: () => undefined,
        onProfileReady: () => undefined
      })
    );

    expect(markup).toContain("出山档");
    expect(markup).toContain("李青云");
    expect(markup).toContain("18岁 · 练气 1层 · 修为 0/300");
    expect(markup).not.toContain("当前进度：模拟中");
  });

  it("renders CharacterCreationScreen with its generated UI controls", () => {
    const markup = renderToStaticMarkup(createElement(CharacterCreationScreen, { assets: loadGeneratedUiRegistry() }));

    expect(markup).toContain("/assets/generated/ui/character_creation/character_creation_main_panel.png");
    expect(markup).toContain("/assets/generated/ui/character_creation/black_meditation_silhouette.png");
    expect(markup).toContain("/assets/generated/ui/character_creation/fate_altar_disc.png");
    expect(markup).toContain("/assets/generated/ui/character_creation/fate_altar_disc_active.png");
    expect(markup).toContain("/assets/generated/ui/character_creation/root_aura_");
    expect(markup).toMatch(/\/assets\/generated\/ui\/character_creation\/destiny_card_(common|rare|epic|legendary|flaw)\.png/);
    expect(markup).toContain("/assets/generated/ui/character_creation/confirm_life_button_normal.png");
    expect(markup).toContain("创建角色 / 推演天命");
    expect(markup).toContain("character-fate-altar");
    expect(markup).toContain('data-scrollable="true"');
    expect(markup.match(/data-destiny-card-slot=/g) ?? []).toHaveLength(4);
    expect(markup.indexOf("character-destiny-row")).toBeLessThan(markup.indexOf("character-detail-panel"));
    expect(markup).not.toContain("/assets/generated/ui/character_creation/character_portrait_frame.png");
    expect(markup).not.toContain("character-seated-silhouette");
    expect(markup).not.toContain("立绘");
  });

  it("renders LifeSimulationScreen with timeline, log, event card, and choice buttons", () => {
    const markup = renderToStaticMarkup(createElement(LifeSimulationScreen, { assets: loadGeneratedUiRegistry() }));

    expect(markup).toContain("/assets/generated/ui/life_simulation/life_timeline_vertical.png");
    expect(markup).toContain("/assets/generated/ui/life_simulation/life_event_log_panel.png");
    expect(markup).toContain("/assets/generated/ui/life_simulation/life_choice_event_card.png");
    expect(markup).toContain("/assets/generated/ui/life_simulation/life_choice_button_normal.png");
    expect(markup).toContain("/assets/generated/ui/life_simulation/life_choice_button_hover.png");
  });

  it("renders SettingsScreen with the generated close button and controlled BGM volume", () => {
    const markup = renderToStaticMarkup(
      createElement(SettingsScreen, {
        assets: loadMainMenuRegistry(),
        bgmVolume: 0.42,
        generatedUiAssets: loadGeneratedUiRegistry(),
        onBgmVolumeChange: () => undefined,
        onClose: () => undefined
      })
    );

    expect(markup).toContain("/assets/generated/ui/common/close_button_normal.png");
    expect(markup).toContain("/assets/generated/ui/common/close_button_hover.png");
    expect(markup).not.toContain("/assets/generated/ui/main_menu/controls/close_button_normal.png");
    expect(markup).toContain("BGM音量");
    expect(markup).toContain("42%");
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
