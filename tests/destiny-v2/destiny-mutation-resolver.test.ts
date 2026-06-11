import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { loadDestinyV2Registry, type DestinyV2Registry } from "../../src/destinyV2/DestinyV2Registry";
import { evaluateDestinyEligibility } from "../../src/destinyV2/DestinyEligibilityEvaluator";
import { resolveDestinyMutation } from "../../src/destinyV2/DestinyMutationResolver";
import { evaluateNinePalace } from "../../src/ninePalace/NinePalaceScoring";
import type {
  DestinyEligibilityEvaluationInput,
  DestinyEligibilityResult
} from "../../src/types/destiny-eligibility-types.v0.1";
import type { NinePalaceAttributes } from "../../src/types/nine-palace-fate-types.v0.1";

describe("DestinyMutationResolver", () => {
  it("mutates anti-matched heaven-jealous talent into false heavenly burden", () => {
    const registry = loadDestinyV2Registry();
    const candidate = registry.getDestiny("destiny_heaven_jealous_talent");
    const eligibility = evaluateDestinyEligibility(
      buildEligibilityInput({
        jing: 60,
        qi: 60,
        shen: 60,
        rootBone: 60,
        comprehension: 40,
        inspiration: 40,
        fortune: 60,
        heart: 60,
        lifespan: 60
      }),
      candidate
    );

    const result = resolveDestinyMutation(candidate, eligibility, { registry });

    expect(result.action).toBe("mutate");
    expect(result.reason).toBe("anti_result");
    expect(result.originalDestinyId).toBe("destiny_heaven_jealous_talent");
    expect(result.resolvedDestinyId).toBe("destiny_false_heavenly_burden");
    expect(result.resolvedDestiny?.id).toBe("destiny_false_heavenly_burden");
    expect(result.mutationDepth).toBe(1);
    expect(result.debugTags).toEqual(
      expect.arrayContaining([
        "mutation:anti_result",
        "mutation:source:destiny_heaven_jealous_talent",
        "mutation:target:destiny_false_heavenly_burden"
      ])
    );
  });

  it("mutates weak-supported heaven-jealous talent into bright but fragile", () => {
    const registry = loadDestinyV2Registry();
    const candidate = registry.getDestiny("destiny_heaven_jealous_talent");
    const eligibility = evaluateDestinyEligibility(
      buildEligibilityInput({
        jing: 60,
        qi: 60,
        shen: 70,
        rootBone: 60,
        comprehension: 90,
        inspiration: 90,
        fortune: 60,
        heart: 70,
        lifespan: 70
      }),
      candidate
    );

    const result = resolveDestinyMutation(candidate, eligibility, { registry });

    expect(result.action).toBe("mutate");
    expect(result.reason).toBe("weak_support_result");
    expect(result.resolvedDestinyId).toBe("destiny_bright_but_fragile");
    expect(result.resolvedDestiny?.kind).toBe("mutated");
  });

  it("mutates anti-matched waste-root reversal into heaven-pride under calamity", () => {
    const registry = loadDestinyV2Registry();
    const candidate = registry.getDestiny("destiny_waste_root_reversal");
    const eligibility = evaluateDestinyEligibility(
      buildEligibilityInput({
        jing: 60,
        qi: 60,
        shen: 70,
        rootBone: 85,
        comprehension: 90,
        inspiration: 70,
        fortune: 80,
        heart: 90,
        lifespan: 70
      }),
      candidate
    );

    const result = resolveDestinyMutation(candidate, eligibility, { registry });

    expect(result.action).toBe("mutate");
    expect(result.reason).toBe("anti_result");
    expect(result.resolvedDestinyId).toBe("destiny_heaven_pride_under_calamity");
  });

  it("mutates cowardly supreme into hidden killer through eligibility anti, not conflict engine", () => {
    const registry = loadDestinyV2Registry();
    const candidate = registry.getDestiny("destiny_cowardly_supreme");
    const eligibility = evaluateDestinyEligibility(
      buildEligibilityInput(
        {
          jing: 60,
          qi: 60,
          shen: 60,
          rootBone: 60,
          comprehension: 60,
          inspiration: 60,
          fortune: 60,
          heart: 90,
          lifespan: 80
        },
        {
          selectedDestinyIds: ["destiny_battle_nourished"]
        }
      ),
      candidate
    );

    const result = resolveDestinyMutation(candidate, eligibility, { registry });

    expect(result.action).toBe("mutate");
    expect(result.reason).toBe("anti_result");
    expect(result.resolvedDestinyId).toBe("destiny_hidden_killer");
  });

  it("keeps a strongly supported original destiny without mutation metadata", () => {
    const registry = loadDestinyV2Registry();
    const candidate = registry.getDestiny("destiny_heaven_jealous_talent");
    const eligibility = evaluateDestinyEligibility(
      buildEligibilityInput({
        jing: 60,
        qi: 60,
        shen: 70,
        rootBone: 60,
        comprehension: 95,
        inspiration: 95,
        fortune: 75,
        heart: 55,
        lifespan: 35
      }),
      candidate
    );

    const result = resolveDestinyMutation(candidate, eligibility, { registry });

    expect(result.action).toBe("keep");
    expect(result.reason).toBe("eligible_original");
    expect(result.originalDestinyId).toBe(candidate.id);
    expect(result.resolvedDestinyId).toBe(candidate.id);
    expect(result.resolvedDestiny).toEqual(candidate);
    expect(result.mutationDepth).toBe(0);
  });

  it("rerolls source mutation destinies when they are submitted as ordinary candidates", () => {
    const registry = loadDestinyV2Registry();
    const candidate = registry.getDestiny("destiny_false_heavenly_burden");
    const eligibility = evaluateDestinyEligibility(buildEligibilityInput(defaultAttributes()), candidate);

    const result = resolveDestinyMutation(candidate, eligibility, { registry });

    expect(result.action).toBe("reroll");
    expect(result.reason).toBe("source_mutation_only");
    expect(result.resolvedDestinyId).toBeUndefined();
    expect(result.resolvedDestiny).toBeUndefined();
  });

  it("rerolls when mutation candidate is missing, invalid, or over max mutation depth", () => {
    const registry = loadDestinyV2Registry();
    const candidate = registry.getDestiny("destiny_heaven_jealous_talent");
    const antiEligibility = evaluateDestinyEligibility(
      buildEligibilityInput({
        ...defaultAttributes(),
        comprehension: 40,
        inspiration: 40
      }),
      candidate
    );

    expect(
      resolveDestinyMutation(candidate, { ...antiEligibility, mutationCandidate: "missing_destiny" }, { registry }).reason
    ).toBe("missing_mutation_target");
    expect(
      resolveDestinyMutation(
        candidate,
        { ...antiEligibility, mutationCandidate: "destiny_heaven_pride_under_calamity" },
        { registry }
      ).reason
    ).toBe("invalid_mutation_source");
    expect(resolveDestinyMutation(candidate, antiEligibility, { registry, mutationDepth: 1 }).reason).toBe(
      "max_mutation_depth"
    );
  });

  it("rerolls ineligible candidates without mutation candidates", () => {
    const registry = loadDestinyV2Registry();
    const candidate = registry.getDestiny("destiny_heaven_jealous_talent");
    const eligibility: DestinyEligibilityResult = {
      destinyId: candidate.id,
      eligible: false,
      supportLevel: "none",
      antiMatched: [],
      supportMatched: [],
      reasonTags: ["base:any_missing"]
    };

    const result = resolveDestinyMutation(candidate, eligibility, { registry });

    expect(result.action).toBe("reroll");
    expect(result.reason).toBe("missing_mutation_candidate");
  });

  it("does not mutate inputs and is deterministic for repeated calls", () => {
    const registry = loadDestinyV2Registry();
    const candidate = registry.getDestiny("destiny_heaven_jealous_talent");
    const eligibility = evaluateDestinyEligibility(
      buildEligibilityInput({
        ...defaultAttributes(),
        comprehension: 40,
        inspiration: 40
      }),
      candidate
    );
    const candidateBefore = structuredClone(candidate);
    const eligibilityBefore = structuredClone(eligibility);

    const first = resolveDestinyMutation(candidate, eligibility, { registry });
    const second = resolveDestinyMutation(candidate, eligibility, { registry });

    expect(first).toEqual(second);
    expect(candidate).toEqual(candidateBefore);
    expect(eligibility).toEqual(eligibilityBefore);
  });

  it("does not use nondeterministic or runtime side-effect APIs in the resolver", () => {
    const source = readFileSync("src/destinyV2/DestinyMutationResolver.ts", "utf8");

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
