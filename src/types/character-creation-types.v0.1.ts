import type { OpeningInnateDraft } from "./opening-generator-types.v0.1";
import type { OriginFateDraft } from "./origin-fate-types.v0.1";
import type { OriginFateNarrativeStateV02 } from "./origin-fate-narrative-types.v0.2";
import type {
  DestinyLifeManifestationHookProjection
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
