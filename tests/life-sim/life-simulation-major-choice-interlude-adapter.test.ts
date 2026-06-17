import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  ensurePendingMajorChoiceWithInterludes,
  LIFE_SIM_MAJOR_CHOICE_INTERLUDE_ADAPTER_SOURCE,
  resolvePendingLifeInterlude,
  selectLifeSimulationMajorChoiceOption
} from "../../src/lifeSimulation/LifeSimulationMajorChoiceInterludeAdapter";
import type { LifeSimulationState } from "../../src/types/life-monthly-events-types.v0.1";
import type {
  EventThreadProgress,
  LifeStorylineState,
  StorylineProgress
} from "../../src/types/life-storylines-types.v0.1";

describe("LifeSimulationMajorChoiceInterludeAdapter", () => {
  it("creates a pending major choice with an alchemy interlude option from apothecary storyline state", () => {
    const state = makeLifeState({ lifeStorylineState: makeAlchemyStorylineState() });

    const next = ensurePendingMajorChoiceWithInterludes({ state, seed: "lpi-c005-alchemy" });
    const interludeOption = next.pendingMajorChoiceState?.options.find((option) => option.interludeCandidate !== undefined);

    expect(next).not.toBe(state);
    expect(next.pendingMajorChoiceState).toBeDefined();
    expect(next.pendingMajorChoiceState?.options.length).toBeGreaterThanOrEqual(3);
    expect(interludeOption?.interludeCandidate).toMatchObject({
      definitionId: "interlude_guard_medicine_field",
      mode: "horde"
    });
    expect(interludeOption?.tags).toEqual(expect.arrayContaining(["life_interlude_candidate"]));
    expect(Object.isFrozen(next)).toBe(true);
    expect(Object.isFrozen(next.pendingMajorChoiceState?.options)).toBe(true);
  });

  it("keeps text-only options for a baseline state without evidence", () => {
    const next = ensurePendingMajorChoiceWithInterludes({ state: makeLifeState(), seed: "lpi-c005-baseline" });

    expect(next.pendingMajorChoiceState?.options.length).toBe(3);
    expect(next.pendingMajorChoiceState?.options.every((option) => option.interludeCandidate === undefined)).toBe(true);
    expect(next.pendingInterlude).toBeUndefined();
  });

  it("reuses existing pending major choices and pending interludes byte-identically", () => {
    const pendingMajorChoice = ensurePendingMajorChoiceWithInterludes({
      state: makeLifeState({ lifeStorylineState: makeAlchemyStorylineState() }),
      seed: "lpi-c005-reuse"
    });
    const selected = selectInterludeOption(pendingMajorChoice, "lpi-c005-reuse");

    expect(ensurePendingMajorChoiceWithInterludes({ state: pendingMajorChoice, seed: "different" })).toBe(pendingMajorChoice);
    expect(ensurePendingMajorChoiceWithInterludes({ state: selected, seed: "different" })).toBe(selected);
    expect(JSON.stringify(ensurePendingMajorChoiceWithInterludes({ state: pendingMajorChoice, seed: "different" }))).toBe(
      JSON.stringify(pendingMajorChoice)
    );
  });

  it("selecting an interlude option creates a deterministic pending run config with resultWritebackId", () => {
    const pending = ensurePendingMajorChoiceWithInterludes({
      state: makeLifeState({ lifeStorylineState: makeAlchemyStorylineState() }),
      seed: "lpi-c005-select"
    });
    const first = selectInterludeOption(pending, "lpi-c005-select");
    const second = selectInterludeOption(pending, "lpi-c005-select");

    expect(first).toEqual(second);
    expect(first.pendingInterlude).toBeDefined();
    expect(first.pendingInterlude?.status).toBe("pending");
    expect(first.pendingInterlude?.runConfig.definitionId).toBe("interlude_guard_medicine_field");
    expect(first.pendingInterlude?.runConfig.resultWritebackId).toBe("writeback_medicine_field");
    expect(first.pendingInterlude?.runConfig.sourceThreadId).toBe("thread_apothecary_sorting_herbs");
    expect(first.pendingMajorChoiceState?.selectedOptionInstanceId).toBe(first.pendingInterlude?.sourceOptionInstanceId);
  });

  it("selecting a text-only option records a normal public monthly log and clears pending choice", () => {
    const pending = ensurePendingMajorChoiceWithInterludes({ state: makeLifeState(), seed: "lpi-c005-text" });
    const option = pending.pendingMajorChoiceState!.options[0]!;

    const next = selectLifeSimulationMajorChoiceOption({
      state: pending,
      optionInstanceId: option.instanceId,
      seed: "lpi-c005-text"
    });

    expect(next.pendingMajorChoiceState).toBeUndefined();
    expect(next.pendingInterlude).toBeUndefined();
    expect(next.monthlyLogs.at(-1)).toMatchObject({
      eventId: `major_choice:${pending.pendingMajorChoiceState!.eventInstanceId}:${option.instanceId}`,
      outcome: "normal"
    });
  });

  it("auto resolves pending interludes through writeback, appends history/logs, and clears pending state", () => {
    const selected = selectInterludeOption(
      ensurePendingMajorChoiceWithInterludes({
        state: makeLifeState({ lifeStorylineState: makeAlchemyStorylineState() }),
        seed: "lpi-c005-auto"
      }),
      "lpi-c005-auto"
    );

    const resolved = resolvePendingLifeInterlude({
      state: selected,
      resolutionMode: "autoResolve",
      seed: "lpi-c005-auto"
    });

    expect(resolved.pendingMajorChoiceState).toBeUndefined();
    expect(resolved.pendingInterlude).toBeUndefined();
    expect(resolved.lifeInterludeHistory).toEqual([
      expect.objectContaining({
        interludeId: "interlude_guard_medicine_field",
        mode: "horde",
        outcome: "partialSuccess",
        sourceChoiceId: selected.pendingInterlude?.sourceOptionInstanceId,
        sourceThreadId: "thread_apothecary_sorting_herbs"
      })
    ]);
    expect(resolved.monthlyLogs.at(-1)?.eventId).toContain("interlude:interlude_guard_medicine_field");
  });

  it("manual placeholder challenge resolves deterministically and applies success writeback", () => {
    const selected = selectInterludeOption(
      ensurePendingMajorChoiceWithInterludes({
        state: makeLifeState({
          lifeSkills: { alchemy: 1 },
          merit: 1,
          carriedItemAffinity: { item_copper_furnace: 10 },
          lifeStorylineState: makeAlchemyStorylineState()
        }),
        seed: "lpi-c005-manual"
      }),
      "lpi-c005-manual"
    );

    const first = resolvePendingLifeInterlude({
      state: selected,
      resolutionMode: "manualChallenge",
      seed: "lpi-c005-manual"
    });
    const second = resolvePendingLifeInterlude({
      state: selected,
      resolutionMode: "manualChallenge",
      seed: "lpi-c005-manual"
    });

    expect(first).toEqual(second);
    expect(first.lifeSkills.alchemy).toBe(6);
    expect(first.merit).toBe(4);
    expect(first.carriedItemAffinity.item_copper_furnace).toBe(18);
    expect(first.lifeInterludeHistory?.[0]).toMatchObject({ outcome: "success" });
  });

  it("keeps serialized output public-safe and avoids nondeterministic/runtime APIs", () => {
    const state = ensurePendingMajorChoiceWithInterludes({
      state: makeLifeState({
        flags: {
          trueNameRevealed: false,
          hiddenFateInternal: "SHOULD_NOT_LEAK_HIDDEN_NAME",
          root: "root:wood"
        },
        lifeStorylineState: makeAlchemyStorylineState()
      }),
      seed: "lpi-c005-leak"
    });
    const serialized = JSON.stringify(state);
    const leakScan = serialized.replaceAll("trueNameRevealed", "");
    const source = readFileSync("src/lifeSimulation/LifeSimulationMajorChoiceInterludeAdapter.ts", "utf8");

    expect(state.pendingMajorChoiceState?.options.some((option) => option.interludeCandidate !== undefined)).toBe(true);
    expect(leakScan).not.toContain("SHOULD_NOT_LEAK_HIDDEN_NAME");
    expect(leakScan).not.toContain("trueName");
    expect(leakScan).not.toContain("true_name");
    expect(leakScan).not.toContain("truename");
    expect(leakScan).not.toContain("hiddenFateInternal");
    expect(source).toContain(LIFE_SIM_MAJOR_CHOICE_INTERLUDE_ADAPTER_SOURCE);
    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("performance.now");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("localStorage");
    expect(source).not.toContain("src/sim");
  });
});

