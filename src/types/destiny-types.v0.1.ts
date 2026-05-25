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
