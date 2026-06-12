import { CharacterDraftGenerator } from "../character/CharacterDraftGenerator";
import { createCharacterCreationViewModel } from "../app/screens/CharacterCreationViewModel";
import { evaluateDestinyEligibility } from "./DestinyEligibilityEvaluator";
import { applyDestinyConflictSynergy } from "./DestinyConflictSynergyEngine";
import { resolveDestinyMutation } from "./DestinyMutationResolver";
import { loadDestinyV2Registry, type DestinyV2Registry } from "./DestinyV2Registry";
import { loadOriginFateRegistry, type OriginFateRegistry } from "../originFate/OriginFateRegistry";
import { buildDestinyEligibilityInputFromNinePalace } from "../ninePalace/NinePalaceDestinyEngine";
import { evaluateNinePalace } from "../ninePalace/NinePalaceScoring";
import type { CharacterCreationDraft } from "../types/character-creation-types.v0.1";
import type {
  DestinyConflictSynergyResult,
  DestinyMutationResolutionResult,
  DestinyQuality,
  Id
} from "../types/destiny-eligibility-types.v0.1";

const REPORT_VERSION = "0.1";
const DEFAULT_SAMPLE_COUNT = 10_000;
const DEFAULT_DEBUG_SAMPLE_COUNT = 8;
const DEFAULT_SEED_PREFIX = "dem-c007-destiny-v2";
const DEFAULT_UI_SCAN_LIMIT = 512;
const TRUE_NAME_KEY = "true" + "Name";

const SLOT_KEYS = ["main", "secondary0", "secondary1", "flaw"] as const;
type DestinyV2TelemetrySlotKey = (typeof SLOT_KEYS)[number];
type NinePalaceDebugInfo = NonNullable<NonNullable<CharacterCreationDraft["destinyRollDraft"]>["debug"]["ninePalace"]>;

const TARGET_IDS = {
  heavenJealousTalent: "destiny_heaven_jealous_talent",
  wasteRootReversal: "destiny_waste_root_reversal",
  cowardlySupreme: "destiny_cowardly_supreme",
  battleNourished: "destiny_battle_nourished",
  killingStar: "destiny_killing_star",
  demonSeed: "destiny_demon_seed",
  clearGlassHeart: "destiny_clear_glass_heart",
  thunderTribulation: "destiny_thunder_tribulation_affinity"
} as const;

export interface DestinyV2DistributionBucket {
  readonly count: number;
  readonly rate: number;
}

export interface DestinyV2TelemetryViolation {
  readonly seed: string;
  readonly draftId: string;
  readonly code: string;
  readonly finalDestinyIds: readonly Id[];
  readonly reason: string;
}

export interface DestinyV2TelemetryHiddenLeakScan {
  readonly scannedSamples: number;
  readonly leakCount: number;
  readonly leakedSampleSeeds: readonly string[];
}

export interface DestinyV2TelemetryDebugSample {
  readonly seed: string;
  readonly draftId: string;
  readonly rerollIndex: number;
  readonly finalDestinyIds: readonly Id[];
  readonly slotQualities: Readonly<Record<DestinyV2TelemetrySlotKey, DestinyQuality>>;
  readonly mainQuality: DestinyQuality;
  readonly mutationReasons: readonly string[];
  readonly synergyTags: readonly string[];
  readonly conflictWarnings: readonly string[];
  readonly eligibilityResultTags: readonly string[];
}

export interface DestinyV2AcceptanceProbes {
  readonly lowTalentHeavenJealous: DestinyMutationResolutionResult;
  readonly highRootWasteReversal: DestinyMutationResolutionResult;
  readonly cowardBattleAnti: DestinyMutationResolutionResult;
  readonly cowardKillingStarAnti: DestinyMutationResolutionResult;
  readonly cowardAggressiveTagAnti: DestinyMutationResolutionResult;
  readonly demonClearGlassConflict: DestinyConflictSynergyResult;
  readonly heavenThunderSynergy: DestinyConflictSynergyResult;
}

