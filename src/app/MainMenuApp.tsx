import { useEffect, useMemo, useReducer, useRef, useState, type ReactElement } from "react";

import { loadGeneratedUiAssets, type GeneratedUiAssetRegistry } from "../assets/generatedUiAssets";
import { MAIN_MENU_AUDIO_ASSETS } from "../assets/mainMenuAudio";
import { loadMainMenuAssets, type MainMenuAssetRegistry } from "../assets/mainMenuAssets";
import { applyCharacterDraftToProfile } from "../character/CharacterProfileMapper";
import {
  createInitialMainMenuAppState,
  mainMenuAppReducer,
  type MainMenuAppAction,
  type MainMenuAppState
} from "./MainMenuAppState";
import { createSaveSlotService } from "../save/SaveSlotService";
import { CharacterCreationScreen } from "./screens/CharacterCreationScreen";
import { CombatScreen } from "./screens/CombatScreen";
import { LifeSimulationScreen } from "./screens/LifeSimulationScreen";
import { MainMenuScreen } from "./screens/MainMenuScreen";
import { OutgameHomeScreen } from "./screens/OutgameHomeScreen";
import { SaveSlotScreen } from "./screens/SaveSlotScreen";
import { SettingsScreen } from "./screens/SettingsScreen";

const BGM_VOLUME_STORAGE_KEY = "xiuxian-stg.settings.bgmVolume.v0.1";
const DEFAULT_BGM_VOLUME = 0.56;

export function MainMenuApp(): ReactElement {
  const saveService = useMemo(() => createSaveSlotService(), []);
  const [assets, setAssets] = useState<MainMenuAssetRegistry | null>(null);
  const [generatedUiAssets, setGeneratedUiAssets] = useState<GeneratedUiAssetRegistry | null>(null);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [bgmVolume, setBgmVolume] = useState(() => readInitialBgmVolume());
  const [state, dispatch] = useReducer(
    (current: MainMenuAppState, action: MainMenuAppAction) => mainMenuAppReducer(current, action),
    createInitialMainMenuAppState({ hasAnySave: saveService.hasAnySave() })
  );

  useMainMenuBgm(bgmVolume, state.route.screen !== "combat");

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
          onProfileCreated={(slotId, profile) => dispatch({ type: "profile_created", slotId, profile })}
          onProfileReady={(profile) => dispatch({ type: "profile_ready", profile })}
        />
      );
    case "character_creation":
      if (state.activeProfile === null || state.activeSaveSlotId === null) {
        return <MainMenuScreen assets={assets} canContinue={state.canContinue} onContinue={() => dispatch({ type: "open_save_slots", mode: "continue" })} onExit={() => window.close()} onNewGame={() => dispatch({ type: "open_save_slots", mode: "new" })} onSettings={() => dispatch({ type: "open_settings" })} />;
      }
      return (
        <CharacterCreationScreen
          assets={generatedUiAssets}
          slotId={state.activeSaveSlotId}
          onBack={() => dispatch({ type: "return_to_main_menu", hasAnySave: saveService.hasAnySave() })}
          onConfirmLife={(draft) => {
            if (state.activeProfile === null || state.activeSaveSlotId === null) {
              return;
            }
            const completedProfile = applyCharacterDraftToProfile({
              profile: state.activeProfile,
              draft,
              nowMs: saveService.nowMs()
            });
            saveService.writeProfile(state.activeSaveSlotId, completedProfile);
            dispatch({ type: "profile_ready", profile: completedProfile });
          }}
        />
      );
    case "settings":
      return (
        <SettingsScreen
          assets={assets}
          bgmVolume={bgmVolume}
          generatedUiAssets={generatedUiAssets}
          onBgmVolumeChange={(nextVolume) => {
            setBgmVolume(nextVolume);
            writeBgmVolume(nextVolume);
          }}
          onClose={() => dispatch({ type: "return_to_main_menu", hasAnySave: saveService.hasAnySave() })}
        />
      );
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
    case "life_simulation":
      if (state.activeProfile === null) {
        return <MainMenuScreen assets={assets} canContinue={state.canContinue} onContinue={() => dispatch({ type: "open_save_slots", mode: "continue" })} onExit={() => window.close()} onNewGame={() => dispatch({ type: "open_save_slots", mode: "new" })} onSettings={() => dispatch({ type: "open_settings" })} />;
      }
      return (
        <LifeSimulationScreen
          assets={generatedUiAssets}
          profile={state.activeProfile}
          {...(state.activeProfile.lifeSimulationState === undefined ? {} : { lifeSimulationState: state.activeProfile.lifeSimulationState })}
        />
      );
    case "combat":
      return <CombatScreen />;
  }
}

function readInitialBgmVolume(): number {
  if (typeof window === "undefined") {
    return DEFAULT_BGM_VOLUME;
  }
  const stored = window.localStorage.getItem(BGM_VOLUME_STORAGE_KEY);
  if (stored === null) {
    return DEFAULT_BGM_VOLUME;
  }
  return clampVolume(Number(stored));
}

function writeBgmVolume(volume: number): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(BGM_VOLUME_STORAGE_KEY, String(clampVolume(volume)));
}

function useMainMenuBgm(volume: number, enabled: boolean): void {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const audio = new Audio(MAIN_MENU_AUDIO_ASSETS.bgmStillnessOnTheSummit);
    audio.setAttribute("data-main-menu-bgm", "true");
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = clampVolume(volume);
    audio.style.display = "none";
    document.body.append(audio);
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.remove();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio === null || typeof window === "undefined") {
      return;
    }

    audio.volume = clampVolume(volume);

    const play = (): void => {
      if (!enabled || audio.volume <= 0) {
        return;
      }
      void audio.play().catch(() => undefined);
    };
    const unlockAudio = (): void => {
      play();
    };

    if (enabled && volume > 0) {
      play();
      window.addEventListener("pointerdown", unlockAudio, { once: true });
      window.addEventListener("keydown", unlockAudio, { once: true });
    } else {
      audio.pause();
    }

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, [enabled, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio !== null) {
      audio.volume = clampVolume(volume);
    }
  }, [volume]);
}

function clampVolume(volume: number): number {
  if (!Number.isFinite(volume)) {
    return DEFAULT_BGM_VOLUME;
  }
  return Math.min(1, Math.max(0, volume));
}
