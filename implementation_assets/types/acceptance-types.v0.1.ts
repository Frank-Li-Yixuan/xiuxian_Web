// xiuxian acceptance-types.v0.1.ts
// First Playable 总集成验收相关类型草案。

export type AcceptanceLevel = "must" | "should" | "optional" | "deferred" | "forbidden";
export type GateStatus = "not_started" | "in_progress" | "blocked" | "passed" | "waived";
export type TestType = "unit" | "content" | "integration" | "determinism" | "manual" | "performance";

export interface FirstPlayableGateDefinition {
  version: string;
  name: string;
  oneLineDefinition: string;
  hardRules: string[];
  gates: BuildGateDefinition[];
  successStatement: string[];
}

export interface BuildGateDefinition {
  id: string;
  name: string;
  order?: number;
  blocking: boolean;
  exitCriteria?: string[];
}

export interface AcceptanceChecklistCategory {
  id: string;
  name: string;
  items: AcceptanceChecklistItem[];
}

export interface AcceptanceChecklistItem {
  id: string;
  level: AcceptanceLevel;
  text: string;
  owner?: string;
  gateId?: string;
  status?: GateStatus;
  evidence?: string[];
  waiverReason?: string;
}

export interface FeatureFlagDefinition {
  default: boolean;
  scope: AcceptanceLevel;
  description?: string;
}

export interface IntegrationScenarioDefinition {
  id: string;
  name: string;
  mode: "single" | "local_coop" | "online_mock" | "debug" | "single_or_coop";
  expected: string[];
  required?: boolean;
}

export interface TestMatrixItem {
  id: string;
  type: TestType;
  target: string;
  required: boolean;
  command?: string;
  status?: "not_run" | "pass" | "fail" | "waived";
}

export interface TelemetryTargetRange {
  min?: number;
  max?: number;
  target?: number;
  allowShortDrops?: boolean;
}

export interface FirstPlayableTelemetryTargets {
  version: string;
  targets: Record<string, TelemetryTargetRange>;
  eventsToLog: string[];
}

export interface PlaytestReport {
  buildId: string;
  testerId: string;
  date: string;
  mode: "single" | "local_coop";
  completedFirstStage: boolean;
  returnedToDongfu: boolean;
  startedSecondRun: boolean;
  understoodInsightVsCultivation: boolean;
  usedSpellNaturally: boolean;
  usedPillBeforeEmergency: boolean;
  wantedAnotherRun: boolean;
  blockerBugs: string[];
  notes: string;
}
