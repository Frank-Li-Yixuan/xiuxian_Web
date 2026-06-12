import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  calculateOriginFateNarrativeMonthlyLifeEventWeight,
  createLifeEventContextFromOriginFateNarrative,
  createLifeInterludeContextFromOriginFateNarrative,
  createMajorChoiceContextFromOriginFateNarrative,
  createOriginFateNarrativeLifeEventSummary,
  createStageTransitionContextFromOriginFateNarrative,
  filterOriginFateNarrativeMonthlyLifeEventCandidates
} from "../../src/lifeSimulation/OriginFateNarrativeLifeHooks";
import { loadOriginFateNarrativeRegistry } from "../../src/originFate/OriginFateNarrativeRegistry";
import type {
  CarriedItemNarrativeStateV02,
  HiddenFateNarrativeStateV02,
  OriginFateNarrativeStateV02
} from "../../src/types/origin-fate-narrative-types.v0.2";
import type { MonthlyLifeEventDefinition } from "../../src/types/life-monthly-events-types.v0.1";

import monthlyEventsData from "../../data/life_sim/monthly_events.v0.1.json";

describe("OriginFateNarrativeLifeHooks", () => {
  it("raises alchemy furnace monthly event weights from apothecary, copper furnace, and alchemy saint context", () => {
    const neutral = createLifeEventContextFromOriginFateNarrative(makeState("neutral"), { ageMonths: 180 });
    const alchemyLate = createLifeEventContextFromOriginFateNarrative(makeState("alchemy"), { ageMonths: 180 });
    const alchemyEarly = createLifeEventContextFromOriginFateNarrative(makeState("alchemy"), { ageMonths: 24 });

    expect(weight("m052_copper_furnace_crack", alchemyLate)).toBeGreaterThan(weight("m052_copper_furnace_crack", neutral));
    expect(weight("m009_dream_of_cauldron", alchemyEarly)).toBeGreaterThan(
      weight("m009_dream_of_cauldron", createLifeEventContextFromOriginFateNarrative(makeState("neutral"), { ageMonths: 24 }))
    );
    expect(alchemyLate.allTags).toEqual(
      expect.arrayContaining(["alchemy", "past_life", "origin:herb_shop_apprentice", "hiddenBias:alchemy"])
    );
    expect(filterOriginFateNarrativeMonthlyLifeEventCandidates([event("m052_copper_furnace_crack")], alchemyLate)).toHaveLength(1);
  });

  it("raises wooden sword and sword-hum event weights and exposes wooden sword major choice hooks", () => {
    const neutral = createLifeEventContextFromOriginFateNarrative(makeState("neutral"), { ageMonths: 144 });
    const sword = createLifeEventContextFromOriginFateNarrative(makeState("sword"), { ageMonths: 144 });

    expect(weight("m039_sword_hum_in_dream", sword)).toBeGreaterThan(weight("m039_sword_hum_in_dream", neutral));
    expect(weight("m022_wooden_sword_game", createLifeEventContextFromOriginFateNarrative(makeState("sword"), { ageMonths: 72 }))).toBeGreaterThan(
      weight("m022_wooden_sword_game", createLifeEventContextFromOriginFateNarrative(makeState("neutral"), { ageMonths: 72 }))
    );

    const choice = createMajorChoiceContextFromOriginFateNarrative(makeState("sword"), {
      ageMonths: 144,
      phaseId: "juvenile"
    });

    expect(choice.hiddenFateHintTags).toEqual(expect.arrayContaining(["branch_trial_sword", "branch_follow_sword_sound"]));
    expect(choice.carriedItemTags).toEqual(
      expect.arrayContaining(["hasCarriedItem:item_wooden_sword", "item:broken_wooden_sword"])
    );
  });

  it("raises grave flute yin-dream weights and exposes dream interlude bias", () => {
    const grave = makeState("grave");
    const context = createLifeEventContextFromOriginFateNarrative(grave, { ageMonths: 180 });
    const neutral = createLifeEventContextFromOriginFateNarrative(makeState("neutral"), { ageMonths: 180 });

    expect(weight("m051_graveyard_vigil", context)).toBeGreaterThan(weight("m051_graveyard_vigil", neutral));
    expect(weight("m037_bone_flute_sound", createLifeEventContextFromOriginFateNarrative(grave, { ageMonths: 144 }))).toBeGreaterThan(
      weight("m037_bone_flute_sound", createLifeEventContextFromOriginFateNarrative(makeState("neutral"), { ageMonths: 144 }))
    );

    const interlude = createLifeInterludeContextFromOriginFateNarrative(grave, {
      ageMonth: 180,
      phaseId: "adolescence"
    });

    expect(interlude.activeThreadTags).toEqual(expect.arrayContaining(["interlude:interlude_dream_deckbuilder"]));
    expect(interlude.itemTags).toContain("item:item_black_bone_flute");
  });

  it("projects stage transition context and monthly log omens without hidden names, exact progress, or bands", () => {
    const registry = loadOriginFateNarrativeRegistry();
    const state = makeState("alchemy");
    const summary = createOriginFateNarrativeLifeEventSummary(state);
    const stage = createStageTransitionContextFromOriginFateNarrative(state);
    const serialized = JSON.stringify({ summary, stage });

    expect(stage.stageTransitionTokens).toContain("token_alchemy_line_opened");
    expect(stage.age18Hooks).toEqual(expect.arrayContaining(["age18_alchemy_furnace_memory", "starter_pill_bundle"]));
    expect(summary.monthlyLogOmenLines.length).toBeGreaterThan(0);
    expect(serialized).not.toContain("\"progress\"");
    expect(serialized).not.toContain("\"revealBand\"");
    for (const hiddenFate of registry.hiddenFates) {
      expect(serialized).not.toContain(hiddenFate.trueName);
    }
  });

  it("deep-freezes outputs, does not mutate input, and stays deterministic", () => {
    const state = makeState("sword");
    const before = structuredClone(state);

    const first = createOriginFateNarrativeLifeEventSummary(state);
    const second = createOriginFateNarrativeLifeEventSummary(state);

    expect(state).toEqual(before);
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.hiddenFateBands)).toBe(true);
    expect(JSON.stringify(first)).not.toContain("trueName");
  });

  it("does not use nondeterministic or runtime side-effect APIs in narrative life hooks", () => {
    const source = readFileSync("src/lifeSimulation/OriginFateNarrativeLifeHooks.ts", "utf8");

    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("performance.now");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("${hiddenFate.trueName}");
    expect(source).not.toContain("trueName:");
  });
});

