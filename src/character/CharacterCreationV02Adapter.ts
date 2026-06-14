import { loadDestinyV2Registry } from "../destinyV2/DestinyV2Registry";
import { loadLifeStorylineRegistry } from "../lifeStorylines/LifeStorylineRegistry";
import {
  STORYLINE_SCORING_ENGINE_SOURCE,
  StorylineScoringEngine
} from "../lifeStorylines/StorylineScoringEngine";
import { createCarriedItemLifecycleHooks } from "../originFate/CarriedItemLifecycleEngine";
import { buildOriginFateNarrativeStateFromDraft } from "../originFate/OriginFateNarrativeDraftAdapter";
import {
  loadOriginFateNarrativeRegistry,
  type OriginFateNarrativeRegistry
} from "../originFate/OriginFateNarrativeRegistry";
import type {
  CarriedItemLifecycleStage,
  OriginFateNarrativeStateV02
} from "../types/origin-fate-narrative-types.v0.2";
import type {
  DestinyFateAlignment,
  DestinyFateAlignmentInfo,
  DestinyRollSlotKey,
  NinePalaceDestinyRollDebugInfo
} from "../types/destiny-types.v0.1";
import type {
  DestinyConflictSynergyResult,
  DestinyEffectsProjection,
  DestinyEligibilityResult,
  DestinyLifeManifestationProjectedHook,
  DestinyMutationResolutionResult
} from "../types/destiny-eligibility-types.v0.1";
import type { StorylineStatus } from "../types/life-storylines-types.v0.1";
import type { NinePalaceEvaluation } from "../types/nine-palace-fate-types.v0.1";
import type {
  CharacterCreationDraft,
  CharacterOriginV02CarriedItemLifecycleSummary,
  CharacterOriginV02DestinyEvaluationResult,
  CharacterOriginV02LifeStorylineInitialScores,
  CharacterOriginV02SelectedDestiny,
  DestinyTraitState
} from "./CharacterCreationTypes";

export const CHARACTER_CREATION_V02_MUTATION_EXPLANATION = "原始天机产生偏转";

export type CharacterCreationV02Slot = DestinyRollSlotKey;
export type DestinyEvaluationEligibility = "eligible" | "blocked" | "unknown";
export type LifeStorylinePreviewStatus = "hinted" | "active" | "dominant";

export interface DestinyEvaluationResult {
  readonly slot: CharacterCreationV02Slot;
  readonly finalDestinyId: string;
  readonly finalDestinyName: string;
  readonly qualityLabel: string;
  readonly alignment: DestinyFateAlignment;
  readonly alignmentLabel: string;
  readonly eligibility: DestinyEvaluationEligibility;
  readonly supportLevel?: DestinyEligibilityResult["supportLevel"];
  readonly mutation: {
    readonly mutated: boolean;
    readonly visibleExplanation?: string;
  };
  readonly synergyTags: readonly string[];
  readonly synergyWarnings: readonly string[];
  readonly conflictWarnings: readonly string[];
  readonly lifeImpactHookTags: readonly string[];
  readonly modeProjectionTags: readonly string[];
}

export interface OriginNarrativeChainSummary {
  readonly originId: string;
  readonly originName: string;
  readonly activeStorylineIds: readonly string[];
  readonly activeStorylineLabels: readonly string[];
  readonly canonicalLifeStorylineIds: readonly string[];
  readonly regionTags: readonly string[];
  readonly eventPhaseSeeds: readonly {
    readonly phase: "earlyEcho" | "childhoodSeed" | "youthConflict" | "teenChoice";
    readonly label: string;
    readonly events: readonly string[];
  }[];
}

export interface CarriedItemLifecycleSummary extends CharacterOriginV02CarriedItemLifecycleSummary {}

export interface LifeStorylineInitialScores extends CharacterOriginV02LifeStorylineInitialScores {}

export interface LifeStageInitialState {
  readonly agePhaseId: "infant";
  readonly identityStageIds: readonly ["mortal_child"];
  readonly scores: {
    readonly initiationReadiness: number;
    readonly systemResonance: number;
    readonly karmicPressure: number;
    readonly worldlyAttachment: number;
    readonly bodyVessel: number;
    readonly mindStability: number;
  };
  readonly transitionTokens: readonly string[];
  readonly age18Hooks: readonly string[];
}

