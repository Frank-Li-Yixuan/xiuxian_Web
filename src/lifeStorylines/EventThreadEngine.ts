import {
  loadLifeStorylineRegistry,
  type LifeStorylineRegistry
} from "./LifeStorylineRegistry";
import type {
  EventThreadAdvanceHook,
  EventThreadDefinition,
  EventThreadInitializeInput,
  EventThreadProgress,
  EventThreadStage,
  LifeStorylineState,
  StorylineHook,
  StorylineProgress,
  StorylineSignalRule
} from "../types/life-storylines-types.v0.1";

export const EVENT_THREAD_ENGINE_SOURCE = "life_storylines_v0_1_event_thread_engine";

export interface EventThreadEngineContext {
  readonly registry?: LifeStorylineRegistry;
}

type ScoreBreakdownEntry = { readonly source: string; readonly weight: number; readonly note?: string };

interface SignalContext {
  readonly tokenSet: ReadonlySet<string>;
  readonly publicTags: readonly string[];
}

interface ThreadSelectionCandidate {
  readonly thread: EventThreadDefinition;
  readonly score: number;
  readonly breakdown: readonly ScoreBreakdownEntry[];
}

const THREADS_BY_STATUS: Readonly<Record<StorylineProgress["status"], number>> = {
  dormant: 0,
  hinted: 1,
  active: 1,
  dominant: 2,
  fated: 2
};

const INITIAL_METERS_BY_STATUS: Readonly<Record<StorylineProgress["status"], Omit<EventThreadProgress, "threadId" | "storylineId" | "flags">>> = {
  dormant: { stage: "notStarted", progress: 0, tension: 0, clarity: 0, risk: 0 },
  hinted: { stage: "hinted", progress: 20, tension: 0, clarity: 0, risk: 0 },
  active: { stage: "developing", progress: 40, tension: 0, clarity: 0, risk: 0 },
  dominant: { stage: "developing", progress: 55, tension: 15, clarity: 10, risk: 0 },
  fated: { stage: "developing", progress: 65, tension: 20, clarity: 15, risk: 0 }
};

const SPECIFICITY_SIGNAL_SOURCES = new Set<StorylineSignalRule["source"]>(["hiddenFate", "carriedItem"]);
const SPECIFICITY_BONUS = 18;
const THREAD_TAG_MATCH_WEIGHT = 4;
const AGE_RANGE_MATCH_WEIGHT = 6;

export class EventThreadEngine {
  private readonly registry: LifeStorylineRegistry;

  constructor(context: EventThreadEngineContext = {}) {
    this.registry = context.registry ?? loadLifeStorylineRegistry();
  }

  initializeThreads(input: EventThreadInitializeInput): LifeStorylineState {
    const ageMonths = input.ageMonths ?? 0;
    const signals = buildSignalContext(input.signalTags ?? []);
    const activeStorylines = freezeArray(
      input.activeStorylines
        .filter((storyline) => storyline.status !== "dormant")
        .map((storyline) => ({ ...storyline, tags: freezeArray([...storyline.tags]) }))
    );
    const storylineScores = freezeArray(
      (input.storylineScores ?? input.activeStorylines)
        .map((storyline) => ({ ...storyline, tags: freezeArray([...storyline.tags]) }))
    );
    const downstreamActiveStorylineIds = freezeArray(uniqueStable(
      (input.downstreamActiveStorylineIds ?? activeStorylines.map((storyline) => storyline.storylineId))
        .filter((storylineId) => activeStorylines.some((storyline) => storyline.storylineId === storylineId))
    ));
    const threadSourceStorylines = downstreamActiveStorylineIds.length === 0
      ? activeStorylines
      : activeStorylines.filter((storyline) => downstreamActiveStorylineIds.includes(storyline.storylineId));
    const selectedThreads: EventThreadProgress[] = [];
    const scoreBreakdownByStoryline: Record<string, ScoreBreakdownEntry[]> = {
      [EVENT_THREAD_ENGINE_SOURCE]: []
    };

    for (const storyline of threadSourceStorylines) {
      const candidates = this.registry
        .listThreadsByStoryline(storyline.storylineId)
        .map((thread) => scoreThreadCandidate(thread, input, signals.tokenSet, ageMonths))
        .sort(compareThreadCandidates);
      const count = THREADS_BY_STATUS[storyline.status];
      for (const candidate of candidates.slice(0, count)) {
        selectedThreads.push(createInitialThreadProgress(candidate.thread, storyline, ageMonths));
        scoreBreakdownByStoryline[candidate.thread.id] = [...candidate.breakdown];
        scoreBreakdownByStoryline[EVENT_THREAD_ENGINE_SOURCE]?.push({
          source: `selected:${candidate.thread.id}`,
          weight: candidate.score,
          note: storyline.storylineId
        });
      }
    }

    return this.buildState({
      storylineScores,
      activeStorylines,
      downstreamActiveStorylineIds,
      eventThreads: selectedThreads,
      recentHooks: sanitizeHooks(input.recentHooks ?? []),
      publicSignalTags: signals.publicTags,
      scoreBreakdownByStoryline
    });
  }

