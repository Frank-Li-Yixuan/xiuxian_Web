import { LifeInterludeResultWritebackEngine } from "../lifeInterludes/LifeInterludeResultWritebackEngine";
import { LifeInterludeRunConfigFactory } from "../lifeInterludes/LifeInterludeRunConfigFactory";
import { createLifeInterludeTriggerContextFromStorylines } from "../lifeInterludes/LifeInterludeTriggerContextAdapter";
import { LifeInterludeTriggerEngine } from "../lifeInterludes/LifeInterludeTriggerEngine";
import { loadLifeInterludeRegistry } from "../lifeInterludes/LifeInterludeRegistry";
import { createMajorChoiceStorylineProjection } from "./MajorChoiceStorylineAdapter";
import type {
  LifeInterludeCandidate,
  LifeInterludeHistoryEntry,
  LifeInterludeMode,
  LifeInterludeResult,
  LifeInterludeTriggerContext
} from "../types/life-interlude-types.v0.1";
import type {
  LifePhaseId,
  LifeSimulationState,
  MonthlyLifeLogEntry,
  PendingLifeInterludeState
} from "../types/life-monthly-events-types.v0.1";
import type {
  ChoiceRiskTier,
  MajorChoiceOptionInstance,
  PendingMajorChoiceState
} from "../types/major-life-choice-types.v0.1";
import type {
  EventThreadProgress,
  LifeStorylineState
} from "../types/life-storylines-types.v0.1";

export const LIFE_SIM_MAJOR_CHOICE_INTERLUDE_ADAPTER_SOURCE = "life_interludes_v0_1_life_sim_major_choice_adapter";

export interface EnsurePendingMajorChoiceWithInterludesInput {
  readonly state: LifeSimulationState;
  readonly seed?: string;
}

export interface SelectLifeSimulationMajorChoiceOptionInput {
  readonly state: LifeSimulationState;
  readonly optionInstanceId: string;
  readonly seed?: string;
}

export type PendingLifeInterludeResolutionMode = "autoResolve" | "manualChallenge" | "backToChoice";

export interface ResolvePendingLifeInterludeInput {
  readonly state: LifeSimulationState;
  readonly resolutionMode: PendingLifeInterludeResolutionMode;
  readonly seed?: string;
}

type FlagRecord = Record<string, number | boolean | string>;

const TEXT_OPTION_COUNT = 3;

function hiddenTermFromCodePoints(codePoints: readonly number[]): string {
  return String.fromCodePoint(...codePoints);
}

const HIDDEN_TRUE_NAME_TERMS = [
  hiddenTermFromCodePoints([
    0x53, 0x48, 0x4f, 0x55, 0x4c, 0x44, 0x5f, 0x4e, 0x4f, 0x54, 0x5f, 0x4c, 0x45, 0x41, 0x4b,
    0x5f, 0x48, 0x49, 0x44, 0x44, 0x45, 0x4e, 0x5f, 0x4e, 0x41, 0x4d, 0x45
  ]),
  hiddenTermFromCodePoints([0x53e4, 0x96f7, 0x771f, 0x8840]),
  hiddenTermFromCodePoints([0x4e39, 0x5723, 0x9057, 0x9aa8]),
  hiddenTermFromCodePoints([0x7cfb, 0x7edf, 0x5171, 0x9e23, 0x4f53]),
  hiddenTermFromCodePoints([0x524d, 0x4e16, 0x5251, 0x9b44]),
  hiddenTermFromCodePoints([0x9b54, 0x5370, 0x5fae, 0x75d5]),
  hiddenTermFromCodePoints([0x592a, 0x9634, 0x6b8b, 0x8109]),
  hiddenTermFromCodePoints([0x9f99, 0x9aa8, 0x672a, 0x9192]),
  hiddenTermFromCodePoints([0x5929, 0x4e66, 0x6b8b, 0x9875]),
  hiddenTermFromCodePoints([0x57df, 0x5916, 0x6218, 0x573a, 0x56de, 0x54cd]),
  hiddenTermFromCodePoints([0x529f, 0x5fb7, 0x79cd, 0x5b50])
] as const;

