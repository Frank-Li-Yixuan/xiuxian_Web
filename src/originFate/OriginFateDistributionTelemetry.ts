import { SeededRng } from "../sim/core/SeededRng";
import type {
  CarriedItemConversionType,
  OriginFateDraft
} from "../types/origin-fate-types.v0.1";
import {
  resolveAge18OriginFate,
  type Age18OriginFateLifeSimulationSummary
} from "./Age18OriginFateResolver";
import {
  DefaultOriginFateGenerator,
  type GenerateOriginFateDraftInput,
  type OriginFateGenerator
} from "./OriginFateGenerator";
import {
  loadOriginFateRegistry,
  type OriginFateRegistry
} from "./OriginFateRegistry";

export interface OriginFateDistributionTelemetryInput {
  readonly sampleCount: number;
  readonly seedPrefix: string;
  readonly debugSampleCount?: number;
  readonly generator?: OriginFateGenerator;
  readonly registry?: OriginFateRegistry;
}

export interface OriginFateDistributionBucket {
  readonly count: number;
  readonly rate: number;
}

export interface OriginFateProgressStats {
  readonly min: number;
  readonly max: number;
  readonly mean: number;
}

export interface OriginFateTelemetrySample {
  readonly seed: string;
  readonly draftId: string;
  readonly rerollIndex: number;
  readonly backgroundOriginId: string;
  readonly hiddenFateId: string;
  readonly hiddenFateCategory: string;
  readonly progress: number;
  readonly progressBand: string;
  readonly visibleOmen: ReturnType<typeof buildOriginFateCreationPreview>["visibleHiddenOmen"];
  readonly carriedItemIds: readonly string[];
  readonly carriedItemConversionTypes: readonly CarriedItemConversionType[];
  readonly modeProjectionTags: readonly string[];
  readonly age18ConvertedItemTypes: readonly CarriedItemConversionType[];
  readonly age18Revealed: boolean;
}

export interface OriginFateDistributionTelemetryReport {
  readonly sampleCount: number;
  readonly seedPrefix: string;
  readonly backgroundOriginDistribution: Readonly<Record<string, OriginFateDistributionBucket>>;
  readonly hiddenFateDistribution: Readonly<Record<string, OriginFateDistributionBucket>>;
  readonly hiddenFateCategoryDistribution: Readonly<Record<string, OriginFateDistributionBucket>>;
  readonly carriedItemDistribution: Readonly<Record<string, OriginFateDistributionBucket>>;
  readonly carriedItemCountDistribution: Readonly<Record<string, OriginFateDistributionBucket>>;
  readonly hiddenProgressBandDistribution: Readonly<Record<string, OriginFateDistributionBucket>>;
  readonly age18ConversionDistribution: Readonly<Record<string, OriginFateDistributionBucket>>;
  readonly hiddenProgress: OriginFateProgressStats;
  readonly twoCarriedItemRate: number;
  readonly trueNameExposureCount: number;
  readonly age18RevealRate: number;
  readonly extremeSamples: {
    readonly highestHiddenProgress: OriginFateTelemetrySample;
    readonly lowestHiddenProgress: OriginFateTelemetrySample;
    readonly richestCarriedItems: OriginFateTelemetrySample;
  };
  readonly debugSamples: readonly OriginFateTelemetrySample[];
}

export interface OriginFateRerollLockCheckInput {
  readonly seed: string;
  readonly draftId: string;
  readonly initialRerollIndex: number;
  readonly nextRerollIndex: number;
  readonly generator?: OriginFateGenerator;
}

export interface OriginFateRerollLockCheck {
  readonly reproducible: boolean;
  readonly unlocked: {
    readonly changedOriginFateSignature: boolean;
  };
  readonly backgroundLock: {
    readonly preservedBackgroundOrigin: boolean;
  };
  readonly hiddenFateLock: {
    readonly preservedHiddenFate: boolean;
  };
  readonly carriedItemsLock: {
    readonly preservedCarriedItems: boolean;
  };
  readonly allLocks: {
    readonly preservedFullOriginFate: boolean;
  };
}

export interface OriginFateCreationPreview {
  readonly backgroundOrigin: {
    readonly name: string;
    readonly visibleDescription: string;
    readonly matchedTags: readonly string[];
  };
  readonly visibleHiddenOmen: {
    readonly levelLabel: string;
    readonly hints: readonly string[];
    readonly riskHint: string;
    readonly revealedCategory?: string;
    readonly relatedTags?: readonly string[];
  };
  readonly carriedItems: readonly {
    readonly name: string;
    readonly visibleDescription: string;
    readonly conversionLabel: string;
    readonly outerBattlefieldEffect: string;
    readonly dongfuHook: string;
  }[];
}

