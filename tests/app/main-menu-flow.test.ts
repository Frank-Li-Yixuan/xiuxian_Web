import { describe, expect, it } from "vitest";

import { createInitialMainMenuAppState, mainMenuAppReducer } from "../../src/app/MainMenuAppState";
import { completeLifeSimulationForProfile, createDefaultProfileForSlot } from "../../src/save/ProfileFactory";

describe("main menu app flow", () => {
  it("starts on the main menu and disables continue when no save exists", () => {
    const state = createInitialMainMenuAppState({ hasAnySave: false });

    expect(state.route).toEqual({ screen: "main_menu" });
    expect(state.canContinue).toBe(false);
    expect(state.activeProfile).toBeNull();
  });

  it("routes new game, settings, outgame, and combat without touching gameplay state", () => {
    const initial = createInitialMainMenuAppState({ hasAnySave: true });
    const newGame = mainMenuAppReducer(initial, { type: "open_save_slots", mode: "new" });
    const settings = mainMenuAppReducer(initial, { type: "open_settings" });
    const profile = createDefaultProfileForSlot({ slotId: "slot_2", nowMs: 2_000, saveName: "青云初试" });
    const characterCreation = mainMenuAppReducer(newGame, { type: "profile_created", profile, slotId: "slot_2" });
    const outgame = mainMenuAppReducer(characterCreation, { type: "profile_ready", profile });
    const combat = mainMenuAppReducer(outgame, { type: "enter_combat" });

    expect(newGame.route).toEqual({ screen: "save_slots", mode: "new" });
    expect(settings.route).toEqual({ screen: "settings" });
    expect(mainMenuAppReducer(settings, { type: "return_to_main_menu", hasAnySave: true }).route).toEqual({ screen: "main_menu" });
    expect(characterCreation.route).toEqual({ screen: "character_creation" });
    expect(characterCreation.activeSaveSlotId).toBe("slot_2");
    expect(characterCreation.activeProfile?.saveName).toBe("青云初试");
    expect(outgame.route).toEqual({ screen: "outgame_home" });
    expect(outgame.activeProfile?.profileId).toBe("local_slot_2");
    expect(combat.route).toEqual({ screen: "combat" });
    expect(combat.activeProfile?.profileId).toBe("local_slot_2");
  });

  it("routes confirmed life-simulation profiles to life simulation and legacy completed profiles to outgame", () => {
    const initial = createInitialMainMenuAppState({ hasAnySave: true });
    const createdProfile = createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 1_000, saveName: "Qingyun" });
    const characterCreation = mainMenuAppReducer(initial, { type: "profile_created", profile: createdProfile, slotId: "slot_1" });
    const lifeProfile = {
      ...createdProfile,
      stage: "life_simulation" as const,
      lifeSimulation: { status: "simulating" as const, ageYears: 0 }
    };
    const completedProfile = completeLifeSimulationForProfile({
      profile: createdProfile,
      nowMs: 2_000,
      ageYears: 18,
      characterName: "Lin Wen"
    });

    expect(characterCreation.route).toEqual({ screen: "character_creation" });
    expect(mainMenuAppReducer(characterCreation, { type: "profile_ready", profile: lifeProfile }).route).toEqual({ screen: "life_simulation" });
    expect(mainMenuAppReducer(characterCreation, { type: "profile_ready", profile: completedProfile }).route).toEqual({ screen: "outgame_home" });
  });
});
