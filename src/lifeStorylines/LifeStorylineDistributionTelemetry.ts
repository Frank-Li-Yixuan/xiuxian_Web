import { CharacterDraftGenerator } from "../character/CharacterDraftGenerator";
import type { CharacterCreationDraft } from "../character/CharacterCreationTypes";
import type { NinePalaceAttributes } from "../types/nine-palace-fate-types.v0.1";
import type {
  LifeStorylineState,
  StorylineProgress,
  StorylineScoringEvaluation,
  StorylineStatus
} from "../types/life-storylines-types.v0.1";
import { selectDownstreamActiveStorylines } from "./DownstreamStorylineSelector";
import { EventThreadEngine } from "./EventThreadEngine";
import {
  loadLifeStorylineRegistry,
  type LifeStorylineRegistry
} from "./LifeStorylineRegistry";
import { StorylineScoringEngine } from "./StorylineScoringEngine";

const REPORT_VERSION = "0.1";
const DEFAULT_SAMPLE_COUNT = 10_000;
const DEFAULT_DEBUG_SAMPLE_COUNT = 8;
const DEFAULT_SEED_PREFIX = "lst-c007-life-storylines";
const SYSTEM_PRELUDE_STORYLINE_ID = "storyline_system_prelude";
const STATUS_KEYS = ["dormant", "hinted", "active", "dominant", "fated"] as const satisfies readonly StorylineStatus[];
const SUPPORT_SOURCE_PREFIXES = [
  "originNarrative:canonicalActive",
  "originNarrative:progress",
  "ninePalace",
  "spiritualRoot",
  "destiny",
  "origin",
  "hiddenFate",
  "carriedItem",
  "lifeState",
  "recentMonthlyEvents",
  "majorChoiceOutcome"
] as const;

type ScoreBreakdownEntry = { readonly source: string; readonly weight: number; readonly note?: string };

export interface LifeStorylineDistributionBucket {
  readonly count: number;
  readonly rate: number;
}

export interface LifeStorylineStatusDistribution {
  readonly dormant: LifeStorylineDistributionBucket;
  readonly hinted: LifeStorylineDistributionBucket;
  readonly active: LifeStorylineDistributionBucket;
  readonly dominant: LifeStorylineDistributionBucket;
  readonly fated: LifeStorylineDistributionBucket;
  readonly activeOrHigher: LifeStorylineDistributionBucket;
}

export interface LifeStorylineUnsupportedFatedViolation {
  readonly seed: string;
  readonly draftId: string;
  readonly storylineId: string;
  readonly score: number;
  readonly reason: string;
  readonly breakdownSources: readonly string[];
}

export interface LifeStorylineSystemPreludeActivation {
  readonly storylineId: typeof SYSTEM_PRELUDE_STORYLINE_ID;
  readonly hintedOrHigher: LifeStorylineDistributionBucket;
  readonly activeOrHigher: LifeStorylineDistributionBucket;
  readonly dominantOrHigher: LifeStorylineDistributionBucket;
  readonly fated: LifeStorylineDistributionBucket;
  readonly unsupportedFated: LifeStorylineDistributionBucket;
}

export interface LifeStorylineSystemPreludeDownstreamActivation {
  readonly storylineId: typeof SYSTEM_PRELUDE_STORYLINE_ID;
  readonly downstreamActive: LifeStorylineDistributionBucket;
}

export interface LifeStorylineTelemetryDebugSample {
  readonly seed: string;
  readonly draftId: string;
  readonly rerollIndex: number;
  readonly topStorylineIds: readonly string[];
  readonly activeStorylineIds: readonly string[];
  readonly activeStorylineCount: number;
  readonly nonDormantStorylineCount: number;
  readonly downstreamActiveStorylineIds: readonly string[];
  readonly downstreamActiveStorylineCount: number;
  readonly systemPreludeStatus: StorylineStatus;
  readonly lifeStorylineState: LifeStorylineState;
}

export interface LifeStorylineDistributionTelemetryReport {
  readonly version: string;
  readonly sampleCount: number;
  readonly seedPrefix: string;
  readonly storylineStatusById: Readonly<Record<string, LifeStorylineStatusDistribution>>;
  readonly activeStorylineCountDistribution: Readonly<Record<string, LifeStorylineDistributionBucket>>;
  readonly nonDormantStorylineCountDistribution: Readonly<Record<string, LifeStorylineDistributionBucket>>;
  readonly downstreamActiveStorylineCountDistribution: Readonly<Record<string, LifeStorylineDistributionBucket>>;
  readonly downstreamActiveTargetRate: LifeStorylineDistributionBucket;
  readonly systemPreludeActivation: LifeStorylineSystemPreludeActivation;
  readonly systemPreludeDownstreamActive: LifeStorylineSystemPreludeDownstreamActivation;
  readonly unsupportedFatedViolationCount: number;
  readonly unsupportedFatedViolations: readonly LifeStorylineUnsupportedFatedViolation[];
  readonly debugSamples: readonly LifeStorylineTelemetryDebugSample[];
}

