import { describe, expect, it } from "vitest";

import attributeArchetypesData from "../../data/opening/attribute_archetypes.v0.1.json";
import generationRulesData from "../../data/opening/generation_rules.v0.1.json";
import rootElementWeightsData from "../../data/opening/root_element_weights.v0.1.json";
import spiritualRootsData from "../../data/opening/spiritual_roots.v0.1.json";
import {
  createOpeningGeneratorRegistry,
  loadOpeningGeneratorRegistry,
  validateOpeningGeneratorData
} from "../../src/opening/OpeningGeneratorRegistry";

describe("OpeningGeneratorRegistry", () => {
  it("loads current opening JSON into stable lookup registries", () => {
    const registry = loadOpeningGeneratorRegistry();

    expect(registry.attributeArchetypes).toHaveLength(10);
    expect(registry.rootCategories).toHaveLength(9);
    expect(registry.elements).toHaveLength(7);
    expect(registry.getAttributeArchetype("balanced_ordinary").weight).toBe(32);
    expect(registry.getSpiritualRootCategory("single").elementCount).toEqual([1, 1]);
    expect(registry.getElement("metal").tags).toContain("root:metal");
    expect(registry.getBaseElementWeight("metal")).toBe(18);
    expect(registry.generationRules.rng.streams).toEqual([
      "archetype",
      "aptitude",
      "coreSeed",
      "spiritualRoot",
      "elementVector",
      "drama"
    ]);
    expect(registry.rootElementWeights.relationships.generating).toContainEqual(["wood", "fire"]);
  });

  it("throws readable errors for missing lookup ids and missing data files", () => {
    const registry = loadOpeningGeneratorRegistry();

    expect(() => registry.getAttributeArchetype("missing_archetype")).toThrow(
      "Missing opening attribute archetype: missing_archetype"
    );
    expect(() => registry.getSpiritualRootCategory("missing_root_category")).toThrow(
      "Missing opening spiritual root category: missing_root_category"
    );
    expect(() => registry.getElement("missing_element")).toThrow("Missing opening element: missing_element");
    expect(() => registry.getBaseElementWeight("missing_element")).toThrow(
      "Missing opening base element weight: missing_element"
    );
    expect(() =>
      createOpeningGeneratorRegistry({
        spiritualRoots: spiritualRootsData as never,
        rootElementWeights: rootElementWeightsData as never,
        generationRules: generationRulesData as never
      })
    ).toThrow("Missing opening data file: attribute_archetypes");
  });

  it("validates weights, ranges, metric domains, element ids, and relationships", () => {
    const invalidData = cloneOpeningData();
    invalidData.attributeArchetypes.archetypes[0].weight = 0;
    invalidData.attributeArchetypes.archetypes[1].aptitudeRanges.rootBone = [70, 40];
    invalidData.spiritualRoots.rootCategories[0].metricRanges.purity = [90, 65];
    invalidData.spiritualRoots.rootCategories[1].metricRanges.conflict = [-1, 75];
    invalidData.rootElementWeights.baseElementWeights.void = 4;
    invalidData.rootElementWeights.archetypeElementModifiers.balanced_ordinary = { void: 1.2 };
    invalidData.rootElementWeights.relationships.generating[0] = ["wood", "void"];
    invalidData.rootElementWeights.relationships.controlling[0] = ["void", "earth"];
    invalidData.rootElementWeights.relationships.special[0].pair = ["yin", "void"];

    const issues = validateOpeningGeneratorData(invalidData as never);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("attribute_archetypes.archetypes[0].weight must be > 0"),
        expect.stringContaining("attribute_archetypes.archetypes[1].aptitudeRanges.rootBone min must be <= max"),
        expect.stringContaining("spiritual_roots.rootCategories[0].metricRanges.purity min must be <= max"),
        expect.stringContaining("spiritual_roots.rootCategories[1].metricRanges.conflict must stay within root metric domain 0..120"),
        expect.stringContaining("root_element_weights.baseElementWeights.void references unknown element id"),
        expect.stringContaining("root_element_weights.archetypeElementModifiers.balanced_ordinary.void references unknown element id"),
        expect.stringContaining("root_element_weights.relationships.generating[0][1] references unknown element id"),
        expect.stringContaining("root_element_weights.relationships.controlling[0][0] references unknown element id"),
        expect.stringContaining("root_element_weights.relationships.special[0].pair[1] references unknown element id")
      ])
    );
    expect(() => createOpeningGeneratorRegistry(invalidData as never)).toThrow("Opening generator data validation failed");
  });
});

function cloneOpeningData(): {
  attributeArchetypes: any;
  spiritualRoots: any;
  rootElementWeights: any;
  generationRules: any;
} {
  return {
    attributeArchetypes: structuredClone(attributeArchetypesData),
    spiritualRoots: structuredClone(spiritualRootsData),
    rootElementWeights: structuredClone(rootElementWeightsData),
    generationRules: structuredClone(generationRulesData)
  };
}
