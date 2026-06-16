import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import eventCatalogData from "../../data/life_interludes/interlude_event_catalog.v0.1.json";
import frequencyBudgetData from "../../data/life_interludes/interlude_frequency_budget.v0.1.json";
import modeDefinitionsData from "../../data/life_interludes/interlude_mode_definitions.v0.1.json";
import resultWritebackRulesData from "../../data/life_interludes/interlude_result_writeback_rules.v0.1.json";
import triggerRulesData from "../../data/life_interludes/interlude_trigger_rules.v0.1.json";
import {
  createLifeInterludeRegistry,
  loadLifeInterludeRegistry,
  validateLifeInterludeData
} from "../../src/lifeInterludes/LifeInterludeRegistry";

describe("LifeInterludeRegistry", () => {
  it("loads checked-in LPI v0.1 data into stable lookup registries", () => {
    const registry = loadLifeInterludeRegistry();

    expect(registry.listModes()).toHaveLength(5);
    expect(registry.listInterludes()).toHaveLength(5);
    expect(registry.resultWritebackRules).toHaveLength(5);
    expect(registry.getMode("stg").displayName).toBe("雷霆战机式试炼");
    expect(registry.getInterlude("interlude_rainy_back_mountain").mode).toBe("stg");
    const thunderSuccessEffects = registry.getWritebackRule("writeback_thunder_back_mountain").outcomes.success;
    expect(thunderSuccessEffects).toBeDefined();
    expect(thunderSuccessEffects).toHaveLength(4);
    expect(registry.getFrequencyBudget().targetManualPlayableInterludes.target).toBe(9);
    expect(registry.triggerRules.modePreferenceRules).toHaveLength(4);
    expect(Object.isFrozen(registry.listModes())).toBe(true);
    expect(Object.isFrozen(registry.getMode("stg"))).toBe(true);
    expect(Object.isFrozen(registry.getInterlude("interlude_rainy_back_mountain").ageRange)).toBe(true);
    expect(Object.isFrozen(thunderSuccessEffects?.[0])).toBe(true);
  });

  it("throws readable errors for missing lookup ids and missing data files", () => {
    const registry = loadLifeInterludeRegistry();

    expect(() => registry.getMode("missing_mode")).toThrow("Missing life interlude mode: missing_mode");
    expect(() => registry.getInterlude("missing_interlude")).toThrow("Missing life interlude: missing_interlude");
    expect(() => registry.getWritebackRule("missing_writeback")).toThrow(
      "Missing life interlude writeback rule: missing_writeback"
    );
    expect(() =>
      createLifeInterludeRegistry({
        modeDefinitions: cloneLifeInterludeData().modeDefinitions,
        eventCatalog: cloneLifeInterludeData().eventCatalog,
        resultWritebackRules: cloneLifeInterludeData().resultWritebackRules,
        frequencyBudget: cloneLifeInterludeData().frequencyBudget
      })
    ).toThrow("Missing life interlude data file: interlude_trigger_rules");
  });

  it("fails validation for duplicate mode, interlude, and writeback ids", () => {
    const invalid = cloneLifeInterludeData();
    invalid.modeDefinitions.modes[1].id = invalid.modeDefinitions.modes[0].id;
    invalid.eventCatalog.interludes[1].id = invalid.eventCatalog.interludes[0].id;
    invalid.resultWritebackRules.rules[1].id = invalid.resultWritebackRules.rules[0].id;

    const issues = validateLifeInterludeData(invalid);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`duplicate life interlude mode id: ${invalid.modeDefinitions.modes[0].id}`),
        expect.stringContaining(`duplicate life interlude id: ${invalid.eventCatalog.interludes[0].id}`),
        expect.stringContaining(`duplicate life interlude writeback rule id: ${invalid.resultWritebackRules.rules[0].id}`)
      ])
    );
    expect(() => createLifeInterludeRegistry(invalid)).toThrow("Life interlude data validation failed");
  });

  it("fails validation when interludes reference missing mode or writeback rules", () => {
    const invalid = cloneLifeInterludeData();
    invalid.eventCatalog.interludes[0].mode = "missing_mode";
    invalid.eventCatalog.interludes[1].resultWritebackId = "missing_writeback";

    expect(validateLifeInterludeData(invalid)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("interlude_event_catalog.interludes[0].mode references missing mode: missing_mode"),
        expect.stringContaining(
          "interlude_event_catalog.interludes[1].resultWritebackId references missing writeback rule: missing_writeback"
        )
      ])
    );
  });

  it("fails validation for malformed interlude ages, modes, difficulty, reality, outcomes, and effects", () => {
    const invalid = cloneLifeInterludeData();
    invalid.eventCatalog.interludes[0].ageRange = [120, 60];
    invalid.eventCatalog.interludes[1].difficultyTier = "impossible";
    invalid.eventCatalog.interludes[2].realityLayer = "impossible";
    invalid.resultWritebackRules.rules[0].outcomes.impossible = [];
    invalid.resultWritebackRules.rules[1].outcomes.success[0].type = "impossible";

    const issues = validateLifeInterludeData(invalid);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("interlude_event_catalog.interludes[0].ageRange min must be <= max"),
        expect.stringContaining("interlude_event_catalog.interludes[1].difficultyTier is not legal: impossible"),
        expect.stringContaining("interlude_event_catalog.interludes[2].realityLayer is not legal: impossible"),
        expect.stringContaining("interlude_result_writeback_rules.rules[0].outcomes.impossible is not legal"),
        expect.stringContaining("interlude_result_writeback_rules.rules[1].outcomes.success[0].type is not legal: impossible")
      ])
    );
  });

  it("fails validation for malformed trigger rules and frequency budgets", () => {
    const invalid = cloneLifeInterludeData();
    invalid.triggerRules.modePreferenceRules[0].mode = "missing_mode";
    invalid.triggerRules.ageHardRules[0].ageMonths = [48, 0];
    invalid.triggerRules.ageHardRules[1].allowedModes = ["missing_mode"];
    invalid.triggerRules.ageHardRules[2].maxDifficulty = "impossible";
    invalid.frequencyBudget.agePhaseBudgets[0].ageMonths = [47, 0];
    invalid.frequencyBudget.agePhaseBudgets[1].allowedModes = ["missing_mode"];
    invalid.frequencyBudget.agePhaseBudgets[2].maxDifficulty = "impossible";
    invalid.frequencyBudget.fatigue[0].recentPlayableInterludesLast24Months = [3, 1];
    invalid.frequencyBudget.autoResolveRules.manualMaxOutcome = "impossible";

    const issues = validateLifeInterludeData(invalid);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("interlude_trigger_rules.modePreferenceRules[0].mode references missing mode: missing_mode"),
        expect.stringContaining("interlude_trigger_rules.ageHardRules[0].ageMonths min must be <= max"),
        expect.stringContaining("interlude_trigger_rules.ageHardRules[1].allowedModes[0] references missing mode: missing_mode"),
        expect.stringContaining("interlude_trigger_rules.ageHardRules[2].maxDifficulty is not legal: impossible"),
        expect.stringContaining("interlude_frequency_budget.agePhaseBudgets[0].ageMonths min must be <= max"),
        expect.stringContaining("interlude_frequency_budget.agePhaseBudgets[1].allowedModes[0] references missing mode: missing_mode"),
        expect.stringContaining("interlude_frequency_budget.agePhaseBudgets[2].maxDifficulty is not legal: impossible"),
        expect.stringContaining(
          "interlude_frequency_budget.fatigue[0].recentPlayableInterludesLast24Months min must be <= max"
        ),
        expect.stringContaining("interlude_frequency_budget.autoResolveRules.manualMaxOutcome is not legal: impossible")
      ])
    );
  });

  it("does not use nondeterministic or runtime side-effect APIs in the registry", () => {
    const source = readFileSync("src/lifeInterludes/LifeInterludeRegistry.ts", "utf8");

    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("performance.now");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("localStorage");
  });
});

function cloneLifeInterludeData(): any {
  return {
    modeDefinitions: structuredClone(modeDefinitionsData),
    triggerRules: structuredClone(triggerRulesData),
    eventCatalog: structuredClone(eventCatalogData),
    resultWritebackRules: structuredClone(resultWritebackRulesData),
    frequencyBudget: structuredClone(frequencyBudgetData)
  };
}
