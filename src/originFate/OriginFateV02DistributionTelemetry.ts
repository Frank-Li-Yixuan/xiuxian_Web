import { CharacterDraftGenerator } from "../character/CharacterDraftGenerator";
import {
  createLifeEventContextFromOriginFateNarrative,
  createMajorChoiceContextFromOriginFateNarrative,
  createOriginFateNarrativeLifeEventSummary
} from "../lifeSimulation/OriginFateNarrativeLifeHooks";
import type { CharacterCreationDraft } from "../types/character-creation-types.v0.1";
import type {
  Age18OriginFateResolutionV02,
  CarriedItemNarrativeStateV02,
  HiddenFateNarrativeStateV02,
  HiddenFateRevealBand,
  Id,
  OriginFatePublicOmenViewV02,
  OriginFateNarrativeStateV02
} from "../types/origin-fate-narrative-types.v0.2";
import {
  buildAge18OriginFateInputV02,
  resolveAge18OriginFateConversionV02
} from "./Age18OriginFateConversionEngineV02";
import {
  loadOriginFateNarrativeRegistry,
  type OriginFateNarrativeRegistry
} from "./OriginFateNarrativeRegistry";
import { generateOriginNarrativeState } from "./OriginNarrativeEngine";
import { buildPublicOmenView } from "./RevealMisdirectionEngine";

const REPORT_VERSION = "0.1";
const DEFAULT_SAMPLE_COUNT = 10_000;
const DEFAULT_DEBUG_SAMPLE_COUNT = 8;
const DEFAULT_SEED_PREFIX = "hfo2-c008-origin-fate-v02";
const DEFAULT_LEAK_SCAN_LIMIT = 512;

type HiddenFateRarity = "minor" | "rare" | "epic" | "legendary" | "forbidden";
type PresetProbeKey = "apothecaryAlchemy" | "fallenSword" | "graveFlute" | "mountainThunder";

const RARITY_KEYS: readonly HiddenFateRarity[] = ["minor", "rare", "epic", "legendary", "forbidden"];
const REVEAL_BAND_KEYS: readonly HiddenFateRevealBand[] = ["seed", "omen", "stirring", "halfReveal", "nearAwake", "awakened"];

const PRESETS: Readonly<Record<PresetProbeKey, {
  readonly label: string;
  readonly originId: Id;
  readonly itemId: Id;
  readonly hiddenFateId: Id;
  readonly itemAffinity: number;
  readonly itemLifecycleStage: CarriedItemNarrativeStateV02["lifecycleStage"];
  readonly expectedTags: readonly string[];
}>> = {
  apothecaryAlchemy: {
    label: "Apothecary furnace and alchemy saint bone",
    originId: "origin_apothecary_apprentice",
    itemId: "item_apothecary_bronze_furnace",
    hiddenFateId: "hidden_alchemy_saint_bone",
    itemAffinity: 88,
    itemLifecycleStage: "resonating",
    expectedTags: ["starter_pill_bundle", "alchemy_fire_control", "broken_alchemy_furnace_bonus"]
  },
  fallenSword: {
    label: "Fallen lineage wooden sword and past-life sword soul",
    originId: "origin_fallen_cultivator_descendant",
    itemId: "item_wooden_sword",
    hiddenFateId: "hidden_past_life_sword_soul",
    itemAffinity: 86,
    itemLifecycleStage: "resonating",
    expectedTags: ["qingshuang_sword_fragment", "sword_soul_echo", "artifact_repair_line", "sword_lineage_hint"]
  },
  graveFlute: {
    label: "Grave keeper black bone flute and taiyin remnant vein",
    originId: "origin_grave_keeper_child",
    itemId: "item_black_bone_flute",
    hiddenFateId: "hidden_taiyin_remnant_vein",
    itemAffinity: 82,
    itemLifecycleStage: "resonating",
    expectedTags: ["hook_bone_flute", "hook_moon_dream", "interlude:interlude_dream_deckbuilder"]
  },
  mountainThunder: {
    label: "Mountain orphan stone talisman and ancient thunder blood",
    originId: "origin_mountain_orphan",
    itemId: "item_childhood_stone_talisman",
    hiddenFateId: "hidden_ancient_thunder_blood",
    itemAffinity: 76,
    itemLifecycleStage: "resonating",
    expectedTags: ["hook_thunderstorm", "hook_bone_heat", "token_bloodline_thunder_stirred"]
  }
};

export interface OriginFateV02DistributionBucket {
  readonly count: number;
  readonly rate: number;
}

