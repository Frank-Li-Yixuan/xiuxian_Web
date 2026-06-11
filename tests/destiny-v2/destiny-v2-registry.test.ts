import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import conflictSynergyMutationRulesData from "../../data/destiny_v2/conflict_synergy_mutation_rules.v0.1.json";
import coreDestinyDefinitionsData from "../../data/destiny_v2/core_destiny_definitions.v0.1.json";
import lifeManifestationHooksData from "../../data/destiny_v2/life_manifestation_hooks.v0.1.json";
import modeProjectionHooksData from "../../data/destiny_v2/mode_projection_hooks.v0.1.json";
import {
  createDestinyV2Registry,
  loadDestinyV2Registry,
  validateDestinyV2Data
} from "../../src/destinyV2/DestinyV2Registry";

describe("DestinyV2Registry", () => {
  it("loads checked-in DEM v0.1 data into stable lookup registries", () => {
    const registry = loadDestinyV2Registry();

    expect(registry.destinies).toHaveLength(39);
    expect(registry.hardConflicts).toHaveLength(5);
    expect(registry.softConflicts).toHaveLength(3);
    expect(registry.synergies).toHaveLength(6);
    expect(Object.keys(registry.phaseManifestationRules)).toHaveLength(5);
    expect(registry.destinyManifestations).toHaveLength(5);
    expect(registry.modeProjections).toHaveLength(6);
    expect(registry.getDestiny("destiny_heaven_jealous_talent").quality).toBe("heaven");
    expect(registry.getDestiny("destiny_false_heavenly_burden").kind).toBe("mutated");
    expect(registry.getDestiniesForSlot("main").every((destiny) => destiny.allowedSlots.includes("main"))).toBe(true);
    expect(registry.getManifestation("destiny_heaven_jealous_talent").events).toHaveLength(4);
    expect(registry.getModeProjection("destiny_heaven_jealous_talent").outerBattlefield).toContain(
      "first_insight_quality_plus_1"
    );
    expect(Object.isFrozen(registry.destinies)).toBe(true);
    expect(Object.isFrozen(registry.getDestiny("destiny_heaven_jealous_talent"))).toBe(true);
    expect(Object.isFrozen(registry.getModeProjection("destiny_heaven_jealous_talent"))).toBe(true);
  });

  it("throws readable errors for missing lookups and missing data files", () => {
    const registry = loadDestinyV2Registry();

    expect(() => registry.getDestiny("missing_destiny")).toThrow("Missing destiny v2 definition: missing_destiny");
    expect(() => registry.getManifestation("missing_destiny")).toThrow(
      "Missing destiny v2 manifestation: missing_destiny"
    );
    expect(() => registry.getModeProjection("missing_destiny")).toThrow(
      "Missing destiny v2 mode projection: missing_destiny"
    );
    expect(() =>
      createDestinyV2Registry({
        conflictSynergyMutationRules: cloneDestinyV2Data().conflictSynergyMutationRules,
        lifeManifestationHooks: cloneDestinyV2Data().lifeManifestationHooks,
        modeProjectionHooks: cloneDestinyV2Data().modeProjectionHooks
      })
    ).toThrow("Missing destiny v2 data file: core_destiny_definitions");
  });

  it("validates duplicate ids, mutation targets, conflict and synergy references", () => {
    const invalid = cloneDestinyV2Data();
    invalid.coreDestinyDefinitions.destinies[1].id = invalid.coreDestinyDefinitions.destinies[0].id;
    invalid.coreDestinyDefinitions.destinies[0].mutation.antiResult = "missing_destiny";
    invalid.conflictSynergyMutationRules.hardConflicts[0].a = "missing_hard_conflict_destiny";
    invalid.conflictSynergyMutationRules.synergies[0].ids[0] = "missing_synergy_destiny";

    const issues = validateDestinyV2Data(invalid as never);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`duplicate destiny v2 id: ${invalid.coreDestinyDefinitions.destinies[0].id}`),
        expect.stringContaining(
          "core_destiny_definitions.destinies[0].mutation.antiResult references missing destiny id: missing_destiny"
        ),
        expect.stringContaining(
          "conflict_synergy_mutation_rules.hardConflicts[0].a references missing destiny id: missing_hard_conflict_destiny"
        ),
        expect.stringContaining(
          "conflict_synergy_mutation_rules.synergies[0].ids[0] references missing destiny id: missing_synergy_destiny"
        )
      ])
    );
  });

  it("validates manifestation phases, mode projection references, and eligibility expressions", () => {
    const invalid = cloneDestinyV2Data();
    invalid.lifeManifestationHooks.destinyManifestations[0].events[0].phase = "missing_phase";
    invalid.modeProjectionHooks.projections[0].destinyId = "missing_projection_destiny";
    invalid.coreDestinyDefinitions.destinies[0].eligibility.any[0].score = "missing_score";
    invalid.coreDestinyDefinitions.destinies[0].eligibility.any[1].attr = "missing_attr";
    invalid.coreDestinyDefinitions.destinies[0].eligibility.anti[2].id = "missing_expression_destiny";

    const issues = validateDestinyV2Data(invalid as never);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "life_manifestation_hooks.destinyManifestations[0].events[0].phase references unknown phase: missing_phase"
        ),
        expect.stringContaining(
          "mode_projection_hooks.projections[0].destinyId references missing destiny id: missing_projection_destiny"
        ),
        expect.stringContaining(
          "core_destiny_definitions.destinies[0].eligibility.any[0].score references unknown derived score: missing_score"
        ),
        expect.stringContaining(
          "core_destiny_definitions.destinies[0].eligibility.any[1].attr references unknown attribute: missing_attr"
        ),
        expect.stringContaining(
          "core_destiny_definitions.destinies[0].eligibility.anti[2].id references missing destiny id: missing_expression_destiny"
        )
      ])
    );
  });

  it("does not use nondeterministic or runtime side-effect APIs in the registry", () => {
    const source = readFileSync("src/destinyV2/DestinyV2Registry.ts", "utf8");

    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("performance.now");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("fetch(");
  });
});

function cloneDestinyV2Data(): any {
  return {
    coreDestinyDefinitions: structuredClone(coreDestinyDefinitionsData),
    conflictSynergyMutationRules: structuredClone(conflictSynergyMutationRulesData),
    lifeManifestationHooks: structuredClone(lifeManifestationHooksData),
    modeProjectionHooks: structuredClone(modeProjectionHooksData)
  };
}
