import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  LIFE_INTERLUDE_TRIGGER_ENGINE_SOURCE,
  LifeInterludeTriggerEngine
} from "../../src/lifeInterludes/LifeInterludeTriggerEngine";
import { createLifeInterludeTriggerContextFromStorylines } from "../../src/lifeInterludes/LifeInterludeTriggerContextAdapter";
import type { MajorChoiceStorylineProjection } from "../../src/lifeSimulation/MajorChoiceStorylineAdapter";
import type {
  LifeInterludeCandidate,
  LifeInterludeHistoryEntry,
  LifeInterludeTriggerContext
} from "../../src/types/life-interlude-types.v0.1";
import type {
  EventThreadProgress,
  LifeStorylineState,
  StorylineProgress
} from "../../src/types/life-storylines-types.v0.1";

describe("LifeInterludeTriggerEngine", () => {
  it("evaluates checked-in LPI data deterministically and returns frozen candidates", () => {
    const engine = new LifeInterludeTriggerEngine();
    const context = makeContext({
      ageMonth: 150,
      recentHooks: ["wild_ginseng_field", "thunderstorm_omen"],
      activeStorylineTags: ["storyline:alchemy", "storyline:village_disaster"],
      activeThreadTags: ["thread:protect_medicine_field", "thread:thunder_omen"],
      rootTags: ["root:wood", "root:thunder"],
      destinyTags: ["destiny:alchemy_prodigy", "destiny:tribulation_affinity"],
      originTags: ["origin:herb_shop_apprentice"],
      itemTags: ["item:copper_furnace"]
    });

    const first = engine.evaluate(context);
    const second = engine.evaluate(context);

    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(0);
    expect(first.every((candidate) => candidate.autoResolveAllowed)).toBe(true);
    expect(first.every((candidate) => candidate.finalWeight >= 0)).toBe(true);
    expect(first.map((candidate) => candidate.finalWeight)).toEqual([...first.map((candidate) => candidate.finalWeight)].sort((a, b) => b - a));
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first[0])).toBe(true);
    expect((first[0]!.debug as { source?: string } | undefined)?.source).toBe(LIFE_INTERLUDE_TRIGGER_ENGINE_SOURCE);
  });

  it("allows only text checks during infancy and may return no candidates when no text check data exists", () => {
    const candidates = new LifeInterludeTriggerEngine().evaluate(makeContext({
      ageMonth: 24,
      recentHooks: ["thunderstorm_omen", "wild_ginseng_field", "system_static"],
      activeStorylineTags: ["storyline:village_disaster", "storyline:alchemy", "storyline:system_omen"],
      activeThreadTags: ["thread:thunder_omen", "thread:protect_medicine_field", "thread:system_static"]
    }));

    expect(candidates.every((candidate) => candidate.mode === "text_check")).toBe(true);
    expect(candidates.map((candidate) => candidate.mode)).not.toEqual(
      expect.arrayContaining(["stg", "horde", "deckbuilder", "formation_auto"])
    );
  });

  it("blocks childhood horde, formation, high difficulty, real-event, and system-preview playable candidates", () => {
    const evaluation = new LifeInterludeTriggerEngine().evaluateDetailed(makeContext({
      ageMonth: 96,
      recentHooks: ["wild_ginseng_field", "thunderstorm_omen", "system_static"],
      activeStorylineTags: ["storyline:alchemy", "storyline:village_disaster", "storyline:system_omen"],
      activeThreadTags: ["thread:protect_medicine_field", "thread:thunder_omen", "thread:system_static"],
      rootTags: ["root:wood", "root:thunder"],
      destinyTags: ["destiny:alchemy_prodigy", "destiny:heaven_jealous_talent"]
    }));

    expect(evaluation.candidates.map((candidate) => candidate.definitionId)).not.toEqual(
      expect.arrayContaining([
        "interlude_guard_medicine_field",
        "interlude_ancestral_jade_board",
        "interlude_rainy_back_mountain",
        "interlude_outer_battlefield_dream"
      ])
    );
    expect(evaluation.blocked).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ definitionId: "interlude_guard_medicine_field" }),
        expect.objectContaining({ definitionId: "interlude_ancestral_jade_board" }),
        expect.objectContaining({ definitionId: "interlude_rainy_back_mountain" }),
        expect.objectContaining({ definitionId: "interlude_outer_battlefield_dream" })
      ])
    );
  });

  it("does not return playable interlude candidates for an age-150 baseline without narrative evidence", () => {
    const candidates = new LifeInterludeTriggerEngine().evaluate(makeContext({
      ageMonth: 150,
      phaseId: "youth"
    }));

    expect(candidates.map((candidate) => candidate.definitionId)).not.toEqual(
      expect.arrayContaining([
        "interlude_daoist_symbol_trial",
        "interlude_ancestral_jade_board"
      ])
    );
    expect(candidates.every((candidate) => candidate.mode === "text_check")).toBe(true);
  });

  it("ranks rainy back mountain first for thunder, system, and village omen context", () => {
    const [top] = new LifeInterludeTriggerEngine().evaluate(makeContext({
      ageMonth: 132,
      recentHooks: ["thunderstorm_omen", "outer_battlefield_omen"],
      activeStorylineTags: ["storyline:system_omen", "storyline:village_disaster"],
      activeThreadTags: ["thread:back_mountain_shadow", "thread:thunder_omen"],
      rootTags: ["root:thunder"],
      destinyTags: ["destiny:tribulation_affinity", "destiny:heaven_jealous_talent"],
      itemTags: ["item:broken_wooden_sword"]
    }));

    expect(top).toMatchObject({
      definitionId: "interlude_rainy_back_mountain",
      mode: "stg",
      displayRisk: "有险",
      durationPreview: "90s"
    });
  });

  it("ranks medicine field guard first for apothecary alchemy context when horde is age-legal", () => {
    const [top] = new LifeInterludeTriggerEngine().evaluate(makeContext({
      ageMonth: 150,
      recentHooks: ["wild_ginseng_field", "insect_tide"],
      activeStorylineTags: ["storyline:alchemy"],
      activeThreadTags: ["thread:protect_medicine_field", "thread:insect_tide"],
      rootTags: ["root:wood", "root:earth", "root:fire"],
      destinyTags: ["destiny:alchemy_prodigy", "destiny:protect_life_merit"],
      originTags: ["origin:herb_shop_apprentice"],
      itemTags: ["item:copper_furnace"]
    }));

    expect(top?.definitionId).toBe("interlude_guard_medicine_field");
    expect(top?.mode).toBe("horde");
  });

  it("ranks daoist symbol trial first for private-school, daoist, and old-book context", () => {
    const [top] = new LifeInterludeTriggerEngine().evaluate(makeContext({
      ageMonth: 132,
      activeStorylineTags: ["storyline:daoist_temple", "storyline:cold_study"],
      activeThreadTags: ["thread:wandering_daoist_question", "thread:forbidden_page"],
      rootTags: ["root:water", "root:yin"],
      destinyTags: ["destiny:clear_glass_heart"],
      originTags: ["origin:private_school_child", "origin:daoist_temple_helper"],
      itemTags: ["item:wordless_page", "item:old_talisman"]
    }));

    expect(top?.definitionId).toBe("interlude_daoist_symbol_trial");
    expect(top?.mode).toBe("deckbuilder");
    expect(top?.durationPreview).toBe("6 turns");
  });

  it("ranks ancestral jade board first for jade and formation context", () => {
    const [top] = new LifeInterludeTriggerEngine().evaluate(makeContext({
      ageMonth: 150,
      activeStorylineTags: ["storyline:daoist_temple", "storyline:fallen_lineage"],
      activeThreadTags: ["thread:ancestral_jade_warm", "thread:geomantic_board", "thread:daoist_array"],
      rootTags: ["root:earth", "root:water"],
      destinyTags: ["destiny:seated_forgetfulness"],
      originTags: ["origin:daoist_temple_helper"],
      itemTags: ["item:ancestral_jade"]
    }));

    expect(top?.definitionId).toBe("interlude_ancestral_jade_board");
    expect(top?.mode).toBe("formation_auto");
  });

  it("applies mode cooldown, thread cooldown, and fatigue without producing negative weights", () => {
    const engine = new LifeInterludeTriggerEngine();
    const baseContext = makeContext({
      ageMonth: 150,
      recentHooks: ["wild_ginseng_field"],
      activeStorylineTags: ["storyline:alchemy"],
      activeThreadTags: ["thread:protect_medicine_field"],
      rootTags: ["root:wood"],
      destinyTags: ["destiny:alchemy_prodigy"],
      originTags: ["origin:herb_shop_apprentice"]
    });
    const penalizedContext = {
      ...baseContext,
      recentInterludesLast24Months: 4,
      interludeHistory: [
        history("interlude_recent_horde", "horde", 144, "thread:protect_medicine_field"),
        history("interlude_guard_medicine_field", "horde", 146, "thread:protect_medicine_field")
      ]
    } satisfies LifeInterludeTriggerContext;

    const base = findCandidate(engine.evaluate(baseContext), "interlude_guard_medicine_field");
    const penalized = findCandidate(engine.evaluate(penalizedContext), "interlude_guard_medicine_field");

    expect(penalized.finalWeight).toBeLessThan(base.finalWeight);
    expect(penalized.finalWeight).toBeGreaterThanOrEqual(0);
    expect((penalized.debug as { fatigueMultiplier?: number }).fatigueMultiplier).toBe(0.35);
    expect((penalized.debug as { penalties?: readonly unknown[] }).penalties?.length).toBeGreaterThanOrEqual(2);
  });

  it("blocks required-hook interludes until matching recent hooks are present", () => {
    const engine = new LifeInterludeTriggerEngine();
    const context = makeContext({
      ageMonth: 150,
      activeStorylineTags: ["storyline:alchemy"],
      activeThreadTags: ["thread:protect_medicine_field"],
      rootTags: ["root:wood"],
      destinyTags: ["destiny:alchemy_prodigy"],
      originTags: ["origin:herb_shop_apprentice"]
    });
    const withoutHook = engine.evaluateDetailed(context);
    const withHook = engine.evaluateDetailed({ ...context, recentHooks: ["wild_ginseng_field"] });

    expect(withoutHook.candidates.map((candidate) => candidate.definitionId)).not.toContain("interlude_guard_medicine_field");
    expect(withoutHook.blocked).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ definitionId: "interlude_guard_medicine_field", reason: "missingRequiredHook" })
      ])
    );
    expect(withHook.candidates.map((candidate) => candidate.definitionId)).toContain("interlude_guard_medicine_field");
  });

  it("is byte-identical for the same input and keeps serialized output public-safe", () => {
    const context = makeContext({
      ageMonth: 150,
      recentHooks: ["wild_ginseng_field", "trueName:SHOULD_NOT_LEAK_HIDDEN_NAME"],
      activeStorylineTags: ["storyline:alchemy", "hidden:trueName:SHOULD_NOT_LEAK_HIDDEN_NAME"],
      activeThreadTags: ["thread:protect_medicine_field"],
      originTags: ["origin:herb_shop_apprentice"],
      itemTags: ["item:copper_furnace", "hidden_trueName_SHOULD_NOT_LEAK_HIDDEN_NAME"]
    });
    const engine = new LifeInterludeTriggerEngine();
    const first = engine.evaluateDetailed(context);
    const second = engine.evaluateDetailed(context);
    const serialized = JSON.stringify(first);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(serialized).not.toContain("SHOULD_NOT_LEAK_HIDDEN_NAME");
    expect(serialized).not.toContain("trueName");
    expect(serialized).not.toContain("true_name");
    expect(serialized).not.toContain("truename");
  });

  it("does not use nondeterministic or runtime side-effect APIs in trigger sources", () => {
    for (const sourcePath of [
      "src/lifeInterludes/LifeInterludeTriggerEngine.ts",
      "src/lifeInterludes/LifeInterludeTriggerContextAdapter.ts"
    ]) {
      const source = readFileSync(sourcePath, "utf8");

      expect(source).not.toContain("Math.random");
      expect(source).not.toContain("Date.now");
      expect(source).not.toContain("performance.now");
      expect(source).not.toContain("document.");
      expect(source).not.toContain("fetch(");
      expect(source).not.toContain("localStorage");
      expect(source).not.toContain("src/sim");
    }
  });
});