export interface BuildLifeStorylineDistributionTelemetryOptions {
  readonly sampleCount?: number;
  readonly seedPrefix?: string;
  readonly debugSampleCount?: number;
  readonly registry?: LifeStorylineRegistry;
  readonly scoringEngine?: StorylineScoringEngine;
  readonly eventThreadEngine?: EventThreadEngine;
}

type MutableStatusCounts = Record<StorylineStatus, number>;

export function buildLifeStorylineDistributionTelemetry(
  options: BuildLifeStorylineDistributionTelemetryOptions = {}
): LifeStorylineDistributionTelemetryReport {
  const sampleCount = options.sampleCount ?? DEFAULT_SAMPLE_COUNT;
  const seedPrefix = options.seedPrefix ?? DEFAULT_SEED_PREFIX;
  const debugSampleCount = options.debugSampleCount ?? DEFAULT_DEBUG_SAMPLE_COUNT;
  validateOptions(sampleCount, debugSampleCount);

  const registry = options.registry ?? loadLifeStorylineRegistry();
  const scoringEngine = options.scoringEngine ?? new StorylineScoringEngine({ registry });
  const eventThreadEngine = options.eventThreadEngine ?? new EventThreadEngine({ registry });
  const generator = new CharacterDraftGenerator({ seed: seedPrefix });
  const statusCountsByStoryline = createStatusCountsByStoryline(registry);
  const activeStorylineCountDistribution: Record<string, number> = {};
  const nonDormantStorylineCountDistribution: Record<string, number> = {};
  const downstreamActiveStorylineCountDistribution: Record<string, number> = {};
  const unsupportedFatedViolations: LifeStorylineUnsupportedFatedViolation[] = [];
  const debugSamples: LifeStorylineTelemetryDebugSample[] = [];
  let unsupportedFatedViolationCount = 0;
  let unsupportedSystemPreludeFatedCount = 0;
  let downstreamActiveTargetCount = 0;
  let systemPreludeDownstreamActiveCount = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const seed = `${seedPrefix}-${index}`;
    const draft = generator.generate({ slotId: seed, nowMs: index });
    const scoring = scoringEngine.evaluateDetailed({
      ageMonths: 0,
      openingDraft: draft.openingInnateDraft,
      ninePalaceEvaluation: draft.openingInnateDraft.ninePalaceEvaluation,
      destinySelection: draft.destinies,
      originFate: draft.originFate,
      ...(draft.originFateNarrativeState === undefined ? {} : { originFateNarrativeState: draft.originFateNarrativeState })
    });
    const downstreamActiveStorylines = selectDownstreamActiveStorylines({
      storylines: scoring.storylines,
      debug: scoring.debug
    });
    const downstreamActiveStorylineIds = downstreamActiveStorylines.map((storyline) => storyline.storylineId);
    const storylineState = eventThreadEngine.initializeThreads({
      storylineScores: scoring.storylines,
      activeStorylines: scoring.activeStorylines,
      downstreamActiveStorylineIds,
      ageMonths: 0,
      signalTags: buildThreadSignalTags(draft, scoring),
      statValues: toStatValues(draft.openingInnateDraft.ninePalaceEvaluation.attributes)
    });

    const nonDormantStorylineCount = scoring.activeStorylines.length;
    const downstreamActiveStorylineCount = downstreamActiveStorylineIds.length;
    increment(activeStorylineCountDistribution, String(nonDormantStorylineCount));
    increment(nonDormantStorylineCountDistribution, String(nonDormantStorylineCount));
    increment(downstreamActiveStorylineCountDistribution, String(downstreamActiveStorylineCount));
    if (downstreamActiveStorylineCount >= 1 && downstreamActiveStorylineCount <= 3) {
      downstreamActiveTargetCount += 1;
    }
    if (downstreamActiveStorylineIds.includes(SYSTEM_PRELUDE_STORYLINE_ID)) {
      systemPreludeDownstreamActiveCount += 1;
    }
    for (const storyline of scoring.storylines) {
      const counts = statusCountsByStoryline[storyline.storylineId];
      if (counts === undefined) {
        continue;
      }
      counts[storyline.status] += 1;
      if (storyline.status === "fated" && !hasStorylineSupport(scoring, storyline)) {
        unsupportedFatedViolationCount += 1;
        if (storyline.storylineId === SYSTEM_PRELUDE_STORYLINE_ID) {
          unsupportedSystemPreludeFatedCount += 1;
        }
        if (unsupportedFatedViolations.length < 16) {
          unsupportedFatedViolations.push(toUnsupportedFatedViolation(seed, draft, storyline, scoring));
        }
      }
    }

    if (debugSamples.length < debugSampleCount) {
      debugSamples.push(toDebugSample(seed, index, draft, scoring, storylineState, downstreamActiveStorylineIds));
    }
  }

  const storylineStatusById = Object.fromEntries(
    Object.entries(statusCountsByStoryline).map(([storylineId, counts]) => [
      storylineId,
      finalizeStatusDistribution(counts, sampleCount)
    ])
  );

  return deepFreeze({
    version: REPORT_VERSION,
    sampleCount,
    seedPrefix,
    storylineStatusById,
    activeStorylineCountDistribution: toDistribution(activeStorylineCountDistribution, sampleCount),
    nonDormantStorylineCountDistribution: toDistribution(nonDormantStorylineCountDistribution, sampleCount),
    downstreamActiveStorylineCountDistribution: toDistribution(downstreamActiveStorylineCountDistribution, sampleCount),
    downstreamActiveTargetRate: toBucket(downstreamActiveTargetCount, sampleCount),
    systemPreludeActivation: buildSystemPreludeActivation(
      statusCountsByStoryline[SYSTEM_PRELUDE_STORYLINE_ID] ?? createMutableStatusCounts(),
      unsupportedSystemPreludeFatedCount,
      sampleCount
    ),
    systemPreludeDownstreamActive: {
      storylineId: SYSTEM_PRELUDE_STORYLINE_ID,
      downstreamActive: toBucket(systemPreludeDownstreamActiveCount, sampleCount)
    },
    unsupportedFatedViolationCount,
    unsupportedFatedViolations,
    debugSamples
  });
}

