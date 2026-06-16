import eventCatalogData from "../../data/life_interludes/interlude_event_catalog.v0.1.json";
import frequencyBudgetData from "../../data/life_interludes/interlude_frequency_budget.v0.1.json";
import modeDefinitionsData from "../../data/life_interludes/interlude_mode_definitions.v0.1.json";
import resultWritebackRulesData from "../../data/life_interludes/interlude_result_writeback_rules.v0.1.json";
import triggerRulesData from "../../data/life_interludes/interlude_trigger_rules.v0.1.json";
import type {
  InterludeDifficultyTier,
  InterludeRealityLayer,
  LifeInterludeDataBundle,
  LifeInterludeDefinition,
  LifeInterludeEventCatalogDataFile,
  LifeInterludeFrequencyBudgetDataFile,
  LifeInterludeMode,
  LifeInterludeModeDefinition,
  LifeInterludeModeDefinitionsDataFile,
  LifeInterludeOutcome,
  LifeInterludeResultWritebackRule,
  LifeInterludeResultWritebackRulesDataFile,
  LifeInterludeTriggerRulesDataFile,
  LifeInterludeWritebackEffect
} from "../types/life-interlude-types.v0.1";

const DATA_FILE_NAMES = {
  modeDefinitions: "interlude_mode_definitions",
  triggerRules: "interlude_trigger_rules",
  eventCatalog: "interlude_event_catalog",
  resultWritebackRules: "interlude_result_writeback_rules",
  frequencyBudget: "interlude_frequency_budget"
} as const;

const SUPPORTED_VERSION = "0.1";

const LEGAL_MODES = new Set<LifeInterludeMode>(["stg", "horde", "deckbuilder", "formation_auto", "text_check"]);
const LEGAL_REALITY_LAYERS = new Set<InterludeRealityLayer>([
  "real_event",
  "dream",
  "training",
  "spirit_projection",
  "system_preview"
]);
const LEGAL_DIFFICULTIES = new Set<InterludeDifficultyTier>([
  "safe",
  "steady",
  "risky",
  "dangerous",
  "forbidden",
  "destiny"
]);
const LEGAL_OUTCOMES = new Set<LifeInterludeOutcome>([
  "failure",
  "partialSuccess",
  "success",
  "greatSuccess",
  "hiddenSuccess",
  "abandon"
]);
const LEGAL_ABANDON_DEFAULT_OUTCOMES = new Set<string>([...LEGAL_OUTCOMES, "partialSuccessOrFailure"]);
const LEGAL_LIFE_PHASES = new Set(["infancy", "childhood", "youth", "adolescence", "awakening"]);
const LEGAL_EFFECT_TYPES = new Set<LifeInterludeWritebackEffect["type"]>([
  "modifyStat",
  "addWound",
  "addHeartKnot",
  "modifyHiddenFateProgress",
  "modifyCarriedItemAffinity",
  "modifyStorylineScore",
  "modifyThreadProgress",
  "modifyKarmaMerit",
  "addAge18Hook",
  "addLifeLog"
]);

export class LifeInterludeRegistry {
  readonly modes: readonly LifeInterludeModeDefinition[];
  readonly interludes: readonly LifeInterludeDefinition[];
  readonly resultWritebackRules: readonly LifeInterludeResultWritebackRule[];
  readonly triggerRules: LifeInterludeTriggerRulesDataFile;
  private readonly frequencyBudget: LifeInterludeFrequencyBudgetDataFile;

  private readonly modeById: ReadonlyMap<string, LifeInterludeModeDefinition>;
  private readonly interludeById: ReadonlyMap<string, LifeInterludeDefinition>;
  private readonly writebackRuleById: ReadonlyMap<string, LifeInterludeResultWritebackRule>;

  constructor(data: Required<LifeInterludeDataBundle>) {
    this.modes = freezeArray(data.modeDefinitions.modes);
    this.interludes = freezeArray(data.eventCatalog.interludes);
    this.resultWritebackRules = freezeArray(data.resultWritebackRules.rules);
    this.triggerRules = deepFreeze(cloneJson(data.triggerRules));
    this.frequencyBudget = deepFreeze(cloneJson(data.frequencyBudget));
    this.modeById = indexById(this.modes);
    this.interludeById = indexById(this.interludes);
    this.writebackRuleById = indexById(this.resultWritebackRules);
  }

