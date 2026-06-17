import {
  loadLifeStorylineRegistry,
  type LifeStorylineRegistry
} from "../lifeStorylines/LifeStorylineRegistry";
import type { MajorChoiceStorylineProjection } from "../lifeSimulation/MajorChoiceStorylineAdapter";
import type {
  LifeInterludeHistoryEntry,
  LifeInterludeTriggerContext
} from "../types/life-interlude-types.v0.1";
import type {
  EventThreadDefinition,
  EventThreadProgress,
  LifeStorylineState,
  StorylineProgress
} from "../types/life-storylines-types.v0.1";

export interface CreateLifeInterludeTriggerContextFromStorylinesInput {
  readonly lifeStorylineState: LifeStorylineState;
  readonly majorChoiceProjection?: MajorChoiceStorylineProjection;
  readonly ageMonth?: number;
  readonly phaseId?: string;
  readonly recentMonthlyEventIds?: readonly string[];
  readonly recentHooks?: readonly string[];
  readonly rootTags?: readonly string[];
  readonly destinyTags?: readonly string[];
  readonly originTags?: readonly string[];
  readonly itemTags?: readonly string[];
  readonly openingTags?: readonly string[];
  readonly currentWoundIds?: readonly string[];
  readonly currentHeartKnotIds?: readonly string[];
  readonly merit?: number;
  readonly karma?: number;
  readonly recentInterludesLast24Months?: number;
  readonly interludeHistory?: readonly LifeInterludeHistoryEntry[];
  readonly registry?: LifeStorylineRegistry;
}

const PLAY_INTERLUDE_HOOK_ALIASES: Readonly<Record<string, readonly string[]>> = {
  play_horde_guard_medicine_field: ["wild_ginseng_field"],
  play_stg_outer_battlefield_dream: ["system_static"],
  play_stg_escape_bandit_chase: ["thunderstorm_omen"],
  play_stg_beast_chase: ["thunderstorm_omen"]
};

export function createLifeInterludeTriggerContextFromStorylines(
  input: CreateLifeInterludeTriggerContextFromStorylinesInput
): LifeInterludeTriggerContext {
  const registry = input.registry ?? loadLifeStorylineRegistry();
  const downstreamStorylines = getDownstreamStorylines(input.lifeStorylineState);
  const downstreamStorylineIds = new Set(downstreamStorylines.map((storyline) => storyline.storylineId));
  const activeThreads = getDownstreamThreads(input.lifeStorylineState, downstreamStorylineIds);
  const threadDefinitions = activeThreads.flatMap((thread) => getIfPresent(() => registry.getThread(thread.threadId)) ?? []);
  const majorChoiceProjection = input.majorChoiceProjection;
  const storylineTags = buildStorylineTags(downstreamStorylines, registry);
  const threadTags = buildThreadTags(activeThreads, threadDefinitions);
  const recentHookCandidates = [
    ...(input.recentHooks ?? []),
    ...input.lifeStorylineState.recentHooks.flatMap((hook) => [hook.id, ...hook.tags]),
    ...input.lifeStorylineState.recentStorylineHooks.flatMap((hook) => [hook.id, ...hook.tags]),
    ...input.lifeStorylineState.interludeCandidateSeeds,
    ...input.lifeStorylineState.playInterludeCandidateHooks,
    ...input.lifeStorylineState.transitionCandidateHooks,
    ...input.lifeStorylineState.stageTransitionSignals,
    ...activeThreads.flatMap((thread) => [thread.threadId, thread.stage]),
    ...threadDefinitions.flatMap((definition) => [
      ...definition.monthlyEventHooks,
      ...definition.majorChoiceHooks,
      ...definition.playInterludeHooks
    ]),
    ...(majorChoiceProjection?.recentSixMonthHooks ?? []),
    ...(majorChoiceProjection?.interludeCandidateHooks ?? []),
    ...(majorChoiceProjection?.transitionCandidateHooks ?? []),
    ...(majorChoiceProjection?.choiceHooks.flatMap((hook) => [hook.id, ...hook.hooks, ...hook.tags]) ?? [])
  ];
  const recentHooks = publicUnique([
    ...recentHookCandidates,
    ...recentHookCandidates.flatMap(toPlayInterludeAliases)
  ]);

  return deepFreeze({
    ageMonth: input.ageMonth ?? 0,
    phaseId: input.phaseId ?? "infancy",
    recentMonthlyEventIds: freezeArray(publicUnique(input.recentMonthlyEventIds ?? [])),
    recentHooks: freezeArray(recentHooks),
    activeStorylineTags: freezeArray(storylineTags),
    activeThreadTags: freezeArray(threadTags),
    openingTags: freezeArray(publicUnique(input.openingTags ?? [])),
    destinyTags: freezeArray(publicUnique(input.destinyTags ?? [])),
    rootTags: freezeArray(publicUnique(input.rootTags ?? [])),
    originTags: freezeArray(publicUnique(input.originTags ?? [])),
    itemTags: freezeArray(publicUnique(input.itemTags ?? [])),
    currentWoundIds: freezeArray(publicUnique(input.currentWoundIds ?? [])),
    currentHeartKnotIds: freezeArray(publicUnique(input.currentHeartKnotIds ?? [])),
    merit: input.merit ?? 0,
    karma: input.karma ?? 0,
    recentInterludesLast24Months: input.recentInterludesLast24Months ?? 0,
    interludeHistory: freezeArray((input.interludeHistory ?? []).map((entry) => deepFreeze({ ...entry })))
  });
}

