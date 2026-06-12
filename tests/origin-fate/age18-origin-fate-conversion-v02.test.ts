import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildAge18OriginFateInputV02,
  resolveAge18OriginFateConversionV02
} from "../../src/originFate/Age18OriginFateConversionEngineV02";
import { loadOriginFateNarrativeRegistry } from "../../src/originFate/OriginFateNarrativeRegistry";
import type {
  CarriedItemNarrativeStateV02,
  HiddenFateNarrativeStateV02,
  OriginFateNarrativeStateV02
} from "../../src/types/origin-fate-narrative-types.v0.2";

describe("Age18OriginFateConversionEngineV02", () => {
  it("converts high-affinity apothecary bronze furnace into pill and furnace hooks with traceability", () => {
    const input = buildAge18OriginFateInputV02(makeState("alchemy"));

    const resolution = resolveAge18OriginFateConversionV02(input);

    expect(resolution.convertedCarriedItems).toEqual([
      expect.objectContaining({
        itemId: "item_apothecary_bronze_furnace",
        affinity: 88,
        conversionIds: expect.arrayContaining(["starter_pill_bundle", "alchemy_fire_control"]),
        dongfuHooks: expect.arrayContaining(["broken_alchemy_furnace_bonus"])
      })
    ]);
    expect(resolution.outerBattlefieldModifiers).toEqual(
      expect.arrayContaining(["age18Conversion:starter_pill_bundle", "age18Conversion:alchemy_fire_control"])
    );
    expect(resolution.dongfuHooks).toContain("broken_alchemy_furnace_bonus");
    expect(resolution.longTermTags).toEqual(
      expect.arrayContaining([
        "origin:origin_apothecary_apprentice",
        "hiddenFate:hidden_alchemy_saint_bone:sealed",
        "carriedItem:item_apothecary_bronze_furnace:converted"
      ])
    );
    expect(resolution.traceability).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "item_apothecary_bronze_furnace",
          source: "carried_item_state",
          tags: expect.arrayContaining(["age18Conversion:starter_pill_bundle"])
        }),
        expect.objectContaining({
          id: "furnace-monthly-001",
          source: "life_event"
        })
      ])
    );
  });

  it("converts high-affinity wooden sword into sword fragment and sword soul hooks", () => {
    const resolution = resolveAge18OriginFateConversionV02(buildAge18OriginFateInputV02(makeState("sword")));

    expect(resolution.convertedCarriedItems).toEqual([
      expect.objectContaining({
        itemId: "item_wooden_sword",
        conversionIds: expect.arrayContaining(["qingshuang_sword_fragment", "sword_soul_echo"]),
        dongfuHooks: expect.arrayContaining(["artifact_repair_line", "sword_lineage_hint"])
      })
    ]);
    expect(resolution.outerBattlefieldModifiers).toEqual(
      expect.arrayContaining(["age18Conversion:qingshuang_sword_fragment", "age18Conversion:sword_soul_echo"])
    );
    expect(resolution.dongfuHooks).toEqual(expect.arrayContaining(["artifact_repair_line", "sword_lineage_hint"]));
    expect(resolution.longTermTags).toEqual(expect.arrayContaining(["carriedItem:item_wooden_sword:converted"]));
  });

  it("keeps low-progress hidden fate sealed with clue lines and no revealed name", () => {
    const registry = loadOriginFateNarrativeRegistry();
    const resolution = resolveAge18OriginFateConversionV02(buildAge18OriginFateInputV02(makeState("lowProgress")));

    expect(resolution.revealedHiddenFates).toHaveLength(0);
    expect(resolution.sealedHiddenFates).toEqual([
      expect.objectContaining({
        hiddenFateId: "hidden_alchemy_saint_bone",
        revealBand: "stirring",
        clueLines: expect.any(Array)
      })
    ]);
    expect(resolution.sealedHiddenFates[0]?.clueLines.length).toBeGreaterThan(0);
    expect(JSON.stringify(resolution.sealedHiddenFates)).not.toContain("revealedName");
    for (const hiddenFate of registry.hiddenFates) {
      expect(JSON.stringify({ sealed: resolution.sealedHiddenFates, debugTags: resolution.debugTags })).not.toContain(hiddenFate.trueName);
    }
  });

  it("reveals only awakened hidden fate names through the age18 reveal policy", () => {
    const registry = loadOriginFateNarrativeRegistry();
    const nearAwake = resolveAge18OriginFateConversionV02(buildAge18OriginFateInputV02(makeState("nearAwake")));
    const awakened = resolveAge18OriginFateConversionV02(buildAge18OriginFateInputV02(makeState("awakened")));
    const hiddenFate = registry.getHiddenFate("hidden_past_life_sword_soul");

    expect(nearAwake.revealedHiddenFates).toHaveLength(0);
    expect(nearAwake.sealedHiddenFates[0]).toEqual(
      expect.objectContaining({
        hiddenFateId: "hidden_past_life_sword_soul",
        revealBand: "nearAwake"
      })
    );
    expect(JSON.stringify(nearAwake)).not.toContain(hiddenFate.trueName);

    expect(awakened.revealedHiddenFates).toEqual([
      expect.objectContaining({
        hiddenFateId: "hidden_past_life_sword_soul",
        revealBand: "awakened",
        revealedName: hiddenFate.trueName,
        age18OutcomeIds: expect.arrayContaining(["age18_qingshuang_sword_fragment", "age18_sword_soul_echo"])
      })
    ]);
    expect(awakened.longTermTags).toContain("hiddenFate:hidden_past_life_sword_soul:revealed");
  });

  it("deep-freezes outputs, does not mutate input, and stays deterministic", () => {
    const input = buildAge18OriginFateInputV02(makeState("alchemy"));
    const before = structuredClone(input);

    const first = resolveAge18OriginFateConversionV02(input);
    const second = resolveAge18OriginFateConversionV02(input);

    expect(input).toEqual(before);
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.convertedCarriedItems)).toBe(true);
    expect(Object.isFrozen(first.traceability)).toBe(true);
  });

  it("does not use nondeterministic or runtime side-effect APIs in the age18 conversion engine", () => {
    const source = readFileSync("src/originFate/Age18OriginFateConversionEngineV02.ts", "utf8");

    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("performance.now");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("${hiddenFate.trueName}");
    expect(source).not.toContain("trueName:");
  });
});

