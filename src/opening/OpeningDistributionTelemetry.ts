import type {
  AptitudeStats,
  CoreSeedStats,
  GenerateOpeningInnateInput,
  OpeningGenerator,
  OpeningInnateDraft,
  SpiritualRootCategoryId,
  SpiritualRootState
} from "../types/opening-generator-types.v0.1";
import { DefaultOpeningGenerator } from "./OpeningGenerator";
import { loadOpeningGeneratorRegistry } from "./OpeningGeneratorRegistry";

const REPORT_VERSION = "0.1";
const APTITUDE_KEYS = ["rootBone", "comprehension", "inspiration", "fortune", "heart", "lifespan"] as const;
const CORE_SEED_KEYS = ["jing", "qi", "shen"] as const;
const ROOT_METRIC_KEYS = ["purity", "stability", "conflict", "breadth"] as const;
const RARE_ROOT_CATEGORY_IDS = new Set<SpiritualRootCategoryId>(["heavenly", "variant", "hidden", "chaos"]);

type AptitudeKey = (typeof APTITUDE_KEYS)[number];
type CoreSeedKey = (typeof CORE_SEED_KEYS)[number];
type RootMetricKey = (typeof ROOT_METRIC_KEYS)[number];

export interface OpeningDistributionBucket {
  readonly count: number;
  readonly rate: number;
}

export interface OpeningNumericDistribution {
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly lowExtremeRate: number;
  readonly highExtremeRate: number;
}

export interface OpeningDebugSummary {
  readonly seed: string;
  readonly draftId: string;
  readonly rerollIndex: number;
  readonly archetypeId: string;
  readonly rootCategoryId: SpiritualRootCategoryId;
  readonly elementVector: SpiritualRootState["elements"];
  readonly tags: readonly string[];
  readonly distinctivenessScore: number;
}

export interface OpeningExtremeSamples {
  readonly highestAptitudeTotal: OpeningDebugSummary;
  readonly lowestAptitudeTotal: OpeningDebugSummary;
  readonly highestDistinctiveness: OpeningDebugSummary;
  readonly lowLifespan: OpeningDebugSummary;
  readonly highConflictRoot: OpeningDebugSummary;
  readonly rareRoot: OpeningDebugSummary;
}

export interface OpeningDistributionTelemetryReport {
  readonly version: string;
  readonly sampleCount: number;
  readonly seedPrefix: string;
  readonly archetypeDistribution: Readonly<Record<string, OpeningDistributionBucket>>;
  readonly rootCategoryDistribution: Readonly<Record<string, OpeningDistributionBucket>>;
  readonly rareRootRate: number;
  readonly distinctivenessBelow2Rate: number;
  readonly aptitude: Readonly<Record<AptitudeKey, OpeningNumericDistribution>>;
  readonly coreSeed: Readonly<Record<CoreSeedKey, OpeningNumericDistribution>>;
  readonly rootMetrics: Readonly<Record<RootMetricKey, OpeningNumericDistribution>>;
  readonly extremeSamples: OpeningExtremeSamples;
  readonly debugSamples: readonly OpeningDebugSummary[];
}

export interface BuildOpeningDistributionTelemetryOptions {
  readonly sampleCount?: number;
  readonly seedPrefix?: string;
  readonly debugSampleCount?: number;
  readonly generator?: OpeningGenerator;
}

export interface OpeningRerollLockCheckOptions {
  readonly seed: string;
  readonly draftId: string;
  readonly initialRerollIndex: number;
  readonly nextRerollIndex: number;
  readonly generator?: OpeningGenerator;
}

export interface OpeningRerollLockCheck {
  readonly seed: string;
  readonly draftId: string;
  readonly reproducible: boolean;
  readonly unlocked: {
    readonly changedOpeningSignature: boolean;
  };
  readonly attributeLock: {
    readonly preservedArchetype: boolean;
    readonly preservedAptitude: boolean;
    readonly preservedCoreSeed: boolean;
    readonly changedSpiritualRoot: boolean;
  };
  readonly spiritualRootLock: {
    readonly preservedSpiritualRoot: boolean;
    readonly changedAttributeSide: boolean;
  };
}

interface MutableNumericAccumulator {
  min: number;
  max: number;
  sum: number;
  lowExtremeCount: number;
  highExtremeCount: number;
}

