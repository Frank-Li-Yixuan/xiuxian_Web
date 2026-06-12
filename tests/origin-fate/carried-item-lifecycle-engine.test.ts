import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  advanceCarriedItemLifecycleStates,
  createCarriedItemAge18ConversionInput,
  createCarriedItemLifecycleHooks,
  generateCarriedItemNarrativeStates
} from "../../src/originFate/CarriedItemLifecycleEngine";
import { loadOriginFateNarrativeRegistry } from "../../src/originFate/OriginFateNarrativeRegistry";
import { SeededRng } from "../../src/sim/core/SeededRng";
import type {
  CarriedItemLifecycleEngineInput,
  CarriedItemLifecycleProgressEventV02,
  CarriedItemNarrativeStateV02
} from "../../src/types/origin-fate-narrative-types.v0.2";

describe("CarriedItemLifecycleEngine", () => {
  it("generates deterministic 1-2 unique carried item states with frozen output", () => {
    const registry = loadOriginFateNarrativeRegistry();
    const input = makeInput({
      seed: "hfo2-c004-generation",
      originId: "origin_fallen_cultivator_descendant",
      hiddenFateIds: ["hidden_past_life_sword_soul"],
      destinyIds: ["destiny_sword_bone"]
    });
    const before = structuredClone(input);

    const first = generateCarriedItemNarrativeStates(input, { registry });
    const second = generateCarriedItemNarrativeStates(
      {
        ...input,
        rng: new SeededRng("hfo2-c004-generation", "test")
      },
      { registry }
    );

    expect(second).toEqual(first);
    expect(input).toEqual(before);
    expect(first.items.length).toBeGreaterThanOrEqual(1);
    expect(first.items.length).toBeLessThanOrEqual(2);
    expect(new Set(first.items.map((item) => item.itemId)).size).toBe(first.items.length);
    expect(first.items[0]).toMatchObject({
      damaged: false,
      converted: false
    });
    expect(registry.getCarriedItemNarrative(first.items[0]!.itemId).lifecycle.map((entry) => entry.stage)).toContain(
      first.items[0]!.lifecycleStage
    );
    expect(first.debug.candidateWeights).toHaveLength(registry.carriedItems.length);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.items)).toBe(true);
    expect(Object.isFrozen(first.items[0])).toBe(true);
    expectSerializedOutputIsSafe(first, registry);
  });

  it("raises wooden sword affinity for fallen lineage and past-life sword soul context", () => {
    const registry = loadOriginFateNarrativeRegistry();
    const neutral = generateCarriedItemNarrativeStates(makeInput({ seed: "neutral-sword" }), { registry });
    const sword = generateCarriedItemNarrativeStates(
      makeInput({
        seed: "biased-sword",
        originId: "origin_fallen_cultivator_descendant",
        hiddenFateIds: ["hidden_past_life_sword_soul"],
        destinyIds: ["destiny_sword_bone"],
        lockedItemIds: ["item_wooden_sword"]
      }),
      { registry }
    );
    const item = sword.items[0]!;

    expect(item.itemId).toBe("item_wooden_sword");
    expect(item.affinity).toBeGreaterThan(affinityFor(neutral, "item_wooden_sword"));
    expect(item.lifecycleStage).toBe("resonating");
    expect(sword.debug.candidateWeights.find((candidate) => candidate.id === "item_wooden_sword")?.matchedTags).toEqual(
      expect.arrayContaining(["origin_fallen_cultivator_descendant", "hidden_past_life_sword_soul", "destiny_sword_bone"])
    );
    const hooks = createCarriedItemLifecycleHooks(sword.items, { registry });

    expect(hooks.monthlyEventHooks).toEqual(expect.arrayContaining(["hook_wooden_sword", "hook_bamboo_shadow"]));
    expect(hooks.interludeCandidateBiasTags).toContain("interlude:interlude_bamboo_sword_stg");
    expect(createCarriedItemAge18ConversionInput(sword.items, { registry }).items[0]?.age18Conversions).toEqual(
      expect.arrayContaining(["qingshuang_sword_fragment", "sword_soul_echo"])
    );
  });

  it("applies apothecary furnace and alchemy saint synergy as item affinity", () => {
    const registry = loadOriginFateNarrativeRegistry();
    const neutral = generateCarriedItemNarrativeStates(
      makeInput({
        seed: "neutral-furnace",
        lockedItemIds: ["item_apothecary_bronze_furnace"]
      }),
      { registry }
    );
    const alchemy = generateCarriedItemNarrativeStates(
      makeInput({
        seed: "alchemy-furnace",
        originId: "origin_apothecary_apprentice",
        hiddenFateIds: ["hidden_alchemy_saint_bone"],
        destinyIds: ["destiny_alchemy_genius"],
        lockedItemIds: ["item_apothecary_bronze_furnace"]
      }),
      { registry }
    );

    expect(alchemy.items[0]?.itemId).toBe("item_apothecary_bronze_furnace");
    expect(alchemy.items[0]?.affinity).toBeGreaterThan((neutral.items[0]?.affinity ?? 0) + 35);
    expect(alchemy.debug.candidateWeights.find((candidate) => candidate.id === "item_apothecary_bronze_furnace")).toMatchObject({
      matchedSynergyRuleIds: ["synergy_apothecary_furnace_dan_saint"],
      affinityBonus: expect.any(Number)
    });
  });

  it("projects black bone flute soul and heart-demon hooks", () => {
    const registry = loadOriginFateNarrativeRegistry();
    const flute = generateCarriedItemNarrativeStates(
      makeInput({
        seed: "grave-flute",
        originId: "origin_grave_keeper_child",
        hiddenFateIds: ["hidden_taiyin_remnant_vein", "hidden_demon_mark"],
        destinyIds: ["destiny_demon_seed", "destiny_taiyin_dream"],
        lockedItemIds: ["item_black_bone_flute"]
      }),
      { registry }
    );
    const hooks = createCarriedItemLifecycleHooks(flute.items, { registry });

    expect(flute.items[0]?.itemId).toBe("item_black_bone_flute");
    expect(hooks.monthlyEventHooks).toEqual(expect.arrayContaining(["hook_bone_flute", "hook_moon_dream"]));
    expect(hooks.majorChoiceHooks).toEqual(
      expect.arrayContaining([
        "hasCarriedItem:item_black_bone_flute",
        "hidden:hidden_taiyin_remnant_vein",
        "hidden:hidden_demon_mark"
      ])
    );
    expect(hooks.interludeCandidateBiasTags).toEqual(
      expect.arrayContaining(["interlude:interlude_dream_deckbuilder", "interlude:interlude_heart_demon_dbg"])
    );
  });

  it("advances affinity, lifecycle, damaged, and converted state from progress events", () => {
    const registry = loadOriginFateNarrativeRegistry();
    const states: readonly CarriedItemNarrativeStateV02[] = [
      makeItemState("item_wooden_sword", 34, "noticed"),
      makeItemState("item_black_bone_flute", 20, "obtained")
    ];
    const before = structuredClone(states);
    const events: readonly CarriedItemLifecycleProgressEventV02[] = [
      {
        id: "monthly-sword-practice",
        source: "monthly",
        tags: ["hook_wooden_sword"],
        itemId: "item_wooden_sword",
        affinityDelta: 75,
        ageMonth: 96
      },
      {
        id: "flute-heart-demon",
        source: "interlude",
        tags: ["hook_bone_flute"],
        itemId: "item_black_bone_flute",
        damaged: true,
        ageMonth: 97
      }
    ];

    const advanced = advanceCarriedItemLifecycleStates(states, events, { registry });
    const repeated = advanceCarriedItemLifecycleStates(states, events, { registry });

    expect(repeated).toEqual(advanced);
    expect(states).toEqual(before);
    expect(advanced.items.find((item) => item.itemId === "item_wooden_sword")).toMatchObject({
      affinity: 100,
      lifecycleStage: "converted",
      converted: true
    });
    expect(advanced.items.find((item) => item.itemId === "item_black_bone_flute")).toMatchObject({
      damaged: true,
      converted: false
    });
    expect(advanced.debug.progressEventsApplied).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventId: "monthly-sword-practice",
          itemId: "item_wooden_sword",
          appliedDelta: 75
        })
      ])
    );
  });

  it("throws readable missing lookup errors for unknown carried item ids", () => {
    const registry = loadOriginFateNarrativeRegistry();

    expect(() =>
      generateCarriedItemNarrativeStates(
        makeInput({
          seed: "missing-item",
          lockedItemIds: ["missing_item"]
        }),
        { registry }
      )
    ).toThrow("Missing origin fate v0.2 carried item narrative: missing_item");
    expect(() => createCarriedItemLifecycleHooks([makeItemState("missing_item", 0, "obtained")], { registry })).toThrow(
      "Missing origin fate v0.2 carried item narrative: missing_item"
    );
  });

  it("does not use nondeterministic or runtime side-effect APIs in the lifecycle engine", () => {
    const source = readFileSync("src/originFate/CarriedItemLifecycleEngine.ts", "utf8");

    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("performance.now");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("${hiddenFate.trueName}");
    expect(source).not.toContain("trueName:");
  });
});

