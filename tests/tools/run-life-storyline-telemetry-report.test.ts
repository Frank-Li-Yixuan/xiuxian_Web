import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { runLifeStorylineTelemetryReport } from "../../tools/run-life-storyline-telemetry-report";

describe("runLifeStorylineTelemetryReport", () => {
  it("writes markdown and JSON telemetry artifacts to the requested output directory", () => {
    const outputDir = mkdtempSync(join(tmpdir(), "lst-c007-"));

    try {
      const result = runLifeStorylineTelemetryReport({
        outputDir,
        sampleCount: 32,
        seedPrefix: "lst-c007-runner-test",
        debugSampleCount: 2,
        log: () => {}
      });
      const markdownPath = join(outputDir, "LIFE_STORYLINE_REPORT.md");
      const jsonPath = join(outputDir, "distribution.json");

      expect(result.outputDir).toBe(outputDir);
      expect(result.reportPath).toBe(markdownPath);
      expect(result.distributionPath).toBe(jsonPath);
      expect(existsSync(markdownPath)).toBe(true);
      expect(existsSync(jsonPath)).toBe(true);
      expect(readFileSync(markdownPath, "utf8")).toContain("# Life Storyline Distribution Report");
      const parsed = JSON.parse(readFileSync(jsonPath, "utf8"));
      expect(parsed.sampleCount).toBe(32);
      expect(parsed.unsupportedFatedViolationCount).toBe(0);
      expect(JSON.stringify(parsed)).not.toMatch(/trueName|true_name|truename|hiddenFateInternal|SHOULD_NOT_LEAK/i);
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });
});