interface MutableExtremes {
  highestAptitudeTotal?: OpeningDraftScore;
  lowestAptitudeTotal?: OpeningDraftScore;
  highestDistinctiveness?: OpeningDraftScore;
  lowLifespan?: OpeningDraftScore;
  highConflictRoot?: OpeningDraftScore;
  rareRoot?: OpeningDraftScore;
}

interface OpeningDraftScore {
  readonly summary: OpeningDebugSummary;
  readonly aptitudeTotal: number;
  readonly lifespan: number;
  readonly conflict: number;
  readonly distinctivenessScore: number;
  readonly rare: boolean;
}

export function buildOpeningDistributionTelemetry(
  options: BuildOpeningDistributionTelemetryOptions = {}
): OpeningDistributionTelemetryReport {
  const sampleCount = options.sampleCount ?? 10_000;
  const seedPrefix = options.seedPrefix ?? "opening-distribution";
  const debugSampleCount = options.debugSampleCount ?? 12;
  validateSampleOptions(sampleCount, debugSampleCount);

  const generator = options.generator ?? new DefaultOpeningGenerator();
  const registry = loadOpeningGeneratorRegistry();
  const archetypeCounts = initializeCounts(registry.attributeArchetypes.map((archetype) => archetype.id));
  const rootCategoryCounts = initializeCounts(registry.rootCategories.map((category) => category.id));
  const aptitude = initializeNumericAccumulators(APTITUDE_KEYS);
  const coreSeed = initializeNumericAccumulators(CORE_SEED_KEYS);
  const rootMetrics = initializeNumericAccumulators(ROOT_METRIC_KEYS);
  const debugSamples: OpeningDebugSummary[] = [];
  const extremes: MutableExtremes = {};
  let rareRootCount = 0;
  let distinctivenessBelow2Count = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const seed = `${seedPrefix}-${index}`;
    const draftId = normalizeDraftId(seedPrefix, index);
    const draft = generator.generate({
      seed,
      draftId,
      rerollIndex: index
    });
    const summary = toDebugSummary(draft);
    const score = toDraftScore(summary, draft);

    incrementCount(archetypeCounts, draft.archetype.id);
    incrementCount(rootCategoryCounts, draft.spiritualRoot.categoryId);
    for (const key of APTITUDE_KEYS) {
      recordNumeric(aptitude[key], draft.aptitude[key], 20, 90);
    }
    for (const key of CORE_SEED_KEYS) {
      recordNumeric(coreSeed[key], draft.coreSeed[key], 8, 22);
    }
    for (const key of ROOT_METRIC_KEYS) {
      recordNumeric(rootMetrics[key], draft.spiritualRoot[key], 20, 90);
    }
    if (score.rare) {
      rareRootCount += 1;
    }
    if (draft.distinctivenessScore < 2) {
      distinctivenessBelow2Count += 1;
    }
    if (debugSamples.length < debugSampleCount) {
      debugSamples.push(summary);
    }
    updateExtremes(extremes, score);
  }

  return deepFreeze({
    version: REPORT_VERSION,
    sampleCount,
    seedPrefix,
    archetypeDistribution: finalizeCounts(archetypeCounts, sampleCount),
    rootCategoryDistribution: finalizeCounts(rootCategoryCounts, sampleCount),
    rareRootRate: ratio(rareRootCount, sampleCount),
    distinctivenessBelow2Rate: ratio(distinctivenessBelow2Count, sampleCount),
    aptitude: finalizeNumericAccumulators(aptitude, sampleCount),
    coreSeed: finalizeNumericAccumulators(coreSeed, sampleCount),
    rootMetrics: finalizeNumericAccumulators(rootMetrics, sampleCount),
    extremeSamples: finalizeExtremes(extremes),
    debugSamples
  });
}

