import type { SeededRng } from "../sim/core/SeededRng";
import type {
  CarriedItemNarrativeDefinitionV02,
  CarriedItemNarrativeStateV02,
  HiddenFateDefinitionV02,
  HiddenFateNarrativeCandidateDebugV02,
  HiddenFateNarrativeEngineInput,
  HiddenFateNarrativeProgressEventDebugV02,
  HiddenFateNarrativeProgressEventV02,
  HiddenFateNarrativeStateV02,
  Id,
  OriginFateNarrativeStateV02,
  OriginItemHiddenSynergyRuleV02,
  OriginNarrativeStateV02,
  OriginStorylineDefinitionV02
} from "../types/origin-fate-narrative-types.v0.2";
import {
  loadOriginFateNarrativeRegistry,
  type OriginFateNarrativeRegistry
} from "./OriginFateNarrativeRegistry";
import { generateOriginNarrativeState } from "./OriginNarrativeEngine";
import { buildPublicOmenView } from "./RevealMisdirectionEngine";

export interface HiddenFateNarrativeEngineContext {
  readonly registry?: OriginFateNarrativeRegistry;
}

interface CandidateScore {
  readonly hiddenFate: HiddenFateDefinitionV02;
  readonly weight: number;
  readonly selectionWeight: number;
  readonly matchedTags: readonly string[];
  readonly antiMatchedTags: readonly string[];
  readonly matchedSynergyRuleIds: readonly Id[];
  readonly progressBonus: number;
  readonly itemAffinityTags: readonly string[];
  readonly age18HookTargets: readonly Id[];
  readonly reasons: readonly string[];
}

interface InputContext {
  readonly registry: OriginFateNarrativeRegistry;
  readonly origin: OriginStorylineDefinitionV02;
  readonly originId: Id;
  readonly activeStorylineIds: readonly Id[];
  readonly carriedItems: readonly CarriedItemNarrativeStateV02[];
  readonly carriedItemDefinitions: readonly CarriedItemNarrativeDefinitionV02[];
  readonly selectedDestinyIds: readonly Id[];
  readonly selectedDestinyTags: readonly string[];
  readonly tokens: ReadonlySet<string>;
  readonly contextTags: readonly string[];
  readonly exactSynergyRules: readonly OriginItemHiddenSynergyRuleV02[];
}

const RARITY_BASE_WEIGHT: Readonly<Record<HiddenFateDefinitionV02["rarity"], number>> = {
  minor: 24,
  rare: 30,
  epic: 38,
  legendary: 46,
  forbidden: 28
};

const ORIGIN_DIRECT_BONUS = 80;
const ORIGIN_BIAS_BONUS = 90;
const ITEM_DIRECT_BONUS = 80;
const ITEM_BIAS_BONUS = 100;
const DESTINY_DIRECT_BONUS = 90;
const TAG_MATCH_BONUS = 32;
const ROOT_DIRECT_BONUS = 90;
const SYNERGY_BONUS = 150;
const ANTI_TAG_PENALTY = 70;
const EVENT_DEFAULT_DELTA = 4;

export function generateHiddenFateNarrativeState(
  input: HiddenFateNarrativeEngineInput,
  context: HiddenFateNarrativeEngineContext = {}
): OriginFateNarrativeStateV02 {
  const registry = context.registry ?? loadOriginFateNarrativeRegistry();
  validateEngineInput(input);
  const inputContext = buildInputContext(input, registry);
  const candidateScores = registry.hiddenFates.map((hiddenFate) => buildCandidateScore(hiddenFate, inputContext));
  const narrativeRng = input.rng.fork("hidden_fate_narrative");
  const progressRng = input.rng.fork("hidden_fate_progress");
  const selectedHiddenFates = resolveInitialHiddenFates(input, inputContext, candidateScores, narrativeRng, progressRng);
  const progressed = applyProgressEvents(selectedHiddenFates, input.progressEvents ?? [], inputContext);

  return buildNarrativeState(inputContext, progressed.hiddenFates, {
    carriedItems: inputContext.carriedItems,
    candidateScores,
    progressEventsApplied: progressed.debug,
    age18HookTargets: candidateScores.flatMap((candidate) => candidate.age18HookTargets),
    ...(input.maxVisibleOmenLines === undefined ? {} : { maxVisibleOmenLines: input.maxVisibleOmenLines })
  });
}

