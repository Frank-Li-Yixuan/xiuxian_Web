import type { LifeSimulationState } from "./life-monthly-events-types.v0.1";
import type { MajorChoiceOptionInstance } from "./major-life-choice-types.v0.1";
import type {
  EventThreadAdvanceHook,
  LifeStorylineState
} from "./life-storylines-types.v0.1";

export type LifeInterludeMode = "stg" | "horde" | "deckbuilder" | "formation_auto" | "text_check";

export type InterludeRealityLayer =
  | "real_event"
  | "dream"
  | "training"
  | "spirit_projection"
  | "system_preview";

export type InterludeDifficultyTier =
  | "safe"
  | "steady"
  | "risky"
  | "dangerous"
  | "forbidden"
  | "destiny";

export type LifeInterludeOutcome =
  | "failure"
  | "partialSuccess"
  | "success"
  | "greatSuccess"
  | "hiddenSuccess"
  | "abandon";

export interface LifeInterludeDefinition {
  readonly id: string;
  readonly name: string;
  readonly mode: LifeInterludeMode;
  readonly realityLayer: InterludeRealityLayer;
  readonly ageRange: readonly [number, number];
  readonly baseWeight: number;
  readonly storylineTags: readonly string[];
  readonly threadTags: readonly string[];
  readonly requiredHooks?: readonly string[];
  readonly preferredRoots?: readonly string[];
  readonly preferredDestinies?: readonly string[];
  readonly preferredOrigins?: readonly string[];
  readonly preferredItems?: readonly string[];
  readonly difficultyTier: InterludeDifficultyTier;
  readonly durationTargetSeconds?: number;
  readonly turnLimit?: number;
  readonly description: string;
  readonly worldExplanation: string;
  readonly rewardProfileId: string;
  readonly failurePolicyId: string;
  readonly resultWritebackId: string;
}

export interface LifeInterludeModeDefinition {
  readonly id: LifeInterludeMode;
  readonly name: string;
  readonly displayName: string;
  readonly worldWrappers: readonly string[];
  readonly recommendedAgeRange: readonly [number, number];
  readonly defaultDurationSeconds?: number;
  readonly defaultTurnLimit?: number;
  readonly resultMetrics: readonly string[];
  readonly primaryRewards: readonly string[];
}

export interface LifeInterludeModeDefinitionsDataFile {
  readonly version: string;
  readonly modes: readonly LifeInterludeModeDefinition[];
}

export interface LifeInterludeModePreferenceRule {
  readonly mode: LifeInterludeMode;
  readonly preferredTags: readonly string[];
  readonly ageMinMonths: number;
}

export interface LifeInterludeAgeHardRule {
  readonly ageMonths: readonly [number, number];
  readonly allowedModes: readonly LifeInterludeMode[];
  readonly maxDifficulty?: InterludeDifficultyTier;
  readonly note?: string;
}

export interface LifeInterludeTriggerRulesDataFile {
  readonly version: string;
  readonly weightFormula: string;
  readonly modePreferenceRules: readonly LifeInterludeModePreferenceRule[];
  readonly ageHardRules: readonly LifeInterludeAgeHardRule[];
}

export interface LifeInterludeEventCatalogDataFile {
  readonly version: string;
  readonly interludes: readonly LifeInterludeDefinition[];
}

export interface LifeInterludeResultWritebackRule {
  readonly id: string;
  readonly outcomes: Partial<Record<LifeInterludeOutcome, readonly LifeInterludeWritebackEffect[]>>;
}

export interface LifeInterludeResultWritebackRulesDataFile {
  readonly version: string;
  readonly rules: readonly LifeInterludeResultWritebackRule[];
}

export interface LifeInterludeFrequencyBudgetPhase {
  readonly phaseId: "infancy" | "childhood" | "youth" | "adolescence" | "awakening";
  readonly ageMonths: readonly [number, number];
  readonly maxPlayableInterludes: number;
  readonly allowedModes: readonly LifeInterludeMode[];
  readonly maxDifficulty?: InterludeDifficultyTier;
}

export interface LifeInterludeFrequencyBudgetFatigueRule {
  readonly recentPlayableInterludesLast24Months: readonly [number, number];
  readonly weightMultiplier: number;
}

export interface LifeInterludeFrequencyBudgetDataFile {
  readonly version: string;
  readonly lifetimeHalfYearChoices: number;
  readonly targetManualPlayableInterludes: {
    readonly min: number;
    readonly target: number;
    readonly max: number;
  };
  readonly agePhaseBudgets: readonly LifeInterludeFrequencyBudgetPhase[];
  readonly cooldowns: {
    readonly sameModeMonths: number;
    readonly sameThreadMonths: number;
    readonly coreStorylineInterludeMonths: number;
  };
  readonly fatigue: readonly LifeInterludeFrequencyBudgetFatigueRule[];
  readonly autoResolveRules: {
    readonly manualMaxOutcome: LifeInterludeOutcome;
    readonly autoResolveMaxOutcome: LifeInterludeOutcome;
    readonly abandonDefaultOutcome: "partialSuccessOrFailure" | LifeInterludeOutcome;
  };
}

