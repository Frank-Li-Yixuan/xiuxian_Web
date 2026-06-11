import attributeCorrelationRulesData from "../../data/fate_matrix/attribute_correlation_rules.v0.1.json";
import attributeEventBiasRulesData from "../../data/fate_matrix/attribute_event_bias_rules.v0.1.json";
import destinyEligibilityRulesData from "../../data/fate_matrix/destiny_eligibility_rules.v0.1.json";
import generationAlgorithmUpgradeRulesData from "../../data/fate_matrix/generation_algorithm_upgrade_rules.v0.1.json";
import nineAttributesData from "../../data/fate_matrix/nine_attributes.v0.1.json";
import threePowersYinyangWuxingData from "../../data/fate_matrix/three_powers_yinyang_wuxing.v0.1.json";
import type {
  AttributeAntiWeirdnessRule,
  AttributeCorrelationRulesDataFile,
  AttributeEventBiasRule,
  AttributeEventBiasRulesDataFile,
  AttributeGenerationGuideline,
  DerivedFateScoreId,
  DerivedScoreDefinition,
  DestinyEligibilityRule,
  DestinyEligibilityRulesDataFile,
  ElementId,
  FateAttributeId,
  GenerationAlgorithmUpgradeRulesDataFile,
  NinePalaceAttributeDefinition,
  NinePalaceAttributesDataFile,
  NinePalaceCondition,
  NinePalaceDataBundle,
  NinePalaceFormulaInputId,
  NinePalaceRatingBand,
  RootRollPolicy,
  ThreePowerId,
  ThreePowerRuleDefinition,
  ThreePowersYinyangWuxingDataFile,
  WuxingMappingDefinition
} from "../types/nine-palace-fate-types.v0.1";

const DATA_FILE_NAMES = {
  nineAttributes: "nine_attributes",
  threePowersYinyangWuxing: "three_powers_yinyang_wuxing",
  destinyEligibilityRules: "destiny_eligibility_rules",
  attributeCorrelationRules: "attribute_correlation_rules",
  attributeEventBiasRules: "attribute_event_bias_rules",
  generationAlgorithmUpgradeRules: "generation_algorithm_upgrade_rules"
} as const;

const SUPPORTED_VERSION = "0.1";

const FATE_ATTRIBUTE_IDS = [
  "jing",
  "qi",
  "shen",
  "rootBone",
  "comprehension",
  "inspiration",
  "fortune",
  "heart",
  "lifespan"
] as const satisfies readonly FateAttributeId[];
const THREE_POWER_IDS = ["heaven", "human", "earth"] as const satisfies readonly ThreePowerId[];
const ELEMENT_IDS = ["metal", "wood", "water", "fire", "earth", "thunder", "yin"] as const satisfies readonly ElementId[];
const DERIVED_SCORE_IDS = [
  "talentScore",
  "vesselScore",
  "stabilityScore",
  "destinyPressureScore",
  "lateBloomScore",
  "rebellionScore"
] as const satisfies readonly DerivedFateScoreId[];

const LEGAL_ATTRIBUTES = new Set<string>(FATE_ATTRIBUTE_IDS);
const LEGAL_CONDITION_ATTRIBUTES = new Set<string>([...FATE_ATTRIBUTE_IDS, "merit", "karma"]);
const LEGAL_THREE_POWERS = new Set<string>(THREE_POWER_IDS);
const LEGAL_ELEMENTS = new Set<string>(ELEMENT_IDS);
const LEGAL_DERIVED_SCORES = new Set<string>(DERIVED_SCORE_IDS);
const LEGAL_FORMULA_INPUTS = new Set<string>([
  ...FATE_ATTRIBUTE_IDS,
  ...FATE_ATTRIBUTE_IDS.map((id) => `${id}_inverse`)
]);
const LEGAL_POLARITIES = new Set<string>(["yin", "yang", "balanced", "variable", "hidden"]);
const LEGAL_RULE_ACTIONS = new Set<string>(["mutate", "reject", "warn"]);
const LEGAL_CONDITION_KEYS = new Set<string>([
  ...FATE_ATTRIBUTE_IDS.flatMap((id) => [`${id}Gte`, `${id}Lte`]),
  ...DERIVED_SCORE_IDS.flatMap((id) => [`${id}Gte`, `${id}Lte`]),
  "heavenMinusEarthGte",
  "earthMinusHeavenGte",
  "humanSpreadGte",
  "maxPalaceSpreadLte",
  "hasTags"
]);

