import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  DefaultOpeningAttributeGenerator,
  generateAttributeArchetype,
  getOpeningAptitudeDisplayTier
} from "../../src/opening/OpeningAttributeGenerator";
import { loadOpeningGeneratorRegistry } from "../../src/opening/OpeningGeneratorRegistry";
import type {
  AttributeArchetypeResult,
  OpeningAttributeDraft
} from "../../src/types/opening-generator-types.v0.1";

describe("OpeningAttributeGenerator", () => {
  it("generates reproducible attribute drafts for the same seed and reroll index", () => {
    const generator = new DefaultOpeningAttributeGenerator();
    const input = { seed: "oag-c002-seed", draftId: "draft_oag_001", rerollIndex: 2 };

    const first = generator.generate(input);
    const second = generator.generate(input);

    expect(second).toEqual(first);
  });

  it("changes the generated attribute draft when the seed changes", () => {
    const generator = new DefaultOpeningAttributeGenerator();

    const first = generator.generate({ seed: "oag-c002-seed-a", draftId: "draft_a", rerollIndex: 0 });
    const second = generator.generate({ seed: "oag-c002-seed-b", draftId: "draft_b", rerollIndex: 0 });

    expect({
      archetype: second.archetype.id,
      aptitude: second.aptitude,
      coreSeed: second.coreSeed
    }).not.toEqual({
      archetype: first.archetype.id,
      aptitude: first.aptitude,
      coreSeed: first.coreSeed
    });
  });

  it("keeps aptitude and core seed values inside opening data domains", () => {
    const registry = loadOpeningGeneratorRegistry();
    const generator = new DefaultOpeningAttributeGenerator(registry);
    const domains = registry.generationRules.statDomains;

    for (let index = 0; index < 200; index += 1) {
      const draft = generator.generate({ seed: `range-seed-${index}`, draftId: `range_${index}`, rerollIndex: index % 5 });

      for (const value of Object.values(draft.aptitude)) {
        expect(value).toBeGreaterThanOrEqual(domains.aptitudeMin);
        expect(value).toBeLessThanOrEqual(domains.aptitudeHardMax);
      }
      for (const value of Object.values(draft.coreSeed)) {
        expect(value).toBeGreaterThanOrEqual(domains.coreSeedMin);
        expect(value).toBeLessThanOrEqual(domains.coreSeedMax);
      }
    }
  });

  it("makes thin-lived genius drafts clearly high-comprehension and low-lifespan", () => {
    const generator = new DefaultOpeningAttributeGenerator();

    const thin = sampleLockedArchetype(generator, "thin_lived_genius");
    const balanced = sampleLockedArchetype(generator, "balanced_ordinary");

    expect(thin.comprehensionAverage).toBeGreaterThan(balanced.comprehensionAverage + 25);
    expect(thin.lifespanAverage).toBeLessThan(balanced.lifespanAverage - 25);
  });

  it("makes iron-body drafts clearly high-root-bone and high-jing", () => {
    const generator = new DefaultOpeningAttributeGenerator();

    const iron = sampleLockedArchetype(generator, "iron_body");
    const balanced = sampleLockedArchetype(generator, "balanced_ordinary");

    expect(iron.rootBoneAverage).toBeGreaterThan(balanced.rootBoneAverage + 20);
    expect(iron.jingAverage).toBeGreaterThan(balanced.jingAverage + 4);
  });

  it("maps aptitude values to configured display tiers at boundaries", () => {
    const registry = loadOpeningGeneratorRegistry();

    expect(getOpeningAptitudeDisplayTier(1, registry)).toBe("破败");
    expect(getOpeningAptitudeDisplayTier(20, registry)).toBe("下等");
    expect(getOpeningAptitudeDisplayTier(40, registry)).toBe("平庸");
    expect(getOpeningAptitudeDisplayTier(60, registry)).toBe("尚佳");
    expect(getOpeningAptitudeDisplayTier(75, registry)).toBe("上乘");
    expect(getOpeningAptitudeDisplayTier(90, registry)).toBe("天资");
    expect(getOpeningAptitudeDisplayTier(101, registry)).toBe("非凡");
    expect(getOpeningAptitudeDisplayTier(120, registry)).toBe("非凡");
  });

  it("preserves locked archetype, aptitude, and core seed across rerolls", () => {
    const generator = new DefaultOpeningAttributeGenerator();
    const first = generator.generate({ seed: "lock-seed-a", draftId: "draft_lock", rerollIndex: 0 });

    const archetypeLocked = generator.generate({
      seed: "lock-seed-b",
      draftId: "draft_lock",
      rerollIndex: 1,
      locks: { attributeArchetype: true },
      previousDraft: first
    });
    expect(archetypeLocked.archetype).toEqual(first.archetype);
    expect(archetypeLocked.aptitude).not.toEqual(first.aptitude);

    const allAttributeLocks = generator.generate({
      seed: "lock-seed-c",
      draftId: "draft_lock",
      rerollIndex: 2,
      locks: { attributeArchetype: true, aptitudeStats: true, coreSeedStats: true },
      previousDraft: first
    });
    expect(allAttributeLocks.archetype).toEqual(first.archetype);
    expect(allAttributeLocks.aptitude).toEqual(first.aptitude);
    expect(allAttributeLocks.coreSeed).toEqual(first.coreSeed);
  });

  it("requires a previous draft for attribute locks", () => {
    const generator = new DefaultOpeningAttributeGenerator();

    expect(() =>
      generator.generate({
        seed: "missing-previous",
        draftId: "draft_missing_previous",
        rerollIndex: 1,
        locks: { aptitudeStats: true }
      })
    ).toThrow("previousDraft is required when locking aptitudeStats");
  });

  it("can generate just the weighted attribute archetype deterministically", () => {
    const first = generateAttributeArchetype({ seed: "archetype-only", draftId: "draft_arch", rerollIndex: 0 });
    const second = generateAttributeArchetype({ seed: "archetype-only", draftId: "draft_arch", rerollIndex: 0 });

    expect(second).toEqual(first);
    expect(first.id.length).toBeGreaterThan(0);
  });

  it("does not use Math.random in the opening attribute generator", () => {
    const source = readFileSync("src/opening/OpeningAttributeGenerator.ts", "utf8");

    expect(source).not.toContain("Math.random");
  });
});