export function buildOpeningRerollLockCheck(options: OpeningRerollLockCheckOptions): OpeningRerollLockCheck {
  if (options.seed.length === 0) {
    throw new Error("Opening lock check seed must not be empty");
  }
  if (options.draftId.length === 0) {
    throw new Error("Opening lock check draftId must not be empty");
  }
  if (!Number.isInteger(options.initialRerollIndex) || options.initialRerollIndex < 0) {
    throw new Error("Opening lock check initialRerollIndex must be a non-negative integer");
  }
  if (!Number.isInteger(options.nextRerollIndex) || options.nextRerollIndex < 0) {
    throw new Error("Opening lock check nextRerollIndex must be a non-negative integer");
  }

  const generator = options.generator ?? new DefaultOpeningGenerator();
  const initialInput: GenerateOpeningInnateInput = {
    seed: options.seed,
    draftId: options.draftId,
    rerollIndex: options.initialRerollIndex
  };
  const initial = generator.generate(initialInput);
  const repeated = generator.generate(initialInput);
  const unlocked = generator.generate({
    seed: options.seed,
    draftId: options.draftId,
    rerollIndex: options.nextRerollIndex
  });
  const attributeLocked = generator.generate({
    seed: options.seed,
    draftId: options.draftId,
    rerollIndex: options.nextRerollIndex,
    locks: { attributeArchetype: true, aptitudeStats: true, coreSeedStats: true },
    previousDraft: initial
  });
  const rootLocked = generator.generate({
    seed: options.seed,
    draftId: options.draftId,
    rerollIndex: options.nextRerollIndex,
    locks: { spiritualRootFull: true },
    previousDraft: initial
  });

  return deepFreeze({
    seed: options.seed,
    draftId: options.draftId,
    reproducible: openingSignature(initial) === openingSignature(repeated),
    unlocked: {
      changedOpeningSignature: openingSignature(unlocked) !== openingSignature(initial)
    },
    attributeLock: {
      preservedArchetype: attributeLocked.archetype.id === initial.archetype.id,
      preservedAptitude: stableJson(attributeLocked.aptitude) === stableJson(initial.aptitude),
      preservedCoreSeed: stableJson(attributeLocked.coreSeed) === stableJson(initial.coreSeed),
      changedSpiritualRoot: rootSignature(attributeLocked.spiritualRoot) !== rootSignature(initial.spiritualRoot)
    },
    spiritualRootLock: {
      preservedSpiritualRoot: rootSignature(rootLocked.spiritualRoot) === rootSignature(initial.spiritualRoot),
      changedAttributeSide: attributeSignature(rootLocked) !== attributeSignature(initial)
    }
  });
}

export function formatOpeningDistributionReport(
  report: OpeningDistributionTelemetryReport,
  lockCheck?: OpeningRerollLockCheck
): string {
  const lines = [
    "# Opening Generator Distribution Report",
    "",
    `version: ${report.version}`,
    `sampleCount: ${report.sampleCount}`,
    `seedPrefix: ${report.seedPrefix}`,
    `rareRootRate: ${formatPercent(report.rareRootRate)}`,
    `distinctivenessBelow2Rate: ${formatPercent(report.distinctivenessBelow2Rate)}`,
    "",
    "## Archetype Distribution",
    ...formatDistribution(report.archetypeDistribution),
    "",
    "## Spiritual Root Distribution",
    ...formatDistribution(report.rootCategoryDistribution),
    "",
    "## Aptitude Distribution",
    ...formatNumericDistributions(report.aptitude),
    "",
    "## Core Seed Distribution",
    ...formatNumericDistributions(report.coreSeed),
    "",
    "## Root Metric Distribution",
    ...formatNumericDistributions(report.rootMetrics),
    "",
    "## Extreme Samples",
    ...formatExtremeSamples(report.extremeSamples),
    "",
    "## Debug Samples",
    ...report.debugSamples.map(
      (sample) =>
        `- ${sample.seed} reroll ${sample.rerollIndex}: ${sample.archetypeId} / ${sample.rootCategoryId} elements ${stableJson(sample.elementVector)} score ${sample.distinctivenessScore}`
    ),
    "",
    "## Same Seed Reproduction"
  ];

  if (lockCheck === undefined) {
    lines.push("- not run");
  } else {
    lines.push(`- reproducible: ${lockCheck.reproducible}`);
    lines.push(`- unlockedChanged: ${lockCheck.unlocked.changedOpeningSignature}`);
    lines.push(
      `- attributeLock: archetype=${lockCheck.attributeLock.preservedArchetype}, aptitude=${lockCheck.attributeLock.preservedAptitude}, coreSeed=${lockCheck.attributeLock.preservedCoreSeed}, rootChanged=${lockCheck.attributeLock.changedSpiritualRoot}`
    );
    lines.push(
      `- spiritualRootLock: root=${lockCheck.spiritualRootLock.preservedSpiritualRoot}, attributeChanged=${lockCheck.spiritualRootLock.changedAttributeSide}`
    );
  }

  return `${lines.join("\n")}\n`;
}

