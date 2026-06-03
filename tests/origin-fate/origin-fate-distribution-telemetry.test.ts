import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  buildOriginFateCreationPreview,
  buildOriginFateDistributionTelemetry,
  buildOriginFateRerollLockCheck,
  formatOriginFateDistributionReport
} from "../../src/originFate/OriginFateDistributionTelemetry";
import { DefaultOriginFateGenerator } from "../../src/originFate/OriginFateGenerator";
import { loadOriginFateRegistry } from "../../src/originFate/OriginFateRegistry";

const SAMPLE_COUNT = 10_000;

describe("OriginFateDistributionTelemetry", () => {
  it("summarizes 10000 deterministic origin fate drafts inside tuning bounds", () => {
    const registry = loadOriginFateRegistry();
    const report = buildOriginFateDistributionTelemetry({
      sampleCount: SAMPLE_COUNT,
      seedPrefix: "hfo-c008-distribution",
      debugSampleCount: 8
    });

    expect(report.sampleCount).toBe(SAMPLE_COUNT);
    expect(sumCounts(report.backgroundOriginDistribution)).toBe(SAMPLE_COUNT);
    expect(sumCounts(report.hiddenFateDistribution)).toBe(SAMPLE_COUNT);
    expect(sumCounts(report.hiddenFateCategoryDistribution)).toBe(SAMPLE_COUNT);
    expect(sumCounts(report.carriedItemCountDistribution)).toBe(SAMPLE_COUNT);
    expect(sumCounts(report.hiddenProgressBandDistribution)).toBe(SAMPLE_COUNT);
    expect(Object.keys(report.backgroundOriginDistribution).sort()).toEqual(
      registry.backgroundOrigins.map((origin) => origin.id).sort()
    );
    expect(Object.keys(report.hiddenFateDistribution).sort()).toEqual(
      registry.hiddenFates.map((hiddenFate) => hiddenFate.id).sort()
    );
    expect(Object.keys(report.carriedItemDistribution).sort()).toEqual(
      registry.carriedItems.map((item) => item.id).sort()
    );

    for (const bucket of Object.values(report.backgroundOriginDistribution)) {
      expect(bucket.count).toBeGreaterThan(0);
      expect(bucket.rate).toBeGreaterThan(0.03);
      expect(bucket.rate).toBeLessThan(0.25);
    }
    for (const bucket of Object.values(report.hiddenFateDistribution)) {
      expect(bucket.count).toBeGreaterThan(0);
      expect(bucket.rate).toBeGreaterThan(0.03);
      expect(bucket.rate).toBeLessThan(0.25);
    }

    expect(report.twoCarriedItemRate).toBeGreaterThan(0.45);
    expect(report.twoCarriedItemRate).toBeLessThan(0.75);
    expect(report.hiddenProgress.min).toBeGreaterThanOrEqual(0);
    expect(report.hiddenProgress.max).toBeLessThanOrEqual(100);
    expect(report.hiddenProgress.mean).toBeGreaterThan(10);
    expect(report.hiddenProgress.mean).toBeLessThan(35);
    expect(report.trueNameExposureCount).toBe(0);
    expect(report.extremeSamples.highestHiddenProgress.progress).toBeGreaterThanOrEqual(
      report.extremeSamples.lowestHiddenProgress.progress
    );
    expect(report.debugSamples).toHaveLength(8);
    expect(JSON.stringify(report.debugSamples)).not.toContain("trueName");
  }, 15_000);

  it("is fully reproducible for the same telemetry seed prefix", () => {
    const first = buildOriginFateDistributionTelemetry({
      sampleCount: 512,
      seedPrefix: "hfo-c008-repro",
      debugSampleCount: 4
    });
    const second = buildOriginFateDistributionTelemetry({
      sampleCount: 512,
      seedPrefix: "hfo-c008-repro",
      debugSampleCount: 4
    });

    expect(second).toEqual(first);
  });

  it("checks background, hidden fate, and carried item locks with reproducible signatures", () => {
    const check = buildOriginFateRerollLockCheck({
      seed: "hfo-c008-lock",
      draftId: "hfo_c008_lock",
      initialRerollIndex: 0,
      nextRerollIndex: 1
    });

    expect(check.reproducible).toBe(true);
    expect(check.unlocked.changedOriginFateSignature).toBe(true);
    expect(check.backgroundLock.preservedBackgroundOrigin).toBe(true);
    expect(check.hiddenFateLock.preservedHiddenFate).toBe(true);
    expect(check.carriedItemsLock.preservedCarriedItems).toBe(true);
    expect(check.allLocks.preservedFullOriginFate).toBe(true);
  });

  it("builds creation preview state without leaking internal trueName", () => {
    const registry = loadOriginFateRegistry();
    const generator = new DefaultOriginFateGenerator(registry);
    const draft = generator.generate({
      seed: "hfo-c008-privacy",
      draftId: "hfo_c008_privacy",
      rerollIndex: 0,
      openingTags: ["lifeEvent:ancestral_dream"],
      destinyTags: ["destiny_thunder_affinity"],
      spiritualRootTags: ["root:thunder"],
      aptitudeTags: ["aptitude:inspiration_high"],
      divinationTokens: 1
    });
    const hiddenFate = registry.getHiddenFate(draft.hiddenFateInternal.hiddenFateId);

    const preview = buildOriginFateCreationPreview(draft);
    const previewJson = JSON.stringify(preview);

    expect(previewJson).toContain(draft.backgroundOrigin.name);
    expect(previewJson).toContain(draft.visibleHiddenOmen.levelLabel);
    expect(previewJson).toContain(draft.carriedItems[0]!.conversion.label);
    expect(previewJson).not.toContain(draft.hiddenFateInternal.hiddenFateId);
    expect(previewJson).not.toContain(hiddenFate.trueName);
    expect(previewJson).not.toContain(String(draft.hiddenFateInternal.progress));
  });

  it("formats distribution, extreme samples, lock, privacy, and age18 conversion sections", () => {
    const report = buildOriginFateDistributionTelemetry({
      sampleCount: 128,
      seedPrefix: "hfo-c008-format",
      debugSampleCount: 2
    });
    const formatted = formatOriginFateDistributionReport(report, buildOriginFateRerollLockCheck({
      seed: "hfo-c008-format-lock",
      draftId: "hfo_c008_format_lock",
      initialRerollIndex: 0,
      nextRerollIndex: 1
    }));

    expect(formatted).toContain("# Origin Fate Distribution Report");
    expect(formatted).toContain("sampleCount: 128");
    expect(formatted).toContain("## Background Origin Distribution");
    expect(formatted).toContain("## Hidden Fate Distribution");
    expect(formatted).toContain("## Carried Item Distribution");
    expect(formatted).toContain("## Extreme Samples");
    expect(formatted).toContain("## Reroll Lock Check");
    expect(formatted).toContain("## Creation Privacy");
    expect(formatted).toContain("## Age 18 Conversion");
  });

  it("does not use Math.random in origin fate telemetry or generators", () => {
    for (const path of [
      "src/originFate/OriginFateDistributionTelemetry.ts",
      "src/originFate/OriginFateGenerator.ts",
      "src/originFate/BackgroundOriginGenerator.ts",
      "src/originFate/HiddenFateGenerator.ts",
      "src/originFate/CarriedItemsGenerator.ts",
      "src/originFate/Age18OriginFateResolver.ts"
    ]) {
      const source = readFileSync(path, "utf8");

      expect(source).not.toContain("Math.random");
    }
  });
});

function sumCounts(distribution: Readonly<Record<string, { readonly count: number }>>): number {
  return Object.values(distribution).reduce((total, bucket) => total + bucket.count, 0);
}