export interface CharacterCreationV02Projection {
  readonly ninePalaceEvaluation: NinePalaceEvaluation;
  readonly destinyEvaluationResults: readonly DestinyEvaluationResult[];
  readonly originFateNarrativeState: OriginFateNarrativeStateV02;
  readonly originNarrativeSummary: OriginNarrativeChainSummary;
  readonly carriedItemLifecycleSummary: CarriedItemLifecycleSummary;
  readonly lifeStorylineInitialScores: LifeStorylineInitialScores;
  readonly lifeStageInitialState: LifeStageInitialState;
}

export interface CharacterOriginV02ProfileShape {
  readonly destinyEvaluationResults: readonly CharacterOriginV02DestinyEvaluationResult[];
  readonly carriedItemLifecycleSummary: CarriedItemLifecycleSummary;
  readonly lifeStorylineInitialScores: LifeStorylineInitialScores;
}

export interface CharacterCreationV02AdapterContext {
  readonly registry?: OriginFateNarrativeRegistry;
}

const SLOTS = ["main", "secondary0", "secondary1", "flaw"] as const satisfies readonly CharacterCreationV02Slot[];
const MODE_PROJECTION_BUCKETS = ["lifeSim", "outerBattlefield", "outgame", "horde", "deckbuilder", "autochess"] as const;
const DESTINY_V2_REGISTRY = loadDestinyV2Registry();
const LIFE_STORYLINE_REGISTRY = loadLifeStorylineRegistry();
const STORYLINE_SCORING_ENGINE = new StorylineScoringEngine({ registry: LIFE_STORYLINE_REGISTRY });
const PHASE_LABELS = {
  earlyEcho: "早年回声",
  childhoodSeed: "童年伏笔",
  youthConflict: "少年冲突",
  teenChoice: "入道抉择"
} as const;

export function createCharacterCreationV02Projection(
  draft: CharacterCreationDraft,
  context: CharacterCreationV02AdapterContext = {}
): CharacterCreationV02Projection {
  const registry = context.registry ?? loadOriginFateNarrativeRegistry();
  const ninePalaceEvaluation = draft.openingInnateDraft.ninePalaceEvaluation;
  if (ninePalaceEvaluation === undefined) {
    throw new Error("CharacterCreationV02Adapter requires openingInnateDraft.ninePalaceEvaluation");
  }
  const originFateNarrativeState = draft.originFateNarrativeState ?? buildOriginFateNarrativeStateFromDraft({
    originFate: draft.originFate,
    openingInnateDraft: draft.openingInnateDraft,
    destinies: draft.destinies,
    seed: `${draft.originFate.seed}:mig_c003`
  }, { registry });

  return deepFreeze({
    ninePalaceEvaluation: cloneJson(ninePalaceEvaluation),
    destinyEvaluationResults: buildDestinyEvaluationResults(draft),
    originFateNarrativeState,
    originNarrativeSummary: buildOriginNarrativeSummary(originFateNarrativeState, registry),
    carriedItemLifecycleSummary: buildCarriedItemLifecycleSummary(originFateNarrativeState, registry),
    lifeStorylineInitialScores: buildLifeStorylineInitialScores(draft, originFateNarrativeState),
    lifeStageInitialState: buildLifeStageInitialState(originFateNarrativeState, ninePalaceEvaluation)
  });
}

export function buildCharacterOriginV02ProfileShape(
  draft: CharacterCreationDraft,
  context: CharacterCreationV02AdapterContext = {}
): CharacterOriginV02ProfileShape {
  const projection = createCharacterCreationV02Projection(draft, context);
  return deepFreeze({
    destinyEvaluationResults: buildCharacterOriginV02DestinyEvaluationResults(draft),
    carriedItemLifecycleSummary: projection.carriedItemLifecycleSummary,
    lifeStorylineInitialScores: projection.lifeStorylineInitialScores
  });
}

