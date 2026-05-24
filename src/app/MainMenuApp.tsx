import { useEffect, useMemo, useReducer, useState, type ReactElement } from "react";

import { loadGeneratedUiAssets, type GeneratedUiAssetRegistry } from "../assets/generatedUiAssets";
import { loadMainMenuAssets, type MainMenuAssetRegistry } from "../assets/mainMenuAssets";
import {
  createInitialMainMenuAppState,
  mainMenuAppReducer,
  type MainMenuAppAction,
  type MainMenuAppState
} from "./MainMenuAppState";
import { createSaveSlotService } from "../save/SaveSlotService";
import { CombatScreen } from "./screens/CombatScreen";
import { MainMenuScreen } from "./screens/MainMenuScreen";
import { OutgameHomeScreen } from "./screens/OutgameHomeScreen";
import { SaveSlotScreen } from "./screens/SaveSlotScreen";
import { SettingsScreen } from "./screens/SettingsScreen";

export function MainMenuApp(): ReactElement {
  const saveService = useMemo(() => createSaveSlotService(), []);
  const [assets, setAssets] = useState<MainMenuAssetRegistry | null>(null);
  const [generatedUiAssets, setGeneratedUiAssets] = useState<GeneratedUiAssetRegistry | null>(null);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [state, dispatch] = useReducer(
    (current: MainMenuAppState, action: MainMenuAppAction) => mainMenuAppReducer(current, action),
    createInitialMainMenuAppState({ hasAnySave: saveService.hasAnySave() })
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadMainMenuAssets(), loadGeneratedUiAssets()])
      .then(([loadedAssets, loadedGeneratedUiAssets]) => {
        if (!cancelled) {
          setAssets(loadedAssets);
          setGeneratedUiAssets(loadedGeneratedUiAssets);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setAssetError(error instanceof Error ? error.message : "Failed to load UI assets");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (assetError !== null) {
    return <main className="main-menu-fallback">资产加载失败：{assetError}</main>;
  }
  if (assets === null || generatedUiAssets === null) {
    return <main className="main-menu-fallback">载入中...</main>;
  }

  switch (state.route.screen) {
    case "main_menu":
      return (
        <MainMenuScreen
          assets={assets}
          canContinue={state.canContinue}
          onContinue={() => dispatch({ type: "open_save_slots", mode: "continue" })}
          onExit={() => window.close()}
          onNewGame={() => dispatch({ type: "open_save_slots", mode: "new" })}
          onSettings={() => dispatch({ type: "open_settings" })}
        />
      );
    case "save_slots":
      return (
        <SaveSlotScreen
          assets={assets}
          generatedUiAssets={generatedUiAssets}
          mode={state.route.mode}
          service={saveService}
          onBack={() => dispatch({ type: "return_to_main_menu", hasAnySave: saveService.hasAnySave() })}
          onProfileReady={(profile) => dispatch({ type: "profile_ready", profile })}
        />
      );
    case "settings":
      return <SettingsScreen assets={assets} onClose={() => dispatch({ type: "return_to_main_menu", hasAnySave: saveService.hasAnySave() })} />;
    case "outgame_home":
      if (state.activeProfile === null) {
        return <MainMenuScreen assets={assets} canContinue={state.canContinue} onContinue={() => dispatch({ type: "open_save_slots", mode: "continue" })} onExit={() => window.close()} onNewGame={() => dispatch({ type: "open_save_slots", mode: "new" })} onSettings={() => dispatch({ type: "open_settings" })} />;
      }
      return (
        <OutgameHomeScreen
          assets={assets}
          profile={state.activeProfile}
          onBackToMainMenu={() => dispatch({ type: "return_to_main_menu", hasAnySave: saveService.hasAnySave() })}
          onEnterCombat={() => dispatch({ type: "enter_combat" })}
        />
      );
    case "combat":
      return <CombatScreen />;
  }
}
