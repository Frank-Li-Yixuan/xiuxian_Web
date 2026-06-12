import { evaluateDestinyEligibility } from "../destinyV2/DestinyEligibilityEvaluator";
import { loadDestinyV2Registry, type DestinyV2Registry } from "../destinyV2/DestinyV2Registry";
import { OpeningDestinyV2Roller } from "../characterCreation/destinyV2/OpeningDestinyV2Roller";
import { DefaultOpeningGenerator } from "../opening/OpeningGenerator";
import type { DestinyEligibilityResult, Id } from "../types/destiny-eligibility-types.v0.1";
import type { DestinyRollDraft, DestinyRoller } from "../types/destiny-types.v0.1";
import type { NinePalaceEvaluation } from "../types/nine-palace-fate-types.v0.1";
import type { OpeningGenerator } from "../types/opening-generator-types.v0.1";
import { buildDestinyEligibilityInputFromNinePalace } from "./NinePalaceDestinyEngine";

const REPORT_VERSION = "0.1";
const DEFAULT_SAMPLE_COUNT = 10_000;
const DEFAULT_DEBUG_SAMPLE_COUNT = 8;
const DEFAULT_SEED_PREFIX = "npf-c006-fate-matrix";

const TARGET_IDS = {
  heavenJealousTalent: "destiny_heaven_jealous_talent",
  wasteRootReversal: "destiny_waste_root_reversal",
  cowardlySupreme: "destiny_cowardly_supreme"
} as const;

export interface NinePalaceNumericDistribution {
  readonly count: number;
  readonly min: number;
  readonly max: number;
  readonly mean: number;
}

export interface NinePalaceDistributionBucket {
  readonly count: number;
  readonly rate: number;
}

export interface NinePalaceTargetSampleStats {
  readonly sampleCount: number;
  readonly finalCount: number;
  readonly talentScore?: NinePalaceNumericDistribution;
  readonly rootBone?: NinePalaceNumericDistribution;
  readonly heart?: NinePalaceNumericDistribution;
  readonly lifespan?: NinePalaceNumericDistribution;
}

export interface NinePalaceAntiWeirdnessViolation {
  readonly seed: string;
  readonly draftId: string;
  readonly code: string;
  readonly finalDestinyIds: readonly Id[];
  readonly reason: string;
}

export interface NinePalaceTelemetryDebugSample {
  readonly seed: string;
  readonly draftId: string;
  readonly rerollIndex: number;
  readonly attributes: NinePalaceEvaluation["attributes"];
  readonly threePowers: NinePalaceEvaluation["threePowers"];
  readonly derivedScores: NinePalaceEvaluation["derived"];
  readonly finalDestinyIds: readonly Id[];
  readonly eligibilityExplanations: readonly string[];
  readonly mutationReasons: readonly string[];
  readonly conflictSynergy: {
    readonly warnings: readonly string[];
    readonly synergyTags: readonly string[];
  };
}

export interface NinePalaceDistributionTelemetryReport {
  readonly version: string;
  readonly sampleCount: number;
  readonly seedPrefix: string;
  readonly targetSamples: {
    readonly heavenJealousTalent: NinePalaceTargetSampleStats;
    readonly wasteRootReversal: NinePalaceTargetSampleStats;
    readonly cowardlySupreme: NinePalaceTargetSampleStats;
  };
  readonly mutationAppearance: NinePalaceDistributionBucket;
  readonly mutationCountsById: Readonly<Record<string, NinePalaceDistributionBucket>>;
  readonly antiWeirdnessViolationCount: number;
  readonly antiWeirdnessViolations: readonly NinePalaceAntiWeirdnessViolation[];
  readonly debugSamples: readonly NinePalaceTelemetryDebugSample[];
}

export interface BuildNinePalaceDistributionTelemetryOptions {
  readonly sampleCount?: number;
  readonly seedPrefix?: string;
  readonly debugSampleCount?: number;
  readonly openingGenerator?: OpeningGenerator;
  readonly destinyRoller?: DestinyRoller;
  readonly destinyRegistry?: DestinyV2Registry;
}

interface MutableNumericAccumulator {
  count: number;
  min: number;
  max: number;
  sum: number;
}