function buildCharacterOriginV02DestinyEvaluationResults(
  draft: CharacterCreationDraft
): readonly CharacterOriginV02DestinyEvaluationResult[] {
  const debug = draft.destinyRollDraft?.debug.ninePalace;
  const selectedDestinies = buildSelectedDestinySummaries(draft);
  const selectedDestinyIds = selectedDestinies.map((destiny) => destiny.destinyId);
  return SLOTS.map<CharacterOriginV02DestinyEvaluationResult>((slot, index) => {
    const trait = getTraitForSlot(draft, slot);
    const alignment = debug?.slotAlignments[slot];
    const eligibility = debug?.eligibilityResults[index];
    const mutated = isMutatedDestiny(trait, alignment?.alignment, debug?.mutationResults, trait.traitId);
    const conflictSynergy = debug?.conflictSynergyResult;
    const originalDestinyId = getOriginalDestinyId(trait, alignment, debug?.mutationResults);
    const mutationSource = getMutationSource(originalDestinyId, trait.traitId, debug?.mutationResults);
    const lifeManifestationHooks = getLifeManifestationHooks(draft, trait.traitId);
    const modeProjectionHooks = getModeProjectionHooks(trait.traitId);
    const modeProjectionTags = uniqueStable([
      ...trait.tags.filter((tag) => isPublicProjectionTag(tag)),
      ...Object.values(modeProjectionHooks).flat()
    ]);

    const base = {
      slot,
      selectedDestinyIds,
      selectedDestinies,
      originalDestinyId,
      finalDestinyId: trait.traitId,
      finalDisplayedDestinyId: trait.traitId,
      finalDestinyName: trait.name,
      publicLabel: trait.name,
      publicDescription: trait.description ?? "",
      qualityLabel: trait.qualityLabel ?? trait.rarity,
      alignment: alignment?.alignment ?? trait.fateAlignment ?? "neutral",
      alignmentLabel: alignment?.label ?? trait.fateAlignmentLabel ?? "unknown",
      eligibility: toEligibilityStatus(eligibility),
      mutation: toProfileMutationResult(mutated, mutationSource),
      synergyTags: getSynergyTags(conflictSynergy, trait.traitId),
      synergyWarnings: conflictSynergy?.synergyWarnings ?? [],
      conflictWarnings: conflictSynergy?.conflictWarnings ?? [],
      conflictSynergy: toPublicConflictSynergyResult(conflictSynergy),
      lifeImpactHookTags: lifeManifestationHooks.map((hook) => hook.hook),
      lifeManifestationHooks,
      modeProjectionTags,
      modeProjectionHooks
    };
    if (eligibility === undefined) {
      return base;
    }
    return {
      ...base,
      supportLevel: eligibility.supportLevel,
      eligibilityResult: toPublicEligibilityResult(eligibility)
    };
  });
}

function buildDestinyEvaluationResults(draft: CharacterCreationDraft): readonly DestinyEvaluationResult[] {
  const debug = draft.destinyRollDraft?.debug.ninePalace;
  return SLOTS.map((slot, index) => {
    const trait = getTraitForSlot(draft, slot);
    const alignment = debug?.slotAlignments[slot];
    const eligibility = debug?.eligibilityResults[index];
    const mutated = isMutatedDestiny(trait, alignment?.alignment, debug?.mutationResults, trait.traitId);
    const conflictSynergy = debug?.conflictSynergyResult;

    return {
      slot,
      finalDestinyId: trait.traitId,
      finalDestinyName: trait.name,
      qualityLabel: trait.qualityLabel ?? trait.rarity,
      alignment: alignment?.alignment ?? trait.fateAlignment ?? "neutral",
      alignmentLabel: alignment?.label ?? trait.fateAlignmentLabel ?? "命盘未定",
      eligibility: toEligibilityStatus(eligibility),
      ...(eligibility === undefined ? {} : { supportLevel: eligibility.supportLevel }),
      mutation: mutated
        ? {
            mutated: true,
            visibleExplanation: CHARACTER_CREATION_V02_MUTATION_EXPLANATION
          }
        : { mutated: false },
      synergyTags: getSynergyTags(conflictSynergy, trait.traitId),
      synergyWarnings: conflictSynergy?.synergyWarnings ?? [],
      conflictWarnings: conflictSynergy?.conflictWarnings ?? [],
      lifeImpactHookTags: draft.destinies.lifeManifestationHooks?.hooks
        .filter((hook) => hook.destinyId === trait.traitId)
        .map((hook) => hook.hook) ?? [],
      modeProjectionTags: trait.tags.filter((tag) => isPublicProjectionTag(tag))
    };
  });
}