export function buildOriginFateDistributionTelemetry(
  input: OriginFateDistributionTelemetryInput
): OriginFateDistributionTelemetryReport {
  validateTelemetryInput(input);

  const registry = input.registry ?? loadOriginFateRegistry();
  const generator = input.generator ?? new DefaultOriginFateGenerator(registry);
  const debugSampleCount = input.debugSampleCount ?? 8;
  const backgroundCounts = initializeCounts(registry.backgroundOrigins.map((origin) => origin.id));
  const hiddenFateCounts = initializeCounts(registry.hiddenFates.map((hiddenFate) => hiddenFate.id));
  const hiddenCategoryCounts = initializeCounts(uniqueStable(registry.hiddenFates.map((hiddenFate) => hiddenFate.category)));
  const carriedItemCounts = initializeCounts(registry.carriedItems.map((item) => item.id));
  const carriedItemCountCounts: Record<string, number> = {};
  const progressBandCounts: Record<string, number> = {};
  const age18ConversionCounts: Record<string, number> = {};
  const progressValues: number[] = [];
  const debugSamples: OriginFateTelemetrySample[] = [];
  let trueNameExposureCount = 0;
  let age18RevealCount = 0;
  let highestHiddenProgress: OriginFateTelemetrySample | undefined;
  let lowestHiddenProgress: OriginFateTelemetrySample | undefined;
  let richestCarriedItems: OriginFateTelemetrySample | undefined;

  for (let index = 0; index < input.sampleCount; index += 1) {
    const seed = `${input.seedPrefix}-${index}`;
    const draft = generator.generate(createTelemetryGenerateInput(seed, index));
    const resolution = resolveAge18OriginFate(
      draft,
      createTelemetryLifeSummary(index),
      new SeededRng(`${seed}:age18`, "origin_fate_distribution_telemetry"),
      registry
    );
    const sample = toTelemetrySample(seed, index, draft, resolution);
    const hiddenFate = registry.getHiddenFate(draft.hiddenFateInternal.hiddenFateId);
    const preview = buildOriginFateCreationPreview(draft);

    increment(backgroundCounts, draft.backgroundOrigin.originId);
    increment(hiddenFateCounts, draft.hiddenFateInternal.hiddenFateId);
    increment(hiddenCategoryCounts, draft.hiddenFateInternal.category);
    increment(carriedItemCountCounts, String(draft.carriedItems.length));
    increment(progressBandCounts, draft.hiddenFateInternal.progressBand);
    for (const item of draft.carriedItems) {
      increment(carriedItemCounts, item.itemId);
    }
    for (const item of resolution.convertedItems) {
      increment(age18ConversionCounts, item.conversionType);
    }
    progressValues.push(draft.hiddenFateInternal.progress);
    if (JSON.stringify(preview).includes(hiddenFate.trueName)) {
      trueNameExposureCount += 1;
    }
    if (resolution.revealedHiddenFate !== undefined) {
      age18RevealCount += 1;
    }
    if (debugSamples.length < debugSampleCount) {
      debugSamples.push(sample);
    }
    highestHiddenProgress = pickHigherProgress(highestHiddenProgress, sample);
    lowestHiddenProgress = pickLowerProgress(lowestHiddenProgress, sample);
    richestCarriedItems = pickRicherCarriedItems(richestCarriedItems, sample);
  }

  const hiddenProgress = buildProgressStats(progressValues);

  return deepFreeze({
    sampleCount: input.sampleCount,
    seedPrefix: input.seedPrefix,
    backgroundOriginDistribution: toDistribution(backgroundCounts, input.sampleCount),
    hiddenFateDistribution: toDistribution(hiddenFateCounts, input.sampleCount),
    hiddenFateCategoryDistribution: toDistribution(hiddenCategoryCounts, input.sampleCount),
    carriedItemDistribution: toDistribution(carriedItemCounts, input.sampleCount),
    carriedItemCountDistribution: toDistribution(carriedItemCountCounts, input.sampleCount),
    hiddenProgressBandDistribution: toDistribution(progressBandCounts, input.sampleCount),
    age18ConversionDistribution: toDistribution(age18ConversionCounts, input.sampleCount),
    hiddenProgress,
    twoCarriedItemRate: round4((carriedItemCountCounts["2"] ?? 0) / input.sampleCount),
    trueNameExposureCount,
    age18RevealRate: round4(age18RevealCount / input.sampleCount),
    extremeSamples: {
      highestHiddenProgress: requireSample(highestHiddenProgress, "highestHiddenProgress"),
      lowestHiddenProgress: requireSample(lowestHiddenProgress, "lowestHiddenProgress"),
      richestCarriedItems: requireSample(richestCarriedItems, "richestCarriedItems")
    },
    debugSamples
  });
}

