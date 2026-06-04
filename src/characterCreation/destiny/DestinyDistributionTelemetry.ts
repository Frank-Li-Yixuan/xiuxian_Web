import type {
  CharacterCreationLocks,
  DestinyQuality,
  DestinyRollDraft,
  DestinyTraitDefinition,
  FateMeterState
} from "../../types/destiny-types.v0.1";
import { DestinyCombinationEngine } from "./DestinyCombinationEngine";
import { DestinyRegistry, loadDestinyRegistry } from "./DestinyRegistry";
import { DefaultDestinyRoller } from "./DestinyRoller";

const DEFAULT_SAMPLE_COUNT = 10_000;
const DEFAULT_DEBUG_SAMPLE_COUNT = 8;
const DISTRIBUTION_TOLERANCE_MIN = 0.025;
const DISTRIBUTION_TOLERANCE_RATIO = 0.35;

type DestinySlotKey = "main" | "secondary0" | "secondary1" | "flaw";

export interface DestinyDistributionBucket {
  readonly count: number;
  readonly rate: number;
}

export interface DestinySlotSummary {
  readonly id: string;
  readonly name: string;
  readonly quality: DestinyQuality;
}

export interface DestinyDebugSample {
  readonly seed: string;
  readonly draftId: string;
  readonly rerollIndex: number;
  readonly traitIds: readonly string[];
  readonly slots: Readonly<Record<DestinySlotKey, DestinySlotSummary>>;
  readonly synergyIds: readonly string[];
  readonly synergyWarnings: readonly string[];
  readonly conflictWarnings: readonly string[];
  readonly warnings: readonly string[];
  readonly fateMeterBefore: FateMeterState;
  readonly fateMeterAfter: FateMeterState;
}

export interface DestinySampleTraitSet {
  readonly seed: string;
  readonly draftId: string;
  readonly rerollIndex: number;
  readonly traitIds: readonly string[];
}

export interface DestinyHardExclusiveSample extends DestinySampleTraitSet {
  readonly hardExclusiveRuleIds: readonly string[];
}

export interface DestinyTuningSnapshot {
  readonly sampleCount: number;
  readonly slotQualityCounts: Readonly<Record<DestinySlotKey, Readonly<Record<string, number>>>>;
  readonly topTraits: readonly {
    readonly id: string;
    readonly count: number;
    readonly rate: number;
  }[];
  readonly synergyIds: readonly string[];
  readonly warningCounts: {
    readonly synergyWarnings: number;
    readonly conflictWarnings: number;
    readonly warnings: number;
  };
  readonly hardExclusiveCount: number;
  readonly debugSampleSignatures: readonly string[];
}

export interface DestinyDistributionTelemetryReport {
  readonly sampleCount: number;
  readonly seedPrefix: string;
  readonly slotQualityDistribution: Readonly<Record<DestinySlotKey, Readonly<Record<string, DestinyDistributionBucket>>>>;
  readonly traitDistribution: Readonly<Record<string, DestinyDistributionBucket>>;
  readonly synergyDistribution: Readonly<Record<string, DestinyDistributionBucket>>;
  readonly warningCounts: {
    readonly synergyWarnings: number;
    readonly conflictWarnings: number;
    readonly warnings: number;
  };
  readonly hardExclusiveCount: number;
  readonly hardExclusiveSamples: readonly DestinyHardExclusiveSample[];
  readonly distributionWarnings: readonly string[];
  readonly sampleTraitIds: readonly DestinySampleTraitSet[];
  readonly debugSamples: readonly DestinyDebugSample[];
  readonly tuningSnapshot: DestinyTuningSnapshot;
}

export interface BuildDestinyDistributionTelemetryOptions {
  readonly sampleCount?: number;
  readonly seedPrefix?: string;
  readonly debugSampleCount?: number;
  readonly registry?: DestinyRegistry;
}

export interface DestinyRerollLockCheckInput {
  readonly seed: string;
  readonly draftId: string;
  readonly initialRerollIndex: number;
  readonly nextRerollIndex: number;
  readonly registry?: DestinyRegistry;
}

