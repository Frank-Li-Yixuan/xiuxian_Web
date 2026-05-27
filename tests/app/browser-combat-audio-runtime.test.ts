import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createBrowserGameRuntime } from "../../src/app/BrowserGameRuntime";

describe("browser combat audio runtime wiring", () => {
  it("wires combat audio as an async app-layer system with silent fallback", () => {
    const appSource = readFileSync(join(process.cwd(), "src/app/BrowserGameApp.ts"), "utf8");

    expect(appSource).toContain("loadCombatAudioAssetRegistry");
    expect(appSource).toContain("new AudioBus");
    expect(appSource).toContain("new CombatSfxMapper");
    expect(appSource).toContain("unlockCombatAudio");
    expect(appSource).toContain("combat-audio-silent-fallback");
    expect(appSource).toContain("setCombatAudioGroupVolume");
    expect(appSource).toContain("setCombatAudioGroupMuted");
  });

  it("keeps audio runtime state out of BrowserGameRuntime snapshots and SimState", () => {
    const runtime = createBrowserGameRuntime({ mode: "single_player", seed: 20260523 });
    const snapshot = runtime.step([]);

    expect(Object.keys(snapshot)).not.toEqual(expect.arrayContaining(["audioBus", "sfxMapper", "cueQueue"]));
    expect(Object.keys(snapshot.simState)).not.toEqual(expect.arrayContaining(["audioBus", "sfxMapper", "cueQueue", "combatAudio"]));
    expect(snapshot.presentation.visualEvents).toBeDefined();
  });
});
