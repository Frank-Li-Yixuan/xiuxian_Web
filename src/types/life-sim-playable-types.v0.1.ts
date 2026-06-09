export type Id = string;

export type LifePlayableUiState =
  | "initializing"
  | "playing_months"
  | "paused"
  | "major_choice_pending"
  | "major_choice_resolving"
  | "interlude_prompt"
  | "interlude_running"
  | "interlude_auto_resolving"
  | "stage_summary"
  | "adult_node_pending"
  | "saving"
  | "error";

export type LifePlaybackSpeed = "slow" | "standard" | "fast" | "debug";

export interface LifeSimulationPlayableState {
  readonly profileId: Id;
  readonly characterId: Id;
  readonly seed: string;
  readonly ageMonths: number;
  readonly uiState: LifePlayableUiState;
  readonly playbackSpeed: LifePlaybackSpeed;
  readonly isPaused: boolean;

  readonly currentAgePhaseId: Id;
  readonly currentIdentityStageIds: readonly Id[];

  readonly monthlyLogIds: readonly Id[];
  readonly visibleLogWindow: readonly LifeVisibleLogEntry[];

  readonly storylineSummaries: readonly LifeStorylineSummaryView[];
  readonly carriedItemSummaries: readonly LifeCarriedItemSummaryView[];
  readonly hiddenOmenSummaries: readonly LifeHiddenOmenSummaryView[];

  readonly pendingMajorChoice?: LifeMajorChoiceViewState;
  readonly pendingInterlude?: LifeInterludePromptViewState;
  readonly pendingStageSummary?: LifeStageSummaryViewState;
  readonly adultNodeCandidate?: AdultNodeCandidateViewState;

  readonly telemetry: LifePlayableTelemetryState;
}

export interface LifeVisibleLogEntry {
  readonly id: Id;
  readonly ageMonth: number;
  readonly title: string;
  readonly text: string;
  readonly tier: "breath" | "growth" | "omen" | "thread" | "pressure" | "choice_seed" | "transition_seed";
  readonly visibleEffects: readonly string[];
  readonly tags: readonly string[];
  readonly importance: number;
}

export interface LifeMajorChoiceViewState {
  readonly choiceId: Id;
  readonly title: string;
  readonly description: string;
  readonly sourceLogIds: readonly Id[];
  readonly options: readonly LifeMajorChoiceOptionView[];
}

export interface LifeMajorChoiceOptionView {
  readonly optionId: Id;
  readonly riskLabel: "稳" | "正" | "险" | "凶" | "禁" | "命";
  readonly title: string;
  readonly description: string;
  readonly chanceHint: string;
  readonly visibleTendencyTags: readonly string[];
  readonly interludeHint?: string;
  readonly disabledReason?: string;
}

export interface LifeInterludePromptViewState {
  readonly interludeId: Id;
  readonly mode: "stg" | "horde" | "deckbuilder" | "formation_auto" | "text_check";
  readonly title: string;
  readonly description: string;
  readonly expectedDurationLabel: string;
  readonly manualAvailable: boolean;
  readonly autoResolveAvailable: boolean;
  readonly maxAutoOutcome: string;
}

export interface LifeStageSummaryViewState {
  readonly agePhaseId: Id;
  readonly title: string;
  readonly summaryText: string;
  readonly statChanges: readonly string[];
  readonly notableEvents: readonly string[];
  readonly storylineChanges: readonly string[];
  readonly hiddenOmenChanges: readonly string[];
  readonly carriedItemChanges: readonly string[];
}

export interface AdultNodeCandidateViewState {
  readonly title: string;
  readonly description: string;
  readonly availablePaths: readonly AdultNodePathView[];
  readonly recommendedPathId?: Id;
}

export interface AdultNodePathView {
  readonly pathId: Id;
  readonly title: string;
  readonly description: string;
  readonly riskHint: string;
  readonly modeHint?: string;
}

export interface LifeStorylineSummaryView {
  readonly storylineId: Id;
  readonly name: string;
  readonly score: number;
  readonly state: "dormant" | "hinted" | "active" | "dominant" | "fated";
}

export interface LifeCarriedItemSummaryView {
  readonly itemId: Id;
  readonly displayName: string;
  readonly lifecycleStage: string;
  readonly affinity: number;
  readonly visibleHint: string;
}

export interface LifeHiddenOmenSummaryView {
  readonly publicAlias: string;
  readonly revealBand: "隐约" | "异动" | "将醒" | "已揭示";
  readonly visibleHint: string;
}

export interface LifePlayableTelemetryState {
  readonly majorChoicesShown: number;
  readonly interludeCandidatesShown: number;
  readonly manualInterludesCompleted: number;
  readonly stageSummariesShown: number;
  readonly hiddenTrueNameLeakCount: number;
}