function validateSampleOptions(sampleCount: number, debugSampleCount: number): void {
  if (!Number.isInteger(sampleCount) || sampleCount <= 0) {
    throw new Error("Opening distribution sampleCount must be a positive integer");
  }
  if (!Number.isInteger(debugSampleCount) || debugSampleCount < 0) {
    throw new Error("Opening distribution debugSampleCount must be a non-negative integer");
  }
}

function initializeCounts(ids: readonly string[]): Record<string, number> {
  return Object.fromEntries(ids.map((id) => [id, 0]));
}

function incrementCount(counts: Record<string, number>, id: string): void {
  counts[id] = (counts[id] ?? 0) + 1;
}

function finalizeCounts(counts: Readonly<Record<string, number>>, sampleCount: number): Readonly<Record<string, OpeningDistributionBucket>> {
  return Object.fromEntries(
    Object.entries(counts)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([id, count]) => [
        id,
        {
          count,
          rate: ratio(count, sampleCount)
        }
      ])
  );
}

function initializeNumericAccumulators<T extends string>(keys: readonly T[]): Record<T, MutableNumericAccumulator> {
  return Object.fromEntries(
    keys.map((key) => [
      key,
      {
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY,
        sum: 0,
        lowExtremeCount: 0,
        highExtremeCount: 0
      }
    ])
  ) as Record<T, MutableNumericAccumulator>;
}

function recordNumeric(accumulator: MutableNumericAccumulator, value: number, lowExtremeThreshold: number, highExtremeThreshold: number): void {
  accumulator.min = Math.min(accumulator.min, value);
  accumulator.max = Math.max(accumulator.max, value);
  accumulator.sum += value;
  if (value <= lowExtremeThreshold) {
    accumulator.lowExtremeCount += 1;
  }
  if (value >= highExtremeThreshold) {
    accumulator.highExtremeCount += 1;
  }
}

function finalizeNumericAccumulators<T extends string>(
  accumulators: Readonly<Record<T, MutableNumericAccumulator>>,
  sampleCount: number
): Readonly<Record<T, OpeningNumericDistribution>> {
  return Object.fromEntries(
    (Object.entries(accumulators) as [T, MutableNumericAccumulator][])
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, accumulator]) => [
        key,
        {
          min: accumulator.min,
          max: accumulator.max,
          mean: round3(accumulator.sum / sampleCount),
          lowExtremeRate: ratio(accumulator.lowExtremeCount, sampleCount),
          highExtremeRate: ratio(accumulator.highExtremeCount, sampleCount)
        }
      ])
  ) as Readonly<Record<T, OpeningNumericDistribution>>;
}

function toDraftScore(summary: OpeningDebugSummary, draft: OpeningInnateDraft): OpeningDraftScore {
  const aptitudeTotal = Object.values(draft.aptitude).reduce((sum, value) => sum + value, 0);
  const rare = RARE_ROOT_CATEGORY_IDS.has(draft.spiritualRoot.categoryId);

  return {
    summary,
    aptitudeTotal,
    lifespan: draft.aptitude.lifespan,
    conflict: draft.spiritualRoot.conflict,
    distinctivenessScore: draft.distinctivenessScore,
    rare
  };
}

function updateExtremes(extremes: MutableExtremes, score: OpeningDraftScore): void {
  if (extremes.highestAptitudeTotal === undefined || score.aptitudeTotal > extremes.highestAptitudeTotal.aptitudeTotal) {
    extremes.highestAptitudeTotal = score;
  }
  if (extremes.lowestAptitudeTotal === undefined || score.aptitudeTotal < extremes.lowestAptitudeTotal.aptitudeTotal) {
    extremes.lowestAptitudeTotal = score;
  }
  if (extremes.highestDistinctiveness === undefined || score.distinctivenessScore > extremes.highestDistinctiveness.distinctivenessScore) {
    extremes.highestDistinctiveness = score;
  }
  if (extremes.lowLifespan === undefined || score.lifespan < extremes.lowLifespan.lifespan) {
    extremes.lowLifespan = score;
  }
  if (extremes.highConflictRoot === undefined || score.conflict > extremes.highConflictRoot.conflict) {
    extremes.highConflictRoot = score;
  }
  if (score.rare && (extremes.rareRoot === undefined || score.distinctivenessScore > extremes.rareRoot.distinctivenessScore)) {
    extremes.rareRoot = score;
  }
}

