import { describe, expect, it } from "vitest";

import {
  GAMEPLAY_HASH_RNG_STREAM_NAMES,
  RUN_RNG_STREAM_NAMES,
  SeededRng,
  createRunRngStreams
} from "../../src/sim/core/SeededRng";

describe("SeededRng", () => {
  it("produces a stable golden uint32 sequence for a numeric seed", () => {
    const rng = new SeededRng(123456789);

    expect([
      rng.nextUint32(),
      rng.nextUint32(),
      rng.nextUint32(),
      rng.nextUint32(),
      rng.nextUint32()
    ]).toEqual([920370032, 3761641487, 2252023330, 1475571481, 2340457892]);
  });

  it("forks named streams deterministically without consuming the parent stream", () => {
    const rootA = new SeededRng("run-seed-001");
    const rootB = new SeededRng("run-seed-001");
    const beforeFork = rootA.getState();

    const gameplayA = rootA.fork("gameplay");
    const gameplayB = rootB.fork("gameplay");
    const stageA = rootA.fork("stage");

    expect(rootA.getState()).toEqual(beforeFork);
    expect([gameplayA.nextUint32(), gameplayA.nextUint32(), gameplayA.nextUint32()]).toEqual([
      gameplayB.nextUint32(),
      gameplayB.nextUint32(),
      gameplayB.nextUint32()
    ]);
    expect(stageA.nextUint32()).not.toBe(gameplayA.nextUint32());
  });

  it("restores a stream from getState and setState", () => {
    const rng = new SeededRng(20260522);
    rng.nextUint32();
    const checkpoint = rng.getState();
    const expected = [rng.nextUint32(), rng.nextUint32(), rng.nextUint32()];

    const restored = new SeededRng(0);
    restored.setState(checkpoint);

    expect([restored.nextUint32(), restored.nextUint32(), restored.nextUint32()]).toEqual(expected);
    expect(restored.getState().draws).toBe(checkpoint.draws + expected.length);
  });

  it("generates bounded integers, floats, and probability booleans", () => {
    const rng = new SeededRng(98765);

    for (let i = 0; i < 100; i += 1) {
      const intValue = rng.rangeInt(-2, 2);
      expect(Number.isInteger(intValue)).toBe(true);
      expect(intValue).toBeGreaterThanOrEqual(-2);
      expect(intValue).toBeLessThanOrEqual(2);

      const floatValue = rng.rangeFloat(10, 12);
      expect(floatValue).toBeGreaterThanOrEqual(10);
      expect(floatValue).toBeLessThan(12);
    }

    expect(rng.bool(0)).toBe(false);
    expect(rng.bool(1)).toBe(true);
  });

  it("picks weighted entries deterministically and rejects invalid weights", () => {
    const rng = new SeededRng(123456789);

    expect(
      rng.pickWeighted([
        { item: "zero", weight: 0 },
        { item: "low", weight: 1 },
        { item: "high", weight: 3 }
      ])
    ).toBe("low");

    expect(() => rng.pickWeighted([])).toThrow("at least one");
    expect(() => rng.pickWeighted([{ item: "bad", weight: -1 }])).toThrow("non-negative");
    expect(() => rng.pickWeighted([{ item: "none", weight: 0 }])).toThrow("positive");
  });

  it("creates the required run-level RNG streams and keeps visual out of gameplay hash streams", () => {
    const streams = createRunRngStreams("qingyun-stage-01");

    expect(Object.keys(streams).sort()).toEqual([...RUN_RNG_STREAM_NAMES].sort());
    expect(GAMEPLAY_HASH_RNG_STREAM_NAMES).toEqual([
      "gameplay",
      "stage",
      "drop",
      "reward",
      "boss",
      "tribulation"
    ]);
    expect(streams.visual.nextUint32()).not.toBe(streams.gameplay.nextUint32());
  });
});
