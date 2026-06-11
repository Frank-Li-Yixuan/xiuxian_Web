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

export interface WorldRegionsDataFile {
  readonly version: string;
  readonly worldId: string;
  readonly worldName: string;
  readonly startingRegionId: RegionId;
  readonly layers: readonly WorldLayerDefinition[];
  readonly regions: readonly RegionDefinition[];
  readonly locations: readonly LocationDefinition[];
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

export interface WorldFactionsDataFile {
  readonly version: string;
  readonly factions: readonly FactionDefinition[];
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

export interface WorldGlossaryDataFile {
  readonly version: string;
  readonly preferredTerms: Readonly<Record<string, readonly string[]>>;
  readonly toneRules: readonly string[];
  readonly bannedTone: readonly string[];
}

export interface WorldbuildingDataBundle {
  readonly regions?: WorldRegionsDataFile;
  readonly factions?: WorldFactionsDataFile;
  readonly eventRules?: WorldEventRuleSet;
  readonly glossary?: WorldGlossaryDataFile;
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

export type WorldNarrativeSafetyFlag = "hidden_term_redacted" | "forbidden_term_redacted";

export interface WorldNarrativeContextBuildInput {
  readonly locationIds: readonly LocationId[];
  readonly factionIds?: readonly FactionId[];
  readonly truthLevel: EventTruthLevel;
  readonly lifePhase: LifePhaseId;
  readonly hiddenTrueNames?: readonly string[];
  readonly hiddenInternalIds?: readonly string[];
  readonly visibleOmenAliases?: readonly string[];
}

export interface WorldFallbackTemplateContext {
  readonly locationNames: readonly string[];
  readonly locationTags: readonly string[];
  readonly factionNames: readonly string[];
  readonly factionTags: readonly string[];
  readonly truthLevel: EventTruthLevel;
  readonly lifePhase: LifePhaseId;
  readonly preferredTerms: Readonly<Record<string, readonly string[]>>;
  readonly toneRules: readonly string[];
  readonly bannedTone: readonly string[];
  readonly visibleOmenAliases: readonly string[];
  readonly allowedTerms: readonly string[];
}

export interface WorldNarrativeContextFragment {
  readonly systemPromptFragment: string;
  readonly contextPromptFragment: string;
  readonly fallbackTemplateContext: WorldFallbackTemplateContext;
  readonly safeWorldContext: {
    readonly regionId: string;
    readonly agePhaseId: string;
    readonly locationIds: readonly string[];
    readonly allowedTerms: readonly string[];
    readonly forbiddenTerms: readonly string[];
  };
  readonly forbiddenTerms: readonly string[];
  readonly safetyFlags: readonly WorldNarrativeSafetyFlag[];
}