interface MutableTargetStats {
  sampleCount: number;
  finalCount: number;
  talentScore: MutableNumericAccumulator;
  rootBone: MutableNumericAccumulator;
  heart: MutableNumericAccumulator;
  lifespan: MutableNumericAccumulator;
}

interface TargetEvaluationSet {
  readonly heavenJealousTalent: DestinyEligibilityResult;
  readonly wasteRootReversal: DestinyEligibilityResult;
  readonly cowardlySupreme: DestinyEligibilityResult;
}

export function buildNinePalaceDistributionTelemetry(
  options: BuildNinePalaceDistributionTelemetryOptions = {}
): NinePalaceDistributionTelemetryReport {
  const sampleCount = options.sampleCount ?? DEFAULT_SAMPLE_COUNT;
  const seedPrefix = options.seedPrefix ?? DEFAULT_SEED_PREFIX;
  const debugSampleCount = options.debugSampleCount ?? DEFAULT_DEBUG_SAMPLE_COUNT;
  validateOptions(sampleCount, debugSampleCount);

  const registry = options.destinyRegistry ?? loadDestinyV2Registry();
  const openingGenerator = options.openingGenerator ?? new DefaultOpeningGenerator();
  const destinyRoller = options.destinyRoller ?? new OpeningDestinyV2Roller(registry);
  const targets = createMutableTargetStats();
  const mutationCounts: Record<string, number> = {};
  const debugSamples: NinePalaceTelemetryDebugSample[] = [];
  const antiWeirdnessViolations: NinePalaceAntiWeirdnessViolation[] = [];
  let antiWeirdnessViolationCount = 0;
  let mutationDraftCount = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const seed = `${seedPrefix}-${index}`;
    const draftId = `${toDraftId(seedPrefix)}_${index}`;
    const opening = openingGenerator.generate({ seed, draftId, rerollIndex: index });
    const destinyDraft = destinyRoller.generate({
      seed: `${seed}:destiny`,
      draftId,
      rerollIndex: index,
      openingInnateDraft: opening
    });
    const evaluation = opening.ninePalaceEvaluation;
    const finalDestinyIds = getFinalDestinyIds(destinyDraft);
    const targetEvaluations = evaluateTargets(evaluation, registry);

    recordTargetSamples(targets, evaluation, finalDestinyIds, targetEvaluations);

    const finalMutatedIds = uniqueStable(finalDestinyIds.filter((id) => registry.getDestiny(id).kind === "mutated"));
    if (finalMutatedIds.length > 0) {
      mutationDraftCount += 1;
    }
    for (const id of finalMutatedIds) {
      increment(mutationCounts, id);
    }

    const violations = collectAntiWeirdnessViolations({
      seed,
      draftId,
      finalDestinyIds,
      evaluation,
      registry
    });
    antiWeirdnessViolationCount += violations.length;
    if (antiWeirdnessViolations.length < 16) {
      antiWeirdnessViolations.push(...violations.slice(0, 16 - antiWeirdnessViolations.length));
    }

    if (debugSamples.length < debugSampleCount) {
      debugSamples.push(toDebugSample(seed, draftId, index, evaluation, destinyDraft));
    }
  }

  return deepFreeze({
    version: REPORT_VERSION,
    sampleCount,
    seedPrefix,
    targetSamples: finalizeTargetStats(targets),
    mutationAppearance: toBucket(mutationDraftCount, sampleCount),
    mutationCountsById: toDistribution(mutationCounts, sampleCount),
    antiWeirdnessViolationCount,
    antiWeirdnessViolations,
    debugSamples
  });
}

