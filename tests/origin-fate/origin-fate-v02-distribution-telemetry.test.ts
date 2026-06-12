import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildOriginFateV02DistributionTelemetry,
  formatOriginFateV02DistributionReport
} from "../../src/originFate/OriginFateV02DistributionTelemetry";
import { loadOriginFateNarrativeRegistry } from "../../src/originFate/OriginFateNarrativeRegistry";

describe("OriginFateV02DistributionTelemetry", () => {
  it("summarizes 10000 deterministic HFO v0.2 narrative samples without public hidden-name leaks", { timeout: 60_000 }, () => {
    const registry = loadOriginFateNarrativeRegistry();

    const report = buildOriginFateV02DistributionTelemetry({
      sampleCount: 10_000,
      seedPrefix: "hfo2-c008-test",
      debugSampleCount: 8
    });

    expect(report.sampleCount).toBe(10_000);
    expect(Object.keys(report.hiddenFateRarityDistribution)).toEqual(expect.arrayContaining(["minor", "rare", "epic", "legendary", "forbidden"]));
    expect(sumCounts(report.hiddenFateRarityDistribution)).toBe(10_000);
    expect(Object.keys(report.hiddenFateDistribution).length).toBeGreaterThan(1);
    expect(Object.keys(report.originHiddenSynergyCountsById).length).toBeGreaterThan(0);
    expect(Object.keys(report.originItemSynergyCountsById).length).toBeGreaterThan(0);
    expect(Object.keys(report.carriedItemDistribution).length).toBeGreaterThan(0);
    expect(Object.keys(report.revealBandDistribution)).toEqual(expect.arrayContaining(["seed", "omen", "stirring", "halfReveal", "nearAwake", "awakened"]));
    expect(report.hiddenLeakScan.leakCount).toBe(0);
    expect(report.hiddenLeakScan.scannedSamples).toBeGreaterThan(0);
    expect(report.debugSamples).toHaveLength(8);
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.debugSamples)).toBe(true);
    expect(Object.isFrozen(report.debugSamples[0])).toBe(true);

    for (const probe of Object.values(report.presetProbes)) {
      expect(probe.passed).toBe(true);
      const serializedPublic = JSON.stringify({
        publicOmenView: probe.publicOmenView,
        monthlyLogPreview: probe.monthlyLogPreview,
        majorChoicePreview: probe.majorChoicePreview,
        sealedHiddenFates: probe.age18Preview.sealedHiddenFates,
        debugTags: probe.age18Preview.debugTags,
        traceability: probe.age18Preview.traceability
      });
      for (const hiddenFate of registry.hiddenFates) {
        expect(serializedPublic).not.toContain(hiddenFate.trueName);
      }
    }
  });

  it("is reproducible for the same seed prefix and formats a readable report", () => {
    const first = buildOriginFateV02DistributionTelemetry({
      sampleCount: 128,
      seedPrefix: "hfo2-c008-repro",
      debugSampleCount: 4
    });
    const second = buildOriginFateV02DistributionTelemetry({
      sampleCount: 128,
      seedPrefix: "hfo2-c008-repro",
      debugSampleCount: 4
    });
    const formatted = formatOriginFateV02DistributionReport(first);

    expect(second).toEqual(first);
    expect(formatted).toContain("Origin Fate v0.2 Distribution Report");
    expect(formatted).toContain("Hidden Fate Rarity");
    expect(formatted).toContain("Origin-Hidden Synergy");
    expect(formatted).toContain("Origin-Item Synergy");
    expect(formatted).toContain("Leak Safety");
    expect(formatted).toContain("Deterministic Samples");
    expect(formatted).toContain("Tuning Notes");
  });

  it("does not use nondeterministic or runtime side-effect APIs in telemetry source", () => {
    const source = readFileSync("src/originFate/OriginFateV02DistributionTelemetry.ts", "utf8");

    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("performance.now");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("${hiddenFate.trueName}");
    expect(source).not.toContain("trueName:");
  });
});

function sumCounts(distribution: Readonly<Record<string, { readonly count: number }>>): number {
  return Object.values(distribution).reduce((total, bucket) => total + bucket.count, 0);
}
