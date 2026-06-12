import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  applyAntiWeirdnessRules,
  buildDestinyEligibilityInputFromNinePalace,
  evaluateNinePalaceDestinyEligibility
} from "../../src/ninePalace/NinePalaceDestinyEngine";
import { evaluateNinePalace } from "../../src/ninePalace/NinePalaceScoring";
import type { NinePalaceAttributes } from "../../src/types/nine-palace-fate-types.v0.1";

describe("NinePalaceDestinyEngine", () => {
  it("maps nine palace evaluation into destiny v2 eligibility input", () => {
    const evaluation = evaluateNinePalace({
      ...baseAttributes(),
      comprehension: 95,
      inspiration: 95,
      shen: 70,
      fortune: 75,
      lifespan: 35
    });

    const input = buildDestinyEligibilityInputFromNinePalace(evaluation, {
      tags: ["origin:village"],
      selectedDestinyIds: ["destiny_existing"],
      selectedFlawIds: ["flaw_existing"],
      extraAttributes: { merit: 20 }
    });

    expect(input.attributes).toEqual(evaluation.attributes);
    expect(input.attributes).not.toBe(evaluation.attributes);
    expect(input.derivedScores).toEqual(evaluation.derived);
    expect(input.tags).toEqual(
      expect.arrayContaining([
        "destinyBias:heaven_jealous_talent",
        "event:reading",
        "event:insight",
        "origin:village"
      ])
    );
    expect(new Set(input.tags).size).toBe(input.tags.length);
    expect(input.selectedDestinyIds).toEqual(["destiny_existing"]);
    expect(input.selectedFlawIds).toEqual(["flaw_existing"]);
    expect(input.extraAttributes).toEqual({ merit: 20 });
  });

  it("rejects low-comprehension heaven-jealous talent and reports canonical mutation target", () => {
    const evaluation = evaluateNinePalace({
      ...baseAttributes(),
      comprehension: 40,
      inspiration: 40
    });

    const result = evaluateNinePalaceDestinyEligibility("destiny_heaven_jealous_talent", evaluation);

    expect(result.traitId).toBe("destiny_heaven_jealous_talent");
    expect(result.eligible).toBe(false);
    expect(result.supportScore).toBe(0);
    expect(result.contradictionScore).toBeGreaterThan(0);
    expect(result.mutationTarget).toBe("destiny_false_heavenly_burden");
    expect(result.explanation).toEqual(expect.arrayContaining(["anti:matched", "mutation:destiny_false_heavenly_burden"]));
  });

  it("keeps high-talent low-lifespan heaven-jealous talent through anti-weirdness flow", () => {
    const evaluation = evaluateNinePalace({
      ...baseAttributes(),
      shen: 70,
      comprehension: 95,
      inspiration: 95,
      fortune: 75,
      heart: 55,
      lifespan: 35
    });

    const eligibility = evaluateNinePalaceDestinyEligibility("destiny_heaven_jealous_talent", evaluation);
    const result = applyAntiWeirdnessRules(["destiny_heaven_jealous_talent"], evaluation);

    expect(eligibility.eligible).toBe(true);
    expect(eligibility.supportScore).toBe(90);
    expect(result.finalDestinyIds).toEqual(["destiny_heaven_jealous_talent"]);
    expect(result.rerollDestinyIds).toEqual([]);
    expect(result.mutationResults).toEqual([expect.objectContaining({ action: "keep" })]);
  });

  it("mutates illegal high-root waste-root reversal into heaven-pride under calamity", () => {
    const evaluation = evaluateNinePalace({
      ...baseAttributes(),
      shen: 70,
      rootBone: 85,
      comprehension: 90,
      inspiration: 70,
      fortune: 80,
      heart: 90,
      lifespan: 70
    });

    const result = applyAntiWeirdnessRules(["destiny_waste_root_reversal"], evaluation);

    expect(result.finalDestinyIds).toEqual(["destiny_heaven_pride_under_calamity"]);
    expect(result.rerollDestinyIds).toEqual([]);
    expect(result.mutationResults.map((mutation) => mutation.resolvedDestinyId)).toContain(
      "destiny_heaven_pride_under_calamity"
    );
    expect(result.finalDestinyIds).not.toContain("destiny_waste_root_reversal");
  });

  it("mutates cowardly supreme away when battle-nourished is selected", () => {
    const evaluation = evaluateNinePalace({
      ...baseAttributes(),
      heart: 90,
      lifespan: 80
    });

    const result = applyAntiWeirdnessRules(["destiny_cowardly_supreme", "destiny_battle_nourished"], evaluation);

    expect(result.finalDestinyIds).toContain("destiny_hidden_killer");
    expect(result.finalDestinyIds).not.toContain("destiny_cowardly_supreme");
    expect(result.mutationResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          originalDestinyId: "destiny_cowardly_supreme",
          resolvedDestinyId: "destiny_hidden_killer",
          action: "mutate"
        })
      ])
    );
  });

  it("collapses demon seed and clear glass heart into pure lotus shadow without duplicates", () => {
    const evaluation = evaluateNinePalace({
      ...baseAttributes(),
      heart: 90,
      inspiration: 75,
      shen: 75
    });

    const result = applyAntiWeirdnessRules(["destiny_demon_seed", "destiny_clear_glass_heart", "destiny_demon_seed"], evaluation);

    expect(result.finalDestinyIds).toEqual(["destiny_pure_lotus_shadow"]);
    expect(result.finalDestinyIds.filter((id) => id === "destiny_pure_lotus_shadow")).toHaveLength(1);
    expect(result.mutationResults.map((mutation) => mutation.resolvedDestinyId)).toContain("destiny_pure_lotus_shadow");
  });

  it("keeps heaven-jealous talent and thunder affinity synergy tags", () => {
    const evaluation = evaluateNinePalace({
      ...baseAttributes(),
      qi: 90,
      shen: 90,
      comprehension: 95,
      inspiration: 95,
      fortune: 85,
      heart: 55,
      lifespan: 35
    });

    const result = applyAntiWeirdnessRules(
      ["destiny_heaven_jealous_talent", "destiny_thunder_tribulation_affinity"],
      evaluation
    );

    expect(result.finalDestinyIds).toEqual([
      "destiny_heaven_jealous_talent",
      "destiny_thunder_tribulation_affinity"
    ]);
    expect(result.conflictSynergyResult.synergyTags).toEqual(["tribulation_reward_up", "thunder_omen_up"]);
    expect(result.warnings).toEqual(result.conflictSynergyResult.warnings);
  });

  it("does not mutate inputs and returns deterministic results", () => {
    const evaluation = evaluateNinePalace({
      ...baseAttributes(),
      shen: 70,
      rootBone: 85,
      comprehension: 90,
      inspiration: 70,
      fortune: 80,
      heart: 90,
      lifespan: 70
    });
    const selectionIds = ["destiny_waste_root_reversal", "destiny_waste_root_reversal"];
    const evaluationBefore = structuredClone(evaluation);
    const selectionBefore = structuredClone(selectionIds);

    const first = applyAntiWeirdnessRules(selectionIds, evaluation);
    const second = applyAntiWeirdnessRules(selectionIds, evaluation);

    expect(first).toEqual(second);
    expect(evaluation).toEqual(evaluationBefore);
    expect(selectionIds).toEqual(selectionBefore);
  });

  it("does not use nondeterministic, runtime side-effect, or hidden-name APIs", () => {
    const source = readFileSync("src/ninePalace/NinePalaceDestinyEngine.ts", "utf8");

    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("performance.now");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("trueName");
  });
});

function baseAttributes(): NinePalaceAttributes {
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
