import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const base = path.join(root, "data", "destiny_v2");
const supportedVersion = "0.1";

const files = {
  coreDestinyDefinitions: "core_destiny_definitions.v0.1.json",
  conflictSynergyMutationRules: "conflict_synergy_mutation_rules.v0.1.json",
  lifeManifestationHooks: "life_manifestation_hooks.v0.1.json",
  modeProjectionHooks: "mode_projection_hooks.v0.1.json"
};

const fileLabels = {
  coreDestinyDefinitions: "core_destiny_definitions",
  conflictSynergyMutationRules: "conflict_synergy_mutation_rules",
  lifeManifestationHooks: "life_manifestation_hooks",
  modeProjectionHooks: "mode_projection_hooks"
};

const destinyQualities = new Set(["mortal", "good", "rare", "arcane", "earth", "heaven", "reversal", "forbidden", "flaw"]);
const destinyKinds = new Set(["destiny", "flaw", "mutated"]);
const destinySlots = new Set(["main", "secondary", "flaw", "mutated"]);
const fateAttributes = new Set([
  "jing",
  "qi",
  "shen",
  "rootBone",
  "comprehension",
  "inspiration",
  "fortune",
  "heart",
  "lifespan",
  "merit",
  "karma"
]);
const derivedScores = new Set([
  "talentScore",
  "vesselScore",
  "stabilityScore",
  "destinyPressureScore",
  "lateBloomScore",
  "rebellionScore"
]);
const phases = ["infant_0_3", "child_4_8", "juvenile_9_13", "youth_14_17", "adult_18"];
const effectBuckets = ["lifeSim", "outerBattlefield", "outgame", "horde", "deckbuilder", "autochess"];

const issues = [];
const data = {};
for (const [key, file] of Object.entries(files)) {
  data[key] = readJson(file, issues);
}

if (Object.values(data).every(Boolean)) {
  const destinyIds = validateCoreDestinyDefinitions(data.coreDestinyDefinitions, issues);
  validateConflictSynergyMutationRules(data.conflictSynergyMutationRules, destinyIds, issues);
  validateLifeManifestationHooks(data.lifeManifestationHooks, destinyIds, issues);
  validateModeProjectionHooks(data.modeProjectionHooks, destinyIds, issues);
}

if (issues.length > 0) {
  for (const issue of issues) {
    console.error(issue);
  }
  process.exit(1);
}

console.log(
  [
    "Destiny eligibility data validation passed:",
    "4 files,",
    `destinies=${data.coreDestinyDefinitions.destinies.length},`,
    `hardConflicts=${data.conflictSynergyMutationRules.hardConflicts.length},`,
    `softConflicts=${data.conflictSynergyMutationRules.softConflicts.length},`,
    `synergies=${data.conflictSynergyMutationRules.synergies.length},`,
    `manifestations=${data.lifeManifestationHooks.destinyManifestations.length},`,
    `modeProjections=${data.modeProjectionHooks.projections.length}.`
  ].join(" ")
);