function makeInput(options: {
  readonly seed: string;
  readonly originId?: string;
  readonly hiddenFateIds?: readonly string[];
  readonly destinyIds?: readonly string[];
  readonly lockedItemIds?: readonly string[];
}): CarriedItemLifecycleEngineInput {
  return {
    originId: options.originId ?? "origin_mountain_orphan",
    hiddenFateIds: options.hiddenFateIds ?? [],
    selectedDestinyIds: options.destinyIds ?? [],
    rng: new SeededRng(options.seed, "test"),
    ...(options.lockedItemIds === undefined ? {} : { lockedItemIds: options.lockedItemIds })
  };
}

function makeItemState(
  itemId: string,
  affinity: number,
  lifecycleStage: CarriedItemNarrativeStateV02["lifecycleStage"]
): CarriedItemNarrativeStateV02 {
  return {
    itemId,
    affinity,
    lifecycleStage,
    eventHistory: [],
    damaged: false,
    converted: false
  };
}

function affinityFor(
  result: ReturnType<typeof generateCarriedItemNarrativeStates>,
  itemId: string
): number {
  return result.debug.candidateWeights.find((candidate) => candidate.id === itemId)?.initialAffinity ?? 0;
}

function expectSerializedOutputIsSafe(
  result: ReturnType<typeof generateCarriedItemNarrativeStates>,
  registry: ReturnType<typeof loadOriginFateNarrativeRegistry>
): void {
  const serialized = JSON.stringify(result);
  for (const hiddenFate of registry.hiddenFates) {
    expect(serialized).not.toContain(hiddenFate.trueName);
  }
}
