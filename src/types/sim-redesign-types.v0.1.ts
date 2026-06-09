export type SimRedesignModuleId =
  | "WORLD"
  | "NPF"
  | "DEM"
  | "LST"
  | "LPI"
  | "LSTG"
  | "ME2"
  | "MC2"
  | "HFO2"
  | "LLM"
  | "LFP";

export interface SimRedesignExecutionPhase {
  readonly id: string;
  readonly name: string;
  readonly prompts: readonly string[];
  readonly gate: string;
  readonly optional?: boolean;
}

export interface SimRedesignMigrationRule {
  readonly version: string;
  readonly deprecatedPromptPrefixes: readonly string[];
  readonly deprecatedSystems: readonly string[];
  readonly newSystems: readonly SimRedesignModuleId[];
  readonly uiRule: string;
  readonly llmRule: string;
}

export interface SimRedesignStateRef {
  readonly profileId: string;
  readonly schemaVersion: "sim-redesign-v0.1";
  readonly characterOriginId?: string;
  readonly lifeSimulationId?: string;
  readonly currentMonth?: number;
  readonly currentStage?: string;
  readonly activeStorylines?: readonly string[];
  readonly pendingMajorChoiceId?: string;
  readonly pendingInterludeId?: string;
}
