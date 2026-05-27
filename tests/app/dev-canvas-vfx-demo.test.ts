import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DevCanvasVfxDemoScreen } from "../../src/app/screens/DevCanvasVfxDemoScreen";

describe("dev canvas VFX demo", () => {
  it("routes /dev/canvas-vfx through the React entrypoint", () => {
    const mainSource = readFileSync("src/app/main.tsx", "utf8");

    expect(mainSource).toContain("/dev/canvas-vfx");
    expect(mainSource).toContain("DevCanvasVfxDemoScreen");
  });

  it("SSR-renders the demo shell, controls, VFX asset ids, and loading state", () => {
    const markup = renderToStaticMarkup(createElement(DevCanvasVfxDemoScreen));

    expect(markup).toContain("dev-canvas-vfx-screen");
    expect(markup).toContain("Canvas Sprite VFX");
    expect(markup).toContain("vfx.explosion.small_01");
    expect(markup).toContain("vfx.lightning.chain_01");
    expect(markup).toContain("vfx.heal.green_01");
    expect(markup).toContain("vfx.shield.barrier_01");
    expect(markup).toContain("Play All");
    expect(markup).toContain("Pause");
    expect(markup).toContain("Step");
    expect(markup).toContain("Loading sprite assets");
  });
});
