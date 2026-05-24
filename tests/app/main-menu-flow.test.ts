import { describe, expect, it } from "vitest";

import { createInitialMainMenuAppState, mainMenuAppReducer } from "../../src/app/MainMenuAppState";
import { createDefaultProfileForSlot } from "../../src/save/ProfileFactory";

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
    const profile = createDefaultProfileForSlot({ slotId: "slot_2", nowMs: 2_000 });
    const outgame = mainMenuAppReducer(newGame, { type: "profile_ready", profile });
    const combat = mainMenuAppReducer(outgame, { type: "enter_combat" });

    expect(newGame.route).toEqual({ screen: "save_slots", mode: "new" });
    expect(settings.route).toEqual({ screen: "settings" });
    expect(mainMenuAppReducer(settings, { type: "return_to_main_menu", hasAnySave: true }).route).toEqual({ screen: "main_menu" });
    expect(outgame.route).toEqual({ screen: "outgame_home" });
    expect(outgame.activeProfile?.profileId).toBe("local_slot_2");
    expect(combat.route).toEqual({ screen: "combat" });
    expect(combat.activeProfile?.profileId).toBe("local_slot_2");
  });
});
