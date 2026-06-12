import type {
  LifeEventCondition,
  LifeEventContext,
  MonthlyLifeEventDefinition,
  NinePalaceLifeEventSummary
} from "../types/life-monthly-events-types.v0.1";
import type {
  DerivedFateScoreId,
  FateAttributeId,
  NinePalaceEvaluation,
  ThreePowerId
} from "../types/nine-palace-fate-types.v0.1";
import type {
  ChoiceContext,
  LifePhaseId as MajorChoiceLifePhaseId
} from "../types/major-life-choice-types.v0.1";

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

const DERIVED_SCORE_IDS = [
  "talentScore",
  "vesselScore",
  "stabilityScore",
  "destinyPressureScore",
  "lateBloomScore",
  "rebellionScore"
] as const satisfies readonly DerivedFateScoreId[];

const THREE_POWER_IDS = ["heaven", "human", "earth"] as const satisfies readonly ThreePowerId[];
const HIGH_ATTRIBUTE_THRESHOLD = 75;
const LOW_ATTRIBUTE_THRESHOLD = 35;
const HIGH_DESTINY_PRESSURE_THRESHOLD = 70;
const HIGH_LATE_BLOOM_THRESHOLD = 75;
const HIGH_REBELLION_THRESHOLD = 75;
const THREE_POWER_IMBALANCE_THRESHOLD = 20;

export interface CreateNinePalaceLifeEventContextOptions {
  readonly ageMonths?: number;
  readonly openingTags?: readonly string[];
  readonly destinyTags?: readonly string[];
  readonly originFateTags?: readonly string[];
  readonly carriedItemTags?: readonly string[];
}

export interface NinePalaceLifeEventContext extends LifeEventContext {
  readonly ageMonths?: number;
  readonly summary: NinePalaceLifeEventSummary;
}

export interface NinePalaceMonthlyLifeEventWeightOptions {
  readonly unknownConditionPolicy?: "ignore" | "block";
}

export interface CreateNinePalaceMajorChoiceContextOptions {
  readonly ageMonths?: number;
  readonly phaseId?: MajorChoiceLifePhaseId;
  readonly recentMonthlyEventIds?: readonly string[];
  readonly recentHooks?: readonly string[];
  readonly destinyTags?: readonly string[];
  readonly rootTags?: readonly string[];
  readonly originTags?: readonly string[];
  readonly hiddenFateHintTags?: readonly string[];
  readonly carriedItemTags?: readonly string[];
  readonly wounds?: readonly string[];
  readonly heartKnots?: readonly string[];
  readonly flags?: Readonly<Record<string, number | boolean | string>>;
  readonly repeatedChoiceTags?: Readonly<Record<string, number>>;
}

export function createNinePalaceLifeEventSummary(
  evaluation: NinePalaceEvaluation
): NinePalaceLifeEventSummary {
  const highAttributes = ATTRIBUTE_IDS.filter((attributeId) => evaluation.attributes[attributeId] >= HIGH_ATTRIBUTE_THRESHOLD);
  const lowAttributes = ATTRIBUTE_IDS.filter((attributeId) => evaluation.attributes[attributeId] <= LOW_ATTRIBUTE_THRESHOLD);
  const threePowerImbalanceTags = getThreePowerImbalanceTags(evaluation);
  const majorChoiceBiasTags = uniqueStable([
    ...highAttributes.map((attributeId) => `attrHigh:${attributeId}`),
    ...lowAttributes.map((attributeId) => `attrLow:${attributeId}`),
    ...getDerivedMajorChoiceTags(evaluation),
    ...threePowerImbalanceTags
  ]);
  const lifeEventBiasTags = uniqueStable([
    ...evaluation.tags.lifeEventBiasTags,
    ...getAttributeLifeEventTags(evaluation, highAttributes, lowAttributes),
    ...getDerivedLifeEventTags(evaluation),
    ...threePowerImbalanceTags
  ]);

  return deepFreeze({
    attributes: { ...evaluation.attributes },
    derivedScores: { ...evaluation.derived },
    threePowers: { ...evaluation.threePowers },
    wuxing: { ...evaluation.wuxing },
    lifeEventBiasTags,
    highAttributes,
    lowAttributes,
    threePowerImbalanceTags,
    majorChoiceBiasTags,
    debugTags: uniqueStable([
      `ninePalace.highAttributes:${highAttributes.join(",") || "none"}`,
      `ninePalace.lowAttributes:${lowAttributes.join(",") || "none"}`
    ])
  });
}