export function advanceHiddenFateNarrativeState(
  state: OriginFateNarrativeStateV02,
  progressEvents: readonly HiddenFateNarrativeProgressEventV02[],
  context: HiddenFateNarrativeEngineContext = {}
): OriginFateNarrativeStateV02 {
  const registry = context.registry ?? loadOriginFateNarrativeRegistry();
  const origin = registry.getOriginStoryline(state.origin.originId);
  const carriedItems = state.carriedItems.map((item) => cloneCarriedItemState(item, registry));
  const inputContext: InputContext = {
    registry,
    origin,
    originId: state.origin.originId,
    activeStorylineIds: state.origin.activeStorylineIds,
    carriedItems,
    carriedItemDefinitions: carriedItems.map((item) => registry.getCarriedItemNarrative(item.itemId)),
    selectedDestinyIds: [],
    selectedDestinyTags: [],
    tokens: collectStateTokens(state, origin, carriedItems, registry),
    contextTags: uniqueStable([...state.lifeEventBiasTags, ...state.majorChoiceSignals, ...state.interludeBiasTags]),
    exactSynergyRules: findExactSynergyRules(state.origin.originId, carriedItems, registry)
  };
  const hiddenFates = state.hiddenFates.map((hiddenFate) => cloneHiddenFateState(hiddenFate, registry));
  const progressed = applyProgressEvents(hiddenFates, progressEvents, inputContext);

  return buildNarrativeState(inputContext, progressed.hiddenFates, {
    carriedItems,
    candidateScores: state.debug?.candidateWeights.map(toCandidateScoreLike) ?? [],
    progressEventsApplied: progressed.debug,
    age18HookTargets: state.age18Hooks,
    ...(state.visibleOmenLines.length > 0 ? { maxVisibleOmenLines: state.visibleOmenLines.length } : {})
  });
}

function validateEngineInput(input: HiddenFateNarrativeEngineInput): void {
  if (input.rng === undefined) {
    throw new Error("Hidden fate narrative engine requires a SeededRng");
  }
  if (input.originStoryline.originId.trim().length === 0) {
    throw new Error("Hidden fate narrative originId must not be empty");
  }
  if (input.maxVisibleOmenLines !== undefined && (!Number.isInteger(input.maxVisibleOmenLines) || input.maxVisibleOmenLines < 0)) {
    throw new Error("Hidden fate narrative maxVisibleOmenLines must be a non-negative integer");
  }
}

function buildInputContext(input: HiddenFateNarrativeEngineInput, registry: OriginFateNarrativeRegistry): InputContext {
  const origin = registry.getOriginStoryline(input.originStoryline.originId);
  const carriedItems = input.carriedItems.map((item) => cloneCarriedItemState(item, registry));
  const carriedItemDefinitions = carriedItems.map((item) => registry.getCarriedItemNarrative(item.itemId));
  const selectedDestinyIds = collectDestinyIds(input.destinies);
  const selectedDestinyTags = collectDestinyTags(input.destinies);
  const activeStorylineIds = input.originStoryline.activeStorylineIds ?? origin.storylineBias;
  const tokens = collectInputTokens(input, origin, carriedItemDefinitions, selectedDestinyIds, selectedDestinyTags);

  return {
    registry,
    origin,
    originId: origin.id,
    activeStorylineIds: [...activeStorylineIds],
    carriedItems,
    carriedItemDefinitions,
    selectedDestinyIds,
    selectedDestinyTags,
    tokens,
    contextTags: [...tokens],
    exactSynergyRules: findExactSynergyRules(origin.id, carriedItems, registry)
  };
}