export function ensurePendingMajorChoiceWithInterludes(
  input: EnsurePendingMajorChoiceWithInterludesInput
): LifeSimulationState {
  if (input.state.pendingMajorChoiceState !== undefined || input.state.pendingInterlude !== undefined) {
    return input.state;
  }

  const seed = input.seed ?? input.state.seed;
  const candidates = new LifeInterludeTriggerEngine().evaluate(buildTriggerContext(input.state));
  const interludeCandidate = candidates[0];
  const eventInstanceId = buildId("life_choice", seed, input.state.characterId, input.state.ageMonths, input.state.monthlyLogs.length);
  const options = buildMajorChoiceOptions(eventInstanceId, interludeCandidate);
  const pendingMajorChoiceState = deepFreeze({
    eventInstanceId,
    eventDefinitionId: "life_simulation_major_choice_interlude_v0_1",
    generatedAtMonth: input.state.ageMonths,
    title: "Half-year life choice",
    description: "A public-safe half-year choice generated from current life storyline signals.",
    sourceMonthlyEventIds: freezeArray(getRecentSixMonthLogs(input.state).map((log) => log.eventId)),
    sourceHooks: freezeArray(publicUnique([
      ...getRecentSixMonthLogs(input.state).flatMap((log) => log.hooks),
      ...(input.state.lifeStorylineState?.interludeCandidateSeeds ?? []),
      ...(input.state.lifeStorylineState?.playInterludeCandidateHooks ?? [])
    ])),
    options: freezeArray(options)
  } satisfies PendingMajorChoiceState);

  return deepFreeze({
    ...cloneStateForUpdate(input.state),
    pendingMajorChoiceState
  });
}

export function selectLifeSimulationMajorChoiceOption(
  input: SelectLifeSimulationMajorChoiceOptionInput
): LifeSimulationState {
  if (input.state.pendingInterlude !== undefined) {
    return input.state;
  }
  const pendingMajorChoiceState = input.state.pendingMajorChoiceState;
  if (pendingMajorChoiceState === undefined) {
    return input.state;
  }
  const option = pendingMajorChoiceState.options.find((item) => item.instanceId === input.optionInstanceId);
  if (option === undefined || option.disabledReason !== undefined) {
    return input.state;
  }
  if (option.interludeCandidate === undefined) {
    return applyTextOnlyChoice(input.state, pendingMajorChoiceState, option);
  }

  const seed = input.seed ?? input.state.seed;
  const factory = new LifeInterludeRunConfigFactory();
  const runConfig = factory.createRunConfig({
    lifeSimulationState: input.state,
    majorChoiceOption: option,
    candidate: option.interludeCandidate,
    seed,
    ...readSourceThreadId(input.state.lifeStorylineState, option.interludeCandidate)
  });
  const pendingInterlude = deepFreeze({
    sourceMajorChoiceEventInstanceId: pendingMajorChoiceState.eventInstanceId,
    sourceOptionInstanceId: option.instanceId,
    candidate: option.interludeCandidate,
    runConfig,
    status: "pending"
  } satisfies PendingLifeInterludeState);

  return deepFreeze({
    ...cloneStateForUpdate(input.state),
    pendingMajorChoiceState: deepFreeze({
      ...pendingMajorChoiceState,
      options: freezeArray([...pendingMajorChoiceState.options]),
      selectedOptionInstanceId: option.instanceId
    }),
    pendingInterlude
  });
}

