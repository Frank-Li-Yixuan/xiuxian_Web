import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { runDestinyV2TelemetryReport } from "../../tools/run-destiny-v2-telemetry-report";

describe("runDestinyV2TelemetryReport", () => {
  it("writes markdown and JSON telemetry artifacts to the requested output directory", () => {
    const outputDir = mkdtempSync(join(tmpdir(), "dem-c007-"));

    try {
      const result = runDestinyV2TelemetryReport({
        outputDir,
        sampleCount: 32,
        seedPrefix: "dem-c007-runner-test",
        debugSampleCount: 2,
        log: () => {}
      });
      const markdownPath = join(outputDir, "DESTINY_V2_REPORT.md");
      const jsonPath = join(outputDir, "distribution.json");

      expect(result.outputDir).toBe(outputDir);
      expect(result.reportPath).toBe(markdownPath);
      expect(result.distributionPath).toBe(jsonPath);
      expect(existsSync(markdownPath)).toBe(true);
      expect(existsSync(jsonPath)).toBe(true);
      expect(readFileSync(markdownPath, "utf8")).toContain("# Destiny v2 Distribution Report");
      const parsed = JSON.parse(readFileSync(jsonPath, "utf8"));
      expect(parsed.sampleCount).toBe(32);
      expect(parsed.uiHiddenLeakScan.leakCount).toBe(0);
      expect(JSON.stringify(parsed)).not.toContain("trueName");
      expect(JSON.stringify(parsed)).not.toContain("hiddenFateInternal");
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });
});
