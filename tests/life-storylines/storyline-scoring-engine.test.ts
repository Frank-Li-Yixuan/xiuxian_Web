import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { StorylineScoringEngine } from "../../src/lifeStorylines/StorylineScoringEngine";
import { evaluateNinePalace } from "../../src/ninePalace/NinePalaceScoring";
import type { DestinySelectionState, DestinyTraitState } from "../../src/types/character-creation-types.v0.1";
import type { LifeSimulationState } from "../../src/types/life-monthly-events-types.v0.1";
import type { StorylineScoringInput } from "../../src/types/life-storylines-types.v0.1";
import type { NinePalaceAttributes } from "../../src/types/nine-palace-fate-types.v0.1";
import type { OpeningInnateDraft } from "../../src/types/opening-generator-types.v0.1";
import type { OriginFateDraft } from "../../src/types/origin-fate-types.v0.1";
import type { OriginFateNarrativeStateV02 } from "../../src/types/origin-fate-narrative-types.v0.2";

describe("StorylineScoringEngine", () => {
  it("evaluates checked-in storylines deterministically into frozen progress rows", () => {
    const engine = new StorylineScoringEngine();
    const input = makeScoringInput({
      seed: "lst-c002-deterministic",
      originId: "origin_apothecary_apprentice",
      canonicalStorylineIds: ["storyline_apothecary_alchemy"],
      hiddenFateId: "hidden_alchemy_saint_remains",
      carriedItemId: "item_copper_furnace",
      destinyIds: ["destiny_alchemy_talent"],
      rootElements: { wood: 60, fire: 40 },
      rootTags: ["root:wood", "root:fire"],
      attributes: baseAttributes()
    });

    const first = engine.evaluateDetailed(input);
    const second = engine.evaluateDetailed(input);

    expect(first).toEqual(second);
    expect(first.storylines).toHaveLength(8);
    expect(first.activeStorylines.length).toBeGreaterThan(0);
    expect(first.debug.selectedThreads.length).toBeGreaterThan(0);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.storylines)).toBe(true);
    expect(Object.isFrozen(first.storylines[0])).toBe(true);
    expect(engine.evaluate(input)).toEqual(first.storylines);
  });

  it("ranks the apothecary alchemy storyline highest for an alchemy child", () => {
    const result = new StorylineScoringEngine().evaluateDetailed(makeScoringInput({
      seed: "sample_alchemy_child",
      originId: "origin_apothecary_apprentice",
      canonicalStorylineIds: ["storyline_apothecary_alchemy"],
      hiddenFateId: "hidden_alchemy_saint_remains",
      carriedItemId: "item_copper_furnace",
      destinyIds: ["destiny_alchemy_talent"],
      rootElements: { wood: 65, fire: 35 },
      rootTags: ["root:wood", "root:fire"],
      attributes: baseAttributes({ qi: 72, comprehension: 70, inspiration: 68 })
    }));

    expect(result.storylines[0]).toMatchObject({
      storylineId: "storyline_apothecary_alchemy",
      score: 100,
      status: "fated"
    });
    expect(result.debug.scoreBreakdownByStoryline.storyline_apothecary_alchemy).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "originNarrative:canonicalActive", weight: 25 }),
        expect.objectContaining({ source: "origin", weight: 28 }),
        expect.objectContaining({ source: "destiny", weight: 25 }),
        expect.objectContaining({ source: "carriedItem", weight: 22 })
      ])
    );
  });

  it("ranks the fallen cultivator lineage storyline highest for a waste-root sword fixture", () => {
    const result = new StorylineScoringEngine().evaluateDetailed(makeScoringInput({
      seed: "sample_waste_sword",
      originId: "origin_fallen_cultivator_descendant",
      canonicalStorylineIds: ["storyline_fallen_cultivator_lineage"],
      hiddenFateId: "hidden_previous_life_sword_soul",
      carriedItemId: "item_broken_wooden_sword",
      destinyIds: ["destiny_waste_root_reversal", "destiny_natural_sword_bone"],
      rootElements: { metal: 60, wood: 40 },
      rootTags: ["root:metal", "root:wood"],
      attributes: baseAttributes({ rootBone: 82, comprehension: 55, inspiration: 72 })
    }));

    expect(requireTopStoryline(result).storylineId).toBe("storyline_fallen_cultivator_lineage");
    expect(requireTopStoryline(result).score).toBe(100);
  });

  it("ranks the yin dream soul storyline highest for a yin dream soul fixture", () => {
    const result = new StorylineScoringEngine().evaluateDetailed(makeScoringInput({
      seed: "sample_yin_dream",
      originId: "origin_grave_keeper_child",
      canonicalStorylineIds: ["storyline_yin_dream_soul"],
      hiddenFateId: "hidden_taiyin_remnant_pulse",
      carriedItemId: "item_black_bone_flute",
      destinyIds: ["destiny_demon_heart_seed"],
      rootElements: { yin: 100 },
      rootTags: ["root:yin"],
      attributes: baseAttributes({ shen: 88, inspiration: 76, heart: 52 })
    }));

    expect(requireTopStoryline(result).storylineId).toBe("storyline_yin_dream_soul");
    expect(requireTopStoryline(result).score).toBe(100);
  });

  it("keeps system, calamity, and scholar storylines high for a thunder heaven-jealous fixture", () => {
    const result = new StorylineScoringEngine().evaluateDetailed(makeScoringInput({
      seed: "sample_thunder_talent",
      originId: "origin_mountain_village_orphan",
      canonicalStorylineIds: [
        "storyline_system_prelude",
        "storyline_village_calamity",
        "storyline_poor_scholar"
      ],
      hiddenFateId: "hidden_system_resonance_body",
      carriedItemId: "item_unwritten_page",
      destinyIds: [
        "destiny_heaven_jealous_talent",
        "destiny_disaster_star",
        "destiny_life_protection_merit"
      ],
      rootElements: { thunder: 100 },
      rootTags: ["root:thunder"],
      attributes: baseAttributes({
        comprehension: 92,
        inspiration: 94,
        fortune: 24,
        lifespan: 32
      })
    }));

    const topFour = result.storylines.slice(0, 4).map((storyline) => storyline.storylineId);

    expect(topFour).toEqual(expect.arrayContaining([
      "storyline_system_prelude",
      "storyline_village_calamity",
      "storyline_poor_scholar"
    ]));
    expect(result.storylines.find((storyline) => storyline.storylineId === "storyline_system_prelude")?.score).toBe(100);
    expect(result.storylines.filter((storyline) => storyline.status === "fated")).toHaveLength(1);
    expect(result.storylines.filter((storyline) => storyline.status === "dominant").length).toBeLessThanOrEqual(2);
  });

  it("does not leak hidden names through debug output", () => {
    const result = new StorylineScoringEngine().evaluateDetailed(makeScoringInput({
      seed: "lst-c002-leak-scan",
      originId: "origin_apothecary_apprentice",
      canonicalStorylineIds: ["storyline_apothecary_alchemy"],
      hiddenFateId: "hidden_alchemy_saint_remains",
      carriedItemId: "item_copper_furnace",
      destinyIds: ["destiny_alchemy_talent"],
      rootElements: { wood: 60, fire: 40 },
      rootTags: ["root:wood", "root:fire"],
      attributes: baseAttributes(),
      secretHiddenName: "SHOULD_NOT_LEAK_HIDDEN_NAME"
    }));

    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("SHOULD_NOT_LEAK_HIDDEN_NAME");
    expect(result.debug.signalTags).not.toEqual(expect.arrayContaining([
      "hidden:hidden_alchemy_saint_remains",
      "hidden_alchemy_saint_remains"
    ]));
  });

  it("can include optional life simulation signals without implementing monthly events", () => {
    const result = new StorylineScoringEngine().evaluateDetailed(makeScoringInput({
      seed: "lst-c002-life-state",
      originId: "origin_mountain_village_orphan",
      canonicalStorylineIds: ["storyline_village_calamity"],
      hiddenFateId: "hidden_outer_battlefield_echo",
      carriedItemId: "item_unwritten_page",
      destinyIds: ["destiny_disaster_star"],
      rootElements: { thunder: 100 },
      rootTags: ["root:thunder"],
      attributes: baseAttributes({ fortune: 25 }),
      lifeSimulationState: {
        ageMonths: 96,
        phaseId: "youth",
        flags: { village_alarm: true },
        monthlyLogs: [
          {
            ageMonth: 96,
            ageYear: 8,
            ageMonthInYear: 0,
            phaseId: "youth",
            eventId: "event_village_smoke_fixture",
            eventTitle: "Village Smoke",
            eventDescription: "Fixture monthly log",
            outcome: "normal",
            visibleEffectSummary: [],
            tags: ["origin_mountain_village_orphan", "destiny:disaster_star"],
            hooks: ["majorChoice:village_smoke"]
          }
        ]
      }
    }));

    expect(result.storylines.find((storyline) => storyline.storylineId === "storyline_village_calamity")?.status)
      .toMatch(/active|dominant|fated/);
  });

  it("does not use nondeterministic or runtime side-effect APIs in the scoring engine", () => {
    const source = readFileSync("src/lifeStorylines/StorylineScoringEngine.ts", "utf8");

    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("performance.now");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("localStorage");
  });
});

