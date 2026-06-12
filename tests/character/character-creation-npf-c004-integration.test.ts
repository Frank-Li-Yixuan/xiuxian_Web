import { describe, expect, it } from "vitest";

import { CharacterDraftGenerator } from "../../src/character/CharacterDraftGenerator";
import { evaluateNinePalace } from "../../src/ninePalace/NinePalaceScoring";
import type { NinePalaceAttributes } from "../../src/types/nine-palace-fate-types.v0.1";
import type {
  GenerateOpeningInnateInput,
  OpeningGenerator,
  OpeningInnateDraft,
  OpeningDraftTags
} from "../../src/types/opening-generator-types.v0.1";

describe("CharacterDraftGenerator NPF-C004 opening destiny integration", () => {
  it("uses nine palace evaluation to select a legal heaven-jealous talent destiny", () => {
    const openingDraft = makeOpeningDraft({
      jing: 60,
      qi: 70,
      shen: 70,
      rootBone: 60,
      comprehension: 95,
      inspiration: 95,
      fortune: 75,
      heart: 55,
      lifespan: 35
    });
    const generator = new CharacterDraftGenerator({
      seed: "npf-c004-high-talent",
      openingGenerator: new FixedOpeningGenerator(openingDraft)
    });

    const draft = generator.generate({ slotId: "slot_high_talent", nowMs: 1_000 });

    expect(draft.openingInnateDraft.ninePalaceEvaluation.tags.destinyBiasTags).toContain(
      "destinyBias:heaven_jealous_talent"
    );
    expect(getDestinyIds(draft)).toContain("destiny_heaven_jealous_talent");
    expect(draft.destinyRollDraft?.debug.ninePalace?.slotAlignments.main).toMatchObject({
      traitId: "destiny_heaven_jealous_talent",
      alignment: "matched"
    });
    expect(draft.destinies.main.fateAlignment).toBe("matched");
  });

  it("shows anti-condition mutation metadata instead of keeping an illegal original destiny", () => {
    const openingDraft = makeOpeningDraft({
      jing: 60,
      qi: 60,
      shen: 60,
      rootBone: 60,
      comprehension: 40,
      inspiration: 40,
      fortune: 60,
      heart: 60,
      lifespan: 60
    });
    const generator = new CharacterDraftGenerator({
      seed: "npf-c004-low-talent",
      openingGenerator: new FixedOpeningGenerator(openingDraft)
    });

    const draft = generator.generate({ slotId: "slot_low_talent", nowMs: 1_000 });
    const ids = getDestinyIds(draft);

    expect(ids).toContain("destiny_false_heavenly_burden");
    expect(ids).not.toContain("destiny_heaven_jealous_talent");
    expect(draft.destinyRollDraft?.debug.ninePalace?.mutationResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          originalDestinyId: "destiny_heaven_jealous_talent",
          resolvedDestinyId: "destiny_false_heavenly_burden",
          action: "mutate"
        })
      ])
    );
    expect(draft.destinies.main).toMatchObject({
      traitId: "destiny_false_heavenly_burden",
      fateAlignment: "mutated",
      mutatedFromTraitId: "destiny_heaven_jealous_talent"
    });
  });

  it("keeps locked destiny slots stable through NPF-backed rerolls", () => {
    const generator = new CharacterDraftGenerator({
      seed: "npf-c004-locks",
      openingGenerator: new FixedOpeningGenerator(makeOpeningDraft({
        jing: 60,
        qi: 70,
        shen: 70,
        rootBone: 60,
        comprehension: 95,
        inspiration: 95,
        fortune: 75,
        heart: 55,
        lifespan: 35
      }))
    });
    const first = generator.generate({ slotId: "slot_locked_main", nowMs: 1_000 });

    const rerolled = generator.reroll(first, {
      nowMs: 2_000,
      locks: { mainDestiny: true }
    });

    expect(rerolled.destinies.main.traitId).toBe(first.destinies.main.traitId);
    expect(rerolled.destinies.main.fateAlignment).toBe(first.destinies.main.fateAlignment);
    expect(rerolled.locks.mainDestiny).toBe(true);
  });
});

type Draft = ReturnType<CharacterDraftGenerator["generate"]>;

class FixedOpeningGenerator implements OpeningGenerator {
  constructor(private readonly draft: OpeningInnateDraft) {}

  generate(input: GenerateOpeningInnateInput): OpeningInnateDraft {
    return {
      ...this.draft,
      draftId: input.draftId,
      seed: input.seed,
      rerollIndex: input.rerollIndex,
      ...(input.locks === undefined ? {} : { locks: input.locks })
    };
  }
}

function makeOpeningDraft(attributes: NinePalaceAttributes): OpeningInnateDraft {
  const ninePalaceEvaluation = evaluateNinePalace(attributes);
  const tags: OpeningDraftTags = {
    destinyBiasTags: ninePalaceEvaluation.tags.destinyBiasTags,
    lifeEventBiasTags: ninePalaceEvaluation.tags.lifeEventBiasTags,
    hiddenFateBiasTags: ninePalaceEvaluation.tags.hiddenFateBiasTags,
    modeBiasTags: ninePalaceEvaluation.tags.modeBiasTags
  };

  return {
    draftId: "draft_fixed",
    seed: "fixed_opening",
    rerollIndex: 0,
    archetype: {
      id: "fixed_archetype",
      name: "Fixed Archetype",
      description: "Test fixture",
      tags: []
    },
    aptitude: {
      rootBone: attributes.rootBone,
      comprehension: attributes.comprehension,
      inspiration: attributes.inspiration,
      fortune: attributes.fortune,
      heart: attributes.heart,
      lifespan: attributes.lifespan
    },
    coreSeed: {
      jing: attributes.jing,
      qi: attributes.qi,
      shen: attributes.shen
    },
    spiritualRoot: {
      categoryId: "single",
      displayName: "Fixed Root",
      elements: { thunder: 100 },
      primaryElement: "thunder",
      secondaryElements: [],
      purity: 80,
      stability: 70,
      conflict: 10,
      breadth: 20,
      relationTags: [],
      tags: ["root:thunder"]
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
    tags,
    ninePalaceEvaluation,
    distinctivenessScore: 0
  };
}

function getDestinyIds(draft: Draft): readonly string[] {
  return [
    draft.destinies.main.traitId,
    draft.destinies.secondary[0].traitId,
    draft.destinies.secondary[1].traitId,
    draft.destinies.flaw.traitId
  ];
}