function readJson(file, issues) {
  const fullPath = path.join(base, file);
  if (!fs.existsSync(fullPath)) {
    issues.push(`file:${path.relative(root, fullPath)}: missing required destiny v2 data file`);
    return undefined;
  }
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    issues.push(`file:${path.relative(root, fullPath)}: invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

function validateCoreDestinyDefinitions(file, issues) {
  validateVersion(fileLabels.coreDestinyDefinitions, file.version, issues);
  validateNonEmptyString("core_destiny_definitions.description", file.description, issues);

  const destinyIds = new Set();
  const destinyNames = new Set();
  const destinies = requireNonEmptyArray("core_destiny_definitions.destinies", file.destinies, issues);
  for (const [index, destiny] of destinies.entries()) {
    const itemPath = `core_destiny_definitions.destinies[${index}]`;
    validateUniqueId(destiny.id, destinyIds, "destiny v2 id", `${itemPath}.id`, issues);
    validateUniqueId(destiny.name, destinyNames, "destiny v2 name", `${itemPath}.name`, issues);
    if (!destinyQualities.has(String(destiny.quality))) {
      issues.push(`${itemPath}.quality is not legal: ${String(destiny.quality)}`);
    }
    if (!destinyKinds.has(String(destiny.kind))) {
      issues.push(`${itemPath}.kind is not legal: ${String(destiny.kind)}`);
    }
    validateDestinySlots(`${itemPath}.allowedSlots`, destiny.allowedSlots, issues);
    validateStringArray(`${itemPath}.tags`, destiny.tags, issues);
    validateNonEmptyString(`${itemPath}.oneLine`, destiny.oneLine, issues);
    validateNonEmptyString(`${itemPath}.description`, destiny.description, issues);
    validateEffectsProjection(`${itemPath}.effects`, destiny.effects, issues);
  }

  for (const [index, destiny] of destinies.entries()) {
    const itemPath = `core_destiny_definitions.destinies[${index}]`;
    validateEligibilityRule(`${itemPath}.eligibility`, destiny.eligibility, destinyIds, issues);
    validateMutationRule(`${itemPath}.mutation`, destiny.mutation, destinyIds, issues);
  }

  return destinyIds;
}

function validateConflictSynergyMutationRules(file, destinyIds, issues) {
  validateVersion(fileLabels.conflictSynergyMutationRules, file.version, issues);

  for (const [index, conflict] of requireNonEmptyArray(
    "conflict_synergy_mutation_rules.hardConflicts",
    file.hardConflicts,
    issues
  ).entries()) {
    const itemPath = `conflict_synergy_mutation_rules.hardConflicts[${index}]`;
    validateDestinyReference(`${itemPath}.a`, conflict.a, destinyIds, issues);
    validateDestinyReference(`${itemPath}.b`, conflict.b, destinyIds, issues);
    if (conflict.a === conflict.b) {
      issues.push(`${itemPath} must not conflict a destiny with itself`);
    }
    if (conflict.mutation !== undefined) {
      validateDestinyReference(`${itemPath}.mutation`, conflict.mutation, destinyIds, issues);
    }
    validateNonEmptyString(`${itemPath}.reason`, conflict.reason, issues);
  }

  for (const [index, conflict] of requireNonEmptyArray(
    "conflict_synergy_mutation_rules.softConflicts",
    file.softConflicts,
    issues
  ).entries()) {
    const itemPath = `conflict_synergy_mutation_rules.softConflicts[${index}]`;
    validateDestinyReference(`${itemPath}.a`, conflict.a, destinyIds, issues);
    validateDestinyReference(`${itemPath}.b`, conflict.b, destinyIds, issues);
    if (conflict.a === conflict.b) {
      issues.push(`${itemPath} must not conflict a destiny with itself`);
    }
    validateNonEmptyString(`${itemPath}.warning`, conflict.warning, issues);
  }

  for (const [index, synergy] of requireNonEmptyArray("conflict_synergy_mutation_rules.synergies", file.synergies, issues).entries()) {
    const itemPath = `conflict_synergy_mutation_rules.synergies[${index}]`;
    const ids = requireNonEmptyArray(`${itemPath}.ids`, synergy.ids, issues);
    if (ids.length < 2) {
      issues.push(`${itemPath}.ids must contain at least two destiny ids`);
    }
    for (const [idIndex, id] of ids.entries()) {
      validateDestinyReference(`${itemPath}.ids[${idIndex}]`, id, destinyIds, issues);
    }
    validateNonEmptyString(`${itemPath}.name`, synergy.name, issues);
    validateStringArray(`${itemPath}.effectTags`, synergy.effectTags, issues);
    if (synergy.warning !== undefined) {
      validateNonEmptyString(`${itemPath}.warning`, synergy.warning, issues);
    }
  }
}

function validateLifeManifestationHooks(file, destinyIds, issues) {
  validateVersion(fileLabels.lifeManifestationHooks, file.version, issues);
  const phaseIds = validatePhaseManifestationRules(file.phaseManifestationRules, issues);
  const seenDestinyIds = new Set();

  for (const [index, manifestation] of requireNonEmptyArray(
    "life_manifestation_hooks.destinyManifestations",
    file.destinyManifestations,
    issues
  ).entries()) {
    const itemPath = `life_manifestation_hooks.destinyManifestations[${index}]`;
    const destinyId = validateUniqueId(
      manifestation.destinyId,
      seenDestinyIds,
      "destiny v2 manifestation destiny id",
      `${itemPath}.destinyId`,
      issues
    );
    if (destinyId !== undefined) {
      validateDestinyReference(`${itemPath}.destinyId`, destinyId, destinyIds, issues);
    }
    for (const [eventIndex, event] of requireNonEmptyArray(`${itemPath}.events`, manifestation.events, issues).entries()) {
      const eventPath = `${itemPath}.events[${eventIndex}]`;
      validateNonEmptyString(`${eventPath}.phase`, event.phase, issues);
      if (typeof event.phase === "string" && event.phase.length > 0 && !phaseIds.has(event.phase)) {
        issues.push(`${eventPath}.phase references unknown phase: ${event.phase}`);
      }
      validateNonEmptyString(`${eventPath}.hook`, event.hook, issues);
      validateNonEmptyString(`${eventPath}.visible`, event.visible, issues);
    }
  }
}

function validateModeProjectionHooks(file, destinyIds, issues) {
  validateVersion(fileLabels.modeProjectionHooks, file.version, issues);
  validateNonEmptyString("mode_projection_hooks.modeProjectionPrinciple", file.modeProjectionPrinciple, issues);
  const seenDestinyIds = new Set();

  for (const [index, projection] of requireNonEmptyArray("mode_projection_hooks.projections", file.projections, issues).entries()) {
    const itemPath = `mode_projection_hooks.projections[${index}]`;
    const destinyId = validateUniqueId(
      projection.destinyId,
      seenDestinyIds,
      "destiny v2 mode projection destiny id",
      `${itemPath}.destinyId`,
      issues
    );
    if (destinyId !== undefined) {
      validateDestinyReference(`${itemPath}.destinyId`, destinyId, destinyIds, issues);
    }
    validateEffectsProjection(itemPath, projection, issues);
  }
}

function validatePhaseManifestationRules(phaseRules, issues) {
  if (phaseRules === undefined || phaseRules === null || Array.isArray(phaseRules) || typeof phaseRules !== "object") {
    issues.push("life_manifestation_hooks.phaseManifestationRules must be an object");
    return new Set();
  }
  const phaseIds = new Set();
  for (const phase of phases) {
    validateNonEmptyString(`life_manifestation_hooks.phaseManifestationRules.${phase}`, phaseRules[phase], issues);
    phaseIds.add(phase);
  }
  for (const phase of Object.keys(phaseRules)) {
    if (!phaseIds.has(phase)) {
      issues.push(`life_manifestation_hooks.phaseManifestationRules.${phase} is not a supported phase`);
    }
  }
  return phaseIds;
}

function validateEligibilityRule(itemPath, rule, destinyIds, issues) {
  if (rule === undefined || rule === null || Array.isArray(rule) || typeof rule !== "object") {
    issues.push(`${itemPath} must be an object`);
    return;
  }
  validateExpressionArrayIfPresent(`${itemPath}.any`, rule.any, destinyIds, issues);
  validateExpressionArrayIfPresent(`${itemPath}.all`, rule.all, destinyIds, issues);
  validateExpressionArrayIfPresent(`${itemPath}.supportAny`, rule.supportAny, destinyIds, issues);
  validateExpressionArrayIfPresent(`${itemPath}.anti`, rule.anti, destinyIds, issues);
  if (rule.sourceMutationOf !== undefined) {
    for (const [index, id] of requireNonEmptyArray(`${itemPath}.sourceMutationOf`, rule.sourceMutationOf, issues).entries()) {
      validateDestinyReference(`${itemPath}.sourceMutationOf[${index}]`, id, destinyIds, issues);
    }
  }
}

function validateExpressionArrayIfPresent(itemPath, expressions, destinyIds, issues) {
  if (expressions === undefined) {
    return;
  }
  if (!Array.isArray(expressions)) {
    issues.push(`${itemPath} must be an array`);
    return;
  }
  for (const [index, expression] of expressions.entries()) {
    validateEligibilityExpression(`${itemPath}[${index}]`, expression, destinyIds, issues);
  }
}

function validateEligibilityExpression(itemPath, expression, destinyIds, issues) {
  if (expression === undefined || expression === null || Array.isArray(expression) || typeof expression !== "object") {
    issues.push(`${itemPath} must be an object`);
    return;
  }
  let selectorCount = 0;
  if ("attr" in expression) {
    selectorCount += 1;
    if (typeof expression.attr !== "string" || expression.attr.length === 0) {
      issues.push(`${itemPath}.attr must not be empty`);
    } else if (!fateAttributes.has(expression.attr)) {
      issues.push(`${itemPath}.attr references unknown attribute: ${expression.attr}`);
    }
  }
  if ("score" in expression) {
    selectorCount += 1;
    if (typeof expression.score !== "string" || expression.score.length === 0) {
      issues.push(`${itemPath}.score must not be empty`);
    } else if (!derivedScores.has(expression.score)) {
      issues.push(`${itemPath}.score references unknown derived score: ${expression.score}`);
    }
  }
  if ("tag" in expression) {
    selectorCount += 1;
    validateNonEmptyString(`${itemPath}.tag`, expression.tag, issues);
  }
  if ("id" in expression) {
    selectorCount += 1;
    validateEligibilityDestinyReference(`${itemPath}.id`, expression.id, destinyIds, issues);
  }
  if ("flaw" in expression) {
    selectorCount += 1;
    validateEligibilityDestinyReference(`${itemPath}.flaw`, expression.flaw, destinyIds, issues);
  }
  if ("sumAttrs" in expression) {
    selectorCount += 1;
    for (const [index, attr] of requireNonEmptyArray(`${itemPath}.sumAttrs`, expression.sumAttrs, issues).entries()) {
      if (typeof attr !== "string" || attr.length === 0) {
        issues.push(`${itemPath}.sumAttrs[${index}] must not be empty`);
      } else if (!fateAttributes.has(attr)) {
        issues.push(`${itemPath}.sumAttrs[${index}] references unknown attribute: ${attr}`);
      }
    }
  }
  if ("all" in expression) {
    selectorCount += 1;
    for (const [index, child] of requireNonEmptyArray(`${itemPath}.all`, expression.all, issues).entries()) {
      validateEligibilityExpression(`${itemPath}.all[${index}]`, child, destinyIds, issues);
    }
  }
  if (selectorCount === 0) {
    issues.push(`${itemPath} must contain a supported eligibility selector`);
  }
  validateFiniteBoundary(`${itemPath}.gte`, expression.gte, issues);
  validateFiniteBoundary(`${itemPath}.lte`, expression.lte, issues);
  if (
    typeof expression.gte === "number" &&
    Number.isFinite(expression.gte) &&
    typeof expression.lte === "number" &&
    Number.isFinite(expression.lte) &&
    expression.gte > expression.lte
  ) {
    issues.push(`${itemPath}.gte must be <= lte`);
  }
  if (expression.note !== undefined) {
    validateNonEmptyString(`${itemPath}.note`, expression.note, issues);
  }
  if (expression.severity !== undefined && expression.severity !== "hard" && expression.severity !== "soft") {
    issues.push(`${itemPath}.severity is not legal: ${String(expression.severity)}`);
  }
}

function validateMutationRule(itemPath, mutation, destinyIds, issues) {
  if (mutation === undefined) {
    return;
  }
  validateDestinyReferenceIfPresent(`${itemPath}.antiResult`, mutation.antiResult, destinyIds, issues);
  validateDestinyReferenceIfPresent(`${itemPath}.weakSupportResult`, mutation.weakSupportResult, destinyIds, issues);
  validateDestinyReferenceIfPresent(`${itemPath}.sourceConflictResult`, mutation.sourceConflictResult, destinyIds, issues);
}

function validateEffectsProjection(itemPath, effects, issues) {
  if (effects === undefined || effects === null || Array.isArray(effects) || typeof effects !== "object") {
    issues.push(`${itemPath} must be an object`);
    return;
  }
  let hasEffectBucket = false;
  for (const bucket of effectBuckets) {
    const values = effects[bucket];
    if (values !== undefined) {
      validateStringArray(`${itemPath}.${bucket}`, values, issues);
      if (Array.isArray(values) && values.length > 0) {
        hasEffectBucket = true;
      }
    }
  }
  if (!hasEffectBucket) {
    issues.push(`${itemPath} must contain at least one projection bucket`);
  }
}

function validateDestinySlots(itemPath, slots, issues) {
  for (const [index, slot] of requireNonEmptyArray(itemPath, slots, issues).entries()) {
    if (!destinySlots.has(String(slot))) {
      issues.push(`${itemPath}[${index}] is not a legal destiny slot: ${String(slot)}`);
    }
  }
}

function validateDestinyReferenceIfPresent(itemPath, id, destinyIds, issues) {
  if (id !== undefined) {
    validateDestinyReference(itemPath, id, destinyIds, issues);
  }
}

function validateDestinyReference(itemPath, id, destinyIds, issues) {
  validateNonEmptyString(itemPath, id, issues);
  if (typeof id === "string" && id.length > 0 && !destinyIds.has(id)) {
    issues.push(`${itemPath} references missing destiny id: ${id}`);
  }
}

function validateEligibilityDestinyReference(itemPath, id, destinyIds, issues) {
  validateNonEmptyString(itemPath, id, issues);
  if (typeof id === "string" && id.length > 0 && !destinyIds.has(id) && !id.startsWith("flaw_")) {
    issues.push(`${itemPath} references missing destiny id: ${id}`);
  }
}

function validateVersion(fileName, version, issues) {
  if (version !== supportedVersion) {
    issues.push(`${fileName}.version must be "${supportedVersion}"`);
  }
}

function validateUniqueId(value, seen, label, itemPath, issues) {
  if (typeof value !== "string" || value.length === 0) {
    issues.push(`${itemPath} must not be empty`);
    return undefined;
  }
  if (seen.has(value)) {
    issues.push(`duplicate ${label}: ${value}`);
    return value;
  }
  seen.add(value);
  return value;
}

function validateStringArray(itemPath, value, issues) {
  const values = requireNonEmptyArray(itemPath, value, issues);
  for (const [index, item] of values.entries()) {
    validateNonEmptyString(`${itemPath}[${index}]`, item, issues);
  }
}

function validateFiniteBoundary(itemPath, value, issues) {
  if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value))) {
    issues.push(`${itemPath} must be a finite number`);
  }
}

function validateNonEmptyString(itemPath, value, issues) {
  if (typeof value !== "string" || value.length === 0) {
    issues.push(`${itemPath} must not be empty`);
  }
}

function requireNonEmptyArray(itemPath, value, issues) {
  if (!Array.isArray(value)) {
    issues.push(`${itemPath} must be an array`);
    return [];
  }
  if (value.length === 0) {
    issues.push(`${itemPath} must contain at least one item`);
  }
  return value;
}
