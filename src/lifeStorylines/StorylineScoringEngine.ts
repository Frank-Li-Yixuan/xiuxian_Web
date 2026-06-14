import {
  loadLifeStorylineRegistry,
  type LifeStorylineRegistry
} from "./LifeStorylineRegistry";
import type {
  EventThreadDefinition,
  LifePhaseId,
  LifeStorylineDefinition,
  StorylineProgress,
  StorylineScoringEvaluation,
  StorylineScoringInput,
  StorylineSignalRule,
  StorylineStatus
} from "../types/life-storylines-types.v0.1";
import type { NinePalaceEvaluation } from "../types/nine-palace-fate-types.v0.1";
import type { OriginFateNarrativeStateV02 } from "../types/origin-fate-narrative-types.v0.2";

export const STORYLINE_SCORING_ENGINE_SOURCE = "life_storylines_v0_1_scoring_engine";

export interface StorylineScoringEngineContext {
  readonly registry?: LifeStorylineRegistry;
}

interface SignalContext {
  readonly tokenSet: ReadonlySet<string>;
  readonly publicTags: readonly string[];
}

type ScoreBreakdownEntry = { readonly source: string; readonly weight: number; readonly note?: string };

const DEFAULT_AGE_PHASE: LifePhaseId = "infancy";
const ORIGIN_CANONICAL_ACTIVE_WEIGHT = 25;
const ORIGIN_PROGRESS_WEIGHT_FACTOR = 0.4;
const PHASE_TAGS = [
  "phase:early_echo",
  "phase:childhood_seed",
  "phase:youth_conflict",
  "phase:teen_choice"
] as const;

export class StorylineScoringEngine {
  private readonly registry: LifeStorylineRegistry;

  constructor(context: StorylineScoringEngineContext = {}) {
    this.registry = context.registry ?? loadLifeStorylineRegistry();
  }

  evaluate(input: StorylineScoringInput): readonly StorylineProgress[] {
    return this.evaluateDetailed(input).storylines;
  }

  evaluateDetailed(input: StorylineScoringInput): StorylineScoringEvaluation {
    const ageMonths = input.ageMonths ?? input.lifeSimulationState?.ageMonths ?? 0;
    const agePhase = getAgePhase(input);
    const signals = buildSignalContext(input);
    const scoreBreakdownByStoryline: Record<string, ScoreBreakdownEntry[]> = {};
    const rawStorylines = this.registry.listStorylines().map((storyline) => {
      const breakdown = buildStorylineScoreBreakdown(storyline, input, agePhase, signals.tokenSet);
      scoreBreakdownByStoryline[storyline.id] = breakdown;
      const score = clampInteger(Math.round(breakdown.reduce((sum, entry) => sum + entry.weight, 0)), 0, 100);
      return {
        storylineId: storyline.id,
        score,
        status: toStorylineStatus(score, this.registry),
        lastUpdatedMonth: ageMonths,
        tags: uniqueStable([
          `storyline:${storyline.id}`,
          ...storyline.themeTags,
          ...storyline.worldContextTags,
          ...getOriginCanonicalStorylineIds(input.originFateNarrativeState).map((id) => `lifeStoryline:${id}`),
          ...getOriginRegionTags(input.originFateNarrativeState).map((tag) => `region:${tag}`)
        ])
      } satisfies StorylineProgress;
    });
    const storylines = enforceStorylineLimits(sortStorylines(rawStorylines), this.registry, scoreBreakdownByStoryline);
    const activeStorylines = storylines.filter((storyline) => storyline.status !== "dormant");
    const selectedThreads = uniqueStable(
      activeStorylines.flatMap((storyline) =>
        this.registry.listThreadsByStoryline(storyline.storylineId).map((thread) => thread.id)
      )
    );
    const selectedThreadDefinitions = selectedThreads.map((threadId) => this.registry.getThread(threadId));
    const suppressedStorylines = uniqueStable(
      storylines
        .filter((storyline) => hasNegativeBreakdown(scoreBreakdownByStoryline[storyline.storylineId]))
        .map((storyline) => storyline.storylineId)
    );

    return deepFreeze({
      storylines,
      activeStorylines,
      monthlyEventTags: buildMonthlyEventTags(input, selectedThreadDefinitions),
      majorChoiceTags: buildMajorChoiceTags(input, selectedThreadDefinitions),
      debug: {
        scoreBreakdownByStoryline,
        selectedThreads,
        suppressedStorylines,
        signalTags: signals.publicTags
      }
    });
  }
}

