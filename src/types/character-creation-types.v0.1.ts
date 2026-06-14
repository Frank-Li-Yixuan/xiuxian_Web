import type { OpeningInnateDraft } from "./opening-generator-types.v0.1";
import type { OriginFateDraft } from "./origin-fate-types.v0.1";
import type { OriginFateNarrativeStateV02 } from "./origin-fate-narrative-types.v0.2";
import type {
  DestinyEffectsProjection,
  DestinyLifeManifestationHookProjection,
  DestinyLifeManifestationProjectedHook,
  DestinyMutationResolutionReason
} from "./destiny-eligibility-types.v0.1";
import type {
  DestinyQuality,
  DestinyFateAlignment,
  DestinyRollDraft,
  DestinyRerollSession,
  DestinySynergyRule
} from "./destiny-types.v0.1";

export type CharacterCreationRarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "flaw";
export type DestinySlotType = "main" | "secondary" | "flaw";
export type ProfileStage = "empty" | "character_creation" | "life_simulation" | "outer_battlefield" | "dongfu_unlocked";

export interface CoreThreeTreasures {
  readonly jing: number;
  readonly qi: number;
  readonly shen: number;
}

export interface AptitudeStats {
  readonly rootBone: number;
  readonly comprehension: number;
  readonly inspiration: number;
  readonly fortune: number;
  readonly heart: number;
  readonly lifespan: number;
}

export interface CharacterAppearanceState {
  readonly templateId: string;
  readonly genderPresentation: "male" | "female" | "androgynous";
  readonly temperament: "calm" | "cold" | "gentle" | "wild" | "mysterious";
  readonly robeColor: string;
  readonly portraitAssetId?: string;
}

export interface SpiritualRootDefinition {
  readonly id: string;
  readonly name: string;
  readonly rarity: CharacterCreationRarity;
  readonly elements: readonly string[];
  readonly tags: readonly string[];
  readonly description: string;
  readonly statBias: Readonly<Record<string, number>>;
  readonly rewardWeights?: Readonly<Record<string, number>>;
}

export interface SpiritualRootState {
  readonly rootId: string;
  readonly displayName: string;
  readonly elements: readonly string[];
  readonly rarity: CharacterCreationRarity;
  readonly tags: readonly string[];
}

export interface DestinyTraitDefinition {
  readonly id: string;
  readonly name: string;
  readonly slotTypes: readonly DestinySlotType[];
  readonly rarity: CharacterCreationRarity;
  readonly tags: readonly string[];
  readonly description: string;
  readonly positiveEffects: readonly string[];
  readonly negativeEffects: readonly string[];
  readonly statModifiers?: Readonly<Record<string, number>>;
  readonly exclusiveWith?: readonly string[];
  readonly synergyWith?: readonly string[];
  readonly conflictWith?: readonly string[];
}

export interface DestinySelectionState {
  readonly main: DestinyTraitState;
  readonly secondary: readonly [DestinyTraitState, DestinyTraitState];
  readonly flaw: DestinyTraitState;
  readonly synergies: readonly DestinySynergyRule[];
  readonly softConflicts: readonly string[];
  readonly synergyWarnings: readonly string[];
  readonly conflictWarnings: readonly string[];
  readonly warnings: readonly string[];
  readonly lifeManifestationHooks?: DestinyLifeManifestationHookProjection;
}

export interface DestinyTraitState {
  readonly traitId: string;
  readonly name: string;
  readonly rarity: CharacterCreationRarity;
  readonly quality?: DestinyQuality;
  readonly qualityLabel?: string;
  readonly description?: string;
  readonly tags: readonly string[];
  readonly positiveEffects: readonly string[];
  readonly negativeEffects: readonly string[];
  readonly fateAlignment?: DestinyFateAlignment;
  readonly fateAlignmentLabel?: string;
  readonly fateAlignmentReasonTags?: readonly string[];
  readonly mutatedFromTraitId?: string;
}

export interface BackgroundOriginDefinition {
  readonly id: string;
  readonly name: string;
  readonly rarity: CharacterCreationRarity;
  readonly description: string;
  readonly visibleEffects: readonly string[];
  readonly statModifiers?: Readonly<Record<string, number>>;
  readonly hiddenFateWeights?: Readonly<Record<string, number>>;
  readonly carriedItemPool: readonly string[];
}