function collectInputTokens(
  input: HiddenFateNarrativeEngineInput,
  origin: OriginStorylineDefinitionV02,
  carriedItems: readonly CarriedItemNarrativeDefinitionV02[],
  selectedDestinyIds: readonly Id[],
  selectedDestinyTags: readonly string[]
): ReadonlySet<string> {
  const tokens = new Set<string>();
  const opening = input.openingInnateDraft;
  for (const value of [
    origin.id,
    ...origin.storylineBias,
    ...origin.carriedItemBias,
    ...origin.interludeBias,
    ...input.originStoryline.matchedTags,
    opening.archetype.id,
    ...opening.archetype.tags,
    opening.spiritualRoot.categoryId,
    opening.spiritualRoot.primaryElement ?? "",
    ...(opening.spiritualRoot.primaryElement === undefined ? [] : [`root_${opening.spiritualRoot.primaryElement}`, `root:${opening.spiritualRoot.primaryElement}`]),
    ...opening.spiritualRoot.secondaryElements.map((element) => `root_${element}`),
    ...opening.spiritualRoot.relationTags,
    ...opening.spiritualRoot.tags,
    ...opening.tags.destinyBiasTags,
    ...opening.tags.lifeEventBiasTags,
    ...opening.tags.modeBiasTags,
    ...opening.tags.hiddenFateBiasTags,
    ...opening.ninePalaceEvaluation.tags.destinyBiasTags,
    ...opening.ninePalaceEvaluation.tags.lifeEventBiasTags,
    ...opening.ninePalaceEvaluation.tags.hiddenFateBiasTags,
    ...opening.ninePalaceEvaluation.tags.rootBiasTags,
    ...opening.ninePalaceEvaluation.tags.modeBiasTags,
    ...selectedDestinyIds,
    ...selectedDestinyTags
  ]) {
    addTagTokens(tokens, value);
  }
  for (const [element, score] of Object.entries(opening.spiritualRoot.elements)) {
    if (typeof score === "number" && score >= 50) {
      addTagTokens(tokens, element);
      addTagTokens(tokens, `root_${element}`);
    }
  }
  for (const [element, score] of Object.entries(opening.ninePalaceEvaluation.wuxing)) {
    if (score >= 75) {
      addTagTokens(tokens, element);
      addTagTokens(tokens, `root_${element}`);
    }
  }
  for (const item of carriedItems) {
    for (const value of [
      item.id,
      ...item.preferredOrigins,
      ...item.preferredDestinies
    ]) {
      addTagTokens(tokens, value);
    }
  }
  return tokens;
}

function collectStateTokens(
  state: OriginFateNarrativeStateV02,
  origin: OriginStorylineDefinitionV02,
  carriedItems: readonly CarriedItemNarrativeStateV02[],
  registry: OriginFateNarrativeRegistry
): ReadonlySet<string> {
  const tokens = new Set<string>();
  for (const value of [
    origin.id,
    ...origin.storylineBias,
    ...origin.hiddenFateBias,
    ...origin.carriedItemBias,
    ...origin.interludeBias,
    ...state.lifeEventBiasTags,
    ...state.majorChoiceSignals,
    ...state.interludeBiasTags,
    ...state.stageTransitionTokens,
    ...state.age18Hooks
  ]) {
    addTagTokens(tokens, value);
  }
  for (const itemState of carriedItems) {
    const item = registry.getCarriedItemNarrative(itemState.itemId);
    for (const value of [item.id, ...item.eventHooks, ...item.interludeHooks, ...item.preferredHiddenFates]) {
      addTagTokens(tokens, value);
    }
  }
  return tokens;
}