export class NinePalaceRegistry {
  readonly attributes: readonly NinePalaceAttributeDefinition[];
  readonly ratingBands: readonly NinePalaceRatingBand[];
  readonly threePowers: readonly ThreePowerRuleDefinition[];
  readonly derivedScores: readonly DerivedScoreDefinition[];
  readonly wuxingMappings: readonly WuxingMappingDefinition[];
  readonly destinyEligibilityRules: readonly DestinyEligibilityRule[];
  readonly generationGuidelines: readonly AttributeGenerationGuideline[];
  readonly antiWeirdnessRules: readonly AttributeAntiWeirdnessRule[];
  readonly attributeEventBiasRules: readonly AttributeEventBiasRule[];
  readonly generationAlgorithmRules: GenerationAlgorithmUpgradeRulesDataFile;

  private readonly attributeById: ReadonlyMap<string, NinePalaceAttributeDefinition>;
  private readonly ratingBandByIndex: readonly NinePalaceRatingBand[];
  private readonly threePowerById: ReadonlyMap<string, ThreePowerRuleDefinition>;
  private readonly derivedScoreById: ReadonlyMap<string, DerivedScoreDefinition>;
  private readonly wuxingMappingById: ReadonlyMap<string, WuxingMappingDefinition>;
  private readonly destinyEligibilityRuleById: ReadonlyMap<string, DestinyEligibilityRule>;

  constructor(data: Required<NinePalaceDataBundle>) {
    this.attributes = freezeArray(data.nineAttributes.attributes);
    this.ratingBands = freezeArray(data.nineAttributes.ratingBands);
    this.threePowers = freezeArray(
      THREE_POWER_IDS.map((id) => ({
        id,
        ...data.threePowersYinyangWuxing.threePowers[id]
      }))
    );
    this.derivedScores = freezeArray(
      DERIVED_SCORE_IDS.map((id) => ({
        id,
        ...data.threePowersYinyangWuxing.derivedScores[id]
      }))
    );
    this.wuxingMappings = freezeArray(
      ELEMENT_IDS.map((id) => ({
        id,
        ...data.threePowersYinyangWuxing.wuxingMapping[id]
      }))
    );
    this.destinyEligibilityRules = freezeArray(data.destinyEligibilityRules.traits);
    this.generationGuidelines = freezeArray(data.attributeCorrelationRules.generationGuidelines);
    this.antiWeirdnessRules = freezeArray(data.attributeCorrelationRules.antiWeirdnessRules);
    this.attributeEventBiasRules = freezeArray(data.attributeEventBiasRules.rules);
    this.generationAlgorithmRules = deepFreeze(cloneJson(data.generationAlgorithmUpgradeRules));
    this.attributeById = indexById(this.attributes);
    this.ratingBandByIndex = this.ratingBands;
    this.threePowerById = indexById(this.threePowers);
    this.derivedScoreById = indexById(this.derivedScores);
    this.wuxingMappingById = indexById(this.wuxingMappings);
    this.destinyEligibilityRuleById = indexById(this.destinyEligibilityRules);
  }

  getAttribute(id: FateAttributeId): NinePalaceAttributeDefinition {
    const attribute = this.attributeById.get(id);
    if (attribute === undefined) {
      throw new Error(`Missing nine palace attribute: ${id}`);
    }
    return attribute;
  }

  getRatingBand(value: number): NinePalaceRatingBand {
    if (!Number.isInteger(value)) {
      throw new Error("rating value must be an integer");
    }
    const band = this.ratingBandByIndex.find(({ min, max }) => value >= min && value <= max);
    if (band === undefined) {
      throw new Error(`Missing nine palace rating band for value: ${value}`);
    }
    return band;
  }