export interface LifeInterludeDataBundle {
  readonly modeDefinitions?: LifeInterludeModeDefinitionsDataFile;
  readonly triggerRules?: LifeInterludeTriggerRulesDataFile;
  readonly eventCatalog?: LifeInterludeEventCatalogDataFile;
  readonly resultWritebackRules?: LifeInterludeResultWritebackRulesDataFile;
  readonly frequencyBudget?: LifeInterludeFrequencyBudgetDataFile;
}

export interface LifeInterludeTriggerContext {
  readonly ageMonth: number;
  readonly phaseId: string;
  readonly recentMonthlyEventIds: readonly string[];
  readonly recentHooks: readonly string[];
  readonly activeStorylineTags: readonly string[];
  readonly activeThreadTags: readonly string[];
  readonly openingTags: readonly string[];
  readonly destinyTags: readonly string[];
  readonly rootTags: readonly string[];
  readonly originTags: readonly string[];
  readonly itemTags: readonly string[];
  readonly currentWoundIds: readonly string[];
  readonly currentHeartKnotIds: readonly string[];
  readonly merit: number;
  readonly karma: number;
  readonly recentInterludesLast24Months: number;
  readonly interludeHistory: readonly LifeInterludeHistoryEntry[];
}

export interface LifeInterludeHistoryEntry {
  readonly interludeId: string;
  readonly mode: LifeInterludeMode;
  readonly ageMonth: number;
  readonly outcome: LifeInterludeOutcome;
  readonly sourceChoiceId?: string;
  readonly sourceThreadId?: string;
}

export interface LifeInterludeCandidate {
  readonly definitionId: string;
  readonly mode: LifeInterludeMode;
  readonly name: string;
  readonly difficultyTier: InterludeDifficultyTier;
  readonly displayRisk: string;
  readonly durationPreview?: string;
  readonly worldExplanation: string;
  readonly autoResolveAllowed: boolean;
  readonly finalWeight: number;
  readonly debug?: unknown;
}

export type LifeInterludeTriggerBlockReasonCode =
  | "ageHardRule"
  | "ageRange"
  | "modeNotAllowed"
  | "difficultyTooHigh"
  | "realityLayerNotAllowed"
  | "missingRequiredHook"
  | "insufficientEvidence";

export interface LifeInterludeCandidateDebug {
  readonly source: string;
  readonly matchedTags: readonly string[];
  readonly matchedHooks: readonly string[];
  readonly penalties: readonly {
    readonly source: string;
    readonly amount: number;
  }[];
  readonly fatigueMultiplier: number;
  readonly weightBreakdown: readonly {
    readonly source: string;
    readonly weight: number;
  }[];
}

export interface LifeInterludeTriggerBlockReason {
  readonly definitionId: string;
  readonly reason: LifeInterludeTriggerBlockReasonCode;
  readonly message: string;
}

export interface LifeInterludeTriggerEvaluation {
  readonly candidates: readonly LifeInterludeCandidate[];
  readonly blocked: readonly LifeInterludeTriggerBlockReason[];
  readonly debug: {
    readonly source: string;
    readonly signalTags: readonly string[];
    readonly ageRule?: {
      readonly ageMonths: readonly [number, number];
      readonly allowedModes: readonly LifeInterludeMode[];
      readonly maxDifficulty?: InterludeDifficultyTier;
    };
  };
}

export interface LifeInterludeRunConfigRegistryReader {
  getInterlude(id: string): LifeInterludeDefinition;
  getWritebackRule(id: string): LifeInterludeResultWritebackRule;
  getMode(modeId: string): LifeInterludeModeDefinition;
  getFrequencyBudget(): LifeInterludeFrequencyBudgetDataFile;
}

export interface LifeInterludeRunConfigFactoryInput {
  readonly lifeSimulationState: LifeSimulationState;
  readonly majorChoiceOption: MajorChoiceOptionInstance;
  readonly candidate: LifeInterludeCandidate;
  readonly seed: string;
  readonly sourceThreadId?: string;
  readonly registry?: LifeInterludeRunConfigRegistryReader;
}

export interface LifeInterludeRunConfigDebug {
  readonly source: string;
  readonly modeWrapper: string;
  readonly ageScale: "child" | "youth" | "adolescent";
  readonly publicTags: readonly string[];
}

export interface LifeInterludeAutoResolveFallbackInput {
  readonly config: LifeInterludeRunConfig;
  readonly seed: string;
}

export interface LifeInterludeRunConfig {
  readonly interludeRunId: string;
  readonly definitionId: string;
  readonly mode: LifeInterludeMode;
  readonly seed: string;
  readonly ageMonth: number;
  readonly sourceChoiceId: string;
  readonly sourceThreadId?: string;
  readonly resultWritebackId: string;
  readonly difficultyTier: InterludeDifficultyTier;
  readonly durationTargetSeconds?: number;
  readonly turnLimit?: number;
  readonly playerProjection: LifeInterludePlayerProjection;
  readonly scenario: LifeInterludeScenario;
  readonly rewards: LifeInterludeRewardTable;
  readonly failurePolicy: LifeInterludeFailurePolicy;
  readonly debug?: LifeInterludeRunConfigDebug;
}

