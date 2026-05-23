import { SIM_FPS, assertNonNegativeInteger } from "./SimConstants";

export interface FixedTickContext {
  readonly frame: number;
  readonly deltaFrames: 1;
  readonly simFps: typeof SIM_FPS;
}

export type FixedTickCallback = (context: FixedTickContext) => void;

export interface FixedTickRunnerOptions {
  readonly startFrame?: number;
  readonly initiallyPaused?: boolean;
}

export class FixedTickRunner {
  private frame: number;
  private isPausedValue: boolean;
  private readonly onTick: FixedTickCallback;

  public constructor(onTick: FixedTickCallback, options: FixedTickRunnerOptions = {}) {
    const startFrame = options.startFrame ?? 0;
    assertNonNegativeInteger(startFrame, "startFrame");

    this.frame = startFrame;
    this.isPausedValue = options.initiallyPaused ?? false;
    this.onTick = onTick;
  }

  public get currentFrame(): number {
    return this.frame;
  }

  public get isPaused(): boolean {
    return this.isPausedValue;
  }

  public stepOneFrame(): boolean {
    if (this.isPausedValue) {
      return false;
    }

    this.onTick({
      frame: this.frame,
      deltaFrames: 1,
      simFps: SIM_FPS
    });
    this.frame += 1;
    return true;
  }

  public runFrames(frameCount: number): number {
    assertNonNegativeInteger(frameCount, "frameCount");

    let executed = 0;
    for (let index = 0; index < frameCount; index += 1) {
      if (!this.stepOneFrame()) {
        break;
      }
      executed += 1;
    }

    return executed;
  }

  public pause(): void {
    this.isPausedValue = true;
  }

  public resume(): void {
    this.isPausedValue = false;
  }
}