function buildCandidateScore(hiddenFate: HiddenFateDefinitionV02, context: InputContext): CandidateScore {
  const matchedTags: string[] = [];
  const antiMatchedTags: string[] = [];
  const matchedSynergyRuleIds: Id[] = [];
  const itemAffinityTags: string[] = [];
  const age18HookTargets: Id[] = [];
  const reasons: string[] = [];
  let progressBonus = 0;
  let weight = RARITY_BASE_WEIGHT[hiddenFate.rarity];

  if (hiddenFate.preferredOrigins.includes(context.originId)) {
    weight += ORIGIN_DIRECT_BONUS;
    matchedTags.push(context.originId);
    reasons.push("preferred_origin");
  }
  if (context.origin.hiddenFateBias.includes(hiddenFate.id)) {
    weight += ORIGIN_BIAS_BONUS;
    matchedTags.push(`origin_bias:${context.originId}`);
    reasons.push("origin_hidden_bias");
  }

  for (const item of context.carriedItemDefinitions) {
    if (hiddenFate.preferredItems.includes(item.id)) {
      weight += ITEM_DIRECT_BONUS;
      matchedTags.push(item.id);
      reasons.push("preferred_item");
    }
    if (item.preferredHiddenFates.includes(hiddenFate.id)) {
      weight += ITEM_BIAS_BONUS;
      matchedTags.push(`item_bias:${item.id}`);
      reasons.push("item_hidden_bias");
    }
  }

  for (const destinyId of context.selectedDestinyIds) {
    if (hiddenFate.preferredDestinies.includes(destinyId)) {
      weight += DESTINY_DIRECT_BONUS;
      matchedTags.push(destinyId);
      reasons.push("preferred_destiny");
    }
  }

  for (const tag of hiddenFate.primaryTags) {
    if (context.tokens.has(normalizeToken(tag))) {
      weight += TAG_MATCH_BONUS;
      matchedTags.push(tag);
      reasons.push("primary_tag_match");
    }
  }
  for (const rootId of hiddenFate.preferredRoots) {
    if (context.tokens.has(normalizeToken(rootId))) {
      weight += ROOT_DIRECT_BONUS;
      matchedTags.push(rootId);
      reasons.push("preferred_root");
    }
  }
  for (const antiTag of hiddenFate.antiTags) {
    if (context.tokens.has(normalizeToken(antiTag))) {
      weight -= ANTI_TAG_PENALTY;
      antiMatchedTags.push(antiTag);
      reasons.push("anti_tag_penalty");
    }
  }

  for (const rule of context.exactSynergyRules.filter((candidate) => candidate.hiddenFateId === hiddenFate.id)) {
    weight += SYNERGY_BONUS;
    matchedSynergyRuleIds.push(rule.id);
    matchedTags.push(rule.id);
    reasons.push("exact_synergy");
    for (const effect of rule.effects) {
      if (effect.type === "progressBonus" && effect.target === hiddenFate.id) {
        progressBonus += effect.value ?? 0;
      }
      if (effect.type === "itemAffinityBonus") {
        itemAffinityTags.push(`itemAffinity:${effect.target}:+${effect.value ?? 0}`);
      }
      if (effect.type === "age18Hook") {
        age18HookTargets.push(effect.target);
      }
    }
  }

  const roundedWeight = round2(Math.max(1, weight));
  const directSignalCount = reasons.filter(
    (reason) => reason === "primary_tag_match" || reason === "preferred_root" || reason === "preferred_destiny"
  ).length;
  return {
    hiddenFate,
    weight: roundedWeight,
    selectionWeight: roundedWeight * (1 + directSignalCount) * 8 ** directSignalCount,
    matchedTags: uniqueStable(matchedTags),
    antiMatchedTags: uniqueStable(antiMatchedTags),
    matchedSynergyRuleIds: uniqueStable(matchedSynergyRuleIds),
    progressBonus: Math.trunc(progressBonus),
    itemAffinityTags: uniqueStable(itemAffinityTags),
    age18HookTargets: uniqueStable(age18HookTargets),
    reasons: uniqueStable(reasons)
  };
}

function resolveInitialHiddenFates(
  input: HiddenFateNarrativeEngineInput,
  context: InputContext,
  candidates: readonly CandidateScore[],
  narrativeRng: SeededRng,
  progressRng: SeededRng
): readonly HiddenFateNarrativeStateV02[] {
  if (input.previousHiddenFates !== undefined && input.previousHiddenFates.length > 0) {
    return input.previousHiddenFates.map((hiddenFate) => normalizeHiddenFateState(hiddenFate, context.registry));
  }

  const picked = narrativeRng.pickWeighted(candidates.map((candidate) => ({ item: candidate, weight: candidate.selectionWeight })));
  const progress = rollInitialProgress(picked, progressRng);
  const revealBand = context.registry.getRevealBandForProgress(progress).id;

  return [
    deepFreeze({
      hiddenFateId: picked.hiddenFate.id,
      progress,
      revealBand,
      knownToPlayer: true,
      trueNameRevealed: false,
      misleadingOmenIds: [...picked.hiddenFate.misleadingOmenIds],
      omenHistory: []
    })
  ];
}

