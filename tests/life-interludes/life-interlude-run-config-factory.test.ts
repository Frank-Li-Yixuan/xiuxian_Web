import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  LIFE_INTERLUDE_RUN_CONFIG_FACTORY_SOURCE,
  LifeInterludeRunConfigFactory
} from "../../src/lifeInterludes/LifeInterludeRunConfigFactory";
import { createLifeInterludeRegistry, loadLifeInterludeRegistry } from "../../src/lifeInterludes/LifeInterludeRegistry";
import type {
  LifeInterludeCandidate,
} from "../../src/types/life-interlude-types.v0.1";
import type { LifeSimulationState } from "../../src/types/life-monthly-events-types.v0.1";
import type { MajorChoiceOptionInstance } from "../../src/types/major-life-choice-types.v0.1";
import eventCatalogData from "../../data/life_interludes/interlude_event_catalog.v0.1.json";
import frequencyBudgetData from "../../data/life_interludes/interlude_frequency_budget.v0.1.json";
import modeDefinitionsData from "../../data/life_interludes/interlude_mode_definitions.v0.1.json";
import resultWritebackRulesData from "../../data/life_interludes/interlude_result_writeback_rules.v0.1.json";
import triggerRulesData from "../../data/life_interludes/interlude_trigger_rules.v0.1.json";