function getDownstreamStorylines(state: LifeStorylineState): readonly StorylineProgress[] {
  const downstreamIds = new Set(state.downstreamActiveStorylineIds ?? []);
  const source = downstreamIds.size === 0
    ? state.activeStorylines
    : state.activeStorylines.filter((storyline) => downstreamIds.has(storyline.storylineId));
  return source.filter((storyline) => storyline.status !== "dormant");
}

function getDownstreamThreads(
  state: LifeStorylineState,
  downstreamStorylineIds: ReadonlySet<string>
): readonly EventThreadProgress[] {
  if (downstreamStorylineIds.size === 0) {
    return state.eventThreads;
  }
  return state.eventThreads.filter((thread) => downstreamStorylineIds.has(thread.storylineId));
}

function buildStorylineTags(
  storylines: readonly StorylineProgress[],
  registry: LifeStorylineRegistry
): readonly string[] {
  const tags: string[] = [];
  for (const storyline of storylines) {
    tags.push(storyline.storylineId, `storyline:${storyline.storylineId}`, ...storyline.tags);
    for (const tag of storyline.tags) {
      if (!tag.includes(":")) {
        tags.push(`storyline:${tag}`);
      }
    }
    const definition = getIfPresent(() => registry.getStoryline(storyline.storylineId));
    if (definition !== undefined) {
      tags.push(
        ...definition.themeTags,
        ...definition.themeTags.map((tag) => `storyline:${tag}`),
        ...definition.worldContextTags,
        ...definition.playInterludeAffinities.map((affinity) => affinity.hook),
        ...definition.possibleTransitionHooks,
        ...definition.possibleAge18Hooks
      );
    }
  }
  return publicUnique(tags);
}

function buildThreadTags(
  threads: readonly EventThreadProgress[],
  definitions: readonly EventThreadDefinition[]
): readonly string[] {
  const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));
  const tags: string[] = [];
  for (const thread of threads) {
    const flagTags = readFlagTags(thread);
    tags.push(
      thread.threadId,
      `thread:${thread.threadId}`,
      thread.storylineId,
      `storyline:${thread.storylineId}`,
      thread.stage,
      `threadStage:${thread.stage}`,
      ...flagTags,
      ...flagTags.map((tag) => `thread:${tag}`)
    );
    const definition = definitionById.get(thread.threadId);
    if (definition !== undefined) {
      tags.push(
        ...definition.threadTags,
        ...definition.threadTags.map((tag) => `thread:${tag}`),
        ...definition.monthlyEventHooks,
        ...definition.majorChoiceHooks,
        ...definition.playInterludeHooks,
        ...definition.playInterludeHooks.flatMap(toPlayInterludeAliases),
        ...definition.stageSequence.flatMap((stage) => [
          ...stage.monthlyEventTags,
          ...stage.majorChoiceTags
        ])
      );
    }
  }
  return publicUnique(tags);
}

function readFlagTags(thread: EventThreadProgress): readonly string[] {
  const value = thread.flags.tags;
  if (typeof value !== "string") {
    return [];
  }
  return value.split("|").map((tag) => tag.trim()).filter((tag) => tag.length > 0);
}

function toPlayInterludeAliases(hook: string): readonly string[] {
  return PLAY_INTERLUDE_HOOK_ALIASES[hook] ?? [];
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
