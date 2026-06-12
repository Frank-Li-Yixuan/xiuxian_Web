import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  advanceHiddenFateNarrativeState,
  generateHiddenFateNarrativeState
} from "../../src/originFate/HiddenFateNarrativeEngine";
import { loadOriginFateNarrativeRegistry } from "../../src/originFate/OriginFateNarrativeRegistry";
import { SeededRng } from "../../src/sim/core/SeededRng";
import type { DestinySelectionState, DestinyTraitState } from "../../src/types/character-creation-types.v0.1";
import type { OpeningInnateDraft } from "../../src/types/opening-generator-types.v0.1";
import type {
  CarriedItemNarrativeStateV02,
  HiddenFateNarrativeEngineInput,
  HiddenFateNarrativeProgressEventV02,
  HiddenFateNarrativeStateV02,
  OriginFateNarrativeStateV02,
  OriginStorylineResultV02
} from "../../src/types/origin-fate-narrative-types.v0.2";

describe("HiddenFateNarrativeEngine", () => {
  it("generates deterministic deep-frozen narrative state without mutating input or leaking hidden names", () => {
    const registry = loadOriginFateNarrativeRegistry();
    const input = makeEngineInput({
      seed: "hfo2-c002-deterministic",
      originId: "origin_mountain_orphan",
      itemIds: ["item_childhood_stone_talisman"],
      destinyIds: ["destiny_thunder_affinity"],
      openingTags: ["thunder", "tribulation", "root:thunder"],
      rootTags: ["root_thunder", "thunder"]
    });
    const before = structuredClone(input);

    const first = generateHiddenFateNarrativeState(input, { registry });
    const second = generateHiddenFateNarrativeState(
      {
        ...input,
        rng: new SeededRng("hfo2-c002-deterministic", "test")
      },
      { registry }
    );

    expect(second).toEqual(first);
    expect(input).toEqual(before);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.hiddenFates)).toBe(true);
    expect(Object.isFrozen(first.hiddenFates[0])).toBe(true);
    expect(first.hiddenFates[0]?.trueNameRevealed).toBe(false);
    expect(first.visibleOmenLines.length).toBeGreaterThan(0);
    expect(first.lifeEventBiasTags).toEqual(expect.arrayContaining(["hook_thunderstorm", "hook_bone_heat"]));
    expect(first.majorChoiceSignals).toContain("branch_answer_thunder");
    expect(first.stageTransitionTokens).toContain("token_bloodline_thunder_stirred");
    expect(first.age18Hooks).toContain("age18_thunder_half_awakened");
    expectSerializedOutputIsSafe(first, registry);
  });

  it("raises ancient thunder blood weighting and safe hooks for thunder opening and destiny context", () => {
    const registry = loadOriginFateNarrativeRegistry();
    const neutral = generateHiddenFateNarrativeState(
      makeEngineInput({
        seed: "hfo2-c002-neutral-thunder",
        originId: "origin_temple_servant",
        itemIds: ["item_old_incense_burner"],
        destinyIds: ["destiny_good_star"],
        openingTags: ["stable_mundane"],
        rootTags: ["root_wood"]
      }),
      { registry }
    );
    const thunder = generateHiddenFateNarrativeState(
      makeEngineInput({
        seed: "hfo2-c002-biased-thunder",
        originId: "origin_mountain_orphan",
        itemIds: ["item_childhood_stone_talisman"],
        destinyIds: ["destiny_thunder_affinity", "destiny_heaven_jealous_talent"],
        openingTags: ["thunder", "tribulation", "root:thunder", "heaven_attention"],
        rootTags: ["root_thunder", "thunder"]
      }),
      { registry }
    );

    expect(weightFor(thunder, "hidden_ancient_thunder_blood")).toBeGreaterThan(
      weightFor(neutral, "hidden_ancient_thunder_blood") + 80
    );
    expect(thunder.hiddenFates[0]?.hiddenFateId).toBe("hidden_ancient_thunder_blood");
    expect(thunder.lifeEventBiasTags).toEqual(
      expect.arrayContaining(["hook_thunderstorm", "hook_bone_heat", "hook_heaven_attention"])
    );
    expect(thunder.debug?.candidateWeights.find((candidate) => candidate.id === "hidden_ancient_thunder_blood")?.matchedTags).toEqual(
      expect.arrayContaining(["thunder", "tribulation", "root_thunder"])
    );
  });

  it("applies apothecary furnace synergy progress bonus to alchemy saint bone", () => {
    const registry = loadOriginFateNarrativeRegistry();
    const neutral = generateHiddenFateNarrativeState(
      makeEngineInput({
        seed: "hfo2-c002-neutral-alchemy",
        originId: "origin_hunter_child",
        itemIds: ["item_rust_bowstring"],
        destinyIds: ["destiny_body_vessel"],
        openingTags: ["martial"],
        rootTags: ["root_earth"]
      }),
      { registry }
    );
    const alchemy = generateHiddenFateNarrativeState(
      makeEngineInput({
        seed: "hfo2-c002-biased-alchemy",
        originId: "origin_apothecary_apprentice",
        itemIds: ["item_apothecary_bronze_furnace"],
        destinyIds: ["destiny_alchemy_genius", "destiny_medicine_affinity"],
        openingTags: ["alchemy", "medicine", "fire_control"],
        rootTags: ["root_fire", "root_wood"]
      }),
      { registry }
    );
    const alchemyDebug = alchemy.debug?.candidateWeights.find((candidate) => candidate.id === "hidden_alchemy_saint_bone");

    expect(weightFor(alchemy, "hidden_alchemy_saint_bone")).toBeGreaterThan(
      weightFor(neutral, "hidden_alchemy_saint_bone") + 90
    );
    expect(alchemy.hiddenFates[0]?.hiddenFateId).toBe("hidden_alchemy_saint_bone");
    expect(alchemyDebug?.matchedSynergyRuleIds).toContain("synergy_apothecary_furnace_dan_saint");
    expect(alchemyDebug?.progressBonus).toBe(15);
    expect(alchemyDebug?.itemAffinityTags).toContain("itemAffinity:item_apothecary_bronze_furnace:+20");
    expect(alchemy.hiddenFates[0]?.progress).toBeGreaterThan((neutral.hiddenFates[0]?.progress ?? 0) - 1);
  });

  it("advances progress deterministically to halfReveal at progress 60 and emits safe omen lines", () => {
    const registry = loadOriginFateNarrativeRegistry();
    const state = makeNarrativeState({
      hiddenFateId: "hidden_ancient_thunder_blood",
      progress: 55,
      revealBand: "stirring"
    });
    const event: HiddenFateNarrativeProgressEventV02 = {
      id: "event-progress-5",
      source: "test",
      tags: ["thunder"],
      hiddenFateId: "hidden_ancient_thunder_blood",
      progressDelta: 5,
      ageMonth: 120
    };

    const advanced = advanceHiddenFateNarrativeState(state, [event], { registry });

    expect(advanced.hiddenFates[0]).toMatchObject({
      hiddenFateId: "hidden_ancient_thunder_blood",
      progress: 60,
      revealBand: "halfReveal",
      trueNameRevealed: false,
      lastProgressMonth: 120
    });
    expect(advanced.visibleOmenLines.length).toBeGreaterThan(0);
    expect(advanced.debug?.progressEventsApplied).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventId: "event-progress-5",
          hiddenFateId: "hidden_ancient_thunder_blood",
          appliedDelta: 5
        })
      ])
    );
    expectSerializedOutputIsSafe(advanced, registry);
  });

  it("records known misdirection signals and ignores unknown broad misdirection ids", () => {
    const registry = loadOriginFateNarrativeRegistry();
    const state = generateHiddenFateNarrativeState(
      makeEngineInput({
        seed: "hfo2-c002-misdirection",
        originId: "origin_mountain_orphan",
        itemIds: ["item_childhood_stone_talisman"],
        destinyIds: ["destiny_thunder_affinity"],
        openingTags: ["thunder", "tribulation"],
        rootTags: ["root_thunder"],
        previousHiddenFates: [
          {
            hiddenFateId: "hidden_ancient_thunder_blood",
            progress: 35,
            revealBand: "omen",
            knownToPlayer: true,
            trueNameRevealed: false,
            misleadingOmenIds: ["mislead_thunder_tribulation", "mislead_system_battlefield"],
            omenHistory: []
          }
        ]
      }),
      { registry }
    );

    expect(state.hiddenFates[0]?.misleadingOmenIds).toEqual([
      "mislead_thunder_tribulation",
      "mislead_system_battlefield"
    ]);
    expect(state.visibleOmenLines).toEqual(expect.arrayContaining(["misdirection:thunder"]));
    expect(state.visibleOmenLines).not.toContain("misdirection:mislead_system_battlefield");
  });

  it("throws readable errors for unknown origin or carried item lookups", () => {
    const registry = loadOriginFateNarrativeRegistry();

    expect(() =>
      generateHiddenFateNarrativeState(
        makeEngineInput({
          seed: "hfo2-c002-missing-origin",
          originId: "missing_origin",
          itemIds: ["item_childhood_stone_talisman"]
        }),
        { registry }
      )
    ).toThrow("Missing origin fate v0.2 storyline: missing_origin");
    expect(() =>
      generateHiddenFateNarrativeState(
        makeEngineInput({
          seed: "hfo2-c002-missing-item",
          originId: "origin_mountain_orphan",
          itemIds: ["missing_item"]
        }),
        { registry }
      )
    ).toThrow("Missing origin fate v0.2 carried item narrative: missing_item");
  });

  it("does not use nondeterministic or runtime side-effect APIs in the engine", () => {
    const source = readFileSync("src/originFate/HiddenFateNarrativeEngine.ts", "utf8");

    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("performance.now");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("trueName:");
    expect(source).not.toContain("${hiddenFate.trueName}");
  });
});

