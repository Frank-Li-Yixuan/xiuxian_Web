import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import worldEventRulesData from "../../data/world/world_event_rules.v0.1.json";
import worldFactionsData from "../../data/world/world_factions.v0.1.json";
import worldGlossaryData from "../../data/world/world_glossary.v0.1.json";
import worldRegionsData from "../../data/world/world_regions.v0.1.json";
import {
  createWorldbuildingRegistry,
  loadWorldbuildingRegistry,
  validateWorldbuildingData
} from "../../src/world/WorldbuildingRegistry";

describe("WorldbuildingRegistry", () => {
  it("loads checked-in WORLD v0.1 data into stable lookup registries", () => {
    const registry = loadWorldbuildingRegistry();

    expect(registry.layers).toHaveLength(5);
    expect(registry.regions).toHaveLength(1);
    expect(registry.locations).toHaveLength(9);
    expect(registry.factions).toHaveLength(8);
    expect(registry.eventRules.truthLevels).toHaveLength(6);
    expect(registry.eventRules.ageRestrictions).toHaveLength(4);
    expect(registry.getForbiddenModernTerms()).toHaveLength(11);
    expect(registry.getLocation("loc_qingshi_village").tags).toContain("village");
    expect(registry.getFaction("faction_qingyun_sect").tags).toContain("qingyun_sect");
    expect(Object.isFrozen(registry.locations)).toBe(true);
    expect(Object.isFrozen(registry.getLocation("loc_qingshi_village"))).toBe(true);
    expect(Object.isFrozen(registry.getForbiddenModernTerms())).toBe(true);
  });

  it("returns age-gated truth levels and gameplay interludes", () => {
    const registry = loadWorldbuildingRegistry();

    expect(registry.getAllowedTruthLevelsForAge(24)).toEqual(["mundane", "anomalous", "dream"]);
    expect(registry.getAllowedGameplayInterludesForAge(24)).toEqual(["none"]);
    expect(registry.getAllowedTruthLevelsForAge(60)).toEqual(["mundane", "anomalous", "dream", "trial"]);
    expect(registry.getAllowedGameplayInterludesForAge(60)).toEqual(["stg_short_dream", "deckbuilder_trial"]);
    expect(registry.getAllowedTruthLevelsForAge(168)).toEqual([
      "mundane",
      "anomalous",
      "dream",
      "trial",
      "combat",
      "system_omen"
    ]);
    expect(registry.getAllowedGameplayInterludesForAge(168)).toEqual(["stg", "horde", "deckbuilder", "autochess"]);
  });

  it("throws readable errors for missing lookups, missing files, and uncovered ages", () => {
    const registry = loadWorldbuildingRegistry();

    expect(() => registry.getLocation("missing_location")).toThrow("Missing world location: missing_location");
    expect(() => registry.getFaction("missing_faction")).toThrow("Missing world faction: missing_faction");
    expect(() => registry.getAllowedTruthLevelsForAge(-1)).toThrow("ageMonths must be a non-negative integer");
    expect(() => registry.getAllowedGameplayInterludesForAge(216)).toThrow(
      "Missing world age restriction for ageMonths: 216"
    );
    expect(() =>
      createWorldbuildingRegistry({
        regions: cloneWorldbuildingData().regions,
        eventRules: cloneWorldbuildingData().eventRules,
        glossary: cloneWorldbuildingData().glossary
      })
    ).toThrow("Missing worldbuilding data file: world_factions");
  });

  it("fails validation when required fields are missing", () => {
    const invalid = cloneWorldbuildingData();
    delete (invalid.regions.locations[0] as Record<string, unknown>).layer;

    const issues = validateWorldbuildingData(invalid);

    expect(issues).toEqual(
      expect.arrayContaining([expect.stringContaining("world_regions.locations[0].layer must not be empty")])
    );
    expect(() => createWorldbuildingRegistry(invalid)).toThrow("Worldbuilding data validation failed");
  });

  it("validates duplicate ids, references, age ranges, and glossary content", () => {
    const invalid = cloneWorldbuildingData();
    invalid.regions.locations[1].id = invalid.regions.locations[0].id;
    invalid.regions.locations[2].layer = "missing_layer";
    invalid.factions.factions[1].id = invalid.factions.factions[0].id;
    invalid.eventRules.ageRestrictions[0].ageRangeMonths = [47, 0];
    invalid.eventRules.ageRestrictions[1].allowedTruthLevels = ["missing_truth"];
    invalid.eventRules.hiddenNameLeakForbidden = false;
    invalid.glossary.toneRules = [];

    const issues = validateWorldbuildingData(invalid as never);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`duplicate world location id: ${invalid.regions.locations[0].id}`),
        expect.stringContaining("world_regions.locations[2].layer references unknown layer: missing_layer"),
        expect.stringContaining(`duplicate world faction id: ${invalid.factions.factions[0].id}`),
        expect.stringContaining("world_event_rules.ageRestrictions[0].ageRangeMonths min must be <= max"),
        expect.stringContaining(
          "world_event_rules.ageRestrictions[1].allowedTruthLevels[0] references unknown truth level: missing_truth"
        ),
        expect.stringContaining("world_event_rules.hiddenNameLeakForbidden must be true"),
        expect.stringContaining("world_glossary.toneRules must contain at least one string")
      ])
    );
  });

  it("does not use Math.random in the worldbuilding registry", () => {
    const source = readFileSync("src/world/WorldbuildingRegistry.ts", "utf8");

    expect(source).not.toContain("Math.random");
  });
});

function cloneWorldbuildingData(): any {
  return {
    regions: structuredClone(worldRegionsData),
    factions: structuredClone(worldFactionsData),
    eventRules: structuredClone(worldEventRulesData),
    glossary: structuredClone(worldGlossaryData)
  };
}