function buildStorylineScoreBreakdown(
  storyline: LifeStorylineDefinition,
  input: StorylineScoringInput,
  agePhase: LifePhaseId,
  tokenSet: ReadonlySet<string>
): ScoreBreakdownEntry[] {
  const breakdown: ScoreBreakdownEntry[] = [
    { source: "baseWeight", weight: storyline.baseWeight },
    { source: `agePhaseAffinity:${agePhase}`, weight: storyline.agePhaseAffinity[agePhase] ?? 0 }
  ];
  if (getOriginCanonicalStorylineIds(input.originFateNarrativeState).includes(storyline.id)) {
    breakdown.push({ source: "originNarrative:canonicalActive", weight: ORIGIN_CANONICAL_ACTIVE_WEIGHT });
  }
  const progress = getOriginProgressForStoryline(storyline.id, input.originFateNarrativeState);
  if (progress > 0) {
    breakdown.push({
      source: "originNarrative:progress",
      weight: Math.round(progress * ORIGIN_PROGRESS_WEIGHT_FACTOR)
    });
  }
  for (const signal of storyline.activationSignals) {
    const weight = getMatchedStorylineSignalWeight(signal, input, tokenSet);
    if (weight !== 0) {
      breakdown.push({ source: signal.source, weight, ...(signal.note === undefined ? {} : { note: signal.note }) });
    }
  }
  for (const signal of storyline.suppressionSignals ?? []) {
    const weight = getMatchedStorylineSignalWeight(signal, input, tokenSet);
    if (weight !== 0) {
      breakdown.push({
        source: `${signal.source}:suppression`,
        weight: weight > 0 ? -weight : weight,
        ...(signal.note === undefined ? {} : { note: signal.note })
      });
    }
  }
  return breakdown;
}

function getMatchedStorylineSignalWeight(
  signal: StorylineSignalRule,
  input: StorylineScoringInput,
  tokenSet: ReadonlySet<string>
): number {
  if (signal.stat !== undefined) {
    const value = getNinePalaceStatValue(input.ninePalaceEvaluation ?? input.openingDraft.ninePalaceEvaluation, signal.stat);
    if (value === undefined) {
      return 0;
    }
    if (signal.min !== undefined && value < signal.min) {
      return 0;
    }
    if (signal.max !== undefined && value > signal.max) {
      return 0;
    }
    return signal.weight;
  }
  if (signal.tag !== undefined) {
    return tokenSet.has(normalizeToken(signal.tag)) ? signal.weight : 0;
  }
  return 0;
}

function buildSignalContext(input: StorylineScoringInput): SignalContext {
  const tokenValues = uniqueStable([
    ...input.openingDraft.tags.destinyBiasTags,
    ...input.openingDraft.tags.lifeEventBiasTags,
    ...input.openingDraft.tags.hiddenFateBiasTags,
    ...input.openingDraft.tags.modeBiasTags,
    ...input.openingDraft.ninePalaceEvaluation.tags.destinyBiasTags,
    ...input.openingDraft.ninePalaceEvaluation.tags.lifeEventBiasTags,
    ...input.openingDraft.ninePalaceEvaluation.tags.hiddenFateBiasTags,
    ...input.openingDraft.ninePalaceEvaluation.tags.rootBiasTags,
    ...input.openingDraft.ninePalaceEvaluation.tags.modeBiasTags,
    ...getSpiritualRootTags(input),
    ...getDestinyTags(input),
    ...getOriginTags(input),
    ...getHiddenFateTags(input),
    ...getCarriedItemTags(input),
    ...getLifeStateTags(input)
  ]);
  const tokenSet = new Set<string>();
  for (const tag of tokenValues) {
    addTokenVariants(tokenSet, tag);
    for (const alias of getTokenAliases(tag)) {
      addTokenVariants(tokenSet, alias);
    }
  }
  return {
    tokenSet,
    publicTags: tokenValues.filter(isPublicSignalTag)
  };
}