export function formatLifeStorylineDistributionReport(
  report: LifeStorylineDistributionTelemetryReport
): string {
  return [
    "# Life Storyline Distribution Report",
    "",
    `sampleCount: ${report.sampleCount}`,
    `seedPrefix: ${report.seedPrefix}`,
    "",
    "## Storyline Status Distribution",
    ...Object.entries(report.storylineStatusById)
      .sort(([firstId], [secondId]) => firstId.localeCompare(secondId))
      .map(([storylineId, distribution]) => [
        `- ${storylineId}:`,
        `active=${distribution.active.count} (${formatRate(distribution.active.rate)})`,
        `dominant=${distribution.dominant.count} (${formatRate(distribution.dominant.rate)})`,
        `fated=${distribution.fated.count} (${formatRate(distribution.fated.rate)})`
      ].join(" ")),
    "",
    "## Active Storyline Count Distribution",
    ...formatDistribution(report.activeStorylineCountDistribution),
    "",
    "## Non-Dormant Storyline Count Distribution",
    ...formatDistribution(report.nonDormantStorylineCountDistribution),
    "",
    "## Downstream Active Storyline Count Distribution",
    ...formatDistribution(report.downstreamActiveStorylineCountDistribution),
    `downstreamActiveTargetRate: ${report.downstreamActiveTargetRate.count} (${formatRate(report.downstreamActiveTargetRate.rate)})`,
    `systemPreludeDownstreamActive: ${report.systemPreludeDownstreamActive.downstreamActive.count} (${formatRate(report.systemPreludeDownstreamActive.downstreamActive.rate)})`,
    "",
    "## System Prelude Activation",
    `hintedOrHigher: ${report.systemPreludeActivation.hintedOrHigher.count} (${formatRate(report.systemPreludeActivation.hintedOrHigher.rate)})`,
    `activeOrHigher: ${report.systemPreludeActivation.activeOrHigher.count} (${formatRate(report.systemPreludeActivation.activeOrHigher.rate)})`,
    `dominantOrHigher: ${report.systemPreludeActivation.dominantOrHigher.count} (${formatRate(report.systemPreludeActivation.dominantOrHigher.rate)})`,
    `fated: ${report.systemPreludeActivation.fated.count} (${formatRate(report.systemPreludeActivation.fated.rate)})`,
    `unsupportedFated: ${report.systemPreludeActivation.unsupportedFated.count} (${formatRate(report.systemPreludeActivation.unsupportedFated.rate)})`,
    "",
    "## Unsupported Fated Violations",
    `violationCount: ${report.unsupportedFatedViolationCount}`,
    ...(report.unsupportedFatedViolations.length === 0
      ? ["none"]
      : report.unsupportedFatedViolations.map((violation) =>
        `- ${violation.seed}: ${violation.storylineId} score=${violation.score} ${violation.reason}`
      )),
    "",
    "## Debug Samples",
    ...report.debugSamples.map((sample) => (
      `- ${sample.seed}: top=${sample.topStorylineIds.join(",")} activeCount=${sample.activeStorylineCount} downstream=${sample.downstreamActiveStorylineIds.join(",")} system=${sample.systemPreludeStatus}`
    ))
  ].join("\n");
}

