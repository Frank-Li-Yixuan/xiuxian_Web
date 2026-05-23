import { assertNonNegativeInteger } from "../SimConstants";
import {
  type FrameInput,
  type InputButtonMask,
  type MoveAxis,
  type PlayerId,
  createEmptyFrameInput,
  validateFrameInput
} from "./FrameInput";

export interface InputBufferOptions {
  readonly inputDelayFrames: number;
  readonly playerIds: readonly PlayerId[];
}

export interface LocalFrameInputDraft {
  readonly playerId: PlayerId;
  readonly moveX: MoveAxis;
  readonly moveY: MoveAxis;
  readonly downMask: InputButtonMask;
  readonly pressedMask: InputButtonMask;
  readonly releasedMask: InputButtonMask;
  readonly inputSeq: number;
}

export class InputBuffer {
  public readonly inputDelayFrames: number;
  private readonly playerIds: readonly PlayerId[];
  private readonly inputsByFrame = new Map<number, Map<PlayerId, FrameInput>>();

  public constructor(options: InputBufferOptions) {
    assertNonNegativeInteger(options.inputDelayFrames, "inputDelayFrames");
    if (options.playerIds.length === 0) {
      throw new Error("InputBuffer requires at least one player");
    }

    const seen = new Set<PlayerId>();
    for (const playerId of options.playerIds) {
      if (playerId.length === 0) {
        throw new Error("playerId must not be empty");
      }
      if (seen.has(playerId)) {
        throw new Error(`duplicate playerId: ${playerId}`);
      }
      seen.add(playerId);
    }

    this.inputDelayFrames = options.inputDelayFrames;
    this.playerIds = [...options.playerIds];
  }

  public submitLocalInput(currentSimFrame: number, input: LocalFrameInputDraft): FrameInput {
    assertNonNegativeInteger(currentSimFrame, "currentSimFrame");

    const scheduled: FrameInput = {
      frame: currentSimFrame + this.inputDelayFrames,
      playerId: input.playerId,
      moveX: input.moveX,
      moveY: input.moveY,
      downMask: input.downMask,
      pressedMask: input.pressedMask,
      releasedMask: input.releasedMask,
      inputSeq: input.inputSeq
    };

    this.setFrameInput(scheduled);
    return scheduled;
  }

  public setRemoteInput(input: FrameInput): void {
    this.setFrameInput(input);
  }

  public getInput(frame: number, playerId: PlayerId): FrameInput {
    assertNonNegativeInteger(frame, "frame");
    this.assertKnownPlayer(playerId);

    const frameInputs = this.inputsByFrame.get(frame);
    return frameInputs?.get(playerId) ?? createEmptyFrameInput(frame, playerId);
  }

  public getFrameInputs(frame: number): readonly FrameInput[] {
    assertNonNegativeInteger(frame, "frame");
    return this.playerIds.map((playerId) => this.getInput(frame, playerId));
  }

  private setFrameInput(input: FrameInput): void {
    validateFrameInput(input);
    this.assertKnownPlayer(input.playerId);

    let frameInputs = this.inputsByFrame.get(input.frame);
    if (frameInputs === undefined) {
      frameInputs = new Map<PlayerId, FrameInput>();
      this.inputsByFrame.set(input.frame, frameInputs);
    }

    frameInputs.set(input.playerId, input);
  }

  private assertKnownPlayer(playerId: PlayerId): void {
    if (!this.playerIds.includes(playerId)) {
      throw new Error(`unknown playerId: ${playerId}`);
    }
  }
}
