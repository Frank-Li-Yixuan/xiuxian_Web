import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { MainMenuApp } from "./MainMenuApp";
import "./main-menu.css";

const root = document.getElementById("xiuxian-game-root");
if (root === null) {
  throw new Error("Missing xiuxian-game-root mount node");
}

createRoot(root).render(
  <StrictMode>
    <MainMenuApp />
  </StrictMode>
);
