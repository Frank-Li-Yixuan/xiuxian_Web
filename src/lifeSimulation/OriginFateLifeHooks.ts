import type {
  HiddenFateBandId,
  LifeEventCondition,
  LifeEventContext,
  MonthlyLifeEventDefinition
} from "../types/life-monthly-events-types.v0.1";
import type {
  ChoiceContext,
  LifePhaseId as MajorChoiceLifePhaseId
} from "../types/major-life-choice-types.v0.1";
import type {
  BackgroundOriginDefinition,
  CarriedItemDefinition,
  HiddenFateDefinition,
  HiddenFateVagueLevel,
  OriginFateDraft
} from "../types/origin-fate-types.v0.1";
import {
  loadOriginFateRegistry,
  type OriginFateRegistry
} from "../originFate/OriginFateRegistry";

const LIFE_BAND_RANK: Readonly<Record<HiddenFateBandId, number>> = {
  faint_omen: 0,
  stirring: 1,
  near_awake: 2,
  awakened: 3
};

export interface OriginFateLifeEventBias {
  readonly backgroundOriginId: string;
  readonly hiddenFateId: string;
  readonly carriedItemIds: readonly string[];
  readonly hiddenFateProgress: number;
  readonly hiddenFateBand: HiddenFateBandId;
  readonly backgroundTags: readonly string[];
  readonly hiddenFateTags: readonly string[];
  readonly carriedItemTags: readonly string[];
  readonly lifeEventBiasTags: readonly string[];
  readonly allTags: readonly string[];
}

export interface CreateLifeEventContextOptions {
  readonly ageMonths?: number;
  readonly openingTags?: readonly string[];
  readonly destinyTags?: readonly string[];
  readonly registry?: OriginFateRegistry;
}

export interface OriginFateLifeEventContext extends LifeEventContext {
  readonly ageMonths?: number;
  readonly hiddenFateProgress: Readonly<Record<string, number>>;
  readonly hiddenFateBands: Readonly<Record<string, HiddenFateBandId>>;
  readonly bias: OriginFateLifeEventBias;
}

export interface MonthlyLifeEventWeightOptions {
  readonly unknownConditionPolicy?: "ignore" | "block";
}

export interface CreateMajorChoiceContextOptions {
  readonly ageMonths?: number;
  readonly phaseId?: MajorChoiceLifePhaseId;
  readonly recentMonthlyEventIds?: readonly string[];
  readonly recentHooks?: readonly string[];
  readonly destinyTags?: readonly string[];
  readonly rootTags?: readonly string[];
  readonly wounds?: readonly string[];
  readonly heartKnots?: readonly string[];
  readonly flags?: Readonly<Record<string, number | boolean | string>>;
  readonly repeatedChoiceTags?: Readonly<Record<string, number>>;
  readonly registry?: OriginFateRegistry;
}

export function getLifeEventBiasFromOriginFate(
  originFate: OriginFateDraft,
  registry: OriginFateRegistry = loadOriginFateRegistry()
): OriginFateLifeEventBias {
  const background = getIfPresent(() => registry.getBackgroundOrigin(originFate.backgroundOrigin.originId));
  const hiddenFate = getIfPresent(() => registry.getHiddenFate(originFate.hiddenFateInternal.hiddenFateId));
  const carriedItems = originFate.carriedItems
    .map((item) => getIfPresent(() => registry.getCarriedItem(item.itemId)))
    .filter((item): item is CarriedItemDefinition => item !== undefined);
  const hiddenFateBand = getHiddenFateBandForLifeSimulation(originFate);

  const backgroundTags = buildBackgroundTags(originFate, background);
  const hiddenFateTags = buildHiddenFateTags(originFate, hiddenFate, hiddenFateBand);
  const carriedItemTags = buildCarriedItemTags(originFate, carriedItems);
  const lifeEventBiasTags = uniqueStable([
    ...originFate.lifeEventBiasTags,
    ...backgroundTags,
    ...hiddenFateTags,
    ...carriedItemTags
  ]);

  return {
    backgroundOriginId: originFate.backgroundOrigin.originId,
    hiddenFateId: originFate.hiddenFateInternal.hiddenFateId,
    carriedItemIds: originFate.carriedItems.map((item) => item.itemId),
    hiddenFateProgress: originFate.hiddenFateInternal.progress,
    hiddenFateBand,
    backgroundTags,
    hiddenFateTags,
    carriedItemTags,
    lifeEventBiasTags,
    allTags: expandAllTags(lifeEventBiasTags)
  };
}

export function createLifeEventContextFromOriginFate(
  originFate: OriginFateDraft,
  options: CreateLifeEventContextOptions = {}
): OriginFateLifeEventContext {
  const bias = getLifeEventBiasFromOriginFate(originFate, options.registry);
  const openingTags = options.openingTags ?? [];
  const destinyTags = options.destinyTags ?? [];

  return {
    ...(options.ageMonths === undefined ? {} : { ageMonths: options.ageMonths }),
    openingTags,
    destinyTags,
    originFateTags: bias.lifeEventBiasTags,
    carriedItemTags: bias.carriedItemTags,
    allTags: expandAllTags([...openingTags, ...destinyTags, ...bias.allTags]),
    hiddenFateProgress: {
      [bias.hiddenFateId]: bias.hiddenFateProgress
    },
    hiddenFateBands: {
      [bias.hiddenFateId]: bias.hiddenFateBand
    },
    bias
  };
}