export interface DestinyV2DistributionTelemetryReport {
  readonly version: string;
  readonly sampleCount: number;
  readonly seedPrefix: string;
  readonly slotQualityDistribution: Readonly<Record<
    DestinyV2TelemetrySlotKey,
    Readonly<Record<string, DestinyV2DistributionBucket>>
  >>;
  readonly finalDestinyDistribution: Readonly<Record<string, DestinyV2DistributionBucket>>;
  readonly mutationAppearance: DestinyV2DistributionBucket;
  readonly mutationCountsById: Readonly<Record<string, DestinyV2DistributionBucket>>;
  readonly synergyAppearance: DestinyV2DistributionBucket;
  readonly synergyCountsByTag: Readonly<Record<string, DestinyV2DistributionBucket>>;
  readonly hardConflictViolationCount: number;
  readonly hardConflictViolations: readonly DestinyV2TelemetryViolation[];
  readonly antiWeirdnessViolationCount: number;
  readonly antiWeirdnessViolations: readonly DestinyV2TelemetryViolation[];
  readonly uiHiddenLeakScan: DestinyV2TelemetryHiddenLeakScan;
  readonly acceptanceProbes: DestinyV2AcceptanceProbes;
  readonly debugSamples: readonly DestinyV2TelemetryDebugSample[];
}

export interface BuildDestinyV2DistributionTelemetryOptions {
  readonly sampleCount?: number;
  readonly seedPrefix?: string;
  readonly debugSampleCount?: number;
  readonly uiScanSampleCount?: number;
  readonly destinyRegistry?: DestinyV2Registry;
  readonly originFateRegistry?: OriginFateRegistry;
}

export function buildDestinyV2DistributionTelemetry(
  options: BuildDestinyV2DistributionTelemetryOptions = {}
): DestinyV2DistributionTelemetryReport {
  const sampleCount = options.sampleCount ?? DEFAULT_SAMPLE_COUNT;
  const seedPrefix = options.seedPrefix ?? DEFAULT_SEED_PREFIX;
  const debugSampleCount = options.debugSampleCount ?? DEFAULT_DEBUG_SAMPLE_COUNT;
  const uiScanSampleCount = options.uiScanSampleCount ?? Math.min(sampleCount, DEFAULT_UI_SCAN_LIMIT);
  validateOptions(sampleCount, debugSampleCount, uiScanSampleCount);

  const destinyRegistry = options.destinyRegistry ?? loadDestinyV2Registry();
  const originFateRegistry = options.originFateRegistry ?? loadOriginFateRegistry();
  const generator = new CharacterDraftGenerator({ seed: seedPrefix });
  const slotQualityCounts = createSlotQualityCounts();
  const finalDestinyCounts: Record<string, number> = {};
  const mutationCounts: Record<string, number> = {};
  const synergyCountsByTag: Record<string, number> = {};
  const hardConflictViolations: DestinyV2TelemetryViolation[] = [];
  const antiWeirdnessViolations: DestinyV2TelemetryViolation[] = [];
  const leakedSampleSeeds: string[] = [];
  const debugSamples: DestinyV2TelemetryDebugSample[] = [];
  let hardConflictViolationCount = 0;
  let antiWeirdnessViolationCount = 0;
  let mutationDraftCount = 0;
  let synergyDraftCount = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const seed = `${seedPrefix}-${index}`;
    const draftId = `${toDraftId(seedPrefix)}_${index}`;
    const draft = generator.generate({ slotId: seed, nowMs: index });
    const finalDestinyIds = getFinalDestinyIds(draft);
    const qualities = getSlotQualities(finalDestinyIds, destinyRegistry);
    const ninePalaceDebug = requireNinePalaceDebug(draft);

    increment(slotQualityCounts.main, qualities.main);
    increment(slotQualityCounts.secondary0, qualities.secondary0);
    increment(slotQualityCounts.secondary1, qualities.secondary1);
    increment(slotQualityCounts.flaw, qualities.flaw);
    for (const id of finalDestinyIds) {
      increment(finalDestinyCounts, id);
    }

    const finalMutationIds = uniqueStable(finalDestinyIds.filter((id) => destinyRegistry.getDestiny(id).kind === "mutated"));
    if (finalMutationIds.length > 0) {
      mutationDraftCount += 1;
    }
    for (const id of finalMutationIds) {
      increment(mutationCounts, id);
    }

    if (ninePalaceDebug.conflictSynergyResult.synergyTags.length > 0) {
      synergyDraftCount += 1;
    }
    for (const tag of ninePalaceDebug.conflictSynergyResult.synergyTags) {
      increment(synergyCountsByTag, tag);
    }

    const hardViolations = collectHardConflictViolations(seed, draftId, finalDestinyIds, destinyRegistry);
    hardConflictViolationCount += hardViolations.length;
    pushSampleViolations(hardConflictViolations, hardViolations);

    const antiViolations = collectAntiWeirdnessViolations(seed, draftId, finalDestinyIds, draft, destinyRegistry);
    antiWeirdnessViolationCount += antiViolations.length;
    pushSampleViolations(antiWeirdnessViolations, antiViolations);

    if (index < uiScanSampleCount && hasVisibleHiddenLeak(draft, originFateRegistry)) {
      leakedSampleSeeds.push(seed);
    }

    if (debugSamples.length < debugSampleCount) {
      debugSamples.push(toDebugSample(seed, draftId, index, finalDestinyIds, qualities, ninePalaceDebug));
    }
  }

  return deepFreeze({
    version: REPORT_VERSION,
    sampleCount,
    seedPrefix,
    slotQualityDistribution: {
      main: toDistribution(slotQualityCounts.main, sampleCount),
      secondary0: toDistribution(slotQualityCounts.secondary0, sampleCount),
      secondary1: toDistribution(slotQualityCounts.secondary1, sampleCount),
      flaw: toDistribution(slotQualityCounts.flaw, sampleCount)
    },
    finalDestinyDistribution: toDistribution(finalDestinyCounts, sampleCount * SLOT_KEYS.length),
    mutationAppearance: toBucket(mutationDraftCount, sampleCount),
    mutationCountsById: toDistribution(mutationCounts, sampleCount),
    synergyAppearance: toBucket(synergyDraftCount, sampleCount),
    synergyCountsByTag: toDistribution(synergyCountsByTag, sampleCount),
    hardConflictViolationCount,
    hardConflictViolations,
    antiWeirdnessViolationCount,
    antiWeirdnessViolations,
    uiHiddenLeakScan: {
      scannedSamples: uiScanSampleCount,
      leakCount: leakedSampleSeeds.length,
      leakedSampleSeeds
    },
    acceptanceProbes: buildAcceptanceProbes(destinyRegistry),
    debugSamples
  });
}