export interface DestinyRerollLockCheck {
  readonly reproducible: boolean;
  readonly initialSignature: string;
  readonly unlocked: {
    readonly signature: string;
    readonly changedDestinySignature: boolean;
  };
  readonly mainLock: {
    readonly signature: string;
    readonly preservedMain: boolean;
  };
  readonly secondary0Lock: {
    readonly signature: string;
    readonly preservedSecondary0: boolean;
  };
  readonly secondary1Lock: {
    readonly signature: string;
    readonly preservedSecondary1: boolean;
  };
  readonly flawLock: {
    readonly signature: string;
    readonly preservedFlaw: boolean;
  };
  readonly allLocks: {
    readonly signature: string;
    readonly preservedFullDestiny: boolean;
  };
}

export interface DestinyCombinationProbe {
  readonly traitIds: readonly string[];
  readonly hasHardExclusive: boolean;
  readonly hardExclusiveRuleIds: readonly string[];
  readonly synergyIds: readonly string[];
  readonly synergyWarnings: readonly string[];
  readonly conflictWarnings: readonly string[];
}

export interface DestinyDebugSamplesOptions {
  readonly seedPrefix?: string;
  readonly count?: number;
  readonly registry?: DestinyRegistry;
}

export function buildDestinyDistributionTelemetry(
  options: BuildDestinyDistributionTelemetryOptions = {}
): DestinyDistributionTelemetryReport {
  const registry = options.registry ?? loadDestinyRegistry();
  const roller = new DefaultDestinyRoller(registry);
  const engine = new DestinyCombinationEngine(registry);
  const sampleCount = options.sampleCount ?? DEFAULT_SAMPLE_COUNT;
  const seedPrefix = options.seedPrefix ?? "dt-c006-distribution";
  const debugSampleCount = options.debugSampleCount ?? DEFAULT_DEBUG_SAMPLE_COUNT;
  validateSampleOptions(sampleCount, debugSampleCount);

  const slotQualityCounts = createSlotCountMaps();
  const traitCounts: Record<string, number> = {};
  const synergyCounts: Record<string, number> = {};
  const sampleTraitIds: DestinySampleTraitSet[] = [];
  const debugSamples: DestinyDebugSample[] = [];
  const hardExclusiveSamples: DestinyHardExclusiveSample[] = [];
  let hardExclusiveCount = 0;
  let synergyWarningCount = 0;
  let conflictWarningCount = 0;
  let warningCount = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const seed = `${seedPrefix}-${index}`;
    const draftId = `${toDraftId(seedPrefix)}_${index}`;
    const draft = roller.generate({
      seed,
      draftId,
      rerollIndex: index
    });
    const traitIds = getTraitIds(draft);
    const sampleTraitSet = {
      seed,
      draftId,
      rerollIndex: index,
      traitIds
    };
    const evaluation = engine.evaluateTraitIds(traitIds);

    increment(slotQualityCounts.main, draft.destinies.main.quality);
    increment(slotQualityCounts.secondary0, draft.destinies.secondary[0].quality);
    increment(slotQualityCounts.secondary1, draft.destinies.secondary[1].quality);
    increment(slotQualityCounts.flaw, draft.destinies.flaw.quality);

    for (const traitId of traitIds) {
      increment(traitCounts, traitId);
    }
    for (const synergy of draft.destinies.synergies) {
      increment(synergyCounts, synergy.id);
    }
    synergyWarningCount += draft.destinies.synergyWarnings.length;
    conflictWarningCount += draft.destinies.conflictWarnings.length;
    warningCount += draft.destinies.warnings.length;

    sampleTraitIds.push(sampleTraitSet);
    if (evaluation.hasHardExclusive) {
      hardExclusiveCount += 1;
      if (hardExclusiveSamples.length < 12) {
        hardExclusiveSamples.push({
          ...sampleTraitSet,
          hardExclusiveRuleIds: evaluation.hardExclusiveRuleIds
        });
      }
    }
    if (debugSamples.length < debugSampleCount) {
      debugSamples.push(toDebugSample(draft));
    }
  }

  const slotQualityDistribution = {
    main: toDistribution(slotQualityCounts.main, sampleCount),
    secondary0: toDistribution(slotQualityCounts.secondary0, sampleCount),
    secondary1: toDistribution(slotQualityCounts.secondary1, sampleCount),
    flaw: toDistribution(slotQualityCounts.flaw, sampleCount)
  };
  const traitDistribution = toDistribution(traitCounts, sampleCount * 4);
  const synergyDistribution = toDistribution(synergyCounts, sampleCount);
  const warningCounts = {
    synergyWarnings: synergyWarningCount,
    conflictWarnings: conflictWarningCount,
    warnings: warningCount
  };
  const distributionWarnings = buildDistributionWarnings(slotQualityDistribution, registry);
  const tuningSnapshot = buildTuningSnapshot({
    sampleCount,
    slotQualityCounts,
    traitDistribution,
    synergyDistribution,
    warningCounts,
    hardExclusiveCount,
    debugSamples
  });

  return deepFreeze({
    sampleCount,
    seedPrefix,
    slotQualityDistribution,
    traitDistribution,
    synergyDistribution,
    warningCounts,
    hardExclusiveCount,
    hardExclusiveSamples,
    distributionWarnings,
    sampleTraitIds,
    debugSamples,
    tuningSnapshot
  });
}

