import type { DestinySelectionState } from "./character-creation-types.v0.1";
import type { OpeningInnateDraft } from "./opening-generator-types.v0.1";
import type { SeededRng } from "../sim/core/SeededRng";

export type Id = string;

export type HiddenFateCategory =
  | "bloodline"
  | "pastLife"
  | "curseSeal"
  | "karmicSeed"
  | "systemResonance"
  | "karmicObject"
  | "battlefieldEcho"
  | "falseOmen";

export type HiddenFateRarity =
  | "minor"
  | "rare"
  | "epic"
  | "legendary"
  | "forbidden";

export type HiddenFateRevealBand =
  | "seed"
  | "omen"
  | "stirring"
  | "halfReveal"
  | "nearAwake"
  | "awakened";

export interface HiddenFateOmenStageV02 {
  readonly band: HiddenFateRevealBand;
  readonly text: string;
}

export interface HiddenFateDefinitionV02 {
  readonly id: Id;
  readonly trueName: string; // internal only
  readonly publicAlias: string;
  readonly category: HiddenFateCategory;
  readonly rarity: HiddenFateRarity;
  readonly primaryTags: readonly string[];
  readonly antiTags: readonly string[];
  readonly preferredOrigins: readonly Id[];
  readonly preferredRoots: readonly Id[];
  readonly preferredDestinies: readonly Id[];
  readonly preferredItems: readonly Id[];
  readonly omenStages: readonly HiddenFateOmenStageV02[];
  readonly misleadingOmenIds: readonly Id[];
  readonly lifeEventHooks: readonly string[];
  readonly majorChoiceHooks: readonly string[];
  readonly interludeHooks: readonly string[];
  readonly stageTransitionTokens: readonly string[];
  readonly age18Outcomes: readonly Id[];
}

export interface OriginStorylineDefinitionV02 {
  readonly id: Id;
  readonly name: string;
  readonly regionTags: readonly string[];
  readonly narrativeTheme: string;
  readonly storylineBias: readonly Id[];
  readonly earlyEchoEvents: readonly string[];
  readonly childhoodSeedEvents: readonly string[];
  readonly youthConflictEvents: readonly string[];
  readonly teenChoiceEvents: readonly string[];
  readonly hiddenFateBias: readonly Id[];
  readonly carriedItemBias: readonly Id[];
  readonly interludeBias: readonly Id[];
}

export type CarriedItemLifecycleStage =
  | "obtained"
  | "noticed"
  | "resonating"
  | "tested"
  | "damaged"
  | "deepened"
  | "converted"
  | "inherited";

export interface CarriedItemLifecycleEntryV02 {
  readonly stage: CarriedItemLifecycleStage;
  readonly text: string;
}

export interface CarriedItemNarrativeDefinitionV02 {
  readonly id: Id;
  readonly name: string;
  readonly surfaceDescription: string;
  readonly lifecycle: readonly CarriedItemLifecycleEntryV02[];
  readonly preferredOrigins: readonly Id[];
  readonly preferredHiddenFates: readonly Id[];
  readonly preferredDestinies: readonly Id[];
  readonly eventHooks: readonly string[];
  readonly interludeHooks: readonly Id[];
  readonly age18Conversions: readonly Id[];
  readonly dongfuHooks: readonly Id[];
}

export interface HiddenFateNarrativeStateV02 {
  readonly hiddenFateId: Id;
  readonly progress: number;
  readonly revealBand: HiddenFateRevealBand;
  readonly knownToPlayer: boolean;
  readonly trueNameRevealed: boolean;
  readonly misleadingOmenIds: readonly Id[];
  readonly omenHistory: readonly Id[];
  readonly lastProgressMonth?: number;
}

export interface CarriedItemNarrativeStateV02 {
  readonly itemId: Id;
  readonly affinity: number;
  readonly lifecycleStage: CarriedItemLifecycleStage;
  readonly eventHistory: readonly Id[];
  readonly damaged: boolean;
  readonly converted: boolean;
}

export interface CarriedItemLifecycleEngineInput {
  readonly originId: Id;
  readonly hiddenFateIds: readonly Id[];
  readonly selectedDestinyIds?: readonly Id[];
  readonly rng: SeededRng;
  readonly lockedItemIds?: readonly Id[];
}