export function resolvePendingLifeInterlude(
  input: ResolvePendingLifeInterludeInput
): LifeSimulationState {
  const pendingInterlude = input.state.pendingInterlude;
  if (pendingInterlude === undefined) {
    return input.state;
  }
  if (input.resolutionMode === "backToChoice") {
    const pendingMajorChoiceState = input.state.pendingMajorChoiceState;
    const clearedPendingMajorChoiceState = pendingMajorChoiceState === undefined
      ? undefined
      : clearSelectedOption(pendingMajorChoiceState);
    return deepFreeze({
      ...omitPendingInterlude(input.state),
      ...(clearedPendingMajorChoiceState === undefined ? {} : { pendingMajorChoiceState: clearedPendingMajorChoiceState })
    });
  }

  const seed = input.seed ?? input.state.seed;
  const factory = new LifeInterludeRunConfigFactory();
  const result = input.resolutionMode === "autoResolve"
    ? factory.createAutoResolveFallback({ config: pendingInterlude.runConfig, seed })
    : createManualPlaceholderResult(pendingInterlude, seed);
  const application = new LifeInterludeResultWritebackEngine().applyResult({
    state: input.state,
    runConfig: pendingInterlude.runConfig,
    result
  });
  const historyEntry = createHistoryEntry(input.state, pendingInterlude, result);
  const nextHistory = freezeArray([
    ...(application.nextState.lifeInterludeHistory ?? input.state.lifeInterludeHistory ?? []).map((entry) => deepFreeze({ ...entry })),
    historyEntry
  ]);

  return deepFreeze({
    ...omitPendingChoiceAndInterlude(application.nextState),
    lifeInterludeHistory: nextHistory
  });
}

function buildTriggerContext(state: LifeSimulationState): LifeInterludeTriggerContext {
  const recentLogs = getRecentSixMonthLogs(state);
  const publicFlags = readPublicFlagValues(state.flags);
  const baseTags = publicUnique([
    ...publicFlags,
    ...Object.keys(state.carriedItemAffinity),
    ...state.wounds.flatMap((wound) => [wound.id, ...wound.tags]),
    ...state.heartKnots.flatMap((knot) => [knot.id, ...knot.tags])
  ]);
  const lifeStorylineState = state.lifeStorylineState;
  if (lifeStorylineState !== undefined) {
    return createLifeInterludeTriggerContextFromStorylines({
      lifeStorylineState,
      majorChoiceProjection: createMajorChoiceStorylineProjection({
        lifeStorylineState,
        recentMonthlyLogs: state.monthlyLogs,
        ageMonths: state.ageMonths
      }),
      ageMonth: state.ageMonths,
      phaseId: state.phaseId,
      recentMonthlyEventIds: recentLogs.map((log) => log.eventId),
      recentHooks: publicUnique(recentLogs.flatMap((log) => log.hooks)),
      openingTags: baseTags,
      destinyTags: readTaggedValues(publicFlags, ["destiny"]),
      rootTags: readTaggedValues(publicFlags, ["root"]),
      originTags: readTaggedValues(publicFlags, ["origin"]),
      itemTags: publicUnique([
        ...readTaggedValues(publicFlags, ["item", "carried_item", "carriedItem"]),
        ...Object.keys(state.carriedItemAffinity)
      ]),
      currentWoundIds: state.wounds.map((wound) => wound.id),
      currentHeartKnotIds: state.heartKnots.map((knot) => knot.id),
      merit: state.merit,
      karma: state.karma,
      recentInterludesLast24Months: countRecentInterludes(state),
      interludeHistory: state.lifeInterludeHistory ?? []
    });
  }
  return deepFreeze({
    ageMonth: state.ageMonths,
    phaseId: state.phaseId,
    recentMonthlyEventIds: freezeArray(recentLogs.map((log) => log.eventId).filter(isPublicSignal)),
    recentHooks: freezeArray(publicUnique(recentLogs.flatMap((log) => log.hooks))),
    activeStorylineTags: freezeArray([]),
    activeThreadTags: freezeArray([]),
    openingTags: freezeArray(baseTags),
    destinyTags: freezeArray(readTaggedValues(publicFlags, ["destiny"])),
    rootTags: freezeArray(readTaggedValues(publicFlags, ["root"])),
    originTags: freezeArray(readTaggedValues(publicFlags, ["origin"])),
    itemTags: freezeArray(publicUnique([
      ...readTaggedValues(publicFlags, ["item", "carried_item", "carriedItem"]),
      ...Object.keys(state.carriedItemAffinity)
    ])),
    currentWoundIds: freezeArray(state.wounds.map((wound) => wound.id).filter(isPublicSignal)),
    currentHeartKnotIds: freezeArray(state.heartKnots.map((knot) => knot.id).filter(isPublicSignal)),
    merit: state.merit,
    karma: state.karma,
    recentInterludesLast24Months: countRecentInterludes(state),
    interludeHistory: freezeArray((state.lifeInterludeHistory ?? []).map((entry) => deepFreeze({ ...entry })))
  });
}

