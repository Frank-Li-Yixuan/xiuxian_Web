import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SUPPORTED_VERSION = "0.1";
const FILES = {
  nineAttributes: {
    path: "data/fate_matrix/nine_attributes.v0.1.json",
    id: "nine_palace_attributes"
  },
  threePowersYinyangWuxing: {
    path: "data/fate_matrix/three_powers_yinyang_wuxing.v0.1.json",
    id: "three_powers_yinyang_wuxing"
  },
  destinyEligibilityRules: {
    path: "data/fate_matrix/destiny_eligibility_rules.v0.1.json",
    id: "destiny_eligibility_rules"
  },
  attributeCorrelationRules: {
    path: "data/fate_matrix/attribute_correlation_rules.v0.1.json",
    id: "attribute_correlation_rules"
  },
  attributeEventBiasRules: {
    path: "data/fate_matrix/attribute_event_bias_rules.v0.1.json",
    id: "attribute_event_bias_rules"
  },
  generationAlgorithmUpgradeRules: {
    path: "data/fate_matrix/generation_algorithm_upgrade_rules.v0.1.json",
    id: "generation_algorithm_upgrade_rules"
  }
};

const ATTRIBUTES = [
  "jing",
  "qi",
  "shen",
  "rootBone",
  "comprehension",
  "inspiration",
  "fortune",
  "heart",
  "lifespan"
];
const THREE_POWERS = ["heaven", "human", "earth"];
const ELEMENTS = ["metal", "wood", "water", "fire", "earth", "thunder", "yin"];
const DERIVED_SCORES = [
  "talentScore",
  "vesselScore",
  "stabilityScore",
  "destinyPressureScore",
  "lateBloomScore",
  "rebellionScore"
];
const FORMULA_INPUTS = new Set([...ATTRIBUTES, ...ATTRIBUTES.map((id) => `${id}_inverse`)]);
const CONDITION_ATTRIBUTES = new Set([...ATTRIBUTES, "merit", "karma"]);
const CONDITION_KEYS = new Set([
  ...ATTRIBUTES.flatMap((id) => [`${id}Gte`, `${id}Lte`]),
  ...DERIVED_SCORES.flatMap((id) => [`${id}Gte`, `${id}Lte`]),
  "heavenMinusEarthGte",
  "earthMinusHeavenGte",
  "humanSpreadGte",
  "maxPalaceSpreadLte",
  "hasTags"
]);