function getSpiritualRootTags(input: StorylineScoringInput): readonly string[] {
  const root = input.openingDraft.spiritualRoot;
  return uniqueStable([
    `rootCategory:${root.categoryId}`,
    ...Object.entries(root.elements)
      .filter(([, value]) => typeof value === "number" && value > 0)
      .flatMap(([element]) => [element, `root:${element}`]),
    ...root.relationTags,
    ...root.tags
  ]);
}

function getDestinyTags(input: StorylineScoringInput): readonly string[] {
  const traits = [
    input.destinySelection.main,
    ...input.destinySelection.secondary,
    input.destinySelection.flaw
  ];
  return uniqueStable([
    ...traits.flatMap((trait) => [
      trait.traitId,
      toDestinyTagAlias(trait.traitId),
      ...trait.tags,
      ...(trait.fateAlignmentReasonTags ?? [])
    ]),
    ...(input.destinySelection.lifeManifestationHooks?.hooks.flatMap((hook) => [
      hook.hook,
      hook.phase,
      `destiny:${hook.destinyId}`
    ]) ?? []),
    ...(input.destinySelection.lifeManifestationHooks?.debugTags ?? [])
  ]);
}

function getOriginTags(input: StorylineScoringInput): readonly string[] {
  const state = input.originFateNarrativeState;
  return uniqueStable([
    input.originFate.backgroundOrigin.originId,
    `origin:${input.originFate.backgroundOrigin.originId}`,
    ...input.originFate.backgroundOrigin.matchedTags,
    ...input.originFate.lifeEventBiasTags,
    ...input.originFate.modeProjectionTags,
    ...(state === undefined ? [] : [
      state.origin.originId,
      `origin:${state.origin.originId}`,
      ...state.origin.activeStorylineIds.flatMap((id) => [id, `storyline:${id}`]),
      ...state.origin.canonicalLifeStorylineIds.flatMap((id) => [id, `lifeStoryline:${id}`]),
      ...state.origin.regionTags.map((tag) => `region:${tag}`),
      ...state.origin.lifeEventBiasTags,
      ...state.lifeEventBiasTags,
      ...state.majorChoiceSignals,
      ...state.interludeBiasTags.map((tag) => `interlude:${tag}`),
      ...state.stageTransitionTokens,
      ...state.age18Hooks
    ])
  ]);
}

function getHiddenFateTags(input: StorylineScoringInput): readonly string[] {
  const hiddenFateId = input.originFate.hiddenFateInternal.hiddenFateId;
  return uniqueStable([
    hiddenFateId,
    toHiddenFateTagAlias(hiddenFateId),
    ...input.originFate.hiddenFateInternal.matchedTags,
    ...(input.originFate.visibleHiddenOmen.relatedTags ?? []),
    ...(input.originFateNarrativeState?.origin.hiddenFateBias.flatMap((id) => [id, toHiddenFateTagAlias(id)]) ?? []),
    ...(input.originFateNarrativeState?.hiddenFates.flatMap((hiddenFate) => [
      hiddenFate.hiddenFateId,
      toHiddenFateTagAlias(hiddenFate.hiddenFateId),
      hiddenFate.revealBand
    ]) ?? [])
  ]);
}

function getCarriedItemTags(input: StorylineScoringInput): readonly string[] {
  return uniqueStable([
    ...input.originFate.carriedItems.flatMap((item) => [
      item.itemId,
      `item:${item.itemId}`,
      ...item.matchedTags,
      item.conversion.type,
      item.conversion.dongfuHook,
      item.conversion.outerBattlefieldEffect
    ]),
    ...(input.originFateNarrativeState?.origin.carriedItemBias.flatMap((id) => [id, `item:${id}`]) ?? []),
    ...(input.originFateNarrativeState?.carriedItems.flatMap((item) => [
      item.itemId,
      `item:${item.itemId}`,
      item.lifecycleStage
    ]) ?? [])
  ]);
}

function getLifeStateTags(input: StorylineScoringInput): readonly string[] {
  const state = input.lifeSimulationState;
  if (state === undefined) {
    return [];
  }
  return uniqueStable([
    `lifePhase:${state.phaseId}`,
    ...Object.entries(state.flags).flatMap(([key, value]) => [
      `flag:${key}`,
      `flag:${key}:${String(value)}`
    ]),
    ...(state.pendingMajorChoice?.hooks ?? []),
    ...state.monthlyLogs.flatMap((log) => [
      ...log.tags,
      ...log.hooks,
      log.eventId,
      log.outcome
    ])
  ].filter((tag): tag is string => typeof tag === "string" && tag.length > 0));
}

