import {
  loadLifeStorylineRegistry,
  type LifeStorylineRegistry
} from "../lifeStorylines/LifeStorylineRegistry";
import type { ChoiceContext } from "../types/major-life-choice-types.v0.1";
import type { MonthlyLifeLogEntry } from "../types/life-monthly-events-types.v0.1";
import type {
  EventThreadDefinition,
  EventThreadProgress,
  EventThreadStage,
  EventThreadStageDefinition,
  LifeStorylineState
} from "../types/life-storylines-types.v0.1";

export const MAJOR_CHOICE_STORYLINE_ADAPTER_SOURCE = "life_storylines_v0_1_major_choice_adapter";

export type StorylineMajorChoiceIntent = "advance" | "avoid" | "redirect" | "playInterlude" | "stageTransition";

export interface StorylineMajorChoiceHook {
  readonly id: string;
  readonly intent: StorylineMajorChoiceIntent;
  readonly sourceStorylineId: string;
  readonly sourceThreadId?: string;
  readonly hooks: readonly string[];
  readonly tags: readonly string[];
  readonly visibleHint: string;
}

export interface MajorChoiceSixMonthWindow {
  readonly monthStart: number;
  readonly monthEnd: number;
  readonly logIds: readonly string[];
  readonly hooks: readonly string[];
  readonly tags: readonly string[];
}

export interface MajorChoiceStorylineProjection {
  readonly choiceHooks: readonly StorylineMajorChoiceHook[];
  readonly recentSixMonthHooks: readonly string[];
  readonly interludeCandidateHooks: readonly string[];
  readonly transitionCandidateHooks: readonly string[];
  readonly visibleHints: readonly string[];
  readonly sixMonthWindow: MajorChoiceSixMonthWindow;
  readonly debug: {
    readonly source: typeof MAJOR_CHOICE_STORYLINE_ADAPTER_SOURCE;
    readonly activeStorylineIds: readonly string[];
    readonly activeThreadIds: readonly string[];
    readonly signalTags: readonly string[];
  };
}

export interface MajorChoiceStorylineProjectionInput {
  readonly lifeStorylineState: LifeStorylineState;
  readonly recentMonthlyLogs?: readonly MonthlyLifeLogEntry[];
  readonly ageMonths?: number;
  readonly registry?: LifeStorylineRegistry;
}

export interface MajorChoiceStorylineAppendOptions {
  readonly registry?: LifeStorylineRegistry;
}

type ProjectionOrState = MajorChoiceStorylineProjection | LifeStorylineState | undefined;

const THREAD_STAGE_TO_DATA_STAGES: Readonly<Record<EventThreadStage, readonly EventThreadStageDefinition["stage"][]>> = {
  notStarted: [],
  seeded: ["seed"],
  hinted: ["omen"],
  developing: ["development"],
  crisis: ["crisis"],
  resolved: ["resolution"],
  failed: ["crisis"],
  dormant: []
};

const INTENT_ORDER: Readonly<Record<StorylineMajorChoiceIntent, number>> = {
  advance: 0,
  avoid: 1,
  redirect: 2,
  playInterlude: 3,
  stageTransition: 4
};

const AVOID_TOKENS = new Set([
  "avoid",
  "escape",
  "beg",
  "help",
  "resist",
  "rest",
  "hide",
  "burn",
  "destroy",
  "prepare",
  "risk",
  "forbidden"
]);