export function formatNinePalaceDistributionReport(report: NinePalaceDistributionTelemetryReport): string {
  const target = report.targetSamples;
  return [
    "# Nine Palace Fate Matrix Distribution Report",
    "",
    `sampleCount: ${report.sampleCount}`,
    `seedPrefix: ${report.seedPrefix}`,
    "",
    "## Target Samples",
    formatTargetLine(
      "Heaven-Jealous Talent talentScore",
      target.heavenJealousTalent.sampleCount,
      target.heavenJealousTalent.finalCount,
      target.heavenJealousTalent.talentScore
    ),
    formatTargetLine(
      "Waste-Root Reversal rootBone/heart",
      target.wasteRootReversal.sampleCount,
      target.wasteRootReversal.finalCount,
      target.wasteRootReversal.rootBone,
      target.wasteRootReversal.heart
    ),
    formatTargetLine(
      "Cowardly Supreme heart/lifespan",
      target.cowardlySupreme.sampleCount,
      target.cowardlySupreme.finalCount,
      target.cowardlySupreme.heart,
      target.cowardlySupreme.lifespan
    ),
    "",
    "## Mutation Destiny Appearance Rate",
    `draftsWithMutation: ${report.mutationAppearance.count} (${formatRate(report.mutationAppearance.rate)})`,
    ...Object.entries(report.mutationCountsById)
      .sort((first, second) => second[1].count - first[1].count || first[0].localeCompare(second[0]))
      .map(([id, bucket]) => `- ${id}: ${bucket.count} (${formatRate(bucket.rate)})`),
    "",
    "## Anti-Weirdness Violations",
    `violationCount: ${report.antiWeirdnessViolationCount}`,
    ...(report.antiWeirdnessViolations.length === 0
      ? ["none"]
      : report.antiWeirdnessViolations.map((violation) => `- ${violation.code}: ${violation.seed} ${violation.reason}`)),
    "",
    "## Debug Samples",
    ...report.debugSamples.map((sample) => (
      `- ${sample.seed}: ${sample.finalDestinyIds.join(", ")} | derived=${formatDerived(sample.derivedScores)}`
    ))
  ].join("\n");
}

function evaluateTargets(evaluation: NinePalaceEvaluation, registry: DestinyV2Registry): TargetEvaluationSet {
  const input = buildDestinyEligibilityInputFromNinePalace(evaluation, { destinyRegistry: registry });
  return {
    heavenJealousTalent: evaluateDestinyEligibility(input, registry.getDestiny(TARGET_IDS.heavenJealousTalent)),
    wasteRootReversal: evaluateDestinyEligibility(input, registry.getDestiny(TARGET_IDS.wasteRootReversal)),
    cowardlySupreme: evaluateDestinyEligibility(input, registry.getDestiny(TARGET_IDS.cowardlySupreme))
  };
}

function recordTargetSamples(
  targets: {
    readonly heavenJealousTalent: MutableTargetStats;
    readonly wasteRootReversal: MutableTargetStats;
    readonly cowardlySupreme: MutableTargetStats;
  },
  evaluation: NinePalaceEvaluation,
  finalDestinyIds: readonly Id[],
  targetEvaluations: TargetEvaluationSet
): void {
  if (shouldRecordTarget(TARGET_IDS.heavenJealousTalent, finalDestinyIds, targetEvaluations.heavenJealousTalent)) {
    targets.heavenJealousTalent.sampleCount += 1;
    recordNumeric(targets.heavenJealousTalent.talentScore, evaluation.derived.talentScore);
  }
  if (finalDestinyIds.includes(TARGET_IDS.heavenJealousTalent)) {
    targets.heavenJealousTalent.finalCount += 1;
  }

  if (shouldRecordTarget(TARGET_IDS.wasteRootReversal, finalDestinyIds, targetEvaluations.wasteRootReversal)) {
    targets.wasteRootReversal.sampleCount += 1;
    recordNumeric(targets.wasteRootReversal.rootBone, evaluation.attributes.rootBone);
    recordNumeric(targets.wasteRootReversal.heart, evaluation.attributes.heart);
  }
  if (finalDestinyIds.includes(TARGET_IDS.wasteRootReversal)) {
    targets.wasteRootReversal.finalCount += 1;
  }

  if (shouldRecordTarget(TARGET_IDS.cowardlySupreme, finalDestinyIds, targetEvaluations.cowardlySupreme)) {
    targets.cowardlySupreme.sampleCount += 1;
    recordNumeric(targets.cowardlySupreme.heart, evaluation.attributes.heart);
    recordNumeric(targets.cowardlySupreme.lifespan, evaluation.attributes.lifespan);
  }
  if (finalDestinyIds.includes(TARGET_IDS.cowardlySupreme)) {
    targets.cowardlySupreme.finalCount += 1;
  }
}