function weight(
  eventId: string,
  context: ReturnType<typeof createLifeEventContextFromOriginFateNarrative>
): number {
  return calculateOriginFateNarrativeMonthlyLifeEventWeight(event(eventId), context);
}

function event(id: string): MonthlyLifeEventDefinition {
  const found = (monthlyEventsData as unknown as { events: readonly MonthlyLifeEventDefinition[] }).events.find((item) => item.id === id);
  if (found === undefined) {
    throw new Error(`missing monthly event fixture: ${id}`);
  }
  return found;
}

function makeState(kind: "neutral" | "alchemy" | "sword" | "grave"): OriginFateNarrativeStateV02 {
  switch (kind) {
    case "alchemy":
      return makeNarrativeState({
        originId: "origin_apothecary_apprentice",
        storylines: ["storyline_alchemy_apothecary"],
        canonicalStorylines: ["storyline_apothecary_alchemy"],
        regionTags: ["药王巷", "药铺", "药田"],
        hiddenFateId: "hidden_alchemy_saint_bone",
        itemId: "item_apothecary_bronze_furnace",
        hiddenHooks: ["hook_medicine_smell", "hook_furnace_dream", "hook_fire_control"],
        majorHooks: ["branch_guard_furnace", "branch_try_medicine"],
        interludeHooks: ["interlude_guard_medicine_field", "interlude_fire_control_check"],
        transitionTokens: ["token_alchemy_line_opened"],
        age18Hooks: ["age18_alchemy_furnace_memory", "age18_dan_room_bonus", "starter_pill_bundle"]
      });
    case "sword":
      return makeNarrativeState({
        originId: "origin_fallen_cultivator_descendant",
        storylines: ["storyline_fallen_lineage"],
        canonicalStorylines: ["storyline_fallen_cultivator_lineage"],
        regionTags: ["祖宅", "旧书箱", "祖坟坡"],
        hiddenFateId: "hidden_past_life_sword_soul",
        itemId: "item_wooden_sword",
        hiddenHooks: ["hook_wooden_sword", "hook_bamboo_shadow", "hook_old_cave"],
        majorHooks: ["branch_trial_sword", "branch_follow_sword_sound"],
        interludeHooks: ["interlude_bamboo_sword_stg"],
        transitionTokens: ["token_sword_memory_stirred"],
        age18Hooks: ["age18_qingshuang_sword_fragment", "age18_sword_soul_echo"]
      });
    case "grave":
      return makeNarrativeState({
        originId: "origin_grave_keeper_child",
        storylines: ["storyline_yin_dream_soul"],
        canonicalStorylines: ["storyline_yin_dream_soul"],
        regionTags: ["祖坟坡", "荒祠", "玄溪"],
        hiddenFateId: "hidden_taiyin_remnant_vein",
        itemId: "item_black_bone_flute",
        hiddenHooks: ["hook_moon_dream", "hook_grave_mist", "hook_soul_chill"],
        majorHooks: ["branch_moon_well", "branch_bone_flute"],
        interludeHooks: ["interlude_dream_deckbuilder", "interlude_soul_chess"],
        transitionTokens: ["token_yin_soul_stirred"],
        age18Hooks: ["age18_yin_half_awakened", "age18_soul_line_unlocked", "soul_line_hint"]
      });
    case "neutral":
      return makeNarrativeState({
        originId: "origin_mountain_orphan",
        storylines: ["storyline_village_calamity"],
        canonicalStorylines: ["storyline_village_calamity"],
        regionTags: ["山村"],
        hiddenFateId: "hidden_merit_seed",
        itemId: "item_childhood_stone_talisman",
        hiddenHooks: ["hook_small_merit"],
        majorHooks: ["branch_help_neighbor"],
        interludeHooks: [],
        transitionTokens: ["token_merit_seed_seen"],
        age18Hooks: ["age18_merit_seed"]
      });
  }
}

