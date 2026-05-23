export interface FixedStepLoopState {
  readonly lastTimestampMs: number | undefined;
  readonly accumulatedMs: number;
}

export interface FixedStepAdvanceResult {
  readonly state: FixedStepLoopState;
  readonly ticksToRun: number;
  readonly droppedMs: number;
}

export interface FixedStepLoopOptions {
  readonly tickMs?: number;
  readonly maxTicksPerFrame?: number;
}

export const BROWSER_FIXED_TICK_MS = 1000 / 60;
export const BROWSER_MAX_CATCH_UP_TICKS = 5;

const EPSILON_MS = 1e-7;

export function createFixedStepLoopState(): FixedStepLoopState {
  return {
    lastTimestampMs: undefined,
    accumulatedMs: 0
  };
}

export function advanceFixedStepLoop(
  state: FixedStepLoopState,
  timestampMs: number,
  options: FixedStepLoopOptions = {}
): FixedStepAdvanceResult {
  const tickMs = options.tickMs ?? BROWSER_FIXED_TICK_MS;
  const maxTicksPerFrame = options.maxTicksPerFrame ?? BROWSER_MAX_CATCH_UP_TICKS;
  if (!Number.isFinite(timestampMs)) {
    throw new Error("timestampMs must be finite");
  }
  if (!Number.isFinite(tickMs) || tickMs <= 0) {
    throw new Error("tickMs must be positive");
  }
  if (!Number.isInteger(maxTicksPerFrame) || maxTicksPerFrame <= 0) {
    throw new Error("maxTicksPerFrame must be a positive integer");
  }
  if (state.lastTimestampMs === undefined) {
    return {
      state: {
        lastTimestampMs: timestampMs,
        accumulatedMs: 0
      },
      ticksToRun: 0,
      droppedMs: 0
    };
  }

  const deltaMs = Math.max(0, timestampMs - state.lastTimestampMs);
  const accumulatedMs = state.accumulatedMs + deltaMs;
  const availableTicks = Math.floor((accumulatedMs + EPSILON_MS) / tickMs);
  const ticksToRun = Math.min(availableTicks, maxTicksPerFrame);
  const droppedMs = availableTicks > maxTicksPerFrame ? accumulatedMs - ticksToRun * tickMs : 0;
  const remainingMs = availableTicks > maxTicksPerFrame ? 0 : accumulatedMs - ticksToRun * tickMs;

  return {
    state: {
      lastTimestampMs: timestampMs,
      accumulatedMs: Math.max(0, remainingMs)
    },
    ticksToRun,
    droppedMs: Math.max(0, droppedMs)
  };
}
