import type {
  LifeEventCondition,
  MonthlyLifeEventDefinition
} from "../types/life-monthly-events-types.v0.1";
import type {
  ChoiceContext,
  LifePhaseId as MajorChoiceLifePhaseId
} from "../types/major-life-choice-types.v0.1";
import type {
  LifeInterludeHistoryEntry,
  LifeInterludeTriggerContext
} from "../types/life-interlude-types.v0.1";
import type { LifeStorylineState } from "../types/life-storylines-types.v0.1";
import type {
  HiddenFateRevealBand,
  OriginFateNarrativeLifeEventContext,
  OriginFateNarrativeLifeEventSummary,
  OriginFateNarrativeStageTransitionContext,
  OriginFateNarrativeStateV02
} from "../types/origin-fate-narrative-types.v0.2";
import { createCarriedItemLifecycleHooks } from "../originFate/CarriedItemLifecycleEngine";
import {
  loadOriginFateNarrativeRegistry,
  type OriginFateNarrativeRegistry
} from "../originFate/OriginFateNarrativeRegistry";
import { buildPublicOmenView } from "../originFate/RevealMisdirectionEngine";
import {
  applyMonthlyEventStorylineWeight,
  type MonthlyEventStorylineProjection
} from "./MonthlyEventStorylineAdapter";
import {
  appendStorylineHooksToChoiceContext,
  type MajorChoiceStorylineProjection
} from "./MajorChoiceStorylineAdapter";

export interface OriginFateNarrativeLifeHooksContext {
  readonly registry?: OriginFateNarrativeRegistry;
}

export interface CreateOriginFateNarrativeLifeEventContextOptions {
  readonly ageMonths?: number;
  readonly openingTags?: readonly string[];
  readonly destinyTags?: readonly string[];
  readonly originFateTags?: readonly string[];
  readonly carriedItemTags?: readonly string[];
}

export interface OriginFateNarrativeMonthlyLifeEventWeightOptions {
  readonly unknownConditionPolicy?: "ignore" | "block";
  readonly lifeStorylineState?: LifeStorylineState;
  readonly storylineProjection?: MonthlyEventStorylineProjection;
}

export interface CreateOriginFateNarrativeMajorChoiceContextOptions {
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
  readonly lifeStorylineState?: LifeStorylineState;
  readonly storylineChoiceProjection?: MajorChoiceStorylineProjection;
}

export interface CreateOriginFateNarrativeInterludeContextOptions {
  readonly ageMonth?: number;
  readonly phaseId?: string;
  readonly recentMonthlyEventIds?: readonly string[];
  readonly recentHooks?: readonly string[];
  readonly openingTags?: readonly string[];
  readonly destinyTags?: readonly string[];
  readonly rootTags?: readonly string[];
  readonly currentWoundIds?: readonly string[];
  readonly currentHeartKnotIds?: readonly string[];
  readonly merit?: number;
  readonly karma?: number;
  readonly recentInterludesLast24Months?: number;
  readonly interludeHistory?: readonly LifeInterludeHistoryEntry[];
}

const LIFE_BAND_RANK: Readonly<Record<HiddenFateRevealBand, number>> = {
  seed: 0,
  omen: 0,
  stirring: 1,
  halfReveal: 1,
  nearAwake: 2,
  awakened: 3
};

const ORIGIN_COMPAT_ALIASES: Readonly<Record<string, readonly string[]>> = {
  origin_apothecary_apprentice: ["origin:herb_shop_apprentice", "origin:apothecary"],
  origin_grave_keeper_child: ["origin:gravekeeper", "origin:grave_keeper"],
  origin_fallen_cultivator_descendant: ["origin:fallen_cultivator_descendant", "origin:fallen_lineage"],
  origin_temple_servant: ["origin:daoist_temple_servant", "origin:temple_servant"]
};

const HIDDEN_COMPAT_ALIASES: Readonly<Record<string, readonly string[]>> = {
  hidden_alchemy_saint_bone: ["hiddenBias:alchemy"],
  hidden_past_life_sword_soul: ["hiddenBias:sword"],
  hidden_taiyin_remnant_vein: ["hiddenBias:taiyin"]
};

const ITEM_COMPAT_ALIASES: Readonly<Record<string, readonly string[]>> = {
  item_wooden_sword: [
    "item:broken_wooden_sword",
    "hasCarriedItem:origin_item_broken_wooden_sword",
    "hasCarriedItemTag:origin_item_broken_wooden_sword"
  ],
  item_jade_amulet: ["item:ancestral_jade", "hasCarriedItem:origin_item_ancestral_jade"],
  item_blank_fragment: ["item:wordless_page"],
  item_black_bone_flute: ["item:black_bone_flute"],
  item_apothecary_bronze_furnace: ["item:apothecary_bronze_furnace"]
};