  advanceThreadByHook(thread: EventThreadProgress, hook: EventThreadAdvanceHook): EventThreadProgress {
    if (thread.threadId !== hook.threadId) {
      throw new Error(`Event thread hook ${hook.id} targets ${hook.threadId}, not ${thread.threadId}`);
    }
    const next = {
      ...thread,
      progress: clampMeter(thread.progress + (hook.progressDelta ?? 0)),
      tension: clampMeter(thread.tension + (hook.tensionDelta ?? 0)),
      clarity: clampMeter(thread.clarity + (hook.clarityDelta ?? 0)),
      risk: clampMeter(thread.risk + (hook.riskDelta ?? 0)),
      flags: deepFreeze({
        ...thread.flags,
        lastHookId: hook.id
      }),
      ...(hook.occurredAtMonth === undefined ? {} : { lastEventMonth: hook.occurredAtMonth })
    };
    return deepFreeze({
      ...next,
      stage: deriveThreadStage(next)
    });
  }

  advanceStateByHook(state: LifeStorylineState, hook: EventThreadAdvanceHook): LifeStorylineState {
    let matchedThread: EventThreadProgress | undefined;
    const eventThreads = state.eventThreads.map((thread) => {
      if (thread.threadId !== hook.threadId) {
        return thread;
      }
      matchedThread = this.advanceThreadByHook(thread, hook);
      return matchedThread;
    });
    if (matchedThread === undefined) {
      throw new Error(`Missing initialized event thread for hook ${hook.id}: ${hook.threadId}`);
    }

    return this.buildState({
      storylineScores: state.storylineScores,
      activeStorylines: state.activeStorylines,
      downstreamActiveStorylineIds: state.downstreamActiveStorylineIds,
      eventThreads,
      recentHooks: [
        ...sanitizeHooks(state.recentHooks),
        sanitizeHook({
          id: hook.id,
          sourceStorylineId: matchedThread.storylineId,
          sourceThreadId: matchedThread.threadId,
          weight: hook.weight ?? 1,
          tags: hook.tags ?? [],
          visibility: hook.visibility ?? "visible"
        })
      ],
      publicSignalTags: state.debug?.signalTags ?? [],
      scoreBreakdownByStoryline: state.debug?.scoreBreakdownByStoryline ?? {
        [EVENT_THREAD_ENGINE_SOURCE]: []
      }
    });
  }

  private buildState(input: {
    readonly storylineScores: readonly StorylineProgress[];
    readonly activeStorylines: readonly StorylineProgress[];
    readonly downstreamActiveStorylineIds: readonly string[];
    readonly eventThreads: readonly EventThreadProgress[];
    readonly recentHooks: readonly StorylineHook[];
    readonly publicSignalTags: readonly string[];
    readonly scoreBreakdownByStoryline: LifeStorylineState["debug"] extends infer T
      ? T extends { readonly scoreBreakdownByStoryline: infer B }
        ? B
        : Readonly<Record<string, readonly ScoreBreakdownEntry[]>>
      : Readonly<Record<string, readonly ScoreBreakdownEntry[]>>;
  }): LifeStorylineState {
    const eventThreads = freezeArray(input.eventThreads.map((thread) => deepFreeze({
      ...thread,
      flags: { ...thread.flags }
    })));
    const activeStorylines = freezeArray(input.activeStorylines.map((storyline) => deepFreeze({
      ...storyline,
      tags: [...storyline.tags]
    })));
    const storylineScores = freezeArray(input.storylineScores.map((storyline) => deepFreeze({
      ...storyline,
      tags: [...storyline.tags]
    })));
    const transitionCandidateHooks = buildTransitionCandidateHooks(activeStorylines, eventThreads, this.registry);
    const playInterludeCandidateHooks = buildPlayInterludeCandidateHooks(eventThreads, this.registry);
    const recentHooks = freezeArray(input.recentHooks.map(sanitizeHook));
    return deepFreeze({
      storylineScores,
      activeStorylines,
      downstreamActiveStorylineIds: freezeArray([...input.downstreamActiveStorylineIds]),
      eventThreads,
      threadSummaries: freezeArray(eventThreads.map(toThreadSummary)),
      recentHooks,
      recentStorylineHooks: recentHooks,
      transitionCandidateHooks,
      playInterludeCandidateHooks,
      interludeCandidateSeeds: freezeArray([...playInterludeCandidateHooks]),
      stageTransitionSignals: freezeArray([...transitionCandidateHooks]),
      debug: {
        source: EVENT_THREAD_ENGINE_SOURCE,
        scoreBreakdownByStoryline: deepFreeze(cloneBreakdown(input.scoreBreakdownByStoryline)),
        selectedThreads: eventThreads.map((thread) => thread.threadId),
        suppressedStorylines: [],
        signalTags: input.publicSignalTags.filter(isPublicTag)
      }
    });
  }
}

