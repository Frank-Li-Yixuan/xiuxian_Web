import { EventThreadEngine } from "../lifeStorylines/EventThreadEngine";
import {
  loadLifeStorylineRegistry,
  type LifeStorylineRegistry
} from "../lifeStorylines/LifeStorylineRegistry";
import type {
  EventThreadDefinition,
  EventThreadProgress,
  EventThreadStage,
  LifeStorylineState,
  StorylineHook,
  StorylineSignalRule
} from "../types/life-storylines-types.v0.1";
import type {
  LifeEffect,
  LifeEventCondition,
  MonthlyLifeEventDefinition,
  MonthlyLifeLogEntry,
  MonthlyOutcomeBandId
} from "../types/life-monthly-events-types.v0.1";

export const MONTHLY_EVENT_STORYLINE_ADAPTER_SOURCE = "life_storylines_v0_1_monthly_event_adapter";

export interface MonthlyEventStorylineProjection {
  readonly monthlyEventWeightTags: readonly string[];
  readonly requiredHooks: readonly string[];
  readonly suppressionTags: readonly string[];
  readonly debug: {
    readonly source: typeof MONTHLY_EVENT_STORYLINE_ADAPTER_SOURCE;
    readonly activeStorylineIds: readonly string[];
    readonly activeThreadIds: readonly string[];
    readonly stageTags: readonly string[];
    readonly signalTags: readonly string[];
  };
}

export interface MonthlyEventStorylineProjectionOptions {
  readonly registry?: LifeStorylineRegistry;
}

export interface MonthlyEventStorylineWeightOptions extends MonthlyEventStorylineProjectionOptions {
  readonly tagMatchBonus?: number;
  readonly requiredHookBonus?: number;
  readonly crisisMatchBonus?: number;
  readonly suppressionPenalty?: number;
  readonly maxBonus?: number;
}

export interface AdvanceStorylineStateByMonthlyEventInput extends MonthlyEventStorylineProjectionOptions {
  readonly state: LifeStorylineState;
  readonly event: MonthlyLifeEventDefinition;
  readonly outcome?: MonthlyOutcomeBandId;
  readonly log?: MonthlyLifeLogEntry;
  readonly ageMonths?: number;
  readonly engine?: EventThreadEngine;
}

type ProjectionOrState = MonthlyEventStorylineProjection | LifeStorylineState | undefined;

interface MatchScore {
  readonly thread: EventThreadProgress;
  readonly score: number;
}

const DEFAULT_TAG_MATCH_BONUS = 4;
const DEFAULT_REQUIRED_HOOK_BONUS = 8;
const DEFAULT_CRISIS_MATCH_BONUS = 10;
const DEFAULT_SUPPRESSION_PENALTY = 12;
const DEFAULT_MAX_BONUS = 60;

const CRISIS_EVENT_TOKENS = new Set(["danger", "calamity", "bandit", "demon", "demon_beast", "heart_demon", "risk"]);

const THREAD_STAGE_TO_DATA_STAGES: Readonly<Record<EventThreadStage, readonly string[]>> = {
  notStarted: [],
  seeded: ["seed"],
  hinted: ["omen"],
  developing: ["development"],
  crisis: ["crisis"],
  resolved: ["resolution"],
  failed: ["crisis"],
  dormant: []
};

const OUTCOME_PROGRESS_DELTA: Readonly<Record<MonthlyOutcomeBandId, number>> = {
  bad: 4,
  normal: 8,
  good: 10,
  great: 12
};