export interface LifeInterludeResultWritebackRegistryReader {
  getWritebackRule(id: string): LifeInterludeResultWritebackRule;
}

export interface LifeInterludeEventThreadAdvancer {
  advanceStateByHook(state: LifeStorylineState, hook: EventThreadAdvanceHook): LifeStorylineState;
}

export interface LifeInterludeResultWritebackInput {
  readonly state: LifeSimulationState;
  readonly runConfig: LifeInterludeRunConfig;
  readonly result: LifeInterludeResult;
  readonly registry?: LifeInterludeResultWritebackRegistryReader;
  readonly eventThreadEngine?: LifeInterludeEventThreadAdvancer;
}

export interface LifeInterludeApplyEffectsInput {
  readonly state: LifeSimulationState;
  readonly runConfig: LifeInterludeRunConfig;
  readonly result: LifeInterludeResult;
  readonly effects?: readonly LifeInterludeWritebackEffect[];
  readonly eventThreadEngine?: LifeInterludeEventThreadAdvancer;
}

export interface LifeInterludeAppliedEffect {
  readonly effectType: LifeInterludeWritebackEffect["type"] | "destinyFailureHook";
  readonly source: "registry" | "result" | "destinyFailureHook";
  readonly target?: string;
  readonly amount?: number;
}

export interface LifeInterludeSkippedEffect {
  readonly reason: string;
  readonly effectType?: LifeInterludeWritebackEffect["type"] | "hiddenSuccess";
  readonly target?: string;
}

export interface LifeInterludeWritebackDebug {
  readonly source: string;
  readonly resultWritebackId: string;
  readonly effectiveOutcome: LifeInterludeOutcome;
  readonly appliedEffectCount: number;
  readonly skippedEffectCount: number;
  readonly generatedHooks: readonly string[];
}

export interface LifeInterludeWritebackApplication {
  readonly nextState: LifeSimulationState;
  readonly appliedEffects: readonly LifeInterludeAppliedEffect[];
  readonly skippedEffects: readonly LifeInterludeSkippedEffect[];
  readonly generatedHooks: readonly string[];
  readonly debug: LifeInterludeWritebackDebug;
}

export interface LifeInterludePlayerProjection {
  readonly maxHp: number;
  readonly maxQi?: number;
  readonly moveSpeed?: number;
  readonly skillTags: readonly string[];
  readonly destinyModifiers: readonly string[];
  readonly itemModifiers: readonly string[];
}

export interface LifeInterludeScenario {
  readonly title: string;
  readonly description: string;
  readonly worldExplanation: string;
  readonly enemyPool?: readonly string[];
  readonly cardPool?: readonly string[];
  readonly boardPreset?: string;
}

export interface LifeInterludeRewardTable {
  readonly successEffects: readonly LifeInterludeWritebackEffect[];
  readonly failureEffects: readonly LifeInterludeWritebackEffect[];
  readonly hiddenSuccessEffects?: readonly LifeInterludeWritebackEffect[];
}

export interface LifeInterludeFailurePolicy {
  readonly canGameOver: false;
  readonly preserveLifeSimulation: true;
  readonly allowRetry?: boolean;
  readonly autoResolveFallback?: LifeInterludeOutcome;
}

export type LifeInterludeWritebackEffect =
  | { readonly type: "modifyStat"; readonly stat: string; readonly amount: number }
  | { readonly type: "addWound"; readonly woundId: string; readonly severity: number }
  | { readonly type: "addHeartKnot"; readonly knotId: string; readonly severity: number }
  | { readonly type: "modifyHiddenFateProgress"; readonly hiddenFateId: string; readonly amount: number; readonly visibleHint: string }
  | { readonly type: "modifyCarriedItemAffinity"; readonly itemId: string; readonly amount: number }
  | { readonly type: "modifyStorylineScore"; readonly storylineId: string; readonly amount: number }
  | { readonly type: "modifyThreadProgress"; readonly threadId: string; readonly progress: number; readonly tension?: number }
  | { readonly type: "modifyKarmaMerit"; readonly karma?: number; readonly merit?: number }
  | { readonly type: "addAge18Hook"; readonly hookId: string; readonly amount?: number }
  | { readonly type: "addLifeLog"; readonly text: string };

export interface LifeInterludeResult {
  readonly interludeRunId: string;
  readonly definitionId: string;
  readonly mode: LifeInterludeMode;
  readonly outcome: LifeInterludeOutcome;
  readonly score?: number;
  readonly durationSeconds?: number;
  readonly playerChoseManual: boolean;
  readonly visibleSummary: string;
  readonly effects: readonly LifeInterludeWritebackEffect[];
  readonly generatedHooks: readonly string[];
}
