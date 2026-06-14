#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const supportedVersion = "0.1";
const base = path.join(root, "data", "life_storylines");
const files = {
  storylineDefinitions: "storyline_definitions.v0.1.json",
  eventThreads: "event_threads.v0.1.json",
  storylineScoringRules: "storyline_scoring_rules.v0.1.json"
};
const legalLifePhases = new Set(["infancy", "childhood", "youth", "adolescence", "awakening"]);
const legalTrialModes = new Set(["stg", "horde", "deckbuilder", "autochess", "text"]);
const legalSignalSources = new Set([
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
const legalStageDefinitionStages = new Set(["seed", "omen", "development", "crisis", "resolution"]);
const requiredStatuses = ["dormant", "hinted", "active", "dominant", "fated"];
const requiredThreadStageThresholds = ["seeded", "hinted", "developing", "crisis", "resolved", "failed"];

const issues = [];
const data = {};

for (const [key, fileName] of Object.entries(files)) {
  const filePath = path.join(base, fileName);
  if (!fs.existsSync(filePath)) {
    issues.push(`${fileName}:file: missing required LST data file at ${filePath}`);
    continue;
  }
  try {
    data[key] = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    issues.push(`${fileName}:json: invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (issues.length === 0) {
  validateVersion("storyline_definitions", data.storylineDefinitions?.version);
  validateVersion("event_threads", data.eventThreads?.version);
  validateVersion("storyline_scoring_rules", data.storylineScoringRules?.version);
  const storylineIds = validateStorylines(data.storylineDefinitions?.storylines);
  const threadIds = validateThreads(data.eventThreads?.eventThreads, storylineIds);
  validateStorylineThreadReferences(data.storylineDefinitions?.storylines, threadIds);
  validateThreadBackReferences(data.eventThreads?.eventThreads, data.storylineDefinitions?.storylines);
  validateScoringRules(data.storylineScoringRules);
}

if (issues.length > 0) {
  console.error("Life storyline data validation failed:");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(
  `Life storyline data validation passed: ${data.storylineDefinitions.storylines.length} storylines, ${data.eventThreads.eventThreads.length} threads.`
);

function validateStorylines(storylinesValue) {
  const ids = new Set();
  const storylines = requireNonEmptyArray("storyline_definitions.storylines", storylinesValue);
  storylines.forEach((storyline, index) => {
    const basePath = `storyline_definitions.storylines[${index}]`;
    uniqueId(`${basePath}.id`, storyline?.id, ids, "life storyline id");
    nonEmptyString(`${basePath}.name`, storyline?.name);
    nonEmptyString(`${basePath}.shortName`, storyline?.shortName);
    nonEmptyString(`${basePath}.description`, storyline?.description);
    finiteNumber(`${basePath}.baseWeight`, storyline?.baseWeight);
    stringArray(`${basePath}.themeTags`, storyline?.themeTags);
    stringArray(`${basePath}.worldContextTags`, storyline?.worldContextTags);
    agePhaseAffinity(`${basePath}.agePhaseAffinity`, storyline?.agePhaseAffinity);
    signalRules(`${basePath}.activationSignals`, storyline?.activationSignals);
    if (storyline?.suppressionSignals !== undefined) {
      signalRules(`${basePath}.suppressionSignals`, storyline.suppressionSignals);
    }
    stringArray(`${basePath}.eventThreadIds`, storyline?.eventThreadIds);
    playInterludeAffinities(`${basePath}.playInterludeAffinities`, storyline?.playInterludeAffinities);
    stringArray(`${basePath}.possibleTransitionHooks`, storyline?.possibleTransitionHooks);
    stringArray(`${basePath}.possibleAge18Hooks`, storyline?.possibleAge18Hooks);
  });
  return ids;
}

function validateThreads(threadsValue, storylineIds) {
  const ids = new Set();
  const threads = requireNonEmptyArray("event_threads.eventThreads", threadsValue);
  threads.forEach((thread, index) => {
    const basePath = `event_threads.eventThreads[${index}]`;
    uniqueId(`${basePath}.id`, thread?.id, ids, "life event thread id");
    nonEmptyString(`${basePath}.storylineId`, thread?.storylineId);
    if (isNonEmptyString(thread?.storylineId) && !storylineIds.has(thread.storylineId)) {
      issues.push(`${basePath}.storylineId references missing storyline: ${thread.storylineId}`);
    }
    nonEmptyString(`${basePath}.name`, thread?.name);
    nonEmptyString(`${basePath}.description`, thread?.description);
    stringArray(`${basePath}.threadTags`, thread?.threadTags);
    signalRules(`${basePath}.triggerSignals`, thread?.triggerSignals);
    stageSequence(`${basePath}.stageSequence`, thread?.stageSequence);
    stringArray(`${basePath}.monthlyEventHooks`, thread?.monthlyEventHooks);
    stringArray(`${basePath}.majorChoiceHooks`, thread?.majorChoiceHooks);
    stringArray(`${basePath}.playInterludeHooks`, thread?.playInterludeHooks);
    stringArray(`${basePath}.resolutionHooks`, thread?.resolutionHooks);
    stringArray(`${basePath}.failureHooks`, thread?.failureHooks);
  });
  return ids;
}

function validateStorylineThreadReferences(storylinesValue, threadIds) {
  const storylines = Array.isArray(storylinesValue) ? storylinesValue : [];
  storylines.forEach((storyline, storylineIndex) => {
    for (const [threadIndex, threadId] of (storyline?.eventThreadIds ?? []).entries()) {
      if (!threadIds.has(threadId)) {
        issues.push(
          `storyline_definitions.storylines[${storylineIndex}].eventThreadIds[${threadIndex}] references missing thread: ${threadId}`
        );
      }
    }
  });
}

function validateThreadBackReferences(threadsValue, storylinesValue) {
  const storylinesById = new Map((Array.isArray(storylinesValue) ? storylinesValue : []).map((storyline) => [storyline.id, storyline]));
  const threads = Array.isArray(threadsValue) ? threadsValue : [];
  threads.forEach((thread, index) => {
    const owner = storylinesById.get(thread?.storylineId);
    if (owner !== undefined && !owner.eventThreadIds.includes(thread.id)) {
      issues.push(`event_threads.eventThreads[${index}].id is not listed by owning storyline ${thread.storylineId}`);
    }
  });
}

function validateScoringRules(rules) {
  for (const status of requiredStatuses) {
    scoreRange(`storyline_scoring_rules.statusThresholds.${status}`, rules?.statusThresholds?.[status]);
    finiteNumber(`storyline_scoring_rules.defaultDecayPerYear.${status}`, rules?.defaultDecayPerYear?.[status]);
  }
  positiveInteger("storyline_scoring_rules.limits.maxDominantStorylines", rules?.limits?.maxDominantStorylines);
  positiveInteger("storyline_scoring_rules.limits.maxFatedStorylines", rules?.limits?.maxFatedStorylines);
  scoreRange("storyline_scoring_rules.limits.targetActiveStorylines", rules?.limits?.targetActiveStorylines);
  nonEmptyString("storyline_scoring_rules.scoreFormula", rules?.scoreFormula);
  for (const stage of requiredThreadStageThresholds) {
    const threshold = rules?.threadStageThresholds?.[stage];
    const pathLabel = `storyline_scoring_rules.threadStageThresholds.${stage}`;
    if (threshold === undefined || threshold === null) {
      issues.push(`${pathLabel} must exist`);
      continue;
    }
    for (const [key, value] of Object.entries(threshold)) {
      if (!["progress", "tension", "clarity", "risk"].includes(key)) {
        issues.push(`${pathLabel}.${key} is not legal`);
      }
      finiteNumber(`${pathLabel}.${key}`, value);
    }
  }
  weightedConditionRules("storyline_scoring_rules.playInterludeCandidateRules", rules?.playInterludeCandidateRules);
  transitionCandidateRules("storyline_scoring_rules.transitionCandidateRules", rules?.transitionCandidateRules);
}

function signalRules(pathLabel, value) {
  const rules = requireNonEmptyArray(pathLabel, value);
  rules.forEach((rule, index) => {
    const rulePath = `${pathLabel}[${index}]`;
    if (!legalSignalSources.has(rule?.source)) {
      issues.push(`${rulePath}.source is not legal: ${String(rule?.source)}`);
    }
    if (rule?.tag === undefined && rule?.stat === undefined) {
      issues.push(`${rulePath} must define tag or stat`);
    }
    if (rule?.tag !== undefined) {
      nonEmptyString(`${rulePath}.tag`, rule.tag);
    }
    if (rule?.stat !== undefined) {
      nonEmptyString(`${rulePath}.stat`, rule.stat);
    }
    finiteNumber(`${rulePath}.weight`, rule?.weight);
    if (rule?.min !== undefined) {
      finiteNumber(`${rulePath}.min`, rule.min);
    }
    if (rule?.max !== undefined) {
      finiteNumber(`${rulePath}.max`, rule.max);
    }
    if (typeof rule?.min === "number" && typeof rule?.max === "number" && rule.min > rule.max) {
      issues.push(`${rulePath}.min must be <= max`);
    }
    if (rule?.note !== undefined) {
      nonEmptyString(`${rulePath}.note`, rule.note);
    }
  });
}

function playInterludeAffinities(pathLabel, value) {
  const affinities = requireNonEmptyArray(pathLabel, value);
  affinities.forEach((affinity, index) => {
    const affinityPath = `${pathLabel}[${index}]`;
    if (!legalTrialModes.has(affinity?.mode)) {
      issues.push(`${affinityPath}.mode is not legal: ${String(affinity?.mode)}`);
    }
    finiteNumber(`${affinityPath}.weight`, affinity?.weight);
    nonEmptyString(`${affinityPath}.hook`, affinity?.hook);
  });
}

function stageSequence(pathLabel, value) {
  const stages = requireNonEmptyArray(pathLabel, value);
  if (stages.length > 0 && stages.length < 3) {
    issues.push(`${pathLabel} must contain at least 3 stages`);
  }
  stages.forEach((stage, index) => {
    const stagePath = `${pathLabel}[${index}]`;
    if (!legalStageDefinitionStages.has(stage?.stage)) {
      issues.push(`${stagePath}.stage is not legal: ${String(stage?.stage)}`);
    }
    ageRange(`${stagePath}.recommendedAgeRange`, stage?.recommendedAgeRange);
    for (const key of ["requiredProgress", "tensionDelta", "clarityDelta", "riskDelta"]) {
      if (stage?.[key] !== undefined) {
        finiteNumber(`${stagePath}.${key}`, stage[key]);
      }
    }
    stringArray(`${stagePath}.monthlyEventTags`, stage?.monthlyEventTags);
    stringArray(`${stagePath}.majorChoiceTags`, stage?.majorChoiceTags);
    stringArray(`${stagePath}.visibleNarrativeHints`, stage?.visibleNarrativeHints);
    if (stage?.hiddenHooks !== undefined) {
      stringArray(`${stagePath}.hiddenHooks`, stage.hiddenHooks);
    }
  });
}

function agePhaseAffinity(pathLabel, value) {
  if (value === undefined || value === null || Array.isArray(value) || typeof value !== "object") {
    issues.push(`${pathLabel} must be an object`);
    return;
  }
  for (const [phase, weight] of Object.entries(value)) {
    if (!legalLifePhases.has(phase)) {
      issues.push(`${pathLabel}.${phase} is not a legal life phase`);
    }
    finiteNumber(`${pathLabel}.${phase}`, weight);
  }
}

function weightedConditionRules(pathLabel, value) {
  const rules = requireNonEmptyArray(pathLabel, value);
  rules.forEach((rule, index) => {
    nonEmptyString(`${pathLabel}[${index}].condition`, rule?.condition);
    finiteNumber(`${pathLabel}[${index}].weight`, rule?.weight);
  });
}

function transitionCandidateRules(pathLabel, value) {
  const rules = requireNonEmptyArray(pathLabel, value);
  rules.forEach((rule, index) => {
    nonEmptyString(`${pathLabel}[${index}].condition`, rule?.condition);
    nonEmptyString(`${pathLabel}[${index}].hookSource`, rule?.hookSource);
  });
}

function scoreRange(pathLabel, value) {
  if (!Array.isArray(value) || value.length !== 2 || !Number.isFinite(value[0]) || !Number.isFinite(value[1])) {
    issues.push(`${pathLabel} must be a [min, max] number tuple`);
    return;
  }
  if (value[0] > value[1]) {
    issues.push(`${pathLabel} min must be <= max`);
  }
}

function ageRange(pathLabel, value) {
  if (!Array.isArray(value) || value.length !== 2 || !Number.isInteger(value[0]) || !Number.isInteger(value[1])) {
    issues.push(`${pathLabel} must be a [min, max] integer tuple`);
    return;
  }
  if (value[0] < 0 || value[1] < 0) {
    issues.push(`${pathLabel} must be non-negative`);
  }
  if (value[0] > value[1]) {
    issues.push(`${pathLabel} min must be <= max`);
  }
}

function validateVersion(fileName, version) {
  if (version !== supportedVersion) {
    issues.push(`${fileName}.version must be "${supportedVersion}"`);
  }
}

function uniqueId(pathLabel, value, seen, label) {
  if (!isNonEmptyString(value)) {
    issues.push(`${pathLabel} must not be empty`);
    return;
  }
  if (seen.has(value)) {
    issues.push(`duplicate ${label}: ${value}`);
    return;
  }
  seen.add(value);
}

function stringArray(pathLabel, value) {
  const values = requireNonEmptyArray(pathLabel, value);
  values.forEach((item, index) => nonEmptyString(`${pathLabel}[${index}]`, item));
}

function nonEmptyString(pathLabel, value) {
  if (!isNonEmptyString(value)) {
    issues.push(`${pathLabel} must not be empty`);
  }
}

function finiteNumber(pathLabel, value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push(`${pathLabel} must be a finite number`);
  }
}

function positiveInteger(pathLabel, value) {
  if (!Number.isInteger(value)) {
    issues.push(`${pathLabel} must be an integer`);
    return;
  }
  if (value <= 0) {
    issues.push(`${pathLabel} must be > 0`);
  }
}

function requireNonEmptyArray(pathLabel, value) {
  if (!Array.isArray(value)) {
    issues.push(`${pathLabel} must be an array`);
    return [];
  }
  if (value.length === 0) {
    issues.push(`${pathLabel} must contain at least one item`);
  }
  return value;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}