  listModes(): readonly LifeInterludeModeDefinition[] {
    return this.modes;
  }

  getMode(modeId: string): LifeInterludeModeDefinition {
    const mode = this.modeById.get(modeId);
    if (mode === undefined) {
      throw new Error(`Missing life interlude mode: ${modeId}`);
    }
    return mode;
  }

  listInterludes(): readonly LifeInterludeDefinition[] {
    return this.interludes;
  }

  getInterlude(id: string): LifeInterludeDefinition {
    const interlude = this.interludeById.get(id);
    if (interlude === undefined) {
      throw new Error(`Missing life interlude: ${id}`);
    }
    return interlude;
  }

  getWritebackRule(id: string): LifeInterludeResultWritebackRule {
    const rule = this.writebackRuleById.get(id);
    if (rule === undefined) {
      throw new Error(`Missing life interlude writeback rule: ${id}`);
    }
    return rule;
  }

  getFrequencyBudget(): LifeInterludeFrequencyBudgetDataFile {
    return this.frequencyBudget;
  }
}

export function loadLifeInterludeRegistry(): LifeInterludeRegistry {
  return createLifeInterludeRegistry({
    modeDefinitions: modeDefinitionsData as unknown as LifeInterludeModeDefinitionsDataFile,
    triggerRules: triggerRulesData as unknown as LifeInterludeTriggerRulesDataFile,
    eventCatalog: eventCatalogData as unknown as LifeInterludeEventCatalogDataFile,
    resultWritebackRules: resultWritebackRulesData as unknown as LifeInterludeResultWritebackRulesDataFile,
    frequencyBudget: frequencyBudgetData as unknown as LifeInterludeFrequencyBudgetDataFile
  });
}