function makeEngineInput(options: {
  readonly seed: string;
  readonly originId: string;
  readonly itemIds?: readonly string[];
  readonly destinyIds?: readonly string[];
  readonly openingTags?: readonly string[];
  readonly rootTags?: readonly string[];
  readonly previousHiddenFates?: readonly HiddenFateNarrativeStateV02[];
}): HiddenFateNarrativeEngineInput {
  const destinyIds = options.destinyIds ?? [];
  return {
    openingInnateDraft: makeOpeningDraft(options.seed, options.openingTags ?? [], options.rootTags ?? []),
    destinies: makeDestinies(destinyIds),
    originStoryline: {
      originId: options.originId,
      activeStorylineIds: [`storyline:${options.originId}`],
      matchedTags: options.openingTags ?? []
    },
    carriedItems: (options.itemIds ?? []).map(makeCarriedItemState),
    rng: new SeededRng(options.seed, "test"),
    currentMonth: 0,
    maxVisibleOmenLines: 4,
    ...(options.previousHiddenFates === undefined ? {} : { previousHiddenFates: options.previousHiddenFates })
  };
}

function makeOpeningDraft(seed: string, openingTags: readonly string[], rootTags: readonly string[]): OpeningInnateDraft {
  return {
    draftId: `draft-${seed}`,
    seed,
    rerollIndex: 0,
    archetype: {
      id: "archetype_test",
      name: "test",
      description: "test",
      tags: openingTags
    },
    aptitude: {
      rootBone: 80,
      comprehension: 80,
      inspiration: 80,
      fortune: 60,
      heart: 60,
      lifespan: 60
    },
    coreSeed: {
      jing: 60,
      qi: 60,
      shen: 60
    },
    spiritualRoot: {
      categoryId: "variant",
      displayName: "test",
      elements: {
        thunder: rootTags.includes("thunder") || rootTags.includes("root_thunder") ? 100 : 0,
        fire: rootTags.includes("root_fire") ? 80 : 0,
        wood: rootTags.includes("root_wood") ? 80 : 0,
        earth: rootTags.includes("root_earth") ? 80 : 0
      },
      primaryElement: rootTags.includes("thunder") || rootTags.includes("root_thunder") ? "thunder" : "wood",
      secondaryElements: [],
      purity: 80,
      stability: 60,
      conflict: 20,
      breadth: 40,
      relationTags: rootTags,
      tags: rootTags
    },
    growthBias: {
      jingGrowth: 1,
      qiGrowth: 1,
      shenGrowth: 1,
      studyBias: 1,
      martialBias: 1,
      alchemyBias: openingTags.includes("alchemy") ? 2 : 1,
      artifactBias: 1,
      seclusionBias: 1,
      adventureBias: 1
    },
    tags: {
      destinyBiasTags: openingTags,
      lifeEventBiasTags: openingTags,
      modeBiasTags: openingTags,
      hiddenFateBiasTags: openingTags
    },
    ninePalaceEvaluation: {
      attributes: {
        jing: 60,
        qi: 60,
        shen: 60,
        rootBone: 80,
        comprehension: 80,
        inspiration: 80,
        fortune: 60,
        heart: 60,
        lifespan: 60
      },
      threePowers: {
        heaven: 70,
        human: 70,
        earth: 70
      },
      derived: {
        talentScore: 80,
        vesselScore: 70,
        stabilityScore: 60,
        destinyPressureScore: openingTags.includes("thunder") ? 75 : 40,
        lateBloomScore: 40,
        rebellionScore: 40
      },
      wuxing: {
        metal: 30,
        wood: rootTags.includes("root_wood") ? 80 : 30,
        water: 30,
        fire: rootTags.includes("root_fire") ? 80 : 30,
        earth: rootTags.includes("root_earth") ? 80 : 30,
        thunder: rootTags.includes("thunder") || rootTags.includes("root_thunder") ? 90 : 20,
        yin: 20
      },
      tags: {
        destinyBiasTags: [...openingTags],
        lifeEventBiasTags: [...openingTags],
        hiddenFateBiasTags: [...openingTags],
        rootBiasTags: [...rootTags],
        modeBiasTags: [...openingTags],
        warnings: []
      }
    },
    distinctivenessScore: 80
  };
}