export function buildOriginFateRerollLockCheck(input: OriginFateRerollLockCheckInput): OriginFateRerollLockCheck {
  const generator = input.generator ?? new DefaultOriginFateGenerator();
  const initial = generator.generate(createLockCheckGenerateInput(input.seed, input.draftId, input.initialRerollIndex));
  const reproduction = generator.generate(createLockCheckGenerateInput(input.seed, input.draftId, input.initialRerollIndex));
  const unlocked = generator.generate({
    ...createLockCheckGenerateInput(input.seed, input.draftId, input.nextRerollIndex),
    previousDraft: initial
  });
  const backgroundLocked = generator.generate({
    ...createLockCheckGenerateInput(input.seed, input.draftId, input.nextRerollIndex),
    locks: {
      backgroundOriginId: initial.backgroundOrigin.originId
    },
    previousDraft: initial
  });
  const hiddenFateLocked = generator.generate({
    ...createLockCheckGenerateInput(input.seed, input.draftId, input.nextRerollIndex),
    locks: {
      hiddenFateId: initial.hiddenFateInternal.hiddenFateId
    },
    previousDraft: initial
  });
  const carriedItemsLocked = generator.generate({
    ...createLockCheckGenerateInput(input.seed, input.draftId, input.nextRerollIndex),
    locks: {
      carriedItemIds: initial.carriedItems.map((item) => item.itemId)
    },
    previousDraft: initial
  });
  const allLocked = generator.generate({
    ...createLockCheckGenerateInput(input.seed, input.draftId, input.nextRerollIndex),
    locks: {
      backgroundOriginId: initial.backgroundOrigin.originId,
      hiddenFateId: initial.hiddenFateInternal.hiddenFateId,
      carriedItemIds: initial.carriedItems.map((item) => item.itemId)
    },
    previousDraft: initial
  });

  return deepFreeze({
    reproducible: signatureForOriginFate(reproduction) === signatureForOriginFate(initial),
    unlocked: {
      changedOriginFateSignature: signatureForOriginFate(unlocked) !== signatureForOriginFate(initial)
    },
    backgroundLock: {
      preservedBackgroundOrigin: backgroundLocked.backgroundOrigin.originId === initial.backgroundOrigin.originId
    },
    hiddenFateLock: {
      preservedHiddenFate: hiddenFateLocked.hiddenFateInternal.hiddenFateId === initial.hiddenFateInternal.hiddenFateId
    },
    carriedItemsLock: {
      preservedCarriedItems: idsEqual(
        carriedItemsLocked.carriedItems.map((item) => item.itemId),
        initial.carriedItems.map((item) => item.itemId)
      )
    },
    allLocks: {
      preservedFullOriginFate: signatureForOriginFate(allLocked) === signatureForOriginFate(initial)
    }
  });
}

export function buildOriginFateCreationPreview(draft: OriginFateDraft): OriginFateCreationPreview {
  return deepFreeze({
    backgroundOrigin: {
      name: draft.backgroundOrigin.name,
      visibleDescription: draft.backgroundOrigin.visibleDescription,
      matchedTags: draft.backgroundOrigin.matchedTags
    },
    visibleHiddenOmen: {
      levelLabel: draft.visibleHiddenOmen.levelLabel,
      hints: draft.visibleHiddenOmen.hints,
      riskHint: draft.visibleHiddenOmen.riskHint,
      ...(draft.visibleHiddenOmen.revealedCategory === undefined ? {} : { revealedCategory: draft.visibleHiddenOmen.revealedCategory }),
      ...(draft.visibleHiddenOmen.relatedTags === undefined ? {} : { relatedTags: draft.visibleHiddenOmen.relatedTags })
    },
    carriedItems: draft.carriedItems.map((item) => ({
      name: item.name,
      visibleDescription: item.visibleDescription,
      conversionLabel: item.conversion.label,
      outerBattlefieldEffect: item.conversion.outerBattlefieldEffect,
      dongfuHook: item.conversion.dongfuHook
    }))
  });
}