function sampleLockedArchetype(generator: DefaultOpeningAttributeGenerator, archetypeId: string): {
  readonly comprehensionAverage: number;
  readonly lifespanAverage: number;
  readonly rootBoneAverage: number;
  readonly jingAverage: number;
} {
  const archetype = archetypeResult(archetypeId);
  const drafts = Array.from({ length: 96 }, (_, index) =>
    generator.generate({
      seed: `locked-${archetypeId}-${index}`,
      draftId: `draft_${archetypeId}_${index}`,
      rerollIndex: index % 7,
      locks: { attributeArchetype: true },
      previousDraft: previousDraftWithArchetype(archetype)
    })
  );

  return {
    comprehensionAverage: average(drafts.map((draft) => draft.aptitude.comprehension)),
    lifespanAverage: average(drafts.map((draft) => draft.aptitude.lifespan)),
    rootBoneAverage: average(drafts.map((draft) => draft.aptitude.rootBone)),
    jingAverage: average(drafts.map((draft) => draft.coreSeed.jing))
  };
}

function archetypeResult(id: string): AttributeArchetypeResult {
  const definition = loadOpeningGeneratorRegistry().getAttributeArchetype(id);
  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    tags: definition.biasTags
  };
}

function previousDraftWithArchetype(archetype: AttributeArchetypeResult): OpeningAttributeDraft {
  return {
    draftId: "previous_draft",
    seed: "previous_seed",
    rerollIndex: 0,
    archetype,
    aptitude: {
      rootBone: 50,
      comprehension: 50,
      inspiration: 50,
      fortune: 50,
      heart: 50,
      lifespan: 50
    },
    coreSeed: {
      jing: 12,
      qi: 12,
      shen: 12
    },
    growthBias: {
      jingGrowth: 1,
      qiGrowth: 1,
      shenGrowth: 1,
      studyBias: 1,
      martialBias: 1,
      alchemyBias: 1,
      artifactBias: 1,
      seclusionBias: 1,
      adventureBias: 1
    },
    tags: {
      destinyBiasTags: [],
      lifeEventBiasTags: [],
      modeBiasTags: [],
      hiddenFateBiasTags: []
    },
    distinctivenessScore: 0
  };
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
