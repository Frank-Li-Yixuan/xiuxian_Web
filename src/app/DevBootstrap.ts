export interface DevBootstrapSummary {
  readonly projectName: string;
  readonly availableCommands: readonly string[];
  readonly simulationBoundaryRules: readonly string[];
  readonly firstPlayableScope: string;
}

export function createDevBootstrapSummary(): DevBootstrapSummary {
  return {
    projectName: "xiuxian-stg",
    availableCommands: [
      "dev",
      "build",
      "typecheck",
      "test",
      "validate:data",
      "check:forbidden",
      "test:determinism",
      "test:headless:stage01"
    ],
    simulationBoundaryRules: [
      "src/sim has no DOM, Canvas, audio, network, true time, or Math.random access",
      "renderer and UI consume ViewState and EffectEvents instead of owning gameplay state",
      "TeamInsightExpState and PlayerCultivationState remain separate progression tracks"
    ],
    firstPlayableScope: "repository scaffold only; gameplay and renderer are intentionally not implemented"
  };
}
