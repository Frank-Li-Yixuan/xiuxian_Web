import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  advanceStorylineStateByMonthlyEvent,
  applyMonthlyEventStorylineWeight,
  calculateMonthlyEventStorylineBonus,
  createMonthlyEventStorylineProjection
} from "../../src/lifeSimulation/MonthlyEventStorylineAdapter";
import {
  calculateNinePalaceMonthlyLifeEventWeight,
  createLifeEventContextFromNinePalace
} from "../../src/lifeSimulation/NinePalaceLifeEventHooks";
import { evaluateNinePalace } from "../../src/ninePalace/NinePalaceScoring";
import type { MonthlyLifeEventDefinition } from "../../src/types/life-monthly-events-types.v0.1";
import type {
  EventThreadProgress,
  LifeStorylineState,
  StorylineProgress
} from "../../src/types/life-storylines-types.v0.1";
import type { NinePalaceAttributes } from "../../src/types/nine-palace-fate-types.v0.1";

import monthlyEventsData from "../../data/life_sim/monthly_events.v0.1.json";

const monthlyEvents = (monthlyEventsData as unknown as { readonly events: readonly MonthlyLifeEventDefinition[] }).events;

describe("MonthlyEventStorylineAdapter", () => {
  it("projects public-safe monthly event tags, required hooks, and suppression tags", () => {
    const projection = createMonthlyEventStorylineProjection(makeAlchemyState());
    const serialized = JSON.stringify(projection);

    expect(projection.monthlyEventWeightTags).toEqual(expect.arrayContaining([
      "alchemy",
      "herb",
      "furnace",
      "thread:thread_furnace_dream"
    ]));
    expect(projection.requiredHooks).toEqual(expect.arrayContaining([
      "hook_furnace_dream",
      "hook_herb_knowledge"
    ]));
    expect(projection.suppressionTags).toContain("destiny:artifact_blessed");
    expect(Object.isFrozen(projection)).toBe(true);
    expect(Object.isFrozen(projection.monthlyEventWeightTags)).toBe(true);
    expect(serialized).not.toContain("SHOULD_NOT_LEAK_HIDDEN_NAME");
    expect(serialized).not.toContain("trueName");
  });

  it("raises checked-in herb and furnace monthly events for the apothecary alchemy storyline", () => {
    const state = makeAlchemyState();

    for (const eventId of ["m013_herb_sorting", "m052_copper_furnace_crack", "m076_wild_ginseng"]) {
      const event = monthlyEvent(eventId);
      const baseWeight = event.baseWeight;

      expect(calculateMonthlyEventStorylineBonus(event, state), eventId).toBeGreaterThan(0);
      expect(applyMonthlyEventStorylineWeight(event, baseWeight, state), eventId).toBeGreaterThan(baseWeight);
      expect(applyMonthlyEventStorylineWeight(event, 0, state), eventId).toBe(0);
    }
  });

  it("raises bandit, demon, and calamity monthly events for a crisis village calamity thread", () => {
    const state = makeVillageCalamityCrisisState();
    const calamityFixture = monthlyEventFixture("fixture_calamity_alarm", ["calamity", "village", "danger"], "danger");

    for (const event of [monthlyEvent("m027_bandit_smoke"), monthlyEvent("m077_shadow_in_mirror"), calamityFixture]) {
      expect(calculateMonthlyEventStorylineBonus(event, state), event.id).toBeGreaterThan(0);
      expect(applyMonthlyEventStorylineWeight(event, event.baseWeight, state), event.id).toBeGreaterThan(event.baseWeight);
    }
  });

  it("raises system static and outer omen events for the system prelude storyline", () => {
    const state = makeSystemPreludeState();

    for (const eventId of ["m060_system_static", "m047_omen_of_outer_battlefield"]) {
      const event = monthlyEvent(eventId);
      expect(calculateMonthlyEventStorylineBonus(event, state), eventId).toBeGreaterThan(0);
      expect(applyMonthlyEventStorylineWeight(event, event.baseWeight, state), eventId).toBeGreaterThan(event.baseWeight);
    }
  });

  it("keeps existing monthly weight functions unchanged unless storyline input is supplied", () => {
    const context = createLifeEventContextFromNinePalace(evaluateNinePalace(BASE_ATTRIBUTES), { ageMonths: 72 });
    const event = monthlyEventFixture("reading_lesson", ["reading", "study"], "study");

    const defaultWeight = calculateNinePalaceMonthlyLifeEventWeight(event, context);
    const emptyOptionsWeight = calculateNinePalaceMonthlyLifeEventWeight(event, context, {});
    const storylineWeight = calculateNinePalaceMonthlyLifeEventWeight(event, context, {
      lifeStorylineState: makeAlchemyState()
    });

    expect(emptyOptionsWeight).toBe(defaultWeight);
    expect(storylineWeight).toBe(defaultWeight);
  });

  it("optionally connects storyline projection to existing monthly weight functions", () => {
    const context = createLifeEventContextFromNinePalace(evaluateNinePalace(BASE_ATTRIBUTES), { ageMonths: 72 });
    const event = monthlyEventFixture("fixture_herb_lesson", ["herb", "alchemy"], "alchemy");
    const baseWeight = calculateNinePalaceMonthlyLifeEventWeight(event, context);

    expect(calculateNinePalaceMonthlyLifeEventWeight(event, context, {
      lifeStorylineState: makeAlchemyState()
    })).toBeGreaterThan(baseWeight);
    expect(calculateNinePalaceMonthlyLifeEventWeight(event, context, {
      storylineProjection: createMonthlyEventStorylineProjection(makeAlchemyState())
    })).toBeGreaterThan(baseWeight);
  });

  it("advances a matching event thread from a monthly event result with public-safe recent hooks", () => {
    const state = makeAlchemyState();

    const first = advanceStorylineStateByMonthlyEvent({
      state,
      event: monthlyEvent("m052_copper_furnace_crack"),
      ageMonths: 180
    });
    const second = advanceStorylineStateByMonthlyEvent({
      state,
      event: monthlyEvent("m052_copper_furnace_crack"),
      ageMonths: 180
    });

    expect(first).toEqual(second);
    expect(first).not.toBe(state);
    expect(thread(first, "thread_furnace_dream").progress).toBeGreaterThan(thread(state, "thread_furnace_dream").progress);
    expect(first.recentHooks.map((hook) => hook.id)).toContain("monthly_event:m052_copper_furnace_crack:thread_furnace_dream");
    expect(JSON.stringify(first)).not.toContain("SHOULD_NOT_LEAK_HIDDEN_NAME");
    expect(JSON.stringify(first)).not.toContain("trueName");
  });

  it("does not use nondeterministic or runtime side-effect APIs in the adapter", () => {
    const source = readFileSync("src/lifeSimulation/MonthlyEventStorylineAdapter.ts", "utf8");

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

function monthlyEvent(id: string): MonthlyLifeEventDefinition {
  const found = monthlyEvents.find((event) => event.id === id);
  if (found === undefined) {
    throw new Error(`Missing monthly event fixture: ${id}`);
  }
  return found;
}

function monthlyEventFixture(
  id: string,
  tags: readonly string[],
  category: MonthlyLifeEventDefinition["category"]
): MonthlyLifeEventDefinition {
  return {
    id,
    title: id,
    description: id,
    ageRangeMonths: [0, 215],
    category,
    baseWeight: 10,
    tags,
    conditions: [],
    difficulty: 0,
    cooldownMonths: 0,
    visibleEffects: [],
    hiddenEffects: [],
    majorChoiceHooks: []
  };
}

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
    recentHooks: [{
      id: "recent_hidden_fixture",
      sourceStorylineId: "storyline_apothecary_alchemy",
      sourceThreadId: "thread_furnace_dream",
      weight: 1,
      tags: ["alchemy", "hidden:trueName:SHOULD_NOT_LEAK_HIDDEN_NAME"],
      visibility: "hidden"
    }],
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
      }),
      eventThread("thread_demon_beast_at_fence", "storyline_village_calamity", "crisis", {
        progress: 68,
        tension: 72,
        risk: 45
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
        progress: 40,
        clarity: 5
      })
    ],
    recentHooks: [],
    transitionCandidateHooks: [],
    playInterludeCandidateHooks: []
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

function thread(state: LifeStorylineState, threadId: string): EventThreadProgress {
  const found = state.eventThreads.find((candidate) => candidate.threadId === threadId);
  if (found === undefined) {
    throw new Error(`Missing event thread ${threadId}`);
  }
  return found;
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
    activeStorylines: Object.freeze(state.activeStorylines.map((storyline) => Object.freeze({
      ...storyline,
      tags: Object.freeze([...storyline.tags])
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