export function createOriginFateNarrativeLifeEventSummary(
  state: OriginFateNarrativeStateV02,
  context: OriginFateNarrativeLifeHooksContext = {}
): OriginFateNarrativeLifeEventSummary {
  const registry = context.registry ?? loadOriginFateNarrativeRegistry();
  const origin = registry.getOriginStoryline(state.origin.originId);
  const itemHooks = createCarriedItemLifecycleHooks(state.carriedItems, { registry });
  const hiddenDefinitions = state.hiddenFates.map((hiddenFate) => registry.getHiddenFate(hiddenFate.hiddenFateId));
  const hiddenFateProgress = Object.fromEntries(state.hiddenFates.map((hiddenFate) => [hiddenFate.hiddenFateId, hiddenFate.progress]));
  const hiddenFateBands = Object.fromEntries(state.hiddenFates.map((hiddenFate) => [hiddenFate.hiddenFateId, hiddenFate.revealBand]));
  const monthlyLogOmenLines = uniqueStable(
    state.hiddenFates.flatMap((hiddenFate) =>
      buildPublicOmenView(hiddenFate, {
        registry,
        surface: "monthlyLog"
      }).omenLines
    )
  );

  return deepFreeze({
    originId: state.origin.originId,
    activeStorylineIds: [...state.origin.activeStorylineIds],
    canonicalLifeStorylineIds: [...state.origin.canonicalLifeStorylineIds],
    hiddenFateIds: state.hiddenFates.map((hiddenFate) => hiddenFate.hiddenFateId),
    carriedItemIds: state.carriedItems.map((item) => item.itemId),
    hiddenFateProgress,
    hiddenFateBands,
    lifeEventBiasTags: uniqueStable([
      ...state.lifeEventBiasTags,
      ...state.origin.lifeEventBiasTags,
      ...origin.regionTags,
      ...hiddenDefinitions.flatMap((hiddenFate) => hiddenFate.lifeEventHooks),
      ...hiddenDefinitions.flatMap((hiddenFate) => hiddenFate.primaryTags),
      ...itemHooks.monthlyEventHooks
    ]),
    originRegionTags: [...origin.regionTags],
    carriedItemMonthlyHooks: [...itemHooks.monthlyEventHooks],
    majorChoiceSignals: uniqueStable([
      ...state.majorChoiceSignals,
      ...hiddenDefinitions.flatMap((hiddenFate) => hiddenFate.majorChoiceHooks)
    ]),
    carriedItemMajorChoiceHooks: [...itemHooks.majorChoiceHooks],
    interludeBiasTags: uniqueStable([
      ...state.interludeBiasTags,
      ...state.origin.interludeBiasTags.map((id) => `interlude:${id}`),
      ...itemHooks.interludeCandidateBiasTags,
      ...hiddenDefinitions.flatMap((hiddenFate) => hiddenFate.interludeHooks.map((id) => `interlude:${id}`))
    ]),
    stageTransitionTokens: uniqueStable([
      ...state.stageTransitionTokens,
      ...hiddenDefinitions.flatMap((hiddenFate) => hiddenFate.stageTransitionTokens)
    ]),
    age18Hooks: uniqueStable([
      ...state.age18Hooks,
      ...hiddenDefinitions.flatMap((hiddenFate) => hiddenFate.age18Outcomes),
      ...itemHooks.age18Hooks
    ]),
    monthlyLogOmenLines,
    debugTags: uniqueStable([
      `originFateNarrative.origin:${state.origin.originId}`,
      ...state.hiddenFates.map((hiddenFate) => `originFateNarrative.hidden:${hiddenFate.hiddenFateId}`),
      ...state.carriedItems.map((item) => `originFateNarrative.item:${item.itemId}`)
    ])
  });
}