export function createMonthlyEventStorylineProjection(
  state: LifeStorylineState,
  options: MonthlyEventStorylineProjectionOptions = {}
): MonthlyEventStorylineProjection {
  const registry = options.registry ?? loadLifeStorylineRegistry();
  const weightTags: string[] = [];
  const requiredHooks: string[] = [];
  const suppressionTags: string[] = [];
  const stageTags: string[] = [];
  const activeStorylineIds: string[] = [];
  const activeThreadIds: string[] = [];

  for (const storyline of getDownstreamStorylines(state)) {
    activeStorylineIds.push(storyline.storylineId);
    weightTags.push(storyline.storylineId, `storyline:${storyline.storylineId}`, ...storyline.tags);
    const definition = getIfPresent(() => registry.getStoryline(storyline.storylineId));
    if (definition === undefined) {
      continue;
    }
    weightTags.push(
      ...definition.themeTags,
      ...definition.worldContextTags,
      ...definition.possibleTransitionHooks,
      ...definition.possibleAge18Hooks
    );
    requiredHooks.push(
      ...definition.playInterludeAffinities.map((affinity) => affinity.hook),
      ...definition.possibleTransitionHooks,
      ...definition.possibleAge18Hooks
    );
    suppressionTags.push(...(definition.suppressionSignals ?? []).flatMap(signalRuleToTags));
  }

  for (const thread of state.eventThreads) {
    activeThreadIds.push(thread.threadId);
    stageTags.push(thread.stage, `threadStage:${thread.stage}`);
    weightTags.push(thread.threadId, `thread:${thread.threadId}`, thread.stage, `threadStage:${thread.stage}`);
    const definition = getIfPresent(() => registry.getThread(thread.threadId));
    if (definition === undefined) {
      continue;
    }
    weightTags.push(
      ...definition.threadTags,
      ...definition.monthlyEventHooks,
      ...definition.stageSequence.flatMap((stage) => stage.monthlyEventTags)
    );
    requiredHooks.push(
      ...definition.monthlyEventHooks,
      ...definition.majorChoiceHooks,
      ...definition.playInterludeHooks
    );
    const matchingStageTags = definition.stageSequence
      .filter((stage) => THREAD_STAGE_TO_DATA_STAGES[thread.stage].includes(stage.stage))
      .flatMap((stage) => stage.monthlyEventTags);
    weightTags.push(...matchingStageTags);
    if (thread.stage === "resolved") {
      requiredHooks.push(...definition.resolutionHooks);
    }
    if (thread.stage === "failed") {
      requiredHooks.push(...definition.failureHooks);
    }
    if (thread.stage === "crisis") {
      weightTags.push("crisis", "danger", "calamity");
    }
  }

  requiredHooks.push(
    ...state.transitionCandidateHooks,
    ...state.playInterludeCandidateHooks,
    ...state.recentHooks.flatMap((hook) => [hook.id, ...hook.tags])
  );

  const projection = {
    monthlyEventWeightTags: freezeArray(publicUnique(weightTags)),
    requiredHooks: freezeArray(publicUnique(requiredHooks)),
    suppressionTags: freezeArray(publicUnique(suppressionTags)),
    debug: deepFreeze({
      source: MONTHLY_EVENT_STORYLINE_ADAPTER_SOURCE,
      activeStorylineIds: freezeArray(publicUnique(activeStorylineIds)),
      activeThreadIds: freezeArray(publicUnique(activeThreadIds)),
      stageTags: freezeArray(publicUnique(stageTags)),
      signalTags: freezeArray(publicUnique([...weightTags, ...requiredHooks]))
    })
  } satisfies MonthlyEventStorylineProjection;

  return deepFreeze(projection);
}

export function calculateMonthlyEventStorylineBonus(
  event: MonthlyLifeEventDefinition,
  projectionOrState: ProjectionOrState,
  options: MonthlyEventStorylineWeightOptions = {}
): number {
  const projection = resolveProjection(projectionOrState, options);
  if (projection === undefined) {
    return 0;
  }

  const eventTokens = buildTokenSet(buildMonthlyEventSignals(event));
  const weightTokens = buildTokenSet(projection.monthlyEventWeightTags);
  const requiredTokens = buildTokenSet(projection.requiredHooks);
  const suppressionTokens = buildTokenSet(projection.suppressionTags);

  const tagMatches = countTokenIntersection(eventTokens, weightTokens);
  const requiredHookMatches = countTokenIntersection(eventTokens, requiredTokens);
  const suppressionMatches = countTokenIntersection(eventTokens, suppressionTokens);
  const crisisMatches = projection.debug.stageTags.includes("crisis") && hasAnyToken(eventTokens, CRISIS_EVENT_TOKENS) ? 1 : 0;

  const bonus =
    tagMatches * (options.tagMatchBonus ?? DEFAULT_TAG_MATCH_BONUS) +
    requiredHookMatches * (options.requiredHookBonus ?? DEFAULT_REQUIRED_HOOK_BONUS) +
    crisisMatches * (options.crisisMatchBonus ?? DEFAULT_CRISIS_MATCH_BONUS) -
    suppressionMatches * (options.suppressionPenalty ?? DEFAULT_SUPPRESSION_PENALTY);

  return clampInteger(bonus, 0, options.maxBonus ?? DEFAULT_MAX_BONUS);
}

