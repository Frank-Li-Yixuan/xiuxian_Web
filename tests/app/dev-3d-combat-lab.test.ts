import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Dev3dCombatLabScreen } from "../../src/app/screens/Dev3dCombatLabScreen";

describe("dev 3D combat lab", () => {
  it("routes /dev/3d-combat-lab through the React entrypoint", () => {
    const mainSource = readFileSync("src/app/main.tsx", "utf8");

    expect(mainSource).toContain("/dev/3d-combat-lab");
    expect(mainSource).toContain("Dev3dCombatLabScreen");
  });

  it("renders a static shell with renderer controls and metrics labels", () => {
    const markup = renderToStaticMarkup(createElement(Dev3dCombatLabScreen, { enableRuntime: false }));

    expect(markup).toContain("dev-3d-combat-lab");
    expect(markup).toContain("Canvas");
    expect(markup).toContain("Experimental 3D");
    expect(markup).toContain("1000 bullet stress");
    expect(markup).toContain("FPS");
    expect(markup).toContain("Fallback");
  });

  it("keeps the experimental 3D renderer out of src/sim imports", () => {
    const renderThreeFiles = ["src/render/three/Combat3dViewState.ts", "src/render/three/Combat3dRenderer.tsx"];

    for (const file of renderThreeFiles) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source).not.toMatch(/from\s+["'][^"']*sim\//);
      expect(source).not.toMatch(/from\s+["'][^"']*app\/BrowserGameRuntime/);
    }
  });
});
