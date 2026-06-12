import type { SeededRng } from "../sim/core/SeededRng";
import type {
  CarriedItemAge18ConversionInputV02,
  CarriedItemLifecycleAdvanceResultV02,
  CarriedItemLifecycleCandidateDebugV02,
  CarriedItemLifecycleEngineInput,
  CarriedItemLifecycleGenerationResultV02,
  CarriedItemLifecycleHookProjectionV02,
  CarriedItemLifecycleProgressEventDebugV02,
  CarriedItemLifecycleProgressEventV02,
  CarriedItemLifecycleStage,
  CarriedItemNarrativeDefinitionV02,
  CarriedItemNarrativeStateV02,
  Id,
  OriginItemHiddenSynergyRuleV02,
  OriginStorylineDefinitionV02
} from "../types/origin-fate-narrative-types.v0.2";
import {
  loadOriginFateNarrativeRegistry,
  type OriginFateNarrativeRegistry
} from "./OriginFateNarrativeRegistry";

export interface CarriedItemLifecycleEngineContext {
  readonly registry?: OriginFateNarrativeRegistry;
}

interface CandidateScore {
  readonly item: CarriedItemNarrativeDefinitionV02;
  readonly weight: number;
  readonly selectionWeight: number;
  readonly initialAffinity: number;
  readonly matchedTags: readonly string[];
  readonly matchedSynergyRuleIds: readonly Id[];
  readonly affinityBonus: number;
  readonly reasons: readonly string[];
}

interface InputContext {
  readonly registry: OriginFateNarrativeRegistry;
  readonly origin: OriginStorylineDefinitionV02;
  readonly hiddenFateIds: readonly Id[];
  readonly selectedDestinyIds: readonly Id[];
  readonly tokens: ReadonlySet<string>;
}

const BASE_WEIGHT = 18;
const ORIGIN_BIAS_WEIGHT = 70;
const ORIGIN_PREFERENCE_WEIGHT = 46;
const HIDDEN_FATE_WEIGHT = 58;
const DESTINY_WEIGHT = 36;
const SYNERGY_WEIGHT = 90;
const BASE_AFFINITY = 18;
const ORIGIN_AFFINITY = 11;
const HIDDEN_FATE_AFFINITY = 16;
const DESTINY_AFFINITY = 9;
const SYNERGY_AFFINITY = 6;
const EVENT_TAG_AFFINITY_DELTA = 6;
const SECOND_ITEM_MIN_SUPPORT = 2;

export function generateCarriedItemNarrativeStates(
  input: CarriedItemLifecycleEngineInput,
  context: CarriedItemLifecycleEngineContext = {}
): CarriedItemLifecycleGenerationResultV02 {
  validateGenerationInput(input);
  const registry = context.registry ?? loadOriginFateNarrativeRegistry();
  const inputContext = buildInputContext(input, registry);
  const candidates = registry.carriedItems.map((item) => buildCandidateScore(item, inputContext));
  const selectedItems = selectInitialItems(input, candidates);

  return deepFreeze({
    items: selectedItems.map((candidate) => buildItemState(candidate)),
    debug: {
      candidateWeights: candidates.map(toCandidateDebug)
    }
  });
}

export function advanceCarriedItemLifecycleStates(
  states: readonly CarriedItemNarrativeStateV02[],
  progressEvents: readonly CarriedItemLifecycleProgressEventV02[],
  context: CarriedItemLifecycleEngineContext = {}
): CarriedItemLifecycleAdvanceResultV02 {
  const registry = context.registry ?? loadOriginFateNarrativeRegistry();
  for (const event of progressEvents) {
    if (event.itemId !== undefined) {
      registry.getCarriedItemNarrative(event.itemId);
    }
  }
  const debug: CarriedItemLifecycleProgressEventDebugV02[] = [];
  const items = states.map((state) => {
    const definition = registry.getCarriedItemNarrative(state.itemId);
    let affinity = clampAffinity(state.affinity);
    let damaged = state.damaged;
    let converted = state.converted;
    const eventHistory = [...state.eventHistory];

    for (const event of progressEvents) {
      validateProgressEvent(event);
      const matchedTags = getMatchedEventTags(definition, event);
      const targeted = event.itemId === undefined || event.itemId === state.itemId;
      const delta = targeted ? calculateEventDelta(definition, event, matchedTags) : 0;
      if (targeted && (delta !== 0 || event.damaged === true || event.converted === true)) {
        affinity = clampAffinity(affinity + delta);
        damaged = damaged || event.damaged === true;
        converted = converted || event.converted === true;
        eventHistory.push(event.id);
        debug.push({
          eventId: event.id,
          itemId: state.itemId,
          appliedDelta: delta,
          matchedTags,
          source: event.source,
          ...(event.ageMonth === undefined ? {} : { ageMonth: event.ageMonth })
        });
      }
    }

    const lifecycleStage = getLifecycleStageForAffinity(definition, affinity, converted);
    return deepFreeze({
      itemId: state.itemId,
      affinity,
      lifecycleStage,
      eventHistory: uniqueStable(eventHistory),
      damaged,
      converted: converted || lifecycleStage === "converted"
    });
  });

  return deepFreeze({
    items,
    debug: {
      progressEventsApplied: debug
    }
  });
}