function rollInitialProgress(candidate: CandidateScore, rng: SeededRng): number {
  const base = rng.rangeInt(10, 28);
  const matchBonus = Math.min(28, candidate.matchedTags.filter((tag) => !tag.startsWith("origin_bias:") && !tag.startsWith("item_bias:")).length * 3);
  const antiPenalty = candidate.antiMatchedTags.length * 4;
  return clampInteger(base + matchBonus + candidate.progressBonus - antiPenalty, 0, 100);
}

function applyProgressEvents(
  hiddenFates: readonly HiddenFateNarrativeStateV02[],
  progressEvents: readonly HiddenFateNarrativeProgressEventV02[],
  context: InputContext
): { readonly hiddenFates: readonly HiddenFateNarrativeStateV02[]; readonly debug: readonly HiddenFateNarrativeProgressEventDebugV02[] } {
  const debug: HiddenFateNarrativeProgressEventDebugV02[] = [];
  const updated = hiddenFates.map((hiddenFate) => {
    const definition = context.registry.getHiddenFate(hiddenFate.hiddenFateId);
    let progress = hiddenFate.progress;
    let lastProgressMonth = hiddenFate.lastProgressMonth;
    const omenHistory = [...hiddenFate.omenHistory];

    for (const event of progressEvents) {
      const delta = calculateProgressDelta(definition, event, context);
      if (delta === 0) {
        continue;
      }
      progress = clampInteger(progress + delta, 0, 100);
      if (event.ageMonth !== undefined) {
        lastProgressMonth = event.ageMonth;
      }
      omenHistory.push(event.id);
      debug.push({
        eventId: event.id,
        hiddenFateId: hiddenFate.hiddenFateId,
        appliedDelta: delta,
        matchedTags: matchedEventTags(definition, event, context),
        source: event.source
      });
    }

    return deepFreeze({
      hiddenFateId: hiddenFate.hiddenFateId,
      progress,
      revealBand: context.registry.getRevealBandForProgress(progress).id,
      knownToPlayer: hiddenFate.knownToPlayer,
      trueNameRevealed: false,
      misleadingOmenIds: [...hiddenFate.misleadingOmenIds],
      omenHistory: uniqueStable(omenHistory),
      ...(lastProgressMonth === undefined ? {} : { lastProgressMonth })
    });
  });

  return {
    hiddenFates: updated,
    debug
  };
}

function calculateProgressDelta(
  hiddenFate: HiddenFateDefinitionV02,
  event: HiddenFateNarrativeProgressEventV02,
  context: InputContext
): number {
  if (event.hiddenFateId !== undefined && event.hiddenFateId !== hiddenFate.id) {
    return 0;
  }
  if (event.progressDelta !== undefined) {
    if (!Number.isFinite(event.progressDelta)) {
      throw new Error(`Hidden fate narrative progressDelta must be finite for event: ${event.id}`);
    }
    return Math.trunc(event.progressDelta);
  }
  const matches = matchedEventTags(hiddenFate, event, context);
  return matches.length > 0 ? EVENT_DEFAULT_DELTA : 0;
}

function matchedEventTags(
  hiddenFate: HiddenFateDefinitionV02,
  event: HiddenFateNarrativeProgressEventV02,
  context: InputContext
): readonly string[] {
  const eventTokens = new Set<string>();
  for (const tag of event.tags) {
    addTagTokens(eventTokens, tag);
  }
  const hiddenTokens = new Set<string>();
  for (const tag of [...hiddenFate.primaryTags, ...hiddenFate.lifeEventHooks, ...hiddenFate.majorChoiceHooks]) {
    addTagTokens(hiddenTokens, tag);
  }
  for (const item of context.carriedItemDefinitions) {
    for (const hook of item.eventHooks) {
      addTagTokens(hiddenTokens, hook);
    }
  }

  return uniqueStable([...eventTokens].filter((tag) => hiddenTokens.has(tag)));
}