function createStatusCountsByStoryline(registry: LifeStorylineRegistry): Record<string, MutableStatusCounts> {
  return Object.fromEntries(
    registry.listStorylines().map((storyline) => [storyline.id, createMutableStatusCounts()])
  );
}

function createMutableStatusCounts(): MutableStatusCounts {
  return {
    dormant: 0,
    hinted: 0,
    active: 0,
    dominant: 0,
    fated: 0
  };
}

function finalizeStatusDistribution(
  counts: MutableStatusCounts,
  sampleCount: number
): LifeStorylineStatusDistribution {
  return {
    dormant: toBucket(counts.dormant, sampleCount),
    hinted: toBucket(counts.hinted, sampleCount),
    active: toBucket(counts.active, sampleCount),
    dominant: toBucket(counts.dominant, sampleCount),
    fated: toBucket(counts.fated, sampleCount),
    activeOrHigher: toBucket(counts.active + counts.dominant + counts.fated, sampleCount)
  };
}

function buildSystemPreludeActivation(
  counts: MutableStatusCounts,
  unsupportedFatedCount: number,
  sampleCount: number
): LifeStorylineSystemPreludeActivation {
  return {
    storylineId: SYSTEM_PRELUDE_STORYLINE_ID,
    hintedOrHigher: toBucket(counts.hinted + counts.active + counts.dominant + counts.fated, sampleCount),
    activeOrHigher: toBucket(counts.active + counts.dominant + counts.fated, sampleCount),
    dominantOrHigher: toBucket(counts.dominant + counts.fated, sampleCount),
    fated: toBucket(counts.fated, sampleCount),
    unsupportedFated: toBucket(unsupportedFatedCount, sampleCount)
  };
}

function hasStorylineSupport(
  scoring: StorylineScoringEvaluation,
  storyline: StorylineProgress
): boolean {
  const breakdown = scoring.debug.scoreBreakdownByStoryline[storyline.storylineId] ?? [];
  return breakdown.some((entry) => entry.weight > 0 && isSupportSource(entry.source));
}

function isSupportSource(source: string): boolean {
  return SUPPORT_SOURCE_PREFIXES.some((prefix) => source === prefix || source.startsWith(`${prefix}:`));
}

function toUnsupportedFatedViolation(
  seed: string,
  draft: CharacterCreationDraft,
  storyline: StorylineProgress,
  scoring: StorylineScoringEvaluation
): LifeStorylineUnsupportedFatedViolation {
  const breakdown = scoring.debug.scoreBreakdownByStoryline[storyline.storylineId] ?? [];
  return {
    seed,
    draftId: draft.draftId,
    storylineId: storyline.storylineId,
    score: storyline.score,
    reason: "fated_without_positive_storyline_support_signal",
    breakdownSources: breakdown.map((entry) => `${entry.source}:${entry.weight}`)
  };
}

function toDebugSample(
  seed: string,
  rerollIndex: number,
  draft: CharacterCreationDraft,
  scoring: StorylineScoringEvaluation,
  lifeStorylineState: LifeStorylineState,
  downstreamActiveStorylineIds: readonly string[]
): LifeStorylineTelemetryDebugSample {
  const systemPrelude = scoring.storylines.find((storyline) => storyline.storylineId === SYSTEM_PRELUDE_STORYLINE_ID);
  return {
    seed,
    draftId: draft.draftId,
    rerollIndex,
    topStorylineIds: scoring.storylines.slice(0, 3).map((storyline) => storyline.storylineId),
    activeStorylineIds: scoring.activeStorylines.map((storyline) => storyline.storylineId),
    activeStorylineCount: scoring.activeStorylines.length,
    nonDormantStorylineCount: scoring.activeStorylines.length,
    downstreamActiveStorylineIds: [...downstreamActiveStorylineIds],
    downstreamActiveStorylineCount: downstreamActiveStorylineIds.length,
    systemPreludeStatus: systemPrelude?.status ?? "dormant",
    lifeStorylineState
  };
}