function scoreThreadCandidate(
  thread: EventThreadDefinition,
  input: EventThreadInitializeInput,
  tokenSet: ReadonlySet<string>,
  ageMonths: number
): ThreadSelectionCandidate {
  const breakdown: ScoreBreakdownEntry[] = [];
  for (const signal of thread.triggerSignals) {
    const weight = getSignalWeight(signal, input.statValues ?? {}, tokenSet);
    if (weight > 0) {
      breakdown.push({
        source: signal.source,
        weight,
        ...(signal.note === undefined ? {} : { note: signal.note })
      });
      if (SPECIFICITY_SIGNAL_SOURCES.has(signal.source)) {
        breakdown.push({
          source: `${signal.source}:specificity`,
          weight: SPECIFICITY_BONUS
        });
      }
    }
  }
  const threadTagWeight = thread.threadTags.reduce((sum, tag) =>
    sum + (tokenSet.has(normalizeToken(tag)) ? THREAD_TAG_MATCH_WEIGHT : 0), 0);
  if (threadTagWeight > 0) {
    breakdown.push({ source: "threadTags", weight: threadTagWeight });
  }
  if (thread.stageSequence.some((stage) => ageMonths >= stage.recommendedAgeRange[0] && ageMonths <= stage.recommendedAgeRange[1])) {
    breakdown.push({ source: "ageRangeAffinity", weight: AGE_RANGE_MATCH_WEIGHT });
  }
  return {
    thread,
    score: breakdown.reduce((sum, entry) => sum + entry.weight, 0),
    breakdown
  };
}