export function createLifeEventContextFromNinePalace(
  value: NinePalaceEvaluation | NinePalaceLifeEventSummary,
  options: CreateNinePalaceLifeEventContextOptions = {}
): NinePalaceLifeEventContext {
  const summary = toSummary(value);
  const openingTags = options.openingTags ?? [];
  const destinyTags = options.destinyTags ?? [];
  const originFateTags = options.originFateTags ?? [];
  const carriedItemTags = options.carriedItemTags ?? [];

  return deepFreeze({
    ...(options.ageMonths === undefined ? {} : { ageMonths: options.ageMonths }),
    openingTags,
    destinyTags,
    originFateTags,
    carriedItemTags,
    allTags: expandAllTags([
      ...openingTags,
      ...destinyTags,
      ...originFateTags,
      ...carriedItemTags,
      ...summary.lifeEventBiasTags,
      ...summary.majorChoiceBiasTags
    ]),
    summary
  });
}

export function calculateNinePalaceMonthlyLifeEventWeight(
  event: MonthlyLifeEventDefinition,
  context: NinePalaceLifeEventContext,
  options: NinePalaceMonthlyLifeEventWeightOptions = {}
): number {
  if (!isMonthlyLifeEventCandidate(event, context, options)) {
    return 0;
  }

  const tagMatches = event.tags.filter((tag) => hasTag(context.allTags, tag)).length;
  const conditionMatches = event.conditions.filter((condition) => conditionMatchesNinePalace(condition, context)).length;

  return event.baseWeight + tagMatches * 10 + conditionMatches * 8;
}

export function createMajorChoiceContextFromNinePalace(
  value: NinePalaceEvaluation | NinePalaceLifeEventSummary,
  options: CreateNinePalaceMajorChoiceContextOptions = {}
): ChoiceContext {
  const summary = toSummary(value);
  const expandedTags = expandAllTags([...summary.lifeEventBiasTags, ...summary.majorChoiceBiasTags]);
  const attributeTags = summary.majorChoiceBiasTags.filter((tag) => tag.startsWith("attrHigh:") || tag.startsWith("attrLow:"));

  return deepFreeze({
    ageMonths: options.ageMonths ?? 0,
    phaseId: options.phaseId ?? "infancy",
    recentMonthlyEventIds: options.recentMonthlyEventIds ?? [],
    recentHooks: options.recentHooks ?? [],
    destinyTags: uniqueStable([...(options.destinyTags ?? []), ...attributeTags, ...tagsWithPrefix(expandedTags, "destiny:")]),
    rootTags: uniqueStable([
      ...(options.rootTags ?? []),
      ...attributeTags.filter((tag) => tag.endsWith(":rootBone")),
      ...tagsWithPrefix(expandedTags, "root:")
    ]),
    originTags: options.originTags ?? [],
    hiddenFateHintTags: uniqueStable([
      ...(options.hiddenFateHintTags ?? []),
      ...tagsWithPrefix(expandedTags, "hiddenFate:"),
      ...(hasTag(expandedTags, "hidden_fate") ? ["event:hidden_fate"] : [])
    ]),
    carriedItemTags: options.carriedItemTags ?? [],
    wounds: options.wounds ?? [],
    heartKnots: options.heartKnots ?? [],
    flags: {
      ...(options.flags ?? {}),
      ...toNumericFlags("ninePalace.attribute", summary.attributes),
      ...toNumericFlags("ninePalace.derived", summary.derivedScores),
      ...toNumericFlags("ninePalace.threePower", summary.threePowers),
      ...toNumericFlags("ninePalace.wuxing", summary.wuxing)
    },
    repeatedChoiceTags: options.repeatedChoiceTags ?? {}
  });
}

function toSummary(value: NinePalaceEvaluation | NinePalaceLifeEventSummary): NinePalaceLifeEventSummary {
  if ("derivedScores" in value) {
    return value;
  }
  return createNinePalaceLifeEventSummary(value);
}