  getThreePower(id: ThreePowerId): ThreePowerRuleDefinition {
    const power = this.threePowerById.get(id);
    if (power === undefined) {
      throw new Error(`Missing three power: ${id}`);
    }
    return power;
  }

  getDerivedScore(id: string): DerivedScoreDefinition {
    const score = this.derivedScoreById.get(id);
    if (score === undefined) {
      throw new Error(`Missing derived fate score: ${id}`);
    }
    return score;
  }

  getWuxingMapping(id: ElementId): WuxingMappingDefinition {
    const mapping = this.wuxingMappingById.get(id);
    if (mapping === undefined) {
      throw new Error(`Missing wuxing mapping: ${id}`);
    }
    return mapping;
  }

  getDestinyEligibilityRule(id: string): DestinyEligibilityRule {
    const rule = this.destinyEligibilityRuleById.get(id);
    if (rule === undefined) {
      throw new Error(`Missing destiny eligibility rule: ${id}`);
    }
    return rule;
  }

  listDestinyEligibilityRules(): readonly DestinyEligibilityRule[] {
    return this.destinyEligibilityRules;
  }
}

export function loadNinePalaceRegistry(): NinePalaceRegistry {
  return createNinePalaceRegistry({
    nineAttributes: nineAttributesData as unknown as NinePalaceAttributesDataFile,
    threePowersYinyangWuxing: threePowersYinyangWuxingData as unknown as ThreePowersYinyangWuxingDataFile,
    destinyEligibilityRules: destinyEligibilityRulesData as unknown as DestinyEligibilityRulesDataFile,
    attributeCorrelationRules: attributeCorrelationRulesData as unknown as AttributeCorrelationRulesDataFile,
    attributeEventBiasRules: attributeEventBiasRulesData as unknown as AttributeEventBiasRulesDataFile,
    generationAlgorithmUpgradeRules: generationAlgorithmUpgradeRulesData as unknown as GenerationAlgorithmUpgradeRulesDataFile
  });
}