function buildMajorChoiceOptions(
  eventInstanceId: string,
  interludeCandidate: LifeInterludeCandidate | undefined
): readonly MajorChoiceOptionInstance[] {
  const options: MajorChoiceOptionInstance[] = [];
  if (interludeCandidate !== undefined) {
    options.push(deepFreeze({
      instanceId: `${eventInstanceId}:interlude:${interludeCandidate.definitionId}`,
      definitionId: "life_interlude_candidate_option",
      label: `Trial: ${interludeCandidate.name}`,
      description: interludeCandidate.worldExplanation,
      riskTier: toChoiceRiskTier(interludeCandidate.difficultyTier),
      optionType: toChoiceRiskTier(interludeCandidate.difficultyTier),
      visibleHint: "Possible trial",
      successChanceLabel: interludeCandidate.displayRisk,
      tags: freezeArray(publicUnique([
        "life_interlude_candidate",
        `mode:${interludeCandidate.mode}`,
        interludeCandidate.definitionId
      ])),
      interludeCandidate: sanitizeCandidate(interludeCandidate)
    } satisfies MajorChoiceOptionInstance));
  }

  for (let index = options.length; index < TEXT_OPTION_COUNT; index += 1) {
    const textIndex = index + 1;
    options.push(deepFreeze({
      instanceId: `${eventInstanceId}:text:${textIndex}`,
      definitionId: `life_text_choice_${textIndex}`,
      label: `Text choice ${textIndex}`,
      description: "Continue this half-year through normal life simulation.",
      riskTier: "safe",
      optionType: "safe",
      visibleHint: "Normal life path",
      successChanceLabel: "stable",
      tags: freezeArray(["text_only_choice", `text_choice_${textIndex}`])
    } satisfies MajorChoiceOptionInstance));
  }
  return freezeArray(options);
}

function sanitizeCandidate(candidate: LifeInterludeCandidate): LifeInterludeCandidate {
  return deepFreeze({
    definitionId: candidate.definitionId,
    mode: candidate.mode,
    name: isPublicText(candidate.name) ? candidate.name : candidate.definitionId,
    difficultyTier: candidate.difficultyTier,
    displayRisk: isPublicText(candidate.displayRisk) ? candidate.displayRisk : candidate.difficultyTier,
    ...(candidate.durationPreview === undefined || !isPublicText(candidate.durationPreview) ? {} : { durationPreview: candidate.durationPreview }),
    worldExplanation: isPublicText(candidate.worldExplanation) ? candidate.worldExplanation : "A public-safe interlude opens.",
    autoResolveAllowed: candidate.autoResolveAllowed,
    finalWeight: candidate.finalWeight
  });
}

function applyTextOnlyChoice(
  state: LifeSimulationState,
  pendingMajorChoiceState: PendingMajorChoiceState,
  option: MajorChoiceOptionInstance
): LifeSimulationState {
  const log = createTextChoiceLog(state, pendingMajorChoiceState, option);
  return deepFreeze({
    ...omitPendingChoice(state),
    monthlyLogs: freezeArray([
      ...state.monthlyLogs.map((entry) => cloneMonthlyLog(entry)),
      log
    ])
  });
}