function shouldRecordTarget(
  targetId: Id,
  finalDestinyIds: readonly Id[],
  result: DestinyEligibilityResult
): boolean {
  return finalDestinyIds.includes(targetId) ||
    result.eligible ||
    result.antiMatched.length > 0 ||
    result.mutationCandidate !== undefined;
}

function collectAntiWeirdnessViolations(options: {
  readonly seed: string;
  readonly draftId: string;
  readonly finalDestinyIds: readonly Id[];
  readonly evaluation: NinePalaceEvaluation;
  readonly registry: DestinyV2Registry;
}): NinePalaceAntiWeirdnessViolation[] {
  const issues: NinePalaceAntiWeirdnessViolation[] = [];
  const input = buildDestinyEligibilityInputFromNinePalace(options.evaluation, {
    destinyRegistry: options.registry,
    selectedDestinyIds: options.finalDestinyIds
  });

  for (const [code, id] of Object.entries(TARGET_IDS)) {
    if (!options.finalDestinyIds.includes(id)) {
      continue;
    }
    const result = evaluateDestinyEligibility(input, options.registry.getDestiny(id));
    if (!result.eligible || result.antiMatched.length > 0) {
      issues.push({
        seed: options.seed,
        draftId: options.draftId,
        code: `${code}:illegal_original_retained`,
        finalDestinyIds: [...options.finalDestinyIds],
        reason: `eligible=${String(result.eligible)} anti=${result.antiMatched.length}`
      });
    }
  }

  if (
    options.finalDestinyIds.includes("destiny_demon_seed") &&
    options.finalDestinyIds.includes("destiny_clear_glass_heart")
  ) {
    issues.push({
      seed: options.seed,
      draftId: options.draftId,
      code: "demon_seed_clear_glass:unresolved_hard_conflict",
      finalDestinyIds: [...options.finalDestinyIds],
      reason: "hard conflict pair remained instead of converging to destiny_pure_lotus_shadow"
    });
  }

  return issues;
}

function toDebugSample(
  seed: string,
  draftId: string,
  rerollIndex: number,
  evaluation: NinePalaceEvaluation,
  destinyDraft: DestinyRollDraft
): NinePalaceTelemetryDebugSample {
  const debug = destinyDraft.debug.ninePalace;
  return {
    seed,
    draftId,
    rerollIndex,
    attributes: cloneJson(evaluation.attributes),
    threePowers: cloneJson(evaluation.threePowers),
    derivedScores: cloneJson(evaluation.derived),
    finalDestinyIds: getFinalDestinyIds(destinyDraft),
    eligibilityExplanations: debug?.eligibilityResults.flatMap((result) => [
      `${result.destinyId}:eligible:${String(result.eligible)}`,
      `${result.destinyId}:support:${result.supportLevel}`,
      ...result.reasonTags
    ]) ?? [],
    mutationReasons: debug?.mutationResults.flatMap((result) => [
      `${result.originalDestinyId}:${result.action}:${result.reason}`,
      ...result.debugTags
    ]) ?? [],
    conflictSynergy: {
      warnings: debug?.conflictSynergyResult.warnings ?? [],
      synergyTags: debug?.conflictSynergyResult.synergyTags ?? []
    }
  };
}

function getFinalDestinyIds(draft: DestinyRollDraft): readonly Id[] {
  return [
    draft.destinies.main.id,
    draft.destinies.secondary[0].id,
    draft.destinies.secondary[1].id,
    draft.destinies.flaw.id
  ];
}

function createMutableTargetStats(): {
  readonly heavenJealousTalent: MutableTargetStats;
  readonly wasteRootReversal: MutableTargetStats;
  readonly cowardlySupreme: MutableTargetStats;
} {
  return {
    heavenJealousTalent: createMutableTargetStat(),
    wasteRootReversal: createMutableTargetStat(),
    cowardlySupreme: createMutableTargetStat()
  };
}

function createMutableTargetStat(): MutableTargetStats {
  return {
    sampleCount: 0,
    finalCount: 0,
    talentScore: createNumericAccumulator(),
    rootBone: createNumericAccumulator(),
    heart: createNumericAccumulator(),
    lifespan: createNumericAccumulator()
  };
}

function createNumericAccumulator(): MutableNumericAccumulator {
  return {
    count: 0,
    min: Number.POSITIVE_INFINITY,
    max: Number.NEGATIVE_INFINITY,
    sum: 0
  };
}