function buildThreadSignalTags(
  draft: CharacterCreationDraft,
  scoring: StorylineScoringEvaluation
): readonly string[] {
  const root = draft.openingInnateDraft.spiritualRoot;
  const traits = [
    draft.destinies.main,
    ...draft.destinies.secondary,
    draft.destinies.flaw
  ];
  const originState = draft.originFateNarrativeState;
  return uniqueStable([
    ...scoring.debug.signalTags,
    `rootCategory:${root.categoryId}`,
    ...Object.entries(root.elements)
      .filter(([, value]) => typeof value === "number" && value > 0)
      .flatMap(([element]) => [element, `root:${element}`]),
    ...root.relationTags,
    ...root.tags,
    ...traits.flatMap((trait) => [
      trait.traitId,
      toDestinyAlias(trait.traitId),
      ...trait.tags
    ]),
    draft.originFate.backgroundOrigin.originId,
    `origin:${draft.originFate.backgroundOrigin.originId}`,
    ...draft.originFate.backgroundOrigin.matchedTags,
    draft.originFate.hiddenFateInternal.hiddenFateId,
    toHiddenAlias(draft.originFate.hiddenFateInternal.hiddenFateId),
    ...draft.originFate.hiddenFateInternal.matchedTags,
    ...(draft.originFate.visibleHiddenOmen.relatedTags ?? []),
    ...draft.originFate.carriedItems.flatMap((item) => [
      item.itemId,
      `item:${item.itemId}`,
      ...item.matchedTags
    ]),
    ...(originState === undefined ? [] : [
      originState.origin.originId,
      `origin:${originState.origin.originId}`,
      ...originState.origin.activeStorylineIds.flatMap((id) => [id, `storyline:${id}`]),
      ...originState.origin.canonicalLifeStorylineIds.flatMap((id) => [id, `lifeStoryline:${id}`]),
      ...originState.origin.carriedItemBias.flatMap((id) => [id, `item:${id}`]),
      ...originState.origin.hiddenFateBias.flatMap((id) => [id, toHiddenAlias(id)]),
      ...originState.lifeEventBiasTags,
      ...originState.majorChoiceSignals,
      ...originState.stageTransitionTokens,
      ...originState.age18Hooks
    ])
  ]);
}

function toStatValues(attributes: NinePalaceAttributes): Readonly<Record<string, number>> {
  return {
    jing: attributes.jing,
    qi: attributes.qi,
    shen: attributes.shen,
    rootBone: attributes.rootBone,
    comprehension: attributes.comprehension,
    inspiration: attributes.inspiration,
    fortune: attributes.fortune,
    heart: attributes.heart,
    lifespan: attributes.lifespan
  };
}

function toDistribution(
  counts: Readonly<Record<string, number>>,
  denominator: number
): Readonly<Record<string, LifeStorylineDistributionBucket>> {
  return Object.fromEntries(
    Object.entries(counts)
      .sort(([firstId], [secondId]) => firstId.localeCompare(secondId))
      .map(([id, count]) => [id, toBucket(count, denominator)])
  );
}

function toBucket(count: number, denominator: number): LifeStorylineDistributionBucket {
  return {
    count,
    rate: denominator === 0 ? 0 : round(count / denominator)
  };
}

function formatDistribution(distribution: Readonly<Record<string, LifeStorylineDistributionBucket>>): readonly string[] {
  const entries = Object.entries(distribution)
    .sort((first, second) => Number(first[0]) - Number(second[0]) || first[0].localeCompare(second[0]));
  if (entries.length === 0) {
    return ["none"];
  }
  return entries.map(([id, bucket]) => `- ${id}: ${bucket.count} (${formatRate(bucket.rate)})`);
}

function increment(counts: Record<string, number>, id: string): void {
  counts[id] = (counts[id] ?? 0) + 1;
}

function formatRate(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function toDestinyAlias(id: string): string {
  return id.startsWith("destiny_") ? `destiny:${id.slice("destiny_".length)}` : id;
}

function toHiddenAlias(id: string): string {
  return id.startsWith("hidden_") ? `hidden:${id.slice("hidden_".length)}` : id;
}

function uniqueStable<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function validateOptions(sampleCount: number, debugSampleCount: number): void {
  if (!Number.isInteger(sampleCount) || sampleCount <= 0) {
    throw new Error("Life storyline telemetry sampleCount must be a positive integer");
  }
  if (!Number.isInteger(debugSampleCount) || debugSampleCount < 0) {
    throw new Error("Life storyline telemetry debugSampleCount must be a non-negative integer");
  }
  if (debugSampleCount > sampleCount) {
    throw new Error("Life storyline telemetry debugSampleCount must not exceed sampleCount");
  }
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
