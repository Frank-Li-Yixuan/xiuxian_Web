import type {
  Id,
  OriginNarrativeDebugMetadataV02,
  OriginNarrativeEngineInput,
  OriginNarrativeEventPhaseSeedsV02,
  OriginNarrativeLifeContextV02,
  OriginNarrativeProgressEventDebugV02,
  OriginNarrativeProgressEventV02,
  OriginNarrativeStateV02,
  OriginStorylineDefinitionV02,
  OriginStorylineResultV02
} from "../types/origin-fate-narrative-types.v0.2";
import {
  loadOriginFateNarrativeRegistry,
  type OriginFateNarrativeRegistry
} from "./OriginFateNarrativeRegistry";

export interface OriginNarrativeEngineContext {
  readonly registry?: OriginFateNarrativeRegistry;
}

const STORYLINE_CANONICAL_ALIASES: Readonly<Record<string, string>> = {
  storyline_alchemy_apothecary: "storyline_apothecary_alchemy",
  storyline_fallen_lineage: "storyline_fallen_cultivator_lineage",
  storyline_system_omen: "storyline_system_prelude",
  storyline_poor_study: "storyline_poor_scholar",
  storyline_temple_incense: "storyline_taoist_incense"
};

const PHASE_TAGS = [
  "phase:early_echo",
  "phase:childhood_seed",
  "phase:youth_conflict",
  "phase:teen_choice"
] as const;

const TAG_MATCH_PROGRESS_DELTA = 4;

export function generateOriginNarrativeState(
  input: OriginNarrativeEngineInput,
  context: OriginNarrativeEngineContext = {}
): OriginNarrativeStateV02 {
  validateInput(input);
  const registry = context.registry ?? loadOriginFateNarrativeRegistry();
  const origin = registry.getOriginStoryline(input.originId);
  const activeStorylineIds = uniqueStable(input.activeStorylineIds ?? origin.storylineBias);
  const baseState = buildState(origin, activeStorylineIds, input.matchedTags ?? [], []);

  if (input.progressEvents === undefined || input.progressEvents.length === 0) {
    return baseState;
  }

  return advanceOriginNarrativeState(baseState, input.progressEvents, { registry });
}

export function advanceOriginNarrativeState(
  state: OriginNarrativeStateV02,
  progressEvents: readonly OriginNarrativeProgressEventV02[],
  context: OriginNarrativeEngineContext = {}
): OriginNarrativeStateV02 {
  const registry = context.registry ?? loadOriginFateNarrativeRegistry();
  const origin = registry.getOriginStoryline(state.originId);
  const activeStorylineIds = uniqueStable(state.activeStorylineIds);
  const activeSet = new Set(activeStorylineIds);
  const progress = { ...state.originThreadProgress };
  const progressEventsApplied: OriginNarrativeProgressEventDebugV02[] = [];

  for (const event of progressEvents) {
    validateProgressEvent(event);
    for (const storylineId of getTargetStorylineIds(event, activeStorylineIds)) {
      if (!activeSet.has(storylineId)) {
        continue;
      }
      const matchedTags = getMatchedEventTags(event, state);
      const delta = event.progressDelta === undefined
        ? (matchedTags.length > 0 ? TAG_MATCH_PROGRESS_DELTA : 0)
        : Math.trunc(event.progressDelta);
      if (delta === 0) {
        continue;
      }
      progress[storylineId] = clampInteger((progress[storylineId] ?? 0) + delta, 0, 100);
      progressEventsApplied.push(deepFreeze({
        eventId: event.id,
        storylineId,
        appliedDelta: delta,
        matchedTags,
        source: event.source,
        ...(event.ageMonth === undefined ? {} : { ageMonth: event.ageMonth })
      }));
    }
  }

  const debug = mergeDebug(state.debug, progressEventsApplied);
  return buildState(origin, activeStorylineIds, state.lifeEventBiasTags, progressEventsApplied, progress, debug);
}

