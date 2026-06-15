import { evaluateNinePalace } from "../ninePalace/NinePalaceScoring";
import type { DestinySelectionState, DestinyTraitState } from "../types/character-creation-types.v0.1";
import type { LifeSimulationState } from "../types/life-monthly-events-types.v0.1";
import type {
  EventThreadProgress,
  LifeStorylineState,
  StorylineScoringEvaluation,
  StorylineScoringInput
} from "../types/life-storylines-types.v0.1";
import type { NinePalaceAttributes } from "../types/nine-palace-fate-types.v0.1";
import type { ElementId, OpeningInnateDraft } from "../types/opening-generator-types.v0.1";
import type {
  CarriedItemNarrativeStateV02,
  HiddenFateNarrativeStateV02,
  OriginFateNarrativeStateV02
} from "../types/origin-fate-narrative-types.v0.2";
import type { OriginFateDraft } from "../types/origin-fate-types.v0.1";
import { EventThreadEngine } from "./EventThreadEngine";
import { loadLifeStorylineRegistry } from "./LifeStorylineRegistry";
import { StorylineScoringEngine } from "./StorylineScoringEngine";

export const DEV_LIFE_STORYLINE_SAMPLE_IDS = [
  "sample_alchemy_child",
  "sample_waste_sword",
  "sample_yin_dream",
  "sample_thunder_talent",
  "sample_village_calamity"
] as const;

export type DevLifeStorylineSampleId = (typeof DEV_LIFE_STORYLINE_SAMPLE_IDS)[number];

export interface DevLifeStorylineSample {
  readonly id: DevLifeStorylineSampleId;
  readonly label: string;
  readonly summary: string;
}

export interface DevLifeStorylinesReport {
  readonly sample: DevLifeStorylineSample;
  readonly scoring: StorylineScoringEvaluation;
  readonly activeStorylines: StorylineScoringEvaluation["activeStorylines"];
  readonly scoreBreakdownByStoryline: StorylineScoringEvaluation["debug"]["scoreBreakdownByStoryline"];
  readonly eventThreads: LifeStorylineState["eventThreads"];
  readonly playInterludeCandidateHooks: LifeStorylineState["playInterludeCandidateHooks"];
  readonly transitionCandidateHooks: LifeStorylineState["transitionCandidateHooks"];
  readonly debug: {
    readonly signalTags: readonly string[];
    readonly selectedThreads: readonly string[];
  };
}

interface DevLifeStorylineFixture extends DevLifeStorylineSample {
  readonly seed: string;
  readonly ageMonths: number;
  readonly originId: string;
  readonly canonicalStorylineIds: readonly string[];
  readonly hiddenFateId: string;
  readonly carriedItemId: string;
  readonly destinyIds: readonly string[];
  readonly rootElements: Readonly<Partial<Record<ElementId, number>>>;
  readonly rootTags: readonly string[];
  readonly attributes: NinePalaceAttributes;
  readonly extraSignalTags?: readonly string[];
  readonly focusedThreadIds?: readonly string[];
  readonly threadTargets?: readonly {
    readonly threadId: string;
    readonly progress: number;
    readonly tension: number;
    readonly clarity: number;
    readonly risk: number;
  }[];
}

export const DEV_LIFE_STORYLINE_SAMPLES: readonly DevLifeStorylineSample[] = Object.freeze([
  {
    id: "sample_alchemy_child",
    label: "药铺丹修",
    summary: "药铺学徒 + 木火灵根 + 丹道奇才 + 药铺铜炉"
  },
  {
    id: "sample_waste_sword",
    label: "废灵剑修",
    summary: "破落修士之后 + 残破木剑 + 废灵逆命 + 前世剑魄"
  },
  {
    id: "sample_yin_dream",
    label: "阴梦魂修",
    summary: "守墓人之子 + 阴灵根 + 太阴残脉 + 黑骨短笛"
  },
  {
    id: "sample_thunder_talent",
    label: "天妒雷修",
    summary: "山村孤儿 + 雷灵根 + 天妒英才 + 劫雷亲和"
  },
  {
    id: "sample_village_calamity",
    label: "山村灾劫",
    summary: "山村孤儿 + 灾星命格 + 山贼烟尘危机"
  }
]);