export function formatOriginFateDistributionReport(
  report: OriginFateDistributionTelemetryReport,
  lockCheck?: OriginFateRerollLockCheck
): string {
  return [
    "# Origin Fate Distribution Report",
    "",
    `sampleCount: ${report.sampleCount}`,
    `seedPrefix: ${report.seedPrefix}`,
    "",
    "## Background Origin Distribution",
    formatDistribution(report.backgroundOriginDistribution),
    "",
    "## Hidden Fate Distribution",
    formatDistribution(report.hiddenFateDistribution),
    "",
    "## Hidden Fate Category Distribution",
    formatDistribution(report.hiddenFateCategoryDistribution),
    "",
    "## Carried Item Distribution",
    formatDistribution(report.carriedItemDistribution),
    "",
    "## Hidden Progress",
    `min: ${report.hiddenProgress.min}`,
    `max: ${report.hiddenProgress.max}`,
    `mean: ${report.hiddenProgress.mean}`,
    "",
    "## Extreme Samples",
    `highestHiddenProgress: ${formatSample(report.extremeSamples.highestHiddenProgress)}`,
    `lowestHiddenProgress: ${formatSample(report.extremeSamples.lowestHiddenProgress)}`,
    `richestCarriedItems: ${formatSample(report.extremeSamples.richestCarriedItems)}`,
    "",
    "## Reroll Lock Check",
    lockCheck === undefined ? "not provided" : JSON.stringify(lockCheck, null, 2),
    "",
    "## Creation Privacy",
    `trueNameExposureCount: ${report.trueNameExposureCount}`,
    "",
    "## Age 18 Conversion",
    `age18RevealRate: ${report.age18RevealRate}`,
    formatDistribution(report.age18ConversionDistribution)
  ].join("\n");
}

function createTelemetryGenerateInput(seed: string, index: number): GenerateOriginFateDraftInput {
  return {
    seed,
    draftId: seed.replace(/[^a-zA-Z0-9_]+/g, "_"),
    rerollIndex: index % 7,
    ...contextTagsForIndex(index),
    divinationTokens: index % 11 === 0 ? 1 : 0
  };
}

function createLockCheckGenerateInput(seed: string, draftId: string, rerollIndex: number): GenerateOriginFateDraftInput {
  return {
    seed,
    draftId,
    rerollIndex,
    openingTags: ["lifeEvent:ancestral_dream", "archetype:blessed"],
    destinyTags: ["destiny_thunder_affinity", "destiny_alchemy_prodigy"],
    spiritualRootTags: ["root:thunder", "root:fire", "root:wood"],
    aptitudeTags: ["aptitude:inspiration_high", "aptitude:fortune_high"],
    divinationTokens: 1
  };
}

function contextTagsForIndex(index: number): Pick<
  GenerateOriginFateDraftInput,
  "openingTags" | "destinyTags" | "spiritualRootTags" | "aptitudeTags"
> {
  const variants = [
    {
      openingTags: [],
      destinyTags: [],
      spiritualRootTags: [],
      aptitudeTags: []
    },
    {
      openingTags: ["lifeEvent:ancestral_dream"],
      destinyTags: ["destiny_thunder_affinity"],
      spiritualRootTags: ["root:thunder"],
      aptitudeTags: ["aptitude:inspiration_high"]
    },
    {
      openingTags: ["lifeEvent:apothecary", "lifeEvent:alchemy"],
      destinyTags: ["destiny_alchemy_prodigy"],
      spiritualRootTags: ["root:wood", "root:fire"],
      aptitudeTags: ["aptitude:fortune_high"]
    },
    {
      openingTags: ["fallen_lineage", "lifeEvent:relic"],
      destinyTags: ["destiny_sword_bone"],
      spiritualRootTags: ["root:metal"],
      aptitudeTags: ["aptitude:comprehension_high"]
    },
    {
      openingTags: ["graveyard", "dream"],
      destinyTags: ["destiny_yin_eye"],
      spiritualRootTags: ["root:yin"],
      aptitudeTags: ["aptitude:inspiration_low"]
    }
  ] satisfies readonly Pick<GenerateOriginFateDraftInput, "openingTags" | "destinyTags" | "spiritualRootTags" | "aptitudeTags">[];
  return variants[index % variants.length]!;
}

function createTelemetryLifeSummary(index: number): Age18OriginFateLifeSimulationSummary {
  return {
    aptitude: {
      inspiration: index % 5 === 1 ? 95 : 52,
      fortune: index % 5 === 2 ? 92 : 48,
      heart: index % 13 === 0 ? 20 : 55
    },
    destinyTags: contextTagsForIndex(index).destinyTags,
    carriedItemTags: []
  };
}