export function applyMonthlyEventStorylineWeight(
  event: MonthlyLifeEventDefinition,
  baseWeight: number,
  projectionOrState?: ProjectionOrState,
  options: MonthlyEventStorylineWeightOptions = {}
): number {
  if (!Number.isFinite(baseWeight) || baseWeight <= 0) {
    return 0;
  }
  return Math.max(0, baseWeight + calculateMonthlyEventStorylineBonus(event, projectionOrState, options));
}

export function advanceStorylineStateByMonthlyEvent(
  input: AdvanceStorylineStateByMonthlyEventInput
): LifeStorylineState {
  const registry = input.registry ?? loadLifeStorylineRegistry();
  const eventTokens = buildTokenSet(buildMonthlyEventSignals(input.event));
  const best = input.state.eventThreads
    .map((thread) => scoreThreadForMonthlyEvent(thread, registry, eventTokens))
    .filter((score): score is MatchScore => score !== undefined && score.score > 0)
    .sort((left, right) => right.score - left.score || left.thread.threadId.localeCompare(right.thread.threadId))[0];

  if (best === undefined) {
    return input.state;
  }

  const engine = input.engine ?? new EventThreadEngine({ registry });
  const occurredAtMonth = input.ageMonths ?? input.log?.ageMonth;
  const hook = {
    id: `monthly_event:${input.event.id}:${best.thread.threadId}`,
    threadId: best.thread.threadId,
    progressDelta: getMonthlyEventProgressDelta(input.outcome, best.score),
    tensionDelta: getMonthlyEventTensionDelta(input.event, best.thread, eventTokens),
    clarityDelta: getMonthlyEventClarityDelta(input.outcome, best.thread),
    riskDelta: getMonthlyEventRiskDelta(input.event, best.thread, eventTokens),
    tags: publicUnique(buildMonthlyEventSignals(input.event)),
    visibility: "visible",
    weight: best.score
  } as const;
  return engine.advanceStateByHook(input.state, occurredAtMonth === undefined ? hook : { ...hook, occurredAtMonth });
}

function resolveProjection(
  projectionOrState: ProjectionOrState,
  options: MonthlyEventStorylineProjectionOptions
): MonthlyEventStorylineProjection | undefined {
  if (projectionOrState === undefined) {
    return undefined;
  }
  if ("monthlyEventWeightTags" in projectionOrState) {
    return projectionOrState;
  }
  return createMonthlyEventStorylineProjection(projectionOrState, options);
}

function getDownstreamStorylines(state: LifeStorylineState) {
  const downstreamIds = new Set(state.downstreamActiveStorylineIds ?? []);
  if (downstreamIds.size === 0) {
    return state.activeStorylines;
  }
  return state.activeStorylines.filter((storyline) => downstreamIds.has(storyline.storylineId));
}

function scoreThreadForMonthlyEvent(
  thread: EventThreadProgress,
  registry: LifeStorylineRegistry,
  eventTokens: ReadonlySet<string>
): MatchScore | undefined {
  const definition = getIfPresent(() => registry.getThread(thread.threadId));
  if (definition === undefined) {
    return undefined;
  }
  const threadTokens = buildTokenSet(buildThreadEventSignals(thread, definition));
  const score = countTokenIntersection(eventTokens, threadTokens);
  return { thread, score };
}

function buildThreadEventSignals(
  thread: EventThreadProgress,
  definition: EventThreadDefinition
): readonly string[] {
  const matchingStages = definition.stageSequence.filter((stage) =>
    THREAD_STAGE_TO_DATA_STAGES[thread.stage].includes(stage.stage)
  );
  return publicUnique([
    thread.threadId,
    thread.storylineId,
    thread.stage,
    `thread:${thread.threadId}`,
    `storyline:${thread.storylineId}`,
    ...definition.threadTags,
    ...definition.monthlyEventHooks,
    ...definition.majorChoiceHooks,
    ...definition.playInterludeHooks,
    ...matchingStages.flatMap((stage) => [
      stage.stage,
      ...stage.monthlyEventTags,
      ...stage.majorChoiceTags
    ]),
    ...(thread.stage === "crisis" ? ["crisis", "danger", "calamity"] : [])
  ]);
}

function buildMonthlyEventSignals(event: MonthlyLifeEventDefinition): readonly string[] {
  return publicUnique([
    event.id,
    event.category,
    `category:${event.category}`,
    ...event.tags,
    ...event.majorChoiceHooks,
    ...event.conditions.flatMap(conditionToSignals),
    ...event.visibleEffects.flatMap(effectToSignals),
    ...event.hiddenEffects.flatMap(effectToSignals)
  ]);
}