export interface CarriedItemLifecycleProgressEventV02 {
  readonly id: Id;
  readonly source: string;
  readonly tags: readonly string[];
  readonly itemId?: Id;
  readonly affinityDelta?: number;
  readonly ageMonth?: number;
  readonly damaged?: boolean;
  readonly converted?: boolean;
}

export interface CarriedItemLifecycleCandidateDebugV02 {
  readonly id: Id;
  readonly weight: number;
  readonly initialAffinity: number;
  readonly matchedTags: readonly string[];
  readonly matchedSynergyRuleIds: readonly Id[];
  readonly affinityBonus: number;
  readonly reasons: readonly string[];
}

export interface CarriedItemLifecycleProgressEventDebugV02 {
  readonly eventId: Id;
  readonly itemId: Id;
  readonly appliedDelta: number;
  readonly matchedTags: readonly string[];
  readonly source: string;
  readonly ageMonth?: number;
}

export interface CarriedItemLifecycleGenerationResultV02 {
  readonly items: readonly CarriedItemNarrativeStateV02[];
  readonly debug: {
    readonly candidateWeights: readonly CarriedItemLifecycleCandidateDebugV02[];
  };
}

export interface CarriedItemLifecycleAdvanceResultV02 {
  readonly items: readonly CarriedItemNarrativeStateV02[];
  readonly debug: {
    readonly progressEventsApplied: readonly CarriedItemLifecycleProgressEventDebugV02[];
  };
}

export interface CarriedItemLifecycleHookProjectionV02 {
  readonly itemIds: readonly Id[];
  readonly monthlyEventHooks: readonly string[];
  readonly majorChoiceHooks: readonly string[];
  readonly interludeCandidateBiasTags: readonly string[];
  readonly age18Hooks: readonly string[];
  readonly dongfuHooks: readonly string[];
  readonly debugTags: readonly string[];
}

export interface CarriedItemAge18ConversionInputV02 {
  readonly items: readonly {
    readonly itemId: Id;
    readonly affinity: number;
    readonly lifecycleStage: CarriedItemLifecycleStage;
    readonly damaged: boolean;
    readonly converted: boolean;
    readonly age18Conversions: readonly Id[];
    readonly dongfuHooks: readonly Id[];
  }[];
  readonly debugTags: readonly string[];
}

export interface OriginNarrativeStateV02 {
  readonly originId: Id;
  readonly activeStorylineIds: readonly Id[];
  readonly originThreadProgress: Record<Id, number>;
  readonly familyTie: number;
  readonly worldlyTie: number;
  readonly lifeEventBiasTags: readonly string[];
  readonly carriedItemBias: readonly Id[];
  readonly hiddenFateBias: readonly Id[];
  readonly regionTags: readonly string[];
  readonly interludeBiasTags: readonly Id[];
  readonly eventPhaseSeeds: OriginNarrativeEventPhaseSeedsV02;
  readonly canonicalLifeStorylineIds: readonly Id[];
  readonly debug?: OriginNarrativeDebugMetadataV02;
}

export interface OriginNarrativeEventPhaseSeedsV02 {
  readonly earlyEcho: readonly string[];
  readonly childhoodSeed: readonly string[];
  readonly youthConflict: readonly string[];
  readonly teenChoice: readonly string[];
}

export interface OriginNarrativeEngineInput {
  readonly originId: Id;
  readonly matchedTags?: readonly string[];
  readonly activeStorylineIds?: readonly Id[];
  readonly progressEvents?: readonly OriginNarrativeProgressEventV02[];
  readonly currentMonth?: number;
}

export interface OriginNarrativeProgressEventV02 {
  readonly id: Id;
  readonly source: string;
  readonly tags: readonly string[];
  readonly storylineId?: Id;
  readonly threadId?: Id;
  readonly progressDelta?: number;
  readonly ageMonth?: number;
}

export interface OriginNarrativeProgressEventDebugV02 {
  readonly eventId: Id;
  readonly storylineId: Id;
  readonly appliedDelta: number;
  readonly matchedTags: readonly string[];
  readonly source: string;
  readonly ageMonth?: number;
}

export interface OriginNarrativeCanonicalAliasDebugV02 {
  readonly rawStorylineId: Id;
  readonly canonicalLifeStorylineId: Id;
}

