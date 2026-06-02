import type { OpeningInnateDraft } from "./opening-generator-types.v0.1";

export type DestinyQuality =
  | "mortal"
  | "good"
  | "rare"
  | "mystic"
  | "earthly"
  | "heavenly"
  | "defiant"
  | "forbidden"
  | "flaw";

export type DestinySlotType = "main" | "secondary" | "flaw" | "hidden";
export type CalamitySeverity = "minor" | "medium" | "major" | "death";

export interface DestinyTraitDefinition {
  readonly id: string;
  readonly name: string;
  readonly quality: DestinyQuality;
  readonly slotTypes: readonly DestinySlotType[];
  readonly calamitySeverity?: CalamitySeverity;
  readonly tags: readonly string[];
  readonly description: string;
  readonly positiveEffects: readonly string[];
  readonly negativeEffects: readonly string[];
  readonly modifiers: Record<string, number | boolean | string>;
  readonly baseWeight: number;
  readonly unlockConditions?: readonly DestinyRequirement[];
  readonly display?: {
    readonly frameAsset?: string;
    readonly iconAsset?: string;
    readonly effectAsset?: string;
  };
}

export interface DestinyRequirement {
  readonly type:
    | "accountAchievement"
    | "metaProgress"
    | "spiritualRootTag"
    | "backgroundTag"
    | "notNewPlayer";
  readonly id?: string;
  readonly value?: number | string | boolean;
}

export interface DestinyConflictRule {
  readonly id: string;
  readonly traits: readonly string[];
  readonly soft?: boolean;
  readonly reason: string;
}

export interface DestinySynergyRule {
  readonly id: string;
  readonly traits: readonly string[];
  readonly name: string;
  readonly description: string;
  readonly effects: readonly string[];
}

export interface CharacterCreationLocks {
  readonly spiritualRoot?: boolean;
  readonly mainDestiny?: boolean;
  readonly secondaryDestiny0?: boolean;
  readonly secondaryDestiny1?: boolean;
  readonly flawDestiny?: boolean;
  readonly backgroundOrigin?: boolean;
  readonly hiddenFateHint?: boolean;
  readonly carriedItem?: boolean;
}

export interface DestinySelectionState {
  readonly main: DestinyTraitDefinition;
  readonly secondary: readonly [DestinyTraitDefinition, DestinyTraitDefinition];
  readonly flaw: DestinyTraitDefinition;
  readonly synergies: readonly DestinySynergyRule[];
  readonly softConflicts: readonly string[];
  readonly synergyWarnings: readonly string[];
  readonly conflictWarnings: readonly string[];
  readonly warnings: readonly string[];
}

export interface FateMeterState {
  readonly value: number;
  readonly lastHighQualityAtReroll?: number;
  readonly guaranteeRareNext: boolean;
}

export interface DestinyRerollSession {
  readonly sessionId: string;
  readonly slotId: string;
  readonly seed: string;
  readonly rerollCount: number;
  readonly locksRemaining: number;
  readonly divinationTokens: number;
  readonly lockedFields: CharacterCreationLocks;
  readonly fateMeter: FateMeterState;
  readonly previousTraitIds: readonly string[];
}

export interface GenerateDestinyDraftInput {
  readonly session: DestinyRerollSession;
  readonly previousDraft?: CharacterCreationDraftLike;
  readonly openingInnateDraft?: Pick<OpeningInnateDraft, "tags">;
  readonly accountMeta?: Record<string, unknown>;
}

export interface CharacterCreationDraftLike {
  readonly draftId: string;
  readonly slotId: string;
  readonly spiritualRootId: string;
  readonly backgroundOriginId: string;
  readonly hiddenFateHintId?: string;
  readonly carriedItemIds: readonly string[];
  readonly destinies: DestinySelectionState;
  readonly locks: CharacterCreationLocks;
  readonly rerollCount: number;
}

export interface DestinyRollDebugInfo {
  readonly attempts: number;
  readonly rejectedByExclusive: readonly string[];
  readonly selectedWeights: Record<string, number>;
  readonly fateMeterBefore: FateMeterState;
  readonly fateMeterAfter: FateMeterState;
}