function makeDestinies(destinyIds: readonly string[]): DestinySelectionState {
  const [main = "destiny_good_star", first = "destiny_clear_glass_heart", second = "destiny_late_bloomer"] = destinyIds;
  return {
    main: makeTrait(main),
    secondary: [makeTrait(first), makeTrait(second)],
    flaw: makeTrait("flaw_none"),
    synergies: [],
    softConflicts: [],
    synergyWarnings: [],
    conflictWarnings: [],
    warnings: []
  };
}

function makeTrait(traitId: string): DestinyTraitState {
  return {
    traitId,
    name: traitId,
    rarity: traitId.startsWith("flaw_") ? "flaw" : "rare",
    tags: traitTags(traitId),
    positiveEffects: [],
    negativeEffects: []
  };
}

function traitTags(traitId: string): readonly string[] {
  if (traitId.includes("thunder")) {
    return ["thunder", "tribulation"];
  }
  if (traitId.includes("alchemy") || traitId.includes("medicine")) {
    return ["alchemy", "medicine", "fire_control"];
  }
  if (traitId.includes("body")) {
    return ["body", "bone", "martial"];
  }
  return [];
}

function makeCarriedItemState(itemId: string): CarriedItemNarrativeStateV02 {
  return {
    itemId,
    affinity: 30,
    lifecycleStage: "obtained",
    eventHistory: [],
    damaged: false,
    converted: false
  };
}

