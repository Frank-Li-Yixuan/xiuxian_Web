export type Id = string;

export type HiddenFateCategory =
  | "bloodline"
  | "pastLife"
  | "curseSeal"
  | "karmicSeed"
  | "systemResonance"
  | "karmicObject";

export type OriginRarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";

export interface WeightedModifier {
  readonly conditionTag: string;
  readonly delta: number;
}

export interface BackgroundOriginDefinition {
  readonly id: Id;
  readonly name: string;
  readonly rarity: OriginRarity;
  readonly baseWeight: number;
  readonly visibleDescription: string;
  readonly toneTags: readonly string[];
  readonly statBias: Readonly<Record<string, number>>;
  readonly coreSeedBias: Readonly<Record<string, number>>;
  readonly lifeEventBiasTags: readonly string[];
  readonly hiddenFateBiasTags: readonly string[];
  readonly carriedItemBiasTags: readonly string[];
  readonly startingResourceBias: Readonly<Record<string, number>>;
  readonly relationshipSeed: {
    readonly familyBond: number;
    readonly villageBond: number;
    readonly mentorBond: number;
  };
  readonly modeBiasTags: readonly string[];
}

export interface HiddenFateProgressSource {
  readonly sourceTag: string;
  readonly delta: number;
}

export interface HiddenFateThresholds {
  readonly hintOnly: number;
  readonly suspicious: number;
  readonly halfAwakened: number;
  readonly awakened: number;
}

export interface HiddenFateModeEffect {
  readonly threshold: number;
  readonly effect: string;
}

export interface HiddenFateDefinition {
  readonly id: Id;
  readonly trueName: string;
  readonly category: HiddenFateCategory;
  readonly rarity: OriginRarity;
  readonly baseWeight: number;
  readonly biasTags: readonly string[];
  readonly antiBiasTags: readonly string[];
  readonly initialProgressRange: readonly [number, number];
  readonly omenHints: readonly string[];
  readonly visibleRiskHint: string;
  readonly progressSources: readonly HiddenFateProgressSource[];
  readonly revealThresholds: HiddenFateThresholds;
  readonly lifeEventBiasTags: readonly string[];
  readonly outerBattlefieldEffects: readonly HiddenFateModeEffect[];
  readonly dongfuHooks: readonly string[];
}

export type CarriedItemConversionType =
  | "artifact_clue"
  | "treasure_fragment"
  | "dongfu_building_bonus"
  | "spell_clue"
  | "talisman"
  | "forbidden_clue"
  | "karmic_memory"
  | "fortune_token"
  | "combat_training"
  | "ritual_clue"
  | "method_clue"
  | "minor_treasure_clue";

export interface CarriedItemConversion {
  readonly type: CarriedItemConversionType;
  readonly label: string;
  readonly outerBattlefieldEffect: string;
  readonly dongfuHook: string;
}

export interface CarriedItemDefinition {
  readonly id: Id;
  readonly name: string;
  readonly rarity: OriginRarity;
  readonly baseWeight: number;
  readonly visibleDescription: string;
  readonly biasTags: readonly string[];
  readonly hiddenFateSynergyTags: readonly string[];
  readonly lifeEventTags: readonly string[];
  readonly eighteenConversion: CarriedItemConversion;
}

export interface OriginFateDataFileHeader {
  readonly version: string;
  readonly namespace: string;
  readonly description: string;
}

export interface BackgroundOriginDataFile extends OriginFateDataFileHeader {
  readonly origins: readonly BackgroundOriginDefinition[];
}

export interface HiddenFateDataFile extends OriginFateDataFileHeader {
  readonly hiddenFates: readonly HiddenFateDefinition[];
}

export interface CarriedItemDataFile extends OriginFateDataFileHeader {
  readonly items: readonly CarriedItemDefinition[];
}

export interface OriginFateProgressRollRules {
  readonly defaultRange: readonly [number, number];
  readonly minimum: number;
  readonly maximum: number;
  readonly rareHighProgressChance: number;
  readonly rareHighProgressRange: readonly [number, number];
}

export interface OriginFateBackgroundOriginGenerationRules {
  readonly count: number;
  readonly weightFormula: string;
  readonly lockable: boolean;
  readonly rerollKeepsIfLocked: boolean;
  readonly minimumVisibleVariety: boolean;
}

