import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  MAJOR_CHOICE_STORYLINE_ADAPTER_SOURCE,
  appendStorylineHooksToChoiceContext,
  createMajorChoiceStorylineProjection
} from "../../src/lifeSimulation/MajorChoiceStorylineAdapter";
import { createMajorChoiceContextFromNinePalace } from "../../src/lifeSimulation/NinePalaceLifeEventHooks";
import { createMajorChoiceContextFromOriginFate } from "../../src/lifeSimulation/OriginFateLifeHooks";
import { createMajorChoiceContextFromOriginFateNarrative } from "../../src/lifeSimulation/OriginFateNarrativeLifeHooks";
import { evaluateNinePalace } from "../../src/ninePalace/NinePalaceScoring";
import { DefaultOriginFateGenerator } from "../../src/originFate/OriginFateGenerator";
import type { MonthlyLifeLogEntry } from "../../src/types/life-monthly-events-types.v0.1";
import type {
  EventThreadProgress,
  LifeStorylineState,
  StorylineProgress
} from "../../src/types/life-storylines-types.v0.1";
import type { NinePalaceAttributes } from "../../src/types/nine-palace-fate-types.v0.1";
import type {
  CarriedItemNarrativeStateV02,
  HiddenFateNarrativeStateV02,
  OriginFateNarrativeStateV02
} from "../../src/types/origin-fate-narrative-types.v0.2";
import type { OriginFateDraft } from "../../src/types/origin-fate-types.v0.1";

