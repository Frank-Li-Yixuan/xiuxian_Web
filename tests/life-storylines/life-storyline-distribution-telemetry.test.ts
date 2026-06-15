import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  buildDevLifeStorylinesReport,
  DEV_LIFE_STORYLINE_SAMPLE_IDS
} from "../../src/lifeStorylines/DevLifeStorylineDebugReport";
import {
  buildLifeStorylineDistributionTelemetry,
  formatLifeStorylineDistributionReport
} from "../../src/lifeStorylines/LifeStorylineDistributionTelemetry";
import { loadLifeStorylineRegistry } from "../../src/lifeStorylines/LifeStorylineRegistry";
import type { LifeSimulationState } from "../../src/types/life-monthly-events-types.v0.1";

const SAMPLE_COUNT = 10_000;

describe("LifeStorylineDistributionTelemetry", () => {
  it("summarizes 10000 deterministic life storyline evaluations", () => {
    const registry = loadLifeStorylineRegistry();
    const report = buildLifeStorylineDistributionTelemetry({
      sampleCount: SAMPLE_COUNT,
      seedPrefix: "lst-c007-test",
      debugSampleCount: 8
    });

    expect(report.version).toBe("0.1");
    expect(report.sampleCount).toBe(SAMPLE_COUNT);
    expect(report.seedPrefix).toBe("lst-c007-test");
    expect(Object.keys(report.storylineStatusById).sort()).toEqual(
      registry.listStorylines().map((storyline) => storyline.id).sort()
    );
    for (const storyline of registry.listStorylines()) {
      const distribution = report.storylineStatusById[storyline.id];

      expect(distribution).toBeDefined();
      expect(sumStatusCounts(distribution!)).toBe(SAMPLE_COUNT);
      expect(distribution!.active.count).toBeGreaterThanOrEqual(0);
      expect(distribution!.dominant.count).toBeGreaterThanOrEqual(0);
      expect(distribution!.fated.count).toBeGreaterThanOrEqual(0);
    }
    expect(sumBucketCounts(report.activeStorylineCountDistribution)).toBe(SAMPLE_COUNT);
    expect(report.unsupportedFatedViolationCount).toBe(0);
    expect(report.unsupportedFatedViolations).toEqual([]);
    expect(report.systemPreludeActivation.storylineId).toBe("storyline_system_prelude");
    expect(report.systemPreludeActivation.fated.rate).toBeLessThanOrEqual(0.05);
    expect(report.systemPreludeActivation.unsupportedFated.count).toBe(0);
    expect(report.debugSamples).toHaveLength(8);
    expect(report.debugSamples[0]).toMatchObject({
      seed: "lst-c007-test-0",
      draftId: "draft_lst-c007-test-0_0",
      activeStorylineCount: expect.any(Number),
      topStorylineIds: expect.any(Array),
      lifeStorylineState: expect.any(Object)
    });
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.debugSamples[0])).toBe(true);
    expect(JSON.stringify(report)).not.toMatch(/trueName|true_name|truename|hiddenFateInternal|SHOULD_NOT_LEAK/i);
  }, 120_000);

  it("is reproducible for the same seed and formats a readable report", () => {
    const first = buildLifeStorylineDistributionTelemetry({
      sampleCount: 256,
      seedPrefix: "lst-c007-repro",
      debugSampleCount: 4
    });
    const second = buildLifeStorylineDistributionTelemetry({
      sampleCount: 256,
      seedPrefix: "lst-c007-repro",
      debugSampleCount: 4
    });
    const formatted = formatLifeStorylineDistributionReport(first);

    expect(second).toEqual(first);
    expect(formatted).toContain("# Life Storyline Distribution Report");
    expect(formatted).toContain("sampleCount: 256");
    expect(formatted).toContain("Storyline Status Distribution");
    expect(formatted).toContain("Active Storyline Count Distribution");
    expect(formatted).toContain("System Prelude Activation");
    expect(formatted).toContain("Unsupported Fated Violations");
  });

  it("keeps archetypal debug samples distinct", () => {
    const topStorylineIds = DEV_LIFE_STORYLINE_SAMPLE_IDS.map((sampleId) => {
      const topStoryline = buildDevLifeStorylinesReport(sampleId).scoring.storylines[0];
      if (topStoryline === undefined) {
        throw new Error(`Missing top storyline for ${sampleId}`);
      }
      return topStoryline.storylineId;
    });

    expect(new Set(topStorylineIds).size).toBeGreaterThanOrEqual(4);
    expect(topStorylineIds).toEqual(expect.arrayContaining([
      "storyline_apothecary_alchemy",
      "storyline_fallen_cultivator_lineage",
      "storyline_yin_dream_soul",
      "storyline_system_prelude",
      "storyline_village_calamity"
    ]));
  });

  it("serializes life storyline state inside a life simulation payload", () => {
    const report = buildLifeStorylineDistributionTelemetry({
      sampleCount: 4,
      seedPrefix: "lst-c007-serialization",
      debugSampleCount: 1
    });
    const sample = report.debugSamples[0];
    if (sample === undefined) {
      throw new Error("Expected one debug sample");
    }
    const state: LifeSimulationState = {
      profileId: "profile_lst_c007",
      characterId: "character_lst_c007",
      seed: "lst-c007-serialization",
      rngState: {},
      ageMonths: 0,
      phaseId: "infancy",
      core: { jing: 60, qi: 60, shen: 60 },
      aptitude: {
        rootBone: 60,
        comprehension: 60,
        inspiration: 60,
        fortune: 60,
        heart: 60,
        lifespan: 60
      },
      lifeSkills: {
        study: 0,
        martial: 0,
        alchemy: 0,
        craft: 0,
        social: 0,
        stealth: 0,
        ritual: 0,
        survival: 0
      },
      karma: 0,
      merit: 0,
      heartDemon: 0,
      wounds: [],
      heartKnots: [],
      family: {
        kinship: 0,
        familyStrain: 0,
        familyWealth: 0,
        flags: {}
      },
      relationships: [],
      hiddenFateProgress: {},
      carriedItemAffinity: {},
      flags: {},
      monthlyLogs: [],
      lifeStorylineState: sample.lifeStorylineState
    };
    const serialized = JSON.stringify(state);
    const parsed = JSON.parse(serialized) as LifeSimulationState;

    expect(parsed.lifeStorylineState).toEqual(sample.lifeStorylineState);
    expect(serialized).not.toMatch(/trueName|true_name|truename|hiddenFateInternal|SHOULD_NOT_LEAK/i);
  });

  it("does not use nondeterministic or runtime side-effect APIs", () => {
    const source = readFileSync("src/lifeStorylines/LifeStorylineDistributionTelemetry.ts", "utf8");

    for (const forbidden of [
      "Math.random",
      "Date.now",
      "performance.now",
      "document.",
      "fetch(",
      "localStorage"
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });
});

function sumStatusCounts(distribution: {
  readonly dormant: { readonly count: number };
  readonly hinted: { readonly count: number };
  readonly active: { readonly count: number };
  readonly dominant: { readonly count: number };
  readonly fated: { readonly count: number };
}): number {
  return distribution.dormant.count +
    distribution.hinted.count +
    distribution.active.count +
    distribution.dominant.count +
    distribution.fated.count;
}

function sumBucketCounts(distribution: Readonly<Record<string, { readonly count: number }>>): number {
  return Object.values(distribution).reduce((total, bucket) => total + bucket.count, 0);
}
