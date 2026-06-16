import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildLifeStorylineDistributionTelemetry,
  formatLifeStorylineDistributionReport
} from "../src/lifeStorylines/LifeStorylineDistributionTelemetry";

const OUTPUT_DIR = join("artifacts", "life-storyline-telemetry-2026-06-15");
const SAMPLE_COUNT = 10_000;

export interface RunLifeStorylineTelemetryReportOptions {
  readonly outputDir?: string;
  readonly sampleCount?: number;
  readonly seedPrefix?: string;
  readonly debugSampleCount?: number;
  readonly log?: (message: string) => void;
}

export interface RunLifeStorylineTelemetryReportResult {
  readonly outputDir: string;
  readonly reportPath: string;
  readonly distributionPath: string;
}

export function runLifeStorylineTelemetryReport(
  options: RunLifeStorylineTelemetryReportOptions = {}
): RunLifeStorylineTelemetryReportResult {
  const outputDir = options.outputDir ?? OUTPUT_DIR;
  const report = buildLifeStorylineDistributionTelemetry({
    sampleCount: options.sampleCount ?? SAMPLE_COUNT,
    seedPrefix: options.seedPrefix ?? "lst-c007-life-storylines",
    debugSampleCount: options.debugSampleCount ?? 16
  });
  const formatted = formatLifeStorylineDistributionReport(report);
  const reportPath = join(outputDir, "LIFE_STORYLINE_REPORT.md");
  const distributionPath = join(outputDir, "distribution.json");

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(reportPath, formatted, "utf8");
  writeFileSync(distributionPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const log = options.log ?? console.log;
  log(`Life storyline telemetry report written to ${outputDir}`);
  log(`sampleCount=${report.sampleCount}`);
  log(`unsupportedFatedViolations=${report.unsupportedFatedViolationCount}`);
  log(`systemPreludeFatedRate=${report.systemPreludeActivation.fated.rate}`);
  log(`downstreamActiveTargetRate=${report.downstreamActiveTargetRate.rate}`);
  log(`systemPreludeDownstreamActiveRate=${report.systemPreludeDownstreamActive.downstreamActive.rate}`);

  return {
    outputDir,
    reportPath,
    distributionPath
  };
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runLifeStorylineTelemetryReport();
}