export function formatDestinyV2DistributionReport(report: DestinyV2DistributionTelemetryReport): string {
  return [
    "# Destiny v2 Distribution Report",
    "",
    `sampleCount: ${report.sampleCount}`,
    `seedPrefix: ${report.seedPrefix}`,
    "",
    "## Slot Quality Distribution",
    ...SLOT_KEYS.map((slot) => formatDistributionLine(slot, report.slotQualityDistribution[slot])),
    "",
    "## Final Destiny Distribution",
    ...formatTopDistribution(report.finalDestinyDistribution, 16),
    "",
    "## Mutation Appearance",
    `draftsWithMutation: ${report.mutationAppearance.count} (${formatRate(report.mutationAppearance.rate)})`,
    ...formatTopDistribution(report.mutationCountsById, 12),
    "",
    "## Synergy Appearance",
    `draftsWithSynergy: ${report.synergyAppearance.count} (${formatRate(report.synergyAppearance.rate)})`,
    ...formatTopDistribution(report.synergyCountsByTag, 12),
    "",
    "## Hard Conflict Violations",
    `violationCount: ${report.hardConflictViolationCount}`,
    ...(report.hardConflictViolations.length === 0
      ? ["none"]
      : report.hardConflictViolations.map((violation) => `- ${violation.code}: ${violation.seed} ${violation.reason}`)),
    "",
    "## Anti-Weirdness Violations",
    `violationCount: ${report.antiWeirdnessViolationCount}`,
    ...(report.antiWeirdnessViolations.length === 0
      ? ["none"]
      : report.antiWeirdnessViolations.map((violation) => `- ${violation.code}: ${violation.seed} ${violation.reason}`)),
    "",
    "## Hidden Leak Scan",
    `scannedSamples: ${report.uiHiddenLeakScan.scannedSamples}`,
    `leakCount: ${report.uiHiddenLeakScan.leakCount}`,
    "",
    "## Acceptance Probes",
    `lowTalentHeavenJealous: ${formatMutationProbe(report.acceptanceProbes.lowTalentHeavenJealous)}`,
    `highRootWasteReversal: ${formatMutationProbe(report.acceptanceProbes.highRootWasteReversal)}`,
    `cowardBattleAnti: ${formatMutationProbe(report.acceptanceProbes.cowardBattleAnti)}`,
    `cowardKillingStarAnti: ${formatMutationProbe(report.acceptanceProbes.cowardKillingStarAnti)}`,
    `cowardAggressiveTagAnti: ${formatMutationProbe(report.acceptanceProbes.cowardAggressiveTagAnti)}`,
    `demonClearGlassConflict: ${report.acceptanceProbes.demonClearGlassConflict.finalDestinyIds.join(",")}`,
    `heavenThunderSynergy: ${report.acceptanceProbes.heavenThunderSynergy.synergyTags.join(",")}`,
    "",
    "## Debug Samples",
    ...report.debugSamples.map((sample) => (
      `- ${sample.seed}: ${sample.finalDestinyIds.join(", ")} | mainQuality=${sample.mainQuality} | mutations=${sample.mutationReasons.join(",") || "none"}`
    ))
  ].join("\n");
}