function buildNarrativeState(
  context: InputContext,
  hiddenFates: readonly HiddenFateNarrativeStateV02[],
  options: {
    readonly carriedItems: readonly CarriedItemNarrativeStateV02[];
    readonly maxVisibleOmenLines?: number;
    readonly candidateScores: readonly CandidateScore[] | readonly HiddenFateNarrativeCandidateDebugV02[];
    readonly progressEventsApplied: readonly HiddenFateNarrativeProgressEventDebugV02[];
    readonly age18HookTargets: readonly Id[];
  }
): OriginFateNarrativeStateV02 {
  const hiddenDefinitions = hiddenFates.map((hiddenFate) => context.registry.getHiddenFate(hiddenFate.hiddenFateId));
  const origin = buildOriginNarrativeState(context);
  const carriedItems = options.carriedItems.map((item) => deepFreeze(cloneJson(item)));
  const visibleOmen = buildVisibleOmenLines(hiddenFates, context.registry, options.maxVisibleOmenLines);
  const safeOmenSourceIds = visibleOmen.sourceIds;
  const candidateWeights = options.candidateScores.map(toCandidateDebug);

  return deepFreeze({
    origin,
    hiddenFates: hiddenFates.map((hiddenFate) => deepFreeze(cloneJson(hiddenFate))),
    carriedItems,
    visibleOmenLines: visibleOmen.lines,
    lifeEventBiasTags: uniqueStable([
      ...hiddenDefinitions.flatMap((hiddenFate) => hiddenFate.lifeEventHooks),
      ...context.carriedItemDefinitions.flatMap((item) => item.eventHooks)
    ]),
    majorChoiceSignals: uniqueStable(hiddenDefinitions.flatMap((hiddenFate) => hiddenFate.majorChoiceHooks)),
    interludeBiasTags: uniqueStable([
      ...hiddenDefinitions.flatMap((hiddenFate) => hiddenFate.interludeHooks),
      ...context.origin.interludeBias,
      ...context.carriedItemDefinitions.flatMap((item) => item.interludeHooks)
    ]),
    stageTransitionTokens: uniqueStable(hiddenDefinitions.flatMap((hiddenFate) => hiddenFate.stageTransitionTokens)),
    age18Hooks: uniqueStable([
      ...hiddenDefinitions.flatMap((hiddenFate) => hiddenFate.age18Outcomes),
      ...context.carriedItemDefinitions.flatMap((item) => item.age18Conversions),
      ...options.age18HookTargets
    ]),
    debug: {
      candidateWeights,
      selectedHiddenFateIds: hiddenFates.map((hiddenFate) => hiddenFate.hiddenFateId),
      contextTags: context.contextTags,
      progressEventsApplied: options.progressEventsApplied,
      safeOmenSourceIds
    }
  });
}

function buildOriginNarrativeState(context: InputContext): OriginNarrativeStateV02 {
  return generateOriginNarrativeState(
    {
      originId: context.originId,
      activeStorylineIds: context.activeStorylineIds
    },
    { registry: context.registry }
  );
}

function buildVisibleOmenLines(
  hiddenFates: readonly HiddenFateNarrativeStateV02[],
  registry: OriginFateNarrativeRegistry,
  explicitMaxLines: number | undefined
): { readonly lines: readonly string[]; readonly sourceIds: readonly Id[] } {
  const maxLines = explicitMaxLines ?? registry.revealStageRules.revealPolicies.characterCreation?.maxOmenLines ?? 2;
  if (maxLines === 0) {
    return {
      lines: [],
      sourceIds: []
    };
  }

  const lines: string[] = [];
  const sourceIds: Id[] = [];
  for (const hiddenState of hiddenFates) {
    const view = buildPublicOmenView(hiddenState, {
      registry,
      surface: "characterCreation",
      maxOmenLines: maxLines
    });
    lines.push(...view.omenLines);
    sourceIds.push(...view.debugTags);
  }

  return {
    lines: uniqueStable(lines).slice(0, maxLines),
    sourceIds: uniqueStable(sourceIds).slice(0, maxLines)
  };
}

function findExactSynergyRules(
  originId: Id,
  carriedItems: readonly CarriedItemNarrativeStateV02[],
  registry: OriginFateNarrativeRegistry
): readonly OriginItemHiddenSynergyRuleV02[] {
  const itemIds = new Set(carriedItems.map((item) => item.itemId));
  return registry.synergyRules.filter((rule) => rule.originId === originId && itemIds.has(rule.itemId));
}