export function calculateMonthlyLifeEventWeight(
  event: MonthlyLifeEventDefinition,
  context: OriginFateLifeEventContext,
  options: MonthlyLifeEventWeightOptions = {}
): number {
  if (!isMonthlyLifeEventCandidate(event, context, options)) {
    return 0;
  }

  const tagMatches = event.tags.filter((tag) => hasTag(context.allTags, tag)).length;
  const conditionMatches = event.conditions.filter((condition) => conditionMatchesOriginFate(condition, context)).length;

  return event.baseWeight + tagMatches * 10 + conditionMatches * 8;
}

export function filterMonthlyLifeEventCandidates(
  events: readonly MonthlyLifeEventDefinition[],
  context: OriginFateLifeEventContext,
  options: MonthlyLifeEventWeightOptions = {}
): readonly MonthlyLifeEventDefinition[] {
  return events.filter((event) => isMonthlyLifeEventCandidate(event, context, options));
}

export function getHiddenFateBandForLifeSimulation(originFate: OriginFateDraft): HiddenFateBandId {
  return progressToLifeBand(originFate.hiddenFateInternal.progress) ?? vagueBandToLifeBand(originFate.hiddenFateInternal.progressBand);
}

export function isHiddenFateBandAtLeast(
  originFate: OriginFateDraft,
  minimumBand: HiddenFateBandId,
  hiddenFateId: string = originFate.hiddenFateInternal.hiddenFateId
): boolean {
  if (hiddenFateId !== originFate.hiddenFateInternal.hiddenFateId) {
    return false;
  }
  return LIFE_BAND_RANK[getHiddenFateBandForLifeSimulation(originFate)] >= LIFE_BAND_RANK[minimumBand];
}

export function shouldAllowHiddenMajorChoiceOptions(
  originFate: OriginFateDraft,
  minimumBand: HiddenFateBandId = "near_awake"
): boolean {
  return isHiddenFateBandAtLeast(originFate, minimumBand);
}

export function createMajorChoiceContextFromOriginFate(
  originFate: OriginFateDraft,
  options: CreateMajorChoiceContextOptions = {}
): ChoiceContext {
  const bias = getLifeEventBiasFromOriginFate(originFate, options.registry);
  const hiddenOptionsEnabled = shouldAllowHiddenMajorChoiceOptions(originFate);

  return {
    ageMonths: options.ageMonths ?? 0,
    phaseId: options.phaseId ?? "infancy",
    recentMonthlyEventIds: options.recentMonthlyEventIds ?? [],
    recentHooks: options.recentHooks ?? [],
    destinyTags: uniqueStable([...(options.destinyTags ?? []), ...tagsWithPrefix(bias.allTags, "destiny:")]),
    rootTags: uniqueStable([...(options.rootTags ?? []), ...tagsWithPrefix(bias.allTags, "root:")]),
    originTags: uniqueStable([...bias.backgroundTags, ...tagsWithPrefix(bias.allTags, "origin:")]),
    hiddenFateHintTags: uniqueStable([...bias.hiddenFateTags, `hiddenFateBand:${bias.hiddenFateBand}`]),
    carriedItemTags: bias.carriedItemTags,
    wounds: options.wounds ?? [],
    heartKnots: options.heartKnots ?? [],
    flags: {
      ...(options.flags ?? {}),
      [`hiddenFateProgress.${bias.hiddenFateId}`]: bias.hiddenFateProgress,
      [`hiddenFateBand.${bias.hiddenFateId}`]: bias.hiddenFateBand,
      "hiddenChoiceOptions.enabled": hiddenOptionsEnabled
    },
    repeatedChoiceTags: options.repeatedChoiceTags ?? {}
  };
}

function isMonthlyLifeEventCandidate(
  event: MonthlyLifeEventDefinition,
  context: OriginFateLifeEventContext,
  options: MonthlyLifeEventWeightOptions
): boolean {
  if (context.ageMonths !== undefined && !isAgeInRange(context.ageMonths, event.ageRangeMonths)) {
    return false;
  }

  return event.conditions.every((condition) => evaluateCondition(condition, context, options));
}

function evaluateCondition(
  condition: LifeEventCondition,
  context: OriginFateLifeEventContext,
  options: MonthlyLifeEventWeightOptions
): boolean {
  switch (condition.kind) {
    case "tagAny":
      return condition.tags.some((tag) => hasTag(context.allTags, tag));
    case "tagAll":
      return condition.tags.every((tag) => hasTag(context.allTags, tag));
    case "hiddenFateBandAtLeast": {
      const band = context.hiddenFateBands[condition.hiddenFateId];
      return band !== undefined && LIFE_BAND_RANK[band] >= LIFE_BAND_RANK[condition.band];
    }
    default:
      return options.unknownConditionPolicy === "block" ? false : true;
  }
}