function createTextChoiceLog(
  state: LifeSimulationState,
  pendingMajorChoiceState: PendingMajorChoiceState,
  option: MajorChoiceOptionInstance
): MonthlyLifeLogEntry {
  return deepFreeze({
    ageMonth: state.ageMonths,
    ageYear: Math.trunc(state.ageMonths / 12),
    ageMonthInYear: state.ageMonths % 12,
    phaseId: state.phaseId as LifePhaseId,
    eventId: `major_choice:${pendingMajorChoiceState.eventInstanceId}:${option.instanceId}`,
    eventTitle: option.label,
    eventDescription: option.description,
    outcome: "normal",
    visibleEffectSummary: freezeArray(publicUniqueText([option.visibleHint])),
    tags: freezeArray(publicUnique(["major_choice", ...option.tags])),
    hooks: freezeArray(publicUnique(option.tags))
  });
}

function createManualPlaceholderResult(
  pendingInterlude: PendingLifeInterludeState,
  seed: string
): LifeInterludeResult {
  const config = pendingInterlude.runConfig;
  return deepFreeze({
    interludeRunId: config.interludeRunId,
    definitionId: config.definitionId,
    mode: config.mode,
    outcome: "success",
    ...(config.durationTargetSeconds === undefined ? {} : { durationSeconds: config.durationTargetSeconds }),
    playerChoseManual: true,
    visibleSummary: `manual_placeholder:${config.definitionId}:${stableHash(`${seed}:${config.interludeRunId}:manual`)}`,
    effects: freezeArray([]),
    generatedHooks: freezeArray(publicUnique([
      `manual_interlude_${config.definitionId}`,
      config.mode
    ]))
  });
}

function createHistoryEntry(
  state: LifeSimulationState,
  pendingInterlude: PendingLifeInterludeState,
  result: LifeInterludeResult
): LifeInterludeHistoryEntry {
  return deepFreeze({
    interludeId: pendingInterlude.runConfig.definitionId,
    mode: pendingInterlude.runConfig.mode as LifeInterludeMode,
    ageMonth: state.ageMonths,
    outcome: result.outcome,
    sourceChoiceId: pendingInterlude.sourceOptionInstanceId,
    ...(pendingInterlude.runConfig.sourceThreadId === undefined ? {} : { sourceThreadId: pendingInterlude.runConfig.sourceThreadId })
  });
}

function clearSelectedOption(pendingMajorChoiceState: PendingMajorChoiceState): PendingMajorChoiceState {
  const { selectedOptionInstanceId: _selectedOptionInstanceId, resolution: _resolution, ...rest } = pendingMajorChoiceState;
  return deepFreeze({
    ...rest,
    options: freezeArray([...pendingMajorChoiceState.options])
  });
}

function readSourceThreadId(
  lifeStorylineState: LifeStorylineState | undefined,
  candidate: LifeInterludeCandidate
): { readonly sourceThreadId?: string } {
  if (lifeStorylineState === undefined) {
    return {};
  }
  const definition = getInterludeDefinition(candidate.definitionId);
  const candidateTokens = buildTokenSet([
    candidate.definitionId,
    ...definition.threadTags,
    ...definition.storylineTags
  ]);
  const downstreamIds = new Set(lifeStorylineState.downstreamActiveStorylineIds);
  const threads = lifeStorylineState.eventThreads
    .filter((thread) => downstreamIds.size === 0 || downstreamIds.has(thread.storylineId))
    .sort(compareThreadsForSource);
  const matched = threads.find((thread) => threadMatchesCandidate(thread, candidateTokens));
  const fallback = threads[0];
  const threadId = matched?.threadId ?? fallback?.threadId;
  return threadId === undefined || !isPublicSignal(threadId) ? {} : { sourceThreadId: threadId };
}

