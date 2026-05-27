import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { DevUiAtlasScreen } from "./screens/DevUiAtlasScreen";
import { DevUiComponentsScreen } from "./screens/DevUiComponentsScreen";
import { DevUiSystemScreen } from "./screens/DevUiSystemScreen";
import { DevUiWorkbenchScreen } from "./screens/DevUiWorkbenchScreen";
import { Dev2dAssetsScreen } from "./screens/Dev2dAssetsScreen";
import { Dev3dAssetsScreen } from "./screens/Dev3dAssetsScreen";
import { Dev3dCombatLabScreen } from "./screens/Dev3dCombatLabScreen";
import { DevAudioAssetsScreen } from "./screens/DevAudioAssetsScreen";
import { DevCanvasVfxDemoScreen } from "./screens/DevCanvasVfxDemoScreen";
import { DevCombatAssetPlaygroundScreen } from "./screens/DevCombatAssetPlaygroundScreen";
import { MainMenuApp } from "./MainMenuApp";
import { VfxLabScreen } from "./vfx-lab/VfxLabScreen";
import "./main-menu.css";

const root = document.getElementById("xiuxian-game-root");
if (root === null) {
  throw new Error("Missing xiuxian-game-root mount node");
}

createRoot(root).render(
  <StrictMode>
    {window.location.pathname === "/dev/ui-atlas" ? (
      <DevUiAtlasScreen />
    ) : window.location.pathname === "/dev/2d-assets" ? (
      <Dev2dAssetsScreen />
    ) : window.location.pathname === "/dev/3d-assets" ? (
      <Dev3dAssetsScreen />
    ) : window.location.pathname === "/dev/3d-combat-lab" ? (
      <Dev3dCombatLabScreen />
    ) : window.location.pathname === "/dev/audio-assets" ? (
      <DevAudioAssetsScreen />
    ) : window.location.pathname === "/dev/canvas-vfx" ? (
      <DevCanvasVfxDemoScreen />
    ) : window.location.pathname === "/dev/combat-asset-playground" ? (
      <DevCombatAssetPlaygroundScreen />
    ) : window.location.pathname === "/dev/ui-components" ? (
      <DevUiComponentsScreen />
    ) : window.location.pathname === "/dev/ui-system" ? (
      <DevUiSystemScreen />
    ) : window.location.pathname === "/dev/ui-workbench" ? (
      <DevUiWorkbenchScreen />
    ) : window.location.pathname === "/vfx-lab" ? (
      <VfxLabScreen />
    ) : (
      <MainMenuApp />
    )}
  </StrictMode>
);