export function createMajorChoiceStorylineProjection(
  input: MajorChoiceStorylineProjectionInput
): MajorChoiceStorylineProjection {
  const registry = input.registry ?? loadLifeStorylineRegistry();
  const sixMonthWindow = createSixMonthWindow(input.recentMonthlyLogs ?? [], input.ageMonths);
  const choiceHooks: StorylineMajorChoiceHook[] = [];
  const visibleHints: string[] = [];
  const interludeCandidateHooks: string[] = [...input.lifeStorylineState.playInterludeCandidateHooks];
  const transitionCandidateHooks: string[] = [...input.lifeStorylineState.transitionCandidateHooks];
  const signalTags: string[] = [
    ...sixMonthWindow.hooks,
    ...sixMonthWindow.tags
  ];

  const activeStorylines = input.lifeStorylineState.activeStorylines.filter((storyline) => storyline.status !== "dormant");
  const activeStorylineIds = activeStorylines.map((storyline) => storyline.storylineId);
  const activeThreadIds = input.lifeStorylineState.eventThreads.map((thread) => thread.threadId);

  for (const storyline of activeStorylines) {
    signalTags.push(storyline.storylineId, `storyline:${storyline.storylineId}`, ...storyline.tags);
  }

  for (const thread of input.lifeStorylineState.eventThreads) {
    const definition = getIfPresent(() => registry.getThread(thread.threadId));
    if (definition === undefined) {
      continue;
    }
    const matchingStages = getMatchingStageDefinitions(thread, definition);
    const threadHints = matchingStages.flatMap((stage) => stage.visibleNarrativeHints).filter(isPublicText);
    const visibleHint = threadHints[0] ?? "A life thread is ready for a major choice.";
    visibleHints.push(...threadHints);
    signalTags.push(
      thread.threadId,
      thread.storylineId,
      thread.stage,
      `thread:${thread.threadId}`,
      `storyline:${thread.storylineId}`,
      ...definition.threadTags,
      ...matchingStages.flatMap((stage) => stage.majorChoiceTags)
    );

    for (const id of definition.majorChoiceHooks) {
      pushHook(choiceHooks, {
        id,
        intent: "advance",
        sourceStorylineId: thread.storylineId,
        sourceThreadId: thread.threadId,
        hooks: [id],
        tags: buildThreadTags(thread, definition, matchingStages),
        visibleHint
      });
    }

    for (const id of matchingStages.flatMap((stage) => stage.majorChoiceTags)) {
      pushHook(choiceHooks, {
        id,
        intent: getStageChoiceIntent(id, thread.stage),
        sourceStorylineId: thread.storylineId,
        sourceThreadId: thread.threadId,
        hooks: [id],
        tags: buildThreadTags(thread, definition, matchingStages),
        visibleHint
      });
    }

    if (shouldExposeThreadInterludes(thread)) {
      interludeCandidateHooks.push(...definition.playInterludeHooks);
    }

    for (const id of definition.playInterludeHooks) {
      if (shouldExposeThreadInterludes(thread) || input.lifeStorylineState.playInterludeCandidateHooks.includes(id)) {
        pushHook(choiceHooks, {
          id,
          intent: "playInterlude",
          sourceStorylineId: thread.storylineId,
          sourceThreadId: thread.threadId,
          hooks: [id],
          tags: buildThreadTags(thread, definition, matchingStages),
          visibleHint
        });
      }
    }

    if (thread.stage === "resolved") {
      transitionCandidateHooks.push(...definition.resolutionHooks);
      for (const id of definition.resolutionHooks) {
        pushHook(choiceHooks, {
          id,
          intent: "stageTransition",
          sourceStorylineId: thread.storylineId,
          sourceThreadId: thread.threadId,
          hooks: [id],
          tags: buildThreadTags(thread, definition, matchingStages),
          visibleHint
        });
      }
    }

    if (thread.stage === "failed") {
      transitionCandidateHooks.push(...definition.failureHooks);
      for (const id of definition.failureHooks) {
        pushHook(choiceHooks, {
          id,
          intent: "stageTransition",
          sourceStorylineId: thread.storylineId,
          sourceThreadId: thread.threadId,
          hooks: [id],
          tags: buildThreadTags(thread, definition, matchingStages),
          visibleHint
        });
      }
    }
  }

  for (const storyline of activeStorylines.slice(1)) {
    pushHook(choiceHooks, {
      id: `redirect:${storyline.storylineId}`,
      intent: "redirect",
      sourceStorylineId: storyline.storylineId,
      hooks: [`redirect:${storyline.storylineId}`],
      tags: storyline.tags,
      visibleHint: "Another life thread is also pulling at this half-year choice."
    });
  }

  for (const hook of input.lifeStorylineState.recentHooks) {
    signalTags.push(hook.id, ...hook.tags);
  }

  const sortedChoiceHooks = [...uniqueChoiceHooks(choiceHooks)]
    .sort(compareChoiceHooks)
    .map((hook: StorylineMajorChoiceHook) => deepFreeze({
      ...hook,
      hooks: freezeArray(publicUnique(hook.hooks)),
      tags: freezeArray(publicUnique(hook.tags))
    }));

  const projection = {
    choiceHooks: freezeArray(sortedChoiceHooks),
    recentSixMonthHooks: freezeArray(publicUnique(sixMonthWindow.hooks)),
    interludeCandidateHooks: freezeArray(publicUnique(interludeCandidateHooks)),
    transitionCandidateHooks: freezeArray(publicUnique(transitionCandidateHooks)),
    visibleHints: freezeArray(publicUniqueText(visibleHints)),
    sixMonthWindow: deepFreeze({
      monthStart: sixMonthWindow.monthStart,
      monthEnd: sixMonthWindow.monthEnd,
      logIds: freezeArray(publicUnique(sixMonthWindow.logIds)),
      hooks: freezeArray(publicUnique(sixMonthWindow.hooks)),
      tags: freezeArray(publicUnique(sixMonthWindow.tags))
    }),
    debug: deepFreeze({
      source: MAJOR_CHOICE_STORYLINE_ADAPTER_SOURCE,
      activeStorylineIds: freezeArray(publicUnique(activeStorylineIds)),
      activeThreadIds: freezeArray(publicUnique(activeThreadIds)),
      signalTags: freezeArray(publicUnique([
        ...signalTags,
        ...sortedChoiceHooks.flatMap((hook) => [hook.id, ...hook.hooks, ...hook.tags]),
        ...interludeCandidateHooks,
        ...transitionCandidateHooks
      ]))
    })
  } satisfies MajorChoiceStorylineProjection;

  return deepFreeze(projection);
}