export function buildDestinyRerollLockCheck(input: DestinyRerollLockCheckInput): DestinyRerollLockCheck {
  const registry = input.registry ?? loadDestinyRegistry();
  const roller = new DefaultDestinyRoller(registry);
  const initial = roller.generate({
    seed: input.seed,
    draftId: input.draftId,
    rerollIndex: input.initialRerollIndex
  });
  const repeated = roller.generate({
    seed: input.seed,
    draftId: input.draftId,
    rerollIndex: input.initialRerollIndex
  });
  const unlocked = rerollWithLocks(roller, input, initial, {});
  const mainLock = rerollWithLocks(roller, input, initial, { mainDestiny: true });
  const secondary0Lock = rerollWithLocks(roller, input, initial, { secondaryDestiny0: true });
  const secondary1Lock = rerollWithLocks(roller, input, initial, { secondaryDestiny1: true });
  const flawLock = rerollWithLocks(roller, input, initial, { flawDestiny: true });
  const allLocks = rerollWithLocks(roller, input, initial, {
    mainDestiny: true,
    secondaryDestiny0: true,
    secondaryDestiny1: true,
    flawDestiny: true
  });

  return deepFreeze({
    reproducible: signature(initial) === signature(repeated),
    initialSignature: signature(initial),
    unlocked: {
      signature: signature(unlocked),
      changedDestinySignature: signature(unlocked) !== signature(initial)
    },
    mainLock: {
      signature: signature(mainLock),
      preservedMain: mainLock.destinies.main.id === initial.destinies.main.id
    },
    secondary0Lock: {
      signature: signature(secondary0Lock),
      preservedSecondary0: secondary0Lock.destinies.secondary[0].id === initial.destinies.secondary[0].id
    },
    secondary1Lock: {
      signature: signature(secondary1Lock),
      preservedSecondary1: secondary1Lock.destinies.secondary[1].id === initial.destinies.secondary[1].id
    },
    flawLock: {
      signature: signature(flawLock),
      preservedFlaw: flawLock.destinies.flaw.id === initial.destinies.flaw.id
    },
    allLocks: {
      signature: signature(allLocks),
      preservedFullDestiny: signature(allLocks) === signature(initial)
    }
  });
}

export function buildDestinyCombinationProbe(
  traitIds: readonly string[],
  registry = loadDestinyRegistry()
): DestinyCombinationProbe {
  const evaluation = new DestinyCombinationEngine(registry).evaluateTraitIds(traitIds);
  return deepFreeze({
    traitIds: [...traitIds],
    hasHardExclusive: evaluation.hasHardExclusive,
    hardExclusiveRuleIds: evaluation.hardExclusiveRuleIds,
    synergyIds: evaluation.synergies.map((synergy) => synergy.id),
    synergyWarnings: evaluation.synergyWarnings,
    conflictWarnings: evaluation.conflictWarnings
  });
}

export function buildDestinyDebugSamples(options: DestinyDebugSamplesOptions = {}): readonly DestinyDebugSample[] {
  const registry = options.registry ?? loadDestinyRegistry();
  const roller = new DefaultDestinyRoller(registry);
  const seedPrefix = options.seedPrefix ?? "dt-c006-debug";
  const count = options.count ?? DEFAULT_DEBUG_SAMPLE_COUNT;
  validateSampleOptions(1, count);

  const samples: DestinyDebugSample[] = [];
  for (let index = 0; index < count; index += 1) {
    samples.push(toDebugSample(roller.generate({
      seed: `${seedPrefix}-${index}`,
      draftId: `${toDraftId(seedPrefix)}_${index}`,
      rerollIndex: index
    })));
  }

  return deepFreeze(samples);
}