function requireTopStoryline(result: ReturnType<StorylineScoringEngine["evaluateDetailed"]>) {
  const top = result.storylines[0];
  if (top === undefined) {
    throw new Error("Expected at least one storyline");
  }
  return top;
}

function makeScoringInput(options: {
  readonly seed: string;
  readonly originId: string;
  readonly canonicalStorylineIds: readonly string[];
  readonly hiddenFateId: string;
  readonly carriedItemId: string;
  readonly destinyIds: readonly string[];
  readonly rootElements: Readonly<Record<string, number>>;
  readonly rootTags: readonly string[];
  readonly attributes: NinePalaceAttributes;
  readonly secretHiddenName?: string;
  readonly lifeSimulationState?: Partial<LifeSimulationState>;
}): StorylineScoringInput {
  const ninePalaceEvaluation = evaluateNinePalace(options.attributes);
  const openingDraft: OpeningInnateDraft = {
    draftId: `${options.seed}:opening`,
    seed: options.seed,
    rerollIndex: 0,
    archetype: {
      id: "fixture_archetype",
      name: "Fixture Archetype",
      description: "Storyline scoring fixture",
      tags: []
    },
    aptitude: {
      rootBone: options.attributes.rootBone,
      comprehension: options.attributes.comprehension,
      inspiration: options.attributes.inspiration,
      fortune: options.attributes.fortune,
      heart: options.attributes.heart,
      lifespan: options.attributes.lifespan
    },
    coreSeed: {
      jing: options.attributes.jing,
      qi: options.attributes.qi,
      shen: options.attributes.shen
    },
    spiritualRoot: {
      categoryId: Object.keys(options.rootElements).length > 1 ? "dual" : "single",
      displayName: "Fixture Root",
      elements: options.rootElements,
      primaryElement: Object.keys(options.rootElements)[0] as never,
      secondaryElements: Object.keys(options.rootElements).slice(1) as never,
      purity: 82,
      stability: 70,
      conflict: 12,
      breadth: 30,
      relationTags: options.rootTags,
      tags: options.rootTags
    },
    growthBias: {
      jingGrowth: 1,
      qiGrowth: 1,
      shenGrowth: 1,
      studyBias: 1,
      martialBias: 1,
      alchemyBias: 1,
      artifactBias: 1,
      seclusionBias: 1,
      adventureBias: 1
    },
    tags: {
      destinyBiasTags: ninePalaceEvaluation.tags.destinyBiasTags,
      lifeEventBiasTags: ninePalaceEvaluation.tags.lifeEventBiasTags,
      hiddenFateBiasTags: ninePalaceEvaluation.tags.hiddenFateBiasTags,
      modeBiasTags: ninePalaceEvaluation.tags.modeBiasTags
    },
    ninePalaceEvaluation,
    distinctivenessScore: 0
  };
  const originFate = makeOriginFate(options);
  return {
    ageMonths: options.lifeSimulationState?.ageMonths ?? 0,
    openingDraft,
    ninePalaceEvaluation,
    destinySelection: makeDestinySelection(options.destinyIds),
    originFate,
    originFateNarrativeState: makeOriginNarrativeState(options),
    ...(options.lifeSimulationState === undefined ? {} : {
      lifeSimulationState: {
        ...makeMinimalLifeSimulationState(options.seed),
        ...options.lifeSimulationState
      } as LifeSimulationState
    })
  };
}

