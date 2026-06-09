export type Id = string;

export type LifePhaseId = "infancy" | "childhood" | "youth" | "adolescence" | "awakening";

export type TrialModeType = "stg" | "horde" | "deckbuilder" | "autochess" | "text";

export type StorylineStatus = "dormant" | "hinted" | "active" | "dominant" | "fated";

export type EventThreadStage =
  | "notStarted"
  | "seeded"
  | "hinted"
  | "developing"
  | "crisis"
  | "resolved"
  | "failed"
  | "dormant";

export interface StorylineSignalRule {
  readonly source:
    | "ninePalace"
    | "spiritualRoot"
    | "destiny"
    | "origin"
    | "hiddenFate"
    | "carriedItem"
    | "lifeState"
    | "recentMonthlyEvents"
    | "majorChoiceOutcome";
  readonly tag?: string;
  readonly stat?: string;
  readonly min?: number;
  readonly max?: number;
  readonly weight: number;
  readonly note?: string;
}

export interface PlayInterludeAffinity {
  readonly mode: TrialModeType;
  readonly weight: number;
  readonly hook: string;
}

export interface LifeStorylineDefinition {
  readonly id: Id;
  readonly name: string;
  readonly shortName: string;
  readonly description: string;
  readonly themeTags: readonly string[];
  readonly worldContextTags: readonly string[];
  readonly baseWeight: number;
  readonly agePhaseAffinity: Record<string, number>;
  readonly activationSignals: readonly StorylineSignalRule[];
  readonly suppressionSignals?: readonly StorylineSignalRule[];
  readonly eventThreadIds: readonly Id[];
  readonly playInterludeAffinities: readonly PlayInterludeAffinity[];
  readonly possibleTransitionHooks: readonly string[];
  readonly possibleAge18Hooks: readonly string[];
}

export interface EventThreadStageDefinition {
  readonly stage: "seed" | "omen" | "development" | "crisis" | "resolution";
  readonly recommendedAgeRange: readonly [number, number];
  readonly requiredProgress?: number;
  readonly tensionDelta?: number;
  readonly clarityDelta?: number;
  readonly riskDelta?: number;
  readonly monthlyEventTags: readonly string[];
  readonly majorChoiceTags: readonly string[];
  readonly visibleNarrativeHints: readonly string[];
  readonly hiddenHooks?: readonly string[];
}

export interface EventThreadDefinition {
  readonly id: Id;
  readonly storylineId: Id;
  readonly name: string;
  readonly description: string;
  readonly threadTags: readonly string[];
  readonly triggerSignals: readonly StorylineSignalRule[];
  readonly stageSequence: readonly EventThreadStageDefinition[];
  readonly monthlyEventHooks: readonly string[];
  readonly majorChoiceHooks: readonly string[];
  readonly playInterludeHooks: readonly string[];
  readonly resolutionHooks: readonly string[];
  readonly failureHooks: readonly string[];
}

export interface StorylineProgress {
  readonly storylineId: Id;
  readonly score: number;
  readonly status: StorylineStatus;
  readonly lastUpdatedMonth: number;
  readonly tags: readonly string[];
}

export interface EventThreadProgress {
  readonly threadId: Id;
  readonly storylineId: Id;
  readonly stage: EventThreadStage;
  readonly progress: number;
  readonly tension: number;
  readonly clarity: number;
  readonly risk: number;
  readonly flags: Readonly<Record<string, boolean | number | string>>;
  readonly lastEventMonth?: number;
}

export interface StorylineHook {
  readonly id: string;
  readonly sourceStorylineId: Id;
  readonly sourceThreadId?: Id;
  readonly weight: number;
  readonly tags: readonly string[];
  readonly visibility: "visible" | "hidden" | "debugOnly";
}

export interface LifeStorylineState {
  readonly activeStorylines: readonly StorylineProgress[];
  readonly eventThreads: readonly EventThreadProgress[];
  readonly recentHooks: readonly StorylineHook[];
  readonly transitionCandidateHooks: readonly string[];
  readonly playInterludeCandidateHooks: readonly string[];
  readonly debug?: LifeStorylineDebugInfo;
}

export interface LifeStorylineDebugInfo {
  readonly scoreBreakdownByStoryline: Readonly<Record<Id, ReadonlyArray<{ source: string; weight: number; note?: string }>>>;
  readonly selectedThreads: readonly Id[];
  readonly suppressedStorylines: readonly Id[];
}

export interface GenerateStorylineInput {
  readonly ageMonths: number;
  readonly openingDraft: unknown;
  readonly ninePalaceEvaluation: unknown;
  readonly destinySelection: unknown;
  readonly originFate: unknown;
  readonly lifeSimulationState?: unknown;
  readonly recentMonthlyLogs?: readonly unknown[];
  readonly recentMajorChoiceResults?: readonly unknown[];
  readonly seed: string;
}