export function createLifeEventContextFromOriginFateNarrative(
  value: OriginFateNarrativeStateV02 | OriginFateNarrativeLifeEventSummary,
  options: CreateOriginFateNarrativeLifeEventContextOptions = {},
  context: OriginFateNarrativeLifeHooksContext = {}
): OriginFateNarrativeLifeEventContext {
  const summary = toSummary(value, context);
  const openingTags = options.openingTags ?? [];
  const destinyTags = options.destinyTags ?? [];
  const originFateTags = options.originFateTags ?? [];
  const carriedItemTags = options.carriedItemTags ?? [];

  return deepFreeze({
    ...(options.ageMonths === undefined ? {} : { ageMonths: options.ageMonths }),
    openingTags,
    destinyTags,
    originFateTags: uniqueStable([
      ...originFateTags,
      ...summary.lifeEventBiasTags,
      ...buildOriginTags(summary),
      ...buildHiddenTags(summary)
    ]),
    carriedItemTags: uniqueStable([
      ...carriedItemTags,
      ...buildCarriedItemTags(summary),
      ...summary.carriedItemMonthlyHooks
    ]),
    allTags: expandAllTags([
      ...openingTags,
      ...destinyTags,
      ...originFateTags,
      ...carriedItemTags,
      ...summary.lifeEventBiasTags,
      ...buildOriginTags(summary),
      ...buildHiddenTags(summary),
      ...buildCarriedItemTags(summary),
      ...summary.carriedItemMonthlyHooks,
      ...summary.majorChoiceSignals,
      ...summary.interludeBiasTags
    ]),
    hiddenFateProgress: { ...summary.hiddenFateProgress },
    hiddenFateBands: { ...summary.hiddenFateBands },
    monthlyLogOmenLines: [...summary.monthlyLogOmenLines],
    summary
  });
}

export function calculateOriginFateNarrativeMonthlyLifeEventWeight(
  event: MonthlyLifeEventDefinition,
  context: OriginFateNarrativeLifeEventContext,
  options: OriginFateNarrativeMonthlyLifeEventWeightOptions = {}
): number {
  if (!isMonthlyLifeEventCandidate(event, context, options)) {
    return 0;
  }
  const tagMatches = event.tags.filter((tag) => hasTag(context.allTags, tag)).length;
  const conditionMatches = event.conditions.filter((condition) => conditionMatchesOriginFateNarrative(condition, context)).length;
  const baseWeight = event.baseWeight + tagMatches * 10 + conditionMatches * 8;
  return applyMonthlyEventStorylineWeight(event, baseWeight, options.storylineProjection ?? options.lifeStorylineState);
}

export function filterOriginFateNarrativeMonthlyLifeEventCandidates(
  events: readonly MonthlyLifeEventDefinition[],
  context: OriginFateNarrativeLifeEventContext,
  options: OriginFateNarrativeMonthlyLifeEventWeightOptions = {}
): readonly MonthlyLifeEventDefinition[] {
  return events.filter((event) => isMonthlyLifeEventCandidate(event, context, options));
}

export function createMajorChoiceContextFromOriginFateNarrative(
  value: OriginFateNarrativeStateV02 | OriginFateNarrativeLifeEventSummary,
  options: CreateOriginFateNarrativeMajorChoiceContextOptions = {},
  context: OriginFateNarrativeLifeHooksContext = {}
): ChoiceContext {
  const summary = toSummary(value, context);

  const choiceContext = deepFreeze({
    ageMonths: options.ageMonths ?? 0,
    phaseId: options.phaseId ?? "infancy",
    recentMonthlyEventIds: options.recentMonthlyEventIds ?? [],
    recentHooks: options.recentHooks ?? [],
    destinyTags: options.destinyTags ?? [],
    rootTags: options.rootTags ?? [],
    originTags: buildOriginTags(summary),
    hiddenFateHintTags: uniqueStable([
      ...summary.majorChoiceSignals,
      ...buildHiddenTags(summary),
      ...Object.entries(summary.hiddenFateBands).map(([id, band]) => `hiddenFateBand:${id}:${band}`)
    ]),
    carriedItemTags: uniqueStable([
      ...summary.carriedItemMajorChoiceHooks,
      ...buildCarriedItemTags(summary)
    ]),
    wounds: options.wounds ?? [],
    heartKnots: options.heartKnots ?? [],
    flags: {
      ...(options.flags ?? {}),
      ...toNumericFlags("originFateNarrative.hiddenFateProgress", summary.hiddenFateProgress),
      ...toStringFlags("originFateNarrative.hiddenFateBand", summary.hiddenFateBands)
    },
    repeatedChoiceTags: options.repeatedChoiceTags ?? {}
  });
  return appendStorylineHooksToChoiceContext(choiceContext, options.storylineChoiceProjection ?? options.lifeStorylineState);
}

