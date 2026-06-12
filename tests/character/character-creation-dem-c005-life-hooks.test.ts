import { describe, expect, it } from "vitest";

import { CharacterDraftGenerator } from "../../src/character/CharacterDraftGenerator";
import { applyCharacterDraftToProfile } from "../../src/character/CharacterProfileMapper";
import { createDefaultProfileForSlot } from "../../src/save/ProfileFactory";
import { evaluateNinePalace } from "../../src/ninePalace/NinePalaceScoring";
import type { NinePalaceAttributes } from "../../src/types/nine-palace-fate-types.v0.1";
import type {
  GenerateOpeningInnateInput,
  OpeningDraftTags,
  OpeningGenerator,
  OpeningInnateDraft
} from "../../src/types/opening-generator-types.v0.1";

describe("Character creation DEM-C005 life manifestation hooks", () => {
  it("stores serializable phase-grouped life manifestation hooks on v2-backed drafts", () => {
    const generator = new CharacterDraftGenerator({
      seed: "dem-c005-heaven-hooks",
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

    const draft = generator.generate({ slotId: "slot_dem_c005", nowMs: 1_000 });

    expect(draft.destinies.lifeManifestationHooks?.traitIds).toContain("destiny_heaven_jealous_talent");
    expect(draft.destinies.lifeManifestationHooks?.hooks.map((hook) => hook.hook)).toEqual(
      expect.arrayContaining(["early_speech_or_scripture", "fever_after_insight"])
    );
    expect(draft.destinies.lifeManifestationHooks?.hooksByPhase.infant_0_3.map((hook) => hook.hook)).toContain(
      "early_speech_or_scripture"
    );
    expect(JSON.parse(JSON.stringify(draft.destinies.lifeManifestationHooks))).toEqual(
      draft.destinies.lifeManifestationHooks
    );
  });

  it("preserves life manifestation hooks when confirming the character into a profile", () => {
    const generator = new CharacterDraftGenerator({
      seed: "dem-c005-profile",
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
    const draft = generator.generate({ slotId: "slot_dem_c005_profile", nowMs: 1_000 });

    const profile = applyCharacterDraftToProfile({
      profile: createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 1_000 }),
      draft,
      nowMs: 2_000
    });

    expect(profile.characterOrigin?.destinies.lifeManifestationHooks).toEqual(
      draft.destinies.lifeManifestationHooks
    );
    const serialized = JSON.stringify(profile.characterOrigin?.destinies.lifeManifestationHooks);
    expect(serialized).not.toContain("trueName");
    expect(serialized).not.toContain("hiddenInternal");
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
    draftId: "draft_dem_c005",
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