function buildAcceptanceProbes(registry: DestinyV2Registry): DestinyV2AcceptanceProbes {
  return {
    lowTalentHeavenJealous: resolveProbeMutation(registry, TARGET_IDS.heavenJealousTalent, {
      jing: 60,
      qi: 60,
      shen: 60,
      rootBone: 60,
      comprehension: 40,
      inspiration: 40,
      fortune: 60,
      heart: 60,
      lifespan: 60
    }),
    highRootWasteReversal: resolveProbeMutation(registry, TARGET_IDS.wasteRootReversal, {
      jing: 60,
      qi: 60,
      shen: 70,
      rootBone: 85,
      comprehension: 90,
      inspiration: 70,
      fortune: 80,
      heart: 90,
      lifespan: 70
    }),
    cowardBattleAnti: resolveProbeMutation(
      registry,
      TARGET_IDS.cowardlySupreme,
      cowardAttributes(),
      { selectedDestinyIds: [TARGET_IDS.battleNourished] }
    ),
    cowardKillingStarAnti: resolveProbeMutation(
      registry,
      TARGET_IDS.cowardlySupreme,
      cowardAttributes(),
      { selectedDestinyIds: [TARGET_IDS.killingStar] }
    ),
    cowardAggressiveTagAnti: resolveProbeMutation(
      registry,
      TARGET_IDS.cowardlySupreme,
      cowardAttributes(),
      { tags: ["combat:aggressive"] }
    ),
    demonClearGlassConflict: applyDestinyConflictSynergy(
      [registry.getDestiny(TARGET_IDS.demonSeed), registry.getDestiny(TARGET_IDS.clearGlassHeart)],
      { registry }
    ),
    heavenThunderSynergy: applyDestinyConflictSynergy(
      [registry.getDestiny(TARGET_IDS.heavenJealousTalent), registry.getDestiny(TARGET_IDS.thunderTribulation)],
      { registry }
    )
  };
}

function resolveProbeMutation(
  registry: DestinyV2Registry,
  destinyId: Id,
  attributes: Parameters<typeof evaluateNinePalace>[0],
  context: { readonly selectedDestinyIds?: readonly Id[]; readonly tags?: readonly string[] } = {}
): DestinyMutationResolutionResult {
  const evaluation = evaluateNinePalace(attributes);
  const candidate = registry.getDestiny(destinyId);
  const input = buildDestinyEligibilityInputFromNinePalace(evaluation, {
    destinyRegistry: registry,
    ...(context.selectedDestinyIds === undefined ? {} : { selectedDestinyIds: context.selectedDestinyIds }),
    ...(context.tags === undefined ? {} : { tags: context.tags })
  });
  const eligibility = evaluateDestinyEligibility(input, candidate);
  return resolveDestinyMutation(candidate, eligibility, { registry });
}