export function createLifeInterludeContextFromOriginFateNarrative(
  value: OriginFateNarrativeStateV02 | OriginFateNarrativeLifeEventSummary,
  options: CreateOriginFateNarrativeInterludeContextOptions = {},
  context: OriginFateNarrativeLifeHooksContext = {}
): LifeInterludeTriggerContext {
  const summary = toSummary(value, context);

  return deepFreeze({
    ageMonth: options.ageMonth ?? 0,
    phaseId: options.phaseId ?? "infancy",
    recentMonthlyEventIds: options.recentMonthlyEventIds ?? [],
    recentHooks: uniqueStable([...(options.recentHooks ?? []), ...summary.monthlyLogOmenLines]),
    activeStorylineTags: uniqueStable([
      ...summary.activeStorylineIds.map((id) => `storyline:${id}`),
      ...summary.canonicalLifeStorylineIds.map((id) => `lifeStoryline:${id}`)
    ]),
    activeThreadTags: [...summary.interludeBiasTags],
    openingTags: options.openingTags ?? [],
    destinyTags: options.destinyTags ?? [],
    rootTags: options.rootTags ?? [],
    originTags: buildOriginTags(summary),
    itemTags: buildCarriedItemTags(summary),
    currentWoundIds: options.currentWoundIds ?? [],
    currentHeartKnotIds: options.currentHeartKnotIds ?? [],
    merit: options.merit ?? 0,
    karma: options.karma ?? 0,
    recentInterludesLast24Months: options.recentInterludesLast24Months ?? 0,
    interludeHistory: options.interludeHistory ?? []
  });
}

export function createStageTransitionContextFromOriginFateNarrative(
  value: OriginFateNarrativeStateV02 | OriginFateNarrativeLifeEventSummary,
  context: OriginFateNarrativeLifeHooksContext = {}
): OriginFateNarrativeStageTransitionContext {
  const summary = toSummary(value, context);
  return deepFreeze({
    originId: summary.originId,
    hiddenFateIds: [...summary.hiddenFateIds],
    carriedItemIds: [...summary.carriedItemIds],
    hiddenFateBands: { ...summary.hiddenFateBands },
    stageTransitionTokens: [...summary.stageTransitionTokens],
    age18Hooks: [...summary.age18Hooks],
    debugTags: uniqueStable([
      `originFateNarrative.stageTransition.origin:${summary.originId}`,
      ...summary.stageTransitionTokens.map((token) => `originFateNarrative.stageTransition.token:${token}`)
    ])
  });
}

function toSummary(
  value: OriginFateNarrativeStateV02 | OriginFateNarrativeLifeEventSummary,
  context: OriginFateNarrativeLifeHooksContext
): OriginFateNarrativeLifeEventSummary {
  if ("hiddenFateIds" in value) {
    return value;
  }
  return createOriginFateNarrativeLifeEventSummary(value, context);
}

function isMonthlyLifeEventCandidate(
  event: MonthlyLifeEventDefinition,
  context: OriginFateNarrativeLifeEventContext,
  options: OriginFateNarrativeMonthlyLifeEventWeightOptions
): boolean {
  if (context.ageMonths !== undefined && !isAgeInRange(context.ageMonths, event.ageRangeMonths)) {
    return false;
  }
  return event.conditions.every((condition) => evaluateCondition(condition, context, options));
}

function evaluateCondition(
  condition: LifeEventCondition,
  context: OriginFateNarrativeLifeEventContext,
  options: OriginFateNarrativeMonthlyLifeEventWeightOptions
): boolean {
  switch (condition.kind) {
    case "tagAny":
      return condition.tags.some((tag) => hasTag(context.allTags, tag));
    case "tagAll":
      return condition.tags.every((tag) => hasTag(context.allTags, tag));
    case "hiddenFateBandAtLeast": {
      const band = context.hiddenFateBands[condition.hiddenFateId] ?? context.hiddenFateBands[mapLegacyHiddenFateId(condition.hiddenFateId)];
      return band !== undefined && LIFE_BAND_RANK[band] >= legacyBandRank(condition.band);
    }
    default:
      return options.unknownConditionPolicy === "block" ? false : true;
  }
}

function conditionMatchesOriginFateNarrative(
  condition: LifeEventCondition,
  context: OriginFateNarrativeLifeEventContext
): boolean {
  switch (condition.kind) {
    case "tagAny":
      return condition.tags.some((tag) => hasTag(context.allTags, tag));
    case "tagAll":
      return condition.tags.every((tag) => hasTag(context.allTags, tag));
    case "hiddenFateBandAtLeast": {
      const band = context.hiddenFateBands[condition.hiddenFateId] ?? context.hiddenFateBands[mapLegacyHiddenFateId(condition.hiddenFateId)];
      return band !== undefined && LIFE_BAND_RANK[band] >= legacyBandRank(condition.band);
    }
    default:
      return false;
  }
}