function makeOriginFate(options: {
  readonly seed: string;
  readonly originId: string;
  readonly hiddenFateId: string;
  readonly carriedItemId: string;
  readonly secretHiddenName?: string;
}): OriginFateDraft {
  return {
    draftId: `${options.seed}:origin`,
    seed: options.seed,
    rerollIndex: 0,
    backgroundOrigin: {
      originId: options.originId,
      name: options.originId,
      visibleDescription: "fixture origin",
      appliedWeight: 1,
      matchedTags: [options.originId, `origin:${options.originId}`]
    },
    hiddenFateInternal: {
      hiddenFateId: options.hiddenFateId,
      trueName: options.secretHiddenName ?? "fixture internal hidden name",
      category: "pastLife",
      progress: 42,
      progressBand: "stirring",
      matchedTags: [options.hiddenFateId, `hidden:${options.hiddenFateId}`],
      appliedWeight: 1
    },
    visibleHiddenOmen: {
      vagueLevel: "stirring",
      levelLabel: "stirring",
      hints: ["fixture omen"],
      riskHint: "fixture risk",
      relatedTags: [options.hiddenFateId, `hidden:${options.hiddenFateId}`]
    },
    carriedItems: [
      {
        itemId: options.carriedItemId,
        name: options.carriedItemId,
        visibleDescription: "fixture item",
        conversion: {
          type: "artifact_clue",
          label: "fixture conversion",
          outerBattlefieldEffect: "fixture_outer_effect",
          dongfuHook: "fixture_dongfu_hook"
        },
        matchedTags: [options.carriedItemId, `item:${options.carriedItemId}`],
        appliedWeight: 1
      }
    ],
    lifeEventBiasTags: [
      options.originId,
      `origin:${options.originId}`,
      options.hiddenFateId,
      `hidden:${options.hiddenFateId}`,
      options.carriedItemId,
      `item:${options.carriedItemId}`
    ],
    modeProjectionTags: [],
    age18ConversionHooks: []
  };
}