function selectInterludeOption(state: LifeSimulationState, seed: string): LifeSimulationState {
  const option = state.pendingMajorChoiceState?.options.find((item) => item.interludeCandidate !== undefined);
  if (option === undefined) {
    throw new Error("missing interlude option");
  }
  return selectLifeSimulationMajorChoiceOption({
    state,
    optionInstanceId: option.instanceId,
    seed
  });
}

type StateOverrides = Omit<Partial<LifeSimulationState>, "core" | "aptitude" | "lifeSkills" | "family"> & {
  readonly core?: Partial<LifeSimulationState["core"]>;
  readonly aptitude?: Partial<LifeSimulationState["aptitude"]>;
  readonly lifeSkills?: Partial<LifeSimulationState["lifeSkills"]>;
  readonly family?: Partial<LifeSimulationState["family"]>;
};

function makeLifeState(overrides: StateOverrides = {}): LifeSimulationState {
  return deepFreeze({
    profileId: "profile_lpi_c005",
    characterId: "character_lpi_c005",
    seed: "life-lpi-c005-seed",
    rngState: {},
    ageMonths: overrides.ageMonths ?? 150,
    phaseId: overrides.phaseId ?? "youth",
    core: {
      jing: 62,
      qi: 64,
      shen: 66,
      ...(overrides.core ?? {})
    },
    aptitude: {
      rootBone: 60,
      comprehension: 65,
      inspiration: 58,
      fortune: 52,
      heart: 55,
      lifespan: 80,
      ...(overrides.aptitude ?? {})
    },
    lifeSkills: {
      study: 4,
      martial: 3,
      alchemy: 8,
      craft: 2,
      social: 2,
      stealth: 1,
      ritual: 2,
      survival: 4,
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
      familyWealth: 5,
      flags: {},
      ...(overrides.family ?? {})
    },
    relationships: overrides.relationships ?? [],
    hiddenFateProgress: overrides.hiddenFateProgress ?? {},
    carriedItemAffinity: overrides.carriedItemAffinity ?? {
      item_copper_furnace: 70
    },
    flags: overrides.flags ?? {
      root: "root:wood",
      destiny: "destiny_alchemy_prodigy",
      origin: "origin_herb_shop_apprentice",
      carriedItem: "item_copper_furnace"
    },
    monthlyLogs: overrides.monthlyLogs ?? [],
    lifeInterludeHistory: overrides.lifeInterludeHistory ?? [],
    ...(overrides.ninePalaceSummary === undefined ? {} : { ninePalaceSummary: overrides.ninePalaceSummary }),
    ...(overrides.originFateNarrativeState === undefined ? {} : { originFateNarrativeState: overrides.originFateNarrativeState }),
    ...(overrides.lifeStorylineState === undefined ? {} : { lifeStorylineState: overrides.lifeStorylineState }),
    ...(overrides.pendingMajorChoice === undefined ? {} : { pendingMajorChoice: overrides.pendingMajorChoice }),
    ...(overrides.pendingMajorChoiceState === undefined ? {} : { pendingMajorChoiceState: overrides.pendingMajorChoiceState }),
    ...(overrides.pendingInterlude === undefined ? {} : { pendingInterlude: overrides.pendingInterlude })
  });
}