function recordNumeric(accumulator: MutableNumericAccumulator, value: number): void {
  accumulator.count += 1;
  accumulator.min = Math.min(accumulator.min, value);
  accumulator.max = Math.max(accumulator.max, value);
  accumulator.sum += value;
}

function finalizeTargetStats(targets: {
  readonly heavenJealousTalent: MutableTargetStats;
  readonly wasteRootReversal: MutableTargetStats;
  readonly cowardlySupreme: MutableTargetStats;
}): NinePalaceDistributionTelemetryReport["targetSamples"] {
  return {
    heavenJealousTalent: {
      sampleCount: targets.heavenJealousTalent.sampleCount,
      finalCount: targets.heavenJealousTalent.finalCount,
      talentScore: finalizeNumeric(targets.heavenJealousTalent.talentScore)
    },
    wasteRootReversal: {
      sampleCount: targets.wasteRootReversal.sampleCount,
      finalCount: targets.wasteRootReversal.finalCount,
      rootBone: finalizeNumeric(targets.wasteRootReversal.rootBone),
      heart: finalizeNumeric(targets.wasteRootReversal.heart)
    },
    cowardlySupreme: {
      sampleCount: targets.cowardlySupreme.sampleCount,
      finalCount: targets.cowardlySupreme.finalCount,
      heart: finalizeNumeric(targets.cowardlySupreme.heart),
      lifespan: finalizeNumeric(targets.cowardlySupreme.lifespan)
    }
  };
}

function finalizeNumeric(accumulator: MutableNumericAccumulator): NinePalaceNumericDistribution {
  if (accumulator.count === 0) {
    return { count: 0, min: 0, max: 0, mean: 0 };
  }
  return {
    count: accumulator.count,
    min: accumulator.min,
    max: accumulator.max,
    mean: round(accumulator.sum / accumulator.count)
  };
}

function toDistribution(counts: Readonly<Record<string, number>>, denominator: number): Readonly<Record<string, NinePalaceDistributionBucket>> {
  return Object.fromEntries(
    Object.entries(counts)
      .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))
      .map(([id, count]) => [id, toBucket(count, denominator)])
  );
}

function toBucket(count: number, denominator: number): NinePalaceDistributionBucket {
  return {
    count,
    rate: denominator === 0 ? 0 : round(count / denominator)
  };
}

function increment(counts: Record<string, number>, id: string): void {
  counts[id] = (counts[id] ?? 0) + 1;
}

function formatTargetLine(
  label: string,
  sampleCount: number,
  finalCount: number,
  first: NinePalaceNumericDistribution | undefined,
  second?: NinePalaceNumericDistribution
): string {
  const stats = [first, second]
    .filter((item): item is NinePalaceNumericDistribution => item !== undefined)
    .map((item) => `count=${item.count} min=${item.min} max=${item.max} mean=${item.mean}`)
    .join(" | ");
  return `- ${label}: samples=${sampleCount} final=${finalCount}${stats.length === 0 ? "" : ` | ${stats}`}`;
}

function formatDerived(derived: NinePalaceEvaluation["derived"]): string {
  return [
    `talent=${derived.talentScore}`,
    `vessel=${derived.vesselScore}`,
    `stability=${derived.stabilityScore}`,
    `pressure=${derived.destinyPressureScore}`,
    `lateBloom=${derived.lateBloomScore}`,
    `rebellion=${derived.rebellionScore}`
  ].join(" ");
}

function formatRate(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function uniqueStable<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function toDraftId(seedPrefix: string): string {
  const normalized = seedPrefix.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
  return normalized.length === 0 ? "npf_c006" : normalized;
}

function validateOptions(sampleCount: number, debugSampleCount: number): void {
  if (!Number.isInteger(sampleCount) || sampleCount <= 0) {
    throw new Error("Nine palace telemetry sampleCount must be a positive integer");
  }
  if (!Number.isInteger(debugSampleCount) || debugSampleCount < 0) {
    throw new Error("Nine palace telemetry debugSampleCount must be a non-negative integer");
  }
  if (debugSampleCount > sampleCount) {
    throw new Error("Nine palace telemetry debugSampleCount must not exceed sampleCount");
  }
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
