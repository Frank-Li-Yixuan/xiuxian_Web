import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  LIFE_INTERLUDE_RESULT_WRITEBACK_ENGINE_SOURCE,
  LifeInterludeResultWritebackEngine
} from "../../src/lifeInterludes/LifeInterludeResultWritebackEngine";
import type {
  LifeInterludeOutcome,
  LifeInterludeResult,
  LifeInterludeResultWritebackRule,
  LifeInterludeRunConfig,
  LifeInterludeWritebackEffect
} from "../../src/types/life-interlude-types.v0.1";
import type { LifeSimulationState } from "../../src/types/life-monthly-events-types.v0.1";
import type {
  EventThreadProgress,
  LifeStorylineState,
  StorylineProgress
} from "../../src/types/life-storylines-types.v0.1";

describe("LifeInterludeResultWritebackEngine", () => {
  it("applies checked-in medicine-field success writeback to life state", () => {
    const engine = new LifeInterludeResultWritebackEngine();
    const state = makeLifeState({
      lifeSkills: { alchemy: 1 },
      merit: 1,
      carriedItemAffinity: { item_copper_furnace: 10 }
    });
    const application = engine.applyResult({
      state,
      runConfig: makeRunConfig({
        definitionId: "interlude_guard_medicine_field",
        mode: "horde",
        resultWritebackId: "writeback_medicine_field"
      }),
      result: makeResult({
        definitionId: "interlude_guard_medicine_field",
        mode: "horde",
        outcome: "success",
        generatedHooks: ["safe_manual_hook"]
      })
    });

    expect(application.nextState.lifeSkills.alchemy).toBe(6);
    expect(application.nextState.merit).toBe(4);
    expect(application.nextState.carriedItemAffinity.item_copper_furnace).toBe(18);
    expect(application.nextState.flags["age18Hook:alchemy_fire_control"]).toBe(1);
    expect(application.generatedHooks).toEqual(["safe_manual_hook", "alchemy_fire_control"]);
    expect(application.nextState.monthlyLogs.at(-1)?.hooks).toEqual(
      expect.arrayContaining(["safe_manual_hook", "alchemy_fire_control"])
    );
    expect(application.debug.source).toBe(LIFE_INTERLUDE_RESULT_WRITEBACK_ENGINE_SOURCE);
    expect(Object.isFrozen(application)).toBe(true);
    expect(Object.isFrozen(application.nextState)).toBe(true);
    expect(Object.isFrozen(application.nextState.monthlyLogs)).toBe(true);
  });

  it("applies checked-in thunder failure writeback without ending life simulation", () => {
    const application = new LifeInterludeResultWritebackEngine().applyResult({
      state: makeLifeState({ ageMonths: 132, phaseId: "youth" }),
      runConfig: makeRunConfig({
        definitionId: "interlude_rainy_back_mountain",
        mode: "stg",
        resultWritebackId: "writeback_thunder_back_mountain"
      }),
      result: makeResult({
        definitionId: "interlude_rainy_back_mountain",
        mode: "stg",
        outcome: "failure"
      })
    });

    expect(application.nextState.ageMonths).toBe(132);
    expect(application.nextState.phaseId).toBe("youth");
    expect(application.nextState.wounds).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "wound_cold_rain_bone", severity: 1, createdAtMonth: 132 })
      ])
    );
    expect(application.nextState.heartKnots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "knot_fear_thunder", severity: 1, createdAtMonth: 132 })
      ])
    );
    expect(application.nextState.monthlyLogs.at(-1)?.outcome).toBe("bad");
  });

  it("applies every direct effect type and delegates thread progress to the event thread engine", () => {
    const effects: LifeInterludeWritebackEffect[] = [
      { type: "modifyStat", stat: "jing", amount: 5 },
      { type: "modifyStat", stat: "herbalism", amount: 4 },
      { type: "addWound", woundId: "wound_test", severity: 2 },
      { type: "addHeartKnot", knotId: "knot_test", severity: 2 },
      { type: "modifyHiddenFateProgress", hiddenFateId: "hidden_test", amount: 20, visibleHint: "safe hidden clue" },
      { type: "modifyCarriedItemAffinity", itemId: "item_test", amount: 30 },
      { type: "modifyStorylineScore", storylineId: "storyline_poor_scholar", amount: 25 },
      { type: "modifyThreadProgress", threadId: "thread_private_school_enlightenment", progress: 45, tension: 75 },
      { type: "modifyKarmaMerit", karma: -2, merit: 5 },
      { type: "addAge18Hook", hookId: "age18_test_hook", amount: 2 },
      { type: "addLifeLog", text: "public life log text" }
    ];
    const application = new LifeInterludeResultWritebackEngine().applyEffects({
      state: makeLifeState({
        core: { jing: 10 },
        lifeSkills: { alchemy: 2 },
        lifeStorylineState: makeLifeStorylineState()
      }),
      runConfig: makeRunConfig(),
      result: makeResult({ generatedHooks: ["result_hook"] }),
      effects
    });

    expect(application.nextState.core.jing).toBe(15);
    expect(application.nextState.lifeSkills.alchemy).toBe(6);
    expect(application.nextState.wounds).toEqual(expect.arrayContaining([expect.objectContaining({ id: "wound_test" })]));
    expect(application.nextState.heartKnots).toEqual(expect.arrayContaining([expect.objectContaining({ id: "knot_test" })]));
    expect(application.nextState.hiddenFateProgress.hidden_test).toBe(20);
    expect(application.nextState.carriedItemAffinity.item_test).toBe(30);
    expect(application.nextState.karma).toBe(-2);
    expect(application.nextState.merit).toBe(5);
    expect(application.nextState.flags["age18Hook:age18_test_hook"]).toBe(2);
    expect(application.nextState.lifeStorylineState?.storylineScores[0]?.score).toBe(65);
    expect(application.nextState.lifeStorylineState?.eventThreads[0]).toMatchObject({
      threadId: "thread_private_school_enlightenment",
      stage: "crisis",
      progress: 85,
      tension: 75
    });
    expect(application.nextState.lifeStorylineState?.threadSummaries[0]).toMatchObject({
      threadId: "thread_private_school_enlightenment",
      stage: "crisis",
      progress: 85,
      tension: 75
    });
    expect(application.nextState.monthlyLogs.at(-1)?.visibleEffectSummary).toEqual(
      expect.arrayContaining(["safe hidden clue", "public life log text"])
    );
    expect(application.generatedHooks).toEqual(["result_hook", "age18_test_hook"]);
  });

  it("prevents auto-resolve hiddenSuccess writeback but allows manual hiddenSuccess", () => {
    const registry = makeRegistryReader({
      id: "writeback_hidden_success_test",
      outcomes: {
        success: [{ type: "modifyStat", stat: "shen", amount: 1 }],
        hiddenSuccess: [{ type: "modifyStat", stat: "shen", amount: 5 }]
      }
    });
    const engine = new LifeInterludeResultWritebackEngine();
    const state = makeLifeState({ core: { shen: 10 } });
    const runConfig = makeRunConfig({ resultWritebackId: "writeback_hidden_success_test" });

    const auto = engine.applyResult({
      state,
      runConfig,
      registry,
      result: makeResult({ outcome: "hiddenSuccess", playerChoseManual: false })
    });
    const manual = engine.applyResult({
      state,
      runConfig,
      registry,
      result: makeResult({ outcome: "hiddenSuccess", playerChoseManual: true })
    });

    expect(auto.nextState.core.shen).toBe(11);
    expect(auto.debug.effectiveOutcome).toBe("success");
    expect(auto.skippedEffects).toEqual(
      expect.arrayContaining([expect.objectContaining({ reason: "autoHiddenSuccessDowngraded" })])
    );
    expect(manual.nextState.core.shen).toBe(15);
    expect(manual.debug.effectiveOutcome).toBe("hiddenSuccess");
  });

  it("applies deterministic destiny failure conversions from public destiny evidence", () => {
    const engine = new LifeInterludeResultWritebackEngine();
    const state = makeLifeState({
      aptitude: { heart: 60 },
      heartDemon: 3,
      wounds: [{ id: "wound_old", name: "wound_old", severity: 3, tags: ["wound_old"], createdAtMonth: 10 }],
      heartKnots: [{ id: "knot_old", name: "knot_old", severity: 2, tags: ["knot_old"], createdAtMonth: 11 }]
    });
    const application = engine.applyResult({
      state,
      registry: makeRegistryReader({ id: "writeback_empty_failure", outcomes: { failure: [] } }),
      runConfig: makeRunConfig({
        resultWritebackId: "writeback_empty_failure",
        destinyModifiers: ["destiny_waste_root_reversal", "destiny_unyielding", "destiny_demon_seed"]
      }),
      result: makeResult({ outcome: "failure", generatedHooks: ["destiny_demon_heart_seed"] })
    });

    expect(application.nextState.flags.destiny_waste_root_reversal_points).toBe(1);
    expect(application.nextState.aptitude.heart).toBe(61);
    expect(application.nextState.wounds[0]?.severity).toBe(2);
    expect(application.nextState.heartDemon).toBe(5);
    expect(application.generatedHooks).toContain("demon_heart_seed_failure_conversion");
  });

  it("is deterministic and filters hidden true-name markers from public output", () => {
    const engine = new LifeInterludeResultWritebackEngine();
    const input = {
      state: makeLifeState({
        flags: {
          hiddenFateInternal: "SHOULD_NOT_LEAK_HIDDEN_NAME",
          trueNameRevealed: false,
          safeFlag: "safe"
        }
      }),
      runConfig: makeRunConfig(),
      result: makeResult({
        generatedHooks: ["safe_hook", "trueName:SHOULD_NOT_LEAK_HIDDEN_NAME"],
        effects: [
          { type: "addLifeLog", text: "safe text" },
          { type: "addLifeLog", text: "trueName SHOULD_NOT_LEAK_HIDDEN_NAME" }
        ]
      })
    };

    const first = engine.applyEffects(input);
    const second = engine.applyEffects(input);
    const serialized = JSON.stringify(first);
    const leakScan = serialized.replaceAll("trueNameRevealed", "");

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.nextState.flags.trueNameRevealed).toBe(false);
    expect(leakScan).not.toContain("trueName");
    expect(leakScan).not.toContain("true_name");
    expect(leakScan).not.toContain("truename");
    expect(leakScan).not.toContain("hiddenFateInternal");
    expect(leakScan).not.toContain("SHOULD_NOT_LEAK_HIDDEN_NAME");
  });

  it("does not use nondeterministic, runtime side-effect, or src/sim APIs", () => {
    const source = readFileSync("src/lifeInterludes/LifeInterludeResultWritebackEngine.ts", "utf8");

    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("performance.now");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("localStorage");
    expect(source).not.toContain("src/sim");
  });
});