export function createLifeInterludeRegistry(data: LifeInterludeDataBundle): LifeInterludeRegistry {
  const issues = validateLifeInterludeData(data);
  if (issues.length > 0) {
    throw new Error(`Life interlude data validation failed:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
  }
  return new LifeInterludeRegistry(data as Required<LifeInterludeDataBundle>);
}

export function validateLifeInterludeData(data: LifeInterludeDataBundle): string[] {
  const issues: string[] = [];
  const modeDefinitions = requireFile(data.modeDefinitions, DATA_FILE_NAMES.modeDefinitions, issues);
  const triggerRules = requireFile(data.triggerRules, DATA_FILE_NAMES.triggerRules, issues);
  const eventCatalog = requireFile(data.eventCatalog, DATA_FILE_NAMES.eventCatalog, issues);
  const resultWritebackRules = requireFile(data.resultWritebackRules, DATA_FILE_NAMES.resultWritebackRules, issues);
  const frequencyBudget = requireFile(data.frequencyBudget, DATA_FILE_NAMES.frequencyBudget, issues);

  if (
    modeDefinitions === undefined ||
    triggerRules === undefined ||
    eventCatalog === undefined ||
    resultWritebackRules === undefined ||
    frequencyBudget === undefined
  ) {
    return issues;
  }

  validateVersion(DATA_FILE_NAMES.modeDefinitions, modeDefinitions.version, issues);
  validateVersion(DATA_FILE_NAMES.triggerRules, triggerRules.version, issues);
  validateVersion(DATA_FILE_NAMES.eventCatalog, eventCatalog.version, issues);
  validateVersion(DATA_FILE_NAMES.resultWritebackRules, resultWritebackRules.version, issues);
  validateVersion(DATA_FILE_NAMES.frequencyBudget, frequencyBudget.version, issues);

  const modeIds = validateModes(modeDefinitions.modes, issues);
  const writebackIds = validateWritebackRules(resultWritebackRules.rules, issues);
  validateInterludes(eventCatalog.interludes, modeIds, writebackIds, issues);
  validateTriggerRules(triggerRules, modeIds, issues);
  validateFrequencyBudget(frequencyBudget, modeIds, issues);

  return issues;
}

function validateModes(
  modesValue: readonly LifeInterludeModeDefinition[] | undefined,
  issues: string[]
): ReadonlySet<string> {
  const ids = new Set<string>();
  const modes = requireNonEmptyArray("interlude_mode_definitions.modes", modesValue, issues);
  for (const [index, mode] of modes.entries()) {
    const path = `interlude_mode_definitions.modes[${index}]`;
    validateUniqueId(mode.id, ids, "life interlude mode id", `${path}.id`, issues);
    validateMode(`${path}.id`, mode.id, issues);
    validateNonEmptyString(`${path}.name`, mode.name, issues);
    validateNonEmptyString(`${path}.displayName`, mode.displayName, issues);
    validateStringArray(`${path}.worldWrappers`, mode.worldWrappers, issues);
    validateAgeRange(`${path}.recommendedAgeRange`, mode.recommendedAgeRange, issues);
    if (mode.defaultDurationSeconds !== undefined) {
      validatePositiveNumber(`${path}.defaultDurationSeconds`, mode.defaultDurationSeconds, issues);
    }
    if (mode.defaultTurnLimit !== undefined) {
      validateNonNegativeInteger(`${path}.defaultTurnLimit`, mode.defaultTurnLimit, issues);
    }
    validateStringArray(`${path}.resultMetrics`, mode.resultMetrics, issues);
    validateStringArray(`${path}.primaryRewards`, mode.primaryRewards, issues);
  }
  return ids;
}

function validateInterludes(
  interludesValue: readonly LifeInterludeDefinition[] | undefined,
  modeIds: ReadonlySet<string>,
  writebackIds: ReadonlySet<string>,
  issues: string[]
): ReadonlySet<string> {
  const ids = new Set<string>();
  const interludes = requireNonEmptyArray("interlude_event_catalog.interludes", interludesValue, issues);
  for (const [index, interlude] of interludes.entries()) {
    const path = `interlude_event_catalog.interludes[${index}]`;
    validateUniqueId(interlude.id, ids, "life interlude id", `${path}.id`, issues);
    validateNonEmptyString(`${path}.name`, interlude.name, issues);
    if (!modeIds.has(interlude.mode)) {
      issues.push(`${path}.mode references missing mode: ${String(interlude.mode)}`);
    }
    validateMode(`${path}.mode`, interlude.mode, issues);
    validateRealityLayer(`${path}.realityLayer`, interlude.realityLayer, issues);
    validateAgeRange(`${path}.ageRange`, interlude.ageRange, issues);
    validatePositiveNumber(`${path}.baseWeight`, interlude.baseWeight, issues);
    validateStringArray(`${path}.storylineTags`, interlude.storylineTags, issues);
    validateStringArray(`${path}.threadTags`, interlude.threadTags, issues);
    validateOptionalStringArray(`${path}.requiredHooks`, interlude.requiredHooks, issues);
    validateOptionalStringArray(`${path}.preferredRoots`, interlude.preferredRoots, issues);
    validateOptionalStringArray(`${path}.preferredDestinies`, interlude.preferredDestinies, issues);
    validateOptionalStringArray(`${path}.preferredOrigins`, interlude.preferredOrigins, issues);
    validateOptionalStringArray(`${path}.preferredItems`, interlude.preferredItems, issues);
    validateDifficulty(`${path}.difficultyTier`, interlude.difficultyTier, issues);
    if (interlude.durationTargetSeconds !== undefined) {
      validatePositiveNumber(`${path}.durationTargetSeconds`, interlude.durationTargetSeconds, issues);
    }
    if (interlude.turnLimit !== undefined) {
      validateNonNegativeInteger(`${path}.turnLimit`, interlude.turnLimit, issues);
    }
    validateNonEmptyString(`${path}.description`, interlude.description, issues);
    validateNonEmptyString(`${path}.worldExplanation`, interlude.worldExplanation, issues);
    validateNonEmptyString(`${path}.rewardProfileId`, interlude.rewardProfileId, issues);
    validateNonEmptyString(`${path}.failurePolicyId`, interlude.failurePolicyId, issues);
    validateNonEmptyString(`${path}.resultWritebackId`, interlude.resultWritebackId, issues);
    if (typeof interlude.resultWritebackId === "string" && !writebackIds.has(interlude.resultWritebackId)) {
      issues.push(`${path}.resultWritebackId references missing writeback rule: ${interlude.resultWritebackId}`);
    }
  }
  return ids;
}

function validateWritebackRules(
  rulesValue: readonly LifeInterludeResultWritebackRule[] | undefined,
  issues: string[]
): ReadonlySet<string> {
  const ids = new Set<string>();
  const rules = requireNonEmptyArray("interlude_result_writeback_rules.rules", rulesValue, issues);
  for (const [index, rule] of rules.entries()) {
    const path = `interlude_result_writeback_rules.rules[${index}]`;
    validateUniqueId(rule.id, ids, "life interlude writeback rule id", `${path}.id`, issues);
    validateWritebackOutcomes(`${path}.outcomes`, rule.outcomes, issues);
  }
  return ids;
}

function validateWritebackOutcomes(
  path: string,
  outcomes: Partial<Record<LifeInterludeOutcome, readonly LifeInterludeWritebackEffect[]>> | undefined,
  issues: string[]
): void {
  if (outcomes === undefined || outcomes === null || Array.isArray(outcomes) || typeof outcomes !== "object") {
    issues.push(`${path} must be an object`);
    return;
  }
  for (const [outcome, effects] of Object.entries(outcomes)) {
    if (!LEGAL_OUTCOMES.has(outcome as LifeInterludeOutcome)) {
      issues.push(`${path}.${outcome} is not legal`);
      continue;
    }
    const effectList = requireArray(`${path}.${outcome}`, effects, issues);
    for (const [index, effect] of effectList.entries()) {
      validateWritebackEffect(`${path}.${outcome}[${index}]`, effect, issues);
    }
  }
}

function validateWritebackEffect(path: string, effect: LifeInterludeWritebackEffect, issues: string[]): void {
  if (effect === undefined || effect === null || Array.isArray(effect) || typeof effect !== "object") {
    issues.push(`${path} must be an object`);
    return;
  }
  if (!LEGAL_EFFECT_TYPES.has(effect.type)) {
    issues.push(`${path}.type is not legal: ${String(effect.type)}`);
    return;
  }
  switch (effect.type) {
    case "modifyStat":
      validateNonEmptyString(`${path}.stat`, effect.stat, issues);
      validateFiniteNumber(`${path}.amount`, effect.amount, issues);
      break;
    case "addWound":
      validateNonEmptyString(`${path}.woundId`, effect.woundId, issues);
      validateFiniteNumber(`${path}.severity`, effect.severity, issues);
      break;
    case "addHeartKnot":
      validateNonEmptyString(`${path}.knotId`, effect.knotId, issues);
      validateFiniteNumber(`${path}.severity`, effect.severity, issues);
      break;
    case "modifyHiddenFateProgress":
      validateNonEmptyString(`${path}.hiddenFateId`, effect.hiddenFateId, issues);
      validateFiniteNumber(`${path}.amount`, effect.amount, issues);
      validateNonEmptyString(`${path}.visibleHint`, effect.visibleHint, issues);
      break;
    case "modifyCarriedItemAffinity":
      validateNonEmptyString(`${path}.itemId`, effect.itemId, issues);
      validateFiniteNumber(`${path}.amount`, effect.amount, issues);
      break;
    case "modifyStorylineScore":
      validateNonEmptyString(`${path}.storylineId`, effect.storylineId, issues);
      validateFiniteNumber(`${path}.amount`, effect.amount, issues);
      break;
    case "modifyThreadProgress":
      validateNonEmptyString(`${path}.threadId`, effect.threadId, issues);
      validateFiniteNumber(`${path}.progress`, effect.progress, issues);
      if (effect.tension !== undefined) {
        validateFiniteNumber(`${path}.tension`, effect.tension, issues);
      }
      break;
    case "modifyKarmaMerit":
      if (effect.karma === undefined && effect.merit === undefined) {
        issues.push(`${path} must define karma or merit`);
      }
      if (effect.karma !== undefined) {
        validateFiniteNumber(`${path}.karma`, effect.karma, issues);
      }
      if (effect.merit !== undefined) {
        validateFiniteNumber(`${path}.merit`, effect.merit, issues);
      }
      break;
    case "addAge18Hook":
      validateNonEmptyString(`${path}.hookId`, effect.hookId, issues);
      if (effect.amount !== undefined) {
        validateFiniteNumber(`${path}.amount`, effect.amount, issues);
      }
      break;
    case "addLifeLog":
      validateNonEmptyString(`${path}.text`, effect.text, issues);
      break;
  }
}

function validateTriggerRules(
  rules: LifeInterludeTriggerRulesDataFile,
  modeIds: ReadonlySet<string>,
  issues: string[]
): void {
  validateNonEmptyString("interlude_trigger_rules.weightFormula", rules.weightFormula, issues);
  const modePreferenceRules = requireNonEmptyArray(
    "interlude_trigger_rules.modePreferenceRules",
    rules.modePreferenceRules,
    issues
  );
  for (const [index, rule] of modePreferenceRules.entries()) {
    const path = `interlude_trigger_rules.modePreferenceRules[${index}]`;
    validateModeReference(`${path}.mode`, rule.mode, modeIds, issues);
    validateStringArray(`${path}.preferredTags`, rule.preferredTags, issues);
    validateNonNegativeInteger(`${path}.ageMinMonths`, rule.ageMinMonths, issues);
  }
  const ageHardRules = requireNonEmptyArray("interlude_trigger_rules.ageHardRules", rules.ageHardRules, issues);
  for (const [index, rule] of ageHardRules.entries()) {
    const path = `interlude_trigger_rules.ageHardRules[${index}]`;
    validateAgeRange(`${path}.ageMonths`, rule.ageMonths, issues);
    validateModeReferenceArray(`${path}.allowedModes`, rule.allowedModes, modeIds, issues);
    if (rule.maxDifficulty !== undefined) {
      validateDifficulty(`${path}.maxDifficulty`, rule.maxDifficulty, issues);
    }
    if (rule.note !== undefined) {
      validateNonEmptyString(`${path}.note`, rule.note, issues);
    }
  }
}

function validateFrequencyBudget(
  budget: LifeInterludeFrequencyBudgetDataFile,
  modeIds: ReadonlySet<string>,
  issues: string[]
): void {
  validatePositiveInteger("interlude_frequency_budget.lifetimeHalfYearChoices", budget.lifetimeHalfYearChoices, issues);
  validateManualTargetBudget("interlude_frequency_budget.targetManualPlayableInterludes", budget.targetManualPlayableInterludes, issues);
  const phases = requireNonEmptyArray("interlude_frequency_budget.agePhaseBudgets", budget.agePhaseBudgets, issues);
  for (const [index, phase] of phases.entries()) {
    const path = `interlude_frequency_budget.agePhaseBudgets[${index}]`;
    if (!LEGAL_LIFE_PHASES.has(phase.phaseId)) {
      issues.push(`${path}.phaseId is not legal: ${String(phase.phaseId)}`);
    }
    validateAgeRange(`${path}.ageMonths`, phase.ageMonths, issues);
    validateNonNegativeInteger(`${path}.maxPlayableInterludes`, phase.maxPlayableInterludes, issues);
    validateModeReferenceArray(`${path}.allowedModes`, phase.allowedModes, modeIds, issues);
    if (phase.maxDifficulty !== undefined) {
      validateDifficulty(`${path}.maxDifficulty`, phase.maxDifficulty, issues);
    }
  }
  validatePositiveInteger("interlude_frequency_budget.cooldowns.sameModeMonths", budget.cooldowns?.sameModeMonths, issues);
  validatePositiveInteger("interlude_frequency_budget.cooldowns.sameThreadMonths", budget.cooldowns?.sameThreadMonths, issues);
  validatePositiveInteger(
    "interlude_frequency_budget.cooldowns.coreStorylineInterludeMonths",
    budget.cooldowns?.coreStorylineInterludeMonths,
    issues
  );
  const fatigue = requireNonEmptyArray("interlude_frequency_budget.fatigue", budget.fatigue, issues);
  for (const [index, rule] of fatigue.entries()) {
    const path = `interlude_frequency_budget.fatigue[${index}]`;
    validateAgeRange(`${path}.recentPlayableInterludesLast24Months`, rule.recentPlayableInterludesLast24Months, issues);
    validateFiniteNumber(`${path}.weightMultiplier`, rule.weightMultiplier, issues);
  }
  validateOutcome(
    "interlude_frequency_budget.autoResolveRules.manualMaxOutcome",
    budget.autoResolveRules?.manualMaxOutcome,
    issues
  );
  validateOutcome(
    "interlude_frequency_budget.autoResolveRules.autoResolveMaxOutcome",
    budget.autoResolveRules?.autoResolveMaxOutcome,
    issues
  );
  if (!LEGAL_ABANDON_DEFAULT_OUTCOMES.has(String(budget.autoResolveRules?.abandonDefaultOutcome))) {
    issues.push(
      `interlude_frequency_budget.autoResolveRules.abandonDefaultOutcome is not legal: ${String(budget.autoResolveRules?.abandonDefaultOutcome)}`
    );
  }
}

function validateManualTargetBudget(
  path: string,
  value: LifeInterludeFrequencyBudgetDataFile["targetManualPlayableInterludes"] | undefined,
  issues: string[]
): void {
  if (value === undefined || value === null || Array.isArray(value) || typeof value !== "object") {
    issues.push(`${path} must be an object`);
    return;
  }
  validateNonNegativeInteger(`${path}.min`, value.min, issues);
  validateNonNegativeInteger(`${path}.target`, value.target, issues);
  validateNonNegativeInteger(`${path}.max`, value.max, issues);
  if (Number.isInteger(value.min) && Number.isInteger(value.target) && value.min > value.target) {
    issues.push(`${path}.min must be <= target`);
  }
  if (Number.isInteger(value.target) && Number.isInteger(value.max) && value.target > value.max) {
    issues.push(`${path}.target must be <= max`);
  }
}

function validateModeReference(path: string, value: unknown, modeIds: ReadonlySet<string>, issues: string[]): void {
  validateMode(path, value, issues);
  if (typeof value === "string" && !modeIds.has(value)) {
    issues.push(`${path} references missing mode: ${value}`);
  }
}

function validateModeReferenceArray(
  path: string,
  valuesValue: readonly LifeInterludeMode[] | undefined,
  modeIds: ReadonlySet<string>,
  issues: string[]
): void {
  const values = requireNonEmptyArray(path, valuesValue, issues);
  for (const [index, mode] of values.entries()) {
    validateModeReference(`${path}[${index}]`, mode, modeIds, issues);
  }
}

function validateMode(path: string, value: unknown, issues: string[]): void {
  if (!LEGAL_MODES.has(value as LifeInterludeMode)) {
    issues.push(`${path} is not legal: ${String(value)}`);
  }
}

function validateRealityLayer(path: string, value: unknown, issues: string[]): void {
  if (!LEGAL_REALITY_LAYERS.has(value as InterludeRealityLayer)) {
    issues.push(`${path} is not legal: ${String(value)}`);
  }
}

function validateDifficulty(path: string, value: unknown, issues: string[]): void {
  if (!LEGAL_DIFFICULTIES.has(value as InterludeDifficultyTier)) {
    issues.push(`${path} is not legal: ${String(value)}`);
  }
}

function validateOutcome(path: string, value: unknown, issues: string[]): void {
  if (!LEGAL_OUTCOMES.has(value as LifeInterludeOutcome)) {
    issues.push(`${path} is not legal: ${String(value)}`);
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

function validateOptionalStringArray(path: string, value: readonly string[] | undefined, issues: string[]): void {
  if (value !== undefined) {
    validateStringArray(path, value, issues);
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

function validatePositiveNumber(path: string, value: unknown, issues: string[]): void {
  validateFiniteNumber(path, value, issues);
  if (typeof value === "number" && value <= 0) {
    issues.push(`${path} must be > 0`);
  }
}

function validateNonNegativeInteger(path: string, value: unknown, issues: string[]): void {
  if (!Number.isInteger(value)) {
    issues.push(`${path} must be an integer`);
    return;
  }
  if (typeof value === "number" && value < 0) {
    issues.push(`${path} must be >= 0`);
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

function requireArray<T>(path: string, value: readonly T[] | undefined, issues: string[]): readonly T[] {
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array`);
    return [];
  }
  return value;
}

function requireFile<T>(file: T | undefined, name: string, issues: string[]): T | undefined {
  if (file === undefined || file === null) {
    issues.push(`Missing life interlude data file: ${name}`);
    return undefined;
  }
  return file;
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