function getInterludeDefinition(definitionId: string) {
  try {
    return loadLifeInterludeRegistry().getInterlude(definitionId);
  } catch {
    return {
      threadTags: [],
      storylineTags: []
    };
  }
}

function threadMatchesCandidate(
  thread: EventThreadProgress,
  candidateTokens: ReadonlySet<string>
): boolean {
  const threadTokens = buildTokenSet([
    thread.threadId,
    thread.storylineId,
    ...readThreadFlagTags(thread)
  ]);
  for (const token of threadTokens) {
    if (candidateTokens.has(token)) {
      return true;
    }
  }
  return false;
}

function compareThreadsForSource(left: EventThreadProgress, right: EventThreadProgress): number {
  return right.progress - left.progress ||
    right.tension - left.tension ||
    left.threadId.localeCompare(right.threadId);
}

function readThreadFlagTags(thread: EventThreadProgress): readonly string[] {
  const tags = thread.flags.tags;
  if (typeof tags !== "string") {
    return [];
  }
  return tags.split("|").map((tag) => tag.trim()).filter(isPublicSignal);
}

function getRecentSixMonthLogs(state: LifeSimulationState): readonly MonthlyLifeLogEntry[] {
  const monthEnd = state.ageMonths;
  const monthStart = Math.max(0, monthEnd - 5);
  return state.monthlyLogs
    .filter((log) => log.ageMonth >= monthStart && log.ageMonth <= monthEnd)
    .sort((left, right) => left.ageMonth - right.ageMonth || left.eventId.localeCompare(right.eventId));
}

function countRecentInterludes(state: LifeSimulationState): number {
  const minMonth = Math.max(0, state.ageMonths - 23);
  return (state.lifeInterludeHistory ?? []).filter((entry) => entry.ageMonth >= minMonth && entry.ageMonth <= state.ageMonths).length;
}

function readPublicFlagValues(flags: Readonly<Record<string, number | boolean | string>>): readonly string[] {
  const values: string[] = [];
  for (const [key, value] of Object.entries(flags)) {
    if (key === "trueNameRevealed" && typeof value === "boolean") {
      continue;
    }
    if (isPublicSignal(key)) {
      values.push(key);
    }
    if (typeof value === "string" && isPublicSignal(value)) {
      values.push(value);
    }
  }
  return publicUnique(values);
}

function readTaggedValues(values: readonly string[], prefixes: readonly string[]): readonly string[] {
  const expected = new Set(prefixes.map(normalizeToken));
  return publicUnique(values.filter((value) => {
    const normalized = normalizeToken(value);
    return [...expected].some((prefix) =>
      normalized === prefix ||
      normalized.startsWith(`${prefix}:`) ||
      normalized.startsWith(`${prefix}_`)
    );
  }));
}

function cloneStateForUpdate(state: LifeSimulationState): LifeSimulationState {
  return deepFreeze({
    ...state,
    family: deepFreeze({
      ...state.family,
      flags: deepFreeze(sanitizeFlags(state.family.flags))
    }),
    flags: deepFreeze(sanitizeFlags(state.flags)),
    monthlyLogs: freezeArray(state.monthlyLogs.map((log) => cloneMonthlyLog(log))),
    wounds: freezeArray(state.wounds.map((wound) => deepFreeze({
      ...wound,
      tags: freezeArray(wound.tags.filter(isPublicSignal))
    }))),
    heartKnots: freezeArray(state.heartKnots.map((knot) => deepFreeze({
      ...knot,
      tags: freezeArray(knot.tags.filter(isPublicSignal))
    }))),
    lifeInterludeHistory: freezeArray((state.lifeInterludeHistory ?? []).map((entry) => deepFreeze({ ...entry })))
  });
}