export interface OriginFateV02HiddenLeakScan {
  readonly scannedSamples: number;
  readonly leakCount: number;
  readonly leakedSampleSeeds: readonly string[];
}

export interface OriginFateV02DebugSample {
  readonly seed: string;
  readonly draftId: string;
  readonly originId: Id;
  readonly hiddenFateIds: readonly Id[];
  readonly carriedItemIds: readonly Id[];
  readonly revealBands: readonly HiddenFateRevealBand[];
  readonly monthlyLogOmenLineCount: number;
  readonly majorChoiceHintCount: number;
  readonly age18ConvertedItemIds: readonly Id[];
}

export interface OriginFateV02PresetProbe {
  readonly label: string;
  readonly passed: boolean;
  readonly originId: Id;
  readonly hiddenFateId: Id;
  readonly itemId: Id;
  readonly expectedTags: readonly string[];
  readonly matchedTags: readonly string[];
  readonly publicOmenView: OriginFatePublicOmenViewV02;
  readonly monthlyLogPreview: readonly string[];
  readonly majorChoicePreview: {
    readonly hiddenFateHintTags: readonly string[];
    readonly carriedItemTags: readonly string[];
  };
  readonly age18Preview: Age18OriginFateResolutionV02;
  readonly internalTrueNames: readonly string[];
}

export interface OriginFateV02DistributionTelemetryReport {
  readonly version: string;
  readonly sampleCount: number;
  readonly seedPrefix: string;
  readonly hiddenFateRarityDistribution: Readonly<Record<HiddenFateRarity, OriginFateV02DistributionBucket>>;
  readonly hiddenFateDistribution: Readonly<Record<string, OriginFateV02DistributionBucket>>;
  readonly carriedItemDistribution: Readonly<Record<string, OriginFateV02DistributionBucket>>;
  readonly revealBandDistribution: Readonly<Record<HiddenFateRevealBand, OriginFateV02DistributionBucket>>;
  readonly originHiddenSynergyCountsById: Readonly<Record<string, OriginFateV02DistributionBucket>>;
  readonly originItemSynergyCountsById: Readonly<Record<string, OriginFateV02DistributionBucket>>;
  readonly hiddenLeakScan: OriginFateV02HiddenLeakScan;
  readonly presetProbes: Readonly<Record<PresetProbeKey, OriginFateV02PresetProbe>>;
  readonly debugSamples: readonly OriginFateV02DebugSample[];
}

export interface BuildOriginFateV02DistributionTelemetryOptions {
  readonly sampleCount?: number;
  readonly seedPrefix?: string;
  readonly debugSampleCount?: number;
  readonly leakScanSampleCount?: number;
  readonly registry?: OriginFateNarrativeRegistry;
}