export interface OriginFateHiddenFateGenerationRules {
  readonly count: number;
  readonly alwaysGenerateInternally: boolean;
  readonly displayPolicy: string;
  readonly defaultRevealName: boolean;
  readonly baseChanceToHaveStrongHiddenFate: number;
  readonly chanceModifiers: readonly WeightedModifier[];
  readonly progressRoll: OriginFateProgressRollRules;
  readonly lockable: boolean | string;
  readonly rerollKeepsIfLocked: boolean;
}

export interface OriginFateCarriedItemsGenerationRules {
  readonly minCount: number;
  readonly maxCount: number;
  readonly secondItemBaseChance: number;
  readonly secondItemChanceModifiers: readonly WeightedModifier[];
  readonly weightFormula: string;
  readonly lockable: boolean;
  readonly allowDuplicates: boolean;
}

export interface OriginFateVisibleOmenRules {
  readonly maxHintsShown: number;
  readonly showRiskHint: boolean;
  readonly neverShowTrueHiddenFateName: boolean;
  readonly hintSelection: string;
}

export interface OriginFateDeterminismRules {
  readonly randomSource: string;
  readonly forbidMathRandom: boolean;
  readonly sameSeedSameLocksSameRerollIndexMustMatch: boolean;
}

export interface OriginFateUiSummaryProgressLevel {
  readonly id: HiddenFateVagueLevel;
  readonly range: readonly [number, number];
  readonly label: string;
}

export interface OriginFateUiSummaryRules {
  readonly showBackgroundOriginName: boolean;
  readonly showBackgroundOriginDescription: boolean;
  readonly showHiddenOmen: boolean;
  readonly showHiddenProgress: string;
  readonly hiddenProgressLevels: readonly OriginFateUiSummaryProgressLevel[];
  readonly showCarriedItems: boolean;
  readonly showConversionPreview: string;
}

export interface OriginFateGenerationRulesDataFile extends OriginFateDataFileHeader {
  readonly pipeline: readonly string[];
  readonly backgroundOrigin: OriginFateBackgroundOriginGenerationRules;
  readonly hiddenFate: OriginFateHiddenFateGenerationRules;
  readonly carriedItems: OriginFateCarriedItemsGenerationRules;
  readonly visibleOmen: OriginFateVisibleOmenRules;
  readonly determinism: OriginFateDeterminismRules;
  readonly uiSummary: OriginFateUiSummaryRules;
}

export type OriginFateRevealBandId = "hintOnly" | "suspicious" | "halfAwakened" | "awakened";

export interface OriginFateRevealProgressBand {
  readonly id: OriginFateRevealBandId;
  readonly range: readonly [number, number];
  readonly uiLabel: string;
  readonly canRevealTrueName: boolean | string;
  readonly description: string;
}

export interface OriginFateRevealUiTextRules {
  readonly forbiddenAtCreation: readonly string[];
  readonly allowedAtCreation: readonly string[];
  readonly allowedAfterAge18: readonly string[];
}

export interface OriginFateDivinationRule {
  readonly cost: string;
  readonly effect: string;
  readonly doesNotRevealTrueName?: boolean;
  readonly doesNotRevealTrueNameAtCreation?: boolean;
}

export interface OriginFateAge18RevealFormula {
  readonly baseRevealChanceByBand: Readonly<Record<OriginFateRevealBandId, number>>;
  readonly modifiers: readonly {
    readonly condition: string;
    readonly delta: number;
  }[];
}

export interface OriginFateRevealRulesDataFile extends OriginFateDataFileHeader {
  readonly progressBands: readonly OriginFateRevealProgressBand[];
  readonly uiTextRules: OriginFateRevealUiTextRules;
  readonly divinationRules: Readonly<Record<string, OriginFateDivinationRule>>;
  readonly age18RevealFormula: OriginFateAge18RevealFormula;
}

export interface OriginFateDataBundle {
  readonly backgroundOrigins?: BackgroundOriginDataFile;
  readonly hiddenFates?: HiddenFateDataFile;
  readonly carriedItems?: CarriedItemDataFile;
  readonly generationRules?: OriginFateGenerationRulesDataFile;
  readonly revealRules?: OriginFateRevealRulesDataFile;
}

export type HiddenFateVagueLevel = "faint" | "stirring" | "nearAwakened" | "awakened";

