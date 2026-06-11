import { loadNinePalaceRegistry, type NinePalaceRegistry } from "./NinePalaceRegistry";
import type {
  AttributeEventBiasRule,
  DerivedFateScores,
  ElementId,
  FateAttributeId,
  FateCausalityTags,
  NinePalaceAttributes,
  NinePalaceCondition,
  NinePalaceEvaluation,
  ThreePowerScores,
  WuxingInclination
} from "../types/nine-palace-fate-types.v0.1";

const ATTRIBUTE_IDS = [
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

const ELEMENT_IDS = ["metal", "wood", "water", "fire", "earth", "thunder", "yin"] as const satisfies readonly ElementId[];
const ATTRIBUTE_MIN = 1;
const ATTRIBUTE_MAX = 120;
const INVERSE_BASE = ATTRIBUTE_MAX + 1;
const HIGH_BIAS_THRESHOLD = 75;
const HIGH_DESTINY_PRESSURE_THRESHOLD = 70;
const LOW_STABILITY_THRESHOLD = 45;
const LOW_ROOT_BONE_THRESHOLD = 35;

type ScoreContext = {
  readonly attributes: NinePalaceAttributes;
  readonly threePowers: ThreePowerScores;
  readonly derived: DerivedFateScores;
  tags: ReadonlySet<string>;
};

export function evaluateNinePalace(
  attributes: NinePalaceAttributes,
  registry: NinePalaceRegistry = loadNinePalaceRegistry()
): NinePalaceEvaluation {
  const checkedAttributes = validateAttributes(attributes);
  const threePowers = evaluateThreePowers(checkedAttributes, registry);
  const derived = evaluateDerivedScores(checkedAttributes, registry);
  const wuxing = evaluateWuxingInclination(checkedAttributes, registry);
  const tags = evaluateCausalityTags(checkedAttributes, threePowers, derived, wuxing, registry);

  return {
    attributes: { ...checkedAttributes },
    threePowers,
    derived,
    wuxing,
    tags
  };
}

function evaluateThreePowers(attributes: NinePalaceAttributes, registry: NinePalaceRegistry): ThreePowerScores {
  return {
    heaven: evaluateFormula(attributes, registry.getThreePower("heaven").scoreFormula),
    human: evaluateFormula(attributes, registry.getThreePower("human").scoreFormula),
    earth: evaluateFormula(attributes, registry.getThreePower("earth").scoreFormula)
  };
}

function evaluateDerivedScores(attributes: NinePalaceAttributes, registry: NinePalaceRegistry): DerivedFateScores {
  return {
    talentScore: evaluateFormula(attributes, registry.getDerivedScore("talentScore").formula),
    vesselScore: evaluateFormula(attributes, registry.getDerivedScore("vesselScore").formula),
    stabilityScore: evaluateFormula(attributes, registry.getDerivedScore("stabilityScore").formula),
    destinyPressureScore: evaluateFormula(attributes, registry.getDerivedScore("destinyPressureScore").formula),
    lateBloomScore: evaluateFormula(attributes, registry.getDerivedScore("lateBloomScore").formula),
    rebellionScore: evaluateFormula(attributes, registry.getDerivedScore("rebellionScore").formula)
  };
}

function evaluateWuxingInclination(attributes: NinePalaceAttributes, registry: NinePalaceRegistry): WuxingInclination {
  const scores = {} as Record<ElementId, number>;
  for (const elementId of ELEMENT_IDS) {
    const mapping = registry.getWuxingMapping(elementId);
    const total = mapping.attrs.reduce((sum, attributeId) => sum + attributes[attributeId], 0);
    scores[elementId] = Math.round(total / mapping.attrs.length);
  }
  return scores;
}

function evaluateFormula(
  attributes: NinePalaceAttributes,
  formula: Readonly<Record<string, number | undefined>>
): number {
  let weightedTotal = 0;
  let weightTotal = 0;
  for (const [inputId, weight] of Object.entries(formula)) {
    if (typeof weight !== "number" || weight <= 0) {
      continue;
    }
    weightedTotal += getFormulaInputValue(attributes, inputId) * weight;
    weightTotal += weight;
  }
  if (weightTotal <= 0) {
    throw new Error("Nine palace formula must contain at least one positive weight");
  }
  return Math.round(weightedTotal / weightTotal);
}

function getFormulaInputValue(attributes: NinePalaceAttributes, inputId: string): number {
  if (isFateAttributeId(inputId)) {
    return attributes[inputId];
  }
  if (inputId.endsWith("_inverse")) {
    const attributeId = inputId.slice(0, -"_inverse".length);
    if (isFateAttributeId(attributeId)) {
      return INVERSE_BASE - attributes[attributeId];
    }
  }
  throw new Error(`Unknown nine palace formula input: ${inputId}`);
}

function evaluateCausalityTags(
  attributes: NinePalaceAttributes,
  threePowers: ThreePowerScores,
  derived: DerivedFateScores,
  wuxing: WuxingInclination,
  registry: NinePalaceRegistry
): FateCausalityTags {
  const lifeEventBiasTags = collectLifeEventBiasTags(attributes, threePowers, derived, registry.attributeEventBiasRules);
  const context: ScoreContext = {
    attributes,
    threePowers,
    derived,
    tags: new Set(lifeEventBiasTags)
  };

  const destinyBiasTags: string[] = [];
  const warnings: string[] = [];
  for (const rule of registry.destinyEligibilityRules) {
    const requiredMatched = matchesAnyCondition(rule.requiredAny, context);
    if (!requiredMatched) {
      continue;
    }
    destinyBiasTags.push(`destinyBias:${stripDestinyPrefix(rule.id)}`);
    if (matchesAnyCondition(rule.antiConditions, context)) {
      warnings.push(`destinyBias:${stripDestinyPrefix(rule.id)} matched anti condition`);
    }
  }

  return {
    destinyBiasTags: unique(destinyBiasTags),
    lifeEventBiasTags,
    hiddenFateBiasTags: collectHiddenFateBiasTags(wuxing),
    rootBiasTags: collectRootBiasTags(attributes, wuxing),
    modeBiasTags: collectModeBiasTags(derived, wuxing),
    warnings: unique(warnings)
  };
}

function collectLifeEventBiasTags(
  attributes: NinePalaceAttributes,
  threePowers: ThreePowerScores,
  derived: DerivedFateScores,
  rules: readonly AttributeEventBiasRule[]
): string[] {
  const tags: string[] = [];
  const context: ScoreContext = {
    attributes,
    threePowers,
    derived,
    tags: new Set()
  };
  for (const rule of rules) {
    if (matchesConditionObject(rule.when, context)) {
      tags.push(...rule.addTags);
      context.tags = new Set(tags);
    }
  }
  return unique(tags);
}

function collectRootBiasTags(attributes: NinePalaceAttributes, wuxing: WuxingInclination): string[] {
  const tags: string[] = [];
  for (const elementId of ELEMENT_IDS) {
    if (wuxing[elementId] >= HIGH_BIAS_THRESHOLD) {
      tags.push(`root:${elementId}_bias`);
    }
  }
  if (attributes.rootBone <= LOW_ROOT_BONE_THRESHOLD) {
    tags.push("root:blocked_bias");
  }
  return unique(tags);
}

function collectHiddenFateBiasTags(wuxing: WuxingInclination): string[] {
  const tags: string[] = [];
  if (wuxing.thunder >= HIGH_BIAS_THRESHOLD) {
    tags.push("hiddenFate:thunder_bias");
  }
  if (wuxing.yin >= HIGH_BIAS_THRESHOLD) {
    tags.push("hiddenFate:yin_bias");
  }
  if (wuxing.wood >= HIGH_BIAS_THRESHOLD && wuxing.fire >= HIGH_BIAS_THRESHOLD) {
    tags.push("hiddenFate:alchemy_bias");
  }
  if (wuxing.earth >= HIGH_BIAS_THRESHOLD && wuxing.metal >= HIGH_BIAS_THRESHOLD) {
    tags.push("hiddenFate:body_lineage_bias");
  }
  return tags;
}

function collectModeBiasTags(derived: DerivedFateScores, wuxing: WuxingInclination): string[] {
  const tags: string[] = [];
  if (derived.destinyPressureScore >= HIGH_DESTINY_PRESSURE_THRESHOLD) {
    tags.push("mode:heaven_pressure_high");
  }
  if (wuxing.thunder >= HIGH_BIAS_THRESHOLD) {
    tags.push("mode:thunder_trial_bias");
  }
  if (derived.rebellionScore >= HIGH_BIAS_THRESHOLD) {
    tags.push("mode:counter_fate_bias");
  }
  if (derived.lateBloomScore >= HIGH_BIAS_THRESHOLD) {
    tags.push("mode:late_bloom_bias");
  }
  if (derived.stabilityScore <= LOW_STABILITY_THRESHOLD) {
    tags.push("mode:instability_risk");
  }
  return tags;
}

function matchesAnyCondition(conditions: readonly NinePalaceCondition[] | undefined, context: ScoreContext): boolean {
  if (!Array.isArray(conditions) || conditions.length === 0) {
    return false;
  }
  return conditions.some((condition) => matchesNinePalaceCondition(condition, context));
}

function matchesNinePalaceCondition(condition: NinePalaceCondition, context: ScoreContext): boolean {
  if (condition.score !== undefined) {
    const score = context.derived[condition.score];
    if (!matchesThreshold(score, condition.gte, condition.lte)) {
      return false;
    }
  }
  if (condition.attrs !== undefined && !matchesAttributeMap(condition.attrs, context.attributes)) {
    return false;
  }
  if (condition.combined !== undefined) {
    const combined = Object.entries(condition.combined).reduce((sum, [attributeId, weight]) => {
      if (!isFateAttributeId(attributeId) || typeof weight !== "number") {
        return sum;
      }
      return sum + context.attributes[attributeId] * weight;
    }, 0);
    if (!matchesThreshold(combined, condition.gte, condition.lte)) {
      return false;
    }
  }
  if (condition.tags !== undefined && !condition.tags.every((tag) => context.tags.has(tag))) {
    return false;
  }
  if (
    condition.score === undefined &&
    condition.attrs === undefined &&
    condition.combined === undefined &&
    condition.tags === undefined
  ) {
    return matchesThreshold(0, condition.gte, condition.lte);
  }
  return true;
}

function matchesAttributeMap(
  attrs: Readonly<Record<string, number | { readonly gte?: number; readonly lte?: number }>>,
  attributes: NinePalaceAttributes
): boolean {
  for (const [attributeId, condition] of Object.entries(attrs)) {
    if (!isFateAttributeId(attributeId)) {
      return false;
    }
    const value = attributes[attributeId];
    if (typeof condition === "number") {
      if (value < condition) {
        return false;
      }
    } else if (!matchesThreshold(value, condition.gte, condition.lte)) {
      return false;
    }
  }
  return true;
}

function matchesConditionObject(condition: Readonly<Record<string, unknown>>, context: ScoreContext): boolean {
  for (const [key, value] of Object.entries(condition)) {
    if (key === "hasTags") {
      if (!Array.isArray(value) || !value.every((tag) => typeof tag === "string" && context.tags.has(tag))) {
        return false;
      }
      continue;
    }
    if (typeof value !== "number") {
      return false;
    }
    const measuredValue = getConditionMetric(key, context);
    if (measuredValue === undefined) {
      return false;
    }
    if (key.endsWith("Gte") && measuredValue < value) {
      return false;
    }
    if (key.endsWith("Lte") && measuredValue > value) {
      return false;
    }
  }
  return true;
}

function getConditionMetric(key: string, context: ScoreContext): number | undefined {
  if (key === "heavenMinusEarthGte") {
    return context.threePowers.heaven - context.threePowers.earth;
  }
  if (key === "earthMinusHeavenGte") {
    return context.threePowers.earth - context.threePowers.heaven;
  }
  if (key === "humanSpreadGte") {
    return maxValue([context.attributes.jing, context.attributes.qi, context.attributes.shen]) - minValue([
      context.attributes.jing,
      context.attributes.qi,
      context.attributes.shen
    ]);
  }
  if (key === "maxPalaceSpreadLte") {
    const values = [context.threePowers.heaven, context.threePowers.human, context.threePowers.earth];
    return maxValue(values) - minValue(values);
  }

  const derivedGte = stripSuffix(key, "Gte");
  const derivedLte = stripSuffix(key, "Lte");
  const metricId = derivedGte ?? derivedLte;
  if (metricId === undefined) {
    return undefined;
  }
  if (isFateAttributeId(metricId)) {
    return context.attributes[metricId];
  }
  if (isDerivedScoreId(metricId)) {
    return context.derived[metricId];
  }
  return undefined;
}

function matchesThreshold(value: number, gte: number | undefined, lte: number | undefined): boolean {
  if (gte !== undefined && value < gte) {
    return false;
  }
  if (lte !== undefined && value > lte) {
    return false;
  }
  return true;
}

function validateAttributes(attributes: NinePalaceAttributes): NinePalaceAttributes {
  const checked = {} as Record<FateAttributeId, number>;
  for (const attributeId of ATTRIBUTE_IDS) {
    const value = attributes[attributeId];
    if (value === undefined) {
      throw new Error(`Missing nine palace attribute: ${attributeId}`);
    }
    if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
      throw new Error(`Nine palace attribute ${attributeId} must be a finite integer`);
    }
    if (value < ATTRIBUTE_MIN || value > ATTRIBUTE_MAX) {
      throw new Error(`Nine palace attribute ${attributeId} must be in range ${ATTRIBUTE_MIN}..${ATTRIBUTE_MAX}`);
    }
    checked[attributeId] = value;
  }
  return { ...checked };
}

function stripDestinyPrefix(id: string): string {
  return id.startsWith("destiny_") ? id.slice("destiny_".length) : id;
}

function stripSuffix(value: string, suffix: string): string | undefined {
  return value.endsWith(suffix) ? value.slice(0, -suffix.length) : undefined;
}

function isFateAttributeId(value: string): value is FateAttributeId {
  return (ATTRIBUTE_IDS as readonly string[]).includes(value);
}

function isDerivedScoreId(value: string): value is keyof DerivedFateScores {
  return [
    "talentScore",
    "vesselScore",
    "stabilityScore",
    "destinyPressureScore",
    "lateBloomScore",
    "rebellionScore"
  ].includes(value);
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function maxValue(values: readonly number[]): number {
  return values.reduce((max, value) => (value > max ? value : max), Number.NEGATIVE_INFINITY);
}

function minValue(values: readonly number[]): number {
  return values.reduce((min, value) => (value < min ? value : min), Number.POSITIVE_INFINITY);
}
