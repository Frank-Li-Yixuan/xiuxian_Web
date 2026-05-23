export const SIM_FPS = 60 as const;
export const FRAME_MS = 1000 / SIM_FPS;

export function secondsToFrames(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new Error("secondsToFrames seconds must be a non-negative finite number");
  }

  return Math.round(seconds * SIM_FPS);
}

export function framesToSeconds(frames: number): number {
  assertNonNegativeInteger(frames, "frames");
  return frames / SIM_FPS;
}

export function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
}
