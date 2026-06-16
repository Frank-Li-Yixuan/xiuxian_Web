#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "data/life_interludes");
const supportedVersion = "0.1";

const fileNames = {
  modeDefinitions: "interlude_mode_definitions.v0.1.json",
  triggerRules: "interlude_trigger_rules.v0.1.json",
  eventCatalog: "interlude_event_catalog.v0.1.json",
  resultWritebackRules: "interlude_result_writeback_rules.v0.1.json",
  frequencyBudget: "interlude_frequency_budget.v0.1.json"
};

const legalModes = new Set(["stg", "horde", "deckbuilder", "formation_auto", "text_check"]);
const legalRealityLayers = new Set(["real_event", "dream", "training", "spirit_projection", "system_preview"]);
const legalDifficulties = new Set(["safe", "steady", "risky", "dangerous", "forbidden", "destiny"]);
const legalOutcomes = new Set(["failure", "partialSuccess", "success", "greatSuccess", "hiddenSuccess", "abandon"]);
const legalAbandonDefaultOutcomes = new Set([...legalOutcomes, "partialSuccessOrFailure"]);
const legalLifePhases = new Set(["infancy", "childhood", "youth", "adolescence", "awakening"]);
const legalEffectTypes = new Set([
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

function readJson(name) {
  const filePath = path.join(dataDir, name);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing life interlude data file: ${name}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function validateLifeInterludeData(data) {
  const issues = [];
  const modeDefinitions = requireFile(data.modeDefinitions, "interlude_mode_definitions", issues);
  const triggerRules = requireFile(data.triggerRules, "interlude_trigger_rules", issues);
  const eventCatalog = requireFile(data.eventCatalog, "interlude_event_catalog", issues);
  const resultWritebackRules = requireFile(data.resultWritebackRules, "interlude_result_writeback_rules", issues);
  const frequencyBudget = requireFile(data.frequencyBudget, "interlude_frequency_budget", issues);

  if (!modeDefinitions || !triggerRules || !eventCatalog || !resultWritebackRules || !frequencyBudget) {
    return issues;
  }

  validateVersion("interlude_mode_definitions", modeDefinitions.version, issues);
  validateVersion("interlude_trigger_rules", triggerRules.version, issues);
  validateVersion("interlude_event_catalog", eventCatalog.version, issues);
  validateVersion("interlude_result_writeback_rules", resultWritebackRules.version, issues);
  validateVersion("interlude_frequency_budget", frequencyBudget.version, issues);

  const modeIds = validateModes(modeDefinitions.modes, issues);
  const writebackIds = validateWritebackRules(resultWritebackRules.rules, issues);
  validateInterludes(eventCatalog.interludes, modeIds, writebackIds, issues);
  validateTriggerRules(triggerRules, modeIds, issues);
  validateFrequencyBudget(frequencyBudget, modeIds, issues);
  return issues;
}

function validateModes(value, issues) {
  const ids = new Set();
  const modes = requireNonEmptyArray("interlude_mode_definitions.modes", value, issues);
  for (const [index, mode] of modes.entries()) {
    const pathName = `interlude_mode_definitions.modes[${index}]`;
    validateUniqueId(mode?.id, ids, "life interlude mode id", `${pathName}.id`, issues);
    validateMode(`${pathName}.id`, mode?.id, issues);
    validateNonEmptyString(`${pathName}.name`, mode?.name, issues);
    validateNonEmptyString(`${pathName}.displayName`, mode?.displayName, issues);
    validateStringArray(`${pathName}.worldWrappers`, mode?.worldWrappers, issues);
    validateAgeRange(`${pathName}.recommendedAgeRange`, mode?.recommendedAgeRange, issues);
    if (mode?.defaultDurationSeconds !== undefined) {
      validatePositiveNumber(`${pathName}.defaultDurationSeconds`, mode.defaultDurationSeconds, issues);
    }
    if (mode?.defaultTurnLimit !== undefined) {
      validateNonNegativeInteger(`${pathName}.defaultTurnLimit`, mode.defaultTurnLimit, issues);
    }
    validateStringArray(`${pathName}.resultMetrics`, mode?.resultMetrics, issues);
    validateStringArray(`${pathName}.primaryRewards`, mode?.primaryRewards, issues);
  }
  return ids;
}

function validateInterludes(value, modeIds, writebackIds, issues) {
  const ids = new Set();
  const interludes = requireNonEmptyArray("interlude_event_catalog.interludes", value, issues);
  for (const [index, interlude] of interludes.entries()) {
    const pathName = `interlude_event_catalog.interludes[${index}]`;
    validateUniqueId(interlude?.id, ids, "life interlude id", `${pathName}.id`, issues);
    validateNonEmptyString(`${pathName}.name`, interlude?.name, issues);
    validateModeReference(`${pathName}.mode`, interlude?.mode, modeIds, issues);
    validateRealityLayer(`${pathName}.realityLayer`, interlude?.realityLayer, issues);
    validateAgeRange(`${pathName}.ageRange`, interlude?.ageRange, issues);
    validatePositiveNumber(`${pathName}.baseWeight`, interlude?.baseWeight, issues);
    validateStringArray(`${pathName}.storylineTags`, interlude?.storylineTags, issues);
    validateStringArray(`${pathName}.threadTags`, interlude?.threadTags, issues);
    validateOptionalStringArray(`${pathName}.requiredHooks`, interlude?.requiredHooks, issues);
    validateOptionalStringArray(`${pathName}.preferredRoots`, interlude?.preferredRoots, issues);
    validateOptionalStringArray(`${pathName}.preferredDestinies`, interlude?.preferredDestinies, issues);
    validateOptionalStringArray(`${pathName}.preferredOrigins`, interlude?.preferredOrigins, issues);
    validateOptionalStringArray(`${pathName}.preferredItems`, interlude?.preferredItems, issues);
    validateDifficulty(`${pathName}.difficultyTier`, interlude?.difficultyTier, issues);
    if (interlude?.durationTargetSeconds !== undefined) {
      validatePositiveNumber(`${pathName}.durationTargetSeconds`, interlude.durationTargetSeconds, issues);
    }
    if (interlude?.turnLimit !== undefined) {
      validateNonNegativeInteger(`${pathName}.turnLimit`, interlude.turnLimit, issues);
    }
    validateNonEmptyString(`${pathName}.description`, interlude?.description, issues);
    validateNonEmptyString(`${pathName}.worldExplanation`, interlude?.worldExplanation, issues);
    validateNonEmptyString(`${pathName}.rewardProfileId`, interlude?.rewardProfileId, issues);
    validateNonEmptyString(`${pathName}.failurePolicyId`, interlude?.failurePolicyId, issues);
    validateNonEmptyString(`${pathName}.resultWritebackId`, interlude?.resultWritebackId, issues);
    if (typeof interlude?.resultWritebackId === "string" && !writebackIds.has(interlude.resultWritebackId)) {
      issues.push(`${pathName}.resultWritebackId references missing writeback rule: ${interlude.resultWritebackId}`);
    }
  }
  return ids;
}

function validateWritebackRules(value, issues) {
  const ids = new Set();
  const rules = requireNonEmptyArray("interlude_result_writeback_rules.rules", value, issues);
  for (const [index, rule] of rules.entries()) {
    const pathName = `interlude_result_writeback_rules.rules[${index}]`;
    validateUniqueId(rule?.id, ids, "life interlude writeback rule id", `${pathName}.id`, issues);
    validateWritebackOutcomes(`${pathName}.outcomes`, rule?.outcomes, issues);
  }
  return ids;
}

function validateWritebackOutcomes(pathName, outcomes, issues) {
  if (outcomes === undefined || outcomes === null || Array.isArray(outcomes) || typeof outcomes !== "object") {
    issues.push(`${pathName} must be an object`);
    return;
  }
  for (const [outcome, effects] of Object.entries(outcomes)) {
    if (!legalOutcomes.has(outcome)) {
      issues.push(`${pathName}.${outcome} is not legal`);
      continue;
    }
    const effectList = requireArray(`${pathName}.${outcome}`, effects, issues);
    for (const [index, effect] of effectList.entries()) {
      validateWritebackEffect(`${pathName}.${outcome}[${index}]`, effect, issues);
    }
  }
}

function validateWritebackEffect(pathName, effect, issues) {
  if (effect === undefined || effect === null || Array.isArray(effect) || typeof effect !== "object") {
    issues.push(`${pathName} must be an object`);
    return;
  }
  if (!legalEffectTypes.has(effect.type)) {
    issues.push(`${pathName}.type is not legal: ${String(effect.type)}`);
    return;
  }
  switch (effect.type) {
    case "modifyStat":
      validateNonEmptyString(`${pathName}.stat`, effect.stat, issues);
      validateFiniteNumber(`${pathName}.amount`, effect.amount, issues);
      break;
    case "addWound":
      validateNonEmptyString(`${pathName}.woundId`, effect.woundId, issues);
      validateFiniteNumber(`${pathName}.severity`, effect.severity, issues);
      break;
    case "addHeartKnot":
      validateNonEmptyString(`${pathName}.knotId`, effect.knotId, issues);
      validateFiniteNumber(`${pathName}.severity`, effect.severity, issues);
      break;
    case "modifyHiddenFateProgress":
      validateNonEmptyString(`${pathName}.hiddenFateId`, effect.hiddenFateId, issues);
      validateFiniteNumber(`${pathName}.amount`, effect.amount, issues);
      validateNonEmptyString(`${pathName}.visibleHint`, effect.visibleHint, issues);
      break;
    case "modifyCarriedItemAffinity":
      validateNonEmptyString(`${pathName}.itemId`, effect.itemId, issues);
      validateFiniteNumber(`${pathName}.amount`, effect.amount, issues);
      break;
    case "modifyStorylineScore":
      validateNonEmptyString(`${pathName}.storylineId`, effect.storylineId, issues);
      validateFiniteNumber(`${pathName}.amount`, effect.amount, issues);
      break;
    case "modifyThreadProgress":
      validateNonEmptyString(`${pathName}.threadId`, effect.threadId, issues);
      validateFiniteNumber(`${pathName}.progress`, effect.progress, issues);
      if (effect.tension !== undefined) {
        validateFiniteNumber(`${pathName}.tension`, effect.tension, issues);
      }
      break;
    case "modifyKarmaMerit":
      if (effect.karma === undefined && effect.merit === undefined) {
        issues.push(`${pathName} must define karma or merit`);
      }
      if (effect.karma !== undefined) {
        validateFiniteNumber(`${pathName}.karma`, effect.karma, issues);
      }
      if (effect.merit !== undefined) {
        validateFiniteNumber(`${pathName}.merit`, effect.merit, issues);
      }
      break;
    case "addAge18Hook":
      validateNonEmptyString(`${pathName}.hookId`, effect.hookId, issues);
      if (effect.amount !== undefined) {
        validateFiniteNumber(`${pathName}.amount`, effect.amount, issues);
      }
      break;
    case "addLifeLog":
      validateNonEmptyString(`${pathName}.text`, effect.text, issues);
      break;
  }
}

function validateTriggerRules(rules, modeIds, issues) {
  validateNonEmptyString("interlude_trigger_rules.weightFormula", rules.weightFormula, issues);
  const modePreferenceRules = requireNonEmptyArray(
    "interlude_trigger_rules.modePreferenceRules",
    rules.modePreferenceRules,
    issues
  );
  for (const [index, rule] of modePreferenceRules.entries()) {
    const pathName = `interlude_trigger_rules.modePreferenceRules[${index}]`;
    validateModeReference(`${pathName}.mode`, rule?.mode, modeIds, issues);
    validateStringArray(`${pathName}.preferredTags`, rule?.preferredTags, issues);
    validateNonNegativeInteger(`${pathName}.ageMinMonths`, rule?.ageMinMonths, issues);
  }
  const ageHardRules = requireNonEmptyArray("interlude_trigger_rules.ageHardRules", rules.ageHardRules, issues);
  for (const [index, rule] of ageHardRules.entries()) {
    const pathName = `interlude_trigger_rules.ageHardRules[${index}]`;
    validateAgeRange(`${pathName}.ageMonths`, rule?.ageMonths, issues);
    validateModeReferenceArray(`${pathName}.allowedModes`, rule?.allowedModes, modeIds, issues);
    if (rule?.maxDifficulty !== undefined) {
      validateDifficulty(`${pathName}.maxDifficulty`, rule.maxDifficulty, issues);
    }
    if (rule?.note !== undefined) {
      validateNonEmptyString(`${pathName}.note`, rule.note, issues);
    }
  }
}

function validateFrequencyBudget(budget, modeIds, issues) {
  validatePositiveInteger("interlude_frequency_budget.lifetimeHalfYearChoices", budget.lifetimeHalfYearChoices, issues);
  validateManualTargetBudget(
    "interlude_frequency_budget.targetManualPlayableInterludes",
    budget.targetManualPlayableInterludes,
    issues
  );
  const phases = requireNonEmptyArray("interlude_frequency_budget.agePhaseBudgets", budget.agePhaseBudgets, issues);
  for (const [index, phase] of phases.entries()) {
    const pathName = `interlude_frequency_budget.agePhaseBudgets[${index}]`;
    if (!legalLifePhases.has(phase?.phaseId)) {
      issues.push(`${pathName}.phaseId is not legal: ${String(phase?.phaseId)}`);
    }
    validateAgeRange(`${pathName}.ageMonths`, phase?.ageMonths, issues);
    validateNonNegativeInteger(`${pathName}.maxPlayableInterludes`, phase?.maxPlayableInterludes, issues);
    validateModeReferenceArray(`${pathName}.allowedModes`, phase?.allowedModes, modeIds, issues);
    if (phase?.maxDifficulty !== undefined) {
      validateDifficulty(`${pathName}.maxDifficulty`, phase.maxDifficulty, issues);
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
    const pathName = `interlude_frequency_budget.fatigue[${index}]`;
    validateAgeRange(`${pathName}.recentPlayableInterludesLast24Months`, rule?.recentPlayableInterludesLast24Months, issues);
    validateFiniteNumber(`${pathName}.weightMultiplier`, rule?.weightMultiplier, issues);
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
  if (!legalAbandonDefaultOutcomes.has(String(budget.autoResolveRules?.abandonDefaultOutcome))) {
    issues.push(
      `interlude_frequency_budget.autoResolveRules.abandonDefaultOutcome is not legal: ${String(
        budget.autoResolveRules?.abandonDefaultOutcome
      )}`
    );
  }
}

function validateManualTargetBudget(pathName, value, issues) {
  if (value === undefined || value === null || Array.isArray(value) || typeof value !== "object") {
    issues.push(`${pathName} must be an object`);
    return;
  }
  validateNonNegativeInteger(`${pathName}.min`, value.min, issues);
  validateNonNegativeInteger(`${pathName}.target`, value.target, issues);
  validateNonNegativeInteger(`${pathName}.max`, value.max, issues);
  if (Number.isInteger(value.min) && Number.isInteger(value.target) && value.min > value.target) {
    issues.push(`${pathName}.min must be <= target`);
  }
  if (Number.isInteger(value.target) && Number.isInteger(value.max) && value.target > value.max) {
    issues.push(`${pathName}.target must be <= max`);
  }
}

function validateModeReference(pathName, value, modeIds, issues) {
  validateMode(pathName, value, issues);
  if (typeof value === "string" && !modeIds.has(value)) {
    issues.push(`${pathName} references missing mode: ${value}`);
  }
}

function validateModeReferenceArray(pathName, value, modeIds, issues) {
  const values = requireNonEmptyArray(pathName, value, issues);
  for (const [index, mode] of values.entries()) {
    validateModeReference(`${pathName}[${index}]`, mode, modeIds, issues);
  }
}

function validateMode(pathName, value, issues) {
  if (!legalModes.has(value)) {
    issues.push(`${pathName} is not legal: ${String(value)}`);
  }
}

function validateRealityLayer(pathName, value, issues) {
  if (!legalRealityLayers.has(value)) {
    issues.push(`${pathName} is not legal: ${String(value)}`);
  }
}

function validateDifficulty(pathName, value, issues) {
  if (!legalDifficulties.has(value)) {
    issues.push(`${pathName} is not legal: ${String(value)}`);
  }
}

function validateOutcome(pathName, value, issues) {
  if (!legalOutcomes.has(value)) {
    issues.push(`${pathName} is not legal: ${String(value)}`);
  }
}

function validateVersion(fileName, version, issues) {
  if (version !== supportedVersion) {
    issues.push(`${fileName}.version must be "${supportedVersion}"`);
  }
}

function validateUniqueId(value, seen, label, pathName, issues) {
  if (typeof value !== "string" || value.length === 0) {
    issues.push(`${pathName} must not be empty`);
    return;
  }
  if (seen.has(value)) {
    issues.push(`duplicate ${label}: ${value}`);
    return;
  }
  seen.add(value);
}

function validateStringArray(pathName, value, issues) {
  const values = requireNonEmptyArray(pathName, value, issues);
  for (const [index, item] of values.entries()) {
    validateNonEmptyString(`${pathName}[${index}]`, item, issues);
  }
}

function validateOptionalStringArray(pathName, value, issues) {
  if (value !== undefined) {
    validateStringArray(pathName, value, issues);
  }
}

function validateAgeRange(pathName, value, issues) {
  if (!Array.isArray(value) || value.length !== 2 || !Number.isInteger(value[0]) || !Number.isInteger(value[1])) {
    issues.push(`${pathName} must be a [min, max] integer tuple`);
    return;
  }
  if (value[0] < 0 || value[1] < 0) {
    issues.push(`${pathName} must be non-negative`);
  }
  if (value[0] > value[1]) {
    issues.push(`${pathName} min must be <= max`);
  }
}

function validateNonEmptyString(pathName, value, issues) {
  if (typeof value !== "string" || value.length === 0) {
    issues.push(`${pathName} must not be empty`);
  }
}

function validateFiniteNumber(pathName, value, issues) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push(`${pathName} must be a finite number`);
  }
}

function validatePositiveNumber(pathName, value, issues) {
  validateFiniteNumber(pathName, value, issues);
  if (typeof value === "number" && value <= 0) {
    issues.push(`${pathName} must be > 0`);
  }
}

function validateNonNegativeInteger(pathName, value, issues) {
  if (!Number.isInteger(value)) {
    issues.push(`${pathName} must be an integer`);
    return;
  }
  if (typeof value === "number" && value < 0) {
    issues.push(`${pathName} must be >= 0`);
  }
}

function validatePositiveInteger(pathName, value, issues) {
  if (!Number.isInteger(value)) {
    issues.push(`${pathName} must be an integer`);
    return;
  }
  if (typeof value === "number" && value <= 0) {
    issues.push(`${pathName} must be > 0`);
  }
}

function requireNonEmptyArray(pathName, value, issues) {
  if (!Array.isArray(value)) {
    issues.push(`${pathName} must be an array`);
    return [];
  }
  if (value.length === 0) {
    issues.push(`${pathName} must contain at least one item`);
  }
  return value;
}

function requireArray(pathName, value, issues) {
  if (!Array.isArray(value)) {
    issues.push(`${pathName} must be an array`);
    return [];
  }
  return value;
}

function requireFile(file, name, issues) {
  if (file === undefined || file === null) {
    issues.push(`Missing life interlude data file: ${name}`);
    return undefined;
  }
  return file;
}

try {
  const data = {
    modeDefinitions: readJson(fileNames.modeDefinitions),
    triggerRules: readJson(fileNames.triggerRules),
    eventCatalog: readJson(fileNames.eventCatalog),
    resultWritebackRules: readJson(fileNames.resultWritebackRules),
    frequencyBudget: readJson(fileNames.frequencyBudget)
  };
  const errors = validateLifeInterludeData(data);
  if (errors.length > 0) {
    console.error(`Life interlude data validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
    process.exit(1);
  }
  console.log(
    `Life interlude data validation passed: ${data.modeDefinitions.modes.length} modes, ${data.eventCatalog.interludes.length} interludes, ${data.resultWritebackRules.rules.length} writeback rules.`
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
