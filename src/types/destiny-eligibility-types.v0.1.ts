export type Id = string;

export type DestinyQuality =
  | "mortal"
  | "good"
  | "rare"
  | "arcane"
  | "earth"
  | "heaven"
  | "reversal"
  | "forbidden"
  | "flaw";

export type DestinyKind = "destiny" | "flaw" | "mutated";
export type DestinySlot = "main" | "secondary" | "flaw" | "mutated";

export interface NinePalaceInputSnapshot {
  jing: number;
  qi: number;
  shen: number;
  rootBone: number;
  comprehension: number;
  inspiration: number;
  fortune: number;
  heart: number;
  lifespan: number;
  tags: readonly string[];
}

export interface NinePalaceDerivedScores {
  talentScore: number;
  vesselScore: number;
  stabilityScore: number;
  destinyPressureScore: number;
  lateBloomScore: number;
  rebellionScore: number;
}

export type DestinyEligibilityBaseAttributes = Omit<NinePalaceInputSnapshot, "tags">;
export type DestinyEligibilityExtraAttributeId = "merit" | "karma";
export type DestinyEligibilityAttributeId =
  | keyof DestinyEligibilityBaseAttributes
  | DestinyEligibilityExtraAttributeId;

export type EligibilityExpression =
  | { readonly attr: DestinyEligibilityAttributeId; readonly gte?: number; readonly lte?: number; readonly note?: string }
  | { readonly score: keyof NinePalaceDerivedScores; readonly gte?: number; readonly lte?: number; readonly note?: string }
  | { readonly tag: string; readonly note?: string }
  | { readonly id: Id; readonly note?: string; readonly severity?: "hard" | "soft" }
  | { readonly flaw: Id; readonly note?: string }
  | { readonly sumAttrs: readonly DestinyEligibilityAttributeId[]; readonly gte?: number; readonly lte?: number; readonly note?: string }
  | { readonly all: readonly EligibilityExpression[]; readonly note?: string };

export interface DestinyEligibilityEvaluationInput {
  readonly attributes: DestinyEligibilityBaseAttributes;
  readonly derivedScores: NinePalaceDerivedScores;
  readonly tags: readonly string[];
  readonly selectedDestinyIds?: readonly Id[];
  readonly selectedFlawIds?: readonly Id[];
  readonly extraAttributes?: Readonly<Record<string, number>>;
}

export interface DestinyEligibilityRule {
  readonly any?: readonly EligibilityExpression[];
  readonly all?: readonly EligibilityExpression[];
  readonly supportAny?: readonly EligibilityExpression[];
  readonly anti?: readonly EligibilityExpression[];
  readonly sourceMutationOf?: readonly Id[];
}

export interface DestinyMutationRule {
  readonly antiResult?: Id;
  readonly weakSupportResult?: Id;
  readonly sourceConflictResult?: Id;
}

export interface DestinyEffectsProjection {
  readonly lifeSim?: readonly string[];
  readonly outerBattlefield?: readonly string[];
  readonly outgame?: readonly string[];
  readonly horde?: readonly string[];
  readonly deckbuilder?: readonly string[];
  readonly autochess?: readonly string[];
}

export interface DestinyDefinitionV2 {
  readonly id: Id;
  readonly name: string;
  readonly quality: DestinyQuality;
  readonly kind: DestinyKind;
  readonly allowedSlots: readonly DestinySlot[];
  readonly tags: readonly string[];
  readonly oneLine: string;
  readonly description: string;
  readonly eligibility: DestinyEligibilityRule;
  readonly mutation?: DestinyMutationRule;
  readonly effects: DestinyEffectsProjection;
}

export interface DestinyEligibilityResult {
  readonly destinyId: Id;
  readonly eligible: boolean;
  readonly supportLevel: "none" | "weak" | "normal" | "strong";
  readonly antiMatched: readonly EligibilityExpression[];
  readonly supportMatched: readonly EligibilityExpression[];
  readonly reasonTags: readonly string[];
  readonly mutationCandidate?: Id;
}

export interface HardConflictRule {
  readonly a: Id;
  readonly b: Id;
  readonly mutation?: Id;
  readonly reason: string;
}

export interface SoftConflictRule {
  readonly a: Id;
  readonly b: Id;
  readonly warning: string;
}

export interface DestinySynergyRule {
  readonly ids: readonly Id[];
  readonly name: string;
  readonly effectTags: readonly string[];
  readonly warning?: string;
}

export interface DestinyConflictSynergyResult {
  readonly finalDestinyIds: readonly Id[];
  readonly removedDestinyIds: readonly Id[];
  readonly mutatedDestinyIds: readonly Id[];
  readonly warnings: readonly string[];
  readonly synergies: readonly DestinySynergyRule[];
}

export interface DestinyManifestationEventHook {
  readonly phase: string;
  readonly hook: string;
  readonly visible: string;
}

export interface DestinyManifestationDefinition {
  readonly destinyId: Id;
  readonly events: readonly DestinyManifestationEventHook[];
}

export interface CoreDestinyDefinitionsDataFile {
  readonly version: string;
  readonly description: string;
  readonly destinies: readonly DestinyDefinitionV2[];
}

export interface DestinyV2ConflictSynergyMutationRulesDataFile {
  readonly version: string;
  readonly hardConflicts: readonly HardConflictRule[];
  readonly softConflicts: readonly SoftConflictRule[];
  readonly synergies: readonly DestinySynergyRule[];
}

export type LifeManifestationPhaseId =
  | "infant_0_3"
  | "child_4_8"
  | "juvenile_9_13"
  | "youth_14_17"
  | "adult_18";

export interface LifeManifestationHooksDataFile {
  readonly version: string;
  readonly phaseManifestationRules: Readonly<Record<LifeManifestationPhaseId, string>>;
  readonly destinyManifestations: readonly DestinyManifestationDefinition[];
}

export interface DestinyModeProjectionDefinition extends DestinyEffectsProjection {
  readonly destinyId: Id;
}

export interface ModeProjectionHooksDataFile {
  readonly version: string;
  readonly modeProjectionPrinciple: string;
  readonly projections: readonly DestinyModeProjectionDefinition[];
}

export interface DestinyV2DataBundle {
  readonly coreDestinyDefinitions?: CoreDestinyDefinitionsDataFile;
  readonly conflictSynergyMutationRules?: DestinyV2ConflictSynergyMutationRulesDataFile;
  readonly lifeManifestationHooks?: LifeManifestationHooksDataFile;
  readonly modeProjectionHooks?: ModeProjectionHooksDataFile;
}