function getSignalWeight(
  signal: StorylineSignalRule,
  statValues: Readonly<Record<string, number>>,
  tokenSet: ReadonlySet<string>
): number {
  if (signal.stat !== undefined) {
    const value = statValues[signal.stat];
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
  return signal.tag !== undefined && tokenSet.has(normalizeToken(signal.tag)) ? signal.weight : 0;
}

function compareThreadCandidates(left: ThreadSelectionCandidate, right: ThreadSelectionCandidate): number {
  return right.score - left.score || left.thread.id.localeCompare(right.thread.id);
}

function createInitialThreadProgress(
  thread: EventThreadDefinition,
  storyline: StorylineProgress,
  ageMonths: number
): EventThreadProgress {
  const meters = INITIAL_METERS_BY_STATUS[storyline.status];
  return deepFreeze({
    threadId: thread.id,
    storylineId: thread.storylineId,
    stage: meters.stage,
    progress: clampMeter(meters.progress),
    tension: clampMeter(meters.tension),
    clarity: clampMeter(meters.clarity),
    risk: clampMeter(meters.risk),
    flags: {
      initializedAtMonth: ageMonths,
      initializedFromStorylineStatus: storyline.status,
      source: EVENT_THREAD_ENGINE_SOURCE
    }
  });
}

function toThreadSummary(thread: EventThreadProgress) {
  return deepFreeze({
    threadId: thread.threadId,
    storylineId: thread.storylineId,
    stage: thread.stage,
    progress: thread.progress,
    tension: thread.tension,
    clarity: thread.clarity,
    risk: thread.risk
  });
}

function deriveThreadStage(thread: Pick<EventThreadProgress, "progress" | "tension" | "clarity" | "risk">): EventThreadStage {
  if (thread.risk >= 90) {
    return "failed";
  }
  if (thread.progress >= 85 && thread.clarity >= 60) {
    return "resolved";
  }
  if (thread.tension >= 70 || thread.risk >= 70) {
    return "crisis";
  }
  if (thread.progress >= 40) {
    return "developing";
  }
  if (thread.progress >= 20) {
    return "hinted";
  }
  if (thread.progress >= 1) {
    return "seeded";
  }
  return "notStarted";
}

function buildPlayInterludeCandidateHooks(
  threads: readonly EventThreadProgress[],
  registry: LifeStorylineRegistry
): readonly string[] {
  return uniqueStable(
    threads.flatMap((thread) =>
      thread.stage === "crisis" && thread.tension >= 70
        ? registry.getThread(thread.threadId).playInterludeHooks
        : []
    )
  );
}

function buildTransitionCandidateHooks(
  activeStorylines: readonly StorylineProgress[],
  threads: readonly EventThreadProgress[],
  registry: LifeStorylineRegistry
): readonly string[] {
  const ageMonths = getStateAgeMonths(activeStorylines, threads);
  return uniqueStable([
    ...threads.flatMap((thread) => {
      const definition = registry.getThread(thread.threadId);
      if (thread.stage === "resolved") {
        return definition.resolutionHooks;
      }
      if (thread.stage === "failed") {
        return definition.failureHooks;
      }
      return [];
    }),
    ...activeStorylines.flatMap((storyline) =>
      storyline.status === "fated" && ageMonths >= 168
        ? registry.getStoryline(storyline.storylineId).possibleTransitionHooks
        : []
    )
  ]);
}

function getStateAgeMonths(
  activeStorylines: readonly StorylineProgress[],
  threads: readonly EventThreadProgress[]
): number {
  const threadMonths = threads.flatMap((thread) => [
    toFiniteNumber(thread.flags.initializedAtMonth),
    toFiniteNumber(thread.lastEventMonth)
  ]);
  const storylineMonths = activeStorylines.map((storyline) => toFiniteNumber(storyline.lastUpdatedMonth));
  return Math.max(0, ...threadMonths, ...storylineMonths);
}

function sanitizeHooks(hooks: readonly StorylineHook[]): readonly StorylineHook[] {
  return hooks.map(sanitizeHook).filter((hook) => hook.tags.length > 0 || hook.visibility === "visible");
}

function sanitizeHook(hook: StorylineHook): StorylineHook {
  return deepFreeze({
    ...hook,
    tags: freezeArray(hook.tags.filter(isPublicTag)),
    visibility: hook.visibility === "hidden" || hook.visibility === "debugOnly" ? "debugOnly" : "visible"
  });
}

function buildSignalContext(signalTags: readonly string[]): SignalContext {
  const tokenSet = new Set<string>();
  for (const tag of signalTags) {
    addTokenVariants(tokenSet, tag);
    for (const alias of getTokenAliases(tag)) {
      addTokenVariants(tokenSet, alias);
    }
  }
  return {
    tokenSet,
    publicTags: uniqueStable(signalTags.filter(isPublicTag))
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

function getTokenAliases(value: string): readonly string[] {
  const normalized = value.trim();
  const aliases: string[] = [];
  if (normalized.startsWith("destiny_")) {
    aliases.push(`destiny:${normalized.slice("destiny_".length)}`);
  }
  if (normalized.startsWith("hidden_")) {
    aliases.push(`hidden:${normalized.slice("hidden_".length)}`);
  }
  if (normalized.startsWith("item_")) {
    aliases.push(`item:${normalized.slice("item_".length)}`);
  }
  if (normalized.startsWith("origin_")) {
    aliases.push(`origin:${normalized.slice("origin_".length)}`);
  }
  for (const prefix of ["destiny", "hidden", "item", "origin"] as const) {
    if (normalized.startsWith(`${prefix}:`)) {
      aliases.push(`${prefix}_${normalized.slice(prefix.length + 1)}`);
    }
  }
  return aliases;
}

function isPublicTag(tag: string): boolean {
  const normalized = normalizeToken(tag);
  return normalized.length > 0 &&
    !normalized.startsWith("hidden:") &&
    !normalized.startsWith("hidden_") &&
    !normalized.includes("internal_hidden") &&
    !normalized.includes("truename") &&
    !normalized.includes("true_name");
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

function cloneBreakdown(
  breakdown: Readonly<Record<string, readonly ScoreBreakdownEntry[]>>
): Readonly<Record<string, readonly ScoreBreakdownEntry[]>> {
  return Object.fromEntries(
    Object.entries(breakdown).map(([id, entries]) => [
      id,
      freezeArray(entries.map((entry) => ({ ...entry })))
    ])
  );
}

function toFiniteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function clampMeter(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.trunc(Math.min(100, Math.max(0, value)));
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