export interface OriginNarrativeDebugMetadataV02 {
  readonly contextTags: readonly string[];
  readonly progressEventsApplied: readonly OriginNarrativeProgressEventDebugV02[];
  readonly canonicalAliasMappings: readonly OriginNarrativeCanonicalAliasDebugV02[];
}

export interface OriginNarrativeLifeContextV02 {
  readonly originId: Id;
  readonly regionTags: readonly string[];
  readonly activeStorylineIds: readonly Id[];
  readonly canonicalLifeStorylineIds: readonly Id[];
  readonly originThreadProgress: Readonly<Record<Id, number>>;
  readonly storylineBias: readonly Id[];
  readonly carriedItemBias: readonly Id[];
  readonly hiddenFateBias: readonly Id[];
  readonly lifeEventBiasTags: readonly string[];
  readonly monthlyEventTags: readonly string[];
  readonly majorChoiceTags: readonly string[];
  readonly interludeBiasTags: readonly string[];
  readonly eventPhaseTags: readonly string[];
  readonly originBiasTags: readonly string[];
  readonly debugTags: readonly string[];
}

export interface OriginFateNarrativeStateV02 {
  readonly origin: OriginNarrativeStateV02;
  readonly hiddenFates: readonly HiddenFateNarrativeStateV02[];
  readonly carriedItems: readonly CarriedItemNarrativeStateV02[];
  readonly visibleOmenLines: readonly string[];
  readonly lifeEventBiasTags: readonly string[];
  readonly majorChoiceSignals: readonly string[];
  readonly interludeBiasTags: readonly string[];
  readonly stageTransitionTokens: readonly string[];
  readonly age18Hooks: readonly string[];
  readonly debug?: HiddenFateNarrativeDebugMetadataV02;
}

export interface OriginFateNarrativeLifeEventSummary {
  readonly originId: Id;
  readonly activeStorylineIds: readonly Id[];
  readonly canonicalLifeStorylineIds: readonly Id[];
  readonly hiddenFateIds: readonly Id[];
  readonly carriedItemIds: readonly Id[];
  readonly hiddenFateProgress: Readonly<Record<Id, number>>;
  readonly hiddenFateBands: Readonly<Record<Id, HiddenFateRevealBand>>;
  readonly lifeEventBiasTags: readonly string[];
  readonly originRegionTags: readonly string[];
  readonly carriedItemMonthlyHooks: readonly string[];
  readonly majorChoiceSignals: readonly string[];
  readonly carriedItemMajorChoiceHooks: readonly string[];
  readonly interludeBiasTags: readonly string[];
  readonly stageTransitionTokens: readonly string[];
  readonly age18Hooks: readonly string[];
  readonly monthlyLogOmenLines: readonly string[];
  readonly debugTags: readonly string[];
}

export interface OriginFateNarrativeLifeEventContext {
  readonly ageMonths?: number;
  readonly openingTags: readonly string[];
  readonly destinyTags: readonly string[];
  readonly originFateTags: readonly string[];
  readonly carriedItemTags: readonly string[];
  readonly allTags: readonly string[];
  readonly hiddenFateProgress: Readonly<Record<Id, number>>;
  readonly hiddenFateBands: Readonly<Record<Id, HiddenFateRevealBand>>;
  readonly monthlyLogOmenLines: readonly string[];
  readonly summary: OriginFateNarrativeLifeEventSummary;
}

export interface OriginFateNarrativeStageTransitionContext {
  readonly originId: Id;
  readonly hiddenFateIds: readonly Id[];
  readonly carriedItemIds: readonly Id[];
  readonly hiddenFateBands: Readonly<Record<Id, HiddenFateRevealBand>>;
  readonly stageTransitionTokens: readonly string[];
  readonly age18Hooks: readonly string[];
  readonly debugTags: readonly string[];
}

export interface OriginStorylineResultV02 {
  readonly originId: Id;
  readonly activeStorylineIds?: readonly Id[];
  readonly matchedTags: readonly string[];
}

export interface HiddenFateNarrativeProgressEventV02 {
  readonly id: Id;
  readonly source: string;
  readonly tags: readonly string[];
  readonly hiddenFateId?: Id;
  readonly progressDelta?: number;
  readonly ageMonth?: number;
}