export function createCarriedItemLifecycleHooks(
  states: readonly CarriedItemNarrativeStateV02[],
  context: CarriedItemLifecycleEngineContext = {}
): CarriedItemLifecycleHookProjectionV02 {
  const registry = context.registry ?? loadOriginFateNarrativeRegistry();
  const monthlyEventHooks: string[] = [];
  const majorChoiceHooks: string[] = [];
  const interludeCandidateBiasTags: string[] = [];
  const age18Hooks: string[] = [];
  const dongfuHooks: string[] = [];
  const debugTags: string[] = [];

  for (const state of states) {
    const item = registry.getCarriedItemNarrative(state.itemId);
    monthlyEventHooks.push(
      ...item.eventHooks,
      `item:${item.id}`,
      `itemLifecycle:${state.lifecycleStage}`,
      `itemAffinity:${getAffinityBand(state.affinity)}`
    );
    majorChoiceHooks.push(
      `hasCarriedItem:${item.id}`,
      `hasCarriedItemTag:${item.id}`,
      `item:${item.id}`,
      `itemLifecycle:${state.lifecycleStage}`,
      ...item.preferredHiddenFates.map((id) => `hidden:${id}`),
      ...item.preferredOrigins.map((id) => `origin:${id}`)
    );
    interludeCandidateBiasTags.push(...item.interludeHooks.map((id) => `interlude:${id}`), `item:${item.id}`);
    age18Hooks.push(...item.age18Conversions);
    dongfuHooks.push(...item.dongfuHooks);
    debugTags.push(`carriedItem:${item.id}`, `carriedItem.lifecycle:${state.lifecycleStage}`);
  }

  return deepFreeze({
    itemIds: states.map((state) => state.itemId),
    monthlyEventHooks: uniqueStable(monthlyEventHooks),
    majorChoiceHooks: uniqueStable(majorChoiceHooks),
    interludeCandidateBiasTags: uniqueStable(interludeCandidateBiasTags),
    age18Hooks: uniqueStable(age18Hooks),
    dongfuHooks: uniqueStable(dongfuHooks),
    debugTags: uniqueStable(debugTags)
  });
}

export function createCarriedItemAge18ConversionInput(
  states: readonly CarriedItemNarrativeStateV02[],
  context: CarriedItemLifecycleEngineContext = {}
): CarriedItemAge18ConversionInputV02 {
  const registry = context.registry ?? loadOriginFateNarrativeRegistry();

  return deepFreeze({
    items: states.map((state) => {
      const item = registry.getCarriedItemNarrative(state.itemId);
      return {
        itemId: state.itemId,
        affinity: clampAffinity(state.affinity),
        lifecycleStage: state.lifecycleStage,
        damaged: state.damaged,
        converted: state.converted,
        age18Conversions: [...item.age18Conversions],
        dongfuHooks: [...item.dongfuHooks]
      };
    }),
    debugTags: uniqueStable(states.map((state) => `carriedItem.age18:${state.itemId}`))
  });
}

function validateGenerationInput(input: CarriedItemLifecycleEngineInput): void {
  if (input.originId.trim().length === 0) {
    throw new Error("Carried item lifecycle originId must not be empty");
  }
  if (!Array.isArray(input.hiddenFateIds)) {
    throw new Error("Carried item lifecycle hiddenFateIds must be an array");
  }
  if (input.rng === undefined) {
    throw new Error("Carried item lifecycle engine requires a SeededRng");
  }
}