function makeOriginNarrativeState(options: {
  readonly originId: string;
  readonly canonicalStorylineIds: readonly string[];
  readonly hiddenFateId: string;
  readonly carriedItemId: string;
}): OriginFateNarrativeStateV02 {
  const originThreadProgress = Object.fromEntries(options.canonicalStorylineIds.map((id) => [id, 55]));
  return {
    origin: {
      originId: options.originId,
      activeStorylineIds: [...options.canonicalStorylineIds],
      originThreadProgress,
      familyTie: 0,
      worldlyTie: 0,
      lifeEventBiasTags: [
        options.originId,
        `origin:${options.originId}`,
        ...options.canonicalStorylineIds.map((id) => `lifeStoryline:${id}`),
        options.hiddenFateId,
        `hidden:${options.hiddenFateId}`,
        options.carriedItemId,
        `item:${options.carriedItemId}`
      ],
      carriedItemBias: [options.carriedItemId],
      hiddenFateBias: [options.hiddenFateId],
      regionTags: ["fixture_region"],
      interludeBiasTags: [],
      eventPhaseSeeds: {
        earlyEcho: [],
        childhoodSeed: [],
        youthConflict: [],
        teenChoice: []
      },
      canonicalLifeStorylineIds: [...options.canonicalStorylineIds]
    },
    hiddenFates: [
      {
        hiddenFateId: options.hiddenFateId,
        progress: 42,
        revealBand: "stirring",
        knownToPlayer: false,
        trueNameRevealed: false,
        misleadingOmenIds: [],
        omenHistory: []
      }
    ],
    carriedItems: [
      {
        itemId: options.carriedItemId,
        affinity: 55,
        lifecycleStage: "noticed",
        eventHistory: [],
        damaged: false,
        converted: false
      }
    ],
    visibleOmenLines: ["fixture omen"],
    lifeEventBiasTags: [
      options.originId,
      `origin:${options.originId}`,
      options.hiddenFateId,
      `hidden:${options.hiddenFateId}`,
      options.carriedItemId,
      `item:${options.carriedItemId}`
    ],
    majorChoiceSignals: [],
    interludeBiasTags: [],
    stageTransitionTokens: [],
    age18Hooks: []
  };
}

