import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { loadDestinyV2Registry } from "../../src/destinyV2/DestinyV2Registry";
import { evaluateDestinyEligibility } from "../../src/destinyV2/DestinyEligibilityEvaluator";
import { evaluateNinePalace } from "../../src/ninePalace/NinePalaceScoring";
import type {
  DestinyDefinitionV2,
  DestinyEligibilityEvaluationInput
} from "../../src/types/destiny-eligibility-types.v0.1";
import type { NinePalaceAttributes } from "../../src/types/nine-palace-fate-types.v0.1";

describe("DestinyEligibilityEvaluator", () => {
  it("rejects heaven-jealous talent when low comprehension and low inspiration hit anti rules", () => {
    const registry = loadDestinyV2Registry();
    const input = buildEligibilityInput({
      jing: 60,
      qi: 60,
      shen: 60,
      rootBone: 60,
      comprehension: 40,
      inspiration: 40,
      fortune: 60,
      heart: 60,
      lifespan: 60
    });

    const result = evaluateDestinyEligibility(input, registry.getDestiny("destiny_heaven_jealous_talent"));

    expect(result.destinyId).toBe("destiny_heaven_jealous_talent");
    expect(result.eligible).toBe(false);
    expect(result.supportLevel).toBe("none");
    expect(result.antiMatched.length).toBeGreaterThan(0);
    expect(result.reasonTags).toContain("anti:matched");
    expect(result.mutationCandidate).toBe("destiny_false_heavenly_burden");
  });

  it("accepts heaven-jealous talent with high talent pressure and strong support", () => {
    const registry = loadDestinyV2Registry();
    const input = buildEligibilityInput({
      jing: 60,
      qi: 60,
      shen: 70,
      rootBone: 60,
      comprehension: 95,
      inspiration: 95,
      fortune: 75,
      heart: 55,
      lifespan: 35
    });

    const result = evaluateDestinyEligibility(input, registry.getDestiny("destiny_heaven_jealous_talent"));

    expect(result.eligible).toBe(true);
    expect(result.supportLevel).toBe("strong");
    expect(result.supportMatched.length).toBeGreaterThanOrEqual(2);
    expect(result.mutationCandidate).toBeUndefined();
  });

  it("keeps high talent eligible with weak support and reports the weak-support mutation candidate", () => {
    const registry = loadDestinyV2Registry();
    const input = buildEligibilityInput({
      jing: 60,
      qi: 60,
      shen: 70,
      rootBone: 60,
      comprehension: 90,
      inspiration: 90,
      fortune: 60,
      heart: 70,
      lifespan: 70
    });

    const result = evaluateDestinyEligibility(input, registry.getDestiny("destiny_heaven_jealous_talent"));

    expect(result.eligible).toBe(true);
    expect(result.supportLevel).toBe("weak");
    expect(result.supportMatched).toHaveLength(0);
    expect(result.reasonTags).toContain("support:weak");
    expect(result.mutationCandidate).toBe("destiny_bright_but_fragile");
  });

  it("blocks source-mutation destinies from the ordinary candidate pool", () => {
    const registry = loadDestinyV2Registry();
    const input = buildEligibilityInput(defaultAttributes());

    const result = evaluateDestinyEligibility(input, registry.getDestiny("destiny_false_heavenly_burden"));

    expect(result.eligible).toBe(false);
    expect(result.supportLevel).toBe("none");
    expect(result.antiMatched).toHaveLength(0);
    expect(result.supportMatched).toHaveLength(0);
    expect(result.reasonTags).toContain("blocked:source_mutation_only");
    expect(result.mutationCandidate).toBeUndefined();
  });

  it("accepts waste-root reversal under low root bone and high heart conditions", () => {
    const registry = loadDestinyV2Registry();
    const input = buildEligibilityInput({
      jing: 60,
      qi: 45,
      shen: 70,
      rootBone: 20,
      comprehension: 85,
      inspiration: 75,
      fortune: 30,
      heart: 92,
      lifespan: 70
    });

    const result = evaluateDestinyEligibility(input, registry.getDestiny("destiny_waste_root_reversal"));

    expect(result.eligible).toBe(true);
    expect(result.supportLevel).toBe("normal");
    expect(result.antiMatched).toHaveLength(0);
    expect(result.mutationCandidate).toBeUndefined();
  });

  it("rejects original waste-root reversal when high root, comprehension, and fortune hit anti rules", () => {
    const registry = loadDestinyV2Registry();
    const input = buildEligibilityInput({
      jing: 60,
      qi: 60,
      shen: 70,
      rootBone: 85,
      comprehension: 90,
      inspiration: 70,
      fortune: 80,
      heart: 90,
      lifespan: 70
    });

    const result = evaluateDestinyEligibility(input, registry.getDestiny("destiny_waste_root_reversal"));

    expect(result.eligible).toBe(false);
    expect(result.supportLevel).toBe("none");
    expect(result.antiMatched.length).toBeGreaterThan(0);
    expect(result.mutationCandidate).toBe("destiny_heaven_pride_under_calamity");
  });

  it("supports tag, id, flaw, sumAttrs, extra attr, and nested all expressions deterministically", () => {
    const destiny = createExpressionCoverageDestiny();
    const input = buildEligibilityInput(defaultAttributes(), {
      tags: ["origin:village", "merit"],
      selectedDestinyIds: ["destiny_heaven_jealous_talent"],
      selectedFlawIds: ["flaw_short_life_flame"],
      extraAttributes: {
        merit: 25,
        karma: 0
      }
    });
    const before = structuredClone(input);

    const first = evaluateDestinyEligibility(input, destiny);
    const second = evaluateDestinyEligibility(input, destiny);

    expect(first).toEqual(second);
    expect(input).toEqual(before);
    expect(first.eligible).toBe(true);
    expect(first.supportLevel).toBe("normal");
    expect(first.supportMatched).toHaveLength(1);
    expect(first.reasonTags).toEqual(
      expect.arrayContaining(["base:any_matched", "base:all_matched", "support:normal"])
    );
  });

  it("does not use nondeterministic or runtime side-effect APIs in the evaluator", () => {
    const source = readFileSync("src/destinyV2/DestinyEligibilityEvaluator.ts", "utf8");

    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("performance.now");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("trueName");
  });
});