export function createOriginStorylineLifeContext(
  value: OriginNarrativeStateV02 | OriginStorylineResultV02,
  context: OriginNarrativeEngineContext = {}
): OriginNarrativeLifeContextV02 {
  const state = isOriginNarrativeState(value)
    ? value
    : generateOriginNarrativeState(
      {
        originId: value.originId,
        matchedTags: value.matchedTags,
        ...(value.activeStorylineIds === undefined ? {} : { activeStorylineIds: value.activeStorylineIds })
      },
      context
    );
  const eventPhaseTags = [...PHASE_TAGS];
  const originBiasTags = uniqueStable([
    `origin:${state.originId}`,
    ...state.regionTags.map((tag) => `region:${tag}`),
    ...state.activeStorylineIds.map((id) => `storyline:${id}`),
    ...state.canonicalLifeStorylineIds.map((id) => `lifeStoryline:${id}`)
  ]);
  const monthlyEventTags = uniqueStable([
    ...state.lifeEventBiasTags,
    ...originBiasTags,
    ...eventPhaseTags,
    ...state.carriedItemBias.map((id) => `item:${id}`),
    ...state.hiddenFateBias.map((id) => `hidden:${id}`),
    ...state.interludeBiasTags.map((id) => `interlude:${id}`)
  ]);

  return deepFreeze({
    originId: state.originId,
    regionTags: [...state.regionTags],
    activeStorylineIds: [...state.activeStorylineIds],
    canonicalLifeStorylineIds: [...state.canonicalLifeStorylineIds],
    originThreadProgress: { ...state.originThreadProgress },
    storylineBias: [...state.activeStorylineIds],
    carriedItemBias: [...state.carriedItemBias],
    hiddenFateBias: [...state.hiddenFateBias],
    lifeEventBiasTags: [...state.lifeEventBiasTags],
    monthlyEventTags,
    majorChoiceTags: uniqueStable([
      ...originBiasTags,
      ...state.hiddenFateBias.map((id) => `hidden:${id}`),
      ...state.carriedItemBias.map((id) => `item:${id}`)
    ]),
    interludeBiasTags: state.interludeBiasTags.map((id) => `interlude:${id}`),
    eventPhaseTags,
    originBiasTags,
    debugTags: uniqueStable([
      `originNarrative.origin:${state.originId}`,
      `originNarrative.storylines:${state.activeStorylineIds.join(",") || "none"}`,
      `originNarrative.canonical:${state.canonicalLifeStorylineIds.join(",") || "none"}`
    ])
  });
}

export function toOriginStorylineResult(state: OriginNarrativeStateV02): OriginStorylineResultV02 {
  return deepFreeze({
    originId: state.originId,
    activeStorylineIds: [...state.activeStorylineIds],
    matchedTags: uniqueStable([
      `origin:${state.originId}`,
      ...state.activeStorylineIds.map((id) => `storyline:${id}`),
      ...state.canonicalLifeStorylineIds.map((id) => `lifeStoryline:${id}`),
      ...state.regionTags.map((tag) => `region:${tag}`),
      ...state.lifeEventBiasTags
    ])
  });
}

function buildState(
  origin: OriginStorylineDefinitionV02,
  activeStorylineIds: readonly Id[],
  matchedTags: readonly string[],
  progressEventsApplied: readonly OriginNarrativeProgressEventDebugV02[],
  explicitProgress?: Readonly<Record<Id, number>>,
  explicitDebug?: OriginNarrativeDebugMetadataV02
): OriginNarrativeStateV02 {
  const canonicalLifeStorylineIds = uniqueStable(activeStorylineIds.map(toCanonicalLifeStorylineId));
  const originThreadProgress = explicitProgress === undefined
    ? Object.fromEntries(activeStorylineIds.map((id) => [id, 0]))
    : Object.fromEntries(activeStorylineIds.map((id) => [id, clampInteger(explicitProgress[id] ?? 0, 0, 100)]));
  const eventPhaseSeeds = buildEventPhaseSeeds(origin);
  const contextTags = uniqueStable([
    `origin:${origin.id}`,
    ...origin.regionTags.map((tag) => `region:${tag}`),
    ...activeStorylineIds.map((id) => `storyline:${id}`),
    ...canonicalLifeStorylineIds.map((id) => `lifeStoryline:${id}`),
    ...origin.carriedItemBias.map((id) => `item:${id}`),
    ...origin.hiddenFateBias.map((id) => `hidden:${id}`),
    ...origin.interludeBias.map((id) => `interlude:${id}`),
    ...PHASE_TAGS,
    ...matchedTags
  ]);

  return deepFreeze({
    originId: origin.id,
    activeStorylineIds: [...activeStorylineIds],
    originThreadProgress,
    familyTie: 0,
    worldlyTie: 0,
    lifeEventBiasTags: contextTags,
    carriedItemBias: [...origin.carriedItemBias],
    hiddenFateBias: [...origin.hiddenFateBias],
    regionTags: [...origin.regionTags],
    interludeBiasTags: [...origin.interludeBias],
    eventPhaseSeeds,
    canonicalLifeStorylineIds,
    debug: explicitDebug ?? {
      contextTags,
      progressEventsApplied,
      canonicalAliasMappings: activeStorylineIds
        .filter((id) => toCanonicalLifeStorylineId(id) !== id)
        .map((id) => ({
          rawStorylineId: id,
          canonicalLifeStorylineId: toCanonicalLifeStorylineId(id)
        }))
    }
  });
}