function conditionMatchesOriginFate(condition: LifeEventCondition, context: OriginFateLifeEventContext): boolean {
  switch (condition.kind) {
    case "tagAny":
      return condition.tags.some((tag) => hasTag(context.allTags, tag));
    case "tagAll":
      return condition.tags.every((tag) => hasTag(context.allTags, tag));
    case "hiddenFateBandAtLeast": {
      const band = context.hiddenFateBands[condition.hiddenFateId];
      return band !== undefined && LIFE_BAND_RANK[band] >= LIFE_BAND_RANK[condition.band];
    }
    default:
      return false;
  }
}

function buildBackgroundTags(originFate: OriginFateDraft, definition: BackgroundOriginDefinition | undefined): readonly string[] {
  const bareOriginId = stripKnownPrefix(originFate.backgroundOrigin.originId, "origin_");
  return uniqueStable([
    originFate.backgroundOrigin.originId,
    `origin:${bareOriginId}`,
    ...originFate.backgroundOrigin.matchedTags,
    ...(definition?.toneTags ?? []),
    ...(definition?.lifeEventBiasTags ?? []),
    ...(definition?.hiddenFateBiasTags ?? []),
    ...(definition?.carriedItemBiasTags ?? [])
  ]);
}

function buildHiddenFateTags(
  originFate: OriginFateDraft,
  definition: HiddenFateDefinition | undefined,
  hiddenFateBand: HiddenFateBandId
): readonly string[] {
  const bareHiddenId = stripKnownPrefix(originFate.hiddenFateInternal.hiddenFateId, "hidden_");
  return uniqueStable([
    originFate.hiddenFateInternal.hiddenFateId,
    `hidden:${bareHiddenId}`,
    `hiddenFate:${originFate.hiddenFateInternal.hiddenFateId}`,
    `hiddenFateCategory:${originFate.hiddenFateInternal.category}`,
    `hiddenFateBand:${hiddenFateBand}`,
    ...originFate.hiddenFateInternal.matchedTags,
    ...(definition?.biasTags ?? []),
    ...(definition?.lifeEventBiasTags ?? []),
    ...(definition?.dongfuHooks ?? [])
  ]);
}

function buildCarriedItemTags(
  originFate: OriginFateDraft,
  definitions: readonly CarriedItemDefinition[]
): readonly string[] {
  const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));
  const tags: string[] = [];
  for (const item of originFate.carriedItems) {
    const definition = definitionById.get(item.itemId);
    tags.push(
      item.itemId,
      `carried:${stripKnownPrefix(item.itemId, "origin_item_")}`,
      `carriedItem:${item.itemId}`,
      ...item.matchedTags,
      ...(definition?.biasTags ?? []),
      ...(definition?.hiddenFateSynergyTags ?? []),
      ...(definition?.lifeEventTags ?? [])
    );
  }
  return uniqueStable(tags);
}

function expandAllTags(values: readonly string[]): readonly string[] {
  const expanded: string[] = [];
  for (const value of values) {
    const bare = value.startsWith("lifeEvent:") ? value.slice("lifeEvent:".length) : value;
    expanded.push(value, bare);
    if (!value.includes(":")) {
      expanded.push(`lifeEvent:${value}`, `hiddenBias:${value}`);
    }
    if (value.startsWith("root:")) {
      expanded.push(value.slice("root:".length));
    }
    if (value.startsWith("destiny:")) {
      expanded.push(value.slice("destiny:".length));
    }
  }
  return uniqueStable(expanded.filter((value) => value.length > 0));
}

function hasTag(tags: readonly string[], expected: string): boolean {
  if (tags.includes(expected)) {
    return true;
  }
  if (expected.startsWith("lifeEvent:")) {
    return tags.includes(expected.slice("lifeEvent:".length));
  }
  return tags.includes(`lifeEvent:${expected}`);
}

function tagsWithPrefix(tags: readonly string[], prefix: string): readonly string[] {
  return uniqueStable(tags.filter((tag) => tag.startsWith(prefix)));
}

function progressToLifeBand(progress: number): HiddenFateBandId | undefined {
  if (!Number.isFinite(progress)) {
    return undefined;
  }
  if (progress >= 100) {
    return "awakened";
  }
  if (progress >= 70) {
    return "near_awake";
  }
  if (progress >= 30) {
    return "stirring";
  }
  return "faint_omen";
}

function vagueBandToLifeBand(band: HiddenFateVagueLevel): HiddenFateBandId {
  switch (band) {
    case "faint":
      return "faint_omen";
    case "nearAwakened":
      return "near_awake";
    default:
      return band;
  }
}

function isAgeInRange(ageMonths: number, range: readonly [number, number]): boolean {
  return ageMonths >= range[0] && ageMonths <= range[1];
}

function stripKnownPrefix(value: string, prefix: string): string {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

function getIfPresent<T>(read: () => T): T | undefined {
  try {
    return read();
  } catch {
    return undefined;
  }
}

function uniqueStable<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}
