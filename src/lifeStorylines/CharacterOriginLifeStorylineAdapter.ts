import type { CharacterOriginState, DestinyTraitState } from "../character/CharacterCreationTypes";
import type { NinePalaceAttributes } from "../types/nine-palace-fate-types.v0.1";
import type {
  LifeStorylineDebugInfo,
  LifeStorylineState,
  StorylineProgress,
  StorylineScoringEvaluation
} from "../types/life-storylines-types.v0.1";
import { selectDownstreamActiveStorylines } from "./DownstreamStorylineSelector";
import { EventThreadEngine } from "./EventThreadEngine";
import {
  loadLifeStorylineRegistry,
  type LifeStorylineRegistry
} from "./LifeStorylineRegistry";
import { StorylineScoringEngine } from "./StorylineScoringEngine";

export const CHARACTER_ORIGIN_LIFE_STORYLINE_ADAPTER_SOURCE = "character_origin_v02_life_storyline_adapter";
export const LEGACY_PROFILE_FALLBACK_SOURCE = "legacy_profile_fallback";

export interface InitializeLifeStorylineStateFromCharacterOriginOptions {
  readonly ageMonths?: number;
  readonly registry?: LifeStorylineRegistry;
  readonly scoringEngine?: StorylineScoringEngine;
  readonly eventThreadEngine?: EventThreadEngine;
}

export function initializeLifeStorylineStateFromCharacterOrigin(
  characterOrigin: CharacterOriginState,
  options: InitializeLifeStorylineStateFromCharacterOriginOptions = {}
): LifeStorylineState {
  const registry = options.registry ?? loadLifeStorylineRegistry();
  const scoringEngine = options.scoringEngine ?? new StorylineScoringEngine({ registry });
  const eventThreadEngine = options.eventThreadEngine ?? new EventThreadEngine({ registry });
  const ageMonths = options.ageMonths ?? 0;
  const source = hasCompleteV02ProfileShape(characterOrigin)
    ? CHARACTER_ORIGIN_LIFE_STORYLINE_ADAPTER_SOURCE
    : LEGACY_PROFILE_FALLBACK_SOURCE;
  const scoring = evaluateCharacterOriginStorylines(characterOrigin, scoringEngine, registry, ageMonths);
  const downstreamActiveStorylines = selectDownstreamActiveStorylines({
    storylines: scoring.storylines,
    debug: scoring.debug
  });
  const state = eventThreadEngine.initializeThreads({
    storylineScores: scoring.storylines,
    activeStorylines: scoring.activeStorylines,
    downstreamActiveStorylineIds: downstreamActiveStorylines.map((storyline) => storyline.storylineId),
    ageMonths,
    signalTags: buildThreadSignalTags(characterOrigin, scoring),
    statValues: getStatValues(characterOrigin)
  });

  return withDebugSource(state, source, scoring.debug);
}

function evaluateCharacterOriginStorylines(
  characterOrigin: CharacterOriginState,
  scoringEngine: StorylineScoringEngine,
  registry: LifeStorylineRegistry,
  ageMonths: number
): StorylineScoringEvaluation {
  if (hasScoringInputShape(characterOrigin)) {
    return scoringEngine.evaluateDetailed({
      ageMonths,
      openingDraft: characterOrigin.openingInnateDraft,
      ninePalaceEvaluation: characterOrigin.openingInnateDraft.ninePalaceEvaluation,
      destinySelection: characterOrigin.destinies,
      originFate: characterOrigin.originFate,
      ...(characterOrigin.originFateNarrativeState === undefined ? {} : {
        originFateNarrativeState: characterOrigin.originFateNarrativeState
      })
    });
  }

  const storylines = buildFallbackStorylineScores(characterOrigin, registry, ageMonths);
  const activeStorylines = storylines.filter((storyline) => storyline.status !== "dormant");
  return deepFreeze({
    storylines,
    activeStorylines,
    monthlyEventTags: characterOrigin.lifeStorylineInitialScores?.monthlyEventTags ?? [],
    majorChoiceTags: characterOrigin.lifeStorylineInitialScores?.majorChoiceTags ?? [],
    debug: {
      source: LEGACY_PROFILE_FALLBACK_SOURCE,
      scoreBreakdownByStoryline: characterOrigin.lifeStorylineInitialScores?.debug?.scoreBreakdownByStoryline ?? {},
      selectedThreads: [],
      suppressedStorylines: [],
      signalTags: []
    }
  });
}