export interface GenerateDestinyRollInput {
  readonly seed: string;
  readonly draftId: string;
  readonly rerollIndex: number;
  readonly openingInnateDraft?: Pick<OpeningInnateDraft, "tags">;
  readonly locks?: CharacterCreationLocks;
  readonly previousDraft?: DestinyRollDraft;
  readonly fateMeter?: FateMeterState;
  readonly previousTraitIds?: readonly string[];
}

export interface DestinyRollDraft {
  readonly draftId: string;
  readonly seed: string;
  readonly rerollIndex: number;
  readonly destinies: DestinySelectionState;
  readonly fateMeter: FateMeterState;
  readonly locks?: CharacterCreationLocks;
  readonly debug: DestinyRollDebugInfo;
}

export interface DestinyRoller {
  generate(input: GenerateDestinyRollInput): DestinyRollDraft;
}

export type DestinyQualityTableId = Exclude<DestinyQuality, "flaw">;

export interface DestinyQualityDefinition {
  readonly id: DestinyQualityTableId;
  readonly name: string;
  readonly rank: number;
  readonly positiveBudget: readonly [number, number];
  readonly negativeBudget: readonly [number, number];
  readonly frameAsset: string;
  readonly color: string;
}

export interface DestinyQualityTablesDataFile {
  readonly version: string;
  readonly qualities: readonly DestinyQualityDefinition[];
  readonly qualityWeights: {
    readonly main: Readonly<Partial<Record<DestinyQualityTableId, number>>>;
    readonly secondary: Readonly<Partial<Record<DestinyQualityTableId, number>>>;
    readonly flawSeverity: Readonly<Partial<Record<CalamitySeverity, number>>>;
  };
  readonly budgetCostReference: readonly {
    readonly effect: string;
    readonly cost: number | string;
  }[];
}

export type DestinyExclusiveRule = DestinyConflictRule;

export interface DestinyTagConflictRule {
  readonly id: string;
  readonly tags: readonly string[];
  readonly description: string;
}

export interface DestinyConflictSynergyRulesDataFile {
  readonly version: string;
  readonly exclusiveRules: readonly DestinyExclusiveRule[];
  readonly synergyRules: readonly DestinySynergyRule[];
  readonly conflictRules: readonly DestinyTagConflictRule[];
}

export interface DestinyFateMeterRules {
  readonly initial: number;
  readonly noRareOrAboveDelta: number;
  readonly rareDelta: number;
  readonly mysticOrAboveReset: boolean;
  readonly thresholdBoost: number;
  readonly thresholdGuaranteeRare: number;
  readonly boostRule: string;
}

export interface DestinyHighQualityLimits {
  readonly maxEarthlyOrAbovePerDraft: number;
  readonly allowSecondEarthlyOrAboveWithDivination: boolean;
  readonly maxForbiddenPerDraft: number;
}

export interface DestinyRerollHistoryRules {
  readonly recordLast: number;
  readonly repetitionPenalty: number;
}

export interface DestinyRerollRulesDataFile {
  readonly version: string;
  readonly freeReroll: boolean;
  readonly initialLocks: number;
  readonly initialDivinationTokens: number;
  readonly maxLockedFields: number;
  readonly lockableFields: readonly string[];
  readonly advancedLockableFields: readonly string[];
  readonly fateMeter: DestinyFateMeterRules;
  readonly highQualityLimits: DestinyHighQualityLimits;
  readonly rerollHistory: DestinyRerollHistoryRules;
}

export interface DestinyTraitDataFile {
  readonly version: string;
  readonly traits: readonly DestinyTraitDefinition[];
}

export interface DestinyDataBundle {
  readonly qualityTables?: DestinyQualityTablesDataFile;
  readonly destinyTraits?: DestinyTraitDataFile;
  readonly conflictSynergyRules?: DestinyConflictSynergyRulesDataFile;
  readonly rerollRules?: DestinyRerollRulesDataFile;
}
