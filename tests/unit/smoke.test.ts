import { describe, expect, it } from "vitest";

import { createDevBootstrapSummary } from "../../src/app/DevBootstrap";

describe("repository scaffold", () => {
  it("exposes the initial dev bootstrap commands and boundaries", () => {
    const summary = createDevBootstrapSummary();

    expect(summary.projectName).toBe("xiuxian-stg");
    expect(summary.availableCommands).toEqual([
      "dev",
      "build",
      "typecheck",
      "test",
      "validate:data",
      "check:forbidden",
      "test:determinism",
      "test:headless:stage01"
    ]);
    expect(summary.simulationBoundaryRules).toContain("src/sim has no DOM, Canvas, audio, network, true time, or Math.random access");
    expect(summary.firstPlayableScope).toBe("repository scaffold only; gameplay and renderer are intentionally not implemented");
  });
});