function makeDestinySelection(destinyIds: readonly string[]): DestinySelectionState {
  const main = makeDestinyTrait(destinyIds[0] ?? "destiny_clear_glass_heart");
  const secondary0 = makeDestinyTrait(destinyIds[1] ?? "destiny_clear_glass_heart");
  const secondary1 = makeDestinyTrait(destinyIds[2] ?? "destiny_sitting_forgetfulness");
  const flaw = makeDestinyTrait(destinyIds[3] ?? "destiny_cowardly_survivor");
  return {
    main,
    secondary: [secondary0, secondary1],
    flaw,
    synergies: [],
    softConflicts: [],
    synergyWarnings: [],
    conflictWarnings: [],
    warnings: []
  };
}

function makeDestinyTrait(id: string): DestinyTraitState {
  return {
    traitId: id,
    name: id,
    rarity: "legendary",
    tags: [id, toDestinyAlias(id)],
    positiveEffects: [],
    negativeEffects: []
  };
}

function makeMinimalLifeSimulationState(seed: string): LifeSimulationState {
  return {
    profileId: "profile_fixture",
    characterId: "character_fixture",
    seed,
    rngState: {},
    ageMonths: 0,
    phaseId: "infancy",
    core: { jing: 60, qi: 60, shen: 60 },
    aptitude: {
      rootBone: 60,
      comprehension: 60,
      inspiration: 60,
      fortune: 60,
      heart: 60,
      lifespan: 60
    },
    lifeSkills: {
      study: 0,
      martial: 0,
      alchemy: 0,
      craft: 0,
      social: 0,
      stealth: 0,
      ritual: 0,
      survival: 0
    },
    karma: 0,
    merit: 0,
    heartDemon: 0,
    wounds: [],
    heartKnots: [],
    family: {
      kinship: 0,
      familyStrain: 0,
      familyWealth: 0,
      flags: {}
    },
    relationships: [],
    hiddenFateProgress: {},
    carriedItemAffinity: {},
    flags: {},
    monthlyLogs: []
  };
}

function baseAttributes(overrides: Partial<NinePalaceAttributes> = {}): NinePalaceAttributes {
  return {
    jing: 60,
    qi: 60,
    shen: 60,
    rootBone: 60,
    comprehension: 60,
    inspiration: 60,
    fortune: 60,
    heart: 60,
    lifespan: 60,
    ...overrides
  };
}

function toDestinyAlias(id: string): string {
  return id.startsWith("destiny_") ? `destiny:${id.slice("destiny_".length)}` : id;
}