export function appendStorylineHooksToChoiceContext(
  context: ChoiceContext,
  projectionOrState?: ProjectionOrState,
  options: MajorChoiceStorylineAppendOptions = {}
): ChoiceContext {
  const projection = resolveProjection(projectionOrState, context.ageMonths, options);
  if (projection === undefined) {
    return context;
  }

  return deepFreeze({
    ...context,
    recentHooks: freezeArray(publicUnique([
      ...context.recentHooks,
      ...projection.recentSixMonthHooks,
      ...projection.choiceHooks.flatMap((hook) => [hook.id, ...hook.hooks]),
      ...projection.interludeCandidateHooks,
      ...projection.transitionCandidateHooks
    ]))
  });
}

function createSixMonthWindow(
  logs: readonly MonthlyLifeLogEntry[],
  ageMonths: number | undefined
): MajorChoiceSixMonthWindow {
  const monthEnd = ageMonths ?? logs.reduce((max, log) => Math.max(max, log.ageMonth), 0);
  const monthStart = Math.max(0, monthEnd - 5);
  const inWindow = logs
    .filter((log) => log.ageMonth >= monthStart && log.ageMonth <= monthEnd)
    .sort((left, right) => left.ageMonth - right.ageMonth || left.eventId.localeCompare(right.eventId));

  return deepFreeze({
    monthStart,
    monthEnd,
    logIds: freezeArray(publicUnique(inWindow.map((log) => log.eventId))),
    hooks: freezeArray(publicUnique(inWindow.flatMap((log) => log.hooks))),
    tags: freezeArray(publicUnique(inWindow.flatMap((log) => log.tags)))
  });
}

function resolveProjection(
  projectionOrState: ProjectionOrState,
  ageMonths: number,
  options: MajorChoiceStorylineAppendOptions
): MajorChoiceStorylineProjection | undefined {
  if (projectionOrState === undefined) {
    return undefined;
  }
  if ("choiceHooks" in projectionOrState) {
    return projectionOrState;
  }
  const input: MajorChoiceStorylineProjectionInput = {
    lifeStorylineState: projectionOrState,
    ageMonths
  };
  return options.registry === undefined
    ? createMajorChoiceStorylineProjection(input)
    : createMajorChoiceStorylineProjection({ ...input, registry: options.registry });
}

