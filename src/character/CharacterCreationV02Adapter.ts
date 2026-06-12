import { createCarriedItemLifecycleHooks } from "../originFate/CarriedItemLifecycleEngine";
import { buildOriginFateNarrativeStateFromDraft } from "../originFate/OriginFateNarrativeDraftAdapter";
import {
  loadOriginFateNarrativeRegistry,
  type OriginFateNarrativeRegistry
} from "../originFate/OriginFateNarrativeRegistry";
import { createOriginStorylineLifeContext } from "../originFate/OriginNarrativeEngine";
import type {
  CarriedItemLifecycleStage,
  OriginFateNarrativeStateV02
} from "../types/origin-fate-narrative-types.v0.2";
import type {
  DestinyFateAlignment,
  DestinyRollSlotKey,
  NinePalaceDestinyRollDebugInfo
} from "../types/destiny-types.v0.1";
import type {
  DestinyConflictSynergyResult,
  DestinyEligibilityResult,
  DestinyMutationResolutionResult
} from "../types/destiny-eligibility-types.v0.1";
import type { NinePalaceEvaluation } from "../types/nine-palace-fate-types.v0.1";
import type {
  CharacterCreationDraft,
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

export interface CarriedItemLifecycleSummary {
  readonly items: readonly {
    readonly itemId: string;
    readonly name: string;
    readonly lifecycleStage: CarriedItemLifecycleStage;
    readonly lifecycleText: string;
    readonly affinity: number;
    readonly affinityBand: "dormant" | "warm" | "resonant" | "bound";
    readonly converted: boolean;
    readonly monthlyEventHooks: readonly string[];
    readonly majorChoiceHooks: readonly string[];
    readonly interludeHooks: readonly string[];
    readonly age18Hooks: readonly string[];
  }[];
}

export interface LifeStorylineInitialScores {
  readonly storylines: readonly {
    readonly storylineId: string;
    readonly label: string;
    readonly score: number;
    readonly status: LifeStorylinePreviewStatus;
    readonly tags: readonly string[];
  }[];
  readonly monthlyEventTags: readonly string[];
  readonly majorChoiceTags: readonly string[];
}

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

export interface CharacterCreationV02AdapterContext {
  readonly registry?: OriginFateNarrativeRegistry;
}

const SLOTS = ["main", "secondary0", "secondary1", "flaw"] as const satisfies readonly CharacterCreationV02Slot[];
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
    lifeStorylineInitialScores: buildLifeStorylineInitialScores(originFateNarrativeState, registry),
    lifeStageInitialState: buildLifeStageInitialState(originFateNarrativeState, ninePalaceEvaluation)
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
        monthlyEventHooks: item.eventHooks,
        majorChoiceHooks: hookProjection.majorChoiceHooks.filter((hook) => hook.includes(item.id)),
        interludeHooks: item.interludeHooks,
        age18Hooks: item.age18Conversions
      };
    })
  };
}

function buildLifeStorylineInitialScores(
  state: OriginFateNarrativeStateV02,
  registry: OriginFateNarrativeRegistry
): LifeStorylineInitialScores {
  const context = createOriginStorylineLifeContext(state.origin, { registry });
  const storylines = state.origin.activeStorylineIds.map((storylineId) => {
    const score = clampInteger(45 + Math.round((state.origin.originThreadProgress[storylineId] ?? 0) * 0.4), 0, 100);
    return {
      storylineId,
      label: toDisplayId(storylineId),
      score,
      status: toStorylineStatus(score),
      tags: uniqueStable([
        `storyline:${storylineId}`,
        ...state.origin.canonicalLifeStorylineIds.map((id) => `lifeStoryline:${id}`),
        ...state.origin.regionTags.map((tag) => `region:${tag}`)
      ])
    };
  });

  return {
    storylines,
    monthlyEventTags: context.monthlyEventTags.filter(isPublicPreviewTag),
    majorChoiceTags: context.majorChoiceTags.filter(isPublicPreviewTag)
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

function toStorylineStatus(score: number): LifeStorylinePreviewStatus {
  if (score >= 80) {
    return "dominant";
  }
  if (score >= 55) {
    return "active";
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
