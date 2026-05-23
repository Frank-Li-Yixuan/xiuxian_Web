import { describe, expect, it } from "vitest";

import { advanceFixedStepLoop, createFixedStepLoopState } from "../../src/app/FixedBrowserLoop";

describe("fixed browser gameplay loop", () => {
  it("runs 60 gameplay ticks over one real second even when RAF is much faster", () => {
    let state = createFixedStepLoopState();
    let ticks = 0;

    for (let callback = 0; callback <= 241; callback += 1) {
      const result = advanceFixedStepLoop(state, (callback * 1000) / 241);
      ticks += result.ticksToRun;
      state = result.state;
    }

    expect(ticks).toBe(60);
  });

  it("drops excess catch-up work after a long browser pause", () => {
    let state = createFixedStepLoopState();
    state = advanceFixedStepLoop(state, 0).state;

    const result = advanceFixedStepLoop(state, 1000);

    expect(result.ticksToRun).toBe(5);
    expect(result.droppedMs).toBeGreaterThan(900);
    expect(result.state.accumulatedMs).toBe(0);
  });
});