function validateProgressEvent(event: CarriedItemLifecycleProgressEventV02): void {
  if (event.id.trim().length === 0) {
    throw new Error("Carried item lifecycle progress event id must not be empty");
  }
  if (event.source.trim().length === 0) {
    throw new Error(`Carried item lifecycle progress event source must not be empty: ${event.id}`);
  }
  if (!Array.isArray(event.tags)) {
    throw new Error(`Carried item lifecycle progress event tags must be an array: ${event.id}`);
  }
  if (event.affinityDelta !== undefined && !Number.isFinite(event.affinityDelta)) {
    throw new Error(`Carried item lifecycle affinityDelta must be finite for event: ${event.id}`);
  }
  if (event.ageMonth !== undefined && (!Number.isInteger(event.ageMonth) || event.ageMonth < 0)) {
    throw new Error(`Carried item lifecycle progress event ageMonth must be a non-negative integer: ${event.id}`);
  }
}

function buildInputContext(input: CarriedItemLifecycleEngineInput, registry: OriginFateNarrativeRegistry): InputContext {
  const origin = registry.getOriginStoryline(input.originId);
  for (const hiddenFateId of input.hiddenFateIds) {
    registry.getHiddenFate(hiddenFateId);
  }
  const selectedDestinyIds = uniqueStable(input.selectedDestinyIds ?? []);
  const tokens = new Set<string>();
  for (const value of [
    origin.id,
    ...origin.carriedItemBias,
    ...origin.hiddenFateBias,
    ...input.hiddenFateIds,
    ...selectedDestinyIds
  ]) {
    addTokenVariants(tokens, value);
  }

  return {
    registry,
    origin,
    hiddenFateIds: uniqueStable(input.hiddenFateIds),
    selectedDestinyIds,
    tokens
  };
}

function buildCandidateScore(item: CarriedItemNarrativeDefinitionV02, context: InputContext): CandidateScore {
  const matchedTags: string[] = [];
  const matchedSynergyRuleIds: Id[] = [];
  const reasons: string[] = [];
  let weight = BASE_WEIGHT;
  let affinity = BASE_AFFINITY;
  let affinityBonus = 0;

  if (context.origin.carriedItemBias.includes(item.id)) {
    weight += ORIGIN_BIAS_WEIGHT;
    affinity += ORIGIN_AFFINITY;
    matchedTags.push(context.origin.id);
    reasons.push("origin_carried_item_bias");
  }
  if (item.preferredOrigins.includes(context.origin.id)) {
    weight += ORIGIN_PREFERENCE_WEIGHT;
    affinity += ORIGIN_AFFINITY;
    matchedTags.push(context.origin.id);
    reasons.push("preferred_origin");
  }

  for (const hiddenFateId of context.hiddenFateIds) {
    if (item.preferredHiddenFates.includes(hiddenFateId)) {
      weight += HIDDEN_FATE_WEIGHT;
      affinity += HIDDEN_FATE_AFFINITY;
      matchedTags.push(hiddenFateId);
      reasons.push("preferred_hidden_fate");
    }
  }

  for (const destinyId of context.selectedDestinyIds) {
    if (item.preferredDestinies.includes(destinyId)) {
      weight += DESTINY_WEIGHT;
      affinity += DESTINY_AFFINITY;
      matchedTags.push(destinyId);
      reasons.push("preferred_destiny");
    }
  }

  for (const rule of getExactSynergyRules(item.id, context)) {
    weight += SYNERGY_WEIGHT;
    affinity += SYNERGY_AFFINITY;
    matchedSynergyRuleIds.push(rule.id);
    reasons.push("exact_synergy");
    for (const effect of rule.effects) {
      if (effect.type === "itemAffinityBonus" && effect.target === item.id) {
        const bonus = Math.trunc(effect.value ?? 0);
        affinity += bonus;
        affinityBonus += bonus;
      }
    }
  }

  return {
    item,
    weight: round2(Math.max(1, weight)),
    selectionWeight: round2(Math.max(1, weight) * (1 + uniqueStable(matchedTags).length)),
    initialAffinity: clampAffinity(affinity),
    matchedTags: uniqueStable(matchedTags),
    matchedSynergyRuleIds: uniqueStable(matchedSynergyRuleIds),
    affinityBonus,
    reasons: uniqueStable(reasons)
  };
}