function makeRegistryReader(rule: LifeInterludeResultWritebackRule) {
  return {
    getWritebackRule(id: string) {
      if (id !== rule.id) {
        throw new Error(`Missing test writeback rule: ${id}`);
      }
      return rule;
    }
  };
}

function makeResult(overrides: Partial<LifeInterludeResult> = {}): LifeInterludeResult {
  return {
    interludeRunId: "lpi_run_writeback_test",
    definitionId: "interlude_guard_medicine_field",
    mode: "horde",
    outcome: "success",
    playerChoseManual: true,
    visibleSummary: "public result summary",
    effects: [],
    generatedHooks: [],
    ...overrides
  };
}

function makeRunConfig(overrides: Partial<LifeInterludeRunConfig> & { destinyModifiers?: readonly string[] } = {}): LifeInterludeRunConfig {
  const destinyModifiers = overrides.destinyModifiers ?? [];
  return {
    interludeRunId: "lpi_run_writeback_test",
    definitionId: "interlude_guard_medicine_field",
    mode: "horde",
    seed: "writeback-seed",
    ageMonth: 150,
    sourceChoiceId: "choice_writeback",
    resultWritebackId: "writeback_medicine_field",
    difficultyTier: "risky",
    playerProjection: {
      maxHp: 80,
      maxQi: 40,
      moveSpeed: 3.5,
      skillTags: [],
      destinyModifiers,
      itemModifiers: []
    },
    scenario: {
      title: "Writeback test",
      description: "Writeback test",
      worldExplanation: "Writeback test"
    },
    rewards: {
      successEffects: [],
      failureEffects: []
    },
    failurePolicy: {
      canGameOver: false,
      preserveLifeSimulation: true
    },
    ...overrides
  };
}