export interface BackgroundOriginState {
  readonly backgroundId: string;
  readonly name: string;
  readonly rarity: CharacterCreationRarity;
  readonly description: string;
  readonly visibleEffects: readonly string[];
}

export interface HiddenFateDefinition {
  readonly id: string;
  readonly secretName: string;
  readonly hint: string;
  readonly rarity: CharacterCreationRarity;
  readonly tags: readonly string[];
  readonly revealConditions: readonly string[];
  readonly latentEffects?: Readonly<Record<string, number>>;
}

export interface HiddenFateState {
  readonly hiddenFateId: string;
  readonly hint: string;
  readonly rarity: CharacterCreationRarity;
  readonly tags: readonly string[];
  readonly revealed: boolean;
  readonly secretName?: string;
}

export interface CarriedItemDraft {
  readonly itemId: string;
  readonly name: string;
  readonly rarity: CharacterCreationRarity;
  readonly description: string;
  readonly tags: readonly string[];
  readonly outerBattlefieldConversion?: string;
}

export interface CharacterCreationLocks {
  readonly spiritualRoot: boolean;
  readonly mainDestiny: boolean;
  readonly secondaryDestiny0: boolean;
  readonly secondaryDestiny1: boolean;
  readonly flawDestiny: boolean;
  readonly background: boolean;
  readonly hiddenFate: boolean;
  readonly carriedItems: boolean;
}

export interface CharacterCreationDraft {
  readonly draftId: string;
  readonly slotId: string;
  readonly name: string;
  readonly appearance: CharacterAppearanceState;
  readonly coreStats: CoreThreeTreasures;
  readonly aptitude: AptitudeStats;
  readonly spiritualRoot: SpiritualRootState;
  readonly openingInnateDraft: OpeningInnateDraft;
  readonly destinies: DestinySelectionState;
  readonly destinyRollDraft?: DestinyRollDraft;
  readonly destinyRerollSession?: DestinyRerollSession;
  readonly originFate: OriginFateDraft;
  readonly originFateNarrativeState?: OriginFateNarrativeStateV02;
  readonly background: BackgroundOriginState;
  readonly hiddenFate: HiddenFateState;
  readonly carriedItems: readonly CarriedItemDraft[];
  readonly locks: CharacterCreationLocks;
  readonly attributeLock: boolean;
  readonly spiritualRootLock: boolean;
  readonly rerollCount: number;
  readonly divinationTokens: number;
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
}

export type CharacterOriginV02Slot = "main" | "secondary0" | "secondary1" | "flaw";
export type CharacterOriginV02DestinyEligibility = "eligible" | "blocked" | "unknown";
export type CharacterOriginV02StorylineStatus = "hinted" | "active" | "dominant";

export interface CharacterOriginV02SelectedDestiny {
  readonly slot: CharacterOriginV02Slot;
  readonly destinyId: string;
  readonly name: string;
  readonly qualityLabel: string;
  readonly description: string;
}

export interface CharacterOriginV02DestinyEligibilityResult {
  readonly destinyId: string;
  readonly eligible: boolean;
  readonly supportLevel: "none" | "weak" | "normal" | "strong";
  readonly reasonTags: readonly string[];
  readonly mutationCandidate?: string;
}

export interface CharacterOriginV02DestinyMutationSource {
  readonly originalDestinyId: string;
  readonly resolvedDestinyId?: string;
  readonly reason: DestinyMutationResolutionReason;
  readonly mutationDepth: number;
}

export interface CharacterOriginV02DestinyConflictSynergyResult {
  readonly synergyTags: readonly string[];
  readonly synergyWarnings: readonly string[];
  readonly conflictWarnings: readonly string[];
  readonly warnings: readonly string[];
  readonly synergies: readonly {
    readonly ids: readonly string[];
    readonly name: string;
    readonly effectTags: readonly string[];
    readonly warning?: string;
  }[];
}