function buildOriginTags(summary: OriginFateNarrativeLifeEventSummary): readonly string[] {
  return uniqueStable([
    summary.originId,
    `origin:${summary.originId}`,
    `origin:${stripPrefix(summary.originId, "origin_")}`,
    ...summary.originRegionTags.map((tag) => `region:${tag}`),
    ...summary.activeStorylineIds.map((id) => `storyline:${id}`),
    ...summary.canonicalLifeStorylineIds.map((id) => `lifeStoryline:${id}`),
    ...(ORIGIN_COMPAT_ALIASES[summary.originId] ?? [])
  ]);
}

function buildHiddenTags(summary: OriginFateNarrativeLifeEventSummary): readonly string[] {
  const tags: string[] = [];
  for (const hiddenFateId of summary.hiddenFateIds) {
    tags.push(hiddenFateId, `hidden:${hiddenFateId}`, `hiddenFate:${hiddenFateId}`, ...(HIDDEN_COMPAT_ALIASES[hiddenFateId] ?? []));
  }
  for (const tag of summary.lifeEventBiasTags) {
    if (!tag.startsWith("hook_")) {
      tags.push(tag, `hiddenBias:${tag}`);
    }
  }
  return uniqueStable(tags);
}

function buildCarriedItemTags(summary: OriginFateNarrativeLifeEventSummary): readonly string[] {
  const tags: string[] = [];
  for (const itemId of summary.carriedItemIds) {
    tags.push(
      itemId,
      `item:${itemId}`,
      `hasCarriedItem:${itemId}`,
      `hasCarriedItemTag:${itemId}`,
      ...(ITEM_COMPAT_ALIASES[itemId] ?? [])
    );
  }
  if (summary.carriedItemIds.length > 0) {
    tags.push("carried_item");
  }
  return uniqueStable(tags);
}

function expandAllTags(values: readonly string[]): readonly string[] {
  const expanded: string[] = [];
  for (const value of values) {
    if (value.length === 0) {
      continue;
    }
    expanded.push(value);
    if (!value.includes(":")) {
      expanded.push(`event:${value}`, `lifeEvent:${value}`, `hiddenBias:${value}`);
    }
    if (value.startsWith("event:")) {
      const bare = value.slice("event:".length);
      expanded.push(bare, `lifeEvent:${bare}`);
    }
    if (value.startsWith("lifeEvent:")) {
      const bare = value.slice("lifeEvent:".length);
      expanded.push(bare, `event:${bare}`);
    }
    if (value.startsWith("origin:") || value.startsWith("hiddenBias:") || value.startsWith("item:")) {
      expanded.push(value.slice(value.indexOf(":") + 1));
    }
    if (value.startsWith("hasCarriedItem:")) {
      expanded.push(`hasCarriedItemTag:${value.slice("hasCarriedItem:".length)}`);
    }
    if (value.startsWith("hasCarriedItemTag:")) {
      expanded.push(`hasCarriedItem:${value.slice("hasCarriedItemTag:".length)}`);
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
  return tags.includes(`event:${expected}`) || tags.includes(`lifeEvent:${expected}`) || tags.includes(`hiddenBias:${expected}`);
}

function mapLegacyHiddenFateId(id: string): string {
  const mapping: Readonly<Record<string, string>> = {
    hidden_lunar_remnant_vein: "hidden_taiyin_remnant_vein",
    hidden_pill_saint_remains: "hidden_alchemy_saint_bone",
    hidden_system_resonance_body: "hidden_system_resonance",
    hidden_heaven_book_fragment: "hidden_book_of_heaven_fragment",
    hidden_void_battlefield_echo: "hidden_outer_battlefield_echo"
  };
  return mapping[id] ?? id;
}

function legacyBandRank(band: string): number {
  switch (band) {
    case "awakened":
      return 3;
    case "near_awake":
      return 2;
    case "stirring":
      return 1;
    default:
      return 0;
  }
}

function toNumericFlags(
  prefix: string,
  values: Readonly<Record<string, number>>
): Readonly<Record<string, number>> {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [`${prefix}.${key}`, value]));
}

function toStringFlags(
  prefix: string,
  values: Readonly<Record<string, string>>
): Readonly<Record<string, string>> {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [`${prefix}.${key}`, value]));
}

function isAgeInRange(ageMonths: number, range: readonly [number, number]): boolean {
  return ageMonths >= range[0] && ageMonths <= range[1];
}

function stripPrefix(value: string, prefix: string): string {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

function uniqueStable<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}
