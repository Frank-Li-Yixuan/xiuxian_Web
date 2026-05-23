import { describe, expect, it } from "vitest";

import {
  InputButtonBit,
  createEmptyFrameInput,
  deriveButtonTransitions,
  hasInputButton
} from "../../src/sim/input/FrameInput";
import { InputBuffer } from "../../src/sim/input/InputBuffer";

describe("FrameInput", () => {
  it("defines stable spell, pill, interact, focus, confirm, and cancel bitmasks", () => {
    expect(InputButtonBit.Spell1).toBe(1 << 0);
    expect(InputButtonBit.Spell4).toBe(1 << 3);
    expect(InputButtonBit.Pill1).toBe(1 << 4);
    expect(InputButtonBit.Pill3).toBe(1 << 6);
    expect(InputButtonBit.Interact).toBe(1 << 7);
    expect(InputButtonBit.Focus).toBe(1 << 8);
    expect(InputButtonBit.Confirm).toBe(1 << 9);
    expect(InputButtonBit.Cancel).toBe(1 << 10);
  });

  it("creates neutral default input and derives pressed/released masks", () => {
    const input = createEmptyFrameInput(12, "p1", 7);

    expect(input).toEqual({
      frame: 12,
      playerId: "p1",
      moveX: 0,
      moveY: 0,
      downMask: 0,
      pressedMask: 0,
      releasedMask: 0,
      inputSeq: 7
    });

    const transitions = deriveButtonTransitions(
      InputButtonBit.Spell1 | InputButtonBit.Focus,
      InputButtonBit.Focus | InputButtonBit.Pill1
    );

    expect(hasInputButton(transitions.pressedMask, InputButtonBit.Pill1)).toBe(true);
    expect(hasInputButton(transitions.releasedMask, InputButtonBit.Spell1)).toBe(true);
    expect(hasInputButton(transitions.pressedMask, InputButtonBit.Focus)).toBe(false);
  });
});

describe("InputBuffer", () => {
  it("schedules local input for current frame plus inputDelayFrames", () => {
    const buffer = new InputBuffer({ inputDelayFrames: 4, playerIds: ["p1", "p2"] });

    const scheduled = buffer.submitLocalInput(100, {
      playerId: "p1",
      moveX: 1,
      moveY: -1,
      downMask: InputButtonBit.Spell1 | InputButtonBit.Focus,
      pressedMask: InputButtonBit.Spell1,
      releasedMask: 0,
      inputSeq: 42
    });

    expect(scheduled.frame).toBe(104);
    expect(buffer.getInput(104, "p1")).toEqual(scheduled);
    expect(buffer.getInput(100, "p1")).toEqual(createEmptyFrameInput(100, "p1"));
  });

  it("returns deterministic player-ordered frame inputs and fills missing frames with defaults", () => {
    const buffer = new InputBuffer({ inputDelayFrames: 2, playerIds: ["p2", "p1"] });

    buffer.setRemoteInput({
      frame: 12,
      playerId: "p1",
      moveX: -1,
      moveY: 0,
      downMask: InputButtonBit.Pill2,
      pressedMask: InputButtonBit.Pill2,
      releasedMask: 0,
      inputSeq: 9
    });

    expect(buffer.getFrameInputs(12)).toEqual([
      createEmptyFrameInput(12, "p2"),
      {
        frame: 12,
        playerId: "p1",
        moveX: -1,
        moveY: 0,
        downMask: InputButtonBit.Pill2,
        pressedMask: InputButtonBit.Pill2,
        releasedMask: 0,
        inputSeq: 9
      }
    ]);
  });

  it("validates delay, frame, axes, and masks", () => {
    expect(() => new InputBuffer({ inputDelayFrames: -1, playerIds: ["p1"] })).toThrow("non-negative integer");
    expect(() => new InputBuffer({ inputDelayFrames: 1.5, playerIds: ["p1"] })).toThrow("non-negative integer");
    expect(() => new InputBuffer({ inputDelayFrames: 1, playerIds: [] })).toThrow("at least one player");

    const buffer = new InputBuffer({ inputDelayFrames: 0, playerIds: ["p1"] });

    expect(() =>
      buffer.submitLocalInput(-1, {
        playerId: "p1",
        moveX: 0,
        moveY: 0,
        downMask: 0,
        pressedMask: 0,
        releasedMask: 0,
        inputSeq: 0
      })
    ).toThrow("currentSimFrame must be a non-negative integer");

    expect(() =>
      buffer.setRemoteInput({
        frame: 0,
        playerId: "p1",
        moveX: 2 as -1,
        moveY: 0,
        downMask: 0,
        pressedMask: 0,
        releasedMask: 0,
        inputSeq: 0
      })
    ).toThrow("moveX must be -1, 0, or 1");
  });
});