const DEV_LIFE_STORYLINE_FIXTURES: Readonly<Record<DevLifeStorylineSampleId, DevLifeStorylineFixture>> = {
  sample_alchemy_child: {
    id: "sample_alchemy_child",
    label: "药铺丹修",
    summary: "药铺学徒 + 木火灵根 + 丹道奇才 + 药铺铜炉",
    seed: "dev-life-storyline-alchemy",
    ageMonths: 108,
    originId: "origin_apothecary_apprentice",
    canonicalStorylineIds: ["storyline_apothecary_alchemy"],
    hiddenFateId: "hidden_alchemy_saint_remains",
    carriedItemId: "item_copper_furnace",
    destinyIds: ["destiny_alchemy_talent"],
    rootElements: { wood: 65, fire: 35 },
    rootTags: ["root:wood", "root:fire"],
    attributes: baseAttributes({ qi: 72, comprehension: 70, inspiration: 68 }),
    extraSignalTags: ["alchemy", "herb", "furnace"]
  },
  sample_waste_sword: {
    id: "sample_waste_sword",
    label: "废灵剑修",
    summary: "破落修士之后 + 残破木剑 + 废灵逆命 + 前世剑魄",
    seed: "dev-life-storyline-waste-sword",
    ageMonths: 120,
    originId: "origin_fallen_cultivator_descendant",
    canonicalStorylineIds: ["storyline_fallen_cultivator_lineage"],
    hiddenFateId: "hidden_previous_life_sword_soul",
    carriedItemId: "item_broken_wooden_sword",
    destinyIds: ["destiny_waste_root_reversal", "destiny_natural_sword_bone"],
    rootElements: { metal: 60, wood: 40 },
    rootTags: ["root:metal", "root:wood"],
    attributes: baseAttributes({ rootBone: 82, comprehension: 55, inspiration: 72 }),
    extraSignalTags: ["fallen_lineage", "wooden_sword"],
    focusedThreadIds: ["thread_wooden_sword_rings"]
  },
  sample_yin_dream: {
    id: "sample_yin_dream",
    label: "阴梦魂修",
    summary: "守墓人之子 + 阴灵根 + 太阴残脉 + 黑骨短笛",
    seed: "dev-life-storyline-yin-dream",
    ageMonths: 132,
    originId: "origin_grave_keeper_child",
    canonicalStorylineIds: ["storyline_yin_dream_soul"],
    hiddenFateId: "hidden_taiyin_remnant_pulse",
    carriedItemId: "item_black_bone_flute",
    destinyIds: ["destiny_demon_heart_seed"],
    rootElements: { yin: 100 },
    rootTags: ["root:yin"],
    attributes: baseAttributes({ shen: 88, inspiration: 76, heart: 52 }),
    extraSignalTags: ["dream", "soul", "yin"]
  },
  sample_thunder_talent: {
    id: "sample_thunder_talent",
    label: "天妒雷修",
    summary: "山村孤儿 + 雷灵根 + 天妒英才 + 劫雷亲和",
    seed: "dev-life-storyline-thunder-talent",
    ageMonths: 168,
    originId: "origin_mountain_village_orphan",
    canonicalStorylineIds: [
      "storyline_system_prelude",
      "storyline_village_calamity",
      "storyline_poor_scholar"
    ],
    hiddenFateId: "hidden_system_resonance_body",
    carriedItemId: "item_broken_wooden_sword",
    destinyIds: [
      "destiny_heaven_jealous_talent",
      "destiny_disaster_star",
      "destiny_life_protection_merit"
    ],
    rootElements: { thunder: 100 },
    rootTags: ["root:thunder"],
    attributes: baseAttributes({
      comprehension: 58,
      inspiration: 94,
      fortune: 24,
      lifespan: 32
    }),
    extraSignalTags: ["system_prelude", "outer_battlefield", "static_noise"],
    focusedThreadIds: ["thread_outer_battlefield_dream"]
  },
  sample_village_calamity: {
    id: "sample_village_calamity",
    label: "山村灾劫",
    summary: "山村孤儿 + 灾星命格 + 山贼烟尘危机",
    seed: "dev-life-storyline-village-calamity",
    ageMonths: 180,
    originId: "origin_mountain_village_orphan",
    canonicalStorylineIds: ["storyline_village_calamity"],
    hiddenFateId: "hidden_outer_battlefield_echo",
    carriedItemId: "item_broken_wooden_sword",
    destinyIds: [
      "destiny_disaster_star",
      "destiny_war_caliber",
      "destiny_life_protection_merit"
    ],
    rootElements: { thunder: 100 },
    rootTags: ["root:thunder"],
    attributes: baseAttributes({ fortune: 22, heart: 66, inspiration: 62 }),
    extraSignalTags: ["calamity", "bandit", "village", "protect", "demon_beast"],
    focusedThreadIds: ["thread_bandit_smoke"],
    threadTargets: [{
      threadId: "thread_bandit_smoke",
      progress: 70,
      tension: 78,
      clarity: 12,
      risk: 40
    }]
  }
};

