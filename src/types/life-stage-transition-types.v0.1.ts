export type Id = string;

export type LifeAgePhaseId =
  | "infant"
  | "childhood"
  | "youth"
  | "adolescence"
  | "adulthood_threshold";

export type CultivationIdentityStageId =
  | "mortal_child"
  | "omen_touched"
  | "path_seed"
  | "half_initiated"
  | "initiation_candidate"
  | "initiated_cultivator"
  | "system_candidate"
  | "home_owner";

export interface InterludeIntensityLimit {
  readonly realCombat: boolean;
  readonly maxDurationSeconds: number;
  readonly maxTurns: number;
}

export interface LifeAgePhaseDefinition {
  readonly id: LifeAgePhaseId;
  readonly name: string;
  readonly minAgeMonths: number;
  readonly maxAgeMonths: number;
  readonly description: string;
  readonly allowedInterludeIntensity: InterludeIntensityLimit;
  readonly eventPoolTags: readonly string[];
  readonly narrativeToneTags: readonly string[];
}

export interface CultivationIdentityStageDefinition {
  readonly id: CultivationIdentityStageId;
  readonly name: string;
  readonly category: "mortal" | "omen" | "seeker" | "initiated" | "system" | "home";
  readonly description: string;
  readonly canCoexistWith: readonly CultivationIdentityStageId[];
  readonly unlocks: readonly string[];
  readonly eventBiasTags: readonly string[];
  readonly transitionInTags: readonly string[];
  readonly transitionOutTags: readonly string[];
}

export interface StageScoreState {
  readonly initiationReadiness: number;
  readonly systemResonance: number;
  readonly karmicPressure: number;
  readonly worldlyAttachment: number;
  readonly bodyVessel: number;
  readonly mindStability: number;
}

export interface LifeStageCooldownState {
  readonly identityTransitionCooldownMonths: number;
  readonly interludeCooldownMonths: number;
  readonly initiationNodeCooldownMonths: number;
  readonly systemPreviewCooldownMonths: number;
}

export interface PendingStageTransition {
  readonly transitionRuleId: Id;
  readonly from: readonly string[];
  readonly to: readonly string[];
  readonly generatedAtMonth: number;
  readonly playerChoicePolicy: "automatic" | "prompt" | "forced";
  readonly promptText?: string;
  readonly options?: readonly StageTransitionOption[];
  readonly debugScore?: number;
}

export interface StageTransitionOption {
  readonly id: Id;
  readonly label: string;
  readonly description: string;
  readonly effects: readonly LifeStageEffect[];
}

export interface LifeStageState {
  readonly agePhaseId: LifeAgePhaseId;
  readonly identityStageIds: readonly CultivationIdentityStageId[];
  readonly scores: StageScoreState;
  readonly transitionTokens: readonly string[];
  readonly completedInitiationNodeIds: readonly Id[];
  readonly cooldowns: LifeStageCooldownState;
  readonly pendingStageTransition?: PendingStageTransition;
  readonly age18PathScores?: Record<string, number>;
}

export interface InitiationNodeDefinition {
  readonly id: Id;
  readonly name: string;
  readonly description: string;
  readonly worldWrapper: string;
  readonly triggerTags: readonly string[];
  readonly requiredIdentityStages?: readonly CultivationIdentityStageId[];
  readonly recommendedAgeRange?: readonly [number, number];
  readonly possibleInterludeModes: readonly string[];
  readonly successEffects: readonly LifeStageEffect[];
  readonly failureEffects: readonly LifeStageEffect[];
  readonly age18Hooks: readonly string[];
}

export type LifeStageEffect =
  | { readonly type: "addIdentityStage"; readonly value: CultivationIdentityStageId }
  | { readonly type: "removeIdentityStage"; readonly value: CultivationIdentityStageId }
  | { readonly type: "addToken"; readonly value: string }
  | { readonly type: "addScore"; readonly score: keyof StageScoreState; readonly value: number }
  | { readonly type: "addWound"; readonly value: string }
  | { readonly type: "addHeartKnot"; readonly value: string }
  | { readonly type: "addHeartDemon"; readonly value: number };

export interface StageTransitionRule {
  readonly id: Id;
  readonly from: readonly string[];
  readonly to: readonly string[];
  readonly triggerType: "age" | "token" | "score" | "choice" | "interlude" | "age18";
  readonly requirements: readonly TransitionRequirement[];
  readonly priority: number;
  readonly cooldownMonths?: number;
  readonly playerChoicePolicy: "automatic" | "prompt" | "forced";
  readonly promptText?: string;
  readonly options?: readonly StageTransitionOption[];
}

export type TransitionRequirement =
  | { readonly type: "anyToken"; readonly values: readonly string[] }
  | { readonly type: "scoreAtLeast"; readonly score: keyof StageScoreState | string; readonly value: number }
  | { readonly type: "ageMonthsAtLeast"; readonly value: number }
  | { readonly type: "identityStagePresent"; readonly value: CultivationIdentityStageId };

export interface Age18PathDecision {
  readonly selectedPathId: string;
  readonly pathScores: Record<string, number>;
  readonly reasons: readonly string[];
  readonly fallbackUsed: boolean;
}
