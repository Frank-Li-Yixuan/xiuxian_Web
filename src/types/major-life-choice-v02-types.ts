// 半年重大选择、风险收益与隐藏分支 v0.2 类型草案

export type Id = string;

export type LifeAgePhaseId = "infant" | "child" | "youth" | "teen" | "adult_node";

export type ChoiceArchetypeId =
  | "safe"
  | "steady"
  | "risky"
  | "dangerous"
  | "forbidden"
  | "destiny";

export type ChoiceThemeId =
  | "growth"
  | "relationship"
  | "omen"
  | "crisis"
  | "temptation"
  | "trial"
  | "transition"
  | "interlude";

export type ChoiceOutcomeBand =
  | "criticalFailure"
  | "failure"
  | "partialSuccess"
  | "success"
  | "greatSuccess"
  | "perfectSuccess"
  | "hiddenSuccess";

export interface ChoiceArchetypeDefinition {
  readonly id: ChoiceArchetypeId;
  readonly label: string;
  readonly name: string;
  readonly riskLevel: number;
  readonly rewardBudgetRange: readonly [number, number];
  readonly failureBudgetRange: readonly [number, number];
  readonly defaultDifficultyModifier: number;
  readonly visibility: "always" | "conditional" | "hidden";
  readonly canTriggerInterlude: boolean;
  readonly canTriggerTransition: boolean;
  readonly description: string;
}

export interface MajorChoiceEventDefinitionV02 {
  readonly id: Id;
  readonly title: string;
  readonly phaseIds: readonly LifeAgePhaseId[];
  readonly ageMonthRange: readonly [number, number];
  readonly themes: readonly ChoiceThemeId[];
  readonly relatedStorylineIds: readonly Id[];
  readonly relatedThreadIds: readonly Id[];
  readonly baseWeight: number;
  readonly sourceHooks: readonly string[];
  readonly conditions?: readonly ChoiceCondition[];
  readonly description: string;
  readonly options: readonly MajorChoiceOptionDefinitionV02[];
  readonly cooldownMonths: number;
  readonly maxTriggersPerLife: number;
}

export interface MajorChoiceOptionDefinitionV02 {
  readonly id: Id;
  readonly archetypeId: ChoiceArchetypeId;
  readonly label: string;
  readonly text: string;
  readonly description?: string;
  readonly requirements?: readonly ChoiceRequirement[];
  readonly visibleHints: readonly string[];
  readonly hiddenBranch?: HiddenBranchDefinition;
  readonly check: ChoiceCheckDefinitionV02;
  readonly outcomeEffectKey: string;
  readonly interludeCandidateId?: Id;
  readonly transitionSignals?: readonly string[];
}

export interface ChoiceCheckDefinitionV02 {
  readonly primary: string;
  readonly support: readonly string[];
  readonly difficulty: number;
  readonly hiddenDifficulty?: number;
}

export interface HiddenBranchDefinition {
  readonly id: Id;
  readonly type:
    | "hiddenFateBranch"
    | "destinyBranch"
    | "itemBranch"
    | "storylineBranch"
    | "interludeBranch"
    | "transitionBranch"
    | "forbiddenBranch"
    | "redemptionBranch"
    | "karmicBranch";
  readonly revealPolicy?: "visibleHintOnly" | "afterSuccess" | "age18Only";
  readonly requiredSignals?: readonly string[];
  readonly forbiddenSignals?: readonly string[];
  readonly visibleHint: string;
  /** Internal only. Do not render unless revealed. */
  readonly internalTrueName?: string;
}

export interface ChoiceCondition {
  readonly type: string;
  readonly value?: string | number | boolean;
}

export interface ChoiceRequirement {
  readonly type: "anySignal" | "allSignals" | "minStat" | "storylineState" | "threadState";
  readonly signals?: readonly string[];
  readonly stat?: string;
  readonly min?: number;
  readonly storylineId?: Id;
  readonly threadId?: Id;
  readonly state?: string;
}

export interface SixMonthWindowSummary {
  readonly monthStart: number;
  readonly monthEnd: number;
  readonly logIds: readonly Id[];
  readonly hooks: readonly string[];
  readonly dominantCategories: readonly string[];
  readonly pressureCount: number;
  readonly omenCount: number;
  readonly choiceSeeds: readonly string[];
  readonly transitionSeeds: readonly string[];
  readonly interludeCandidates: readonly Id[];
}

export interface ChoiceContextV02 {
  readonly ageMonths: number;
  readonly phaseId: LifeAgePhaseId;
  readonly sixMonthWindow: SixMonthWindowSummary;
  readonly activeStorylineIds: readonly Id[];
  readonly dominantStorylineIds: readonly Id[];
  readonly fatedStorylineIds: readonly Id[];
  readonly crisisThreadIds: readonly Id[];
  readonly tags: readonly string[];
  readonly recentChoiceEventIds: readonly Id[];
  readonly interludeCountInLife: number;
  readonly dangerousChoiceCountInWindow: number;
}

export interface PendingMajorChoiceStateV02 {
  readonly eventInstanceId: Id;
  readonly eventDefinitionId: Id;
  readonly generatedAtMonth: number;
  readonly title: string;
  readonly description: string;
  readonly sourceMonthlyEventIds: readonly Id[];
  readonly sourceHooks: readonly string[];
  readonly primaryTheme: ChoiceThemeId;
  readonly options: readonly MajorChoiceOptionInstanceV02[];
  readonly selectedOptionInstanceId?: Id;
  readonly resolution?: MajorChoiceResolutionV02;
}

export interface MajorChoiceOptionInstanceV02 {
  readonly instanceId: Id;
  readonly definitionId: Id;
  readonly archetypeId: ChoiceArchetypeId;
  readonly label: string;
  readonly text: string;
  readonly visibleHints: readonly string[];
  readonly riskHint: string;
  readonly canRevealHiddenBranch: boolean;
  readonly interludeCandidateId?: Id;
  readonly disabledReason?: string;
}

export interface MajorChoiceResolutionV02 {
  readonly selectedOptionInstanceId: Id;
  readonly outcomeBand: ChoiceOutcomeBand;
  readonly score: number;
  readonly visibleLogText: string;
  readonly appliedEffects: readonly ChoiceResolvedEffect[];
  readonly hiddenEffectsApplied: boolean;
  readonly interludeResultId?: Id;
  readonly transitionTokens: readonly string[];
  readonly age18Hooks: readonly string[];
  readonly debug?: MajorChoiceResolutionDebugV02;
}

export interface ChoiceResolvedEffect {
  readonly type: string;
  readonly target: string;
  readonly amount?: number;
  readonly value?: string | boolean;
}

export interface MajorChoiceResolutionDebugV02 {
  readonly roll: number;
  readonly modifiers: Record<string, number>;
  readonly hiddenBranchChecks: Record<string, boolean>;
}