export function buildOriginFateV02DistributionTelemetry(
  options: BuildOriginFateV02DistributionTelemetryOptions = {}
): OriginFateV02DistributionTelemetryReport {
  const sampleCount = options.sampleCount ?? DEFAULT_SAMPLE_COUNT;
  const seedPrefix = options.seedPrefix ?? DEFAULT_SEED_PREFIX;
  const debugSampleCount = options.debugSampleCount ?? DEFAULT_DEBUG_SAMPLE_COUNT;
  const leakScanSampleCount = options.leakScanSampleCount ?? Math.min(sampleCount, DEFAULT_LEAK_SCAN_LIMIT);
  validateOptions(sampleCount, debugSampleCount, leakScanSampleCount);

  const registry = options.registry ?? loadOriginFateNarrativeRegistry();
  const generator = new CharacterDraftGenerator({ seed: seedPrefix });
  const hiddenFateRarityCounts = createRarityCounts();
  const hiddenFateCounts: Record<string, number> = {};
  const carriedItemCounts: Record<string, number> = {};
  const revealBandCounts = createRevealBandCounts();
  const originHiddenSynergyCounts: Record<string, number> = {};
  const originItemSynergyCounts: Record<string, number> = {};
  const leakedSampleSeeds: string[] = [];
  const debugSamples: OriginFateV02DebugSample[] = [];

  for (let index = 0; index < sampleCount; index += 1) {
    const seed = `${seedPrefix}-${index}`;
    const draft = generator.generate({ slotId: seed, nowMs: index });
    const narrativeState = requireNarrativeState(draft);
    const hiddenFateIds = narrativeState.hiddenFates.map((hiddenFate) => hiddenFate.hiddenFateId);
    const carriedItemIds = narrativeState.carriedItems.map((item) => item.itemId);

    for (const hiddenFateState of narrativeState.hiddenFates) {
      const hiddenFate = registry.getHiddenFate(hiddenFateState.hiddenFateId);
      increment(hiddenFateRarityCounts, hiddenFate.rarity);
      increment(hiddenFateCounts, hiddenFate.id);
      increment(revealBandCounts, hiddenFateState.revealBand);
    }
    for (const carriedItem of narrativeState.carriedItems) {
      increment(carriedItemCounts, carriedItem.itemId);
    }
    for (const rule of registry.synergyRules) {
      if (rule.originId === narrativeState.origin.originId && hiddenFateIds.includes(rule.hiddenFateId)) {
        increment(originHiddenSynergyCounts, rule.id);
      }
      if (rule.originId === narrativeState.origin.originId && carriedItemIds.includes(rule.itemId)) {
        increment(originItemSynergyCounts, rule.id);
      }
    }

    if (index < leakScanSampleCount && publicSurfaceLeaks(narrativeState, registry)) {
      leakedSampleSeeds.push(seed);
    }

    if (debugSamples.length < debugSampleCount) {
      debugSamples.push(toDebugSample(seed, draft.draftId, narrativeState, registry));
    }
  }

  return deepFreeze({
    version: REPORT_VERSION,
    sampleCount,
    seedPrefix,
    hiddenFateRarityDistribution: toDistribution(hiddenFateRarityCounts, sampleCount),
    hiddenFateDistribution: toDistribution(hiddenFateCounts, sampleCount),
    carriedItemDistribution: toDistribution(carriedItemCounts, sampleCount),
    revealBandDistribution: toDistribution(revealBandCounts, sampleCount),
    originHiddenSynergyCountsById: toDistribution(originHiddenSynergyCounts, sampleCount),
    originItemSynergyCountsById: toDistribution(originItemSynergyCounts, sampleCount),
    hiddenLeakScan: {
      scannedSamples: leakScanSampleCount,
      leakCount: leakedSampleSeeds.length,
      leakedSampleSeeds
    },
    presetProbes: buildPresetProbes(registry),
    debugSamples
  });
}

export function formatOriginFateV02DistributionReport(report: OriginFateV02DistributionTelemetryReport): string {
  return [
    "# Origin Fate v0.2 Distribution Report",
    "",
    `sampleCount: ${report.sampleCount}`,
    `seedPrefix: ${report.seedPrefix}`,
    "",
    "## Hidden Fate Rarity",
    ...formatDistribution(report.hiddenFateRarityDistribution),
    "",
    "## Origin-Hidden Synergy",
    ...formatDistribution(report.originHiddenSynergyCountsById),
    "",
    "## Origin-Item Synergy",
    ...formatDistribution(report.originItemSynergyCountsById),
    "",
    "## Leak Safety",
    `publicSurfaceLeaks: ${report.hiddenLeakScan.leakCount}/${report.hiddenLeakScan.scannedSamples}`,
    "",
    "## Deterministic Samples",
    ...report.debugSamples.map(
      (sample) => `- ${sample.seed}: origin=${sample.originId}, hidden=${sample.hiddenFateIds.join(",")}, items=${sample.carriedItemIds.join(",")}`
    ),
    "",
    "## Preset Probes",
    ...Object.entries(report.presetProbes).map(([key, probe]) => `- ${key}: ${probe.passed ? "pass" : "fail"} (${probe.label})`),
    "",
    "## Tuning Notes",
    report.hiddenLeakScan.leakCount === 0
      ? "- Public character creation, monthly log, and major choice projections are true-name safe in scanned samples."
      : "- Public projection leak samples require investigation before tuning distribution weights."
  ].join("\n");
}

function requireNarrativeState(draft: CharacterCreationDraft): OriginFateNarrativeStateV02 {
  if (draft.originFateNarrativeState === undefined) {
    throw new Error(`Missing origin fate narrative state in draft: ${draft.draftId}`);
  }
  return draft.originFateNarrativeState;
}

function toDebugSample(
  seed: string,
  draftId: string,
  state: OriginFateNarrativeStateV02,
  registry: OriginFateNarrativeRegistry
): OriginFateV02DebugSample {
  const summary = createOriginFateNarrativeLifeEventSummary(state, { registry });
  const majorChoice = createMajorChoiceContextFromOriginFateNarrative(summary);
  const age18 = resolveAge18OriginFateConversionV02(buildAge18OriginFateInputV02(state), { registry });
  return {
    seed,
    draftId,
    originId: state.origin.originId,
    hiddenFateIds: state.hiddenFates.map((hiddenFate) => hiddenFate.hiddenFateId),
    carriedItemIds: state.carriedItems.map((item) => item.itemId),
    revealBands: state.hiddenFates.map((hiddenFate) => hiddenFate.revealBand),
    monthlyLogOmenLineCount: summary.monthlyLogOmenLines.length,
    majorChoiceHintCount: majorChoice.hiddenFateHintTags.length,
    age18ConvertedItemIds: age18.convertedCarriedItems.map((item) => item.itemId)
  };
}