function finalizeExtremes(extremes: MutableExtremes): OpeningExtremeSamples {
  const fallback = extremes.highestDistinctiveness?.summary;
  if (fallback === undefined) {
    throw new Error("Opening distribution telemetry could not collect extreme samples");
  }

  return {
    highestAptitudeTotal: extremes.highestAptitudeTotal?.summary ?? fallback,
    lowestAptitudeTotal: extremes.lowestAptitudeTotal?.summary ?? fallback,
    highestDistinctiveness: extremes.highestDistinctiveness?.summary ?? fallback,
    lowLifespan: extremes.lowLifespan?.summary ?? fallback,
    highConflictRoot: extremes.highConflictRoot?.summary ?? fallback,
    rareRoot: extremes.rareRoot?.summary ?? fallback
  };
}

function toDebugSummary(draft: OpeningInnateDraft): OpeningDebugSummary {
  return {
    seed: draft.seed,
    draftId: draft.draftId,
    rerollIndex: draft.rerollIndex,
    archetypeId: draft.archetype.id,
    rootCategoryId: draft.spiritualRoot.categoryId,
    elementVector: draft.spiritualRoot.elements,
    tags: uniqueStable([
      ...draft.tags.destinyBiasTags,
      ...draft.tags.lifeEventBiasTags,
      ...draft.tags.modeBiasTags,
      ...draft.tags.hiddenFateBiasTags,
      ...draft.spiritualRoot.tags
    ]),
    distinctivenessScore: draft.distinctivenessScore
  };
}

function normalizeDraftId(seedPrefix: string, index: number): string {
  return `${seedPrefix}_${index}`.replace(/[^A-Za-z0-9_]+/g, "_");
}

function openingSignature(draft: OpeningInnateDraft): string {
  return stableJson({
    attribute: JSON.parse(attributeSignature(draft)) as unknown,
    spiritualRoot: JSON.parse(rootSignature(draft.spiritualRoot)) as unknown
  });
}

function attributeSignature(draft: OpeningInnateDraft): string {
  return stableJson({
    archetypeId: draft.archetype.id,
    aptitude: draft.aptitude,
    coreSeed: draft.coreSeed
  });
}

function rootSignature(root: SpiritualRootState): string {
  return stableJson({
    categoryId: root.categoryId,
    elements: root.elements,
    primaryElement: root.primaryElement,
    secondaryElements: root.secondaryElements,
    latentRoot: root.latentRoot,
    purity: root.purity,
    stability: root.stability,
    conflict: root.conflict,
    breadth: root.breadth,
    relationTags: root.relationTags
  });
}

function formatDistribution(distribution: Readonly<Record<string, OpeningDistributionBucket>>): string[] {
  return Object.entries(distribution).map(
    ([id, bucket]) => `- ${id}: ${bucket.count} (${formatPercent(bucket.rate)})`
  );
}

function formatNumericDistributions(distribution: Readonly<Record<string, OpeningNumericDistribution>>): string[] {
  return Object.entries(distribution).map(
    ([key, value]) =>
      `- ${key}: mean ${formatNumber(value.mean)}, min ${value.min}, max ${value.max}, lowExtreme ${formatPercent(value.lowExtremeRate)}, highExtreme ${formatPercent(value.highExtremeRate)}`
  );
}

function formatExtremeSamples(extremes: OpeningExtremeSamples): string[] {
  return Object.entries(extremes).map(
    ([key, sample]) =>
      `- ${key}: ${sample.seed} ${sample.archetypeId}/${sample.rootCategoryId} elements ${stableJson(sample.elementVector)} score ${sample.distinctivenessScore}`
  );
}

function ratio(count: number, total: number): number {
  return round6(count / total);
}

function round3(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function formatPercent(value: number): string {
  return `${formatNumber(value * 100)}%`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function uniqueStable(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, child: unknown) => {
    if (child === null || Array.isArray(child) || typeof child !== "object") {
      return child;
    }
    return Object.fromEntries(Object.entries(child).sort(([first], [second]) => first.localeCompare(second)));
  });
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}
