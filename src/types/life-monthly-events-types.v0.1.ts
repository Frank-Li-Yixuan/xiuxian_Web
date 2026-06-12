// 0–18 岁人生模拟月度事件系统 v0.1
// These types are implementation guidance for Codex. Integrate with the project's existing shared Id/RNG/Profile types.

import type {
  DerivedFateScores,
  FateAttributeId,
  NinePalaceAttributes,
  ThreePowerScores,
  WuxingInclination
} from "./nine-palace-fate-types.v0.1";
import type {
  OriginFateNarrativeLifeEventContext,
  OriginFateNarrativeLifeEventSummary,
  OriginFateNarrativeStageTransitionContext,
  OriginFateNarrativeStateV02
} from "./origin-fate-narrative-types.v0.2";

export type Id = string;

export type LifePhaseId =
  | "infancy"
  | "childhood"
  | "youth"
  | "adolescence";

export type LifeEventCategoryId =
  | "birth_omen"
  | "family"
  | "health"
  | "study"
  | "martial"
  | "alchemy"
  | "spiritual_root"
  | "dream"
  | "social"
  | "origin_clue"
  | "hidden_fate"
  | "destiny_trigger"
  | "danger"
  | "merit_karma"
  | "system_omen";

export interface LifePhaseDefinition {
  readonly id: LifePhaseId;
  readonly name: string;
  readonly ageRangeMonths: readonly [number, number];
  readonly theme: string;
  readonly monthlyEventSlots: readonly string[];
  readonly baseGrowth: {
    readonly jing: number;
    readonly qi: number;
    readonly shen: number;
  };
  readonly choicePolicy: {
    readonly majorChoiceEveryMonths: number;
    readonly choiceTone: string;
  };
}

export type LifeEffectKind =
  | "core"
  | "aptitudeSoft"
  | "lifeSkill"
  | "merit"
  | "karma"
  | "state"
  | "hiddenFateProgress"
  | "itemAffinity"
  | "destinyProgress"
  | "majorChoiceHook"
  | "age18Hook"
  | "modeBias"
  | "dongfuHook"
  | "tag"
  | "lifeEventBias";

export interface LifeEffect {
  readonly kind: LifeEffectKind;
  readonly target: string;
  readonly value: number;
  readonly reason?: string;
}

export type LifeEventCondition =
  | { readonly kind: "tagAny"; readonly tags: readonly string[] }
  | { readonly kind: "tagAll"; readonly tags: readonly string[] }
  | { readonly kind: "statAbove"; readonly stat: string; readonly value: number }
  | { readonly kind: "statBelow"; readonly stat: string; readonly value: number }
  | { readonly kind: "statAnyAbove"; readonly stats: readonly string[]; readonly value: number }
  | { readonly kind: "stateFlag"; readonly flag: string }
  | { readonly kind: "hiddenFateBandAtLeast"; readonly hiddenFateId: Id; readonly band: HiddenFateBandId };

export type HiddenFateBandId =
  | "faint_omen"
  | "stirring"
  | "near_awake"
  | "awakened";

export interface MonthlyLifeEventDefinition {
  readonly id: Id;
  readonly title: string;
  readonly description: string;
  readonly ageRangeMonths: readonly [number, number];
  readonly category: LifeEventCategoryId;
  readonly baseWeight: number;
  readonly tags: readonly string[];
  readonly conditions: readonly LifeEventCondition[];
  readonly difficulty: number;
  readonly cooldownMonths: number;
  readonly visibleEffects: readonly LifeEffect[];
  readonly hiddenEffects: readonly LifeEffect[];
  readonly majorChoiceHooks: readonly string[];
}

export interface CoreLifeStats {
  readonly jing: number;
  readonly qi: number;
  readonly shen: number;
}

export interface LifeAptitudeStats {
  readonly rootBone: number;
  readonly comprehension: number;
  readonly inspiration: number;
  readonly fortune: number;
  readonly heart: number;
  readonly lifespan: number;
}

export interface LifeSkills {
  readonly study: number;
  readonly martial: number;
  readonly alchemy: number;
  readonly craft: number;
  readonly social: number;
  readonly stealth: number;
  readonly ritual: number;
  readonly survival: number;
}

export interface LifeWoundState {
  readonly id: Id;
  readonly name: string;
  readonly severity: number;
  readonly tags: readonly string[];
  readonly createdAtMonth: number;
  readonly expiresAtMonth?: number;
}

export interface LifeHeartKnotState {
  readonly id: Id;
  readonly name: string;
  readonly severity: number;
  readonly tags: readonly string[];
  readonly createdAtMonth: number;
}