function selectInitialItems(
  input: CarriedItemLifecycleEngineInput,
  candidates: readonly CandidateScore[]
): readonly CandidateScore[] {
  if (input.lockedItemIds !== undefined && input.lockedItemIds.length > 0) {
    const candidateById = new Map(candidates.map((candidate) => [candidate.item.id, candidate]));
    return uniqueStable(input.lockedItemIds).map((itemId) => {
      const candidate = candidateById.get(itemId);
      if (candidate === undefined) {
        throw new Error(`Missing origin fate v0.2 carried item narrative: ${itemId}`);
      }
      return candidate;
    }).slice(0, 2);
  }

  const rng = input.rng.fork("carried_item_lifecycle");
  const first = rng.pickWeighted(candidates.map((candidate) => ({ item: candidate, weight: candidate.selectionWeight })));
  const selected = [first];
  const remainingSupported = candidates.filter(
    (candidate) => candidate.item.id !== first.item.id && candidate.reasons.length >= SECOND_ITEM_MIN_SUPPORT
  );
  if (remainingSupported.length > 0 && rng.bool(0.35)) {
    selected.push(rng.pickWeighted(remainingSupported.map((candidate) => ({ item: candidate, weight: candidate.selectionWeight }))));
  }
  return selected;
}

function buildItemState(candidate: CandidateScore): CarriedItemNarrativeStateV02 {
  const lifecycleStage = getLifecycleStageForAffinity(candidate.item, candidate.initialAffinity, false);
  return deepFreeze({
    itemId: candidate.item.id,
    affinity: candidate.initialAffinity,
    lifecycleStage,
    eventHistory: [],
    damaged: false,
    converted: lifecycleStage === "converted"
  });
}

function calculateEventDelta(
  item: CarriedItemNarrativeDefinitionV02,
  event: CarriedItemLifecycleProgressEventV02,
  matchedTags: readonly string[]
): number {
  if (event.affinityDelta !== undefined) {
    return Math.trunc(event.affinityDelta);
  }
  if (event.itemId === item.id || matchedTags.length > 0) {
    return EVENT_TAG_AFFINITY_DELTA;
  }
  return 0;
}

function getMatchedEventTags(
  item: CarriedItemNarrativeDefinitionV02,
  event: CarriedItemLifecycleProgressEventV02
): readonly string[] {
  const itemTokens = new Set<string>();
  for (const value of [
    item.id,
    ...item.eventHooks,
    ...item.interludeHooks,
    ...item.preferredHiddenFates,
    ...item.preferredOrigins,
    ...item.preferredDestinies
  ]) {
    addTokenVariants(itemTokens, value);
  }
  return uniqueStable(event.tags.filter((tag) => itemTokens.has(normalizeToken(tag))));
}

function getLifecycleStageForAffinity(
  item: CarriedItemNarrativeDefinitionV02,
  affinity: number,
  forcedConverted: boolean
): CarriedItemLifecycleStage {
  const stages = item.lifecycle.map((entry) => entry.stage);
  if (forcedConverted || affinity >= 100) {
    return stages.includes("converted") ? "converted" : stages[stages.length - 1]!;
  }
  if (affinity < 35) {
    return stages[0]!;
  }
  if (affinity < 50) {
    return stages[1] ?? stages[0]!;
  }
  return stages[2] ?? stages[stages.length - 1]!;
}

function getExactSynergyRules(itemId: Id, context: InputContext): readonly OriginItemHiddenSynergyRuleV02[] {
  const hiddenFateIds = new Set(context.hiddenFateIds);
  return context.registry.synergyRules.filter(
    (rule) => rule.originId === context.origin.id && rule.itemId === itemId && hiddenFateIds.has(rule.hiddenFateId)
  );
}

function getAffinityBand(affinity: number): string {
  if (affinity >= 100) {
    return "converted";
  }
  if (affinity >= 75) {
    return "high";
  }
  if (affinity >= 50) {
    return "resonating";
  }
  if (affinity >= 35) {
    return "noticed";
  }
  return "low";
}

function toCandidateDebug(candidate: CandidateScore): CarriedItemLifecycleCandidateDebugV02 {
  return {
    id: candidate.item.id,
    weight: candidate.weight,
    initialAffinity: candidate.initialAffinity,
    matchedTags: candidate.matchedTags,
    matchedSynergyRuleIds: candidate.matchedSynergyRuleIds,
    affinityBonus: candidate.affinityBonus,
    reasons: candidate.reasons
  };
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

function uniqueStable<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function clampAffinity(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Carried item lifecycle affinity must be finite");
  }
  return Math.trunc(Math.min(100, Math.max(0, value)));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
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
