import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  buildDestinyCombinationProbe,
  buildDestinyDebugSamples,
  buildDestinyDistributionTelemetry,
  buildDestinyRerollLockCheck,
  formatDestinyDebugSamples,
  formatDestinyDistributionReport
} from "../../src/characterCreation/destiny/DestinyDistributionTelemetry";
import { DestinyCombinationEngine } from "../../src/characterCreation/destiny/DestinyCombinationEngine";
import { loadDestinyRegistry } from "../../src/characterCreation/destiny/DestinyRegistry";
import snapshotFixture from "./destiny-roll-telemetry.snapshot.v0.1.json";

const SAMPLE_COUNT = 10_000;

describe("DestinyDistributionTelemetry", () => {
  it("summarizes 10000 deterministic destiny rolls inside tuning bounds", () => {
    const report = buildDestinyDistributionTelemetry({
      sampleCount: SAMPLE_COUNT,
      seedPrefix: "dt-c006-distribution",
      debugSampleCount: 8
    });

    expect(report.sampleCount).toBe(SAMPLE_COUNT);
    expect(sumCounts(report.slotQualityDistribution.main)).toBe(SAMPLE_COUNT);
    expect(sumCounts(report.slotQualityDistribution.secondary0)).toBe(SAMPLE_COUNT);
    expect(sumCounts(report.slotQualityDistribution.secondary1)).toBe(SAMPLE_COUNT);
    expect(sumCounts(report.slotQualityDistribution.flaw)).toBe(SAMPLE_COUNT);
    expect(report.slotQualityDistribution.main.mortal?.count ?? 0).toBe(0);
    expect(Object.keys(report.slotQualityDistribution.flaw)).toEqual(["flaw"]);
    expect(report.hardExclusiveCount).toBe(0);
    expect(report.hardExclusiveSamples).toEqual([]);
    expect(report.distributionWarnings).toEqual([]);
    expect(report.debugSamples).toHaveLength(8);
    expect(report.debugSamples[0]).toMatchObject({
      seed: "dt-c006-distribution-0",
      draftId: "dt_c006_distribution_0",
      rerollIndex: 0
    });
    expect(report.debugSamples[0]?.traitIds).toHaveLength(4);
  }, 15_000);

  it("verifies every sampled trait set through the hard-exclusive engine", () => {
    const registry = loadDestinyRegistry();
    const engine = new DestinyCombinationEngine(registry);
    const report = buildDestinyDistributionTelemetry({
      sampleCount: 1_024,
      seedPrefix: "dt-c006-exclusive-scan",
      debugSampleCount: 0
    });

    for (const sample of report.sampleTraitIds) {
      expect(engine.hasHardExclusive(sample.traitIds), sample.seed).toBe(false);
    }

    const heavenLate = buildDestinyCombinationProbe([
      "destiny_heaven_jealous_talent",
      "destiny_late_bloomer"
    ]);
    const turtleBattle = buildDestinyCombinationProbe([
      "destiny_turtle_supreme",
      "destiny_battle_nourished"
    ]);

    expect(heavenLate.hasHardExclusive).toBe(true);
    expect(heavenLate.hardExclusiveRuleIds).toContain("ex_heaven_late");
    expect(turtleBattle.hasHardExclusive).toBe(true);
    expect(turtleBattle.hardExclusiveRuleIds).toContain("ex_turtle_battle");
  });

  it("checks reproducibility and independent reroll locks", () => {
    const check = buildDestinyRerollLockCheck({
      seed: "dt-c006-lock-check",
      draftId: "dt_c006_lock_check",
      initialRerollIndex: 0,
      nextRerollIndex: 1
    });

    expect(check.reproducible).toBe(true);
    expect(check.unlocked.changedDestinySignature).toBe(true);
    expect(check.mainLock.preservedMain).toBe(true);
    expect(check.secondary0Lock.preservedSecondary0).toBe(true);
    expect(check.secondary1Lock.preservedSecondary1).toBe(true);
    expect(check.flawLock.preservedFlaw).toBe(true);
    expect(check.allLocks.preservedFullDestiny).toBe(true);
  });

  it("recognizes synergy probes and warning text", () => {
    const heavenThunder = buildDestinyCombinationProbe([
      "destiny_heaven_jealous_talent",
      "destiny_thunder_affinity"
    ]);
    const defiantTenacious = buildDestinyCombinationProbe([
      "destiny_waste_root_defiant",
      "destiny_tenacious"
    ]);

    expect(heavenThunder.synergyIds).toEqual(["syn_heaven_thunder"]);
    expect(heavenThunder.synergyWarnings.join("\n")).toContain("syn_heaven_thunder");
    expect(defiantTenacious.synergyIds).toEqual(["syn_defiant_tenacious"]);
    expect(defiantTenacious.synergyWarnings.join("\n")).toContain("syn_defiant_tenacious");
  });

  it("formats readable distribution and sample destiny charts", () => {
    const report = buildDestinyDistributionTelemetry({
      sampleCount: 128,
      seedPrefix: "dt-c006-format",
      debugSampleCount: 2
    });
    const formattedReport = formatDestinyDistributionReport(report, buildDestinyRerollLockCheck({
      seed: "dt-c006-format-lock",
      draftId: "dt_c006_format_lock",
      initialRerollIndex: 0,
      nextRerollIndex: 1
    }));
    const formattedSamples = formatDestinyDebugSamples(buildDestinyDebugSamples({
      seedPrefix: "dt-c006-debug",
      count: 3
    }));

    expect(formattedReport).toContain("# Destiny Distribution Report");
    expect(formattedReport).toContain("sampleCount: 128");
    expect(formattedReport).toContain("## Slot Quality Distribution");
    expect(formattedReport).toContain("## Reroll Lock Check");
    expect(formattedSamples).toContain("# Destiny Roll Debug Samples");
    expect(formattedSamples).toContain("Main Destiny");
    expect(formattedSamples).toContain("Secondary Destiny 1");
    expect(formattedSamples).toContain("Secondary Destiny 2");
    expect(formattedSamples).toContain("Flaw Destiny");
    expect(formattedSamples).toContain("Synergies");
    expect(formattedSamples).toContain("Warnings");
  });

  it("matches the stable tuning snapshot for future comparison", () => {
    const report = buildDestinyDistributionTelemetry({
      sampleCount: 512,
      seedPrefix: "dt-c006-snapshot",
      debugSampleCount: 4
    });

    expect(report.tuningSnapshot).toEqual(snapshotFixture);
  });

  it("does not use Math.random in destiny telemetry or debug output", () => {
    for (const path of [
      "src/characterCreation/destiny/DestinyDistributionTelemetry.ts",
      "src/characterCreation/destiny/DestinyRoller.ts",
      "src/characterCreation/destiny/DestinyCombinationEngine.ts",
      "scripts/debug-destiny-rolls.ts"
    ]) {
      const source = readFileSync(path, "utf8");

      expect(source).not.toContain("Math.random");
    }
  });
});

function sumCounts(distribution: Readonly<Record<string, { readonly count: number }>>): number {
  return Object.values(distribution).reduce((total, bucket) => total + bucket.count, 0);
}