function buildMonthlyEventTags(
  input: StorylineScoringInput,
  selectedThreads: readonly EventThreadDefinition[]
): readonly string[] {
  const state = input.originFateNarrativeState;
  return uniqueStable([
    ...input.originFate.lifeEventBiasTags,
    ...(state === undefined ? [] : [
      ...state.lifeEventBiasTags,
      ...state.origin.lifeEventBiasTags,
      `origin:${state.origin.originId}`,
      ...state.origin.regionTags.map((tag) => `region:${tag}`),
      ...state.origin.activeStorylineIds.map((id) => `storyline:${id}`),
      ...state.origin.canonicalLifeStorylineIds.map((id) => `lifeStoryline:${id}`),
      ...state.origin.carriedItemBias.map((id) => `item:${id}`),
      ...state.origin.hiddenFateBias.map((id) => toHiddenFateTagAlias(id)),
      ...state.origin.interludeBiasTags.map((id) => `interlude:${id}`),
      ...PHASE_TAGS
    ]),
    ...selectedThreads.flatMap((thread) => [
      ...thread.threadTags,
      ...thread.monthlyEventHooks,
      ...thread.stageSequence.flatMap((stage) => stage.monthlyEventTags)
    ])
  ]);
}

function buildMajorChoiceTags(
  input: StorylineScoringInput,
  selectedThreads: readonly EventThreadDefinition[]
): readonly string[] {
  const state = input.originFateNarrativeState;
  return uniqueStable([
    ...input.originFate.age18ConversionHooks,
    ...(state === undefined ? [] : [
      `origin:${state.origin.originId}`,
      ...state.majorChoiceSignals,
      ...state.origin.activeStorylineIds.map((id) => `storyline:${id}`),
      ...state.origin.canonicalLifeStorylineIds.map((id) => `lifeStoryline:${id}`),
      ...state.origin.carriedItemBias.map((id) => `item:${id}`),
      ...state.origin.hiddenFateBias.map((id) => toHiddenFateTagAlias(id))
    ]),
    ...(input.lifeSimulationState?.pendingMajorChoice?.hooks ?? []),
    ...selectedThreads.flatMap((thread) => [
      ...thread.majorChoiceHooks,
      ...thread.stageSequence.flatMap((stage) => stage.majorChoiceTags)
    ])
  ]);
}

function enforceStorylineLimits(
  sortedStorylines: readonly StorylineProgress[],
  registry: LifeStorylineRegistry,
  scoreBreakdownByStoryline: Record<string, ScoreBreakdownEntry[]>
): readonly StorylineProgress[] {
  const target = forceAtLeastOneHinted(sortedStorylines);
  const maxFated = registry.scoringRules.limits.maxFatedStorylines;
  const maxDominant = registry.scoringRules.limits.maxDominantStorylines;
  let fatedCount = 0;
  let dominantCount = 0;
  return target.map((storyline) => {
    if (storyline.status === "fated") {
      if (fatedCount < maxFated) {
        fatedCount += 1;
        return storyline;
      }
      scoreBreakdownByStoryline[storyline.storylineId]?.push({
        source: "limit:fatedOverflow",
        weight: 0,
        note: "Demoted to active by maxFatedStorylines"
      });
      return { ...storyline, status: "active" };
    }
    if (storyline.status === "dominant") {
      if (dominantCount < maxDominant) {
        dominantCount += 1;
        return storyline;
      }
      scoreBreakdownByStoryline[storyline.storylineId]?.push({
        source: "limit:dominantOverflow",
        weight: 0,
        note: "Demoted to active by maxDominantStorylines"
      });
      return { ...storyline, status: "active" };
    }
    return storyline;
  });
}

function forceAtLeastOneHinted(sortedStorylines: readonly StorylineProgress[]): readonly StorylineProgress[] {
  if (sortedStorylines.some((storyline) => storyline.status !== "dormant") || sortedStorylines.length === 0) {
    return sortedStorylines;
  }
  const first = sortedStorylines[0];
  if (first === undefined) {
    return sortedStorylines;
  }
  return [{ ...first, status: "hinted" }, ...sortedStorylines.slice(1)];
}