function hasCompleteV02ProfileShape(characterOrigin: CharacterOriginState): boolean {
  return characterOrigin.destinyEvaluationResults !== undefined &&
    characterOrigin.carriedItemLifecycleSummary !== undefined &&
    characterOrigin.lifeStorylineInitialScores !== undefined;
}

function hasScoringInputShape(characterOrigin: CharacterOriginState): boolean {
  return characterOrigin.openingInnateDraft !== undefined &&
    characterOrigin.openingInnateDraft.ninePalaceEvaluation !== undefined &&
    characterOrigin.destinies !== undefined &&
    characterOrigin.originFate !== undefined;
}

function buildFallbackStorylineScores(
  characterOrigin: CharacterOriginState,
  registry: LifeStorylineRegistry,
  ageMonths: number
): readonly StorylineProgress[] {
  const persisted = characterOrigin.lifeStorylineInitialScores?.storylines;
  if (persisted !== undefined && persisted.length > 0) {
    return deepFreeze(persisted
      .map((storyline) => ({
        storylineId: storyline.storylineId,
        score: clampInteger(storyline.score, 0, 100),
        status: toRuntimeStatus(storyline.status, storyline.score),
        lastUpdatedMonth: ageMonths,
        tags: [...storyline.tags]
      }))
      .sort(compareStorylines));
  }

  const first = registry.listStorylines()
    .map((storyline) => ({
      storylineId: storyline.id,
      score: storyline.baseWeight,
      status: "dormant" as const,
      lastUpdatedMonth: ageMonths,
      tags: [`storyline:${storyline.id}`, ...storyline.themeTags, ...storyline.worldContextTags]
    }))
    .sort(compareStorylines)[0];
  if (first === undefined) {
    return [];
  }
  return deepFreeze([{ ...first, score: Math.max(20, first.score), status: "hinted" as const }]);
}

function buildThreadSignalTags(
  characterOrigin: CharacterOriginState,
  scoring: StorylineScoringEvaluation
): readonly string[] {
  const root = characterOrigin.openingInnateDraft?.spiritualRoot;
  const traits = getDestinyTraits(characterOrigin);
  const originState = characterOrigin.originFateNarrativeState;
  return uniqueStable([
    ...scoring.debug.signalTags,
    ...(root === undefined ? [] : [
      `rootCategory:${root.categoryId}`,
      ...Object.entries(root.elements)
        .filter(([, value]) => typeof value === "number" && value > 0)
        .flatMap(([element]) => [element, `root:${element}`]),
      ...root.relationTags,
      ...root.tags
    ]),
    ...traits.flatMap((trait) => [
      trait.traitId,
      toDestinyAlias(trait.traitId),
      ...trait.tags
    ]),
    characterOrigin.originFate?.backgroundOrigin.originId,
    characterOrigin.originFate === undefined ? undefined : `origin:${characterOrigin.originFate.backgroundOrigin.originId}`,
    ...(characterOrigin.originFate?.backgroundOrigin.matchedTags ?? []),
    characterOrigin.originFate?.hiddenFateInternal.hiddenFateId,
    characterOrigin.originFate === undefined ? undefined : toHiddenAlias(characterOrigin.originFate.hiddenFateInternal.hiddenFateId),
    ...(characterOrigin.originFate?.hiddenFateInternal.matchedTags ?? []),
    ...(characterOrigin.originFate?.visibleHiddenOmen.relatedTags ?? []),
    ...(characterOrigin.originFate?.carriedItems.flatMap((item) => [
      item.itemId,
      `item:${item.itemId}`,
      ...item.matchedTags
    ]) ?? []),
    ...(originState === undefined ? [] : [
      originState.origin.originId,
      `origin:${originState.origin.originId}`,
      ...originState.origin.activeStorylineIds.flatMap((id) => [id, `storyline:${id}`]),
      ...originState.origin.canonicalLifeStorylineIds.flatMap((id) => [id, `lifeStoryline:${id}`]),
      ...originState.origin.carriedItemBias.flatMap((id) => [id, `item:${id}`]),
      ...originState.origin.hiddenFateBias.flatMap((id) => [id, toHiddenAlias(id)]),
      ...originState.lifeEventBiasTags,
      ...originState.majorChoiceSignals,
      ...originState.stageTransitionTokens,
      ...originState.age18Hooks
    ]),
    ...(characterOrigin.destinyEvaluationResults?.flatMap((result) => [
      result.finalDestinyId,
      result.finalDisplayedDestinyId,
      ...result.lifeImpactHookTags,
      ...result.modeProjectionTags,
      ...Object.values(result.modeProjectionHooks).flat()
    ]) ?? []),
    ...(characterOrigin.carriedItemLifecycleSummary?.items.flatMap((item) => [
      item.itemId,
      `item:${item.itemId}`,
      item.lifecycleStage,
      item.affinityBand,
      ...item.lifeEventTags,
      ...item.monthlyEventHooks,
      ...item.majorChoiceHooks,
      ...item.interludeHooks,
      ...item.age18Hooks,
      ...item.narrativeChainRefs
    ]) ?? [])
  ].filter((tag): tag is string => typeof tag === "string" && tag.length > 0));
}