export function buildDevLifeStorylinesReport(
  sampleId: DevLifeStorylineSampleId = "sample_alchemy_child"
): DevLifeStorylinesReport {
  const fixture = DEV_LIFE_STORYLINE_FIXTURES[sampleId];
  const input = makeScoringInput(fixture);
  const scoring = new StorylineScoringEngine().evaluateDetailed(input);
  const threadEngine = new EventThreadEngine();
  const initialState = threadEngine.initializeThreads({
    activeStorylines: scoring.activeStorylines,
    ageMonths: fixture.ageMonths,
    signalTags: buildThreadSignalTags(fixture, scoring),
    statValues: toStatValues(fixture.attributes)
  });
  const focusedState = focusRequestedThreads(initialState, fixture, threadEngine);
  const storylineState = applyThreadTargets(focusedState, fixture, threadEngine);

  return deepFreeze({
    sample: toPublicSample(fixture),
    scoring,
    activeStorylines: scoring.activeStorylines,
    scoreBreakdownByStoryline: scoring.debug.scoreBreakdownByStoryline,
    eventThreads: storylineState.eventThreads,
    playInterludeCandidateHooks: storylineState.playInterludeCandidateHooks,
    transitionCandidateHooks: storylineState.transitionCandidateHooks,
    debug: {
      signalTags: storylineState.debug?.signalTags ?? [],
      selectedThreads: storylineState.debug?.selectedThreads ?? []
    }
  });
}

export function listDevLifeStorylineSamples(): readonly DevLifeStorylineSample[] {
  return DEV_LIFE_STORYLINE_SAMPLES;
}