type StateOverrides = Omit<Partial<LifeSimulationState>, "core" | "aptitude" | "lifeSkills" | "family"> & {
  readonly core?: Partial<LifeSimulationState["core"]>;
  readonly aptitude?: Partial<LifeSimulationState["aptitude"]>;
  readonly lifeSkills?: Partial<LifeSimulationState["lifeSkills"]>;
  readonly family?: Partial<LifeSimulationState["family"]>;
};

function makeLifeState(overrides: StateOverrides = {}): LifeSimulationState {
  return {
    profileId: "profile_writeback",
    characterId: "character_writeback",
    seed: "life-writeback-seed",
    rngState: {},
    ageMonths: overrides.ageMonths ?? 150,
    phaseId: overrides.phaseId ?? "youth",
    core: {
      jing: 50,
      qi: 50,
      shen: 50,
      ...(overrides.core ?? {})
    },
    aptitude: {
      rootBone: 50,
      comprehension: 50,
      inspiration: 50,
      fortune: 50,
      heart: 50,
      lifespan: 50,
      ...(overrides.aptitude ?? {})
    },
    lifeSkills: {
      study: 0,
      martial: 0,
      alchemy: 0,
      craft: 0,
      social: 0,
      stealth: 0,
      ritual: 0,
      survival: 0,
      ...(overrides.lifeSkills ?? {})
    },
    karma: overrides.karma ?? 0,
    merit: overrides.merit ?? 0,
    heartDemon: overrides.heartDemon ?? 0,
    wounds: overrides.wounds ?? [],
    heartKnots: overrides.heartKnots ?? [],
    family: {
      kinship: 50,
      familyStrain: 0,
      familyWealth: 0,
      flags: {},
      ...(overrides.family ?? {})
    },
    relationships: overrides.relationships ?? [],
    hiddenFateProgress: overrides.hiddenFateProgress ?? {},
    carriedItemAffinity: overrides.carriedItemAffinity ?? {},
    flags: overrides.flags ?? {},
    monthlyLogs: overrides.monthlyLogs ?? [],
    ...(overrides.ninePalaceSummary === undefined ? {} : { ninePalaceSummary: overrides.ninePalaceSummary }),
    ...(overrides.originFateNarrativeState === undefined ? {} : { originFateNarrativeState: overrides.originFateNarrativeState }),
    ...(overrides.lifeStorylineState === undefined ? {} : { lifeStorylineState: overrides.lifeStorylineState }),
    ...(overrides.pendingMajorChoice === undefined ? {} : { pendingMajorChoice: overrides.pendingMajorChoice })
  };
}

