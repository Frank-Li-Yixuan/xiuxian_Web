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
import { CharacterCreationController } from "../../src/character/CharacterCreationController";
import { CharacterDraftGenerator } from "../../src/character/CharacterDraftGenerator";
import { applyCharacterDraftToProfile } from "../../src/character/CharacterProfileMapper";

describe("generated UI page usage", () => {
  it("renders SaveSlotScreen with DOM save cards instead of generated save-slot controls", () => {
    const storage = new MemoryStorage();
    const service = createSaveSlotService({ storage, nowMs: () => 2_000 });
    service.writeProfile("slot_1", createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 1_000, saveName: "Qingyun Test" }));

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
    expect(markup).toContain("Qingyun Test");
    expect(markup).not.toContain("/assets/generated/ui/save/");
    expect(markup).not.toContain("/assets/generated/ui/main_menu/controls/save_slot_");
  });

  it("renders completed save slots without the life-simulation progress line", () => {
    const storage = new MemoryStorage();
    const service = createSaveSlotService({ storage, nowMs: () => 3_000 });
    const completedProfile = completeLifeSimulationForProfile({
      profile: createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 1_000, saveName: "Mountain Exit" }),
      nowMs: 2_000,
      ageYears: 18,
      characterName: "Li Qing"
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

    expect(markup).toContain("Mountain Exit");
    expect(markup).toContain("Li Qing");
    expect(markup).not.toContain("progress-stage-simulating");
  });

  it("renders CharacterCreationScreen as the CCUI2 DOM fate-altar skeleton", () => {
    const markup = renderToStaticMarkup(createElement(CharacterCreationScreen, { assets: loadGeneratedUiRegistry() }));

    expect(markup).toContain("ccui2-character-creation");
    expect(markup).toContain("ccui2-main-stage");
    expect(markup).toContain("ccui2-fate-altar");
    expect(markup).toContain("ccui2-meditation-silhouette");
    expect(markup).toContain("/assets/generated/ui/character_creation/black_meditation_silhouette.png");
    expect(markup).toContain("ccui2-root-effect-layer");
    expect(markup).toContain("ccui2-destiny-effect-layer");
    expect(markup).toContain("ccui2-detail-scroll");
    expect(markup).toContain('data-ccui2-fx="idle"');
    expect(markup).toContain('data-ccui2-fx-seq="0"');
    expect(markup).toContain('data-character-name-input="true"');
    expect(markup).toContain('name="characterName"');
    expect(markup).toContain("xianxia-panel");
    expect(markup).toContain("xianxia-button");
    expect(markup).toContain("推演天命");
    expect(markup).toContain("主天命");
    expect(markup).toContain("副天命 1");
    expect(markup).toContain("副天命 2");
    expect(markup).toContain("劫命");
    expect(markup).toContain("属性详情");
    expect(markup).toContain("灵根详情");
    expect(markup).toContain("天命详情");
    expect(markup).toContain("身世血脉");
    expect(markup).toContain("随身物");
    expect(markup).toContain("重新推演");
    expect(markup).toContain("锁定项");
    expect(markup).toContain("天机推演");
    expect(markup).toContain("确认此生");
    expect(markup).toContain('data-layout-lock="no-page-scroll"');
    expect(markup).not.toContain("/assets/generated/ui/character_creation/character_creation_main_panel.png");
    expect(markup).not.toContain("/assets/generated/ui/character_creation/destiny_card_");
    expect(markup).not.toContain("/assets/generated/ui/character_creation/reroll_fate_button_");
    expect(markup).not.toContain("/assets/generated/ui/character_creation/trait_lock_button_");
    expect(markup.match(/data-destiny-card-slot=/g) ?? []).toHaveLength(4);
    expect(markup.match(/ccui2-action-button/g) ?? []).toHaveLength(5);
    expect(markup.indexOf("ccui2-destiny-card-row")).toBeLessThan(markup.indexOf("ccui2-detail-drawer"));
    expect(markup.indexOf("ccui2-detail-drawer")).toBeLessThan(markup.indexOf("ccui2-action-bar"));
    expect(markup).not.toContain("character-portrait-frame");
    expect(markup).not.toContain("full-body");
    expect(markup).not.toContain("立绘");
  });

  it("renders CCUI2-C006 animation state and locked class markers without PNG control imports", () => {
    const controller = new CharacterCreationController({ seed: "ccui2-c006-markers" });
    const draft = controller.generate({ slotId: "slot_c006", nowMs: 1_000 });
    const locked = controller.toggleLock(draft, { lockKey: "mainDestiny", nowMs: 1_500 });
    const markup = renderToStaticMarkup(
      createElement(CharacterCreationScreen, {
        assets: loadGeneratedUiRegistry(),
        initialActiveTab: "destiny",
        initialDraft: locked,
        initialFxKind: "lock"
      })
    );
    const source = readFileSync(join(process.cwd(), "src/app/screens/CharacterCreationScreen.tsx"), "utf8");

    expect(markup).toContain('data-ccui2-fx="lock"');
    expect(markup).toContain('data-destiny-card-slot="main"');
    expect(markup).toContain("is-locked");
    expect(source).not.toMatch(/from\s+["'][^"']*UiAssetRegistry["']/);
    expect(source).not.toMatch(/from\s+["'][^"']*AssetButton["']/);
    expect(source).not.toMatch(/from\s+["'][^"']*AssetPanel["']/);
  });

  it("renders character creation confirmation and leave dialog states for SSR coverage", () => {
    const draft = new CharacterDraftGenerator({ seed: "ccui2-c005-dialogs" }).generate({
      slotId: "slot_dialogs",
      nowMs: 1_000,
      name: "Lin Wen"
    });
    const emptyNameMarkup = renderToStaticMarkup(
      createElement(CharacterCreationScreen, {
        assets: loadGeneratedUiRegistry(),
        initialActionError: "角色名不能为空",
        initialDraft: draft,
        initialNameInput: ""
      })
    );
    const confirmMarkup = renderToStaticMarkup(
      createElement(CharacterCreationScreen, {
        assets: loadGeneratedUiRegistry(),
        initialConfirmDialog: "confirm-life",
        initialDraft: draft,
        initialNameInput: "Lin Wen"
      })
    );
    const leaveMarkup = renderToStaticMarkup(
      createElement(CharacterCreationScreen, {
        assets: loadGeneratedUiRegistry(),
        initialConfirmDialog: "leave",
        initialDraft: draft
      })
    );

    expect(emptyNameMarkup).toContain("角色名不能为空");
    expect(confirmMarkup).toContain('data-confirm-dialog="confirm-life"');
    expect(confirmMarkup).toContain('data-confirm-life-name="Lin Wen"');
    expect(confirmMarkup).toContain("Lin Wen");
    expect(confirmMarkup).toContain(`data-confirm-life-root="${draft.spiritualRoot.displayName}"`);
    expect(confirmMarkup).toContain(`data-confirm-life-main-destiny="${draft.destinies.main.name}"`);
    expect(confirmMarkup).toContain(`data-confirm-life-origin="${draft.background.name}"`);
    expect(leaveMarkup).toContain('data-confirm-dialog="leave"');
    expect(leaveMarkup).toContain('data-leave-character-creation-warning="true"');
  });

  it("renders LifeSimulationScreen with timeline, log, event card, and choice buttons", () => {
    const markup = renderToStaticMarkup(createElement(LifeSimulationScreen, { assets: loadGeneratedUiRegistry() }));

    expect(markup).toContain("/assets/generated/ui/life_simulation/life_timeline_vertical.png");
    expect(markup).toContain("/assets/generated/ui/life_simulation/life_event_log_panel.png");
    expect(markup).toContain("/assets/generated/ui/life_simulation/life_choice_event_card.png");
    expect(markup).toContain("/assets/generated/ui/life_simulation/life_choice_button_normal.png");
    expect(markup).toContain("/assets/generated/ui/life_simulation/life_choice_button_hover.png");
  });

  it("renders LifeSimulationScreen with confirmed character and initialized life state", () => {
    const profile = createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 1_000, saveName: "Life Start" });
    const draft = new CharacterDraftGenerator({ seed: "ccui2-c005-life-screen" }).generate({
      slotId: "slot_1",
      nowMs: 1_500,
      name: "Lin Wen"
    });
    const confirmed = applyCharacterDraftToProfile({ profile, draft, nowMs: 2_000 });

    const markup = renderToStaticMarkup(
      createElement(LifeSimulationScreen, {
        assets: loadGeneratedUiRegistry(),
        lifeSimulationState: confirmed.lifeSimulationState!,
        profile: confirmed
      })
    );

    expect(markup).toContain('data-life-simulation-stage="life_simulation"');
    expect(markup).toContain('data-life-simulation-character="true"');
    expect(markup).toContain("Lin Wen");
    expect(markup).toContain('data-life-simulation-initial-state="true"');
    expect(markup).toContain("0岁 / 0月 / infancy");
    expect(markup).toContain('data-life-simulation-core="true"');
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