function makeScoringInput(fixture: DevLifeStorylineFixture): StorylineScoringInput {
  const ninePalaceEvaluation = evaluateNinePalace(fixture.attributes);
  const openingDraft: OpeningInnateDraft = {
    draftId: `${fixture.seed}:opening`,
    seed: fixture.seed,
    rerollIndex: 0,
    archetype: {
      id: "dev_life_storyline_fixture",
      name: fixture.label,
      description: fixture.summary,
      tags: []
    },
    aptitude: {
      rootBone: fixture.attributes.rootBone,
      comprehension: fixture.attributes.comprehension,
      inspiration: fixture.attributes.inspiration,
      fortune: fixture.attributes.fortune,
      heart: fixture.attributes.heart,
      lifespan: fixture.attributes.lifespan
    },
    coreSeed: {
      jing: fixture.attributes.jing,
      qi: fixture.attributes.qi,
      shen: fixture.attributes.shen
    },
    spiritualRoot: {
      categoryId: Object.keys(fixture.rootElements).length > 1 ? "dual" : "single",
      displayName: fixture.rootTags.join(" / "),
      elements: fixture.rootElements,
      primaryElement: firstRootElement(fixture.rootElements),
      secondaryElements: Object.keys(fixture.rootElements).slice(1) as ElementId[],
      purity: 82,
      stability: 70,
      conflict: 12,
      breadth: 30,
      relationTags: fixture.rootTags,
      tags: fixture.rootTags
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
  const originFate = makeOriginFate(fixture);
  return {
    ageMonths: fixture.ageMonths,
    openingDraft,
    ninePalaceEvaluation,
    destinySelection: makeDestinySelection(fixture.destinyIds),
    originFate,
    originFateNarrativeState: makeOriginNarrativeState(fixture),
    lifeSimulationState: makeMinimalLifeSimulationState(fixture)
  };
}

function makeOriginFate(fixture: DevLifeStorylineFixture): OriginFateDraft {
  return {
    draftId: `${fixture.seed}:origin`,
    seed: fixture.seed,
    rerollIndex: 0,
    backgroundOrigin: {
      originId: fixture.originId,
      name: fixture.originId,
      visibleDescription: fixture.summary,
      appliedWeight: 1,
      matchedTags: [fixture.originId, `origin:${fixture.originId}`]
    },
    hiddenFateInternal: {
      hiddenFateId: fixture.hiddenFateId,
      trueName: "dev_internal_hidden_fixture",
      category: "pastLife",
      progress: 42,
      progressBand: "stirring",
      matchedTags: [fixture.hiddenFateId, toHiddenAlias(fixture.hiddenFateId)],
      appliedWeight: 1
    },
    visibleHiddenOmen: {
      vagueLevel: "stirring",
      levelLabel: "stirring",
      hints: ["dev public omen"],
      riskHint: "dev public risk",
      relatedTags: [fixture.hiddenFateId, toHiddenAlias(fixture.hiddenFateId)]
    },
    carriedItems: [
      {
        itemId: fixture.carriedItemId,
        name: fixture.carriedItemId,
        visibleDescription: "dev carried item",
        conversion: {
          type: "artifact_clue",
          label: "dev conversion",
          outerBattlefieldEffect: "dev_outer_effect",
          dongfuHook: "dev_dongfu_hook"
        },
        matchedTags: [fixture.carriedItemId, `item:${fixture.carriedItemId}`],
        appliedWeight: 1
      }
    ],
    lifeEventBiasTags: [
      fixture.originId,
      `origin:${fixture.originId}`,
      fixture.hiddenFateId,
      toHiddenAlias(fixture.hiddenFateId),
      fixture.carriedItemId,
      `item:${fixture.carriedItemId}`
    ],
    modeProjectionTags: [],
    age18ConversionHooks: []
  };
}

function makeOriginNarrativeState(fixture: DevLifeStorylineFixture): OriginFateNarrativeStateV02 {
  const originThreadProgress = Object.fromEntries(fixture.canonicalStorylineIds.map((id) => [id, 55]));
  return {
    origin: {
      originId: fixture.originId,
      activeStorylineIds: [...fixture.canonicalStorylineIds],
      originThreadProgress,
      familyTie: 0,
      worldlyTie: 0,
      lifeEventBiasTags: [
        fixture.originId,
        `origin:${fixture.originId}`,
        ...fixture.canonicalStorylineIds.map((id) => `lifeStoryline:${id}`),
        fixture.hiddenFateId,
        toHiddenAlias(fixture.hiddenFateId),
        fixture.carriedItemId,
        `item:${fixture.carriedItemId}`
      ],
      carriedItemBias: [fixture.carriedItemId],
      hiddenFateBias: [fixture.hiddenFateId],
      regionTags: ["dev_region"],
      interludeBiasTags: [],
      eventPhaseSeeds: {
        earlyEcho: [],
        childhoodSeed: [],
        youthConflict: [],
        teenChoice: []
      },
      canonicalLifeStorylineIds: [...fixture.canonicalStorylineIds]
    },
    hiddenFates: [makeHiddenFate(fixture.hiddenFateId)],
    carriedItems: [makeCarriedItem(fixture.carriedItemId)],
    visibleOmenLines: ["dev public omen"],
    lifeEventBiasTags: [
      fixture.originId,
      `origin:${fixture.originId}`,
      fixture.hiddenFateId,
      toHiddenAlias(fixture.hiddenFateId),
      fixture.carriedItemId,
      `item:${fixture.carriedItemId}`
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

function makeMinimalLifeSimulationState(fixture: DevLifeStorylineFixture): LifeSimulationState {
  return {
    profileId: "dev_life_storyline_profile",
    characterId: "dev_life_storyline_character",
    seed: fixture.seed,
    rngState: {},
    ageMonths: fixture.ageMonths,
    phaseId: fixture.ageMonths >= 156 ? "adolescence" : fixture.ageMonths >= 96 ? "youth" : "childhood",
    core: {
      jing: fixture.attributes.jing,
      qi: fixture.attributes.qi,
      shen: fixture.attributes.shen
    },
    aptitude: {
      rootBone: fixture.attributes.rootBone,
      comprehension: fixture.attributes.comprehension,
      inspiration: fixture.attributes.inspiration,
      fortune: fixture.attributes.fortune,
      heart: fixture.attributes.heart,
      lifespan: fixture.attributes.lifespan
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

function buildThreadSignalTags(
  fixture: DevLifeStorylineFixture,
  scoring: StorylineScoringEvaluation
): readonly string[] {
  return uniqueStable([
    fixture.originId,
    `origin:${fixture.originId}`,
    fixture.hiddenFateId,
    toHiddenAlias(fixture.hiddenFateId),
    fixture.carriedItemId,
    `item:${fixture.carriedItemId}`,
    ...fixture.rootTags,
    ...fixture.destinyIds.flatMap((id) => [id, toDestinyAlias(id)]),
    ...fixture.canonicalStorylineIds.flatMap((id) => [id, `storyline:${id}`, `lifeStoryline:${id}`]),
    ...scoring.debug.signalTags,
    ...(fixture.extraSignalTags ?? [])
  ]);
}

function applyThreadTargets(
  state: LifeStorylineState,
  fixture: DevLifeStorylineFixture,
  engine: EventThreadEngine
): LifeStorylineState {
  return (fixture.threadTargets ?? []).reduce((current, target) => {
    const thread = current.eventThreads.find((entry) => entry.threadId === target.threadId);
    if (thread === undefined) {
      return current;
    }
    return engine.advanceStateByHook(current, {
      id: `dev_sample_target:${fixture.id}:${target.threadId}`,
      threadId: target.threadId,
      progressDelta: target.progress - thread.progress,
      tensionDelta: target.tension - thread.tension,
      clarityDelta: target.clarity - thread.clarity,
      riskDelta: target.risk - thread.risk,
      occurredAtMonth: fixture.ageMonths,
      tags: ["dev_life_storyline_sample", fixture.id],
      visibility: "debugOnly",
      weight: 1
    });
  }, state);
}

function focusRequestedThreads(
  state: LifeStorylineState,
  fixture: DevLifeStorylineFixture,
  engine: EventThreadEngine
): LifeStorylineState {
  const registry = loadLifeStorylineRegistry();
  return (fixture.focusedThreadIds ?? []).reduce((current, threadId) => {
    if (current.eventThreads.some((thread) => thread.threadId === threadId)) {
      return current;
    }
    const definition = registry.getThread(threadId);
    const replaceIndex = current.eventThreads.findIndex((thread) => thread.storylineId === definition.storylineId);
    if (replaceIndex < 0) {
      return current;
    }
    const nextThreads = current.eventThreads.map((thread, index) =>
      index === replaceIndex
        ? deepFreeze({
          ...thread,
          threadId: definition.id,
          storylineId: definition.storylineId
        })
        : thread
    );
    const focusedState = deepFreeze({
      ...current,
      eventThreads: nextThreads,
      playInterludeCandidateHooks: [],
      transitionCandidateHooks: []
    });
    return engine.advanceStateByHook(focusedState, {
      id: `dev_sample_focus:${fixture.id}:${threadId}`,
      threadId,
      tags: ["dev_life_storyline_sample", fixture.id],
      visibility: "debugOnly",
      weight: 1
    });
  }, state);
}

function firstRootElement(elements: Readonly<Partial<Record<ElementId, number>>>): ElementId {
  return (Object.keys(elements)[0] as ElementId | undefined) ?? "wood";
}

function toPublicSample(fixture: DevLifeStorylineFixture): DevLifeStorylineSample {
  return {
    id: fixture.id,
    label: fixture.label,
    summary: fixture.summary
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

function toStatValues(attributes: NinePalaceAttributes): Readonly<Record<string, number>> {
  return {
    jing: attributes.jing,
    qi: attributes.qi,
    shen: attributes.shen,
    rootBone: attributes.rootBone,
    comprehension: attributes.comprehension,
    inspiration: attributes.inspiration,
    fortune: attributes.fortune,
    heart: attributes.heart,
    lifespan: attributes.lifespan
  };
}

function toDestinyAlias(id: string): string {
  return id.startsWith("destiny_") ? `destiny:${id.slice("destiny_".length)}` : id;
}

function toHiddenAlias(id: string): string {
  return id.startsWith("hidden_") ? `hidden:${id.slice("hidden_".length)}` : id;
}

function uniqueStable<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
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