export interface CharacterOriginV02DestinyEvaluationResult {
  readonly slot: CharacterOriginV02Slot;
  readonly selectedDestinyIds: readonly string[];
  readonly selectedDestinies: readonly CharacterOriginV02SelectedDestiny[];
  readonly originalDestinyId: string;
  readonly finalDestinyId: string;
  readonly finalDisplayedDestinyId: string;
  readonly finalDestinyName: string;
  readonly publicLabel: string;
  readonly publicDescription: string;
  readonly qualityLabel: string;
  readonly alignment: DestinyFateAlignment;
  readonly alignmentLabel: string;
  readonly eligibility: CharacterOriginV02DestinyEligibility;
  readonly supportLevel?: CharacterOriginV02DestinyEligibilityResult["supportLevel"];
  readonly eligibilityResult?: CharacterOriginV02DestinyEligibilityResult;
  readonly mutation: {
    readonly mutated: boolean;
    readonly visibleExplanation?: string;
    readonly source?: CharacterOriginV02DestinyMutationSource;
  };
  readonly synergyTags: readonly string[];
  readonly synergyWarnings: readonly string[];
  readonly conflictWarnings: readonly string[];
  readonly conflictSynergy: CharacterOriginV02DestinyConflictSynergyResult;
  readonly lifeImpactHookTags: readonly string[];
  readonly lifeManifestationHooks: readonly DestinyLifeManifestationProjectedHook[];
  readonly modeProjectionTags: readonly string[];
  readonly modeProjectionHooks: DestinyEffectsProjection;
}

export interface CharacterOriginV02CarriedItemLifecycleSummary {
  readonly items: readonly {
    readonly itemId: string;
    readonly name: string;
    readonly lifecycleStage: string;
    readonly lifecycleText: string;
    readonly affinity: number;
    readonly affinityBand: "dormant" | "warm" | "resonant" | "bound";
    readonly converted: boolean;
    readonly publicOmenText: string;
    readonly lifeEventTags: readonly string[];
    readonly monthlyEventHooks: readonly string[];
    readonly majorChoiceHooks: readonly string[];
    readonly interludeHooks: readonly string[];
    readonly age18Hooks: readonly string[];
    readonly narrativeChainRefs: readonly string[];
  }[];
}

export interface CharacterOriginV02LifeStorylineInitialScores {
  readonly source: string;
  readonly storylines: readonly {
    readonly storylineId: string;
    readonly label: string;
    readonly score: number;
    readonly status: CharacterOriginV02StorylineStatus;
    readonly tags: readonly string[];
  }[];
  readonly monthlyEventTags: readonly string[];
  readonly majorChoiceTags: readonly string[];
  readonly debug?: {
    readonly source: string;
    readonly signalTags: readonly string[];
    readonly scoreBreakdownByStoryline: Readonly<Record<string, readonly { readonly source: string; readonly weight: number; readonly note?: string }[]>>;
  };
}

export interface CharacterOriginState {
  readonly characterId: string;
  readonly name: string;
  readonly appearance: CharacterAppearanceState;
  readonly coreStats: CoreThreeTreasures;
  readonly aptitude: AptitudeStats;
  readonly spiritualRoot: SpiritualRootState;
  readonly openingInnateDraft: OpeningInnateDraft;
  readonly destinies: DestinySelectionState;
  readonly originFate: OriginFateDraft;
  readonly originFateNarrativeState?: OriginFateNarrativeStateV02;
  readonly background: BackgroundOriginState;
  readonly hiddenFate: HiddenFateState;
  readonly carriedItems: readonly CarriedItemDraft[];
  readonly destinyEvaluationResults?: readonly CharacterOriginV02DestinyEvaluationResult[];
  readonly carriedItemLifecycleSummary?: CharacterOriginV02CarriedItemLifecycleSummary;
  readonly lifeStorylineInitialScores?: CharacterOriginV02LifeStorylineInitialScores;
  readonly attributeLock: boolean;
  readonly spiritualRootLock: boolean;
  readonly confirmedAtMs: number;
}

export interface LifeSimulationProgressState {
  readonly ageMonths: number;
  readonly completed: boolean;
  readonly monthlyLogIds: readonly string[];
  readonly majorChoiceRecords: readonly string[];
}

export interface CharacterCreationDataBundle {
  readonly spiritualRoots: readonly SpiritualRootDefinition[];
  readonly destinyTraits: readonly DestinyTraitDefinition[];
  readonly backgrounds: readonly BackgroundOriginDefinition[];
  readonly hiddenFates: readonly HiddenFateDefinition[];
}