function sortStorylines(storylines: readonly StorylineProgress[]): readonly StorylineProgress[] {
  return [...storylines].sort((left, right) =>
    right.score - left.score || left.storylineId.localeCompare(right.storylineId)
  );
}

function toStorylineStatus(score: number, registry: LifeStorylineRegistry): StorylineStatus {
  const thresholds = registry.scoringRules.statusThresholds;
  if (isWithinScoreThreshold(score, thresholds.fated)) {
    return "fated";
  }
  if (isWithinScoreThreshold(score, thresholds.dominant)) {
    return "dominant";
  }
  if (isWithinScoreThreshold(score, thresholds.active)) {
    return "active";
  }
  if (isWithinScoreThreshold(score, thresholds.hinted)) {
    return "hinted";
  }
  return "dormant";
}

function getAgePhase(input: StorylineScoringInput): LifePhaseId {
  const phaseId = input.lifeSimulationState?.phaseId;
  if (phaseId === "infancy" || phaseId === "childhood" || phaseId === "youth" || phaseId === "adolescence") {
    return phaseId;
  }
  const ageMonths = input.ageMonths ?? input.lifeSimulationState?.ageMonths ?? 0;
  if (ageMonths >= 216) {
    return "awakening";
  }
  if (ageMonths >= 156) {
    return "adolescence";
  }
  if (ageMonths >= 96) {
    return "youth";
  }
  if (ageMonths >= 36) {
    return "childhood";
  }
  return DEFAULT_AGE_PHASE;
}

function getNinePalaceStatValue(evaluation: NinePalaceEvaluation, stat: string): number | undefined {
  const attributes = evaluation.attributes as unknown as Readonly<Record<string, number>>;
  const derived = evaluation.derived as unknown as Readonly<Record<string, number>>;
  return attributes[stat] ?? derived[stat];
}

function getOriginCanonicalStorylineIds(state: OriginFateNarrativeStateV02 | undefined): readonly string[] {
  return state?.origin.canonicalLifeStorylineIds ?? [];
}

function getOriginRegionTags(state: OriginFateNarrativeStateV02 | undefined): readonly string[] {
  return state?.origin.regionTags ?? [];
}

function getOriginProgressForStoryline(
  storylineId: string,
  state: OriginFateNarrativeStateV02 | undefined
): number {
  if (state === undefined) {
    return 0;
  }
  if (state.origin.originThreadProgress[storylineId] !== undefined) {
    return state.origin.originThreadProgress[storylineId];
  }
  const rawId = state.origin.activeStorylineIds.find((id, index) => state.origin.canonicalLifeStorylineIds[index] === storylineId);
  return rawId === undefined ? 0 : state.origin.originThreadProgress[rawId] ?? 0;
}

function hasNegativeBreakdown(breakdown: readonly ScoreBreakdownEntry[] | undefined): boolean {
  return breakdown?.some((entry) => entry.weight < 0) ?? false;
}

function isWithinScoreThreshold(score: number, range: readonly [number, number] | undefined): boolean {
  return range !== undefined && score >= range[0] && score <= range[1];
}

function isPublicSignalTag(tag: string): boolean {
  const normalized = normalizeToken(tag);
  return !normalized.startsWith("hidden:") &&
    !normalized.startsWith("hidden_") &&
    !normalized.includes("internal_hidden");
}

function getTokenAliases(value: string): readonly string[] {
  return [
    toDestinyTagAlias(value),
    toHiddenFateTagAlias(value)
  ].filter((alias) => alias !== value);
}

function toDestinyTagAlias(id: string): string {
  return id.startsWith("destiny_") ? `destiny:${id.slice("destiny_".length)}` : id;
}

function toHiddenFateTagAlias(id: string): string {
  return id.startsWith("hidden_") ? `hidden:${id.slice("hidden_".length)}` : id;
}

function addTokenVariants(tokens: Set<string>, value: string): void {
  const normalized = normalizeToken(value);
  if (normalized.length === 0) {
    return;
  }
  tokens.add(normalized);
  for (const separator of ["_", ":"] as const) {
    for (const part of normalized.split(separator)) {
      if (part.length > 1) {
        tokens.add(part);
      }
    }
  }
}

function normalizeToken(value: string): string {
  return value
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9:_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
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
