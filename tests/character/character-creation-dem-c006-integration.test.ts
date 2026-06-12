import { describe, expect, it } from "vitest";

import { createCharacterCreationViewModel } from "../../src/app/screens/CharacterCreationViewModel";
import { CharacterCreationController } from "../../src/character/CharacterCreationController";
import { evaluateNinePalace } from "../../src/ninePalace/NinePalaceScoring";
import type { NinePalaceAttributes } from "../../src/types/nine-palace-fate-types.v0.1";
import type {
  GenerateOpeningInnateInput,
  OpeningDraftTags,
  OpeningGenerator,
  OpeningInnateDraft
} from "../../src/types/opening-generator-types.v0.1";

describe("Character creation DEM-C006 destiny v2 integration", () => {
  it("projects destiny v2 life hooks and mode projection tags into the selected final card view model", () => {
    const controller = new CharacterCreationController({
      seed: "dem-c006-view-model-projection",
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
    const draft = controller.generate({ slotId: "slot_dem_c006_projection", nowMs: 1_000 });

    const viewModel = createCharacterCreationViewModel(draft, {
      selectedSlot: "main",
      activeTab: "destiny"
    });
    const card = viewModel.destinyCards.find((item) => item.traitId === "destiny_heaven_jealous_talent");

    expect(card).toBeDefined();
    expect(card?.traitId).toBe("destiny_heaven_jealous_talent");
    expect(card?.lifeImpactHooks.map((hook) => hook.hook)).toEqual(
      expect.arrayContaining(["early_speech_or_scripture", "fever_after_insight"])
    );
    expect(card?.modeProjectionBuckets).toEqual(
      expect.arrayContaining([
        {
          bucket: "outerBattlefield",
          label: "outerBattlefield",
          tags: expect.arrayContaining(["first_insight_quality_plus_1", "danger_event_plus_1"])
        },
        {
          bucket: "deckbuilder",
          label: "deckbuilder",
          tags: expect.arrayContaining(["rare_card_weight_up", "curse_weight_up"])
        }
      ])
    );
    expect(JSON.stringify(card)).not.toContain("trueName");
    expect(JSON.stringify(card)).not.toContain(draft.originFate.hiddenFateInternal.hiddenFateId);
  });

  it("keeps mutation source as debug metadata while rendering only the resolved final destiny card", () => {
    const controller = new CharacterCreationController({
      seed: "dem-c006-mutated-final-card",
      openingGenerator: new FixedOpeningGenerator(makeOpeningDraft({
        jing: 60,
        qi: 60,
        shen: 60,
        rootBone: 60,
        comprehension: 40,
        inspiration: 40,
        fortune: 60,
        heart: 60,
        lifespan: 60
      }))
    });
    const draft = controller.generate({ slotId: "slot_dem_c006_mutation", nowMs: 1_000 });

    const viewModel = createCharacterCreationViewModel(draft, {
      selectedSlot: "main",
      activeTab: "destiny"
    });
    const ids = viewModel.destinyCards.map((card) => card.traitId);
    const mutatedCard = viewModel.destinyCards.find((card) => card.traitId === "destiny_false_heavenly_burden");

    expect(ids).toContain("destiny_false_heavenly_burden");
    expect(ids).not.toContain("destiny_heaven_jealous_talent");
    expect(mutatedCard).toMatchObject({
      fateAlignment: "mutated",
      mutatedFromTraitId: "destiny_heaven_jealous_talent",
      debugMutationSource: {
        traitId: "destiny_heaven_jealous_talent",
        reasonTags: expect.arrayContaining(["mutation:anti_result"])
      }
    });
    expect(JSON.stringify(viewModel)).not.toContain("trueName");
    expect(JSON.stringify(viewModel)).not.toContain(draft.originFate.hiddenFateInternal.hiddenFateId);
  });
});

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
    draftId: "draft_dem_c006",
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
