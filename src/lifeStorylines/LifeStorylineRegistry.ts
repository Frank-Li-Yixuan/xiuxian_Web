import eventThreadsData from "../../data/life_storylines/event_threads.v0.1.json";
import storylineDefinitionsData from "../../data/life_storylines/storyline_definitions.v0.1.json";
import storylineScoringRulesData from "../../data/life_storylines/storyline_scoring_rules.v0.1.json";
import type {
  EventThreadDefinition,
  EventThreadsDataFile,
  EventThreadStage,
  EventThreadStageDefinition,
  LifePhaseId,
  LifeStorylineDataBundle,
  LifeStorylineDefinition,
  LifeStorylineDefinitionsDataFile,
  PlayInterludeAffinity,
  StorylineScoringRulesDataFile,
  StorylineSignalRule,
  StorylineStatus,
  TrialModeType
} from "../types/life-storylines-types.v0.1";

const DATA_FILE_NAMES = {
  storylineDefinitions: "storyline_definitions",
  eventThreads: "event_threads",
  storylineScoringRules: "storyline_scoring_rules"
} as const;

const SUPPORTED_VERSION = "0.1";

const LEGAL_LIFE_PHASES = new Set<LifePhaseId>([
  "infancy",
  "childhood",
  "youth",
  "adolescence",
  "awakening"
]);
const LEGAL_TRIAL_MODES = new Set<TrialModeType>(["stg", "horde", "deckbuilder", "autochess", "text"]);
const LEGAL_SIGNAL_SOURCES = new Set<StorylineSignalRule["source"]>([
  "ninePalace",
  "spiritualRoot",
  "destiny",
  "origin",
  "hiddenFate",
  "carriedItem",
  "lifeState",
  "recentMonthlyEvents",
  "majorChoiceOutcome"
]);
const LEGAL_STAGE_DEFINITION_STAGES = new Set<EventThreadStageDefinition["stage"]>([
  "seed",
  "omen",
  "development",
  "crisis",
  "resolution"
]);
const REQUIRED_STATUSES = ["dormant", "hinted", "active", "dominant", "fated"] as const satisfies readonly StorylineStatus[];
const REQUIRED_THREAD_STAGE_THRESHOLDS = [
  "seeded",
  "hinted",
  "developing",
  "crisis",
  "resolved",
  "failed"
] as const satisfies readonly EventThreadStage[];
const EMPTY_THREADS: readonly EventThreadDefinition[] = Object.freeze([]);

export class LifeStorylineRegistry {
  readonly storylines: readonly LifeStorylineDefinition[];
  readonly eventThreads: readonly EventThreadDefinition[];
  readonly scoringRules: StorylineScoringRulesDataFile;

  private readonly storylineById: ReadonlyMap<string, LifeStorylineDefinition>;
  private readonly threadById: ReadonlyMap<string, EventThreadDefinition>;
  private readonly threadsByStorylineId: ReadonlyMap<string, readonly EventThreadDefinition[]>;

  constructor(data: Required<LifeStorylineDataBundle>) {
    this.storylines = freezeArray(data.storylineDefinitions.storylines);
    this.eventThreads = freezeArray(data.eventThreads.eventThreads);
    this.scoringRules = deepFreeze(cloneJson(data.storylineScoringRules));
    this.storylineById = indexById(this.storylines);
    this.threadById = indexById(this.eventThreads);
    this.threadsByStorylineId = buildThreadsByStorylineId(this.storylines, this.threadById);
  }

  getStoryline(id: string): LifeStorylineDefinition {
    const storyline = this.storylineById.get(id);
    if (storyline === undefined) {
      throw new Error(`Missing life storyline: ${id}`);
    }
    return storyline;
  }

  getThread(id: string): EventThreadDefinition {
    const thread = this.threadById.get(id);
    if (thread === undefined) {
      throw new Error(`Missing life event thread: ${id}`);
    }
    return thread;
  }

  listStorylines(): readonly LifeStorylineDefinition[] {
    return this.storylines;
  }

  listThreadsByStoryline(storylineId: string): readonly EventThreadDefinition[] {
    const storyline = this.getStoryline(storylineId);
    return this.threadsByStorylineId.get(storyline.id) ?? EMPTY_THREADS;
  }
}