describe("LifeInterludeRunConfigFactory", () => {
  it("creates deterministic frozen run configs from checked-in candidates", () => {
    const factory = new LifeInterludeRunConfigFactory();
    const input = makeInput({
      candidate: candidate("interlude_guard_medicine_field", "horde", "risky"),
      lifeSimulationState: makeLifeState({ ageMonths: 150 }),
      majorChoiceOption: makeChoiceOption({ instanceId: "choice_guard_field", tags: ["alchemy", "protect_medicine_field"] }),
      sourceThreadId: "thread_apothecary_sorting_herbs"
    });

    const first = factory.createRunConfig(input);
    const second = factory.createRunConfig(input);

    expect(first).toEqual(second);
    expect(first.interludeRunId).toContain("lpi_run_");
    expect(first.definitionId).toBe("interlude_guard_medicine_field");
    expect(first.resultWritebackId).toBe("writeback_medicine_field");
    expect(first.sourceChoiceId).toBe("choice_guard_field");
    expect(first.sourceThreadId).toBe("thread_apothecary_sorting_herbs");
    expect(first.seed).toBe("lpi-c003-seed");
    expect(first.scenario.enemyPool).toEqual(expect.arrayContaining(["horde:survival_wave", "thread:protect_medicine_field"]));
    expect(first.rewards.successEffects.length).toBeGreaterThan(0);
    expect(first.failurePolicy).toMatchObject({
      canGameOver: false,
      preserveLifeSimulation: true,
      autoResolveFallback: "success"
    });
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.scenario)).toBe(true);
    expect(Object.isFrozen(first.playerProjection.skillTags)).toBe(true);
  });

  it("changes run id when seed or candidate changes", () => {
    const factory = new LifeInterludeRunConfigFactory();
    const base = makeInput({ candidate: candidate("interlude_guard_medicine_field", "horde", "risky") });

    const first = factory.createRunConfig(base);
    const changedSeed = factory.createRunConfig({ ...base, seed: "lpi-c003-other-seed" });
    const changedCandidate = factory.createRunConfig({
      ...base,
      candidate: candidate("interlude_daoist_symbol_trial", "deckbuilder", "steady")
    });

    expect(first.interludeRunId).toBe(factory.createRunConfig(base).interludeRunId);
    expect(changedSeed.interludeRunId).not.toBe(first.interludeRunId);
    expect(changedCandidate.interludeRunId).not.toBe(first.interludeRunId);
  });

  it("keeps childhood spirit-projection STG configs short and not adult-scaled", () => {
    const factory = new LifeInterludeRunConfigFactory();
    const childhood = factory.createRunConfig(makeInput({
      candidate: candidate("interlude_rainy_back_mountain", "stg", "risky"),
      lifeSimulationState: makeLifeState({
        ageMonths: 96,
        core: { jing: 58, qi: 55, shen: 62 },
        lifeSkills: { martial: 4, survival: 5 }
      })
    }));
    const adult = factory.createRunConfig(makeInput({
      candidate: candidate("interlude_rainy_back_mountain", "stg", "risky"),
      lifeSimulationState: makeLifeState({
        ageMonths: 170,
        core: { jing: 90, qi: 92, shen: 95 },
        lifeSkills: { martial: 18, survival: 16 }
      })
    }));

    expect(childhood.durationTargetSeconds).toBeLessThanOrEqual(90);
    expect(childhood.scenario.enemyPool).toEqual(expect.arrayContaining(["stg:short_spirit_projection", "root:thunder"]));
    expect(childhood.playerProjection.maxHp).toBeLessThan(adult.playerProjection.maxHp);
    expect(childhood.playerProjection.maxHp).toBeLessThanOrEqual(90);
  });

  it("creates dangerous outer battlefield STG scenario for adolescent system-preview candidates", () => {
    const config = new LifeInterludeRunConfigFactory().createRunConfig(makeInput({
      candidate: candidate("interlude_outer_battlefield_dream", "stg", "dangerous"),
      lifeSimulationState: makeLifeState({ ageMonths: 180 }),
      majorChoiceOption: makeChoiceOption({ instanceId: "choice_system_signal", tags: ["system_static"] }),
      sourceThreadId: "thread_system_static"
    }));

    expect(config.difficultyTier).toBe("dangerous");
    expect(config.durationTargetSeconds).toBe(120);
    expect(config.scenario.enemyPool).toEqual(expect.arrayContaining(["stg:outer_battlefield_echo", "thread:system_static"]));
    expect(config.failurePolicy.canGameOver).toBe(false);
  });

  it("creates mode-specific placeholder scenarios for horde, deckbuilder, formation, and text checks", () => {
    const factory = new LifeInterludeRunConfigFactory();
    const registry = loadLifeInterludeRegistry();
    const horde = factory.createRunConfig(makeInput({
      candidate: candidate("interlude_guard_medicine_field", "horde", "risky"),
      lifeSimulationState: makeLifeState({ ageMonths: 150 })
    }));
    const deckbuilder = factory.createRunConfig(makeInput({
      candidate: candidate("interlude_daoist_symbol_trial", "deckbuilder", "steady"),
      lifeSimulationState: makeLifeState({ ageMonths: 132 })
    }));
    const formation = factory.createRunConfig(makeInput({
      candidate: candidate("interlude_ancestral_jade_board", "formation_auto", "steady"),
      lifeSimulationState: makeLifeState({ ageMonths: 150 })
    }));
    const textRegistry = makeRegistryWithTextCheck();
    const textCheck = factory.createRunConfig(makeInput({
      candidate: candidate("interlude_text_check_fixture", "text_check", "safe"),
      lifeSimulationState: makeLifeState({ ageMonths: 24 }),
      registry: textRegistry
    }));

    expect(horde.scenario.enemyPool).toEqual(expect.arrayContaining(["horde:survival_wave", "horde:protect_resource"]));
    expect(deckbuilder.scenario.cardPool).toEqual(expect.arrayContaining(["deckbuilder:question", "turns:6"]));
    expect(deckbuilder.turnLimit).toBe(6);
    expect(formation.scenario.boardPreset).toBe("formation_auto:ancestral_jade_board");
    expect(formation.scenario.cardPool).toBeUndefined();
    expect(textCheck.scenario.enemyPool).toBeUndefined();
    expect(textCheck.scenario.cardPool).toBeUndefined();
    expect(textCheck.scenario.boardPreset).toBeUndefined();
    expect(textCheck.turnLimit).toBe(0);
    for (const config of [horde, deckbuilder, formation]) {
      expect(config.resultWritebackId.length).toBeGreaterThan(0);
      expect(() => registry.getWritebackRule(config.resultWritebackId)).not.toThrow();
    }
    expect(textCheck.resultWritebackId).toBe("writeback_text_check_fixture");
    expect(() => textRegistry.getWritebackRule(textCheck.resultWritebackId)).not.toThrow();
  });

  it("creates deterministic public-safe auto-resolve fallback results without writeback effects", () => {
    const factory = new LifeInterludeRunConfigFactory();
    const config = factory.createRunConfig(makeInput({
      candidate: candidate("interlude_guard_medicine_field", "horde", "risky"),
      lifeSimulationState: makeLifeState({ ageMonths: 150 })
    }));

    const first = factory.createAutoResolveFallback({ config, seed: "fallback-seed" });
    const second = factory.createAutoResolveFallback({ config, seed: "fallback-seed" });
    const serialized = JSON.stringify(first);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      interludeRunId: config.interludeRunId,
      definitionId: config.definitionId,
      mode: config.mode,
      outcome: "partialSuccess",
      playerChoseManual: false,
      effects: [],
      generatedHooks: []
    });
    expect(first.visibleSummary).toContain("auto_resolved_placeholder");
    expect(Object.isFrozen(first)).toBe(true);
    expect(serialized).not.toContain("trueName");
    expect(serialized).not.toContain("true_name");
    expect(serialized).not.toContain("truename");
  });

  it("keeps serialized configs public-safe and avoids runtime side-effect APIs", () => {
    const config = new LifeInterludeRunConfigFactory().createRunConfig(makeInput({
      candidate: {
        ...candidate("interlude_guard_medicine_field", "horde", "risky"),
        debug: {
          source: "fixture",
          matchedTags: ["hidden:trueName:SHOULD_NOT_LEAK_HIDDEN_NAME", "alchemy"]
        }
      },
      lifeSimulationState: makeLifeState({
        flags: {
          hiddenFateInternal: "SHOULD_NOT_LEAK_HIDDEN_NAME",
          trueNameRevealed: false,
          safeFlag: "visible_safe"
        }
      }),
      majorChoiceOption: makeChoiceOption({
        tags: ["alchemy", "trueName:SHOULD_NOT_LEAK_HIDDEN_NAME"]
      })
    }));
    const serialized = JSON.stringify(config);
    const source = readFileSync("src/lifeInterludes/LifeInterludeRunConfigFactory.ts", "utf8");

    expect(serialized).not.toContain("SHOULD_NOT_LEAK_HIDDEN_NAME");
    expect(serialized).not.toContain("trueName");
    expect(serialized).not.toContain("true_name");
    expect(serialized).not.toContain("truename");
    expect(serialized).not.toContain("hiddenFateInternal");
    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("performance.now");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("localStorage");
    expect(source).not.toContain("src/sim");
  });
});