function makeLifeStorylineState(): LifeStorylineState {
  const storyline: StorylineProgress = {
    storylineId: "storyline_poor_scholar",
    score: 40,
    status: "active",
    lastUpdatedMonth: 150,
    tags: ["study"]
  };
  const thread: EventThreadProgress = {
    threadId: "thread_private_school_enlightenment",
    storylineId: "storyline_poor_scholar",
    stage: "developing",
    progress: 40,
    tension: 0,
    clarity: 0,
    risk: 0,
    flags: { initializedAtMonth: 150 }
  };
  return {
    storylineScores: [storyline],
    activeStorylines: [storyline],
    downstreamActiveStorylineIds: ["storyline_poor_scholar"],
    eventThreads: [thread],
    threadSummaries: [{
      threadId: thread.threadId,
      storylineId: thread.storylineId,
      stage: thread.stage,
      progress: thread.progress,
      tension: thread.tension,
      clarity: thread.clarity,
      risk: thread.risk
    }],
    recentHooks: [],
    recentStorylineHooks: [],
    transitionCandidateHooks: [],
    playInterludeCandidateHooks: [],
    interludeCandidateSeeds: [],
    stageTransitionSignals: [],
    debug: {
      source: "test",
      scoreBreakdownByStoryline: {},
      selectedThreads: [thread.threadId],
      suppressedStorylines: [],
      signalTags: []
    }
  };
}