function buildPresetProbes(
  registry: OriginFateNarrativeRegistry
): Readonly<Record<PresetProbeKey, OriginFateV02PresetProbe>> {
  return deepFreeze({
    apothecaryAlchemy: buildPresetProbe(PRESETS.apothecaryAlchemy, registry),
    fallenSword: buildPresetProbe(PRESETS.fallenSword, registry),
    graveFlute: buildPresetProbe(PRESETS.graveFlute, registry),
    mountainThunder: buildPresetProbe(PRESETS.mountainThunder, registry)
  });
}

function buildPresetProbe(
  preset: (typeof PRESETS)[PresetProbeKey],
  registry: OriginFateNarrativeRegistry
): OriginFateV02PresetProbe {
  const state = buildPresetState(preset, registry);
  const hiddenFate = state.hiddenFates[0]!;
  const summary = createOriginFateNarrativeLifeEventSummary(state, { registry });
  const lifeContext = createLifeEventContextFromOriginFateNarrative(summary);
  const majorChoice = createMajorChoiceContextFromOriginFateNarrative(summary);
  const age18Preview = resolveAge18OriginFateConversionV02(buildAge18OriginFateInputV02(state), { registry });
  const publicOmenView = buildPublicOmenView(hiddenFate, {
    registry,
    surface: "characterCreation"
  });
  const matchedTags = uniqueStable([
    ...lifeContext.allTags,
    ...majorChoice.hiddenFateHintTags,
    ...majorChoice.carriedItemTags,
    ...age18Preview.outerBattlefieldModifiers,
    ...age18Preview.dongfuHooks
  ]).filter((tag) => preset.expectedTags.includes(tag));

  return deepFreeze({
    label: preset.label,
    passed: state.origin.originId === preset.originId &&
      hiddenFate.hiddenFateId === preset.hiddenFateId &&
      state.carriedItems.some((item) => item.itemId === preset.itemId) &&
      matchedTags.length > 0,
    originId: state.origin.originId,
    hiddenFateId: hiddenFate.hiddenFateId,
    itemId: state.carriedItems[0]?.itemId ?? "",
    expectedTags: [...preset.expectedTags],
    matchedTags,
    publicOmenView,
    monthlyLogPreview: [...summary.monthlyLogOmenLines],
    majorChoicePreview: {
      hiddenFateHintTags: [...majorChoice.hiddenFateHintTags],
      carriedItemTags: [...majorChoice.carriedItemTags]
    },
    age18Preview,
    internalTrueNames: [registry.getHiddenFate(preset.hiddenFateId).trueName]
  });
}

function buildPresetState(
  preset: (typeof PRESETS)[PresetProbeKey],
  registry: OriginFateNarrativeRegistry
): OriginFateNarrativeStateV02 {
  const origin = generateOriginNarrativeState({
    originId: preset.originId,
    matchedTags: [preset.originId, preset.itemId, preset.hiddenFateId]
  }, { registry });
  const hiddenDefinition = registry.getHiddenFate(preset.hiddenFateId);
  const carriedItem = registry.getCarriedItemNarrative(preset.itemId);
  const hiddenFateState: HiddenFateNarrativeStateV02 = {
    hiddenFateId: preset.hiddenFateId,
    progress: 60,
    revealBand: registry.getRevealBandForProgress(60).id,
    knownToPlayer: true,
    trueNameRevealed: false,
    misleadingOmenIds: [...hiddenDefinition.misleadingOmenIds],
    omenHistory: []
  };
  const carriedItemState: CarriedItemNarrativeStateV02 = {
    itemId: preset.itemId,
    affinity: preset.itemAffinity,
    lifecycleStage: preset.itemLifecycleStage,
    eventHistory: [`preset_event:${preset.itemId}`],
    damaged: false,
    converted: false
  };
  const publicView = buildPublicOmenView(hiddenFateState, {
    registry,
    surface: "characterCreation"
  });

  return deepFreeze({
    origin,
    hiddenFates: [hiddenFateState],
    carriedItems: [carriedItemState],
    visibleOmenLines: [...publicView.omenLines],
    lifeEventBiasTags: uniqueStable([
      ...origin.lifeEventBiasTags,
      ...hiddenDefinition.primaryTags,
      ...hiddenDefinition.lifeEventHooks,
      ...carriedItem.eventHooks
    ]),
    majorChoiceSignals: [...hiddenDefinition.majorChoiceHooks],
    interludeBiasTags: uniqueStable([
      ...origin.interludeBiasTags.map((id) => `interlude:${id}`),
      ...hiddenDefinition.interludeHooks.map((id) => `interlude:${id}`),
      ...carriedItem.interludeHooks.map((id) => `interlude:${id}`)
    ]),
    stageTransitionTokens: [...hiddenDefinition.stageTransitionTokens],
    age18Hooks: uniqueStable([...hiddenDefinition.age18Outcomes, ...carriedItem.age18Conversions])
  });
}