export function formatDestinyDistributionReport(
  report: DestinyDistributionTelemetryReport,
  lockCheck?: DestinyRerollLockCheck
): string {
  const lines = [
    "# Destiny Distribution Report",
    `sampleCount: ${report.sampleCount}`,
    `seedPrefix: ${report.seedPrefix}`,
    `hardExclusiveCount: ${report.hardExclusiveCount}`,
    `distributionWarnings: ${report.distributionWarnings.length === 0 ? "none" : report.distributionWarnings.length}`,
    "",
    "## Slot Quality Distribution",
    ...formatSlotDistribution("main", report.slotQualityDistribution.main),
    ...formatSlotDistribution("secondary0", report.slotQualityDistribution.secondary0),
    ...formatSlotDistribution("secondary1", report.slotQualityDistribution.secondary1),
    ...formatSlotDistribution("flaw", report.slotQualityDistribution.flaw),
    "",
    "## Top Traits",
    ...topDistribution(report.traitDistribution, 12).map(
      ([id, bucket]) => `- ${id}: ${bucket.count} (${formatPercent(bucket.rate)})`
    ),
    "",
    "## Synergies",
    ...(Object.keys(report.synergyDistribution).length === 0
      ? ["- none"]
      : topDistribution(report.synergyDistribution, 12).map(
          ([id, bucket]) => `- ${id}: ${bucket.count} (${formatPercent(bucket.rate)})`
        )),
    "",
    "## Warnings",
    `- synergyWarnings: ${report.warningCounts.synergyWarnings}`,
    `- conflictWarnings: ${report.warningCounts.conflictWarnings}`,
    `- warnings: ${report.warningCounts.warnings}`
  ];

  if (report.distributionWarnings.length > 0) {
    lines.push("", "## Distribution Warnings", ...report.distributionWarnings.map((warning) => `- ${warning}`));
  }
  if (lockCheck !== undefined) {
    lines.push(
      "",
      "## Reroll Lock Check",
      `- reproducible: ${lockCheck.reproducible}`,
      `- unlocked changed: ${lockCheck.unlocked.changedDestinySignature}`,
      `- main preserved: ${lockCheck.mainLock.preservedMain}`,
      `- secondary0 preserved: ${lockCheck.secondary0Lock.preservedSecondary0}`,
      `- secondary1 preserved: ${lockCheck.secondary1Lock.preservedSecondary1}`,
      `- flaw preserved: ${lockCheck.flawLock.preservedFlaw}`,
      `- all preserved: ${lockCheck.allLocks.preservedFullDestiny}`
    );
  }

  return `${lines.join("\n")}\n`;
}

export function formatDestinyDebugSamples(samples: readonly DestinyDebugSample[]): string {
  const lines = ["# Destiny Roll Debug Samples"];
  samples.forEach((sample, index) => {
    lines.push(
      "",
      `## Sample ${index + 1}: ${sample.seed}`,
      `draftId: ${sample.draftId}`,
      `rerollIndex: ${sample.rerollIndex}`,
      `Main Destiny: ${formatSlotSummary(sample.slots.main)}`,
      `Secondary Destiny 1: ${formatSlotSummary(sample.slots.secondary0)}`,
      `Secondary Destiny 2: ${formatSlotSummary(sample.slots.secondary1)}`,
      `Flaw Destiny: ${formatSlotSummary(sample.slots.flaw)}`,
      `Synergies: ${sample.synergyIds.length === 0 ? "none" : sample.synergyIds.join(", ")}`,
      `Synergy Warnings: ${sample.synergyWarnings.length === 0 ? "none" : sample.synergyWarnings.join(" | ")}`,
      `Conflict Warnings: ${sample.conflictWarnings.length === 0 ? "none" : sample.conflictWarnings.join(" | ")}`,
      `Warnings: ${sample.warnings.length === 0 ? "none" : sample.warnings.join(" | ")}`,
      `Fate Meter: ${sample.fateMeterBefore.value} -> ${sample.fateMeterAfter.value}`
    );
  });

  return `${lines.join("\n")}\n`;
}

