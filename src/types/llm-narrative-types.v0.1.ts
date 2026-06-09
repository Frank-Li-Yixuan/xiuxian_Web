export type NarrativeTaskType =
  | "monthly_event_log"
  | "major_choice_intro"
  | "major_choice_options"
  | "interlude_intro"
  | "interlude_result"
  | "stage_transition_summary"
  | "age18_awakening_log"
  | "life_chronicle_summary";

export interface SafeWorldContext {
  readonly regionId: string;
  readonly agePhaseId: string;
  readonly locationIds: readonly string[];
  readonly allowedTerms: readonly string[];
  readonly forbiddenTerms: readonly string[];
}

export interface SafeCharacterSurface {
  readonly visibleName: string;
  readonly visibleOriginName?: string;
  readonly visibleRootName?: string;
  readonly visibleDestinyNames: readonly string[];
  readonly visibleItemNames: readonly string[];
  readonly omenAliases: readonly string[];
}

export interface SafeEventPayload {
  readonly eventId?: string;
  readonly choiceId?: string;
  readonly outcomeId?: string;
  readonly ageMonth: number;
  readonly title?: string;
  readonly summaryTags: readonly string[];
  readonly visibleEffects: readonly string[];
  readonly recentEventTitles?: readonly string[];
  readonly optionTexts?: readonly string[];
}

export interface NarrativeConstraints {
  readonly maxChars: number;
  readonly toneTags: readonly string[];
  readonly mustMention?: readonly string[];
  readonly mustAvoid: readonly string[];
  readonly optionCount?: number;
  readonly outputJsonSchemaId: string;
}

export interface NarrativeRequest {
  readonly requestId: string;
  readonly taskType: NarrativeTaskType;
  readonly locale: "zh-CN";
  readonly templateVersion: string;
  readonly cacheKey: string;
  readonly worldContext: SafeWorldContext;
  readonly characterSurface: SafeCharacterSurface;
  readonly eventPayload: SafeEventPayload;
  readonly constraints: NarrativeConstraints;
}

export interface NarrativeResponse {
  readonly version: "0.1";
  readonly taskType: NarrativeTaskType;
  readonly text: string;
  readonly optionTexts?: readonly string[];
  readonly visibleHints?: readonly string[];
  readonly toneTags: readonly string[];
  readonly safetyFlags: readonly string[];
}

export interface NarrativeValidationResult {
  readonly ok: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly usedFallback: boolean;
}
