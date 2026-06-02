import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import backgroundOriginsData from "../../data/origin_fate/background_origins.v0.1.json";
import carriedItemsData from "../../data/origin_fate/carried_items.v0.1.json";
import generationRulesData from "../../data/origin_fate/generation_rules.v0.1.json";
import hiddenFatesData from "../../data/origin_fate/hidden_fates.v0.1.json";
import revealRulesData from "../../data/origin_fate/reveal_rules.v0.1.json";
import {
  createOriginFateRegistry,
  loadOriginFateRegistry,
  validateOriginFateData
} from "../../src/originFate/OriginFateRegistry";

describe("OriginFateRegistry", () => {
  it("loads current origin fate data into stable lookup registries", () => {
    const registry = loadOriginFateRegistry();

    expect(registry.backgroundOrigins).toHaveLength(9);
    expect(registry.hiddenFates).toHaveLength(10);
    expect(registry.carriedItems).toHaveLength(12);
    expect(registry.generationRules.pipeline).toHaveLength(6);
    expect(registry.revealRules.progressBands).toHaveLength(4);
    expect(registry.getBackgroundOrigin("origin_mountain_orphan").rarity).toBe("common");
    expect(registry.getHiddenFate("hidden_ancient_thunder_blood").category).toBe("bloodline");
    expect(registry.getCarriedItem("origin_item_broken_wooden_sword").eighteenConversion.type).toBe("artifact_clue");
    expect(registry.listBackgroundOrigins()).toBe(registry.backgroundOrigins);
    expect(registry.listHiddenFates()).toBe(registry.hiddenFates);
    expect(registry.listCarriedItems()).toBe(registry.carriedItems);
    expect(Object.isFrozen(registry.backgroundOrigins)).toBe(true);
    expect(Object.isFrozen(registry.getHiddenFate("hidden_ancient_thunder_blood"))).toBe(true);
    expect(Object.isFrozen(registry.getCarriedItem("origin_item_broken_wooden_sword").eighteenConversion)).toBe(true);
  });

  it("throws readable errors for missing lookup ids and missing data files", () => {
    const registry = loadOriginFateRegistry();

    expect(() => registry.getBackgroundOrigin("missing_origin")).toThrow("Missing background origin: missing_origin");
    expect(() => registry.getHiddenFate("missing_hidden")).toThrow("Missing hidden fate: missing_hidden");
    expect(() => registry.getCarriedItem("missing_item")).toThrow("Missing carried item: missing_item");
    expect(() =>
      createOriginFateRegistry({
        hiddenFates: cloneOriginFateData().hiddenFates,
        carriedItems: cloneOriginFateData().carriedItems,
        generationRules: cloneOriginFateData().generationRules,
        revealRules: cloneOriginFateData().revealRules
      })
    ).toThrow("Missing origin fate data file: background_origins");
  });

  it("validates ids, rarities, categories, weights, and hidden fate hints", () => {
    const invalid = cloneOriginFateData();
    invalid.backgroundOrigins.origins[0].id = "";
    invalid.backgroundOrigins.origins[1].id = invalid.backgroundOrigins.origins[2].id;
    invalid.backgroundOrigins.origins[3].rarity = "impossible";
    invalid.backgroundOrigins.origins[4].baseWeight = 0;
    invalid.hiddenFates.hiddenFates[0].category = "impossible";
    invalid.hiddenFates.hiddenFates[1].omenHints = [];
    invalid.hiddenFates.hiddenFates[2].initialProgressRange = [70, 20];
    invalid.hiddenFates.hiddenFates[3].revealThresholds.awakened = 120;
    invalid.hiddenFates.hiddenFates[4].progressSources[0].delta = Number.NaN;
    invalid.hiddenFates.hiddenFates[5].outerBattlefieldEffects[0].threshold = -1;

    const issues = validateOriginFateData(invalid as never);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("origin_fate.background_origins.origins[0].id must not be empty"),
        expect.stringContaining(`duplicate background origin id: ${invalid.backgroundOrigins.origins[2].id}`),
        expect.stringContaining("origin_fate.background_origins.origins[3].rarity is not legal: impossible"),
        expect.stringContaining("origin_fate.background_origins.origins[4].baseWeight must be > 0"),
        expect.stringContaining("origin_fate.hidden_fates.hiddenFates[0].category is not legal: impossible"),
        expect.stringContaining("origin_fate.hidden_fates.hiddenFates[1].omenHints must contain at least one hint"),
        expect.stringContaining("origin_fate.hidden_fates.hiddenFates[2].initialProgressRange min must be <= max"),
        expect.stringContaining("origin_fate.hidden_fates.hiddenFates[3].revealThresholds.awakened must stay within domain 0..100"),
        expect.stringContaining("origin_fate.hidden_fates.hiddenFates[4].progressSources[0].delta must be a finite number"),
        expect.stringContaining("origin_fate.hidden_fates.hiddenFates[5].outerBattlefieldEffects[0].threshold must stay within domain 0..100")
      ])
    );
  });

  it("validates carried item conversions and rule files", () => {
    const invalid = cloneOriginFateData();
    invalid.carriedItems.items[0].eighteenConversion.type = "impossible";
    invalid.carriedItems.items[1].eighteenConversion.label = "";
    delete invalid.carriedItems.items[2].eighteenConversion;
    invalid.generationRules.determinism.forbidMathRandom = false;
    invalid.generationRules.backgroundOrigin.count = 0;
    invalid.generationRules.hiddenFate.alwaysGenerateInternally = false;
    invalid.generationRules.carriedItems.minCount = 3;
    invalid.generationRules.carriedItems.maxCount = 2;
    invalid.revealRules.progressBands[0].id = invalid.revealRules.progressBands[1].id;
    invalid.revealRules.progressBands[2].range = [99, 70];

    const issues = validateOriginFateData(invalid as never);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("origin_fate.carried_items.items[0].eighteenConversion.type is not legal: impossible"),
        expect.stringContaining("origin_fate.carried_items.items[1].eighteenConversion.label must not be empty"),
        expect.stringContaining("origin_fate.carried_items.items[2].eighteenConversion must exist"),
        expect.stringContaining("origin_fate.generation_rules.determinism.forbidMathRandom must be true"),
        expect.stringContaining("origin_fate.generation_rules.backgroundOrigin.count must be >= 1"),
        expect.stringContaining("origin_fate.generation_rules.hiddenFate.alwaysGenerateInternally must be true"),
        expect.stringContaining("origin_fate.generation_rules.carriedItems.maxCount must be >= minCount"),
        expect.stringContaining(`duplicate origin fate progress band id: ${invalid.revealRules.progressBands[1].id}`),
        expect.stringContaining("origin_fate.reveal_rules.progressBands[2].range min must be <= max")
      ])
    );
    expect(() => createOriginFateRegistry(invalid as never)).toThrow("Origin fate data validation failed");
  });

  it("does not use Math.random in the origin fate registry", () => {
    const source = readFileSync("src/originFate/OriginFateRegistry.ts", "utf8");

    expect(source).not.toContain("Math.random");
  });
});

function cloneOriginFateData(): any {
  return {
    backgroundOrigins: structuredClone(backgroundOriginsData),
    hiddenFates: structuredClone(hiddenFatesData),
    carriedItems: structuredClone(carriedItemsData),
    generationRules: structuredClone(generationRulesData),
    revealRules: structuredClone(revealRulesData)
  };
}