function getAttributeLifeEventTags(
  evaluation: NinePalaceEvaluation,
  highAttributes: readonly FateAttributeId[],
  lowAttributes: readonly FateAttributeId[]
): readonly string[] {
  const tags: string[] = [];
  if (highAttributes.includes("comprehension")) {
    tags.push("event:reading", "event:insight", "event:study");
  }
  if (highAttributes.includes("inspiration")) {
    tags.push("event:dream", "event:hidden_fate");
  }
  if (lowAttributes.includes("lifespan")) {
    tags.push("event:illness", "event:short_life", "event:health");
  }
  if (
    lowAttributes.includes("rootBone") &&
    (highAttributes.includes("heart") || evaluation.derived.rebellionScore >= HIGH_REBELLION_THRESHOLD)
  ) {
    tags.push("event:failed_cultivation", "event:reversal");
  }
  return tags;
}

function getDerivedLifeEventTags(evaluation: NinePalaceEvaluation): readonly string[] {
  const tags: string[] = [];
  if (evaluation.derived.destinyPressureScore >= HIGH_DESTINY_PRESSURE_THRESHOLD) {
    tags.push("event:illness", "event:short_life", "event:heaven_attention");
  }
  if (evaluation.derived.lateBloomScore >= HIGH_LATE_BLOOM_THRESHOLD) {
    tags.push("event:late_bloom");
  }
  if (evaluation.derived.rebellionScore >= HIGH_REBELLION_THRESHOLD) {
    tags.push("event:failed_cultivation", "event:reversal");
  }
  return tags;
}

function getDerivedMajorChoiceTags(evaluation: NinePalaceEvaluation): readonly string[] {
  const tags: string[] = [];
  if (evaluation.derived.destinyPressureScore >= HIGH_DESTINY_PRESSURE_THRESHOLD) {
    tags.push("derived:destinyPressureScore:high");
  }
  if (evaluation.derived.lateBloomScore >= HIGH_LATE_BLOOM_THRESHOLD) {
    tags.push("derived:lateBloomScore:high");
  }
  if (evaluation.derived.rebellionScore >= HIGH_REBELLION_THRESHOLD) {
    tags.push("derived:rebellionScore:high");
  }
  return tags;
}

function getThreePowerImbalanceTags(evaluation: NinePalaceEvaluation): readonly string[] {
  const entries = THREE_POWER_IDS.map((id) => ({ id, value: evaluation.threePowers[id] }));
  const first = entries[0]!;
  const strongest = entries.reduce((best, entry) => entry.value > best.value ? entry : best, first);
  const weakest = entries.reduce((best, entry) => entry.value < best.value ? entry : best, first);
  if (strongest.value - weakest.value < THREE_POWER_IMBALANCE_THRESHOLD) {
    return [];
  }
  return [`threePower:${strongest.id}:dominant`, `threePower:${weakest.id}:weak`];
}

function isMonthlyLifeEventCandidate(
  event: MonthlyLifeEventDefinition,
  context: NinePalaceLifeEventContext,
  options: NinePalaceMonthlyLifeEventWeightOptions
): boolean {
  if (context.ageMonths !== undefined && !isAgeInRange(context.ageMonths, event.ageRangeMonths)) {
    return false;
  }
  return event.conditions.every((condition) => evaluateCondition(condition, context, options));
}

function evaluateCondition(
  condition: LifeEventCondition,
  context: NinePalaceLifeEventContext,
  options: NinePalaceMonthlyLifeEventWeightOptions
): boolean {
  switch (condition.kind) {
    case "tagAny":
      return condition.tags.some((tag) => hasTag(context.allTags, tag));
    case "tagAll":
      return condition.tags.every((tag) => hasTag(context.allTags, tag));
    case "statAbove": {
      const value = getNinePalaceMetric(condition.stat, context.summary);
      return value === undefined ? options.unknownConditionPolicy !== "block" : value > condition.value;
    }
    case "statBelow": {
      const value = getNinePalaceMetric(condition.stat, context.summary);
      return value === undefined ? options.unknownConditionPolicy !== "block" : value < condition.value;
    }
    case "statAnyAbove":
      return condition.stats.some((stat) => {
        const value = getNinePalaceMetric(stat, context.summary);
        return value !== undefined && value > condition.value;
      }) || options.unknownConditionPolicy !== "block";
    default:
      return options.unknownConditionPolicy === "block" ? false : true;
  }
}