export function loadLifeStorylineRegistry(): LifeStorylineRegistry {
  return createLifeStorylineRegistry({
    storylineDefinitions: storylineDefinitionsData as unknown as LifeStorylineDefinitionsDataFile,
    eventThreads: eventThreadsData as unknown as EventThreadsDataFile,
    storylineScoringRules: storylineScoringRulesData as unknown as StorylineScoringRulesDataFile
  });
}

export function createLifeStorylineRegistry(data: LifeStorylineDataBundle): LifeStorylineRegistry {
  const issues = validateLifeStorylineData(data);
  if (issues.length > 0) {
    throw new Error(`Life storyline data validation failed:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
  }
  return new LifeStorylineRegistry(data as Required<LifeStorylineDataBundle>);
}

export function validateLifeStorylineData(data: LifeStorylineDataBundle): string[] {
  const issues: string[] = [];
  const storylineDefinitions = requireFile(data.storylineDefinitions, DATA_FILE_NAMES.storylineDefinitions, issues);
  const eventThreads = requireFile(data.eventThreads, DATA_FILE_NAMES.eventThreads, issues);
  const storylineScoringRules = requireFile(data.storylineScoringRules, DATA_FILE_NAMES.storylineScoringRules, issues);

  if (storylineDefinitions === undefined || eventThreads === undefined || storylineScoringRules === undefined) {
    return issues;
  }

  validateVersion(DATA_FILE_NAMES.storylineDefinitions, storylineDefinitions.version, issues);
  validateVersion(DATA_FILE_NAMES.eventThreads, eventThreads.version, issues);
  validateVersion(DATA_FILE_NAMES.storylineScoringRules, storylineScoringRules.version, issues);

  const storylineIds = validateStorylines(storylineDefinitions.storylines, issues);
  const threadIds = validateThreads(eventThreads.eventThreads, storylineIds, issues);
  validateStorylineThreadReferences(storylineDefinitions.storylines, threadIds, issues);
  validateThreadBackReferences(eventThreads.eventThreads, storylineDefinitions.storylines, issues);
  validateScoringRules(storylineScoringRules, issues);

  return issues;
}

function validateStorylines(storylinesValue: readonly LifeStorylineDefinition[] | undefined, issues: string[]): ReadonlySet<string> {
  const ids = new Set<string>();
  const storylines = requireNonEmptyArray("storyline_definitions.storylines", storylinesValue, issues);
  for (const [index, storyline] of storylines.entries()) {
    const path = `storyline_definitions.storylines[${index}]`;
    validateUniqueId(storyline.id, ids, "life storyline id", `${path}.id`, issues);
    validateNonEmptyString(`${path}.name`, storyline.name, issues);
    validateNonEmptyString(`${path}.shortName`, storyline.shortName, issues);
    validateNonEmptyString(`${path}.description`, storyline.description, issues);
    validateFiniteNumber(`${path}.baseWeight`, storyline.baseWeight, issues);
    validateStringArray(`${path}.themeTags`, storyline.themeTags, issues);
    validateStringArray(`${path}.worldContextTags`, storyline.worldContextTags, issues);
    validateAgePhaseAffinity(`${path}.agePhaseAffinity`, storyline.agePhaseAffinity, issues);
    validateSignalRules(`${path}.activationSignals`, storyline.activationSignals, issues);
    if (storyline.suppressionSignals !== undefined) {
      validateSignalRules(`${path}.suppressionSignals`, storyline.suppressionSignals, issues);
    }
    validateStringArray(`${path}.eventThreadIds`, storyline.eventThreadIds, issues);
    validatePlayInterludeAffinities(`${path}.playInterludeAffinities`, storyline.playInterludeAffinities, issues);
    validateStringArray(`${path}.possibleTransitionHooks`, storyline.possibleTransitionHooks, issues);
    validateStringArray(`${path}.possibleAge18Hooks`, storyline.possibleAge18Hooks, issues);
  }
  return ids;
}

function validateThreads(
  threadsValue: readonly EventThreadDefinition[] | undefined,
  storylineIds: ReadonlySet<string>,
  issues: string[]
): ReadonlySet<string> {
  const ids = new Set<string>();
  const threads = requireNonEmptyArray("event_threads.eventThreads", threadsValue, issues);
  for (const [index, thread] of threads.entries()) {
    const path = `event_threads.eventThreads[${index}]`;
    validateUniqueId(thread.id, ids, "life event thread id", `${path}.id`, issues);
    validateNonEmptyString(`${path}.storylineId`, thread.storylineId, issues);
    if (typeof thread.storylineId === "string" && thread.storylineId.length > 0 && !storylineIds.has(thread.storylineId)) {
      issues.push(`${path}.storylineId references missing storyline: ${thread.storylineId}`);
    }
    validateNonEmptyString(`${path}.name`, thread.name, issues);
    validateNonEmptyString(`${path}.description`, thread.description, issues);
    validateStringArray(`${path}.threadTags`, thread.threadTags, issues);
    validateSignalRules(`${path}.triggerSignals`, thread.triggerSignals, issues);
    validateStageSequence(`${path}.stageSequence`, thread.stageSequence, issues);
    validateStringArray(`${path}.monthlyEventHooks`, thread.monthlyEventHooks, issues);
    validateStringArray(`${path}.majorChoiceHooks`, thread.majorChoiceHooks, issues);
    validateStringArray(`${path}.playInterludeHooks`, thread.playInterludeHooks, issues);
    validateStringArray(`${path}.resolutionHooks`, thread.resolutionHooks, issues);
    validateStringArray(`${path}.failureHooks`, thread.failureHooks, issues);
  }
  return ids;
}

function validateStorylineThreadReferences(
  storylines: readonly LifeStorylineDefinition[],
  threadIds: ReadonlySet<string>,
  issues: string[]
): void {
  for (const [storylineIndex, storyline] of storylines.entries()) {
    for (const [threadIndex, threadId] of storyline.eventThreadIds.entries()) {
      if (!threadIds.has(threadId)) {
        issues.push(
          `storyline_definitions.storylines[${storylineIndex}].eventThreadIds[${threadIndex}] references missing thread: ${threadId}`
        );
      }
    }
  }
}

function validateThreadBackReferences(
  threads: readonly EventThreadDefinition[],
  storylines: readonly LifeStorylineDefinition[],
  issues: string[]
): void {
  const storylinesById = new Map(storylines.map((storyline) => [storyline.id, storyline]));
  for (const [threadIndex, thread] of threads.entries()) {
    const owner = storylinesById.get(thread.storylineId);
    if (owner !== undefined && !owner.eventThreadIds.includes(thread.id)) {
      issues.push(`event_threads.eventThreads[${threadIndex}].id is not listed by owning storyline ${thread.storylineId}`);
    }
  }
}

function validateScoringRules(rules: StorylineScoringRulesDataFile, issues: string[]): void {
  for (const status of REQUIRED_STATUSES) {
    validateScoreRange(`storyline_scoring_rules.statusThresholds.${status}`, rules.statusThresholds?.[status], issues);
    validateFiniteNumber(`storyline_scoring_rules.defaultDecayPerYear.${status}`, rules.defaultDecayPerYear?.[status], issues);
  }
  validatePositiveInteger("storyline_scoring_rules.limits.maxDominantStorylines", rules.limits?.maxDominantStorylines, issues);
  validatePositiveInteger("storyline_scoring_rules.limits.maxFatedStorylines", rules.limits?.maxFatedStorylines, issues);
  validateScoreRange("storyline_scoring_rules.limits.targetActiveStorylines", rules.limits?.targetActiveStorylines, issues);
  validateNonEmptyString("storyline_scoring_rules.scoreFormula", rules.scoreFormula, issues);
  for (const stage of REQUIRED_THREAD_STAGE_THRESHOLDS) {
    const threshold = rules.threadStageThresholds?.[stage];
    const path = `storyline_scoring_rules.threadStageThresholds.${stage}`;
    if (threshold === undefined || threshold === null) {
      issues.push(`${path} must exist`);
      continue;
    }
    for (const [key, value] of Object.entries(threshold)) {
      if (!["progress", "tension", "clarity", "risk"].includes(key)) {
        issues.push(`${path}.${key} is not legal`);
      }
      validateFiniteNumber(`${path}.${key}`, value, issues);
    }
  }
  validateWeightedConditionRules(
    "storyline_scoring_rules.playInterludeCandidateRules",
    rules.playInterludeCandidateRules,
    issues
  );
  validateTransitionCandidateRules(
    "storyline_scoring_rules.transitionCandidateRules",
    rules.transitionCandidateRules,
    issues
  );
}

function validateSignalRules(path: string, value: readonly StorylineSignalRule[] | undefined, issues: string[]): void {
  const rules = requireNonEmptyArray(path, value, issues);
  for (const [index, rule] of rules.entries()) {
    const rulePath = `${path}[${index}]`;
    if (!LEGAL_SIGNAL_SOURCES.has(rule.source)) {
      issues.push(`${rulePath}.source is not legal: ${String(rule.source)}`);
    }
    if (rule.tag === undefined && rule.stat === undefined) {
      issues.push(`${rulePath} must define tag or stat`);
    }
    if (rule.tag !== undefined) {
      validateNonEmptyString(`${rulePath}.tag`, rule.tag, issues);
    }
    if (rule.stat !== undefined) {
      validateNonEmptyString(`${rulePath}.stat`, rule.stat, issues);
    }
    validateFiniteNumber(`${rulePath}.weight`, rule.weight, issues);
    if (rule.min !== undefined) {
      validateFiniteNumber(`${rulePath}.min`, rule.min, issues);
    }
    if (rule.max !== undefined) {
      validateFiniteNumber(`${rulePath}.max`, rule.max, issues);
    }
    if (typeof rule.min === "number" && typeof rule.max === "number" && rule.min > rule.max) {
      issues.push(`${rulePath}.min must be <= max`);
    }
    if (rule.note !== undefined) {
      validateNonEmptyString(`${rulePath}.note`, rule.note, issues);
    }
  }
}

function validatePlayInterludeAffinities(
  path: string,
  value: readonly PlayInterludeAffinity[] | undefined,
  issues: string[]
): void {
  const affinities = requireNonEmptyArray(path, value, issues);
  for (const [index, affinity] of affinities.entries()) {
    const affinityPath = `${path}[${index}]`;
    if (!LEGAL_TRIAL_MODES.has(affinity.mode)) {
      issues.push(`${affinityPath}.mode is not legal: ${String(affinity.mode)}`);
    }
    validateFiniteNumber(`${affinityPath}.weight`, affinity.weight, issues);
    validateNonEmptyString(`${affinityPath}.hook`, affinity.hook, issues);
  }
}

function validateStageSequence(
  path: string,
  value: readonly EventThreadStageDefinition[] | undefined,
  issues: string[]
): void {
  const stages = requireNonEmptyArray(path, value, issues);
  if (stages.length > 0 && stages.length < 3) {
    issues.push(`${path} must contain at least 3 stages`);
  }
  for (const [index, stage] of stages.entries()) {
    const stagePath = `${path}[${index}]`;
    if (!LEGAL_STAGE_DEFINITION_STAGES.has(stage.stage)) {
      issues.push(`${stagePath}.stage is not legal: ${String(stage.stage)}`);
    }
    validateAgeRange(`${stagePath}.recommendedAgeRange`, stage.recommendedAgeRange, issues);
    for (const key of ["requiredProgress", "tensionDelta", "clarityDelta", "riskDelta"] as const) {
      if (stage[key] !== undefined) {
        validateFiniteNumber(`${stagePath}.${key}`, stage[key], issues);
      }
    }
    validateStringArray(`${stagePath}.monthlyEventTags`, stage.monthlyEventTags, issues);
    validateStringArray(`${stagePath}.majorChoiceTags`, stage.majorChoiceTags, issues);
    validateStringArray(`${stagePath}.visibleNarrativeHints`, stage.visibleNarrativeHints, issues);
    if (stage.hiddenHooks !== undefined) {
      validateStringArray(`${stagePath}.hiddenHooks`, stage.hiddenHooks, issues);
    }
  }
}

function validateAgePhaseAffinity(path: string, value: Record<string, number> | undefined, issues: string[]): void {
  if (value === undefined || value === null || Array.isArray(value) || typeof value !== "object") {
    issues.push(`${path} must be an object`);
    return;
  }
  for (const [phase, weight] of Object.entries(value)) {
    if (!LEGAL_LIFE_PHASES.has(phase as LifePhaseId)) {
      issues.push(`${path}.${phase} is not a legal life phase`);
    }
    validateFiniteNumber(`${path}.${phase}`, weight, issues);
  }
}

function validateWeightedConditionRules(
  path: string,
  value: readonly { readonly condition: string; readonly weight: number }[] | undefined,
  issues: string[]
): void {
  const rules = requireNonEmptyArray(path, value, issues);
  for (const [index, rule] of rules.entries()) {
    validateNonEmptyString(`${path}[${index}].condition`, rule.condition, issues);
    validateFiniteNumber(`${path}[${index}].weight`, rule.weight, issues);
  }
}

function validateTransitionCandidateRules(
  path: string,
  value: readonly { readonly condition: string; readonly hookSource: string }[] | undefined,
  issues: string[]
): void {
  const rules = requireNonEmptyArray(path, value, issues);
  for (const [index, rule] of rules.entries()) {
    validateNonEmptyString(`${path}[${index}].condition`, rule.condition, issues);
    validateNonEmptyString(`${path}[${index}].hookSource`, rule.hookSource, issues);
  }
}

function validateScoreRange(path: string, value: readonly number[] | undefined, issues: string[]): void {
  if (!Array.isArray(value) || value.length !== 2 || !Number.isFinite(value[0]) || !Number.isFinite(value[1])) {
    issues.push(`${path} must be a [min, max] number tuple`);
    return;
  }
  if (value[0] > value[1]) {
    issues.push(`${path} min must be <= max`);
  }
}

function validateAgeRange(path: string, value: readonly number[] | undefined, issues: string[]): void {
  if (!Array.isArray(value) || value.length !== 2 || !Number.isInteger(value[0]) || !Number.isInteger(value[1])) {
    issues.push(`${path} must be a [min, max] integer tuple`);
    return;
  }
  if (value[0] < 0 || value[1] < 0) {
    issues.push(`${path} must be non-negative`);
  }
  if (value[0] > value[1]) {
    issues.push(`${path} min must be <= max`);
  }
}

function validateVersion(fileName: string, version: unknown, issues: string[]): void {
  if (version !== SUPPORTED_VERSION) {
    issues.push(`${fileName}.version must be "${SUPPORTED_VERSION}"`);
  }
}

function validateUniqueId(
  value: unknown,
  seen: Set<string>,
  label: string,
  path: string,
  issues: string[]
): string | undefined {
  if (typeof value !== "string" || value.length === 0) {
    issues.push(`${path} must not be empty`);
    return undefined;
  }
  if (seen.has(value)) {
    issues.push(`duplicate ${label}: ${value}`);
    return value;
  }
  seen.add(value);
  return value;
}

function validateStringArray(path: string, value: readonly string[] | undefined, issues: string[]): void {
  const values = requireNonEmptyArray(path, value, issues);
  for (const [index, item] of values.entries()) {
    validateNonEmptyString(`${path}[${index}]`, item, issues);
  }
}

function validateNonEmptyString(path: string, value: unknown, issues: string[]): void {
  if (typeof value !== "string" || value.length === 0) {
    issues.push(`${path} must not be empty`);
  }
}

function validateFiniteNumber(path: string, value: unknown, issues: string[]): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push(`${path} must be a finite number`);
  }
}

function validatePositiveInteger(path: string, value: unknown, issues: string[]): void {
  if (!Number.isInteger(value)) {
    issues.push(`${path} must be an integer`);
    return;
  }
  if (typeof value === "number" && value <= 0) {
    issues.push(`${path} must be > 0`);
  }
}

function requireNonEmptyArray<T>(path: string, value: readonly T[] | undefined, issues: string[]): readonly T[] {
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array`);
    return [];
  }
  if (value.length === 0) {
    issues.push(`${path} must contain at least one item`);
  }
  return value;
}

function requireFile<T>(file: T | undefined, name: string, issues: string[]): T | undefined {
  if (file === undefined || file === null) {
    issues.push(`Missing life storyline data file: ${name}`);
    return undefined;
  }
  return file;
}

function buildThreadsByStorylineId(
  storylines: readonly LifeStorylineDefinition[],
  threadById: ReadonlyMap<string, EventThreadDefinition>
): ReadonlyMap<string, readonly EventThreadDefinition[]> {
  return new Map(
    storylines.map((storyline) => [
      storyline.id,
      Object.freeze(storyline.eventThreadIds.flatMap((threadId) => {
        const thread = threadById.get(threadId);
        return thread === undefined ? [] : [thread];
      }))
    ])
  );
}

function indexById<T extends { readonly id: string }>(entries: readonly T[]): ReadonlyMap<string, T> {
  return new Map(entries.map((entry) => [entry.id, entry]));
}

function freezeArray<T>(entries: readonly T[]): readonly T[] {
  return Object.freeze(entries.map((entry) => deepFreeze(cloneJson(entry))));
}

function cloneJson<T>(value: T): T {
  return structuredClone(value);
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