function makeInput(overrides: Partial<Parameters<LifeInterludeRunConfigFactory["createRunConfig"]>[0]> = {}) {
  return {
    lifeSimulationState: makeLifeState(),
    majorChoiceOption: makeChoiceOption(),
    candidate: candidate("interlude_guard_medicine_field", "horde", "risky"),
    seed: "lpi-c003-seed",
    ...overrides
  };
}

function candidate(
  definitionId: string,
  mode: LifeInterludeCandidate["mode"],
  difficultyTier: LifeInterludeCandidate["difficultyTier"]
): LifeInterludeCandidate {
  return {
    definitionId,
    mode,
    name: definitionId,
    difficultyTier,
    displayRisk: difficultyTier,
    worldExplanation: `${definitionId} world explanation`,
    autoResolveAllowed: true,
    finalWeight: 50,
    debug: { source: "test" }
  };
}

function makeChoiceOption(overrides: Partial<MajorChoiceOptionInstance> = {}): MajorChoiceOptionInstance {
  return {
    instanceId: "choice_instance_lpi_c003",
    definitionId: "choice_definition_lpi_c003",
    label: "Choice",
    description: "Choice description",
    riskTier: "steady",
    optionType: "steady",
    visibleHint: "Visible hint",
    successChanceLabel: "steady",
    tags: ["alchemy", "root:wood", "item:copper_furnace"],
    ...overrides
  };
}

type LifeStateOverrides = Omit<Partial<LifeSimulationState>, "core" | "aptitude" | "lifeSkills"> & {
  readonly core?: Partial<LifeSimulationState["core"]>;
  readonly aptitude?: Partial<LifeSimulationState["aptitude"]>;
  readonly lifeSkills?: Partial<LifeSimulationState["lifeSkills"]>;
};