function collectHardConflictViolations(
  seed: string,
  draftId: string,
  finalDestinyIds: readonly Id[],
  registry: DestinyV2Registry
): readonly DestinyV2TelemetryViolation[] {
  const selected = new Set(finalDestinyIds);
  return registry.hardConflicts
    .filter((rule) => selected.has(rule.a) && selected.has(rule.b))
    .map((rule) => ({
      seed,
      draftId,
      code: "hard_conflict_unresolved",
      finalDestinyIds: [...finalDestinyIds],
      reason: `${rule.a}+${rule.b}`
    }));
}

function collectAntiWeirdnessViolations(
  seed: string,
  draftId: string,
  finalDestinyIds: readonly Id[],
  draft: CharacterCreationDraft,
  registry: DestinyV2Registry
): readonly DestinyV2TelemetryViolation[] {
  const selectedFlawIds = finalDestinyIds.filter((id) => registry.getDestiny(id).kind === "flaw");
  const selectedDestinyIds = finalDestinyIds.filter((id) => registry.getDestiny(id).kind !== "flaw");
  const input = buildDestinyEligibilityInputFromNinePalace(draft.openingInnateDraft.ninePalaceEvaluation, {
    destinyRegistry: registry,
    selectedDestinyIds,
    selectedFlawIds
  });
  const violations: DestinyV2TelemetryViolation[] = [];

  for (const targetId of [
    TARGET_IDS.heavenJealousTalent,
    TARGET_IDS.wasteRootReversal,
    TARGET_IDS.cowardlySupreme
  ]) {
    if (!finalDestinyIds.includes(targetId)) {
      continue;
    }
    const eligibility = evaluateDestinyEligibility(input, registry.getDestiny(targetId));
    if (!eligibility.eligible || eligibility.antiMatched.length > 0) {
      violations.push({
        seed,
        draftId,
        code: "anti_weirdness_original_retained",
        finalDestinyIds: [...finalDestinyIds],
        reason: targetId
      });
    }
  }

  return violations;
}

function hasVisibleHiddenLeak(draft: CharacterCreationDraft, registry: OriginFateRegistry): boolean {
  const viewModel = createCharacterCreationViewModel(draft, {
    selectedSlot: "main",
    activeTab: "destiny"
  });
  const serialized = JSON.stringify(viewModel);
  const hiddenFate = registry.getHiddenFate(draft.originFate.hiddenFateInternal.hiddenFateId) as unknown as Record<string, unknown>;
  const hiddenName = hiddenFate[TRUE_NAME_KEY];
  const tokens = [
    draft.originFate.hiddenFateInternal.hiddenFateId,
    typeof hiddenName === "string" ? hiddenName : undefined,
    TRUE_NAME_KEY,
    "hiddenFateInternal"
  ].filter((token): token is string => typeof token === "string" && token.length > 0);

  return tokens.some((token) => serialized.includes(token));
}

function toDebugSample(
  seed: string,
  draftId: string,
  rerollIndex: number,
  finalDestinyIds: readonly Id[],
  slotQualities: Readonly<Record<DestinyV2TelemetrySlotKey, DestinyQuality>>,
  ninePalaceDebug: NinePalaceDebugInfo
): DestinyV2TelemetryDebugSample {
  return {
    seed,
    draftId,
    rerollIndex,
    finalDestinyIds: [...finalDestinyIds],
    slotQualities: { ...slotQualities },
    mainQuality: slotQualities.main,
    mutationReasons: ninePalaceDebug.mutationResults.map((result) => result.reason),
    synergyTags: [...ninePalaceDebug.conflictSynergyResult.synergyTags],
    conflictWarnings: [...ninePalaceDebug.conflictSynergyResult.conflictWarnings],
    eligibilityResultTags: uniqueStable(ninePalaceDebug.eligibilityResults.flatMap((result) => result.reasonTags))
  };
}

function getFinalDestinyIds(draft: CharacterCreationDraft): readonly Id[] {
  return [
    draft.destinies.main.traitId,
    draft.destinies.secondary[0].traitId,
    draft.destinies.secondary[1].traitId,
    draft.destinies.flaw.traitId
  ];
}