describe("MajorChoiceStorylineAdapter", () => {
  it("projects village calamity crisis hooks for defense, escape, help, and interludes", () => {
    const projection = createMajorChoiceStorylineProjection({
      lifeStorylineState: makeVillageCalamityCrisisState(),
      recentMonthlyLogs: [
        monthlyLog(166, "old_bandit_rumor", ["old_hook"], ["old_bandit"]),
        monthlyLog(170, "bandit_smoke", ["recent_bandit_hook"], ["bandit", "village"])
      ],
      ageMonths: 171
    });
    const hookIds = projection.choiceHooks.map((hook) => hook.id);
    const serialized = JSON.stringify(projection);

    expect(projection.debug.source).toBe(MAJOR_CHOICE_STORYLINE_ADAPTER_SOURCE);
    expect(hookIds).toEqual(expect.arrayContaining(["choice_village_calamity", "defend_escape_or_beg_help"]));
    expect(projection.choiceHooks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "choice_village_calamity",
          intent: "advance",
          sourceThreadId: "thread_bandit_smoke"
        }),
        expect.objectContaining({
          id: "defend_escape_or_beg_help",
          intent: "avoid",
          sourceThreadId: "thread_bandit_smoke"
        })
      ])
    );
    expect(serialized).toContain("defend");
    expect(serialized).toContain("escape");
    expect(serialized).toContain("beg_help");
    expect(projection.interludeCandidateHooks).toEqual(
      expect.arrayContaining(["play_horde_village_defense", "play_stg_escape_bandit_chase"])
    );
    expect(projection.recentSixMonthHooks).toContain("recent_bandit_hook");
    expect(Object.isFrozen(projection)).toBe(true);
    expect(Object.isFrozen(projection.choiceHooks)).toBe(true);
    expect(serialized).not.toContain("\"score\"");
  });

  it("projects apothecary alchemy developing hooks for healing, herbs, and furnace memory", () => {
    const projection = createMajorChoiceStorylineProjection({
      lifeStorylineState: makeAlchemyState(),
      ageMonths: 150
    });
    const hookIds = projection.choiceHooks.map((hook) => hook.id);

    expect(hookIds).toEqual(
      expect.arrayContaining([
        "choice_heal_or_risk",
        "choice_fire_control_trial",
        "try_prescription",
        "follow_furnace_memory"
      ])
    );
    expect(projection.choiceHooks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "try_prescription", intent: "advance" }),
        expect.objectContaining({ id: "follow_furnace_memory", intent: "advance" })
      ])
    );
    expect(projection.interludeCandidateHooks).toContain("play_dbg_fire_control");
    expect(projection.visibleHints.length).toBeGreaterThan(0);
  });

  it("projects system prelude active hooks for following or resisting the signal", () => {
    const projection = createMajorChoiceStorylineProjection({
      lifeStorylineState: makeSystemPreludeState(),
      ageMonths: 156
    });

    expect(projection.choiceHooks.map((hook) => hook.id)).toEqual(
      expect.arrayContaining(["choice_system_signal", "follow_system_signal", "accept_or_resist_signal"])
    );
    expect(projection.choiceHooks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "follow_system_signal", intent: "advance" }),
        expect.objectContaining({ id: "accept_or_resist_signal", intent: "avoid" })
      ])
    );
  });

  it("summarizes the latest six-month log window deterministically", () => {
    const projection = createMajorChoiceStorylineProjection({
      lifeStorylineState: makeAlchemyState(),
      recentMonthlyLogs: [
        monthlyLog(95, "older_event", ["older_hook"], ["older_tag"]),
        monthlyLog(96, "window_start_event", ["window_start_hook"], ["window_tag"]),
        monthlyLog(101, "latest_event", ["latest_hook"], ["latest_tag"])
      ],
      ageMonths: 101
    });

    expect(projection.sixMonthWindow).toMatchObject({
      monthStart: 96,
      monthEnd: 101,
      logIds: ["window_start_event", "latest_event"],
      hooks: ["window_start_hook", "latest_hook"],
      tags: ["window_tag", "latest_tag"]
    });
    expect(projection.recentSixMonthHooks).toEqual(["window_start_hook", "latest_hook"]);
    expect(JSON.stringify(projection)).not.toContain("older_hook");
  });

  it("appends storyline hooks to existing major choice contexts only when supplied", () => {
    const evaluation = evaluateNinePalace(BASE_ATTRIBUTES);
    const baseNinePalace = createMajorChoiceContextFromNinePalace(evaluation, {
      ageMonths: 150,
      phaseId: "juvenile",
      recentHooks: ["base_hook"]
    });
    const projection = createMajorChoiceStorylineProjection({
      lifeStorylineState: makeAlchemyState(),
      ageMonths: 150
    });

    expect(createMajorChoiceContextFromNinePalace(evaluation, {
      ageMonths: 150,
      phaseId: "juvenile",
      recentHooks: ["base_hook"]
    })).toEqual(baseNinePalace);
    expect(appendStorylineHooksToChoiceContext(baseNinePalace, projection).recentHooks).toEqual(
      expect.arrayContaining(["base_hook", "choice_heal_or_risk", "try_prescription", "choice_fire_control_trial"])
    );
    expect(createMajorChoiceContextFromNinePalace(evaluation, {
      ageMonths: 150,
      phaseId: "juvenile",
      recentHooks: ["base_hook"],
      storylineChoiceProjection: projection
    }).recentHooks).toEqual(expect.arrayContaining(["base_hook", "choice_heal_or_risk"]));
    expect(createMajorChoiceContextFromOriginFate(makeOriginFateDraft(), {
      ageMonths: 150,
      phaseId: "juvenile",
      lifeStorylineState: makeAlchemyState()
    }).recentHooks).toEqual(expect.arrayContaining(["choice_heal_or_risk", "choice_fire_control_trial"]));
    expect(createMajorChoiceContextFromOriginFateNarrative(makeNarrativeState(), {
      ageMonths: 150,
      phaseId: "juvenile",
      storylineChoiceProjection: projection
    }).recentHooks).toEqual(expect.arrayContaining(["choice_heal_or_risk", "choice_fire_control_trial"]));
  });

  it("is deterministic, frozen, public-safe, and source-safe", () => {
    const input = {
      lifeStorylineState: makeLeakyState(),
      recentMonthlyLogs: [
        monthlyLog(120, "leaky_recent", ["safe_recent_hook", "trueName:SHOULD_NOT_LEAK_HIDDEN_NAME"], ["safe_tag"])
      ],
      ageMonths: 120
    };
    const first = createMajorChoiceStorylineProjection(input);
    const second = createMajorChoiceStorylineProjection(input);
    const serialized = JSON.stringify(first);
    const source = readFileSync("src/lifeSimulation/MajorChoiceStorylineAdapter.ts", "utf8");

    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.debug)).toBe(true);
    expect(serialized).not.toContain("SHOULD_NOT_LEAK_HIDDEN_NAME");
    expect(serialized).not.toContain("trueName");
    expect(serialized).not.toContain("true_name");
    expect(serialized).not.toContain("truename");
    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("performance.now");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("localStorage");
  });
});