function collectDestinyIds(destinies: HiddenFateNarrativeEngineInput["destinies"]): readonly Id[] {
  return uniqueStable([
    destinies.main.traitId,
    ...destinies.secondary.map((trait) => trait.traitId),
    destinies.flaw.traitId
  ]);
}

function collectDestinyTags(destinies: HiddenFateNarrativeEngineInput["destinies"]): readonly string[] {
  return uniqueStable([
    ...destinies.main.tags,
    ...destinies.secondary.flatMap((trait) => trait.tags),
    ...destinies.flaw.tags,
    ...(destinies.main.fateAlignmentReasonTags ?? []),
    ...destinies.secondary.flatMap((trait) => trait.fateAlignmentReasonTags ?? []),
    ...(destinies.flaw.fateAlignmentReasonTags ?? [])
  ]);
}

function cloneCarriedItemState(
  item: CarriedItemNarrativeStateV02,
  registry: OriginFateNarrativeRegistry
): CarriedItemNarrativeStateV02 {
  registry.getCarriedItemNarrative(item.itemId);
  if (!Number.isFinite(item.affinity)) {
    throw new Error(`Hidden fate narrative carried item affinity must be finite: ${item.itemId}`);
  }
  return deepFreeze({
    itemId: item.itemId,
    affinity: Math.trunc(item.affinity),
    lifecycleStage: item.lifecycleStage,
    eventHistory: [...item.eventHistory],
    damaged: item.damaged,
    converted: item.converted
  });
}

function cloneHiddenFateState(
  hiddenFate: HiddenFateNarrativeStateV02,
  registry: OriginFateNarrativeRegistry
): HiddenFateNarrativeStateV02 {
  return normalizeHiddenFateState(hiddenFate, registry);
}

function normalizeHiddenFateState(
  hiddenFate: HiddenFateNarrativeStateV02,
  registry: OriginFateNarrativeRegistry
): HiddenFateNarrativeStateV02 {
  const definition = registry.getHiddenFate(hiddenFate.hiddenFateId);
  const progress = clampInteger(hiddenFate.progress, 0, 100);
  return deepFreeze({
    hiddenFateId: hiddenFate.hiddenFateId,
    progress,
    revealBand: registry.getRevealBandForProgress(progress).id,
    knownToPlayer: hiddenFate.knownToPlayer,
    trueNameRevealed: false,
    misleadingOmenIds: hiddenFate.misleadingOmenIds.length > 0 ? [...hiddenFate.misleadingOmenIds] : [...definition.misleadingOmenIds],
    omenHistory: [...hiddenFate.omenHistory],
    ...(hiddenFate.lastProgressMonth === undefined ? {} : { lastProgressMonth: hiddenFate.lastProgressMonth })
  });
}

function toCandidateDebug(candidate: CandidateScore | HiddenFateNarrativeCandidateDebugV02): HiddenFateNarrativeCandidateDebugV02 {
  if ("hiddenFate" in candidate) {
    return {
      id: candidate.hiddenFate.id,
      weight: candidate.weight,
      matchedTags: candidate.matchedTags,
      antiMatchedTags: candidate.antiMatchedTags,
      matchedSynergyRuleIds: candidate.matchedSynergyRuleIds,
      progressBonus: candidate.progressBonus,
      itemAffinityTags: candidate.itemAffinityTags,
      reasons: candidate.reasons
    };
  }
  return {
    id: candidate.id,
    weight: candidate.weight,
    matchedTags: [...candidate.matchedTags],
    antiMatchedTags: [...candidate.antiMatchedTags],
    matchedSynergyRuleIds: [...candidate.matchedSynergyRuleIds],
    progressBonus: candidate.progressBonus,
    itemAffinityTags: [...candidate.itemAffinityTags],
    reasons: [...candidate.reasons]
  };
}

function toCandidateScoreLike(candidate: HiddenFateNarrativeCandidateDebugV02): HiddenFateNarrativeCandidateDebugV02 {
  return candidate;
}

function addTagTokens(tokens: Set<string>, rawValue: string): void {
  const normalized = normalizeToken(rawValue);
  if (normalized.length === 0 || tokens.has(normalized)) {
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

function uniqueStable<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Hidden fate narrative progress must be finite");
  }
  return Math.trunc(Math.min(max, Math.max(min, value)));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}
