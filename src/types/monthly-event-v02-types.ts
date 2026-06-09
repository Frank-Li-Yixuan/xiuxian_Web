export type Id = string;

export type LifeAgePhaseId = "infant" | "child" | "youth" | "teen";

export type MonthlyEventCategoryId =
  | "ambient_world"
  | "family_bond"
  | "body_health"
  | "study_scholar"
  | "martial_labor"
  | "alchemy_herb"
  | "temple_talisman"
  | "dream_spirit"
  | "origin_clue"
  | "destiny_manifest"
  | "hidden_omen"
  | "disaster_karmic"
  | "storyline_thread"
  | "interlude_hook"
  | "stage_transition"
  | "system_omen";

export type MonthlyEventTierId =
  | "breath"
  | "growth"
  | "omen"
  | "thread"
  | "pressure"
  | "choice_seed"
  | "transition_seed";

export interface MonthlyEventCategoryDefinition {
  readonly id: MonthlyEventCategoryId;
  readonly name: string;
  readonly purpose: string;
  readonly densityCost: number;
}

export interface MonthlyEventTierDefinition {
  readonly id: MonthlyEventTierId;
  readonly name: string;
  readonly description: string;
  readonly baseDensityCost: number;
  readonly recommendedPerYear: readonly [number, number];
}

export interface MonthlyLifeEventV02 {
  readonly id: Id;
  readonly title: string;
  readonly phase: LifeAgePhaseId;
  readonly ageMonthRange: readonly [number, number];
  readonly category: MonthlyEventCategoryId;
  readonly tier: MonthlyEventTierId;
  readonly description: string;
  readonly baseWeight: number;
  readonly cooldownMonths: number;
  readonly maxTriggersPerLife: number;
  readonly tags: readonly string[];
  readonly storylineIds: readonly Id[];
  readonly threadIds: readonly Id[];
  readonly conditions: readonly LifeEventConditionV02[];
  readonly visibleEffects: readonly LifeEventEffectV02[];
  readonly hiddenEffects: readonly LifeEventEffectV02[];
  readonly hooks: readonly string[];
  readonly interludeCandidate?: Id | null;
  readonly stageTransitionSignal?: string | null;
  readonly llmBrief: {
    readonly tone: string;
    readonly maxChars: number;
    readonly mustNotRevealHiddenTrueName: boolean;
  };
}

export type LifeEventConditionV02 =
  | { readonly type: "hasTag"; readonly tag: string }
  | { readonly type: "minStat"; readonly stat: string; readonly value: number }
  | { readonly type: "maxStat"; readonly stat: string; readonly value: number }
  | { readonly type: "storylineActive"; readonly storylineId: Id; readonly minScore?: number }
  | { readonly type: "threadState"; readonly threadId: Id; readonly state: string };

export type LifeEventEffectV02 =
  | { readonly stat: string; readonly delta: number }
  | { readonly aptitude: string; readonly delta: number }
  | { readonly skill: string; readonly delta: number }
  | { readonly karma: "merit" | "karma"; readonly delta: number }
  | { readonly wound: string; readonly delta: number }
  | { readonly flag: string; readonly delta: number | boolean | string }
  | { readonly hiddenFateTag: string; readonly delta: number }
  | { readonly carriedItemAffinityTag: string; readonly delta: number }
  | { readonly originFateTag: string; readonly delta: number }
  | { readonly destinyTag: string; readonly delta: number }
  | { readonly age18Hook: string; readonly delta: number }
  | { readonly stageToken: string; readonly delta: number };

export interface NarrativeDensityWindowState {
  readonly startMonth: number;
  readonly endMonth: number;
  readonly densityUsed: number;
  readonly hardEventCount: number;
  readonly categoryCounts: Readonly<Record<string, number>>;
  readonly tierCounts: Readonly<Record<string, number>>;
  readonly hookCounts: Readonly<Record<string, number>>;
}

export interface MonthlyEventSelectionContextV02 {
  readonly ageMonth: number;
  readonly phase: LifeAgePhaseId;
  readonly lifeState: unknown;
  readonly ninePalaceEvaluation?: unknown;
  readonly destinyState?: unknown;
  readonly originFate?: unknown;
  readonly storylineState?: unknown;
  readonly stageState?: unknown;
  readonly densityWindow: NarrativeDensityWindowState;
  readonly recentEventIds: readonly Id[];
  readonly recentTags: readonly string[];
  readonly rng: unknown;
}

export interface MonthlyEventCandidateDebugV02 {
  readonly eventId: Id;
  readonly title: string;
  readonly finalWeight: number;
  readonly reasons: readonly string[];
  readonly penalties: readonly string[];
}

export interface MonthlyEventSelectionResultV02 {
  readonly selectedEventId: Id;
  readonly candidateCount: number;
  readonly debugTopCandidates?: readonly MonthlyEventCandidateDebugV02[];
}

export interface MonthlyLifeLogEntryV02 {
  readonly ageMonth: number;
  readonly eventId: Id;
  readonly title: string;
  readonly visibleText: string;
  readonly visibleEffects: readonly LifeEventEffectV02[];
  readonly hooks: readonly string[];
  readonly tier: MonthlyEventTierId;
  readonly category: MonthlyEventCategoryId;
  readonly collapsed?: boolean;
}