function makeLifeState(overrides: LifeStateOverrides = {}): LifeSimulationState {
  return {
    profileId: "profile_lpi_c003",
    characterId: "character_lpi_c003",
    seed: "life-state-seed",
    rngState: {},
    ageMonths: overrides.ageMonths ?? 150,
    phaseId: overrides.phaseId ?? "youth",
    core: {
      jing: 70,
      qi: 68,
      shen: 72,
      ...(overrides.core ?? {})
    },
    aptitude: {
      rootBone: 65,
      comprehension: 70,
      inspiration: 66,
      fortune: 55,
      heart: 62,
      lifespan: 80,
      ...(overrides.aptitude ?? {})
    },
    lifeSkills: {
      study: 7,
      martial: 8,
      alchemy: 12,
      craft: 4,
      social: 3,
      stealth: 2,
      ritual: 6,
      survival: 7,
      ...(overrides.lifeSkills ?? {})
    },
    karma: overrides.karma ?? 0,
    merit: overrides.merit ?? 3,
    heartDemon: overrides.heartDemon ?? 0,
    wounds: overrides.wounds ?? [{
      id: "wound_minor_cold",
      name: "Minor cold",
      severity: 1,
      tags: ["wound:cold"],
      createdAtMonth: 80
    }],
    heartKnots: overrides.heartKnots ?? [{
      id: "knot_failed_questioning",
      name: "Failed questioning",
      severity: 1,
      tags: ["heart_knot:questioning"],
      createdAtMonth: 96
    }],
    family: overrides.family ?? {
      kinship: 50,
      familyStrain: 10,
      familyWealth: 8,
      flags: {}
    },
    relationships: overrides.relationships ?? [],
    hiddenFateProgress: overrides.hiddenFateProgress ?? {},
    carriedItemAffinity: overrides.carriedItemAffinity ?? {
      item_copper_furnace: 70,
      item_ancestral_jade: 45
    },
    flags: overrides.flags ?? {
      destiny: "destiny_alchemy_prodigy",
      root: "root:wood",
      origin: "origin:herb_shop_apprentice",
      carriedItem: "item:copper_furnace"
    },
    monthlyLogs: overrides.monthlyLogs ?? [],
    ...(overrides.ninePalaceSummary === undefined ? {} : { ninePalaceSummary: overrides.ninePalaceSummary }),
    ...(overrides.originFateNarrativeState === undefined ? {} : { originFateNarrativeState: overrides.originFateNarrativeState }),
    ...(overrides.lifeStorylineState === undefined ? {} : { lifeStorylineState: overrides.lifeStorylineState }),
    ...(overrides.pendingMajorChoice === undefined ? {} : { pendingMajorChoice: overrides.pendingMajorChoice })
  };
}

function makeRegistryWithTextCheck() {
  const bundle: any = {
    modeDefinitions: structuredClone(modeDefinitionsData),
    triggerRules: structuredClone(triggerRulesData),
    eventCatalog: structuredClone(eventCatalogData),
    resultWritebackRules: structuredClone(resultWritebackRulesData),
    frequencyBudget: structuredClone(frequencyBudgetData)
  };
  bundle.eventCatalog.interludes = [
    ...bundle.eventCatalog.interludes,
    {
      id: "interlude_text_check_fixture",
      name: "Text check fixture",
      mode: "text_check",
      realityLayer: "training",
      ageRange: [0, 215],
      baseWeight: 1,
      storylineTags: ["text_check"],
      threadTags: ["text_check"],
      difficultyTier: "safe",
      turnLimit: 0,
      description: "Text check description",
      worldExplanation: "Text check explanation",
      rewardProfileId: "reward_text_check_fixture",
      failurePolicyId: "fail_text_check_fixture",
      resultWritebackId: "writeback_text_check_fixture"
    }
  ];
  bundle.resultWritebackRules.rules = [
    ...bundle.resultWritebackRules.rules,
    {
      id: "writeback_text_check_fixture",
      outcomes: {
        success: [{ type: "addLifeLog", text: "text_check_success" }],
        failure: []
      }
    }
  ];
  return createLifeInterludeRegistry(bundle as any);
}
