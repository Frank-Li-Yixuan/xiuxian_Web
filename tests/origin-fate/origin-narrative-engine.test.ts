import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  advanceOriginNarrativeState,
  createOriginStorylineLifeContext,
  generateOriginNarrativeState,
  toOriginStorylineResult
} from "../../src/originFate/OriginNarrativeEngine";
import { loadOriginFateNarrativeRegistry } from "../../src/originFate/OriginFateNarrativeRegistry";
import type {
  OriginNarrativeEngineInput,
  OriginNarrativeProgressEventV02,
  OriginNarrativeStateV02
} from "../../src/types/origin-fate-narrative-types.v0.2";

describe("OriginNarrativeEngine", () => {
  it("generates apothecary origin storyline state and LifeStorylines context", () => {
    const registry = loadOriginFateNarrativeRegistry();
    const origin = registry.getOriginStoryline("origin_apothecary_apprentice");
    const input = makeInput(origin.id);
    const before = structuredClone(input);

    const state = generateOriginNarrativeState(input, { registry });
    const repeated = generateOriginNarrativeState(makeInput(origin.id), { registry });
    const context = createOriginStorylineLifeContext(state);

    expect(repeated).toEqual(state);
    expect(input).toEqual(before);
    expect(state.originId).toBe(origin.id);
    expect(state.activeStorylineIds).toEqual(["storyline_alchemy_apothecary"]);
    expect(state.canonicalLifeStorylineIds).toEqual(["storyline_apothecary_alchemy"]);
    expect(state.originThreadProgress).toEqual({ storyline_alchemy_apothecary: 0 });
    expect(state.regionTags).toEqual(origin.regionTags);
    expect(state.carriedItemBias).toEqual(expect.arrayContaining(["item_apothecary_bronze_furnace"]));
    expect(state.hiddenFateBias).toEqual(expect.arrayContaining(["hidden_alchemy_saint_bone"]));
    expect(state.lifeEventBiasTags).toEqual(
      expect.arrayContaining([
        "origin:origin_apothecary_apprentice",
        "storyline:storyline_alchemy_apothecary",
        "item:item_apothecary_bronze_furnace",
        "hidden:hidden_alchemy_saint_bone"
      ])
    );
    expect(context.storylineBias).toEqual(["storyline_alchemy_apothecary"]);
    expect(context.canonicalLifeStorylineIds).toEqual(["storyline_apothecary_alchemy"]);
    expect(context.monthlyEventTags).toEqual(
      expect.arrayContaining([
        "origin:origin_apothecary_apprentice",
        "phase:early_echo",
        "item:item_apothecary_bronze_furnace",
        "hidden:hidden_alchemy_saint_bone"
      ])
    );
    expect(context.regionTags).toEqual(origin.regionTags);
    expect(toOriginStorylineResult(state)).toEqual({
      originId: origin.id,
      activeStorylineIds: ["storyline_alchemy_apothecary"],
      matchedTags: expect.arrayContaining(["origin:origin_apothecary_apprentice", "storyline:storyline_alchemy_apothecary"])
    });
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.activeStorylineIds)).toBe(true);
    expect(Object.isFrozen(state.eventPhaseSeeds.earlyEcho)).toBe(true);
    expectSerializedOutputIsSafe(state, registry);
  });

  it("projects fallen cultivator and grave keeper origins with canonical storyline aliases", () => {
    const registry = loadOriginFateNarrativeRegistry();
    const fallen = generateOriginNarrativeState(makeInput("origin_fallen_cultivator_descendant"), { registry });
    const grave = generateOriginNarrativeState(makeInput("origin_grave_keeper_child"), { registry });

    expect(fallen.activeStorylineIds).toEqual(["storyline_fallen_lineage"]);
    expect(fallen.canonicalLifeStorylineIds).toEqual(["storyline_fallen_cultivator_lineage"]);
    expect(fallen.carriedItemBias).toEqual(expect.arrayContaining(["item_wooden_sword", "item_blank_fragment"]));
    expect(fallen.hiddenFateBias).toContain("hidden_past_life_sword_soul");
    expect(createOriginStorylineLifeContext(fallen).monthlyEventTags).toEqual(
      expect.arrayContaining(["storyline:storyline_fallen_lineage", "lifeStoryline:storyline_fallen_cultivator_lineage"])
    );

    expect(grave.activeStorylineIds).toEqual(["storyline_yin_dream_soul"]);
    expect(grave.canonicalLifeStorylineIds).toEqual(["storyline_yin_dream_soul"]);
    expect(grave.carriedItemBias).toContain("item_black_bone_flute");
    expect(grave.hiddenFateBias).toEqual(expect.arrayContaining(["hidden_taiyin_remnant_vein", "hidden_demon_mark"]));
    expect(createOriginStorylineLifeContext(grave).monthlyEventTags).toEqual(
      expect.arrayContaining(["storyline:storyline_yin_dream_soul", "item:item_black_bone_flute", "phase:youth_conflict"])
    );
  });

  it("preserves all four origin event phase seed groups", () => {
    const registry = loadOriginFateNarrativeRegistry();
    const origin = registry.getOriginStoryline("origin_mountain_orphan");
    const state = generateOriginNarrativeState(makeInput(origin.id), { registry });

    expect(state.eventPhaseSeeds).toEqual({
      earlyEcho: origin.earlyEchoEvents,
      childhoodSeed: origin.childhoodSeedEvents,
      youthConflict: origin.youthConflictEvents,
      teenChoice: origin.teenChoiceEvents
    });
    expect(state.lifeEventBiasTags).toEqual(
      expect.arrayContaining(["phase:early_echo", "phase:childhood_seed", "phase:youth_conflict", "phase:teen_choice"])
    );
  });

  it("advances targeted storyline progress deterministically and clamps progress", () => {
    const registry = loadOriginFateNarrativeRegistry();
    const input = makeInput("origin_apothecary_apprentice", {
      activeStorylineIds: ["storyline_alchemy_apothecary", "storyline_custom_unknown", "storyline_alchemy_apothecary"]
    });
    const state = generateOriginNarrativeState(input, { registry });
    const before = structuredClone(state);
    const event: OriginNarrativeProgressEventV02 = {
      id: "progress-too-high",
      source: "test",
      tags: ["alchemy"],
      storylineId: "storyline_alchemy_apothecary",
      progressDelta: 150,
      ageMonth: 120
    };

    const advanced = advanceOriginNarrativeState(state, [event], { registry });
    const repeated = advanceOriginNarrativeState(state, [event], { registry });

    expect(repeated).toEqual(advanced);
    expect(state).toEqual(before);
    expect(state.activeStorylineIds).toEqual(["storyline_alchemy_apothecary", "storyline_custom_unknown"]);
    expect(advanced.originThreadProgress).toEqual({
      storyline_alchemy_apothecary: 100,
      storyline_custom_unknown: 0
    });
    expect(advanced.debug?.progressEventsApplied).toEqual([
      {
        eventId: "progress-too-high",
        storylineId: "storyline_alchemy_apothecary",
        appliedDelta: 150,
        matchedTags: ["alchemy"],
        source: "test",
        ageMonth: 120
      }
    ]);
  });

  it("throws readable errors for missing origin lookup", () => {
    const registry = loadOriginFateNarrativeRegistry();

    expect(() => generateOriginNarrativeState(makeInput("missing_origin"), { registry })).toThrow(
      "Missing origin fate v0.2 storyline: missing_origin"
    );
  });

  it("does not use nondeterministic or runtime side-effect APIs in the engine", () => {
    const source = readFileSync("src/originFate/OriginNarrativeEngine.ts", "utf8");

    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("performance.now");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("${hiddenFate.trueName}");
    expect(source).not.toContain("trueName:");
  });
});

function makeInput(
  originId: string,
  overrides: Partial<OriginNarrativeEngineInput> = {}
): OriginNarrativeEngineInput {
  return {
    originId,
    matchedTags: [],
    ...overrides
  };
}

function expectSerializedOutputIsSafe(
  result: OriginNarrativeStateV02,
  registry: ReturnType<typeof loadOriginFateNarrativeRegistry>
): void {
  const serialized = JSON.stringify(result);
  for (const hiddenFate of registry.hiddenFates) {
    expect(serialized).not.toContain(hiddenFate.trueName);
  }
}