describe("LifeInterludeTriggerContextAdapter", () => {
  it("builds frozen public-safe alchemy trigger context from downstream storyline state", () => {
    const state = makeAlchemyStorylineState();
    const first = createLifeInterludeTriggerContextFromStorylines({
      lifeStorylineState: state,
      ageMonth: 150,
      phaseId: "youth",
      rootTags: ["root:wood", "root:fire"],
      destinyTags: ["destiny:alchemy_prodigy"],
      originTags: ["origin:herb_shop_apprentice"],
      itemTags: ["item:copper_furnace"],
      majorChoiceProjection: makeMajorChoiceProjection(["wild_ginseng_field", "play_horde_guard_medicine_field"])
    });
    const second = createLifeInterludeTriggerContextFromStorylines({
      lifeStorylineState: state,
      ageMonth: 150,
      phaseId: "youth",
      rootTags: ["root:wood", "root:fire"],
      destinyTags: ["destiny:alchemy_prodigy"],
      originTags: ["origin:herb_shop_apprentice"],
      itemTags: ["item:copper_furnace"],
      majorChoiceProjection: makeMajorChoiceProjection(["wild_ginseng_field", "play_horde_guard_medicine_field"])
    });
    const candidates = new LifeInterludeTriggerEngine().evaluate(first);
    const serialized = JSON.stringify(first);

    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.recentHooks)).toBe(true);
    expect(first.recentHooks).toEqual(expect.arrayContaining(["wild_ginseng_field", "play_horde_guard_medicine_field"]));
    expect(first.activeStorylineTags).toEqual(expect.arrayContaining(["storyline:alchemy", "storyline:storyline_apothecary_alchemy"]));
    expect(first.activeThreadTags).toEqual(expect.arrayContaining(["thread:protect_medicine_field", "thread:thread_apothecary_sorting_herbs"]));
    expect(candidates.map((candidate) => candidate.definitionId)).toContain("interlude_guard_medicine_field");
    expect(serialized).not.toContain("SHOULD_NOT_LEAK_HIDDEN_NAME");
    expect(serialized).not.toContain("trueName");
    expect(serialized).not.toContain("true_name");
    expect(serialized).not.toContain("truename");
  });
});