export interface VisibleHiddenOmen {
  readonly vagueLevel: HiddenFateVagueLevel;
  readonly levelLabel: string;
  readonly hints: readonly string[];
  readonly riskHint: string;
  readonly revealedCategory?: HiddenFateCategory;
  readonly relatedTags?: readonly string[];
}

export interface OriginFateLocks {
  readonly backgroundOriginId?: Id;
  readonly carriedItemIds?: readonly Id[];
  readonly hiddenFateId?: Id;
  readonly hiddenFateUnlockedByDivination?: boolean;
}

export interface OriginFateGenerationContext {
  readonly seed: string;
  readonly rerollIndex: number;
  readonly openingTags: readonly string[];
  readonly destinyTags: readonly string[];
  readonly spiritualRootTags: readonly string[];
  readonly aptitudeTags: readonly string[];
  readonly locks?: OriginFateLocks;
  readonly divinationTokens?: number;
}

export interface BackgroundOriginResult {
  readonly originId: Id;
  readonly name: string;
  readonly visibleDescription: string;
  readonly appliedWeight: number;
  readonly matchedTags: readonly string[];
}

export interface BackgroundOriginGenerationResult {
  readonly result: BackgroundOriginResult;
  readonly debug: {
    readonly candidateWeights: readonly WeightedCandidateDebug[];
  };
}

export interface HiddenFateResultInternal {
  readonly hiddenFateId: Id;
  readonly trueName: string;
  readonly category: HiddenFateCategory;
  readonly progress: number;
  readonly progressBand: HiddenFateVagueLevel;
  readonly matchedTags: readonly string[];
  readonly appliedWeight: number;
}

export interface HiddenFateGenerationResult {
  readonly internal: HiddenFateResultInternal;
  readonly visibleOmen: VisibleHiddenOmen;
  readonly debug: {
    readonly candidateWeights: readonly WeightedCandidateDebug[];
  };
}

export interface CarriedItemResult {
  readonly itemId: Id;
  readonly name: string;
  readonly visibleDescription: string;
  readonly conversion: CarriedItemConversion;
  readonly matchedTags: readonly string[];
  readonly appliedWeight: number;
}

export interface CarriedItemsGenerationResult {
  readonly items: readonly CarriedItemResult[];
  readonly debug: {
    readonly candidateWeights: readonly WeightedCandidateDebug[];
    readonly secondItemChance: number;
  };
}

export interface OriginFateDraft {
  readonly draftId: Id;
  readonly seed: string;
  readonly rerollIndex: number;
  readonly backgroundOrigin: BackgroundOriginResult;
  /** Internal only. Do not expose trueName in creation UI. */
  readonly hiddenFateInternal: HiddenFateResultInternal;
  readonly visibleHiddenOmen: VisibleHiddenOmen;
  readonly carriedItems: readonly CarriedItemResult[];
  readonly lifeEventBiasTags: readonly string[];
  readonly modeProjectionTags: readonly string[];
  readonly age18ConversionHooks: readonly string[];
  readonly debug?: OriginFateRollDebugInfo;
}

export interface OriginFateRollDebugInfo {
  readonly backgroundCandidateWeights: readonly WeightedCandidateDebug[];
  readonly hiddenFateCandidateWeights: readonly WeightedCandidateDebug[];
  readonly carriedItemCandidateWeights: readonly WeightedCandidateDebug[];
}

export interface WeightedCandidateDebug {
  readonly id: Id;
  readonly weight: number;
  readonly matchedTags: readonly string[];
}

export interface RevealedHiddenFate {
  readonly hiddenFateId: Id;
  readonly trueName: string;
  readonly category: HiddenFateCategory;
  readonly progress: number;
  readonly revealReason: string;
  readonly effects: readonly string[];
}

export interface ConvertedCarriedItem {
  readonly itemId: Id;
  readonly sourceName: string;
  readonly conversionType: CarriedItemConversionType;
  readonly label: string;
  readonly outerBattlefieldEffect: string;
  readonly dongfuHook: string;
}

export interface Age18OriginFateResolution {
  readonly revealedHiddenFate?: RevealedHiddenFate;
  readonly convertedItems: readonly ConvertedCarriedItem[];
  readonly outerBattlefieldModifiers: readonly string[];
  readonly dongfuHooks: readonly string[];
  readonly longTermTags: readonly string[];
}