function buildOriginNarrativeSummary(
  state: OriginFateNarrativeStateV02,
  registry: OriginFateNarrativeRegistry
): OriginNarrativeChainSummary {
  const origin = registry.getOriginStoryline(state.origin.originId);
  return {
    originId: origin.id,
    originName: origin.name,
    activeStorylineIds: [...state.origin.activeStorylineIds],
    activeStorylineLabels: state.origin.activeStorylineIds.map((id) => toDisplayId(id)),
    canonicalLifeStorylineIds: [...state.origin.canonicalLifeStorylineIds],
    regionTags: [...state.origin.regionTags],
    eventPhaseSeeds: [
      { phase: "earlyEcho", label: PHASE_LABELS.earlyEcho, events: [...state.origin.eventPhaseSeeds.earlyEcho] },
      { phase: "childhoodSeed", label: PHASE_LABELS.childhoodSeed, events: [...state.origin.eventPhaseSeeds.childhoodSeed] },
      { phase: "youthConflict", label: PHASE_LABELS.youthConflict, events: [...state.origin.eventPhaseSeeds.youthConflict] },
      { phase: "teenChoice", label: PHASE_LABELS.teenChoice, events: [...state.origin.eventPhaseSeeds.teenChoice] }
    ]
  };
}

function buildCarriedItemLifecycleSummary(
  state: OriginFateNarrativeStateV02,
  registry: OriginFateNarrativeRegistry
): CarriedItemLifecycleSummary {
  const hookProjection = createCarriedItemLifecycleHooks(state.carriedItems, { registry });
  return {
    items: state.carriedItems.map((itemState) => {
      const item = registry.getCarriedItemNarrative(itemState.itemId);
      return {
        itemId: item.id,
        name: item.name,
        lifecycleStage: itemState.lifecycleStage,
        lifecycleText: item.lifecycle.find((entry) => entry.stage === itemState.lifecycleStage)?.text ?? item.surfaceDescription,
        affinity: itemState.affinity,
        affinityBand: toAffinityBand(itemState.affinity),
        converted: itemState.converted,
        publicOmenText: state.visibleOmenLines.join(" / ") || item.surfaceDescription,
        lifeEventTags: uniqueStable([
          ...item.eventHooks,
          ...state.lifeEventBiasTags,
          `item:${item.id}`,
          `itemLifecycle:${itemState.lifecycleStage}`,
          `itemAffinity:${toAffinityBand(itemState.affinity)}`
        ]),
        monthlyEventHooks: item.eventHooks,
        majorChoiceHooks: hookProjection.majorChoiceHooks.filter((hook) => hook.includes(item.id)),
        interludeHooks: item.interludeHooks,
        age18Hooks: item.age18Conversions,
        narrativeChainRefs: uniqueStable([
          `origin:${state.origin.originId}`,
          `item:${item.id}`,
          `lifecycle:${itemState.lifecycleStage}`,
          ...item.interludeHooks.map((id) => `interlude:${id}`),
          ...item.age18Conversions.map((id) => `age18:${id}`)
        ])
      };
    })
  };
}

function buildLifeStorylineInitialScores(
  draft: CharacterCreationDraft,
  state: OriginFateNarrativeStateV02
): LifeStorylineInitialScores {
  const evaluation = STORYLINE_SCORING_ENGINE.evaluateDetailed({
    ageMonths: 0,
    openingDraft: draft.openingInnateDraft,
    ninePalaceEvaluation: draft.openingInnateDraft.ninePalaceEvaluation,
    destinySelection: draft.destinies,
    originFate: draft.originFate,
    originFateNarrativeState: state
  });
  const storylines = evaluation.storylines.map((storyline) => {
    const definition = LIFE_STORYLINE_REGISTRY.getStoryline(storyline.storylineId);
    return {
      storylineId: storyline.storylineId,
      label: definition.shortName || definition.name || toDisplayId(definition.id),
      score: storyline.score,
      status: toPreviewStorylineStatus(storyline.status),
      tags: [...storyline.tags]
    };
  });

  return {
    source: STORYLINE_SCORING_ENGINE_SOURCE,
    storylines,
    monthlyEventTags: evaluation.monthlyEventTags.filter(isPublicPreviewTag),
    majorChoiceTags: evaluation.majorChoiceTags.filter(isPublicPreviewTag),
    debug: {
      source: STORYLINE_SCORING_ENGINE_SOURCE,
      signalTags: evaluation.debug.signalTags,
      scoreBreakdownByStoryline: evaluation.debug.scoreBreakdownByStoryline
    }
  };
}