function makeState(kind: "alchemy" | "sword" | "lowProgress" | "nearAwake" | "awakened"): OriginFateNarrativeStateV02 {
  switch (kind) {
    case "alchemy":
      return makeNarrativeState({
        originId: "origin_apothecary_apprentice",
        hiddenFate: makeHiddenFate("hidden_alchemy_saint_bone", 72, "halfReveal"),
        carriedItem: makeCarriedItem("item_apothecary_bronze_furnace", 88, "deepened", ["furnace-monthly-001"])
      });
    case "sword":
      return makeNarrativeState({
        originId: "origin_fallen_cultivator_descendant",
        hiddenFate: makeHiddenFate("hidden_past_life_sword_soul", 72, "halfReveal"),
        carriedItem: makeCarriedItem("item_wooden_sword", 91, "deepened", ["sword-choice-001"])
      });
    case "lowProgress":
      return makeNarrativeState({
        originId: "origin_apothecary_apprentice",
        hiddenFate: makeHiddenFate("hidden_alchemy_saint_bone", 40, "stirring"),
        carriedItem: makeCarriedItem("item_apothecary_bronze_furnace", 30, "noticed", [])
      });
    case "nearAwake":
      return makeNarrativeState({
        originId: "origin_fallen_cultivator_descendant",
        hiddenFate: makeHiddenFate("hidden_past_life_sword_soul", 99, "nearAwake"),
        carriedItem: makeCarriedItem("item_wooden_sword", 30, "noticed", [])
      });
    case "awakened":
      return makeNarrativeState({
        originId: "origin_fallen_cultivator_descendant",
        hiddenFate: makeHiddenFate("hidden_past_life_sword_soul", 100, "awakened"),
        carriedItem: makeCarriedItem("item_wooden_sword", 95, "converted", ["sword-interlude-001"])
      });
  }
}

function makeNarrativeState(options: {
  readonly originId: string;
  readonly hiddenFate: HiddenFateNarrativeStateV02;
  readonly carriedItem: CarriedItemNarrativeStateV02;
}): OriginFateNarrativeStateV02 {
  return {
    origin: {
      originId: options.originId,
      activeStorylineIds: [],
      originThreadProgress: {},
      familyTie: 0,
      worldlyTie: 0,
      lifeEventBiasTags: [`origin:${options.originId}`],
      carriedItemBias: [options.carriedItem.itemId],
      hiddenFateBias: [options.hiddenFate.hiddenFateId],
      regionTags: [],
      interludeBiasTags: [],
      eventPhaseSeeds: {
        earlyEcho: [],
        childhoodSeed: [],
        youthConflict: [],
        teenChoice: []
      },
      canonicalLifeStorylineIds: []
    },
    hiddenFates: [options.hiddenFate],
    carriedItems: [options.carriedItem],
    visibleOmenLines: [],
    lifeEventBiasTags: [],
    majorChoiceSignals: [],
    interludeBiasTags: [],
    stageTransitionTokens: [],
    age18Hooks: []
  };
}

function makeHiddenFate(
  hiddenFateId: string,
  progress: number,
  revealBand: HiddenFateNarrativeStateV02["revealBand"]
): HiddenFateNarrativeStateV02 {
  return {
    hiddenFateId,
    progress,
    revealBand,
    knownToPlayer: true,
    trueNameRevealed: progress >= 100,
    misleadingOmenIds: [],
    omenHistory: []
  };
}

function makeCarriedItem(
  itemId: string,
  affinity: number,
  lifecycleStage: CarriedItemNarrativeStateV02["lifecycleStage"],
  eventHistory: readonly string[]
): CarriedItemNarrativeStateV02 {
  return {
    itemId,
    affinity,
    lifecycleStage,
    eventHistory,
    damaged: false,
    converted: lifecycleStage === "converted"
  };
}
