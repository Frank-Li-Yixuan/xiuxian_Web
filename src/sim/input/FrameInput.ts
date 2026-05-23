import { assertNonNegativeInteger } from "../SimConstants";

export type PlayerId = string;
export type MoveAxis = -1 | 0 | 1;
export type InputButtonMask = number;

export const InputButtonBit = {
  Spell1: 1 << 0,
  Spell2: 1 << 1,
  Spell3: 1 << 2,
  Spell4: 1 << 3,
  Pill1: 1 << 4,
  Pill2: 1 << 5,
  Pill3: 1 << 6,
  Interact: 1 << 7,
  Focus: 1 << 8,
  Confirm: 1 << 9,
  Cancel: 1 << 10
} as const;

export interface FrameInput {
  readonly frame: number;
  readonly playerId: PlayerId;
  readonly moveX: MoveAxis;
  readonly moveY: MoveAxis;
  readonly downMask: InputButtonMask;
  readonly pressedMask: InputButtonMask;
  readonly releasedMask: InputButtonMask;
  readonly inputSeq: number;
}

export interface ButtonTransitions {
  readonly pressedMask: InputButtonMask;
  readonly releasedMask: InputButtonMask;
}

export function createEmptyFrameInput(frame: number, playerId: PlayerId, inputSeq = 0): FrameInput {
  assertNonNegativeInteger(frame, "frame");
  assertNonNegativeInteger(inputSeq, "inputSeq");
  assertPlayerId(playerId);

  return {
    frame,
    playerId,
    moveX: 0,
    moveY: 0,
    downMask: 0,
    pressedMask: 0,
    releasedMask: 0,
    inputSeq
  };
}

export function deriveButtonTransitions(
  previousDownMask: InputButtonMask,
  nextDownMask: InputButtonMask
): ButtonTransitions {
  assertButtonMask(previousDownMask, "previousDownMask");
  assertButtonMask(nextDownMask, "nextDownMask");

  return {
    pressedMask: (nextDownMask & ~previousDownMask) >>> 0,
    releasedMask: (previousDownMask & ~nextDownMask) >>> 0
  };
}

export function hasInputButton(mask: InputButtonMask, button: InputButtonMask): boolean {
  assertButtonMask(mask, "mask");
  assertButtonMask(button, "button");
  return (mask & button) === button;
}

export function validateFrameInput(input: FrameInput): void {
  assertNonNegativeInteger(input.frame, "frame");
  assertNonNegativeInteger(input.inputSeq, "inputSeq");
  assertPlayerId(input.playerId);
  assertMoveAxis(input.moveX, "moveX");
  assertMoveAxis(input.moveY, "moveY");
  assertButtonMask(input.downMask, "downMask");
  assertButtonMask(input.pressedMask, "pressedMask");
  assertButtonMask(input.releasedMask, "releasedMask");
}

function assertPlayerId(playerId: PlayerId): void {
  if (playerId.length === 0) {
    throw new Error("playerId must not be empty");
  }
}

function assertMoveAxis(value: number, label: string): asserts value is MoveAxis {
  if (value !== -1 && value !== 0 && value !== 1) {
    throw new Error(`${label} must be -1, 0, or 1`);
  }
}

function assertButtonMask(value: InputButtonMask, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer bitmask`);
  }
}