function makeNarrativeState(options: {
  readonly originId: string;
  readonly storylines: readonly string[];
  readonly canonicalStorylines: readonly string[];
  readonly regionTags: readonly string[];
  readonly hiddenFateId: string;
  readonly itemId: string;
  readonly hiddenHooks: readonly string[];
  readonly majorHooks: readonly string[];
  readonly interludeHooks: readonly string[];
  readonly transitionTokens: readonly string[];
  readonly age18Hooks: readonly string[];
}): OriginFateNarrativeStateV02 {
  return {
    origin: {
      originId: options.originId,
      activeStorylineIds: options.storylines,
      originThreadProgress: Object.fromEntries(options.storylines.map((id) => [id, 0])),
      familyTie: 0,
      worldlyTie: 0,
      lifeEventBiasTags: [`origin:${options.originId}`, ...options.regionTags],
      carriedItemBias: [options.itemId],
      hiddenFateBias: [options.hiddenFateId],
      regionTags: options.regionTags,
      interludeBiasTags: options.interludeHooks,
      eventPhaseSeeds: {
        earlyEcho: [],
        childhoodSeed: [],
        youthConflict: [],
        teenChoice: []
      },
      canonicalLifeStorylineIds: options.canonicalStorylines
    },
    hiddenFates: [makeHiddenFate(options.hiddenFateId)],
    carriedItems: [makeCarriedItem(options.itemId)],
    visibleOmenLines: [],
    lifeEventBiasTags: options.hiddenHooks,
    majorChoiceSignals: options.majorHooks,
    interludeBiasTags: options.interludeHooks,
    stageTransitionTokens: options.transitionTokens,
    age18Hooks: options.age18Hooks
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
