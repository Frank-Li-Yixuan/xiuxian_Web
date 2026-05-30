import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildOpeningDistributionTelemetry,
  buildOpeningRerollLockCheck,
  formatOpeningDistributionReport
} from "../src/opening/OpeningDistributionTelemetry";

const OUTPUT_DIR = join("artifacts", "opening-generator-distribution-2026-05-30");
const SAMPLE_COUNT = 10_000;

export function runOpeningDistributionReport(): void {
  const report = buildOpeningDistributionTelemetry({
    sampleCount: SAMPLE_COUNT,
    seedPrefix: "oag-c005-distribution",
    debugSampleCount: 16
  });
  const lockCheck = buildOpeningRerollLockCheck({
    seed: "oag-c005-lock-check",
    draftId: "oag_c005_lock_check",
    initialRerollIndex: 0,
    nextRerollIndex: 1
  });
  const formatted = formatOpeningDistributionReport(report, lockCheck);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(join(OUTPUT_DIR, "OPENING_DISTRIBUTION_REPORT.md"), formatted, "utf8");
  writeFileSync(join(OUTPUT_DIR, "OPENING_DISTRIBUTION_REPORT.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(join(OUTPUT_DIR, "EXTREME_SAMPLES.json"), `${JSON.stringify(report.extremeSamples, null, 2)}\n`, "utf8");
  writeFileSync(join(OUTPUT_DIR, "REPRODUCTION_CHECK.json"), `${JSON.stringify(lockCheck, null, 2)}\n`, "utf8");
  console.log(`Opening distribution report written to ${OUTPUT_DIR}`);
  console.log(`sampleCount=${report.sampleCount}`);
  console.log(`rareRootRate=${report.rareRootRate}`);
  console.log(`distinctivenessBelow2Rate=${report.distinctivenessBelow2Rate}`);
  console.log(`reproducible=${lockCheck.reproducible}`);
}

runOpeningDistributionReport();