export interface HiddenFateNarrativeEngineInput {
  readonly openingInnateDraft: OpeningInnateDraft;
  readonly destinies: DestinySelectionState;
  readonly originStoryline: OriginStorylineResultV02;
  readonly carriedItems: readonly CarriedItemNarrativeStateV02[];
  readonly rng: SeededRng;
  readonly previousHiddenFates?: readonly HiddenFateNarrativeStateV02[];
  readonly progressEvents?: readonly HiddenFateNarrativeProgressEventV02[];
  readonly currentMonth?: number;
  readonly maxVisibleOmenLines?: number;
}

export interface HiddenFateNarrativeCandidateDebugV02 {
  readonly id: Id;
  readonly weight: number;
  readonly matchedTags: readonly string[];
  readonly antiMatchedTags: readonly string[];
  readonly matchedSynergyRuleIds: readonly Id[];
  readonly progressBonus: number;
  readonly itemAffinityTags: readonly string[];
  readonly reasons: readonly string[];
}

export interface HiddenFateNarrativeProgressEventDebugV02 {
  readonly eventId: Id;
  readonly hiddenFateId: Id;
  readonly appliedDelta: number;
  readonly matchedTags: readonly string[];
  readonly source: string;
}

export interface HiddenFateNarrativeDebugMetadataV02 {
  readonly candidateWeights: readonly HiddenFateNarrativeCandidateDebugV02[];
  readonly selectedHiddenFateIds: readonly Id[];
  readonly contextTags: readonly string[];
  readonly progressEventsApplied: readonly HiddenFateNarrativeProgressEventDebugV02[];
  readonly safeOmenSourceIds: readonly Id[];
}

export interface Age18OriginFateInputV02 {
  readonly originNarrativeState: OriginNarrativeStateV02;
  readonly hiddenFateStates: readonly HiddenFateNarrativeStateV02[];
  readonly carriedItemStates: readonly CarriedItemNarrativeStateV02[];
  readonly revealHistory: readonly Id[];
  readonly misleadingOmenHistory: readonly Id[];
  readonly keyChoiceRecords: readonly Id[];
  readonly keyInterludeRecords: readonly Id[];
  readonly traceRecords?: readonly OriginFateAge18TraceRecordV02[];
}

export interface OriginFateAge18TraceRecordV02 {
  readonly id: Id;
  readonly source:
    | "origin_state"
    | "hidden_fate_state"
    | "carried_item_state"
    | "life_event"
    | "key_choice"
    | "interlude"
    | "reveal_history"
    | "misdirection";
  readonly tags: readonly string[];
  readonly ageMonth?: number;
}

export interface Age18RevealedHiddenFateV02 {
  readonly hiddenFateId: Id;
  readonly revealBand: HiddenFateRevealBand;
  readonly publicAlias: string;
  readonly revealedName?: string;
  readonly age18OutcomeIds: readonly Id[];
  readonly stageTransitionTokens: readonly Id[];
  readonly clueLines: readonly string[];
  readonly traceRecordIds: readonly Id[];
}

export interface Age18SealedHiddenFateV02 {
  readonly hiddenFateId: Id;
  readonly revealBand: HiddenFateRevealBand;
  readonly publicAlias: string;
  readonly age18OutcomeIds: readonly Id[];
  readonly stageTransitionTokens: readonly Id[];
  readonly clueLines: readonly string[];
  readonly traceRecordIds: readonly Id[];
}

export interface Age18ConvertedCarriedItemV02 {
  readonly itemId: Id;
  readonly affinity: number;
  readonly lifecycleStage: CarriedItemLifecycleStage;
  readonly conversionIds: readonly Id[];
  readonly dongfuHooks: readonly Id[];
  readonly traceRecordIds: readonly Id[];
}

export interface Age18OriginFateResolutionV02 {
  readonly revealedHiddenFates: readonly Age18RevealedHiddenFateV02[];
  readonly sealedHiddenFates: readonly Age18SealedHiddenFateV02[];
  readonly convertedCarriedItems: readonly Age18ConvertedCarriedItemV02[];
  readonly outerBattlefieldModifiers: readonly string[];
  readonly dongfuHooks: readonly Id[];
  readonly longTermTags: readonly string[];
  readonly traceability: readonly OriginFateAge18TraceRecordV02[];
  readonly debugTags: readonly string[];
}