function buildEligibilityInput(
  attributes: NinePalaceAttributes,
  overrides: Partial<DestinyEligibilityEvaluationInput> = {}
): DestinyEligibilityEvaluationInput {
  const evaluation = evaluateNinePalace(attributes);
  return {
    attributes: evaluation.attributes,
    derivedScores: evaluation.derived,
    tags: [
      ...evaluation.tags.destinyBiasTags,
      ...evaluation.tags.lifeEventBiasTags,
      ...evaluation.tags.hiddenFateBiasTags,
      ...evaluation.tags.rootBiasTags,
      ...evaluation.tags.modeBiasTags,
      ...(overrides.tags ?? [])
    ],
    ...(overrides.selectedDestinyIds !== undefined ? { selectedDestinyIds: overrides.selectedDestinyIds } : {}),
    ...(overrides.selectedFlawIds !== undefined ? { selectedFlawIds: overrides.selectedFlawIds } : {}),
    ...(overrides.extraAttributes !== undefined ? { extraAttributes: overrides.extraAttributes } : {})
  };
}

function defaultAttributes(): NinePalaceAttributes {
  return {
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
}

function createExpressionCoverageDestiny(): DestinyDefinitionV2 {
  return {
    id: "destiny_expression_coverage",
    name: "Expression Coverage",
    quality: "rare",
    kind: "destiny",
    allowedSlots: ["main"],
    tags: ["test"],
    oneLine: "Test fixture",
    description: "Covers deterministic eligibility expression selectors.",
    eligibility: {
      any: [
        {
          all: [
            { tag: "origin:village" },
            { id: "destiny_heaven_jealous_talent" },
            { flaw: "flaw_short_life_flame" }
          ]
        }
      ],
      all: [
        { sumAttrs: ["comprehension", "inspiration", "merit"], gte: 140 },
        { attr: "merit", gte: 20 },
        { score: "talentScore", gte: 50 }
      ],
      supportAny: [{ tag: "merit" }],
      anti: [{ attr: "karma", gte: 10 }]
    },
    effects: {
      lifeSim: ["test"]
    }
  };
}
