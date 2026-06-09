export type SimRedesignModuleId =
  | "world"
  | "opening"
  | "ninePalace"
  | "destinyV2"
  | "originFateV2"
  | "lifeStorylines"
  | "lifeStages"
  | "lifeInterludes"
  | "monthlyEventsV02"
  | "majorChoicesV02"
  | "llmNarrative"
  | "lifePlayable"
  | "adultNode"
  | "trialBridge";

export type SimRedesignPromptId =
  | "SIM-C001"
  | "SIM-C002"
  | "SIM-C003"
  | "SIM-C004"
  | "SIM-C005"
  | "SIM-C006"
  | "SIM-C007"
  | "SIM-C008"
  | "SIM-C009"
  | "SIM-C010"
  | "SIM-C011";

export interface SimRedesignFeatureFlags {
  readonly useNinePalaceEvaluation: boolean;
  readonly useDestinyV2Mutation: boolean;
  readonly useOriginFateNarrativeV2: boolean;
  readonly useLifeStorylines: boolean;
  readonly usePlayableInterludes: boolean;
  readonly useLifeStageIdentity: boolean;
  readonly useMonthlyEventsV02: boolean;
  readonly useMajorChoicesV02: boolean;
  readonly useLlmNarrativeFallback: boolean;
  readonly useDeepSeekNarrativeApi: boolean;
  readonly forceOuterBattlefieldAt18: boolean;
  readonly allowAdultNodeFallbackToOuterBattlefield: boolean;
}

export interface SimRedesignAcceptanceGate {
  readonly id: string;
  readonly name: string;
  readonly checks: readonly string[];
}

export interface SimRedesignMigrationEntry {
  readonly old: string;
  readonly next: string;
  readonly action: "extend_with_evaluation" | "replace_generator_keep_ui_slots" | "replace_hidden_reveal_logic" | "replace_event_pool_and_weighting" | "replace_choice_generation" | "generalize_age18" | "deprecate";
  readonly risk?: string;
}
