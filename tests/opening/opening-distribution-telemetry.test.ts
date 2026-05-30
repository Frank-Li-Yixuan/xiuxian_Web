import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  buildOpeningDistributionTelemetry,
  buildOpeningRerollLockCheck,
  formatOpeningDistributionReport
} from "../../src/opening/OpeningDistributionTelemetry";
import { loadOpeningGeneratorRegistry } from "../../src/opening/OpeningGeneratorRegistry";

const SAMPLE_COUNT = 10_000;

describe("OpeningDistributionTelemetry", () => {
  it("summarizes 10000 deterministic drafts across archetype, root, and aptitude distributions", () => {
    const registry = loadOpeningGeneratorRegistry();
    const report = buildOpeningDistributionTelemetry({
      sampleCount: SAMPLE_COUNT,
      seedPrefix: "oag-c005-distribution",
      debugSampleCount: 8
    });

    expect(report.sampleCount).toBe(SAMPLE_COUNT);
    expect(sumCounts(report.archetypeDistribution)).toBe(SAMPLE_COUNT);
    expect(sumCounts(report.rootCategoryDistribution)).toBe(SAMPLE_COUNT);
    expect(Object.keys(report.archetypeDistribution).sort()).toEqual(
      registry.attributeArchetypes.map((archetype) => archetype.id).sort()
    );
    expect(Object.keys(report.rootCategoryDistribution).sort()).toEqual(
      registry.rootCategories.map((category) => category.id).sort()
    );

    for (const bucket of Object.values(report.archetypeDistribution)) {
      expect(bucket.count).toBeGreaterThan(0);
      expect(bucket.rate).toBeGreaterThan(0);
    }
    for (const bucket of Object.values(report.rootCategoryDistribution)) {
      expect(bucket.count).toBeGreaterThan(0);
      expect(bucket.rate).toBeGreaterThan(0);
    }

    expect(report.rareRootRate).toBeGreaterThan(0.07);
    expect(report.rareRootRate).toBeLessThan(0.25);
    expect(report.distinctivenessBelow2Rate).toBe(0);

    for (const stat of Object.values(report.aptitude)) {
      expect(stat.min).toBeGreaterThanOrEqual(registry.generationRules.statDomains.aptitudeMin);
      expect(stat.max).toBeLessThanOrEqual(registry.generationRules.statDomains.aptitudeHardMax);
      expect(stat.mean).toBeGreaterThan(20);
      expect(stat.mean).toBeLessThan(90);
      expect(stat.lowExtremeRate).toBeLessThan(0.35);
      expect(stat.highExtremeRate).toBeLessThan(0.35);
    }

    expect(report.extremeSamples.highestAptitudeTotal.distinctivenessScore).toBeGreaterThanOrEqual(2);
    expect(report.extremeSamples.lowestAptitudeTotal.distinctivenessScore).toBeGreaterThanOrEqual(2);
    expect(report.extremeSamples.rareRoot.rootCategoryId).toMatch(/^(chaos|heavenly|hidden|variant)$/);
    expect(report.debugSamples).toHaveLength(8);
    expect(report.debugSamples[0]).toMatchObject({
      seed: "oag-c005-distribution-0",
      draftId: "oag_c005_distribution_0",
      rerollIndex: 0
    });
    expect(Object.keys(report.debugSamples[0]?.elementVector ?? {}).length).toBeGreaterThan(0);
    expect(report.debugSamples[0]?.tags.length).toBeGreaterThan(0);
  });

  it("is fully reproducible for the same telemetry seed prefix", () => {
    const first = buildOpeningDistributionTelemetry({
      sampleCount: 512,
      seedPrefix: "oag-c005-repro",
      debugSampleCount: 4
    });
    const second = buildOpeningDistributionTelemetry({
      sampleCount: 512,
      seedPrefix: "oag-c005-repro",
      debugSampleCount: 4
    });

    expect(second).toEqual(first);
  });

  it("checks attribute and spiritual-root reroll locks with reproducible signatures", () => {
    const check = buildOpeningRerollLockCheck({
      seed: "oag-c005-lock-check",
      draftId: "oag_c005_lock_check",
      initialRerollIndex: 0,
      nextRerollIndex: 1
    });

    expect(check.reproducible).toBe(true);
    expect(check.unlocked.changedOpeningSignature).toBe(true);
    expect(check.attributeLock.preservedArchetype).toBe(true);
    expect(check.attributeLock.preservedAptitude).toBe(true);
    expect(check.attributeLock.preservedCoreSeed).toBe(true);
    expect(check.attributeLock.changedSpiritualRoot).toBe(true);
    expect(check.spiritualRootLock.preservedSpiritualRoot).toBe(true);
    expect(check.spiritualRootLock.changedAttributeSide).toBe(true);
  });

  it("formats a report with distribution, extreme sample, and reproducibility sections", () => {
    const report = buildOpeningDistributionTelemetry({
      sampleCount: 128,
      seedPrefix: "oag-c005-format",
      debugSampleCount: 2
    });
    const formatted = formatOpeningDistributionReport(report, buildOpeningRerollLockCheck({
      seed: "oag-c005-format-lock",
      draftId: "oag_c005_format_lock",
      initialRerollIndex: 0,
      nextRerollIndex: 1
    }));

    expect(formatted).toContain("# Opening Generator Distribution Report");
    expect(formatted).toContain("sampleCount: 128");
    expect(formatted).toContain("## Archetype Distribution");
    expect(formatted).toContain("## Spiritual Root Distribution");
    expect(formatted).toContain("## Extreme Samples");
    expect(formatted).toContain("## Same Seed Reproduction");
  });

  it("does not use Math.random in distribution telemetry or opening generators", () => {
    for (const path of [
      "src/opening/OpeningDistributionTelemetry.ts",
      "src/opening/OpeningGenerator.ts",
      "src/opening/OpeningAttributeGenerator.ts",
      "src/opening/OpeningSpiritualRootGenerator.ts"
    ]) {
      const source = readFileSync(path, "utf8");

      expect(source).not.toContain("Math.random");
    }
  });
});

function sumCounts(distribution: Readonly<Record<string, { readonly count: number }>>): number {
  return Object.values(distribution).reduce((total, bucket) => total + bucket.count, 0);
}