export function createNinePalaceRegistry(data: NinePalaceDataBundle): NinePalaceRegistry {
  const issues = validateNinePalaceData(data);
  if (issues.length > 0) {
    throw new Error(`Nine palace data validation failed:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
  }
  return new NinePalaceRegistry(data as Required<NinePalaceDataBundle>);
}

export function validateNinePalaceData(data: NinePalaceDataBundle): string[] {
  const issues: string[] = [];
  const nineAttributes = requireFile(data.nineAttributes, DATA_FILE_NAMES.nineAttributes, issues);
  const threePowersYinyangWuxing = requireFile(
    data.threePowersYinyangWuxing,
    DATA_FILE_NAMES.threePowersYinyangWuxing,
    issues
  );
  const destinyEligibilityRules = requireFile(
    data.destinyEligibilityRules,
    DATA_FILE_NAMES.destinyEligibilityRules,
    issues
  );
  const attributeCorrelationRules = requireFile(
    data.attributeCorrelationRules,
    DATA_FILE_NAMES.attributeCorrelationRules,
    issues
  );
  const attributeEventBiasRules = requireFile(data.attributeEventBiasRules, DATA_FILE_NAMES.attributeEventBiasRules, issues);
  const generationAlgorithmUpgradeRules = requireFile(
    data.generationAlgorithmUpgradeRules,
    DATA_FILE_NAMES.generationAlgorithmUpgradeRules,
    issues
  );

  if (
    nineAttributes === undefined ||
    threePowersYinyangWuxing === undefined ||
    destinyEligibilityRules === undefined ||
    attributeCorrelationRules === undefined ||
    attributeEventBiasRules === undefined ||
    generationAlgorithmUpgradeRules === undefined
  ) {
    return issues;
  }

  validateNineAttributes(nineAttributes, issues);
  validateThreePowersYinyangWuxing(threePowersYinyangWuxing, issues);
  const traitIds = validateDestinyEligibilityRules(destinyEligibilityRules, issues);
  validateAttributeCorrelationRules(attributeCorrelationRules, traitIds, issues);
  validateAttributeEventBiasRules(attributeEventBiasRules, issues);
  validateGenerationAlgorithmUpgradeRules(generationAlgorithmUpgradeRules, issues);

  return issues;
}

function validateNineAttributes(data: NinePalaceAttributesDataFile, issues: string[]): void {
  validateVersionAndId(DATA_FILE_NAMES.nineAttributes, data.version, data.id, "nine_palace_attributes", issues);
  const ids = new Set<string>();
  const attributes = requireNonEmptyArray("nine_attributes.attributes", data.attributes, issues);
  for (const [index, attribute] of attributes.entries()) {
    const path = `nine_attributes.attributes[${index}]`;
    const id = validateUniqueId(attribute.id, ids, "nine palace attribute id", `${path}.id`, issues);
    if (id !== undefined && !LEGAL_ATTRIBUTES.has(id)) {
      issues.push(`${path}.id is not a legal nine palace attribute: ${id}`);
    }
    validateNonEmptyString(`${path}.name`, attribute.name, issues);
    validateNonEmptyString(`${path}.palace`, attribute.palace, issues);
    if (typeof attribute.palace === "string" && attribute.palace.length > 0 && !LEGAL_THREE_POWERS.has(attribute.palace)) {
      issues.push(`${path}.palace is not legal: ${attribute.palace}`);
    }
    validateNonEmptyString(`${path}.polarity`, attribute.polarity, issues);
    if (typeof attribute.polarity === "string" && attribute.polarity.length > 0 && !LEGAL_POLARITIES.has(attribute.polarity)) {
      issues.push(`${path}.polarity is not legal: ${attribute.polarity}`);
    }
    validateElementReferences(`${path}.primaryElements`, attribute.primaryElements, issues);
    validateStringArray(`${path}.keywords`, attribute.keywords, issues);
    validateStringArray(`${path}.lifeUse`, attribute.lifeUse, issues);
    validateStringArray(`${path}.combatUse`, attribute.combatUse, issues);
    validateStringArray(`${path}.badWhenLow`, attribute.badWhenLow, issues);
    validateStringArray(`${path}.badWhenTooHigh`, attribute.badWhenTooHigh, issues);
  }

  for (const id of FATE_ATTRIBUTE_IDS) {
    if (!ids.has(id)) {
      issues.push(`nine_attributes.attributes is missing required attribute: ${id}`);
    }
  }

  validateRatingBands(data.ratingBands, issues);
}

function validateRatingBands(ratingBands: readonly NinePalaceRatingBand[] | undefined, issues: string[]): void {
  const bands = requireNonEmptyArray("nine_attributes.ratingBands", ratingBands, issues);
  const ranges: { readonly path: string; readonly min: number; readonly max: number }[] = [];
  for (const [index, band] of bands.entries()) {
    const path = `nine_attributes.ratingBands[${index}]`;
    validateInteger(`${path}.min`, band.min, issues);
    validateInteger(`${path}.max`, band.max, issues);
    if (Number.isInteger(band.min) && Number.isInteger(band.max)) {
      if (band.min > band.max) {
        issues.push(`${path}.min must be <= max`);
      } else {
        ranges.push({ path, min: band.min, max: band.max });
      }
    }
    validateNonEmptyString(`${path}.label`, band.label, issues);
  }
  const sorted = [...ranges].sort((a, b) => a.min - b.min || a.max - b.max);
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (previous !== undefined && current !== undefined && current.min <= previous.max) {
      issues.push(`${current.path} overlaps ${previous.path}`);
    }
  }
}

function validateThreePowersYinyangWuxing(data: ThreePowersYinyangWuxingDataFile, issues: string[]): void {
  validateVersionAndId(
    DATA_FILE_NAMES.threePowersYinyangWuxing,
    data.version,
    data.id,
    "three_powers_yinyang_wuxing",
    issues
  );
  for (const id of THREE_POWER_IDS) {
    const power = data.threePowers?.[id];
    const path = `three_powers_yinyang_wuxing.threePowers.${id}`;
    if (power === undefined) {
      issues.push(`${path} must exist`);
      continue;
    }
    validateNonEmptyString(`${path}.name`, power.name, issues);
    validateAttributeReferences(`${path}.attrs`, power.attrs, issues);
    validateNonEmptyString(`${path}.meaning`, power.meaning, issues);
    validateFormula(`${path}.scoreFormula`, power.scoreFormula, LEGAL_ATTRIBUTES, "attribute", issues);
  }

  for (const id of DERIVED_SCORE_IDS) {
    const score = data.derivedScores?.[id];
    const path = `three_powers_yinyang_wuxing.derivedScores.${id}`;
    if (score === undefined) {
      issues.push(`${path} must exist`);
      continue;
    }
    validateFormula(`${path}.formula`, score.formula, LEGAL_FORMULA_INPUTS, "formula input", issues);
    validateNonEmptyString(`${path}.meaning`, score.meaning, issues);
  }

  for (const id of ELEMENT_IDS) {
    const mapping = data.wuxingMapping?.[id];
    const path = `three_powers_yinyang_wuxing.wuxingMapping.${id}`;
    if (mapping === undefined) {
      issues.push(`${path} must exist`);
      continue;
    }
    validateAttributeReferences(`${path}.attrs`, mapping.attrs, issues);
    validateStringArray(`${path}.routes`, mapping.routes, issues);
  }
}

function validateDestinyEligibilityRules(
  data: DestinyEligibilityRulesDataFile,
  issues: string[]
): ReadonlySet<string> {
  validateVersionAndId(
    DATA_FILE_NAMES.destinyEligibilityRules,
    data.version,
    data.id,
    "destiny_eligibility_rules",
    issues
  );
  const traits = requireNonEmptyArray("destiny_eligibility_rules.traits", data.traits, issues);
  const traitIds = new Set<string>();
  for (const [index, trait] of traits.entries()) {
    const path = `destiny_eligibility_rules.traits[${index}]`;
    validateUniqueId(trait.id, traitIds, "destiny eligibility trait id", `${path}.id`, issues);
    validateNonEmptyString(`${path}.name`, trait.name, issues);
    validateNonEmptyString(`${path}.archetype`, trait.archetype, issues);
    validateNonEmptyString(`${path}.reason`, trait.reason, issues);
    if (trait.isMutation !== undefined && typeof trait.isMutation !== "boolean") {
      issues.push(`${path}.isMutation must be a boolean`);
    }
    validateConditionArray(`${path}.requiredAny`, trait.requiredAny, issues);
    validateConditionArray(`${path}.supportAny`, trait.supportAny, issues);
    validateConditionArray(`${path}.antiConditions`, trait.antiConditions, issues);
    validateStringArrayIfPresent(`${path}.lifeEventBias`, trait.lifeEventBias, issues);
    validateStringArrayIfPresent(`${path}.age18Hooks`, trait.age18Hooks, issues);
  }

  for (const [index, trait] of traits.entries()) {
    if (trait.ifContradictedMutateTo !== undefined && !traitIds.has(trait.ifContradictedMutateTo)) {
      issues.push(
        `destiny_eligibility_rules.traits[${index}].ifContradictedMutateTo references unknown trait: ${trait.ifContradictedMutateTo}`
      );
    }
  }
  return traitIds;
}

function validateAttributeCorrelationRules(
  data: AttributeCorrelationRulesDataFile,
  traitIds: ReadonlySet<string>,
  issues: string[]
): void {
  validateVersionAndId(
    DATA_FILE_NAMES.attributeCorrelationRules,
    data.version,
    data.id,
    "attribute_correlation_rules",
    issues
  );
  for (const [index, guideline] of requireNonEmptyArray(
    "attribute_correlation_rules.generationGuidelines",
    data.generationGuidelines,
    issues
  ).entries()) {
    const path = `attribute_correlation_rules.generationGuidelines[${index}]`;
    validateNonEmptyString(`${path}.name`, guideline.name, issues);
    validateConditionObjectKeys(`${path}.condition`, guideline.condition, issues);
    validateNonEmptyString(`${path}.meaning`, guideline.meaning, issues);
  }

  const ruleIds = new Set<string>();
  for (const [index, rule] of requireNonEmptyArray(
    "attribute_correlation_rules.antiWeirdnessRules",
    data.antiWeirdnessRules,
    issues
  ).entries()) {
    const path = `attribute_correlation_rules.antiWeirdnessRules[${index}]`;
    validateUniqueId(rule.id, ruleIds, "attribute anti-weirdness rule id", `${path}.id`, issues);
    validateTraitReference(`${path}.targetTrait`, rule.targetTrait, traitIds, issues);
    validateConditionObjectKeys(`${path}.badIf`, rule.badIf, issues);
    if (!LEGAL_RULE_ACTIONS.has(String(rule.action))) {
      issues.push(`${path}.action is not legal: ${String(rule.action)}`);
    }
    if (rule.mutation !== undefined && !traitIds.has(rule.mutation)) {
      issues.push(`${path}.mutation references unknown trait: ${rule.mutation}`);
    }
  }
}

function validateAttributeEventBiasRules(data: AttributeEventBiasRulesDataFile, issues: string[]): void {
  validateVersionAndId(
    DATA_FILE_NAMES.attributeEventBiasRules,
    data.version,
    data.id,
    "attribute_event_bias_rules",
    issues
  );
  const ruleIds = new Set<string>();
  for (const [index, rule] of requireNonEmptyArray("attribute_event_bias_rules.rules", data.rules, issues).entries()) {
    const path = `attribute_event_bias_rules.rules[${index}]`;
    validateUniqueId(rule.id, ruleIds, "attribute event bias rule id", `${path}.id`, issues);
    validateConditionObjectKeys(`${path}.when`, rule.when, issues);
    validateStringArray(`${path}.addTags`, rule.addTags, issues);
    validateFiniteNumber(`${path}.weightBonus`, rule.weightBonus, issues);
  }
}

function validateGenerationAlgorithmUpgradeRules(
  data: GenerationAlgorithmUpgradeRulesDataFile,
  issues: string[]
): void {
  validateVersionAndId(
    DATA_FILE_NAMES.generationAlgorithmUpgradeRules,
    data.version,
    data.id,
    "generation_algorithm_upgrade_rules",
    issues
  );
  validateStringArray("generation_algorithm_upgrade_rules.algorithmSteps", data.algorithmSteps, issues);
  validateNonEmptyString(
    "generation_algorithm_upgrade_rules.destinyRollPolicy.candidatePoolRule",
    data.destinyRollPolicy?.candidatePoolRule,
    issues
  );
  validatePositiveInteger(
    "generation_algorithm_upgrade_rules.destinyRollPolicy.minEligibleMainDestinyCandidates",
    data.destinyRollPolicy?.minEligibleMainDestinyCandidates,
    issues
  );
  validatePositiveInteger(
    "generation_algorithm_upgrade_rules.destinyRollPolicy.maxGenerationAttempts",
    data.destinyRollPolicy?.maxGenerationAttempts,
    issues
  );
  validateStringArray(
    "generation_algorithm_upgrade_rules.destinyRollPolicy.fallbackMainDestinyTags",
    data.destinyRollPolicy?.fallbackMainDestinyTags,
    issues
  );
  validateDomainNumber(
    "generation_algorithm_upgrade_rules.destinyRollPolicy.mutationChanceWhenContradicted",
    data.destinyRollPolicy?.mutationChanceWhenContradicted,
    0,
    1,
    issues
  );
  validateRootRollPolicy(data.rootRollPolicy, issues);
}

function validateRootRollPolicy(policy: RootRollPolicy | undefined, issues: string[]): void {
  if (policy === undefined || policy === null) {
    issues.push("generation_algorithm_upgrade_rules.rootRollPolicy must exist");
    return;
  }
  if (typeof policy.spiritualRootShouldUseAttributeSupport !== "boolean") {
    issues.push("generation_algorithm_upgrade_rules.rootRollPolicy.spiritualRootShouldUseAttributeSupport must be a boolean");
  }
  for (const [index, example] of requireNonEmptyArray(
    "generation_algorithm_upgrade_rules.rootRollPolicy.examples",
    policy.examples,
    issues
  ).entries()) {
    const path = `generation_algorithm_upgrade_rules.rootRollPolicy.examples[${index}]`;
    validateNonEmptyString(`${path}.condition`, example.condition, issues);
    validateStringArray(`${path}.boost`, example.boost, issues);
  }
}

function validateConditionArray(path: string, conditions: readonly NinePalaceCondition[] | undefined, issues: string[]): void {
  if (conditions === undefined) {
    return;
  }
  for (const [index, condition] of requireNonEmptyArray(path, conditions, issues).entries()) {
    const conditionPath = `${path}[${index}]`;
    if (condition.score !== undefined && !LEGAL_DERIVED_SCORES.has(condition.score)) {
      issues.push(`${conditionPath}.score references unknown derived score: ${condition.score}`);
    }
    validateAttributeConditionMap(`${conditionPath}.attrs`, condition.attrs, issues);
    validateCombinedConditionMap(`${conditionPath}.combined`, condition.combined, issues);
    validateStringArrayIfPresent(`${conditionPath}.tags`, condition.tags, issues);
    if (condition.gte !== undefined) {
      validateFiniteNumber(`${conditionPath}.gte`, condition.gte, issues);
    }
    if (condition.lte !== undefined) {
      validateFiniteNumber(`${conditionPath}.lte`, condition.lte, issues);
    }
  }
}

function validateAttributeConditionMap(
  path: string,
  attrs: Record<string, number | { readonly gte?: number; readonly lte?: number }> | undefined,
  issues: string[]
): void {
  if (attrs === undefined) {
    return;
  }
  for (const [attributeId, value] of Object.entries(attrs)) {
    if (!LEGAL_CONDITION_ATTRIBUTES.has(attributeId)) {
      issues.push(`${path}.${attributeId} references unknown attribute`);
    }
    if (typeof value === "number") {
      validateFiniteNumber(`${path}.${attributeId}`, value, issues);
    } else if (value !== null && typeof value === "object") {
      if (value.gte !== undefined) {
        validateFiniteNumber(`${path}.${attributeId}.gte`, value.gte, issues);
      }
      if (value.lte !== undefined) {
        validateFiniteNumber(`${path}.${attributeId}.lte`, value.lte, issues);
      }
    } else {
      issues.push(`${path}.${attributeId} must be a number or range object`);
    }
  }
}

function validateCombinedConditionMap(
  path: string,
  combined: Partial<Record<FateAttributeId, number>> | undefined,
  issues: string[]
): void {
  if (combined === undefined) {
    return;
  }
  for (const [attributeId, weight] of Object.entries(combined)) {
    if (!LEGAL_ATTRIBUTES.has(attributeId)) {
      issues.push(`${path}.${attributeId} references unknown attribute`);
    }
    validateFiniteNumber(`${path}.${attributeId}`, weight, issues);
  }
}

function validateConditionObjectKeys(path: string, condition: Record<string, unknown> | undefined, issues: string[]): void {
  if (condition === undefined || condition === null || Array.isArray(condition) || typeof condition !== "object") {
    issues.push(`${path} must be an object`);
    return;
  }
  for (const [key, value] of Object.entries(condition)) {
    if (!LEGAL_CONDITION_KEYS.has(key)) {
      issues.push(`${path}.${key} references unknown condition key`);
    }
    if (key === "hasTags") {
      validateStringArray(`${path}.${key}`, value as readonly string[] | undefined, issues);
    } else {
      validateFiniteNumber(`${path}.${key}`, value, issues);
    }
  }
}

function validateFormula(
  path: string,
  formula: Readonly<Record<string, number>> | undefined,
  legalInputs: ReadonlySet<string>,
  label: string,
  issues: string[]
): void {
  if (formula === undefined || formula === null || Array.isArray(formula) || typeof formula !== "object") {
    issues.push(`${path} must be an object`);
    return;
  }
  const entries = Object.entries(formula);
  if (entries.length === 0) {
    issues.push(`${path} must contain at least one ${label}`);
  }
  for (const [input, weight] of entries) {
    if (!legalInputs.has(input)) {
      issues.push(`${path}.${input} references unknown ${label}`);
    }
    validateFiniteNumber(`${path}.${input}`, weight, issues);
    if (Number.isFinite(weight) && weight <= 0) {
      issues.push(`${path}.${input} must be > 0`);
    }
  }
}

function validateAttributeReferences(path: string, attrs: readonly string[] | undefined, issues: string[]): void {
  const values = requireNonEmptyArray(path, attrs, issues);
  for (const [index, attr] of values.entries()) {
    if (typeof attr !== "string" || attr.length === 0) {
      issues.push(`${path}[${index}] must not be empty`);
    } else if (!LEGAL_ATTRIBUTES.has(attr)) {
      issues.push(`${path}[${index}] references unknown attribute: ${attr}`);
    }
  }
}

function validateElementReferences(path: string, elements: readonly string[] | undefined, issues: string[]): void {
  const values = requireNonEmptyArray(path, elements, issues);
  for (const [index, element] of values.entries()) {
    if (typeof element !== "string" || element.length === 0) {
      issues.push(`${path}[${index}] must not be empty`);
    } else if (!LEGAL_ELEMENTS.has(element)) {
      issues.push(`${path}[${index}] references unknown element: ${element}`);
    }
  }
}

function validateTraitReference(path: string, traitId: string, traitIds: ReadonlySet<string>, issues: string[]): void {
  validateNonEmptyString(path, traitId, issues);
  if (typeof traitId === "string" && traitId.length > 0 && !traitIds.has(traitId)) {
    issues.push(`${path} references unknown trait: ${traitId}`);
  }
}

function validateVersionAndId(
  fileName: string,
  version: unknown,
  id: unknown,
  expectedId: string,
  issues: string[]
): void {
  if (version !== SUPPORTED_VERSION) {
    issues.push(`${fileName}.version must be "${SUPPORTED_VERSION}"`);
  }
  validateNonEmptyString(`${fileName}.id`, id, issues);
  if (typeof id === "string" && id.length > 0 && id !== expectedId) {
    issues.push(`${fileName}.id must be "${expectedId}"`);
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

function validateStringArrayIfPresent(path: string, value: readonly string[] | undefined, issues: string[]): void {
  if (value !== undefined) {
    validateStringArray(path, value, issues);
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

function validateInteger(path: string, value: unknown, issues: string[]): void {
  if (!Number.isInteger(value)) {
    issues.push(`${path} must be an integer`);
  }
}

function validatePositiveInteger(path: string, value: unknown, issues: string[]): void {
  validateInteger(path, value, issues);
  if (typeof value === "number" && Number.isInteger(value) && value <= 0) {
    issues.push(`${path} must be > 0`);
  }
}

function validateDomainNumber(path: string, value: unknown, min: number, max: number, issues: string[]): void {
  validateFiniteNumber(path, value, issues);
  if (typeof value === "number" && Number.isFinite(value) && (value < min || value > max)) {
    issues.push(`${path} must stay within domain ${min}..${max}`);
  }
}

function validateFiniteNumber(path: string, value: unknown, issues: string[]): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push(`${path} must be a finite number`);
  }
}

function validateNonEmptyString(path: string, value: unknown, issues: string[]): void {
  if (typeof value !== "string" || value.length === 0) {
    issues.push(`${path} must not be empty`);
  }
}

function requireFile<T>(file: T | undefined, name: string, issues: string[]): T | undefined {
  if (file === undefined || file === null) {
    issues.push(`Missing nine palace data file: ${name}`);
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