const BASE_ATTRIBUTES: NinePalaceAttributes = {
  jing: 60,
  qi: 60,
  shen: 60,
  rootBone: 60,
  comprehension: 60,
  inspiration: 60,
  fortune: 60,
  heart: 60,
  lifespan: 60
};

function makeAlchemyState(): LifeStorylineState {
  return freezeState({
    activeStorylines: [storyline("storyline_apothecary_alchemy", "fated", ["alchemy", "herb", "furnace"])],
    eventThreads: [
      eventThread("thread_furnace_dream", "storyline_apothecary_alchemy", "developing", {
        progress: 65,
        tension: 20,
        clarity: 15
      }),
      eventThread("thread_apothecary_sorting_herbs", "storyline_apothecary_alchemy", "developing", {
        progress: 55,
        clarity: 10
      })
    ],
    recentHooks: [],
    transitionCandidateHooks: [],
    playInterludeCandidateHooks: ["play_dbg_fire_control"]
  });
}

function makeVillageCalamityCrisisState(): LifeStorylineState {
  return freezeState({
    activeStorylines: [storyline("storyline_village_calamity", "dominant", ["calamity", "bandit", "demon_beast"])],
    eventThreads: [
      eventThread("thread_bandit_smoke", "storyline_village_calamity", "crisis", {
        progress: 70,
        tension: 78,
        risk: 40
      })
    ],
    recentHooks: [],
    transitionCandidateHooks: [],
    playInterludeCandidateHooks: ["play_horde_village_defense"]
  });
}

function makeSystemPreludeState(): LifeStorylineState {
  return freezeState({
    activeStorylines: [storyline("storyline_system_prelude", "active", ["system_prelude", "outer_battlefield"])],
    eventThreads: [
      eventThread("thread_system_static", "storyline_system_prelude", "developing", {
        progress: 45,
        clarity: 5
      })
    ],
    recentHooks: [],
    transitionCandidateHooks: [],
    playInterludeCandidateHooks: []
  });
}

function makeLeakyState(): LifeStorylineState {
  return freezeState({
    ...makeAlchemyState(),
    recentHooks: [{
      id: "trueName:SHOULD_NOT_LEAK_HIDDEN_NAME",
      sourceStorylineId: "storyline_apothecary_alchemy",
      sourceThreadId: "thread_furnace_dream",
      weight: 1,
      tags: ["alchemy", "hidden:trueName:SHOULD_NOT_LEAK_HIDDEN_NAME"],
      visibility: "hidden"
    }]
  });
}

function storyline(
  storylineId: string,
  status: StorylineProgress["status"],
  tags: readonly string[]
): StorylineProgress {
  return {
    storylineId,
    score: status === "fated" ? 100 : status === "dominant" ? 80 : 50,
    status,
    lastUpdatedMonth: 0,
    tags
  };
}

function eventThread(
  threadId: string,
  storylineId: string,
  stage: EventThreadProgress["stage"],
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
    flags: {},
    ...overrides
  };
}

function monthlyLog(
  ageMonth: number,
  eventId: string,
  hooks: readonly string[],
  tags: readonly string[]
): MonthlyLifeLogEntry {
  return {
    ageMonth,
    ageYear: Math.floor(ageMonth / 12),
    ageMonthInYear: ageMonth % 12,
    phaseId: "childhood",
    eventId,
    eventTitle: eventId,
    eventDescription: eventId,
    outcome: "normal",
    visibleEffectSummary: [],
    tags,
    hooks
  };
}

function makeOriginFateDraft(): OriginFateDraft {
  const generator = new DefaultOriginFateGenerator();
  return generator.generate({
    seed: "lst-c005-origin-fate",
    draftId: "lst-c005-origin-fate-draft",
    rerollIndex: 0,
    openingTags: [],
    destinyTags: [],
    spiritualRootTags: [],
    aptitudeTags: [],
    locks: {
      backgroundOriginId: "origin_apothecary_apprentice",
      hiddenFateId: "hidden_pill_saint_remains",
      carriedItemIds: ["item_apothecary_bronze_furnace"]
    }
  });
}

