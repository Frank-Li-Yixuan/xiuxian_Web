export type EngineeringPhaseId =
  | "phase_0"
  | "phase_1"
  | "phase_2"
  | "phase_3"
  | "phase_4"
  | "phase_5"
  | "phase_6"
  | "phase_7"
  | "phase_8"
  | "phase_9";

export interface EngineeringPhase {
  id: EngineeringPhaseId;
  name: string;
  deliverables: string[];
  gate: string[];
}

export interface EngineeringRoadmap {
  version: string;
  phases: EngineeringPhase[];
}

export interface CodexTask {
  id: `C${number}`;
  name: string;
  status: "planned" | "in_progress" | "done" | "blocked";
  maxScope: "single_file" | "single_module_or_system" | "multi_module_gate";
  requiresTests: boolean;
  allowedPaths?: string[];
  forbiddenPaths?: string[];
  acceptance?: string[];
}

export interface ModuleContracts {
  version: string;
  forbiddenInSim: string[];
  simUpdateOrder: string[];
  hashIncludes: string[];
  hashExcludes: string[];
}

export interface TestGate {
  name: string;
  commands: string[];
}

export interface EngineeringTestMatrix {
  version: string;
  commands: Record<string, string>;
  gates: TestGate[];
}