function publicSurfaceLeaks(
  state: OriginFateNarrativeStateV02,
  registry: OriginFateNarrativeRegistry
): boolean {
  const hiddenNames = registry.hiddenFates.map((hiddenFate) => hiddenFate.trueName);
  const summary = createOriginFateNarrativeLifeEventSummary(state, { registry });
  const lifeContext = createLifeEventContextFromOriginFateNarrative(summary);
  const majorChoice = createMajorChoiceContextFromOriginFateNarrative(summary);
  const publicOmenViews = state.hiddenFates.flatMap((hiddenFate) => [
    buildPublicOmenView(hiddenFate, { registry, surface: "characterCreation" }),
    buildPublicOmenView(hiddenFate, { registry, surface: "monthlyLog" }),
    buildPublicOmenView(hiddenFate, { registry, surface: "majorChoice" })
  ]);
  const age18Preview = resolveAge18OriginFateConversionV02(buildAge18OriginFateInputV02(state), { registry });
  const publicPayload = {
    summary,
    lifeContext,
    majorChoice,
    publicOmenViews,
    sealedHiddenFates: age18Preview.sealedHiddenFates,
    debugTags: age18Preview.debugTags,
    traceability: age18Preview.traceability
  };
  const serialized = JSON.stringify(publicPayload);
  return hiddenNames.some((hiddenName) => serialized.includes(hiddenName));
}

function validateOptions(sampleCount: number, debugSampleCount: number, leakScanSampleCount: number): void {
  if (!Number.isInteger(sampleCount) || sampleCount <= 0) {
    throw new Error("Origin fate v0.2 telemetry sampleCount must be a positive integer");
  }
  if (!Number.isInteger(debugSampleCount) || debugSampleCount < 0 || debugSampleCount > sampleCount) {
    throw new Error("Origin fate v0.2 telemetry debugSampleCount must be between 0 and sampleCount");
  }
  if (!Number.isInteger(leakScanSampleCount) || leakScanSampleCount < 0 || leakScanSampleCount > sampleCount) {
    throw new Error("Origin fate v0.2 telemetry leakScanSampleCount must be between 0 and sampleCount");
  }
}

function createRarityCounts(): Record<HiddenFateRarity, number> {
  return Object.fromEntries(RARITY_KEYS.map((key) => [key, 0])) as Record<HiddenFateRarity, number>;
}

function createRevealBandCounts(): Record<HiddenFateRevealBand, number> {
  return Object.fromEntries(REVEAL_BAND_KEYS.map((key) => [key, 0])) as Record<HiddenFateRevealBand, number>;
}

function increment(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

function toDistribution<T extends string>(
  counts: Readonly<Record<T, number>>,
  total: number
): Readonly<Record<T, OriginFateV02DistributionBucket>> {
  return Object.fromEntries(
    Object.entries(counts)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, count]) => [key, toBucket(Number(count), total)])
  ) as Readonly<Record<T, OriginFateV02DistributionBucket>>;
}

function toBucket(count: number, total: number): OriginFateV02DistributionBucket {
  return {
    count,
    rate: total === 0 ? 0 : count / total
  };
}

function formatDistribution(distribution: Readonly<Record<string, OriginFateV02DistributionBucket>>): readonly string[] {
  const entries = Object.entries(distribution);
  if (entries.length === 0) {
    return ["- none"];
  }
  return entries
    .sort((first, second) => second[1].count - first[1].count || first[0].localeCompare(second[0]))
    .map(([id, bucket]) => `- ${id}: ${bucket.count} (${formatRate(bucket.rate)})`);
}

function formatRate(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
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
