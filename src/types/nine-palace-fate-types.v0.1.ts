import type {
  DestinyConflictSynergyResult,
  DestinyDefinitionV2,
  DestinyEligibilityEvaluationInput,
  DestinyEligibilityResult as DestinyV2EligibilityResult,
  DestinyMutationResolutionResult,
  HardConflictRule,
  Id,
  SoftConflictRule,
  DestinySynergyRule
} from "./destiny-eligibility-types.v0.1";

export type FateAttributeId =
  | "jing"
  | "qi"
  | "shen"
  | "rootBone"
  | "comprehension"
  | "inspiration"
  | "fortune"
  | "heart"
  | "lifespan";

export type ThreePowerId = "heaven" | "human" | "earth";
export type PolarityId = "yin" | "yang" | "balanced" | "variable" | "hidden";
export type ElementId = "metal" | "wood" | "water" | "fire" | "earth" | "thunder" | "yin";
export type DerivedFateScoreId = keyof DerivedFateScores;
export type NinePalaceFormulaInputId = FateAttributeId | `${FateAttributeId}_inverse`;

export interface NinePalaceAttributes {
  jing: number;
  qi: number;
  shen: number;
  rootBone: number;
  comprehension: number;
  inspiration: number;
  fortune: number;
  heart: number;
  lifespan: number;
}

export interface ThreePowerScores {
  heaven: number;
  human: number;
  earth: number;
}

export interface DerivedFateScores {
  talentScore: number;
  vesselScore: number;
  stabilityScore: number;
  destinyPressureScore: number;
  lateBloomScore: number;
  rebellionScore: number;
}

export interface WuxingInclination {
  metal: number;
  wood: number;
  water: number;
  fire: number;
  earth: number;
  thunder: number;
  yin: number;
}

export interface FateCausalityTags {
  destinyBiasTags: string[];
  lifeEventBiasTags: string[];
  hiddenFateBiasTags: string[];
  rootBiasTags: string[];
  modeBiasTags: string[];
  warnings: string[];
}

export interface NinePalaceEvaluation {
  attributes: NinePalaceAttributes;
  threePowers: ThreePowerScores;
  derived: DerivedFateScores;
  wuxing: WuxingInclination;
  tags: FateCausalityTags;
}

export interface DestinyEligibilityRule {
  id: string;
  name: string;
  archetype: string;
  requiredAny?: NinePalaceCondition[];
  supportAny?: NinePalaceCondition[];
  antiConditions?: NinePalaceCondition[];
  ifContradictedMutateTo?: string;
  isMutation?: boolean;
  lifeEventBias?: string[];
  age18Hooks?: string[];
  reason: string;
}

export interface DestinyEligibilityResult {
  traitId: string;
  eligible: boolean;
  supportScore: number;
  contradictionScore: number;
  mutationTarget?: string;
  explanation: string[];
}

export interface AntiWeirdnessResult {
  originalTraitId: string;
  acceptedTraitId: string;
  action: "accept" | "reject" | "mutate" | "warn";
  warnings: string[];
}

export interface NinePalaceDestinyEngineContext {
  readonly destinyRegistry?: {
    readonly hardConflicts: readonly HardConflictRule[];
    readonly softConflicts: readonly SoftConflictRule[];
    readonly synergies: readonly DestinySynergyRule[];
    getDestiny(id: Id): DestinyDefinitionV2;
  };
  readonly tags?: readonly string[];
  readonly selectedDestinyIds?: readonly Id[];
  readonly selectedFlawIds?: readonly Id[];
  readonly extraAttributes?: DestinyEligibilityEvaluationInput["extraAttributes"];
}

export interface NinePalaceDestinyResolutionResult {
  readonly finalDestinyIds: readonly Id[];
  readonly rerollDestinyIds: readonly Id[];
  readonly eligibilityResults: readonly DestinyEligibilityResult[];
  readonly destinyEligibilityResults: readonly DestinyV2EligibilityResult[];
  readonly mutationResults: readonly DestinyMutationResolutionResult[];
  readonly conflictSynergyResult: DestinyConflictSynergyResult;
  readonly warnings: readonly string[];
  readonly debugTags: readonly string[];
}

export interface NinePalaceCondition {
  score?: DerivedFateScoreId;
  attrs?: Record<string, number | NinePalaceNumericRangeCondition>;
  combined?: Partial<Record<FateAttributeId, number>>;
  tags?: string[];
  gte?: number;
  lte?: number;
}