function conditionToSignals(condition: LifeEventCondition): readonly string[] {
  switch (condition.kind) {
    case "tagAny":
    case "tagAll":
      return condition.tags;
    case "statAbove":
    case "statBelow":
      return [condition.stat, `stat:${condition.stat}`];
    case "statAnyAbove":
      return condition.stats.flatMap((stat) => [stat, `stat:${stat}`]);
    case "stateFlag":
      return [condition.flag, `flag:${condition.flag}`];
    case "hiddenFateBandAtLeast":
      return [condition.hiddenFateId, condition.band];
  }
}

function effectToSignals(effect: LifeEffect): readonly string[] {
  return [
    effect.kind,
    effect.target,
    `${effect.kind}:${effect.target}`,
    ...(effect.reason === undefined ? [] : [effect.reason])
  ];
}

function signalRuleToTags(signal: StorylineSignalRule): readonly string[] {
  return publicUnique([
    ...(signal.tag === undefined ? [] : [signal.tag]),
    ...(signal.stat === undefined ? [] : [signal.stat, `stat:${signal.stat}`])
  ]);
}

function getMonthlyEventProgressDelta(outcome: MonthlyOutcomeBandId | undefined, score: number): number {
  return clampInteger((outcome === undefined ? OUTCOME_PROGRESS_DELTA.normal : OUTCOME_PROGRESS_DELTA[outcome]) + Math.min(6, score), 1, 20);
}

function getMonthlyEventTensionDelta(
  event: MonthlyLifeEventDefinition,
  thread: EventThreadProgress,
  eventTokens: ReadonlySet<string>
): number {
  if (thread.stage === "crisis" || event.category === "danger" || hasAnyToken(eventTokens, CRISIS_EVENT_TOKENS)) {
    return 8;
  }
  return 0;
}

function getMonthlyEventClarityDelta(
  outcome: MonthlyOutcomeBandId | undefined,
  thread: EventThreadProgress
): number {
  if (thread.stage === "resolved") {
    return 6;
  }
  if (outcome === "good" || outcome === "great") {
    return 4;
  }
  return 2;
}

function getMonthlyEventRiskDelta(
  event: MonthlyLifeEventDefinition,
  thread: EventThreadProgress,
  eventTokens: ReadonlySet<string>
): number {
  if (thread.stage === "crisis" || event.category === "danger" || hasAnyToken(eventTokens, CRISIS_EVENT_TOKENS)) {
    return 4;
  }
  return 0;
}

function buildTokenSet(values: readonly string[]): ReadonlySet<string> {
  const tokens = new Set<string>();
  for (const value of values) {
    addTokenVariants(tokens, value);
  }
  return tokens;
}

function addTokenVariants(tokens: Set<string>, value: string): void {
  const normalized = normalizeToken(value);
  if (normalized.length === 0) {
    return;
  }
  tokens.add(normalized);
  const parts = normalized.split(/[:_]+/).filter((part) => part.length > 0);
  for (const part of parts) {
    tokens.add(part);
  }
  for (let index = 0; index < parts.length; index += 1) {
    const suffix = parts.slice(index).join("_");
    if (suffix.length > 0) {
      tokens.add(suffix);
    }
  }
}

function countTokenIntersection(left: ReadonlySet<string>, right: ReadonlySet<string>): number {
  let count = 0;
  for (const token of left) {
    if (right.has(token) && token.length > 1) {
      count += 1;
    }
  }
  return count;
}

function hasAnyToken(tokens: ReadonlySet<string>, expected: ReadonlySet<string>): boolean {
  for (const token of expected) {
    if (tokens.has(token)) {
      return true;
    }
  }
  return false;
}

function publicUnique(values: readonly string[]): readonly string[] {
  return uniqueStable(values.map((value) => value.trim()).filter(isPublicSignal));
}

function isPublicSignal(value: string): boolean {
  const normalized = normalizeToken(value);
  return normalized.length > 0 &&
    !normalized.startsWith("hidden:") &&
    !normalized.startsWith("hidden_") &&
    !normalized.includes("internal_hidden") &&
    !normalized.includes("true_name") &&
    !normalized.includes("truename");
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

function getIfPresent<T>(read: () => T): T | undefined {
  try {
    return read();
  } catch {
    return undefined;
  }
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

function freezeArray<T>(entries: readonly T[]): readonly T[] {
  return Object.freeze([...entries]);
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