function buildLifeStageInitialState(
  state: OriginFateNarrativeStateV02,
  ninePalaceEvaluation: NinePalaceEvaluation
): LifeStageInitialState {
  return {
    agePhaseId: "infant",
    identityStageIds: ["mortal_child"],
    scores: {
      initiationReadiness: clampInteger(Math.round((ninePalaceEvaluation.derived.talentScore + ninePalaceEvaluation.derived.vesselScore) / 2), 0, 100),
      systemResonance: state.age18Hooks.some((hook) => hook.includes("system")) ? 45 : 0,
      karmicPressure: clampInteger(ninePalaceEvaluation.derived.destinyPressureScore, 0, 100),
      worldlyAttachment: clampInteger(state.carriedItems.length * 12 + state.origin.activeStorylineIds.length * 6, 0, 100),
      bodyVessel: clampInteger(ninePalaceEvaluation.derived.vesselScore, 0, 100),
      mindStability: clampInteger(ninePalaceEvaluation.derived.stabilityScore, 0, 100)
    },
    transitionTokens: uniqueStable([...state.stageTransitionTokens]),
    age18Hooks: uniqueStable([...state.age18Hooks])
  };
}

function getTraitForSlot(draft: CharacterCreationDraft, slot: CharacterCreationV02Slot): DestinyTraitState {
  switch (slot) {
    case "main":
      return draft.destinies.main;
    case "secondary0":
      return draft.destinies.secondary[0];
    case "secondary1":
      return draft.destinies.secondary[1];
    case "flaw":
      return draft.destinies.flaw;
  }
}

function isMutatedDestiny(
  trait: DestinyTraitState,
  alignment: DestinyFateAlignment | undefined,
  mutationResults: readonly DestinyMutationResolutionResult[] | undefined,
  finalDestinyId: string
): boolean {
  return alignment === "mutated" ||
    trait.mutatedFromTraitId !== undefined ||
    (mutationResults ?? []).some((result) => result.action === "mutate" && result.resolvedDestinyId === finalDestinyId);
}

function toEligibilityStatus(result: DestinyEligibilityResult | undefined): DestinyEvaluationEligibility {
  if (result === undefined) {
    return "unknown";
  }
  return result.eligible ? "eligible" : "blocked";
}

function getSynergyTags(
  result: DestinyConflictSynergyResult | undefined,
  destinyId: string
): readonly string[] {
  if (result === undefined) {
    return [];
  }
  return uniqueStable(result.synergies
    .filter((synergy) => synergy.ids.includes(destinyId))
    .flatMap((synergy) => synergy.effectTags));
}

function buildSelectedDestinySummaries(draft: CharacterCreationDraft): readonly CharacterOriginV02SelectedDestiny[] {
  return SLOTS.map((slot) => {
    const trait = getTraitForSlot(draft, slot);
    return {
      slot,
      destinyId: trait.traitId,
      name: trait.name,
      qualityLabel: trait.qualityLabel ?? trait.rarity,
      description: trait.description ?? ""
    };
  });
}

function getOriginalDestinyId(
  trait: DestinyTraitState,
  alignment: DestinyFateAlignmentInfo | undefined,
  mutationResults: readonly DestinyMutationResolutionResult[] | undefined
): string {
  return alignment?.sourceTraitId ??
    trait.mutatedFromTraitId ??
    mutationResults?.find((result) => result.action === "mutate" && result.resolvedDestinyId === trait.traitId)?.originalDestinyId ??
    trait.traitId;
}

function getMutationSource(
  originalDestinyId: string,
  finalDestinyId: string,
  mutationResults: readonly DestinyMutationResolutionResult[] | undefined
): CharacterOriginV02DestinyEvaluationResult["mutation"]["source"] {
  if (originalDestinyId === finalDestinyId) {
    return undefined;
  }
  const result = mutationResults?.find((entry) =>
    entry.action === "mutate" &&
    entry.originalDestinyId === originalDestinyId &&
    entry.resolvedDestinyId === finalDestinyId
  ) ?? mutationResults?.find((entry) => entry.action === "mutate" && entry.resolvedDestinyId === finalDestinyId);
  if (result === undefined) {
    return undefined;
  }
  return {
    originalDestinyId: result.originalDestinyId,
    ...(result.resolvedDestinyId === undefined ? {} : { resolvedDestinyId: result.resolvedDestinyId }),
    reason: result.reason,
    mutationDepth: result.mutationDepth
  };
}