export interface OriginFateNarrativeRevealBandRuleV02 {
  readonly id: HiddenFateRevealBand;
  readonly min: number;
  readonly max: number;
  readonly uiLabel: string;
  readonly canShowTrueName: boolean;
}

export interface OriginFateNarrativeRevealPolicyV02 {
  readonly allowTrueName: boolean;
  readonly allowExactProgress: boolean;
  readonly allowVagueBand?: boolean;
  readonly maxOmenLines?: number;
  readonly allowDestinyOptionHint?: boolean;
  readonly allowResolution?: boolean;
}

export type OriginFateRevealSurfaceV02 = "characterCreation" | "monthlyLog" | "majorChoice" | "age18";

export interface OriginFateRevealMisdirectionContextV02 {
  readonly surface: OriginFateRevealSurfaceV02;
  readonly signalTags?: readonly string[];
  readonly maxOmenLines?: number;
  readonly age18Resolved?: boolean;
}

export interface OriginFateMisdirectionCandidateV02 {
  readonly ruleId: Id;
  readonly signals: readonly string[];
  readonly matchedSignals: readonly string[];
  readonly possibleTruthIds: readonly Id[];
  readonly debugTags: readonly string[];
}

export interface OriginFatePublicOmenViewV02 {
  readonly surface: OriginFateRevealSurfaceV02;
  readonly revealBand?: HiddenFateRevealBand;
  readonly revealBandLabel?: string;
  readonly exactProgress?: number;
  readonly omenLines: readonly string[];
  readonly misdirectionLines: readonly string[];
  readonly destinyOptionHints: readonly string[];
  readonly revealedName?: string;
  readonly canRevealName: boolean;
  readonly debugTags: readonly string[];
}

export interface OriginFateNarrativeMisdirectionRuleV02 {
  readonly id: Id;
  readonly signals: readonly string[];
  readonly possibleTruths: readonly Id[];
}

export interface RevealStageRulesDataFileV02 {
  readonly version: "0.2";
  readonly progressBands: readonly OriginFateNarrativeRevealBandRuleV02[];
  readonly revealPolicies: Readonly<Record<string, OriginFateNarrativeRevealPolicyV02>>;
  readonly misdirectionRules: readonly OriginFateNarrativeMisdirectionRuleV02[];
}

export interface OmenPhraseDefinitionV02 {
  readonly id: Id;
  readonly tags: readonly string[];
  readonly text: string;
}

export interface OmenPhraseBankDataFileV02 {
  readonly version: "0.2";
  readonly phrases: readonly OmenPhraseDefinitionV02[];
}

export type OriginFateNarrativeSynergyEffectType =
  | "progressBonus"
  | "itemAffinityBonus"
  | "unlockThread"
  | "riskBonus"
  | "age18Hook";

export interface OriginFateNarrativeSynergyEffectV02 {
  readonly type: OriginFateNarrativeSynergyEffectType;
  readonly target: Id;
  readonly value?: number;
}

export interface OriginItemHiddenSynergyRuleV02 {
  readonly id: Id;
  readonly originId: Id;
  readonly itemId: Id;
  readonly hiddenFateId: Id;
  readonly effects: readonly OriginFateNarrativeSynergyEffectV02[];
}

export interface OriginItemHiddenSynergyRulesDataFileV02 {
  readonly version: "0.2";
  readonly rules: readonly OriginItemHiddenSynergyRuleV02[];
}

export type HiddenFateDefinitionsDataFileV02 = readonly HiddenFateDefinitionV02[];
export type OriginStorylineDefinitionsDataFileV02 = readonly OriginStorylineDefinitionV02[];
export type CarriedItemNarrativeChainsDataFileV02 = readonly CarriedItemNarrativeDefinitionV02[];

export interface OriginFateNarrativeDataBundle {
  readonly hiddenFates?: HiddenFateDefinitionsDataFileV02;
  readonly originStorylines?: OriginStorylineDefinitionsDataFileV02;
  readonly carriedItems?: CarriedItemNarrativeChainsDataFileV02;
  readonly revealStageRules?: RevealStageRulesDataFileV02;
  readonly omenPhraseBank?: OmenPhraseBankDataFileV02;
  readonly synergyRules?: OriginItemHiddenSynergyRulesDataFileV02;
}
