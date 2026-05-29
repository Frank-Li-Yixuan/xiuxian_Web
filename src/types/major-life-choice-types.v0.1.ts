// 《半年重大选择与成功判定系统 v0.1》类型草案

export type Id = string;

export type LifePhaseId = "infancy" | "childhood" | "juvenile" | "youth" | "awakening";

export type MajorChoiceCategory =
  | "study_path"
  | "martial_path"
  | "alchemy_path"
  | "temple_path"
  | "family_path"
  | "wilderness_path"
  | "crisis_path"
  | "dream_path"
  | "origin_path"
  | "hidden_fate_path"
  | "destiny_path"
  | "system_path";

export type ChoiceRiskTier =
  | "safe"
  | "steady"
  | "risky"
  | "dangerous"
  | "forbidden"
  | "destiny";

export type ChoiceOptionType =
  | "safe"
  | "steady"
  | "risky"
  | "dangerous"
  | "forbidden"
  | "destiny"
  | "hidden";

export type ChoiceOutcomeTier =
  | "failure"
  | "mixed"
  | "success"
  | "great"
  | "great_plus"
  | "hidden";

export type AptitudeStatKey =
  | "rootBone"
  | "comprehension"
  | "inspiration"
  | "fortune"
  | "heart"
  | "lifespan";

export type CoreStatKey = "jing" | "qi" | "shen";

export type LifeSkillKey =
  | "learning"
  | "martial"
  | "alchemy"
  | "insight"
  | "reputation"
  | "household"
  | "seclusion";

export interface LifeChoiceRequirement {
  readonly type:
    | "hasDestinyTag"
    | "hasAnyDestinyTag"
    | "hasRootTag"
    | "hasOriginTag"
    | "hasHiddenFateHintTag"
    | "hasCarriedItemTag"
    | "flagAtLeast"
    | "statAtLeast"
    | "ageAtLeast";
  readonly tag?: string;
  readonly tags?: readonly string[];
  readonly key?: string;
  readonly value?: number;
}

export interface ChoiceCheckDefinition {
  readonly difficulty: number;
  readonly primaryAptitudes?: readonly AptitudeStatKey[];
  readonly primaryCoreStats?: readonly CoreStatKey[];
  readonly supportAptitudes?: readonly AptitudeStatKey[];
  readonly lifeSkills?: readonly LifeSkillKey[];
  readonly elementTags?: readonly string[];
  readonly destinyTags?: readonly string[];
  readonly originTags?: readonly string[];
  readonly itemTags?: readonly string[];
}

export interface LifeChoiceEffect {
  readonly type:
    | "modifyCoreStat"
    | "modifyAptitude"
    | "modifyLifeSkill"
    | "modifyKarma"
    | "modifyHeartDemon"
    | "addWound"
    | "addHeartKnot"
    | "addFlag"
    | "modifyHiddenFate"
    | "modifyCarriedItem"
    | "addMajorChoiceHook"
    | "addAge18Hook"
    | "addModeBiasTag";

  readonly key?: string;
  readonly value?: number;
  readonly id?: Id;
  readonly tags?: readonly string[];
  readonly visible: boolean;
}

export interface ChoiceOutcomeDefinition {
  readonly text: string;
  readonly effects: readonly LifeChoiceEffect[];
}

export interface ChoiceOutcomeTable {
  readonly failure?: ChoiceOutcomeDefinition;
  readonly mixed?: ChoiceOutcomeDefinition;
  readonly success: ChoiceOutcomeDefinition;
  readonly great?: ChoiceOutcomeDefinition;
  readonly hidden?: ChoiceOutcomeDefinition;
}

export interface MajorChoiceOptionDefinition {
  readonly id: Id;
  readonly label: string;
  readonly description: string;
  readonly riskTier: ChoiceRiskTier;
  readonly optionType: ChoiceOptionType;
  readonly visibleHint: string;
  readonly requirements?: readonly LifeChoiceRequirement[];
  readonly check?: ChoiceCheckDefinition;
  readonly tags: readonly string[];
  readonly hiddenSuccessRequirements?: readonly LifeChoiceRequirement[];
  readonly outcomes: ChoiceOutcomeTable;
}

export interface MajorChoiceEventDefinition {
  readonly id: Id;
  readonly title: string;
  readonly description: string;
  readonly phaseIds: readonly LifePhaseId[];
  readonly ageRangeMonths: readonly [number, number];
  readonly category: MajorChoiceCategory;
  readonly tags: readonly string[];
  readonly baseWeight: number;
  readonly triggerHooks?: readonly string[];
  readonly requirements?: readonly LifeChoiceRequirement[];
  readonly cooldownMonths?: number;
  readonly maxOccurrences?: number;
  readonly options: readonly MajorChoiceOptionDefinition[];
}

export interface ChoiceContext {
  readonly ageMonths: number;
  readonly phaseId: LifePhaseId;
  readonly recentMonthlyEventIds: readonly Id[];
  readonly recentHooks: readonly string[];
  readonly destinyTags: readonly string[];
  readonly rootTags: readonly string[];
  readonly originTags: readonly string[];
  readonly hiddenFateHintTags: readonly string[];
  readonly carriedItemTags: readonly string[];
  readonly wounds: readonly Id[];
  readonly heartKnots: readonly Id[];
  readonly flags: Readonly<Record<string, number | boolean | string>>;
  readonly repeatedChoiceTags: Readonly<Record<string, number>>;
}

export interface MajorChoiceOptionInstance {
  readonly instanceId: Id;
  readonly definitionId: Id;
  readonly label: string;
  readonly description: string;
  readonly riskTier: ChoiceRiskTier;
  readonly optionType: ChoiceOptionType;
  readonly visibleHint: string;
  readonly successChanceLabel: string;
  readonly tags: readonly string[];
  readonly disabledReason?: string;
}

export interface PendingMajorChoiceState {
  readonly eventInstanceId: Id;
  readonly eventDefinitionId: Id;
  readonly generatedAtMonth: number;
  readonly title: string;
  readonly description: string;
  readonly sourceMonthlyEventIds: readonly Id[];
  readonly sourceHooks: readonly string[];
  readonly options: readonly MajorChoiceOptionInstance[];
  readonly selectedOptionInstanceId?: Id;
  readonly resolution?: MajorChoiceResolution;
}

export interface MajorChoiceResolution {
  readonly selectedOptionInstanceId: Id;
  readonly selectedOptionDefinitionId: Id;
  readonly roll: number;
  readonly finalScore: number;
  readonly outcomeTier: ChoiceOutcomeTier;
  readonly visibleOutcomeText: string;
  readonly appliedVisibleEffects: readonly LifeChoiceEffect[];
  /** Internal only; do not show true hidden fate names in normal UI. */
  readonly appliedHiddenEffects: readonly LifeChoiceEffect[];
  readonly debug?: MajorChoiceResolutionDebug;
}

export interface MajorChoiceResolutionDebug {
  readonly difficulty: number;
  readonly statScore: number;
  readonly skillScore: number;
  readonly modifiers: Readonly<Record<string, number>>;
  readonly penalties: Readonly<Record<string, number>>;
}
