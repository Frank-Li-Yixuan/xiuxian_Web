import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildDestinyV2DistributionTelemetry,
  formatDestinyV2DistributionReport
} from "../src/destinyV2/DestinyV2DistributionTelemetry";

const OUTPUT_DIR = join("artifacts", "destiny-v2-telemetry-2026-06-11");
const SAMPLE_COUNT = 10_000;

export interface RunDestinyV2TelemetryReportOptions {
  readonly outputDir?: string;
  readonly sampleCount?: number;
  readonly seedPrefix?: string;
  readonly debugSampleCount?: number;
  readonly log?: (message: string) => void;
}

export interface RunDestinyV2TelemetryReportResult {
  readonly outputDir: string;
  readonly reportPath: string;
  readonly distributionPath: string;
}

export function runDestinyV2TelemetryReport(
  options: RunDestinyV2TelemetryReportOptions = {}
): RunDestinyV2TelemetryReportResult {
  const outputDir = options.outputDir ?? OUTPUT_DIR;
  const report = buildDestinyV2DistributionTelemetry({
    sampleCount: options.sampleCount ?? SAMPLE_COUNT,
    seedPrefix: options.seedPrefix ?? "dem-c007-destiny-v2",
    debugSampleCount: options.debugSampleCount ?? 16
  });
  const formatted = formatDestinyV2DistributionReport(report);
  const reportPath = join(outputDir, "DESTINY_V2_REPORT.md");
  const distributionPath = join(outputDir, "distribution.json");

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(reportPath, formatted, "utf8");
  writeFileSync(distributionPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const log = options.log ?? console.log;
  log(`Destiny v2 telemetry report written to ${outputDir}`);
  log(`sampleCount=${report.sampleCount}`);
  log(`hardConflictViolations=${report.hardConflictViolationCount}`);
  log(`antiWeirdnessViolations=${report.antiWeirdnessViolationCount}`);
  log(`hiddenLeaks=${report.uiHiddenLeakScan.leakCount}`);

  return {
    outputDir,
    reportPath,
    distributionPath
  };
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runDestinyV2TelemetryReport();
}