function makeNarrativeState(): OriginFateNarrativeStateV02 {
  return {
    origin: {
      originId: "origin_apothecary_apprentice",
      activeStorylineIds: ["storyline_alchemy_apothecary"],
      originThreadProgress: {
        storyline_alchemy_apothecary: 0
      },
      familyTie: 0,
      worldlyTie: 0,
      lifeEventBiasTags: ["origin:origin_apothecary_apprentice"],
      carriedItemBias: ["item_apothecary_bronze_furnace"],
      hiddenFateBias: ["hidden_alchemy_saint_bone"],
      regionTags: ["apothecary"],
      interludeBiasTags: ["interlude_fire_control_check"],
      eventPhaseSeeds: {
        earlyEcho: [],
        childhoodSeed: [],
        youthConflict: [],
        teenChoice: []
      },
      canonicalLifeStorylineIds: ["storyline_apothecary_alchemy"]
    },
    hiddenFates: [makeHiddenFate("hidden_alchemy_saint_bone")],
    carriedItems: [makeCarriedItem("item_apothecary_bronze_furnace")],
    visibleOmenLines: [],
    lifeEventBiasTags: ["hook_furnace_dream", "hook_fire_control"],
    majorChoiceSignals: ["branch_guard_furnace", "branch_try_medicine"],
    interludeBiasTags: ["interlude_fire_control_check"],
    stageTransitionTokens: ["token_alchemy_line_opened"],
    age18Hooks: ["age18_alchemy_furnace_memory"]
  };
}

function makeHiddenFate(hiddenFateId: string): HiddenFateNarrativeStateV02 {
  return {
    hiddenFateId,
    progress: 60,
    revealBand: "halfReveal",
    knownToPlayer: true,
    trueNameRevealed: false,
    misleadingOmenIds: [],
    omenHistory: []
  };
}

function makeCarriedItem(itemId: string): CarriedItemNarrativeStateV02 {
  return {
    itemId,
    affinity: 70,
    lifecycleStage: "resonating",
    eventHistory: [],
    damaged: false,
    converted: false
  };
}

function freezeState(
  state: Pick<LifeStorylineState, "activeStorylines" | "eventThreads" | "recentHooks" | "transitionCandidateHooks" | "playInterludeCandidateHooks"> &
    Partial<LifeStorylineState>
): LifeStorylineState {
  const downstreamActiveStorylineIds = state.downstreamActiveStorylineIds ??
    state.activeStorylines.map((storyline) => storyline.storylineId);
  const recentHooks = Object.freeze(state.recentHooks.map((hook) => Object.freeze({
    ...hook,
    tags: Object.freeze([...hook.tags])
  })));
  const transitionCandidateHooks = Object.freeze([...state.transitionCandidateHooks]);
  const playInterludeCandidateHooks = Object.freeze([...state.playInterludeCandidateHooks]);
  return Object.freeze({
    ...state,
    storylineScores: Object.freeze([...(state.storylineScores ?? state.activeStorylines)]),
    activeStorylines: Object.freeze(state.activeStorylines.map((item) => Object.freeze({
      ...item,
      tags: Object.freeze([...item.tags])
    }))),
    downstreamActiveStorylineIds: Object.freeze([...downstreamActiveStorylineIds]),
    eventThreads: Object.freeze(state.eventThreads.map((thread) => Object.freeze({
      ...thread,
      flags: Object.freeze({ ...thread.flags })
    }))),
    threadSummaries: Object.freeze((state.threadSummaries ?? state.eventThreads.map((thread) => ({
      threadId: thread.threadId,
      storylineId: thread.storylineId,
      stage: thread.stage,
      progress: thread.progress,
      tension: thread.tension,
      clarity: thread.clarity,
      risk: thread.risk
    }))).map((summary) => Object.freeze({ ...summary }))),
    recentHooks,
    recentStorylineHooks: Object.freeze([...(state.recentStorylineHooks ?? recentHooks)]),
    transitionCandidateHooks,
    playInterludeCandidateHooks,
    interludeCandidateSeeds: Object.freeze([...(state.interludeCandidateSeeds ?? playInterludeCandidateHooks)]),
    stageTransitionSignals: Object.freeze([...(state.stageTransitionSignals ?? transitionCandidateHooks)])
  });
}