export interface NinePalaceNumericRangeCondition {
  gte?: number;
  lte?: number;
}

export interface NinePalaceAttributeDefinition {
  id: FateAttributeId;
  name: string;
  palace: ThreePowerId;
  polarity: PolarityId;
  primaryElements: ElementId[];
  keywords: string[];
  lifeUse: string[];
  combatUse: string[];
  badWhenLow: string[];
  badWhenTooHigh: string[];
}

export interface NinePalaceRatingBand {
  min: number;
  max: number;
  label: string;
}

export interface NinePalaceAttributesDataFile {
  version: "0.1";
  id: "nine_palace_attributes";
  note?: string;
  attributes: NinePalaceAttributeDefinition[];
  ratingBands: NinePalaceRatingBand[];
}

export interface ThreePowerRuleDefinition {
  id: ThreePowerId;
  name: string;
  attrs: FateAttributeId[];
  meaning: string;
  scoreFormula: Partial<Record<FateAttributeId, number>>;
}

export interface ThreePowerRuleData {
  name: string;
  attrs: FateAttributeId[];
  meaning: string;
  scoreFormula: Partial<Record<FateAttributeId, number>>;
}

export interface DerivedScoreDefinition {
  id: DerivedFateScoreId;
  formula: Partial<Record<NinePalaceFormulaInputId, number>>;
  meaning: string;
}

export interface DerivedScoreData {
  formula: Partial<Record<NinePalaceFormulaInputId, number>>;
  meaning: string;
}

export interface WuxingMappingDefinition {
  id: ElementId;
  attrs: FateAttributeId[];
  routes: string[];
}

export interface WuxingMappingData {
  attrs: FateAttributeId[];
  routes: string[];
}

export interface ThreePowersYinyangWuxingDataFile {
  version: "0.1";
  id: "three_powers_yinyang_wuxing";
  threePowers: Record<ThreePowerId, ThreePowerRuleData>;
  derivedScores: Record<DerivedFateScoreId, DerivedScoreData>;
  wuxingMapping: Record<ElementId, WuxingMappingData>;
}

export interface DestinyEligibilityRulesDataFile {
  version: "0.1";
  id: "destiny_eligibility_rules";
  note?: string;
  traits: DestinyEligibilityRule[];
}

export interface AttributeGenerationGuideline {
  name: string;
  condition: Record<string, unknown>;
  meaning: string;
}

export interface AttributeAntiWeirdnessRule {
  id: string;
  targetTrait: string;
  badIf: Record<string, unknown>;
  action: "mutate" | "reject" | "warn";
  mutation?: string;
}

export interface AttributeCorrelationRulesDataFile {
  version: "0.1";
  id: "attribute_correlation_rules";
  generationGuidelines: AttributeGenerationGuideline[];
  antiWeirdnessRules: AttributeAntiWeirdnessRule[];
}

export interface AttributeEventBiasRule {
  id: string;
  when: Record<string, unknown>;
  addTags: string[];
  weightBonus: number;
}

export interface AttributeEventBiasRulesDataFile {
  version: "0.1";
  id: "attribute_event_bias_rules";
  note?: string;
  rules: AttributeEventBiasRule[];
}

export interface DestinyRollPolicy {
  candidatePoolRule: string;
  minEligibleMainDestinyCandidates: number;
  maxGenerationAttempts: number;
  fallbackMainDestinyTags: string[];
  mutationChanceWhenContradicted: number;
}

export interface RootRollPolicy {
  spiritualRootShouldUseAttributeSupport: boolean;
  examples: Array<{
    condition: string;
    boost: string[];
  }>;
}

export interface GenerationAlgorithmUpgradeRulesDataFile {
  version: "0.1";
  id: "generation_algorithm_upgrade_rules";
  algorithmSteps: string[];
  destinyRollPolicy: DestinyRollPolicy;
  rootRollPolicy: RootRollPolicy;
}

export interface NinePalaceDataBundle {
  nineAttributes?: NinePalaceAttributesDataFile;
  threePowersYinyangWuxing?: ThreePowersYinyangWuxingDataFile;
  destinyEligibilityRules?: DestinyEligibilityRulesDataFile;
  attributeCorrelationRules?: AttributeCorrelationRulesDataFile;
  attributeEventBiasRules?: AttributeEventBiasRulesDataFile;
  generationAlgorithmUpgradeRules?: GenerationAlgorithmUpgradeRulesDataFile;
}
