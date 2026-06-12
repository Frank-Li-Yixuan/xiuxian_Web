import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  buildNinePalaceDistributionTelemetry,
  formatNinePalaceDistributionReport
} from "../../src/ninePalace/NinePalaceDistributionTelemetry";

const SAMPLE_COUNT = 10_000;

describe("NinePalaceDistributionTelemetry", () => {
  it("summarizes 10000 deterministic nine-palace destiny v2 drafts", () => {
    const report = buildNinePalaceDistributionTelemetry({
      sampleCount: SAMPLE_COUNT,
      seedPrefix: "npf-c006-test",
      debugSampleCount: 8
    });

    expect(report.version).toBe("0.1");
    expect(report.sampleCount).toBe(SAMPLE_COUNT);
    expect(report.seedPrefix).toBe("npf-c006-test");
    const heavenJealousTalent = report.targetSamples.heavenJealousTalent.talentScore;
    const wasteRootBone = report.targetSamples.wasteRootReversal.rootBone;
    const wasteHeart = report.targetSamples.wasteRootReversal.heart;
    const cowardHeart = report.targetSamples.cowardlySupreme.heart;
    const cowardLifespan = report.targetSamples.cowardlySupreme.lifespan;

    expect(heavenJealousTalent).toBeDefined();
    expect(wasteRootBone).toBeDefined();
    expect(wasteHeart).toBeDefined();
    expect(cowardHeart).toBeDefined();
    expect(cowardLifespan).toBeDefined();
    expect(report.targetSamples.heavenJealousTalent.sampleCount).toBeGreaterThan(0);
    expect(heavenJealousTalent!.max).toBeGreaterThanOrEqual(85);
    expect(report.targetSamples.wasteRootReversal.sampleCount).toBeGreaterThan(0);
    expect(wasteRootBone!.min).toBeLessThanOrEqual(35);
    expect(wasteHeart!.max).toBeGreaterThanOrEqual(70);
    expect(report.targetSamples.cowardlySupreme.sampleCount).toBeGreaterThan(0);
    expect(cowardHeart!.max).toBeGreaterThanOrEqual(80);
    expect(cowardLifespan!.max).toBeGreaterThanOrEqual(70);
    expect(report.mutationAppearance.count).toBeGreaterThan(0);
    expect(report.mutationAppearance.rate).toBeGreaterThan(0);
    expect(Object.keys(report.mutationCountsById).length).toBeGreaterThan(0);
    expect(report.antiWeirdnessViolations).toEqual([]);
    expect(report.debugSamples).toHaveLength(8);
    expect(report.debugSamples[0]).toMatchObject({
      seed: "npf-c006-test-0",
      draftId: "npf_c006_test_0",
      rerollIndex: 0
    });
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.debugSamples[0])).toBe(true);
    expect(JSON.stringify(report)).not.toContain("trueName");
    expect(JSON.stringify(report)).not.toContain("hiddenInternal");
  }, 30_000);

  it("is reproducible for the same seed prefix and formats a readable report", () => {
    const first = buildNinePalaceDistributionTelemetry({
      sampleCount: 256,
      seedPrefix: "npf-c006-repro",
      debugSampleCount: 4
    });
    const second = buildNinePalaceDistributionTelemetry({
      sampleCount: 256,
      seedPrefix: "npf-c006-repro",
      debugSampleCount: 4
    });
    const formatted = formatNinePalaceDistributionReport(first);

    expect(second).toEqual(first);
    expect(formatted).toContain("# Nine Palace Fate Matrix Distribution Report");
    expect(formatted).toContain("sampleCount: 256");
    expect(formatted).toContain("Heaven-Jealous Talent talentScore");
    expect(formatted).toContain("Waste-Root Reversal rootBone/heart");
    expect(formatted).toContain("Cowardly Supreme heart/lifespan");
    expect(formatted).toContain("Mutation Destiny Appearance Rate");
    expect(formatted).toContain("Anti-Weirdness Violations");
  });

  it("does not use nondeterministic or external side-effect APIs", () => {
    const source = readFileSync("src/ninePalace/NinePalaceDistributionTelemetry.ts", "utf8");

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