function makeAlchemyStorylineState(): LifeStorylineState {
  const storylineProgress = storyline("storyline_apothecary_alchemy", "fated", ["alchemy", "herb", "furnace"]);
  const eventThreads = [
    thread("thread_furnace_dream", "storyline_apothecary_alchemy", "developing", ["furnace", "fire_control"], {
      progress: 65,
      tension: 20,
      clarity: 15
    }),
    thread("thread_apothecary_sorting_herbs", "storyline_apothecary_alchemy", "crisis", ["protect_medicine_field", "insect_tide", "herb"], {
      progress: 72,
      tension: 75,
      risk: 35
    })
  ];

  return deepFreeze({
    storylineScores: [storylineProgress],
    activeStorylines: [storylineProgress],
    downstreamActiveStorylineIds: ["storyline_apothecary_alchemy"],
    eventThreads,
    threadSummaries: eventThreads.map((item) => ({
      threadId: item.threadId,
      storylineId: item.storylineId,
      stage: item.stage,
      progress: item.progress,
      tension: item.tension,
      clarity: item.clarity,
      risk: item.risk
    })),
    recentHooks: [],
    recentStorylineHooks: [],
    transitionCandidateHooks: [],
    playInterludeCandidateHooks: ["play_horde_guard_medicine_field"],
    interludeCandidateSeeds: ["wild_ginseng_field"],
    stageTransitionSignals: []
  });
}

function storyline(
  storylineId: string,
  status: StorylineProgress["status"],
  tags: readonly string[]
): StorylineProgress {
  return {
    storylineId,
    score: status === "fated" ? 100 : 55,
    status,
    lastUpdatedMonth: 150,
    tags
  };
}

function thread(
  threadId: string,
  storylineId: string,
  stage: EventThreadProgress["stage"],
  tags: readonly string[],
  overrides: Partial<EventThreadProgress> = {}
): EventThreadProgress {
  return {
    threadId,
    storylineId,
    stage,
    progress: 40,
    tension: 0,
    clarity: 0,
    risk: 0,
    flags: {
      tags: tags.join("|")
    },
    ...overrides
  };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}
