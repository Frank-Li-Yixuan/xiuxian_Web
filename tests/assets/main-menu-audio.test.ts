import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { MAIN_MENU_AUDIO_ASSETS, mainMenuAudioPath } from "../../src/assets/mainMenuAudio";

describe("main menu audio assets", () => {
  it("uses a local non-empty BGM file without external URLs", () => {
    const path = mainMenuAudioPath("bgmStillnessOnTheSummit");

    expect(path).toBe(MAIN_MENU_AUDIO_ASSETS.bgmStillnessOnTheSummit);
    expect(path).not.toMatch(/^https?:\/\//);
    expect(path).toBe("/assets/audio/Stillness_on_the_Summit.mp3");

    const diskPath = join(process.cwd(), "public", path.replace(/^\//, ""));
    expect(existsSync(diskPath)).toBe(true);
    expect(statSync(diskPath).size).toBeGreaterThan(0);
  });
});
