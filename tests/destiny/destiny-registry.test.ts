import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import conflictSynergyRulesData from "../../data/destiny/conflict_synergy_rules.v0.1.json";
import destinyTraitsData from "../../data/destiny/destiny_traits.v0.1.json";
import qualityTablesData from "../../data/destiny/quality_tables.v0.1.json";
import rerollRulesData from "../../data/destiny/reroll_rules.v0.1.json";
import {
  createDestinyRegistry,
  loadDestinyRegistry,
  validateDestinyData
} from "../../src/characterCreation/destiny/DestinyRegistry";
import type { DestinyTraitDefinition } from "../../src/types/destiny-types.v0.1";

describe("DestinyRegistry", () => {
  it("loads current destiny data into stable lookup registries", () => {
    const registry = loadDestinyRegistry();

    expect(registry.traits).toHaveLength(42);
    expect(registry.qualities).toHaveLength(8);
    expect(registry.exclusiveRules).toHaveLength(5);
    expect(registry.synergyRules).toHaveLength(7);
    expect(registry.conflictRules).toHaveLength(2);
    expect(registry.rerollRules.initialLocks).toBe(2);
    expect(registry.getTrait("destiny_heaven_jealous_talent").quality).toBe("heavenly");
    expect(registry.getQuality("heavenly").rank).toBe(6);
    expect(registry.getTraitsForSlot("main").every((trait) => trait.slotTypes.includes("main"))).toBe(true);
    expect(registry.getTraitsForSlot("flaw").every((trait) => trait.quality === "flaw")).toBe(true);
    expect(Object.isFrozen(registry.traits)).toBe(true);
    expect(Object.isFrozen(registry.getTrait("destiny_heaven_jealous_talent"))).toBe(true);
  });

  it("throws readable errors for missing lookup ids and missing data files", () => {
    const registry = loadDestinyRegistry();

    expect(() => registry.getTrait("missing_trait")).toThrow("Missing destiny trait: missing_trait");
    expect(() => registry.getQuality("flaw")).toThrow("Missing destiny quality table entry: flaw");
    expect(() =>
      createDestinyRegistry({
        destinyTraits: cloneDestinyData().destinyTraits,
        conflictSynergyRules: cloneDestinyData().conflictSynergyRules,
        rerollRules: cloneDestinyData().rerollRules
      })
    ).toThrow("Missing destiny data file: quality_tables");
  });

  it("validates trait ids, quality ids, slot types, weights, and flaw semantics", () => {
    const invalid = cloneDestinyData();
    invalid.destinyTraits.traits[0].id = "";
    invalid.destinyTraits.traits[1].id = invalid.destinyTraits.traits[2].id;
    invalid.destinyTraits.traits[3].quality = "impossible";
    invalid.destinyTraits.traits[4].slotTypes = ["boss"];
    invalid.destinyTraits.traits[5].baseWeight = 0;
    const flaw = invalid.destinyTraits.traits.find((trait: DestinyTraitDefinition) => trait.quality === "flaw");
    if (flaw === undefined) {
      throw new Error("test fixture expected at least one flaw trait");
    }
    flaw.slotTypes = ["main"];
    delete flaw.calamitySeverity;

    const issues = validateDestinyData(invalid as never);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("destiny_traits.traits[0].id must not be empty"),
        expect.stringContaining(`duplicate destiny trait id: ${invalid.destinyTraits.traits[2].id}`),
        expect.stringContaining("destiny_traits.traits[3].quality references unknown quality: impossible"),
        expect.stringContaining("destiny_traits.traits[4].slotTypes[0] is not a legal destiny slot type: boss"),
        expect.stringContaining("destiny_traits.traits[5].baseWeight must be > 0"),
        expect.stringContaining(`${flaw.id} with quality flaw must only use slotTypes [flaw]`),
        expect.stringContaining(`${flaw.id} with quality flaw must define a legal calamitySeverity`)
      ])
    );
  });

  it("validates quality tables, rule references, conflict tags, and reroll rules", () => {
    const invalid = cloneDestinyData();
    invalid.qualityTables.qualities[1].id = invalid.qualityTables.qualities[0].id;
    invalid.qualityTables.qualities[2].rank = invalid.qualityTables.qualities[0].rank;
    invalid.qualityTables.qualities[3].positiveBudget = [8, 4];
    invalid.qualityTables.qualityWeights.main.missing_quality = 5;
    invalid.conflictSynergyRules.exclusiveRules[0].traits[0] = "missing_trait";
    invalid.conflictSynergyRules.synergyRules[0].traits = ["destiny_heaven_jealous_talent"];
    invalid.conflictSynergyRules.conflictRules[0].tags = ["fire"];
    invalid.rerollRules.lockableFields = ["spiritualRoot", "missingLock"];
    invalid.rerollRules.fateMeter.thresholdBoost = 13;
    invalid.rerollRules.fateMeter.thresholdGuaranteeRare = 12;

    const issues = validateDestinyData(invalid as never);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`duplicate destiny quality id: ${invalid.qualityTables.qualities[0].id}`),
        expect.stringContaining(`duplicate destiny quality rank: ${invalid.qualityTables.qualities[0].rank}`),
        expect.stringContaining("quality_tables.qualities[3].positiveBudget min must be <= max"),
        expect.stringContaining("quality_tables.qualityWeights.main.missing_quality references unknown quality"),
        expect.stringContaining("conflict_synergy_rules.exclusiveRules[0].traits[0] references unknown trait id: missing_trait"),
        expect.stringContaining("conflict_synergy_rules.synergyRules[0].traits must contain at least two trait ids"),
        expect.stringContaining("conflict_synergy_rules.conflictRules[0].tags must contain at least two tags"),
        expect.stringContaining("reroll_rules.lockableFields[1] is not a supported lockable field: missingLock"),
        expect.stringContaining("reroll_rules.fateMeter.thresholdBoost must be <= thresholdGuaranteeRare")
      ])
    );
    expect(() => createDestinyRegistry(invalid as never)).toThrow("Destiny data validation failed");
  });

  it("does not use Math.random in the destiny registry", () => {
    const source = readFileSync("src/characterCreation/destiny/DestinyRegistry.ts", "utf8");

    expect(source).not.toContain("Math.random");
  });
});

function cloneDestinyData(): any {
  return {
    qualityTables: structuredClone(qualityTablesData),
    destinyTraits: structuredClone(destinyTraitsData),
    conflictSynergyRules: structuredClone(conflictSynergyRulesData),
    rerollRules: structuredClone(rerollRulesData)
  };
}