function toTelemetrySample(
  seed: string,
  index: number,
  draft: OriginFateDraft,
  resolution: ReturnType<typeof resolveAge18OriginFate>
): OriginFateTelemetrySample {
  return {
    seed,
    draftId: draft.draftId,
    rerollIndex: index % 7,
    backgroundOriginId: draft.backgroundOrigin.originId,
    hiddenFateId: draft.hiddenFateInternal.hiddenFateId,
    hiddenFateCategory: draft.hiddenFateInternal.category,
    progress: draft.hiddenFateInternal.progress,
    progressBand: draft.hiddenFateInternal.progressBand,
    visibleOmen: buildOriginFateCreationPreview(draft).visibleHiddenOmen,
    carriedItemIds: draft.carriedItems.map((item) => item.itemId),
    carriedItemConversionTypes: draft.carriedItems.map((item) => item.conversion.type),
    modeProjectionTags: draft.modeProjectionTags,
    age18ConvertedItemTypes: resolution.convertedItems.map((item) => item.conversionType),
    age18Revealed: resolution.revealedHiddenFate !== undefined
  };
}

function validateTelemetryInput(input: OriginFateDistributionTelemetryInput): void {
  if (!Number.isInteger(input.sampleCount) || input.sampleCount <= 0) {
    throw new Error("Origin fate telemetry sampleCount must be a positive integer");
  }
  if (input.seedPrefix.trim().length === 0) {
    throw new Error("Origin fate telemetry seedPrefix must not be empty");
  }
  if (input.debugSampleCount !== undefined && (!Number.isInteger(input.debugSampleCount) || input.debugSampleCount < 0)) {
    throw new Error("Origin fate telemetry debugSampleCount must be a non-negative integer");
  }
}

function initializeCounts(ids: readonly string[]): Record<string, number> {
  return Object.fromEntries(ids.map((id) => [id, 0]));
}

function increment(counts: Record<string, number>, id: string): void {
  counts[id] = (counts[id] ?? 0) + 1;
}

function toDistribution(counts: Readonly<Record<string, number>>, sampleCount: number): Readonly<Record<string, OriginFateDistributionBucket>> {
  return Object.fromEntries(
    Object.entries(counts)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([id, count]) => [
        id,
        {
          count,
          rate: round4(count / sampleCount)
        }
      ])
  );
}

function buildProgressStats(values: readonly number[]): OriginFateProgressStats {
  if (values.length === 0) {
    return {
      min: 0,
      max: 0,
      mean: 0
    };
  }
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    mean: round4(values.reduce((sum, value) => sum + value, 0) / values.length)
  };
}

function pickHigherProgress(
  current: OriginFateTelemetrySample | undefined,
  candidate: OriginFateTelemetrySample
): OriginFateTelemetrySample {
  return current === undefined || candidate.progress > current.progress ? candidate : current;
}

function pickLowerProgress(
  current: OriginFateTelemetrySample | undefined,
  candidate: OriginFateTelemetrySample
): OriginFateTelemetrySample {
  return current === undefined || candidate.progress < current.progress ? candidate : current;
}

function pickRicherCarriedItems(
  current: OriginFateTelemetrySample | undefined,
  candidate: OriginFateTelemetrySample
): OriginFateTelemetrySample {
  return current === undefined || candidate.carriedItemIds.length > current.carriedItemIds.length ? candidate : current;
}

function requireSample(sample: OriginFateTelemetrySample | undefined, name: string): OriginFateTelemetrySample {
  if (sample === undefined) {
    throw new Error(`Origin fate telemetry missing sample: ${name}`);
  }
  return sample;
}

function signatureForOriginFate(draft: OriginFateDraft): string {
  return [
    draft.backgroundOrigin.originId,
    draft.hiddenFateInternal.hiddenFateId,
    draft.hiddenFateInternal.progress,
    draft.visibleHiddenOmen.hints.join(","),
    draft.carriedItems.map((item) => item.itemId).join(",")
  ].join("|");
}

function idsEqual(first: readonly string[], second: readonly string[]): boolean {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

function formatDistribution(distribution: Readonly<Record<string, OriginFateDistributionBucket>>): string {
  return Object.entries(distribution)
    .map(([id, bucket]) => `- ${id}: ${bucket.count} (${bucket.rate})`)
    .join("\n");
}

function formatSample(sample: OriginFateTelemetrySample): string {
  return `${sample.seed} ${sample.backgroundOriginId} ${sample.hiddenFateId} progress=${sample.progress} items=${sample.carriedItemIds.join(",")}`;
}

function uniqueStable<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
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