const issues = [];
const data = {};
for (const [key, file] of Object.entries(FILES)) {
  const abs = path.join(ROOT, file.path);
  if (!fs.existsSync(abs)) {
    issues.push(`${file.path}: file is missing`);
    continue;
  }
  try {
    data[key] = JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch (error) {
    issues.push(`${file.path}: invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (issues.length === 0) {
  validateRootFiles(data, issues);
  validateNineAttributes(data.nineAttributes, issues);
  validateThreePowers(data.threePowersYinyangWuxing, issues);
  const traitIds = validateDestinyEligibility(data.destinyEligibilityRules, issues);
  validateCorrelationRules(data.attributeCorrelationRules, traitIds, issues);
  validateEventBiasRules(data.attributeEventBiasRules, issues);
  validateGenerationAlgorithm(data.generationAlgorithmUpgradeRules, issues);
}

if (issues.length > 0) {
  for (const issue of issues) {
    console.error(issue);
  }
  process.exit(1);
}

console.log(
  [
    "Nine palace data validation passed: 6 files",
    `attributes=${data.nineAttributes.attributes.length}`,
    `ratingBands=${data.nineAttributes.ratingBands.length}`,
    `threePowers=${Object.keys(data.threePowersYinyangWuxing.threePowers).length}`,
    `derivedScores=${Object.keys(data.threePowersYinyangWuxing.derivedScores).length}`,
    `wuxing=${Object.keys(data.threePowersYinyangWuxing.wuxingMapping).length}`,
    `destinyEligibility=${data.destinyEligibilityRules.traits.length}.`
  ].join(", ")
);

function validateRootFiles(files, out) {
  for (const [key, file] of Object.entries(FILES)) {
    const root = files[key];
    if (root.version !== SUPPORTED_VERSION) {
      out.push(`${file.path}: version must be "${SUPPORTED_VERSION}"`);
    }
    if (!isNonEmptyString(root.id)) {
      out.push(`${file.path}: id must not be empty`);
    } else if (root.id !== file.id) {
      out.push(`${file.path}: id must be "${file.id}"`);
    }
  }
}

function validateNineAttributes(file, out) {
  const attrs = requireArray(FILES.nineAttributes.path, "attributes", file.attributes, out);
  const ids = new Set();
  for (const [index, attr] of attrs.entries()) {
    const base = `attributes[${index}]`;
    uniqueId(FILES.nineAttributes.path, `${base}.id`, attr.id, ids, "nine palace attribute id", out);
    if (isNonEmptyString(attr.id) && !ATTRIBUTES.includes(attr.id)) {
      out.push(`${FILES.nineAttributes.path}:${base}.id is not a legal nine palace attribute: ${attr.id}`);
    }
    requireString(FILES.nineAttributes.path, `${base}.name`, attr.name, out);
    requireString(FILES.nineAttributes.path, `${base}.palace`, attr.palace, out);
    if (isNonEmptyString(attr.palace) && !THREE_POWERS.includes(attr.palace)) {
      out.push(`${FILES.nineAttributes.path}:${base}.palace is not legal: ${attr.palace}`);
    }
    requireStringArray(FILES.nineAttributes.path, `${base}.primaryElements`, attr.primaryElements, out, ELEMENTS, "element");
    for (const key of ["keywords", "lifeUse", "combatUse", "badWhenLow", "badWhenTooHigh"]) {
      requireStringArray(FILES.nineAttributes.path, `${base}.${key}`, attr[key], out);
    }
  }
  for (const id of ATTRIBUTES) {
    if (!ids.has(id)) {
      out.push(`${FILES.nineAttributes.path}:attributes is missing required attribute: ${id}`);
    }
  }
  validateRatingBands(file.ratingBands, out);
}

function validateRatingBands(bandsValue, out) {
  const bands = requireArray(FILES.nineAttributes.path, "ratingBands", bandsValue, out);
  const ranges = [];
  for (const [index, band] of bands.entries()) {
    const base = `ratingBands[${index}]`;
    requireInteger(FILES.nineAttributes.path, `${base}.min`, band.min, out);
    requireInteger(FILES.nineAttributes.path, `${base}.max`, band.max, out);
    if (Number.isInteger(band.min) && Number.isInteger(band.max)) {
      if (band.min > band.max) {
        out.push(`${FILES.nineAttributes.path}:${base}.min must be <= max`);
      } else {
        ranges.push({ path: base, min: band.min, max: band.max });
      }
    }
    requireString(FILES.nineAttributes.path, `${base}.label`, band.label, out);
  }
  ranges.sort((a, b) => a.min - b.min || a.max - b.max);
  for (let index = 1; index < ranges.length; index += 1) {
    if (ranges[index].min <= ranges[index - 1].max) {
      out.push(`${FILES.nineAttributes.path}:${ranges[index].path} overlaps ${ranges[index - 1].path}`);
    }
  }
}

function validateThreePowers(file, out) {
  for (const id of THREE_POWERS) {
    const power = file.threePowers?.[id];
    const base = `threePowers.${id}`;
    if (power === undefined) {
      out.push(`${FILES.threePowersYinyangWuxing.path}:${base} must exist`);
      continue;
    }
    requireString(FILES.threePowersYinyangWuxing.path, `${base}.name`, power.name, out);
    requireStringArray(FILES.threePowersYinyangWuxing.path, `${base}.attrs`, power.attrs, out, ATTRIBUTES, "attribute");
    requireString(FILES.threePowersYinyangWuxing.path, `${base}.meaning`, power.meaning, out);
    validateFormula(FILES.threePowersYinyangWuxing.path, `${base}.scoreFormula`, power.scoreFormula, new Set(ATTRIBUTES), "attribute", out);
  }
  for (const id of DERIVED_SCORES) {
    const score = file.derivedScores?.[id];
    const base = `derivedScores.${id}`;
    if (score === undefined) {
      out.push(`${FILES.threePowersYinyangWuxing.path}:${base} must exist`);
      continue;
    }
    validateFormula(FILES.threePowersYinyangWuxing.path, `${base}.formula`, score.formula, FORMULA_INPUTS, "formula input", out);
    requireString(FILES.threePowersYinyangWuxing.path, `${base}.meaning`, score.meaning, out);
  }
  for (const id of ELEMENTS) {
    const mapping = file.wuxingMapping?.[id];
    const base = `wuxingMapping.${id}`;
    if (mapping === undefined) {
      out.push(`${FILES.threePowersYinyangWuxing.path}:${base} must exist`);
      continue;
    }
    requireStringArray(FILES.threePowersYinyangWuxing.path, `${base}.attrs`, mapping.attrs, out, ATTRIBUTES, "attribute");
    requireStringArray(FILES.threePowersYinyangWuxing.path, `${base}.routes`, mapping.routes, out);
  }
}

function validateDestinyEligibility(file, out) {
  const traits = requireArray(FILES.destinyEligibilityRules.path, "traits", file.traits, out);
  const ids = new Set();
  for (const [index, trait] of traits.entries()) {
    const base = `traits[${index}]`;
    uniqueId(FILES.destinyEligibilityRules.path, `${base}.id`, trait.id, ids, "destiny eligibility trait id", out);
    for (const key of ["name", "archetype", "reason"]) {
      requireString(FILES.destinyEligibilityRules.path, `${base}.${key}`, trait[key], out);
    }
    for (const key of ["requiredAny", "supportAny", "antiConditions"]) {
      if (trait[key] !== undefined) {
        validateConditions(FILES.destinyEligibilityRules.path, `${base}.${key}`, trait[key], out);
      }
    }
    for (const key of ["lifeEventBias", "age18Hooks"]) {
      if (trait[key] !== undefined) {
        requireStringArray(FILES.destinyEligibilityRules.path, `${base}.${key}`, trait[key], out);
      }
    }
  }
  for (const [index, trait] of traits.entries()) {
    if (trait.ifContradictedMutateTo && !ids.has(trait.ifContradictedMutateTo)) {
      out.push(
        `${FILES.destinyEligibilityRules.path}:traits[${index}].ifContradictedMutateTo references unknown trait: ${trait.ifContradictedMutateTo}`
      );
    }
  }
  return ids;
}

function validateCorrelationRules(file, traitIds, out) {
  const guidelines = requireArray(FILES.attributeCorrelationRules.path, "generationGuidelines", file.generationGuidelines, out);
  for (const [index, guideline] of guidelines.entries()) {
    requireString(FILES.attributeCorrelationRules.path, `generationGuidelines[${index}].name`, guideline.name, out);
    validateConditionObject(FILES.attributeCorrelationRules.path, `generationGuidelines[${index}].condition`, guideline.condition, out);
    requireString(FILES.attributeCorrelationRules.path, `generationGuidelines[${index}].meaning`, guideline.meaning, out);
  }
  const ids = new Set();
  const rules = requireArray(FILES.attributeCorrelationRules.path, "antiWeirdnessRules", file.antiWeirdnessRules, out);
  for (const [index, rule] of rules.entries()) {
    const base = `antiWeirdnessRules[${index}]`;
    uniqueId(FILES.attributeCorrelationRules.path, `${base}.id`, rule.id, ids, "attribute anti-weirdness rule id", out);
    if (!traitIds.has(rule.targetTrait)) {
      out.push(`${FILES.attributeCorrelationRules.path}:${base}.targetTrait references unknown trait: ${rule.targetTrait}`);
    }
    validateConditionObject(FILES.attributeCorrelationRules.path, `${base}.badIf`, rule.badIf, out);
    if (rule.mutation !== undefined && !traitIds.has(rule.mutation)) {
      out.push(`${FILES.attributeCorrelationRules.path}:${base}.mutation references unknown trait: ${rule.mutation}`);
    }
  }
}

function validateEventBiasRules(file, out) {
  const ids = new Set();
  const rules = requireArray(FILES.attributeEventBiasRules.path, "rules", file.rules, out);
  for (const [index, rule] of rules.entries()) {
    const base = `rules[${index}]`;
    uniqueId(FILES.attributeEventBiasRules.path, `${base}.id`, rule.id, ids, "attribute event bias rule id", out);
    validateConditionObject(FILES.attributeEventBiasRules.path, `${base}.when`, rule.when, out);
    requireStringArray(FILES.attributeEventBiasRules.path, `${base}.addTags`, rule.addTags, out);
    requireFiniteNumber(FILES.attributeEventBiasRules.path, `${base}.weightBonus`, rule.weightBonus, out);
  }
}

function validateGenerationAlgorithm(file, out) {
  requireStringArray(FILES.generationAlgorithmUpgradeRules.path, "algorithmSteps", file.algorithmSteps, out);
  requireString(FILES.generationAlgorithmUpgradeRules.path, "destinyRollPolicy.candidatePoolRule", file.destinyRollPolicy?.candidatePoolRule, out);
  requirePositiveInteger(
    FILES.generationAlgorithmUpgradeRules.path,
    "destinyRollPolicy.minEligibleMainDestinyCandidates",
    file.destinyRollPolicy?.minEligibleMainDestinyCandidates,
    out
  );
  requirePositiveInteger(
    FILES.generationAlgorithmUpgradeRules.path,
    "destinyRollPolicy.maxGenerationAttempts",
    file.destinyRollPolicy?.maxGenerationAttempts,
    out
  );
  requireStringArray(
    FILES.generationAlgorithmUpgradeRules.path,
    "destinyRollPolicy.fallbackMainDestinyTags",
    file.destinyRollPolicy?.fallbackMainDestinyTags,
    out
  );
  requireFiniteNumber(
    FILES.generationAlgorithmUpgradeRules.path,
    "destinyRollPolicy.mutationChanceWhenContradicted",
    file.destinyRollPolicy?.mutationChanceWhenContradicted,
    out
  );
  if (file.rootRollPolicy?.spiritualRootShouldUseAttributeSupport !== true) {
    out.push(`${FILES.generationAlgorithmUpgradeRules.path}:rootRollPolicy.spiritualRootShouldUseAttributeSupport must be true`);
  }
  const examples = requireArray(FILES.generationAlgorithmUpgradeRules.path, "rootRollPolicy.examples", file.rootRollPolicy?.examples, out);
  for (const [index, example] of examples.entries()) {
    requireString(FILES.generationAlgorithmUpgradeRules.path, `rootRollPolicy.examples[${index}].condition`, example.condition, out);
    requireStringArray(FILES.generationAlgorithmUpgradeRules.path, `rootRollPolicy.examples[${index}].boost`, example.boost, out);
  }
}

function validateConditions(file, field, value, out) {
  const conditions = requireArray(file, field, value, out);
  for (const [index, condition] of conditions.entries()) {
    const base = `${field}[${index}]`;
    if (condition.score !== undefined && !DERIVED_SCORES.includes(condition.score)) {
      out.push(`${file}:${base}.score references unknown derived score: ${condition.score}`);
    }
    if (condition.attrs !== undefined) {
      for (const [key, attrValue] of Object.entries(condition.attrs)) {
        if (!CONDITION_ATTRIBUTES.has(key)) {
          out.push(`${file}:${base}.attrs.${key} references unknown attribute`);
        }
        if (typeof attrValue === "number") {
          requireFiniteNumber(file, `${base}.attrs.${key}`, attrValue, out);
        } else if (attrValue && typeof attrValue === "object") {
          for (const rangeKey of ["gte", "lte"]) {
            if (attrValue[rangeKey] !== undefined) {
              requireFiniteNumber(file, `${base}.attrs.${key}.${rangeKey}`, attrValue[rangeKey], out);
            }
          }
        } else {
          out.push(`${file}:${base}.attrs.${key} must be a number or range object`);
        }
      }
    }
    if (condition.combined !== undefined) {
      for (const [key, weight] of Object.entries(condition.combined)) {
        if (!ATTRIBUTES.includes(key)) {
          out.push(`${file}:${base}.combined.${key} references unknown attribute`);
        }
        requireFiniteNumber(file, `${base}.combined.${key}`, weight, out);
      }
    }
  }
}

function validateConditionObject(file, field, value, out) {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    out.push(`${file}:${field} must be an object`);
    return;
  }
  for (const [key, conditionValue] of Object.entries(value)) {
    if (!CONDITION_KEYS.has(key)) {
      out.push(`${file}:${field}.${key} references unknown condition key`);
    }
    if (key === "hasTags") {
      requireStringArray(file, `${field}.${key}`, conditionValue, out);
    } else {
      requireFiniteNumber(file, `${field}.${key}`, conditionValue, out);
    }
  }
}

function validateFormula(file, field, value, legalInputs, label, out) {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    out.push(`${file}:${field} must be an object`);
    return;
  }
  const entries = Object.entries(value);
  if (entries.length === 0) {
    out.push(`${file}:${field} must contain at least one ${label}`);
  }
  for (const [key, weight] of entries) {
    if (!legalInputs.has(key)) {
      out.push(`${file}:${field}.${key} references unknown ${label}`);
    }
    requireFiniteNumber(file, `${field}.${key}`, weight, out);
    if (typeof weight === "number" && Number.isFinite(weight) && weight <= 0) {
      out.push(`${file}:${field}.${key} must be > 0`);
    }
  }
}

function uniqueId(file, field, value, seen, label, out) {
  requireString(file, field, value, out);
  if (!isNonEmptyString(value)) {
    return;
  }
  if (seen.has(value)) {
    out.push(`${file}:duplicate ${label}: ${value}`);
    return;
  }
  seen.add(value);
}

function requireArray(file, field, value, out) {
  if (!Array.isArray(value)) {
    out.push(`${file}:${field} must be an array`);
    return [];
  }
  if (value.length === 0) {
    out.push(`${file}:${field} must contain at least one item`);
  }
  return value;
}

function requireStringArray(file, field, value, out, legalValues, label = "string") {
  const values = requireArray(file, field, value, out);
  for (const [index, item] of values.entries()) {
    requireString(file, `${field}[${index}]`, item, out);
    if (isNonEmptyString(item) && legalValues !== undefined && !legalValues.includes(item)) {
      out.push(`${file}:${field}[${index}] references unknown ${label}: ${item}`);
    }
  }
}

function requireString(file, field, value, out) {
  if (!isNonEmptyString(value)) {
    out.push(`${file}:${field} must not be empty`);
  }
}

function requireInteger(file, field, value, out) {
  if (!Number.isInteger(value)) {
    out.push(`${file}:${field} must be an integer`);
  }
}

function requirePositiveInteger(file, field, value, out) {
  requireInteger(file, field, value, out);
  if (Number.isInteger(value) && value <= 0) {
    out.push(`${file}:${field} must be > 0`);
  }
}

function requireFiniteNumber(file, field, value, out) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    out.push(`${file}:${field} must be a finite number`);
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}
