export type WorldLayerId = string;
export type RegionId = string;
export type LocationId = string;
export type FactionId = string;

export type LifePhaseId = "infancy" | "childhood" | "youth" | "adolescence" | "awakening";

export type EventTruthLevel =
  | "mundane"
  | "anomalous"
  | "dream"
  | "trial"
  | "combat"
  | "system_omen";

export type GameplayInterludeType =
  | "none"
  | "stg_short_dream"
  | "stg_short"
  | "stg"
  | "horde_short"
  | "horde"
  | "deckbuilder_trial"
  | "deckbuilder"
  | "autochess_trial"
  | "autochess";

export interface WorldLayerDefinition {
  readonly id: WorldLayerId;
  readonly name: string;
  readonly description: string;
  readonly earlyLifeAllowed: boolean;
}

export interface RegionDefinition {
  readonly id: RegionId;
  readonly name: string;
  readonly parent?: string;
  readonly tags: readonly string[];
  readonly description: string;
}

export interface LocationDefinition {
  readonly id: LocationId;
  readonly name: string;
  readonly layer: WorldLayerId;
  readonly tags: readonly string[];
  readonly lifePhases: readonly LifePhaseId[];
  readonly description: string;
}

export interface FactionDefinition {
  readonly id: FactionId;
  readonly name: string;
  readonly type: string;
  readonly visibilityInEarlyLife: string;
  readonly tags: readonly string[];
  readonly description: string;
}

export interface WorldEventRuleSet {
  readonly version: string;
  readonly truthLevels: readonly {
    readonly id: EventTruthLevel;
    readonly name: string;
    readonly description: string;
  }[];
  readonly ageRestrictions: readonly AgeEventRestriction[];
  readonly forbiddenModernTerms: readonly string[];
  readonly hiddenNameLeakForbidden: boolean;
  readonly requiredFieldsForEvents: readonly string[];
}

export interface AgeEventRestriction {
  readonly phase: LifePhaseId;
  readonly ageRangeMonths: readonly [number, number];
  readonly allowedTruthLevels: readonly EventTruthLevel[];
  readonly allowedGameplayInterludes?: readonly GameplayInterludeType[];
  readonly forbiddenGameplayInterludes?: readonly GameplayInterludeType[];
  readonly notes: string;
}

export interface LifeEventWorldContext {
  readonly settingTags: readonly string[];
  readonly worldTags: readonly string[];
  readonly factionTags?: readonly string[];
  readonly truthLevel: EventTruthLevel;
  readonly gameplayInterlude?: GameplayInterludeType;
}