function buildEventPhaseSeeds(origin: OriginStorylineDefinitionV02): OriginNarrativeEventPhaseSeedsV02 {
  return {
    earlyEcho: [...origin.earlyEchoEvents],
    childhoodSeed: [...origin.childhoodSeedEvents],
    youthConflict: [...origin.youthConflictEvents],
    teenChoice: [...origin.teenChoiceEvents]
  };
}

function mergeDebug(
  previous: OriginNarrativeDebugMetadataV02 | undefined,
  progressEventsApplied: readonly OriginNarrativeProgressEventDebugV02[]
): OriginNarrativeDebugMetadataV02 | undefined {
  if (previous === undefined) {
    return undefined;
  }
  return {
    contextTags: [...previous.contextTags],
    progressEventsApplied: [
      ...previous.progressEventsApplied.map((event) => cloneJson(event)),
      ...progressEventsApplied.map((event) => cloneJson(event))
    ],
    canonicalAliasMappings: previous.canonicalAliasMappings.map((mapping) => cloneJson(mapping))
  };
}

function getTargetStorylineIds(
  event: OriginNarrativeProgressEventV02,
  activeStorylineIds: readonly Id[]
): readonly Id[] {
  const targetId = event.storylineId ?? event.threadId;
  return targetId === undefined ? activeStorylineIds : [targetId];
}

function getMatchedEventTags(event: OriginNarrativeProgressEventV02, state: OriginNarrativeStateV02): readonly string[] {
  if (event.progressDelta !== undefined) {
    return [...event.tags];
  }
  const contextTokens = new Set<string>();
  for (const tag of [
    ...state.lifeEventBiasTags,
    ...state.regionTags,
    ...state.activeStorylineIds,
    ...state.canonicalLifeStorylineIds,
    ...state.carriedItemBias,
    ...state.hiddenFateBias,
    ...state.interludeBiasTags,
    ...PHASE_TAGS
  ]) {
    addTokenVariants(contextTokens, tag);
  }
  return uniqueStable(event.tags.filter((tag) => contextTokens.has(normalizeToken(tag))));
}

function validateInput(input: OriginNarrativeEngineInput): void {
  if (input.originId.trim().length === 0) {
    throw new Error("Origin narrative originId must not be empty");
  }
  if (input.currentMonth !== undefined && (!Number.isInteger(input.currentMonth) || input.currentMonth < 0)) {
    throw new Error("Origin narrative currentMonth must be a non-negative integer");
  }
}

function validateProgressEvent(event: OriginNarrativeProgressEventV02): void {
  if (event.id.trim().length === 0) {
    throw new Error("Origin narrative progress event id must not be empty");
  }
  if (event.source.trim().length === 0) {
    throw new Error(`Origin narrative progress event source must not be empty: ${event.id}`);
  }
  if (!Array.isArray(event.tags)) {
    throw new Error(`Origin narrative progress event tags must be an array: ${event.id}`);
  }
  if (event.progressDelta !== undefined && !Number.isFinite(event.progressDelta)) {
    throw new Error(`Origin narrative progressDelta must be finite for event: ${event.id}`);
  }
  if (event.ageMonth !== undefined && (!Number.isInteger(event.ageMonth) || event.ageMonth < 0)) {
    throw new Error(`Origin narrative progress event ageMonth must be a non-negative integer: ${event.id}`);
  }
}

function isOriginNarrativeState(value: OriginNarrativeStateV02 | OriginStorylineResultV02): value is OriginNarrativeStateV02 {
  return "originThreadProgress" in value;
}

function toCanonicalLifeStorylineId(id: Id): Id {
  return STORYLINE_CANONICAL_ALIASES[id] ?? id;
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

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Origin narrative progress must be finite");
  }
  return Math.trunc(Math.min(max, Math.max(min, value)));
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