function rerollWithLocks(
  roller: DefaultDestinyRoller,
  input: DestinyRerollLockCheckInput,
  previousDraft: DestinyRollDraft,
  locks: CharacterCreationLocks
): DestinyRollDraft {
  return roller.generate({
    seed: input.seed,
    draftId: input.draftId,
    rerollIndex: input.nextRerollIndex,
    locks,
    previousDraft,
    previousTraitIds: getTraitIds(previousDraft),
    fateMeter: previousDraft.fateMeter
  });
}

function toDebugSample(draft: DestinyRollDraft): DestinyDebugSample {
  return {
    seed: draft.seed,
    draftId: draft.draftId,
    rerollIndex: draft.rerollIndex,
    traitIds: getTraitIds(draft),
    slots: {
      main: toSlotSummary(draft.destinies.main),
      secondary0: toSlotSummary(draft.destinies.secondary[0]),
      secondary1: toSlotSummary(draft.destinies.secondary[1]),
      flaw: toSlotSummary(draft.destinies.flaw)
    },
    synergyIds: draft.destinies.synergies.map((synergy) => synergy.id),
    synergyWarnings: draft.destinies.synergyWarnings,
    conflictWarnings: draft.destinies.conflictWarnings,
    warnings: draft.destinies.warnings,
    fateMeterBefore: draft.debug.fateMeterBefore,
    fateMeterAfter: draft.debug.fateMeterAfter
  };
}

function toSlotSummary(trait: DestinyTraitDefinition): DestinySlotSummary {
  return {
    id: trait.id,
    name: trait.name,
    quality: trait.quality
  };
}

function getTraitIds(draft: DestinyRollDraft): readonly string[] {
  return [
    draft.destinies.main.id,
    draft.destinies.secondary[0].id,
    draft.destinies.secondary[1].id,
    draft.destinies.flaw.id
  ];
}

function createSlotCountMaps(): Record<DestinySlotKey, Record<string, number>> {
  return {
    main: {},
    secondary0: {},
    secondary1: {},
    flaw: {}
  };
}

function increment(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

function toDistribution(
  counts: Readonly<Record<string, number>>,
  sampleCount: number
): Readonly<Record<string, DestinyDistributionBucket>> {
  return Object.freeze(Object.fromEntries(
    Object.entries(counts)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([id, count]) => [
        id,
        Object.freeze({
          count,
          rate: round4(count / sampleCount)
        })
      ])
  ));
}

function buildDistributionWarnings(
  slotDistribution: Readonly<Record<DestinySlotKey, Readonly<Record<string, DestinyDistributionBucket>>>>,
  registry: DestinyRegistry
): readonly string[] {
  const warnings: string[] = [];
  const expectations = {
    main: normalizeAvailableQualityWeights("main", registry.getTraitsForSlot("main"), registry),
    secondary0: normalizeAvailableQualityWeights("secondary", registry.getTraitsForSlot("secondary"), registry),
    secondary1: normalizeAvailableQualityWeights("secondary", registry.getTraitsForSlot("secondary"), registry)
  };

  for (const [slot, expected] of Object.entries(expectations) as readonly [
    Exclude<DestinySlotKey, "flaw">,
    Readonly<Record<string, number>>
  ][]) {
    for (const [quality, expectedRate] of Object.entries(expected)) {
      const observedRate = slotDistribution[slot][quality]?.rate ?? 0;
      const tolerance = Math.max(DISTRIBUTION_TOLERANCE_MIN, expectedRate * DISTRIBUTION_TOLERANCE_RATIO);
      const delta = Math.abs(observedRate - expectedRate);
      if (delta > tolerance) {
        warnings.push(
          `${slot}.${quality} observed ${formatNumber(observedRate)} differs from expected ${formatNumber(expectedRate)} by ${formatNumber(delta)}`
        );
      }
    }
  }

  return Object.freeze(warnings);
}

