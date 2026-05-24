import type { OutgameProfileState } from "../outgame/ProfileState";
import type { SaveSlotMode } from "../save/SaveSlotService";

export type MainMenuRoute =
  | { readonly screen: "main_menu" }
  | { readonly screen: "save_slots"; readonly mode: SaveSlotMode }
  | { readonly screen: "settings" }
  | { readonly screen: "outgame_home" }
  | { readonly screen: "combat" };

export interface MainMenuAppState {
  readonly route: MainMenuRoute;
  readonly canContinue: boolean;
  readonly activeProfile: OutgameProfileState | null;
}

export type MainMenuAppAction =
  | { readonly type: "open_save_slots"; readonly mode: SaveSlotMode }
  | { readonly type: "open_settings" }
  | { readonly type: "return_to_main_menu"; readonly hasAnySave: boolean }
  | { readonly type: "profile_ready"; readonly profile: OutgameProfileState }
  | { readonly type: "enter_combat" };

export interface CreateInitialMainMenuAppStateOptions {
  readonly hasAnySave: boolean;
}

export function createInitialMainMenuAppState(options: CreateInitialMainMenuAppStateOptions): MainMenuAppState {
  return {
    route: { screen: "main_menu" },
    canContinue: options.hasAnySave,
    activeProfile: null
  };
}

export function mainMenuAppReducer(state: MainMenuAppState, action: MainMenuAppAction): MainMenuAppState {
  switch (action.type) {
    case "open_save_slots":
      return {
        ...state,
        route: { screen: "save_slots", mode: action.mode }
      };
    case "open_settings":
      return {
        ...state,
        route: { screen: "settings" }
      };
    case "return_to_main_menu":
      return {
        ...state,
        route: { screen: "main_menu" },
        canContinue: action.hasAnySave
      };
    case "profile_ready":
      return {
        ...state,
        route: { screen: "outgame_home" },
        canContinue: true,
        activeProfile: action.profile
      };
    case "enter_combat":
      return {
        ...state,
        route: { screen: "combat" }
      };
  }
}