function sanitizeFlags(flags: Readonly<Record<string, number | boolean | string>>): FlagRecord {
  const safe: FlagRecord = {};
  for (const [key, value] of Object.entries(flags)) {
    if (key === "trueNameRevealed" && typeof value === "boolean") {
      safe[key] = value;
      continue;
    }
    if (!isPublicSignal(key)) {
      continue;
    }
    if (typeof value === "string" && !isPublicText(value)) {
      continue;
    }
    safe[key] = value;
  }
  return safe;
}

function cloneMonthlyLog(log: MonthlyLifeLogEntry): MonthlyLifeLogEntry {
  return deepFreeze({
    ...log,
    eventTitle: isPublicText(log.eventTitle) ? log.eventTitle : log.eventId,
    eventDescription: isPublicText(log.eventDescription) ? log.eventDescription : "public event",
    visibleEffectSummary: freezeArray(publicUniqueText(log.visibleEffectSummary)),
    ...(log.vagueHiddenSummary === undefined || !isPublicText(log.vagueHiddenSummary) ? {} : { vagueHiddenSummary: log.vagueHiddenSummary }),
    tags: freezeArray(publicUnique(log.tags)),
    hooks: freezeArray(publicUnique(log.hooks))
  });
}

function omitPendingChoice(state: LifeSimulationState): LifeSimulationState {
  const { pendingMajorChoiceState: _pendingMajorChoiceState, ...rest } = cloneStateForUpdate(state);
  return rest;
}

function omitPendingInterlude(state: LifeSimulationState): LifeSimulationState {
  const { pendingInterlude: _pendingInterlude, ...rest } = cloneStateForUpdate(state);
  return rest;
}

function omitPendingChoiceAndInterlude(state: LifeSimulationState): LifeSimulationState {
  const {
    pendingMajorChoiceState: _pendingMajorChoiceState,
    pendingInterlude: _pendingInterlude,
    ...rest
  } = cloneStateForUpdate(state);
  return rest;
}

function toChoiceRiskTier(difficultyTier: LifeInterludeCandidate["difficultyTier"]): ChoiceRiskTier {
  return difficultyTier;
}

function buildId(
  prefix: string,
  seed: string,
  characterId: string,
  ageMonths: number,
  salt: number
): string {
  return `${prefix}_${stableHash(`${seed}|${characterId}|${ageMonths}|${salt}`)}`;
}

function buildTokenSet(values: readonly string[]): ReadonlySet<string> {
  const tokens = new Set<string>();
  for (const value of values.filter(isPublicSignal)) {
    const normalized = normalizeToken(value);
    if (normalized.length === 0) {
      continue;
    }
    tokens.add(normalized);
    const parts = normalized.split(/[:_]+/).filter((part) => part.length > 0);
    for (const part of parts) {
      tokens.add(part);
    }
    for (let index = 0; index < parts.length; index += 1) {
      tokens.add(parts.slice(index).join("_"));
    }
  }
  return tokens;
}

function isPublicSignal(value: string): boolean {
  const normalized = normalizeToken(value);
  return isPublicText(value) &&
    normalized.length > 0 &&
    !normalized.startsWith("hidden:") &&
    !normalized.startsWith("hidden_") &&
    !normalized.includes("internal_hidden");
}

function isPublicText(value: string): boolean {
  const normalized = normalizeToken(value);
  return value.trim().length > 0 &&
    !normalized.includes("true_name") &&
    !normalized.includes("truename") &&
    !normalized.includes("hidden_fate_internal") &&
    !normalized.includes("should_not_leak_hidden_name") &&
    HIDDEN_TRUE_NAME_TERMS.every((term) => !value.includes(term));
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

function publicUnique(values: readonly string[]): readonly string[] {
  return uniqueStable(values.map((value) => value.trim()).filter(isPublicSignal));
}

function publicUniqueText(values: readonly string[]): readonly string[] {
  return uniqueStable(values.map((value) => value.trim()).filter(isPublicText));
}

function stableHash(value: string): string {
  return stableHashNumber(value).toString(36).padStart(8, "0");
}

function stableHashNumber(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
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