function getMatchingStageDefinitions(
  thread: EventThreadProgress,
  definition: EventThreadDefinition
): readonly EventThreadStageDefinition[] {
  const stageIds = THREAD_STAGE_TO_DATA_STAGES[thread.stage];
  const candidateStageIds = thread.stage === "developing" ? [...stageIds, "crisis"] : stageIds;
  return definition.stageSequence.filter((stage) => candidateStageIds.includes(stage.stage));
}

function buildThreadTags(
  thread: EventThreadProgress,
  definition: EventThreadDefinition,
  matchingStages: readonly EventThreadStageDefinition[]
): readonly string[] {
  return publicUnique([
    thread.threadId,
    thread.storylineId,
    thread.stage,
    `thread:${thread.threadId}`,
    `storyline:${thread.storylineId}`,
    ...definition.threadTags,
    ...definition.majorChoiceHooks,
    ...definition.playInterludeHooks,
    ...matchingStages.flatMap((stage) => stage.majorChoiceTags)
  ]);
}

function getStageChoiceIntent(
  id: string,
  stage: EventThreadStage
): StorylineMajorChoiceIntent {
  if (stage === "crisis" || stage === "failed" || containsAnyToken(id, AVOID_TOKENS)) {
    return "avoid";
  }
  return "advance";
}

function shouldExposeThreadInterludes(thread: EventThreadProgress): boolean {
  return thread.stage === "crisis" || thread.tension >= 70 || thread.risk >= 70 || thread.stage === "developing";
}

function pushHook(
  hooks: StorylineMajorChoiceHook[],
  hook: StorylineMajorChoiceHook
): void {
  if (!isPublicSignal(hook.id) || !isPublicSignal(hook.sourceStorylineId)) {
    return;
  }
  const sourceThreadId = hook.sourceThreadId;
  const safeHook = {
    id: hook.id.trim(),
    intent: hook.intent,
    sourceStorylineId: hook.sourceStorylineId.trim(),
    ...(sourceThreadId === undefined || !isPublicSignal(sourceThreadId) ? {} : { sourceThreadId: sourceThreadId.trim() }),
    hooks: freezeArray(publicUnique(hook.hooks)),
    tags: freezeArray(publicUnique(hook.tags)),
    visibleHint: isPublicText(hook.visibleHint) ? hook.visibleHint : "A life thread is ready for a major choice."
  } satisfies StorylineMajorChoiceHook;
  hooks.push(deepFreeze(safeHook));
}

function uniqueChoiceHooks(hooks: readonly StorylineMajorChoiceHook[]): readonly StorylineMajorChoiceHook[] {
  const byKey = new Map<string, StorylineMajorChoiceHook>();
  for (const hook of hooks) {
    byKey.set(`${hook.intent}:${hook.sourceStorylineId}:${hook.sourceThreadId ?? ""}:${hook.id}`, hook);
  }
  return [...byKey.values()];
}

function compareChoiceHooks(left: StorylineMajorChoiceHook, right: StorylineMajorChoiceHook): number {
  return INTENT_ORDER[left.intent] - INTENT_ORDER[right.intent] ||
    left.sourceStorylineId.localeCompare(right.sourceStorylineId) ||
    (left.sourceThreadId ?? "").localeCompare(right.sourceThreadId ?? "") ||
    left.id.localeCompare(right.id);
}

function containsAnyToken(value: string, expected: ReadonlySet<string>): boolean {
  const tokens = normalizeToken(value).split(/[:_]+/).filter((token) => token.length > 0);
  return tokens.some((token) => expected.has(token));
}

function publicUnique(values: readonly string[]): readonly string[] {
  return uniqueStable(values.map((value) => value.trim()).filter(isPublicSignal));
}

function publicUniqueText(values: readonly string[]): readonly string[] {
  return uniqueStable(values.map((value) => value.trim()).filter(isPublicText));
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

function isPublicText(value: string): boolean {
  const normalized = normalizeToken(value);
  return value.trim().length > 0 &&
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