function withDebugSource(
  state: LifeStorylineState,
  source: string,
  scoringDebug: LifeStorylineDebugInfo
): LifeStorylineState {
  return deepFreeze({
    ...state,
    debug: {
      ...(state.debug ?? {
        scoreBreakdownByStoryline: {},
        selectedThreads: [],
        suppressedStorylines: []
      }),
      source,
      scoreBreakdownByStoryline: scoringDebug.scoreBreakdownByStoryline,
      suppressedStorylines: scoringDebug.suppressedStorylines,
      signalTags: state.debug?.signalTags ?? scoringDebug.signalTags ?? []
    }
  });
}

function getDestinyTraits(characterOrigin: CharacterOriginState): readonly DestinyTraitState[] {
  if (characterOrigin.destinies === undefined) {
    return [];
  }
  return [
    characterOrigin.destinies.main,
    ...characterOrigin.destinies.secondary,
    characterOrigin.destinies.flaw
  ];
}

function getStatValues(characterOrigin: CharacterOriginState): Readonly<Record<string, number>> {
  const attributes = characterOrigin.openingInnateDraft?.ninePalaceEvaluation?.attributes ??
    ({
      jing: characterOrigin.coreStats.jing,
      qi: characterOrigin.coreStats.qi,
      shen: characterOrigin.coreStats.shen,
      rootBone: characterOrigin.aptitude.rootBone,
      comprehension: characterOrigin.aptitude.comprehension,
      inspiration: characterOrigin.aptitude.inspiration,
      fortune: characterOrigin.aptitude.fortune,
      heart: characterOrigin.aptitude.heart,
      lifespan: characterOrigin.aptitude.lifespan
    } satisfies NinePalaceAttributes);
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

function toRuntimeStatus(
  status: "hinted" | "active" | "dominant",
  score: number
): StorylineProgress["status"] {
  if (status === "dominant" && score >= 95) {
    return "fated";
  }
  if (status === "dominant") {
    return "dominant";
  }
  if (status === "active") {
    return "active";
  }
  return "hinted";
}

function compareStorylines(left: StorylineProgress, right: StorylineProgress): number {
  return right.score - left.score || left.storylineId.localeCompare(right.storylineId);
}

function toDestinyAlias(id: string): string {
  return id.startsWith("destiny_") ? `destiny:${id.slice("destiny_".length)}` : id;
}

function toHiddenAlias(id: string): string {
  return id.startsWith("hidden_") ? `hidden:${id.slice("hidden_".length)}` : id;
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.trunc(Math.min(max, Math.max(min, value)));
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
