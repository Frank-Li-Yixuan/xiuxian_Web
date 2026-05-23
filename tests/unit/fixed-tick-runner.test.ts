import { describe, expect, it } from "vitest";

import { FixedTickRunner } from "../../src/sim/FixedTickRunner";
import { FRAME_MS, SIM_FPS, framesToSeconds, secondsToFrames } from "../../src/sim/SimConstants";

describe("FixedTickRunner", () => {
  it("uses a fixed 60 FPS frame model", () => {
    expect(SIM_FPS).toBe(60);
    expect(FRAME_MS).toBeCloseTo(1000 / 60);
    expect(secondsToFrames(1)).toBe(60);
    expect(framesToSeconds(120)).toBe(2);
  });

  it("steps one deterministic frame at a time", () => {
    const frames: number[] = [];
    const runner = new FixedTickRunner((tick) => {
      frames.push(tick.frame);
      expect(tick.deltaFrames).toBe(1);
      expect(tick.simFps).toBe(60);
    });

    expect(runner.currentFrame).toBe(0);
    expect(runner.stepOneFrame()).toBe(true);
    expect(runner.stepOneFrame()).toBe(true);

    expect(frames).toEqual([0, 1]);
    expect(runner.currentFrame).toBe(2);
  });

  it("runs exactly N frames without using elapsed time", () => {
    const frames: number[] = [];
    const runner = new FixedTickRunner((tick) => {
      frames.push(tick.frame);
    }, { startFrame: 10 });

    expect(runner.runFrames(SIM_FPS)).toBe(60);
    expect(frames.at(0)).toBe(10);
    expect(frames.at(-1)).toBe(69);
    expect(runner.currentFrame).toBe(70);
  });

  it("pauses, resumes, and refuses invalid frame counts", () => {
    const frames: number[] = [];
    const runner = new FixedTickRunner((tick) => {
      frames.push(tick.frame);
    });

    runner.pause();
    expect(runner.stepOneFrame()).toBe(false);
    expect(runner.runFrames(3)).toBe(0);
    expect(frames).toEqual([]);
    expect(runner.currentFrame).toBe(0);

    runner.resume();
    expect(runner.runFrames(3)).toBe(3);
    expect(frames).toEqual([0, 1, 2]);
    expect(runner.currentFrame).toBe(3);

    expect(() => runner.runFrames(-1)).toThrow("non-negative integer");
    expect(() => runner.runFrames(1.5)).toThrow("non-negative integer");
  });
});