function conditionMatchesNinePalace(condition: LifeEventCondition, context: NinePalaceLifeEventContext): boolean {
  switch (condition.kind) {
    case "tagAny":
      return condition.tags.some((tag) => hasTag(context.allTags, tag));
    case "tagAll":
      return condition.tags.every((tag) => hasTag(context.allTags, tag));
    case "statAbove": {
      const value = getNinePalaceMetric(condition.stat, context.summary);
      return value !== undefined && value > condition.value;
    }
    case "statBelow": {
      const value = getNinePalaceMetric(condition.stat, context.summary);
      return value !== undefined && value < condition.value;
    }
    case "statAnyAbove":
      return condition.stats.some((stat) => {
        const value = getNinePalaceMetric(stat, context.summary);
        return value !== undefined && value > condition.value;
      });
    default:
      return false;
  }
}

function getNinePalaceMetric(stat: string, summary: NinePalaceLifeEventSummary): number | undefined {
  const normalized = stat.startsWith("ninePalace.") ? stat.slice("ninePalace.".length) : stat;
  if (isFateAttributeId(normalized)) {
    return summary.attributes[normalized];
  }
  if (isDerivedScoreId(normalized)) {
    return summary.derivedScores[normalized];
  }
  if (normalized.startsWith("derived.")) {
    const scoreId = normalized.slice("derived.".length);
    return isDerivedScoreId(scoreId) ? summary.derivedScores[scoreId] : undefined;
  }
  if (normalized.startsWith("threePower.")) {
    const powerId = normalized.slice("threePower.".length);
    return isThreePowerId(powerId) ? summary.threePowers[powerId] : undefined;
  }
  return undefined;
}

function expandAllTags(values: readonly string[]): readonly string[] {
  const expanded: string[] = [];
  for (const value of values) {
    if (value.length === 0) {
      continue;
    }
    expanded.push(value);
    if (value.startsWith("event:")) {
      const bare = value.slice("event:".length);
      expanded.push(bare, `lifeEvent:${bare}`);
    } else if (value.startsWith("lifeEvent:")) {
      const bare = value.slice("lifeEvent:".length);
      expanded.push(bare, `event:${bare}`);
    } else if (!value.includes(":")) {
      expanded.push(`event:${value}`, `lifeEvent:${value}`);
    }
    if (value.startsWith("root:")) {
      expanded.push(value.slice("root:".length));
    }
    if (value.startsWith("destiny:")) {
      expanded.push(value.slice("destiny:".length));
    }
  }
  return uniqueStable(expanded);
}

function hasTag(tags: readonly string[], expected: string): boolean {
  if (tags.includes(expected)) {
    return true;
  }
  if (expected.startsWith("event:")) {
    return tags.includes(expected.slice("event:".length));
  }
  if (expected.startsWith("lifeEvent:")) {
    return tags.includes(expected.slice("lifeEvent:".length));
  }
  return tags.includes(`event:${expected}`) || tags.includes(`lifeEvent:${expected}`);
}

function tagsWithPrefix(tags: readonly string[], prefix: string): readonly string[] {
  return uniqueStable(tags.filter((tag) => tag.startsWith(prefix)));
}

function toNumericFlags(
  prefix: string,
  values: object
): Readonly<Record<string, number>> {
  return Object.fromEntries(
    Object.entries(values)
      .filter((entry): entry is [string, number] => typeof entry[1] === "number")
      .map(([key, value]) => [`${prefix}.${key}`, value])
  );
}

function isAgeInRange(ageMonths: number, range: readonly [number, number]): boolean {
  return ageMonths >= range[0] && ageMonths <= range[1];
}

function isFateAttributeId(value: string): value is FateAttributeId {
  return (ATTRIBUTE_IDS as readonly string[]).includes(value);
}

function isDerivedScoreId(value: string): value is DerivedFateScoreId {
  return (DERIVED_SCORE_IDS as readonly string[]).includes(value);
}

function isThreePowerId(value: string): value is ThreePowerId {
  return (THREE_POWER_IDS as readonly string[]).includes(value);
}

function uniqueStable<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}
