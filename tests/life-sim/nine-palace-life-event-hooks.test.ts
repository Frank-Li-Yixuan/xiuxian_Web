import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  calculateNinePalaceMonthlyLifeEventWeight,
  createLifeEventContextFromNinePalace,
  createMajorChoiceContextFromNinePalace,
  createNinePalaceLifeEventSummary
} from "../../src/lifeSimulation/NinePalaceLifeEventHooks";
import { evaluateNinePalace } from "../../src/ninePalace/NinePalaceScoring";
import type { MonthlyLifeEventDefinition } from "../../src/types/life-monthly-events-types.v0.1";
import type { NinePalaceAttributes } from "../../src/types/nine-palace-fate-types.v0.1";

describe("NinePalaceLifeEventHooks", () => {
  it("raises reading and insight monthly event weights for high comprehension and inspiration", () => {
    const neutral = createLifeEventContextFromNinePalace(evaluateNinePalace(BASE_ATTRIBUTES), { ageMonths: 72 });
    const gifted = createLifeEventContextFromNinePalace(
      evaluateNinePalace({
        ...BASE_ATTRIBUTES,
        comprehension: 95,
        inspiration: 92,
        shen: 75
      }),
      { ageMonths: 72 }
    );
    const event = monthlyEvent("test_reading_insight", ["reading", "insight", "study"], [0, 215]);

    expect(calculateNinePalaceMonthlyLifeEventWeight(event, gifted)).toBeGreaterThan(
      calculateNinePalaceMonthlyLifeEventWeight(event, neutral)
    );
    expect(gifted.allTags).toEqual(expect.arrayContaining(["event:reading", "reading", "event:insight", "insight"]));
  });

  it("raises illness and short-life monthly event weights for low lifespan pressure", () => {
    const neutral = createLifeEventContextFromNinePalace(evaluateNinePalace(BASE_ATTRIBUTES), { ageMonths: 84 });
    const shortLived = createLifeEventContextFromNinePalace(
      evaluateNinePalace({
        ...BASE_ATTRIBUTES,
        comprehension: 92,
        inspiration: 90,
        fortune: 70,
        lifespan: 20
      }),
      { ageMonths: 84 }
    );
    const event = monthlyEvent("test_illness_short_life", ["illness", "short_life", "health"], [0, 215]);

    expect(calculateNinePalaceMonthlyLifeEventWeight(event, shortLived)).toBeGreaterThan(
      calculateNinePalaceMonthlyLifeEventWeight(event, neutral)
    );
    expect(shortLived.summary.majorChoiceBiasTags).toContain("derived:destinyPressureScore:high");
  });

  it("raises dream and hidden-fate monthly event weights for high inspiration", () => {
    const neutral = createLifeEventContextFromNinePalace(evaluateNinePalace(BASE_ATTRIBUTES), { ageMonths: 96 });
    const inspired = createLifeEventContextFromNinePalace(
      evaluateNinePalace({
        ...BASE_ATTRIBUTES,
        inspiration: 96,
        shen: 85,
        fortune: 80
      }),
      { ageMonths: 96 }
    );
    const event = monthlyEvent("test_dream_hidden_fate", ["dream", "hidden_fate"], [0, 215]);

    expect(calculateNinePalaceMonthlyLifeEventWeight(event, inspired)).toBeGreaterThan(
      calculateNinePalaceMonthlyLifeEventWeight(event, neutral)
    );
    expect(inspired.allTags).toEqual(expect.arrayContaining(["dream", "hidden_fate"]));
  });

  it("raises failed cultivation and reversal monthly event weights for low root bone with high heart", () => {
    const neutral = createLifeEventContextFromNinePalace(evaluateNinePalace(BASE_ATTRIBUTES), { ageMonths: 144 });
    const reversal = createLifeEventContextFromNinePalace(
      evaluateNinePalace({
        ...BASE_ATTRIBUTES,
        rootBone: 20,
        comprehension: 40,
        heart: 92,
        inspiration: 80,
        fortune: 20
      }),
      { ageMonths: 144 }
    );
    const event = monthlyEvent("test_failed_cultivation_reversal", ["failed_cultivation", "reversal"], [0, 215]);

    expect(calculateNinePalaceMonthlyLifeEventWeight(event, reversal)).toBeGreaterThan(
      calculateNinePalaceMonthlyLifeEventWeight(event, neutral)
    );
    expect(reversal.summary.majorChoiceBiasTags).toContain("derived:rebellionScore:high");
  });

  it("returns zero weight outside event age range", () => {
    const context = createLifeEventContextFromNinePalace(evaluateNinePalace(BASE_ATTRIBUTES), { ageMonths: 96 });
    const event = monthlyEvent("test_age_gate", ["reading"], [120, 215]);

    expect(calculateNinePalaceMonthlyLifeEventWeight(event, context)).toBe(0);
  });

  it("creates major choice context with high/low attributes and key derived score flags", () => {
    const evaluation = evaluateNinePalace({
      ...BASE_ATTRIBUTES,
      rootBone: 20,
      comprehension: 92,
      inspiration: 90,
      fortune: 20,
      heart: 92,
      lifespan: 20
    });

    const context = createMajorChoiceContextFromNinePalace(evaluation, {
      ageMonths: 144,
      phaseId: "juvenile",
      recentHooks: ["recent_hook"]
    });

    expect(context.recentHooks).toContain("recent_hook");
    expect(context.destinyTags).toEqual(expect.arrayContaining(["attrHigh:comprehension", "attrLow:lifespan"]));
    expect(context.rootTags).toContain("attrLow:rootBone");
    expect(context.flags).toMatchObject({
      "ninePalace.attribute.comprehension": 92,
      "ninePalace.attribute.rootBone": 20,
      "ninePalace.derived.destinyPressureScore": evaluation.derived.destinyPressureScore,
      "ninePalace.derived.lateBloomScore": evaluation.derived.lateBloomScore,
      "ninePalace.derived.rebellionScore": evaluation.derived.rebellionScore
    });
  });

  it("deep-freezes summaries, does not mutate input, and stays deterministic", () => {
    const evaluation = evaluateNinePalace({
      ...BASE_ATTRIBUTES,
      comprehension: 95,
      inspiration: 92,
      lifespan: 20
    });
    const before = structuredClone(evaluation);

    const first = createNinePalaceLifeEventSummary(evaluation);
    const second = createNinePalaceLifeEventSummary(evaluation);

    expect(evaluation).toEqual(before);
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.attributes)).toBe(true);
    expect(Object.isFrozen(first.lifeEventBiasTags)).toBe(true);
    expect(JSON.stringify(first)).not.toContain("trueName");
    expect(JSON.stringify(first)).not.toContain("hiddenInternal");
  });

  it("does not use nondeterministic or runtime side-effect APIs", () => {
    const source = readFileSync("src/lifeSimulation/NinePalaceLifeEventHooks.ts", "utf8");

    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("performance.now");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("trueName");
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

function monthlyEvent(
  id: string,
  tags: readonly string[],
  ageRangeMonths: readonly [number, number]
): MonthlyLifeEventDefinition {
  return {
    id,
    title: id,
    description: id,
    ageRangeMonths,
    category: "study",
    baseWeight: 20,
    tags,
    conditions: [],
    difficulty: 1,
    cooldownMonths: 0,
    visibleEffects: [],
    hiddenEffects: [],
    majorChoiceHooks: []
  };
}