function normalizeAvailableQualityWeights(
  slotType: "main" | "secondary",
  traits: readonly DestinyTraitDefinition[],
  registry: DestinyRegistry
): Readonly<Record<string, number>> {
  const available = new Set(traits.map((trait) => trait.quality));
  const entries = Object.entries(registry.qualityWeights[slotType]).filter(([quality, weight]) => {
    if (weight === undefined || weight <= 0) {
      return false;
    }
    if (slotType === "main" && quality === "mortal") {
      return false;
    }
    return available.has(quality as DestinyQuality);
  });
  const total = entries.reduce((sum, [, weight]) => sum + (weight ?? 0), 0);
  if (total <= 0) {
    return Object.freeze({});
  }

  return Object.freeze(Object.fromEntries(entries.map(([quality, weight]) => [quality, (weight ?? 0) / total])));
}

function buildTuningSnapshot(input: {
  readonly sampleCount: number;
  readonly slotQualityCounts: Readonly<Record<DestinySlotKey, Readonly<Record<string, number>>>>;
  readonly traitDistribution: Readonly<Record<string, DestinyDistributionBucket>>;
  readonly synergyDistribution: Readonly<Record<string, DestinyDistributionBucket>>;
  readonly warningCounts: DestinyDistributionTelemetryReport["warningCounts"];
  readonly hardExclusiveCount: number;
  readonly debugSamples: readonly DestinyDebugSample[];
}): DestinyTuningSnapshot {
  return {
    sampleCount: input.sampleCount,
    slotQualityCounts: {
      main: sortNumericRecord(input.slotQualityCounts.main),
      secondary0: sortNumericRecord(input.slotQualityCounts.secondary0),
      secondary1: sortNumericRecord(input.slotQualityCounts.secondary1),
      flaw: sortNumericRecord(input.slotQualityCounts.flaw)
    },
    topTraits: topDistribution(input.traitDistribution, 12).map(([id, bucket]) => ({
      id,
      count: bucket.count,
      rate: bucket.rate
    })),
    synergyIds: Object.keys(input.synergyDistribution).sort(),
    warningCounts: input.warningCounts,
    hardExclusiveCount: input.hardExclusiveCount,
    debugSampleSignatures: input.debugSamples.map(formatDebugSampleSignature)
  };
}

function sortNumericRecord(record: Readonly<Record<string, number>>): Readonly<Record<string, number>> {
  return Object.freeze(Object.fromEntries(Object.entries(record).sort(([left], [right]) => left.localeCompare(right))));
}

function topDistribution(
  distribution: Readonly<Record<string, DestinyDistributionBucket>>,
  limit: number
): readonly [string, DestinyDistributionBucket][] {
  return Object.entries(distribution)
    .sort(([leftId, left], [rightId, right]) => right.count - left.count || leftId.localeCompare(rightId))
    .slice(0, limit);
}

function formatSlotDistribution(
  slot: DestinySlotKey,
  distribution: Readonly<Record<string, DestinyDistributionBucket>>
): string[] {
  return [
    `### ${slot}`,
    ...Object.entries(distribution).map(
      ([quality, bucket]) => `- ${quality}: ${bucket.count} (${formatPercent(bucket.rate)})`
    )
  ];
}

function formatSlotSummary(slot: DestinySlotSummary): string {
  return `${slot.name} [${slot.id}] quality=${slot.quality}`;
}

function formatDebugSampleSignature(sample: DestinyDebugSample): string {
  return [
    sample.slots.main.id,
    sample.slots.secondary0.id,
    sample.slots.secondary1.id,
    sample.slots.flaw.id,
    `syn:${sample.synergyIds.join("+") || "none"}`,
    `warn:${sample.warnings.length}`
  ].join("|");
}

function signature(draft: DestinyRollDraft): string {
  return getTraitIds(draft).join("|");
}

function toDraftId(seedPrefix: string): string {
  return seedPrefix.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function validateSampleOptions(sampleCount: number, debugSampleCount: number): void {
  if (!Number.isInteger(sampleCount) || sampleCount <= 0) {
    throw new Error("Destiny telemetry sampleCount must be a positive integer");
  }
  if (!Number.isInteger(debugSampleCount) || debugSampleCount < 0) {
    throw new Error("Destiny telemetry debugSampleCount must be a non-negative integer");
  }
}

function formatPercent(value: number): string {
  return `${formatNumber(value * 100)}%`;
}

function formatNumber(value: number): string {
  return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
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
