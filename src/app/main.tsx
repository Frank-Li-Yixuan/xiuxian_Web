import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { DevUiAtlasScreen } from "./screens/DevUiAtlasScreen";
import { DevUiComponentsScreen } from "./screens/DevUiComponentsScreen";
import { DevUiSystemScreen } from "./screens/DevUiSystemScreen";
import { DevUiWorkbenchScreen } from "./screens/DevUiWorkbenchScreen";
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
