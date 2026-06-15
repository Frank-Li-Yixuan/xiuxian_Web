import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  EVENT_THREAD_ENGINE_SOURCE,
  EventThreadEngine
} from "../../src/lifeStorylines/EventThreadEngine";
import { loadLifeStorylineRegistry } from "../../src/lifeStorylines/LifeStorylineRegistry";
import type {
  EventThreadProgress,
  StorylineProgress
} from "../../src/types/life-storylines-types.v0.1";

describe("EventThreadEngine", () => {
  it("initializes deterministic frozen event thread state from checked-in data", () => {
    const engine = new EventThreadEngine();
    const input = {
      ageMonths: 96,
      activeStorylines: [
        makeStoryline("storyline_apothecary_alchemy", 100, "fated"),
        makeStoryline("storyline_poor_scholar", 62, "active"),
        makeStoryline("storyline_hunter_martial", 18, "dormant")
      ],
      signalTags: [
        "origin_apothecary_apprentice",
        "destiny:alchemy_talent",
        "item_copper_furnace",
        "hidden:alchemy_saint_remains",
        "private_school"
      ],
      statValues: { comprehension: 72 }
    } as const;

    const first = engine.initializeThreads(input);
    const second = engine.initializeThreads(input);

    expect(first).toEqual(second);
    expect(first.activeStorylines.map((storyline) => storyline.storylineId)).toEqual([
      "storyline_apothecary_alchemy",
      "storyline_poor_scholar"
    ]);
    expect(first.eventThreads).toHaveLength(3);
    expect(first.debug?.selectedThreads).toEqual(first.eventThreads.map((thread) => thread.threadId));
    expect(first.debug?.scoreBreakdownByStoryline[EVENT_THREAD_ENGINE_SOURCE]).toBeDefined();
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.eventThreads)).toBe(true);
    expect(Object.isFrozen(first.eventThreads[0])).toBe(true);
  });

  it("selects furnace dream and a herb-related thread for an alchemy fixture", () => {
    const registry = loadLifeStorylineRegistry();
    const state = new EventThreadEngine().initializeThreads({
      ageMonths: 108,
      activeStorylines: [makeStoryline("storyline_apothecary_alchemy", 100, "fated")],
      signalTags: [
        "origin_apothecary_apprentice",
        "destiny:alchemy_talent",
        "hidden:alchemy_saint_remains",
        "item_copper_furnace",
        "root:wood",
        "root:fire"
      ]
    });

    const threadIds = state.eventThreads.map((thread) => thread.threadId);

    expect(threadIds).toContain("thread_furnace_dream");
    expect(threadIds.some((id) =>
      id !== "thread_furnace_dream" && registry.getThread(id).threadTags.includes("herb")
    )).toBe(true);
    expect(state.eventThreads.find((thread) => thread.threadId === "thread_furnace_dream")).toMatchObject({
      storylineId: "storyline_apothecary_alchemy",
      progress: 65,
      tension: 20,
      clarity: 15,
      risk: 0,
      stage: "developing"
    });
  });

  it("applies hook deltas, clamps meters, and derives stages", () => {
    const engine = new EventThreadEngine();
    const base = makeThread({ progress: 80, tension: 20, clarity: 40, risk: 10, stage: "developing" });

    const advanced = engine.advanceThreadByHook(base, {
      id: "hook_resolution_fixture",
      threadId: base.threadId,
      progressDelta: 40,
      tensionDelta: -80,
      clarityDelta: 30,
      riskDelta: -20,
      occurredAtMonth: 132
    });

    expect(advanced).toMatchObject({
      progress: 100,
      tension: 0,
      clarity: 70,
      risk: 0,
      stage: "resolved",
      lastEventMonth: 132
    });
    expect(Object.isFrozen(advanced)).toBe(true);
  });

  it("generates play interlude candidates when tension reaches crisis threshold", () => {
    const engine = new EventThreadEngine();
    const state = engine.initializeThreads({
      ageMonths: 144,
      activeStorylines: [makeStoryline("storyline_apothecary_alchemy", 70, "dominant")],
      signalTags: ["hidden:alchemy_saint_remains", "item_copper_furnace"]
    });

    const advanced = engine.advanceStateByHook(state, {
      id: "hook_furnace_tension",
      threadId: "thread_furnace_dream",
      tensionDelta: 60,
      tags: ["fire_control", "hidden:trueName:SHOULD_NOT_LEAK_HIDDEN_NAME"],
      weight: 9
    });

    expect(advanced.eventThreads.find((thread) => thread.threadId === "thread_furnace_dream")?.stage).toBe("crisis");
    expect(advanced.playInterludeCandidateHooks).toContain("play_dbg_fire_control");
    expect(JSON.stringify(advanced)).not.toContain("SHOULD_NOT_LEAK_HIDDEN_NAME");
  });

  it("emits transition hooks when progress and clarity resolve a thread", () => {
    const engine = new EventThreadEngine();
    const state = engine.initializeThreads({
      ageMonths: 168,
      activeStorylines: [makeStoryline("storyline_apothecary_alchemy", 100, "fated")],
      signalTags: ["hidden:alchemy_saint_remains", "item_copper_furnace"]
    });

    const advanced = engine.advanceStateByHook(state, {
      id: "hook_furnace_resolved",
      threadId: "thread_furnace_dream",
      progressDelta: 30,
      clarityDelta: 50
    });

    expect(advanced.eventThreads.find((thread) => thread.threadId === "thread_furnace_dream")?.stage).toBe("resolved");
    expect(advanced.transitionCandidateHooks).toEqual(expect.arrayContaining([
      "age18_alchemy_home_hook",
      "hook_hidden_alchemy_progress",
      "transition_alchemy_apprentice",
      "transition_furnace_affinity"
    ]));
  });

  it("moves high risk through crisis into failed and emits failure hooks", () => {
    const engine = new EventThreadEngine();
    const state = engine.initializeThreads({
      activeStorylines: [makeStoryline("storyline_apothecary_alchemy", 100, "fated")],
      signalTags: ["hidden:alchemy_saint_remains", "item_copper_furnace"]
    });

    const crisis = engine.advanceStateByHook(state, {
      id: "hook_furnace_risk",
      threadId: "thread_furnace_dream",
      riskDelta: 70
    });
    const failed = engine.advanceStateByHook(crisis, {
      id: "hook_furnace_failed",
      threadId: "thread_furnace_dream",
      riskDelta: 20
    });

    expect(crisis.eventThreads.find((thread) => thread.threadId === "thread_furnace_dream")?.stage).toBe("crisis");
    expect(failed.eventThreads.find((thread) => thread.threadId === "thread_furnace_dream")?.stage).toBe("failed");
    expect(failed.transitionCandidateHooks).toContain("heartKnot_furnace_fear");
  });

  it("keeps returned debug and recent hooks public-safe", () => {
    const engine = new EventThreadEngine();
    const state = engine.initializeThreads({
      activeStorylines: [makeStoryline("storyline_apothecary_alchemy", 100, "fated")],
      signalTags: [
        "origin_apothecary_apprentice",
        "hidden:alchemy_saint_remains",
        "hidden:trueName:SHOULD_NOT_LEAK_HIDDEN_NAME"
      ],
      recentHooks: [{
        id: "hook_existing_hidden",
        sourceStorylineId: "storyline_apothecary_alchemy",
        sourceThreadId: "thread_furnace_dream",
        weight: 1,
        tags: ["alchemy", "hidden:trueName:SHOULD_NOT_LEAK_HIDDEN_NAME"],
        visibility: "hidden"
      }]
    });

    const advanced = engine.advanceStateByHook(state, {
      id: "hook_public_fixture",
      threadId: "thread_furnace_dream",
      tags: ["alchemy", "hidden:alchemy_saint_remains", "trueName:SHOULD_NOT_LEAK_HIDDEN_NAME"]
    });
    const serialized = JSON.stringify(advanced);

    expect(serialized).not.toContain("SHOULD_NOT_LEAK_HIDDEN_NAME");
    expect(advanced.debug?.signalTags).not.toEqual(expect.arrayContaining([
      "hidden:alchemy_saint_remains"
    ]));
    expect(advanced.recentHooks.flatMap((hook) => hook.tags)).toEqual(expect.arrayContaining(["alchemy"]));
    expect(advanced.recentHooks.flatMap((hook) => hook.tags).some((tag) => tag.includes("hidden"))).toBe(false);
  });

  it("does not use nondeterministic or runtime side-effect APIs in the engine", () => {
    const source = readFileSync("src/lifeStorylines/EventThreadEngine.ts", "utf8");

    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("performance.now");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("localStorage");
  });
});

function makeStoryline(
  storylineId: string,
  score: number,
  status: StorylineProgress["status"]
): StorylineProgress {
  return {
    storylineId,
    score,
    status,
    lastUpdatedMonth: 0,
    tags: [`storyline:${storylineId}`]
  };
}

function makeThread(overrides: Partial<EventThreadProgress> = {}): EventThreadProgress {
  return {
    threadId: "thread_furnace_dream",
    storylineId: "storyline_apothecary_alchemy",
    stage: "developing",
    progress: 40,
    tension: 0,
    clarity: 0,
    risk: 0,
    flags: {},
    ...overrides
  };
}