function makeNarrativeState(options: {
  readonly hiddenFateId: string;
  readonly progress: number;
  readonly revealBand: HiddenFateNarrativeStateV02["revealBand"];
}): OriginFateNarrativeStateV02 {
  return {
    origin: {
      originId: "origin_mountain_orphan",
      activeStorylineIds: ["storyline_village_calamity"],
      originThreadProgress: {
        storyline_village_calamity: 0
      },
      familyTie: 0,
      worldlyTie: 0,
      lifeEventBiasTags: [],
      carriedItemBias: ["item_childhood_stone_talisman"],
      hiddenFateBias: ["hidden_ancient_thunder_blood"],
      regionTags: [],
      interludeBiasTags: [],
      eventPhaseSeeds: {
        earlyEcho: [],
        childhoodSeed: [],
        youthConflict: [],
        teenChoice: []
      },
      canonicalLifeStorylineIds: ["storyline_village_calamity"]
    },
    hiddenFates: [
      {
        hiddenFateId: options.hiddenFateId,
        progress: options.progress,
        revealBand: options.revealBand,
        knownToPlayer: true,
        trueNameRevealed: false,
        misleadingOmenIds: [],
        omenHistory: []
      }
    ],
    carriedItems: [makeCarriedItemState("item_childhood_stone_talisman")],
    visibleOmenLines: [],
    lifeEventBiasTags: [],
    majorChoiceSignals: [],
    interludeBiasTags: [],
    stageTransitionTokens: [],
    age18Hooks: []
  };
}

function weightFor(state: OriginFateNarrativeStateV02, hiddenFateId: string): number {
  return state.debug?.candidateWeights.find((candidate) => candidate.id === hiddenFateId)?.weight ?? 0;
}

function expectSerializedOutputIsSafe(
  result: OriginFateNarrativeStateV02,
  registry: ReturnType<typeof loadOriginFateNarrativeRegistry>
): void {
  const serialized = JSON.stringify(result);
  for (const hiddenFate of registry.hiddenFates) {
    expect(serialized).not.toContain(hiddenFate.trueName);
  }
}