function toProfileMutationResult(
  mutated: boolean,
  source: CharacterOriginV02DestinyEvaluationResult["mutation"]["source"] | undefined
): CharacterOriginV02DestinyEvaluationResult["mutation"] {
  if (!mutated) {
    return { mutated: false };
  }
  if (source === undefined) {
    return {
      mutated: true,
      visibleExplanation: CHARACTER_CREATION_V02_MUTATION_EXPLANATION
    };
  }
  return {
    mutated: true,
    visibleExplanation: CHARACTER_CREATION_V02_MUTATION_EXPLANATION,
    source
  };
}

function toPublicEligibilityResult(
  result: DestinyEligibilityResult
): NonNullable<CharacterOriginV02DestinyEvaluationResult["eligibilityResult"]> {
  return {
    destinyId: result.destinyId,
    eligible: result.eligible,
    supportLevel: result.supportLevel,
    reasonTags: result.reasonTags.filter(isPublicProjectionTag),
    ...(result.mutationCandidate === undefined ? {} : { mutationCandidate: result.mutationCandidate })
  };
}

function toPublicConflictSynergyResult(
  result: DestinyConflictSynergyResult | undefined
): CharacterOriginV02DestinyEvaluationResult["conflictSynergy"] {
  if (result === undefined) {
    return {
      synergyTags: [],
      synergyWarnings: [],
      conflictWarnings: [],
      warnings: [],
      synergies: []
    };
  }
  return {
    synergyTags: [...result.synergyTags],
    synergyWarnings: [...result.synergyWarnings],
    conflictWarnings: [...result.conflictWarnings],
    warnings: [...result.warnings],
    synergies: result.synergies.map((synergy) => ({
      ids: [...synergy.ids],
      name: synergy.name,
      effectTags: [...synergy.effectTags],
      ...(synergy.warning === undefined ? {} : { warning: synergy.warning })
    }))
  };
}

function getLifeManifestationHooks(
  draft: CharacterCreationDraft,
  destinyId: string
): readonly DestinyLifeManifestationProjectedHook[] {
  return draft.destinies.lifeManifestationHooks?.hooks
    .filter((hook) => hook.destinyId === destinyId)
    .map((hook) => ({ ...hook })) ?? [];
}

function getModeProjectionHooks(destinyId: string): DestinyEffectsProjection {
  try {
    const projection = DESTINY_V2_REGISTRY.getModeProjection(destinyId);
    return Object.fromEntries(
      MODE_PROJECTION_BUCKETS
        .map((bucket) => [bucket, projection[bucket]] as const)
        .filter((entry): entry is readonly [typeof MODE_PROJECTION_BUCKETS[number], readonly string[]] =>
          entry[1] !== undefined && entry[1].length > 0
        )
        .map(([bucket, values]) => [bucket, [...values]])
    ) as DestinyEffectsProjection;
  } catch {
    return {};
  }
}

function isPublicProjectionTag(tag: string): boolean {
  return !tag.startsWith("mutation:source:") && !tag.startsWith("mutation:target:");
}

function isPublicPreviewTag(tag: string): boolean {
  return !tag.startsWith("hidden:");
}

function toAffinityBand(value: number): CarriedItemLifecycleSummary["items"][number]["affinityBand"] {
  if (value >= 70) {
    return "bound";
  }
  if (value >= 45) {
    return "resonant";
  }
  if (value >= 20) {
    return "warm";
  }
  return "dormant";
}

function toPreviewStorylineStatus(status: StorylineStatus): LifeStorylinePreviewStatus {
  if (status === "active") {
    return "active";
  }
  if (status === "dominant" || status === "fated") {
    return "dominant";
  }
  return "hinted";
}

function toDisplayId(id: string): string {
  return id
    .replace(/^storyline_/, "")
    .replace(/^lifeStoryline:/, "")
    .replaceAll("_", " ");
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.trunc(Math.min(max, Math.max(min, value)));
}

function uniqueStable<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
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
