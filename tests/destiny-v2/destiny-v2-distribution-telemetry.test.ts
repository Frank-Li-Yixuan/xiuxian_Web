import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  buildDestinyV2DistributionTelemetry,
  formatDestinyV2DistributionReport
} from "../../src/destinyV2/DestinyV2DistributionTelemetry";

const SAMPLE_COUNT = 10_000;

describe("DestinyV2DistributionTelemetry", () => {
  it("summarizes 10000 deterministic default character creation drafts", () => {
    const report = buildDestinyV2DistributionTelemetry({
      sampleCount: SAMPLE_COUNT,
      seedPrefix: "dem-c007-test",
      debugSampleCount: 8
    });

    expect(report.version).toBe("0.1");
    expect(report.sampleCount).toBe(SAMPLE_COUNT);
    expect(report.seedPrefix).toBe("dem-c007-test");
    expect(sumCounts(report.slotQualityDistribution.main)).toBe(SAMPLE_COUNT);
    expect(sumCounts(report.slotQualityDistribution.secondary0)).toBe(SAMPLE_COUNT);
    expect(sumCounts(report.slotQualityDistribution.secondary1)).toBe(SAMPLE_COUNT);
    expect(sumCounts(report.slotQualityDistribution.flaw)).toBe(SAMPLE_COUNT);
    expect(report.slotQualityDistribution.main.flaw?.count ?? 0).toBe(0);
    expect(Object.keys(report.slotQualityDistribution.main).length).toBeGreaterThan(0);
    expect(report.hardConflictViolationCount).toBe(0);
    expect(report.hardConflictViolations).toEqual([]);
    expect(report.antiWeirdnessViolationCount).toBe(0);
    expect(report.antiWeirdnessViolations).toEqual([]);
    expect(report.mutationAppearance.count).toBeGreaterThan(0);
    expect(report.mutationAppearance.rate).toBeGreaterThan(0);
    expect(Object.keys(report.mutationCountsById).length).toBeGreaterThan(0);
    expect(report.synergyAppearance.count).toBeGreaterThan(0);
    expect(report.synergyAppearance.rate).toBeGreaterThan(0);
    expect(Object.keys(report.synergyCountsByTag).length).toBeGreaterThan(0);
    expect(report.uiHiddenLeakScan.leakCount).toBe(0);
    expect(report.uiHiddenLeakScan.leakedSampleSeeds).toEqual([]);
    expect(report.debugSamples).toHaveLength(8);
    expect(report.debugSamples[0]).toMatchObject({
      seed: "dem-c007-test-0",
      draftId: "dem_c007_test_0",
      rerollIndex: 0
    });
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.debugSamples[0])).toBe(true);
    expect(JSON.stringify(report)).not.toContain("trueName");
    expect(JSON.stringify(report)).not.toContain("hiddenFateInternal");
  }, 60_000);

  it("records canonical anti-weirdness, mutation, and synergy probes", () => {
    const report = buildDestinyV2DistributionTelemetry({
      sampleCount: 128,
      seedPrefix: "dem-c007-probes",
      debugSampleCount: 2
    });

    expect(report.acceptanceProbes.lowTalentHeavenJealous).toMatchObject({
      originalDestinyId: "destiny_heaven_jealous_talent",
      action: "mutate",
      resolvedDestinyId: "destiny_false_heavenly_burden"
    });
    expect(report.acceptanceProbes.highRootWasteReversal).toMatchObject({
      originalDestinyId: "destiny_waste_root_reversal",
      action: "mutate",
      resolvedDestinyId: "destiny_heaven_pride_under_calamity"
    });
    expect(report.acceptanceProbes.cowardBattleAnti.resolvedDestinyId).toBe("destiny_hidden_killer");
    expect(report.acceptanceProbes.cowardKillingStarAnti.resolvedDestinyId).toBe("destiny_hidden_killer");
    expect(report.acceptanceProbes.cowardAggressiveTagAnti.resolvedDestinyId).toBe("destiny_hidden_killer");
    expect(report.acceptanceProbes.demonClearGlassConflict.finalDestinyIds).toEqual(["destiny_pure_lotus_shadow"]);
    expect(report.acceptanceProbes.heavenThunderSynergy.synergyTags).toEqual(
      expect.arrayContaining(["tribulation_reward_up", "thunder_omen_up"])
    );
  });

  it("is reproducible for the same seed prefix and formats a readable report", () => {
    const first = buildDestinyV2DistributionTelemetry({
      sampleCount: 256,
      seedPrefix: "dem-c007-repro",
      debugSampleCount: 4
    });
    const second = buildDestinyV2DistributionTelemetry({
      sampleCount: 256,
      seedPrefix: "dem-c007-repro",
      debugSampleCount: 4
    });
    const formatted = formatDestinyV2DistributionReport(first);

    expect(second).toEqual(first);
    expect(formatted).toContain("# Destiny v2 Distribution Report");
    expect(formatted).toContain("sampleCount: 256");
    expect(formatted).toContain("Slot Quality Distribution");
    expect(formatted).toContain("Mutation Appearance");
    expect(formatted).toContain("Synergy Appearance");
    expect(formatted).toContain("Hard Conflict Violations");
    expect(formatted).toContain("Anti-Weirdness Violations");
    expect(formatted).toContain("Hidden Leak Scan");
  });

  it("does not use nondeterministic or external side-effect APIs", () => {
    const source = readFileSync("src/destinyV2/DestinyV2DistributionTelemetry.ts", "utf8");

    for (const forbidden of [
      "Math.random",
      "Date.now",
      "performance.now",
      "document.",
      "fetch(",
      "trueName"
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });
});

function sumCounts(distribution: Readonly<Record<string, { readonly count: number }>>): number {
  return Object.values(distribution).reduce((total, bucket) => total + bucket.count, 0);
}
