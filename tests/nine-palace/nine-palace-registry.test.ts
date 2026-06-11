import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import attributeCorrelationRulesData from "../../data/fate_matrix/attribute_correlation_rules.v0.1.json";
import attributeEventBiasRulesData from "../../data/fate_matrix/attribute_event_bias_rules.v0.1.json";
import destinyEligibilityRulesData from "../../data/fate_matrix/destiny_eligibility_rules.v0.1.json";
import generationAlgorithmUpgradeRulesData from "../../data/fate_matrix/generation_algorithm_upgrade_rules.v0.1.json";
import nineAttributesData from "../../data/fate_matrix/nine_attributes.v0.1.json";
import threePowersYinyangWuxingData from "../../data/fate_matrix/three_powers_yinyang_wuxing.v0.1.json";
import {
  createNinePalaceRegistry,
  loadNinePalaceRegistry,
  validateNinePalaceData
} from "../../src/ninePalace/NinePalaceRegistry";

describe("NinePalaceRegistry", () => {
  it("loads checked-in NPF v0.1 data into stable lookup registries", () => {
    const registry = loadNinePalaceRegistry();

    expect(registry.attributes).toHaveLength(9);
    expect(registry.ratingBands).toHaveLength(7);
    expect(registry.threePowers).toHaveLength(3);
    expect(registry.derivedScores).toHaveLength(6);
    expect(registry.wuxingMappings).toHaveLength(7);
    expect(registry.destinyEligibilityRules).toHaveLength(17);
    expect(registry.generationGuidelines).toHaveLength(7);
    expect(registry.antiWeirdnessRules).toHaveLength(4);
    expect(registry.attributeEventBiasRules).toHaveLength(10);
    expect(registry.generationAlgorithmRules.algorithmSteps).toHaveLength(10);
    expect(registry.getAttribute("jing").primaryElements).toContain("earth");
    expect(registry.getThreePower("heaven").attrs).toContain("comprehension");
    expect(registry.getDerivedScore("talentScore").formula.comprehension).toBe(0.5);
    expect(registry.getWuxingMapping("thunder").attrs).toContain("inspiration");
    expect(registry.getDestinyEligibilityRule("destiny_heaven_jealous_talent").ifContradictedMutateTo).toBe(
      "destiny_false_heaven_burden"
    );
    expect(registry.getRatingBand(90)).toMatchObject({ min: 90, max: 100 });
    expect(registry.listDestinyEligibilityRules()).toHaveLength(17);
    expect(Object.isFrozen(registry.attributes)).toBe(true);
    expect(Object.isFrozen(registry.getAttribute("jing"))).toBe(true);
    expect(Object.isFrozen(registry.getRatingBand(90))).toBe(true);
  });

  it("throws readable errors for missing lookups, invalid ratings, and missing files", () => {
    const registry = loadNinePalaceRegistry();

    expect(() => registry.getAttribute("missing_attribute" as never)).toThrow(
      "Missing nine palace attribute: missing_attribute"
    );
    expect(() => registry.getThreePower("missing_power" as never)).toThrow("Missing three power: missing_power");
    expect(() => registry.getDerivedScore("missing_score")).toThrow("Missing derived fate score: missing_score");
    expect(() => registry.getWuxingMapping("missing_element" as never)).toThrow(
      "Missing wuxing mapping: missing_element"
    );
    expect(() => registry.getDestinyEligibilityRule("missing_trait")).toThrow(
      "Missing destiny eligibility rule: missing_trait"
    );
    expect(() => registry.getRatingBand(0)).toThrow("Missing nine palace rating band for value: 0");
    expect(() => registry.getRatingBand(1.5)).toThrow("rating value must be an integer");
    expect(() =>
      createNinePalaceRegistry({
        nineAttributes: cloneNinePalaceData().nineAttributes,
        destinyEligibilityRules: cloneNinePalaceData().destinyEligibilityRules,
        attributeCorrelationRules: cloneNinePalaceData().attributeCorrelationRules,
        attributeEventBiasRules: cloneNinePalaceData().attributeEventBiasRules,
        generationAlgorithmUpgradeRules: cloneNinePalaceData().generationAlgorithmUpgradeRules
      })
    ).toThrow("Missing nine palace data file: three_powers_yinyang_wuxing");
  });

  it("fails validation when required fields are missing", () => {
    const invalid = cloneNinePalaceData();
    delete (invalid.nineAttributes.attributes[0] as Record<string, unknown>).palace;

    const issues = validateNinePalaceData(invalid);

    expect(issues).toEqual(
      expect.arrayContaining([expect.stringContaining("nine_attributes.attributes[0].palace must not be empty")])
    );
    expect(() => createNinePalaceRegistry(invalid)).toThrow("Nine palace data validation failed");
  });

  it("validates duplicate ids, references, rating bands, formulas, and mutation targets", () => {
    const invalid = cloneNinePalaceData();
    invalid.nineAttributes.attributes[1].id = invalid.nineAttributes.attributes[0].id;
    invalid.nineAttributes.ratingBands[1].min = invalid.nineAttributes.ratingBands[0].max;
    invalid.threePowersYinyangWuxing.threePowers.heaven.attrs = ["missing_attribute"];
    invalid.threePowersYinyangWuxing.derivedScores.talentScore.formula.missing_score = 1;
    invalid.destinyEligibilityRules.traits[1].id = invalid.destinyEligibilityRules.traits[0].id;
    invalid.destinyEligibilityRules.traits[0].ifContradictedMutateTo = "missing_trait";
    invalid.attributeCorrelationRules.antiWeirdnessRules[0].mutation = "missing_trait";
    invalid.attributeEventBiasRules.rules[0].when.missingScoreGte = 80;

    const issues = validateNinePalaceData(invalid as never);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`duplicate nine palace attribute id: ${invalid.nineAttributes.attributes[0].id}`),
        expect.stringContaining("nine_attributes.ratingBands[1] overlaps nine_attributes.ratingBands[0]"),
        expect.stringContaining("three_powers_yinyang_wuxing.threePowers.heaven.attrs[0] references unknown attribute"),
        expect.stringContaining(
          "three_powers_yinyang_wuxing.derivedScores.talentScore.formula.missing_score references unknown formula input"
        ),
        expect.stringContaining(`duplicate destiny eligibility trait id: ${invalid.destinyEligibilityRules.traits[0].id}`),
        expect.stringContaining("destiny_eligibility_rules.traits[0].ifContradictedMutateTo references unknown trait"),
        expect.stringContaining(
          "attribute_correlation_rules.antiWeirdnessRules[0].mutation references unknown trait: missing_trait"
        ),
        expect.stringContaining(
          "attribute_event_bias_rules.rules[0].when.missingScoreGte references unknown condition key"
        )
      ])
    );
  });

  it("does not use nondeterministic or runtime side-effect APIs in the registry", () => {
    const source = readFileSync("src/ninePalace/NinePalaceRegistry.ts", "utf8");

    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("performance.now");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("fetch(");
  });
});

function cloneNinePalaceData(): any {
  return {
    nineAttributes: structuredClone(nineAttributesData),
    threePowersYinyangWuxing: structuredClone(threePowersYinyangWuxingData),
    destinyEligibilityRules: structuredClone(destinyEligibilityRulesData),
    attributeCorrelationRules: structuredClone(attributeCorrelationRulesData),
    attributeEventBiasRules: structuredClone(attributeEventBiasRulesData),
    generationAlgorithmUpgradeRules: structuredClone(generationAlgorithmUpgradeRulesData)
  };
}