export interface FamilyState {
  readonly kinship: number;
  readonly familyStrain: number;
  readonly familyWealth: number;
  readonly flags: Readonly<Record<string, number | boolean | string>>;
}

export interface LifeRelationshipState {
  readonly id: Id;
  readonly name: string;
  readonly relationType: string;
  readonly affinity: number;
  readonly tags: readonly string[];
}

export type MonthlyOutcomeBandId = "bad" | "normal" | "good" | "great";

export interface MonthlyLifeLogEntry {
  readonly ageMonth: number;
  readonly ageYear: number;
  readonly ageMonthInYear: number;
  readonly phaseId: LifePhaseId;
  readonly eventId: Id;
  readonly eventTitle: string;
  readonly eventDescription: string;
  readonly outcome: MonthlyOutcomeBandId;
  readonly visibleEffectSummary: readonly string[];
  /** Never include hidden fate true names here. */
  readonly vagueHiddenSummary?: string;
  readonly tags: readonly string[];
  readonly hooks: readonly string[];
}

export interface PendingMajorChoiceRef {
  readonly ageMonths: number;
  readonly phaseId: LifePhaseId;
  readonly recentEventIds: readonly Id[];
  readonly hooks: readonly string[];
  readonly stateSummary: {
    readonly highStats: readonly string[];
    readonly lowStats: readonly string[];
    readonly wounds: readonly Id[];
    readonly heartKnots: readonly Id[];
    readonly hiddenFateBands: Readonly<Record<Id, HiddenFateBandId>>;
  };
}

export interface NinePalaceLifeEventSummary {
  readonly attributes: NinePalaceAttributes;
  readonly derivedScores: DerivedFateScores;
  readonly threePowers: ThreePowerScores;
  readonly wuxing: WuxingInclination;
  readonly lifeEventBiasTags: readonly string[];
  readonly highAttributes: readonly FateAttributeId[];
  readonly lowAttributes: readonly FateAttributeId[];
  readonly threePowerImbalanceTags: readonly string[];
  readonly majorChoiceBiasTags: readonly string[];
  readonly debugTags: readonly string[];
}

export interface LifeSimulationState {
  readonly profileId: Id;
  readonly characterId: Id;
  readonly seed: string;
  readonly rngState: unknown;

  readonly ageMonths: number;
  readonly phaseId: LifePhaseId;

  readonly core: CoreLifeStats;
  readonly aptitude: LifeAptitudeStats;
  readonly lifeSkills: LifeSkills;

  readonly karma: number;
  readonly merit: number;
  readonly heartDemon: number;

  readonly wounds: readonly LifeWoundState[];
  readonly heartKnots: readonly LifeHeartKnotState[];
  readonly family: FamilyState;
  readonly relationships: readonly LifeRelationshipState[];

  readonly hiddenFateProgress: Readonly<Record<Id, number>>;
  readonly carriedItemAffinity: Readonly<Record<Id, number>>;
  readonly ninePalaceSummary?: NinePalaceLifeEventSummary;
  readonly originFateNarrativeState?: OriginFateNarrativeStateV02;

  readonly flags: Readonly<Record<string, number | boolean | string>>;

  readonly monthlyLogs: readonly MonthlyLifeLogEntry[];
  readonly pendingMajorChoice?: PendingMajorChoiceRef;
}

export interface LifeEventContext {
  readonly openingTags: readonly string[];
  readonly destinyTags: readonly string[];
  readonly originFateTags: readonly string[];
  readonly carriedItemTags: readonly string[];
  readonly allTags: readonly string[];
}

export interface LifeMonthResult {
  readonly nextState: LifeSimulationState;
  readonly event: MonthlyLifeEventDefinition;
  readonly outcome: MonthlyOutcomeBandId;
  readonly log: MonthlyLifeLogEntry;
  readonly pendingMajorChoice?: PendingMajorChoiceRef;
}

export interface LifeSimulationResult {
  readonly finalState: LifeSimulationState;
  readonly logs: readonly MonthlyLifeLogEntry[];
  readonly triggeredHooks: readonly string[];
  readonly age18Hooks: readonly string[];
  readonly hiddenFateProgress: Readonly<Record<Id, number>>;
  readonly carriedItemAffinity: Readonly<Record<Id, number>>;
}

export type {
  OriginFateNarrativeLifeEventContext,
  OriginFateNarrativeLifeEventSummary,
  OriginFateNarrativeStageTransitionContext
};