function makeContext(overrides: Partial<LifeInterludeTriggerContext> = {}): LifeInterludeTriggerContext {
  return Object.freeze({
    ageMonth: 120,
    phaseId: "youth",
    recentMonthlyEventIds: [],
    recentHooks: [],
    activeStorylineTags: [],
    activeThreadTags: [],
    openingTags: [],
    destinyTags: [],
    rootTags: [],
    originTags: [],
    itemTags: [],
    currentWoundIds: [],
    currentHeartKnotIds: [],
    merit: 0,
    karma: 0,
    recentInterludesLast24Months: 0,
    interludeHistory: [],
    ...overrides
  });
}

function history(
  interludeId: string,
  mode: LifeInterludeHistoryEntry["mode"],
  ageMonth: number,
  sourceThreadId: string
): LifeInterludeHistoryEntry {
  return {
    interludeId,
    mode,
    ageMonth,
    outcome: "success",
    sourceThreadId
  };
}

function findCandidate(
  candidates: readonly LifeInterludeCandidate[],
  definitionId: string
): LifeInterludeCandidate {
  const candidate = candidates.find((item) => item.definitionId === definitionId);
  if (candidate === undefined) {
    throw new Error(`Missing candidate: ${definitionId}`);
  }
  return candidate;
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
    recentHooks: [{
      id: "safe_recent_hook",
      sourceStorylineId: "storyline_apothecary_alchemy",
      sourceThreadId: "thread_apothecary_sorting_herbs",
      weight: 1,
      tags: ["alchemy", "hidden:trueName:SHOULD_NOT_LEAK_HIDDEN_NAME"],
      visibility: "visible"
    }],
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
    score: status === "fated" ? 100 : status === "dominant" ? 80 : 55,
    status,
    lastUpdatedMonth: 0,
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

function makeMajorChoiceProjection(interludeCandidateHooks: readonly string[]): MajorChoiceStorylineProjection {
  return deepFreeze({
    choiceHooks: [],
    recentSixMonthHooks: ["recent_six_month_hook"],
    interludeCandidateHooks,
    transitionCandidateHooks: [],
    visibleHints: [],
    sixMonthWindow: {
      monthStart: 145,
      monthEnd: 150,
      logIds: [],
      hooks: ["recent_six_month_hook"],
      tags: ["alchemy"]
    },
    debug: {
      source: "life_storylines_v0_1_major_choice_adapter",
      activeStorylineIds: ["storyline_apothecary_alchemy"],
      activeThreadIds: ["thread_apothecary_sorting_herbs"],
      signalTags: ["alchemy", "wild_ginseng_field"]
    }
  });
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
