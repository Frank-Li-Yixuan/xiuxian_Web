import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { NinePalaceAttributes } from "../../src/types/nine-palace-fate-types.v0.1";
import { evaluateNinePalace } from "../../src/ninePalace/NinePalaceScoring";

describe("evaluateNinePalace", () => {
  it("computes three powers, derived scores, and destiny tags from checked-in formulas", () => {
    const result = evaluateNinePalace({
      ...BASE_ATTRIBUTES,
      comprehension: 95,
      inspiration: 95,
      shen: 70,
      fortune: 75,
      lifespan: 45
    });

    expect(result.threePowers.heaven).toBe(90);
    expect(result.derived.talentScore).toBe(90);
    expect(result.tags.lifeEventBiasTags).toEqual(
      expect.arrayContaining(["event:reading", "event:insight", "event:dream", "event:hidden_fate"])
    );
    expect(result.tags.destinyBiasTags).toContain("destinyBias:heaven_jealous_talent");
  });

  it("uses inverse attributes for high destiny pressure", () => {
    const result = evaluateNinePalace({
      ...BASE_ATTRIBUTES,
      comprehension: 92,
      inspiration: 90,
      fortune: 70,
      lifespan: 20,
      heart: 60
    });

    expect(result.derived.destinyPressureScore).toBe(86);
    expect(result.tags.lifeEventBiasTags).toEqual(
      expect.arrayContaining(["event:illness", "event:blood_cough", "event:heaven_attention"])
    );
    expect(result.tags.modeBiasTags).toContain("mode:heaven_pressure_high");
  });

  it("scores late bloom and rebellion routes from their formula inputs", () => {
    const lateBloom = evaluateNinePalace({
      ...BASE_ATTRIBUTES,
      lifespan: 100,
      heart: 92,
      rootBone: 80,
      comprehension: 60
    });
    const rebellion = evaluateNinePalace({
      ...BASE_ATTRIBUTES,
      rootBone: 20,
      comprehension: 40,
      heart: 92,
      inspiration: 80,
      fortune: 20
    });

    expect(lateBloom.derived.lateBloomScore).toBe(90);
    expect(lateBloom.tags.modeBiasTags).toContain("mode:late_bloom_bias");
    expect(rebellion.derived.rebellionScore).toBe(91);
    expect(rebellion.tags.rootBiasTags).toContain("root:blocked_bias");
    expect(rebellion.tags.modeBiasTags).toContain("mode:counter_fate_bias");
  });

  it("computes wuxing inclination and safe root/hidden/mode bias tags", () => {
    const result = evaluateNinePalace({
      ...BASE_ATTRIBUTES,
      inspiration: 95,
      fortune: 90,
      qi: 80,
      shen: 90,
      heart: 85
    });

    expect(result.wuxing.thunder).toBe(88);
    expect(result.wuxing.yin).toBe(90);
    expect(result.tags.rootBiasTags).toEqual(expect.arrayContaining(["root:thunder_bias", "root:yin_bias"]));
    expect(result.tags.hiddenFateBiasTags).toEqual(
      expect.arrayContaining(["hiddenFate:thunder_bias", "hiddenFate:yin_bias"])
    );
    expect(result.tags.modeBiasTags).toContain("mode:thunder_trial_bias");
    expect(JSON.stringify(result)).not.toContain("trueName");
  });

  it("does not mutate input and returns deterministic results", () => {
    const input = {
      ...BASE_ATTRIBUTES,
      rootBone: 20,
      heart: 90,
      inspiration: 82,
      fortune: 20
    };
    const before = structuredClone(input);

    const first = evaluateNinePalace(input);
    const second = evaluateNinePalace(input);

    expect(input).toEqual(before);
    expect(first).toEqual(second);
    expect(first.attributes).toEqual(before);
    expect(first.attributes).not.toBe(input);
  });

  it("throws readable errors for missing, non-finite, and out-of-range attributes", () => {
    expect(() => evaluateNinePalace({ ...BASE_ATTRIBUTES, qi: Number.NaN })).toThrow(
      "Nine palace attribute qi must be a finite integer"
    );
    expect(() => evaluateNinePalace({ ...BASE_ATTRIBUTES, rootBone: 0 })).toThrow(
      "Nine palace attribute rootBone must be in range 1..120"
    );
    expect(() => evaluateNinePalace({ ...BASE_ATTRIBUTES, lifespan: 121 })).toThrow(
      "Nine palace attribute lifespan must be in range 1..120"
    );
    const missing = { ...BASE_ATTRIBUTES } as Partial<NinePalaceAttributes>;
    delete missing.shen;
    expect(() => evaluateNinePalace(missing as NinePalaceAttributes)).toThrow(
      "Missing nine palace attribute: shen"
    );
  });

  it("does not use nondeterministic or runtime side-effect APIs", () => {
    const source = readFileSync("src/ninePalace/NinePalaceScoring.ts", "utf8");

    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("performance.now");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("fetch(");
  });
});

const BASE_ATTRIBUTES: NinePalaceAttributes = {
  jing: 60,
  qi: 60,
  shen: 60,
  rootBone: 60,
  comprehension: 60,
  inspiration: 60,
  fortune: 60,
  heart: 60,
  lifespan: 60
};