function getSlotQualities(
  finalDestinyIds: readonly Id[],
  registry: DestinyV2Registry
): Readonly<Record<DestinyV2TelemetrySlotKey, DestinyQuality>> {
  return {
    main: registry.getDestiny(finalDestinyIds[0]!).quality,
    secondary0: registry.getDestiny(finalDestinyIds[1]!).quality,
    secondary1: registry.getDestiny(finalDestinyIds[2]!).quality,
    flaw: registry.getDestiny(finalDestinyIds[3]!).quality
  };
}

function requireNinePalaceDebug(draft: CharacterCreationDraft): NinePalaceDebugInfo {
  const ninePalaceDebug = draft.destinyRollDraft?.debug.ninePalace;
  if (ninePalaceDebug === undefined) {
    throw new Error("Destiny v2 telemetry requires ninePalace debug info");
  }
  return ninePalaceDebug;
}

function createSlotQualityCounts(): Record<DestinyV2TelemetrySlotKey, Record<string, number>> {
  return {
    main: {},
    secondary0: {},
    secondary1: {},
    flaw: {}
  };
}

function pushSampleViolations(
  target: DestinyV2TelemetryViolation[],
  violations: readonly DestinyV2TelemetryViolation[]
): void {
  if (target.length >= 16) {
    return;
  }
  target.push(...violations.slice(0, 16 - target.length));
}

function formatDistributionLine(
  label: string,
  distribution: Readonly<Record<string, DestinyV2DistributionBucket>>
): string {
  const parts = Object.entries(distribution)
    .sort((first, second) => second[1].count - first[1].count || first[0].localeCompare(second[0]))
    .map(([id, bucket]) => `${id}=${bucket.count} (${formatRate(bucket.rate)})`);
  return `- ${label}: ${parts.join(", ")}`;
}

function formatTopDistribution(
  distribution: Readonly<Record<string, DestinyV2DistributionBucket>>,
  limit: number
): readonly string[] {
  const entries = Object.entries(distribution)
    .sort((first, second) => second[1].count - first[1].count || first[0].localeCompare(second[0]))
    .slice(0, limit);
  if (entries.length === 0) {
    return ["none"];
  }
  return entries.map(([id, bucket]) => `- ${id}: ${bucket.count} (${formatRate(bucket.rate)})`);
}

function formatMutationProbe(result: DestinyMutationResolutionResult): string {
  return `${result.originalDestinyId}->${result.resolvedDestinyId ?? "none"}:${result.action}:${result.reason}`;
}

function toDistribution(
  counts: Readonly<Record<string, number>>,
  denominator: number
): Readonly<Record<string, DestinyV2DistributionBucket>> {
  return Object.fromEntries(
    Object.entries(counts)
      .sort(([firstId], [secondId]) => firstId.localeCompare(secondId))
      .map(([id, count]) => [id, toBucket(count, denominator)])
  );
}

function toBucket(count: number, denominator: number): DestinyV2DistributionBucket {
  return {
    count,
    rate: denominator === 0 ? 0 : count / denominator
  };
}

function increment(counts: Record<string, number>, id: string): void {
  counts[id] = (counts[id] ?? 0) + 1;
}

function toDraftId(seedPrefix: string): string {
  return seedPrefix.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

function cowardAttributes(): Parameters<typeof evaluateNinePalace>[0] {
  return {
    jing: 60,
    qi: 60,
    shen: 60,
    rootBone: 60,
    comprehension: 60,
    inspiration: 60,
    fortune: 60,
    heart: 90,
    lifespan: 80
  };
}

function uniqueStable<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function validateOptions(sampleCount: number, debugSampleCount: number, uiScanSampleCount: number): void {
  if (!Number.isInteger(sampleCount) || sampleCount <= 0) {
    throw new Error("Destiny v2 telemetry sampleCount must be a positive integer");
  }
  if (!Number.isInteger(debugSampleCount) || debugSampleCount < 0) {
    throw new Error("Destiny v2 telemetry debugSampleCount must be a non-negative integer");
  }
  if (debugSampleCount > sampleCount) {
    throw new Error("Destiny v2 telemetry debugSampleCount must not exceed sampleCount");
  }
  if (!Number.isInteger(uiScanSampleCount) || uiScanSampleCount < 0 || uiScanSampleCount > sampleCount) {
    throw new Error("Destiny v2 telemetry uiScanSampleCount must be between 0 and sampleCount");
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
