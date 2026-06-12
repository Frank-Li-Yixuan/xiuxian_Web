import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  CHARACTER_CREATION_V02_MUTATION_EXPLANATION,
  createCharacterCreationV02Projection
} from "../../src/character/CharacterCreationV02Adapter";
import { CharacterDraftGenerator } from "../../src/character/CharacterDraftGenerator";
import type { CharacterCreationDraft, DestinyTraitState } from "../../src/character/CharacterCreationTypes";
import { loadDestinyV2Registry } from "../../src/destinyV2/DestinyV2Registry";
import { evaluateNinePalace } from "../../src/ninePalace/NinePalaceScoring";
import { loadOriginFateNarrativeRegistry } from "../../src/originFate/OriginFateNarrativeRegistry";
import type { DestinyEligibilityResult, DestinyMutationResolutionResult } from "../../src/types/destiny-eligibility-types.v0.1";
import type { DestinyFateAlignmentInfo, DestinyRollSlotKey } from "../../src/types/destiny-types.v0.1";
import type { NinePalaceAttributes } from "../../src/types/nine-palace-fate-types.v0.1";
import type {
  GenerateOpeningInnateInput,
  OpeningDraftTags,
  OpeningGenerator,
  OpeningInnateDraft
} from "../../src/types/opening-generator-types.v0.1";

describe("CharacterCreationV02Adapter", () => {
  it("projects low talent heaven-jealous mutation as a safe final destiny deviation", () => {
    const draft = generateDraftWithOpening("mig-c003-low-talent", {
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

    const projection = createCharacterCreationV02Projection(draft);
    const main = projection.destinyEvaluationResults.find((result) => result.slot === "main");

    expect(main).toMatchObject({
      slot: "main",
      finalDestinyId: "destiny_false_heavenly_burden",
      alignment: "mutated",
      eligibility: "blocked",
      mutation: {
        mutated: true,
        visibleExplanation: CHARACTER_CREATION_V02_MUTATION_EXPLANATION
      }
    });
    expect(JSON.stringify(main)).not.toContain("destiny_heaven_jealous_talent");
    expect(JSON.stringify(main)).not.toContain("mutation:source");
  });

  it("keeps high-comprehension short-life heaven-jealous talent valid", () => {
    const draft = generateDraftWithOpening("mig-c003-high-talent", {
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

    const projection = createCharacterCreationV02Projection(draft);
    const card = projection.destinyEvaluationResults.find((result) => result.finalDestinyId === "destiny_heaven_jealous_talent");

    expect(card).toBeDefined();
    expect(card).toMatchObject({
      finalDestinyId: "destiny_heaven_jealous_talent",
      alignment: "matched",
      eligibility: "eligible",
      mutation: { mutated: false }
    });
  });

  it("projects waste-root anti case as heaven pride under calamity without exposing the source id", () => {
    const draft = withMainDestinyResolution(
      generateDraftWithOpening("mig-c003-waste-root", {
        jing: 70,
        qi: 65,
        shen: 65,
        rootBone: 95,
        comprehension: 92,
        inspiration: 60,
        fortune: 90,
        heart: 70,
        lifespan: 60
      }),
      "destiny_waste_root_reversal",
      "destiny_heaven_pride_under_calamity"
    );

    const projection = createCharacterCreationV02Projection(draft);
    const main = projection.destinyEvaluationResults.find((result) => result.slot === "main");

    expect(main).toMatchObject({
      finalDestinyId: "destiny_heaven_pride_under_calamity",
      alignment: "mutated",
      mutation: {
        mutated: true,
        visibleExplanation: CHARACTER_CREATION_V02_MUTATION_EXPLANATION
      }
    });
    expect(JSON.stringify(main)).not.toContain("destiny_waste_root_reversal");
  });

  it("builds a deterministic frozen v0.2 character-creation projection with narrative previews", () => {
    const draft = generateDraftWithOpening("mig-c003-full-projection", {
      jing: 65,
      qi: 75,
      shen: 70,
      rootBone: 65,
      comprehension: 88,
      inspiration: 86,
      fortune: 68,
      heart: 62,
      lifespan: 42
    });

    const first = createCharacterCreationV02Projection(draft);
    const second = createCharacterCreationV02Projection(draft);

    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.destinyEvaluationResults)).toBe(true);
    expect(first.ninePalaceEvaluation.attributes).toEqual(draft.openingInnateDraft.ninePalaceEvaluation.attributes);
    expect(first.destinyEvaluationResults).toHaveLength(4);
    expect(first.originFateNarrativeState.hiddenFates.length).toBeGreaterThan(0);
    expect(first.originNarrativeSummary.activeStorylineIds.length).toBeGreaterThan(0);
    expect(first.carriedItemLifecycleSummary.items.length).toBeGreaterThan(0);
    expect(first.lifeStorylineInitialScores.storylines.length).toBeGreaterThan(0);
    expect(first.lifeStageInitialState.agePhaseId).toBe("infant");
    expect(first.lifeStageInitialState.identityStageIds).toContain("mortal_child");
    expect(draft.originFateNarrativeState).toBeDefined();
  });

  it("throws a readable error for legacy drafts without nine palace evaluation", () => {
    const draft = generateDraftWithOpening("mig-c003-legacy-missing-npf", {
      jing: 65,
      qi: 75,
      shen: 70,
      rootBone: 65,
      comprehension: 88,
      inspiration: 86,
      fortune: 68,
      heart: 62,
      lifespan: 42
    });
    const { ninePalaceEvaluation: _omitted, ...openingWithoutNinePalace } = draft.openingInnateDraft;

    expect(() =>
      createCharacterCreationV02Projection({
        ...draft,
        openingInnateDraft: openingWithoutNinePalace as OpeningInnateDraft
      })
    ).toThrow("CharacterCreationV02Adapter requires openingInnateDraft.ninePalaceEvaluation");
  });

  it("does not expose checked-in hidden names through display-safe summaries or use runtime side effects", () => {
    const registry = loadOriginFateNarrativeRegistry();
    const draft = generateDraftWithOpening("mig-c003-leak-scan", {
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

    const projection = createCharacterCreationV02Projection(draft);
    const displayJson = JSON.stringify({
      destinyEvaluationResults: projection.destinyEvaluationResults,
      originNarrativeSummary: projection.originNarrativeSummary,
      carriedItemLifecycleSummary: projection.carriedItemLifecycleSummary,
      lifeStorylineInitialScores: projection.lifeStorylineInitialScores,
      lifeStageInitialState: projection.lifeStageInitialState
    });

    for (const hiddenFate of registry.hiddenFates) {
      expect(displayJson).not.toContain(hiddenFate.trueName);
    }
    expect(displayJson).not.toContain("trueName");

    const source = readFileSync(join(process.cwd(), "src/character/CharacterCreationV02Adapter.ts"), "utf8");
    for (const forbidden of ["Math.random", "Date.now", "performance.now", "document.", "fetch(", "trueName", "debugMutationSource"]) {
      expect(source).not.toContain(forbidden);
    }
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

function generateDraftWithOpening(seed: string, attributes: NinePalaceAttributes): CharacterCreationDraft {
  const generator = new CharacterDraftGenerator({
    seed,
    openingGenerator: new FixedOpeningGenerator(makeOpeningDraft(attributes))
  });
  return generator.generate({ slotId: seed, nowMs: 1_000 });
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
    draftId: "draft_mig_c003",
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

function withMainDestinyResolution(
  draft: CharacterCreationDraft,
  originalDestinyId: string,
  finalDestinyId: string
): CharacterCreationDraft {
  const previousRollDraft = draft.destinyRollDraft;
  const previousNinePalace = previousRollDraft?.debug.ninePalace;
  if (previousRollDraft === undefined || previousNinePalace === undefined) {
    throw new Error("test fixture requires destiny v2 roll debug");
  }
  const finalTrait = toTraitState(finalDestinyId);
  const finalIds = [
    finalDestinyId,
    draft.destinies.secondary[0].traitId,
    draft.destinies.secondary[1].traitId,
    draft.destinies.flaw.traitId
  ];
  const slotAlignments = {
    ...previousNinePalace.slotAlignments,
    main: {
      traitId: finalDestinyId,
      alignment: "mutated",
      label: "命盘异变",
      reasonTags: ["mutation:anti_result"],
      sourceTraitId: originalDestinyId
    }
  } satisfies Record<DestinyRollSlotKey, DestinyFateAlignmentInfo>;
  const eligibilityResults = replaceSlotEligibility(
    previousNinePalace.eligibilityResults,
    "main",
    {
      destinyId: originalDestinyId,
      eligible: false,
      supportLevel: "weak",
      antiMatched: [],
      supportMatched: [],
      reasonTags: ["anti:rootBone", "mutation:anti_result"],
      mutationCandidate: finalDestinyId
    }
  );
  const mutationResults: readonly DestinyMutationResolutionResult[] = [
    ...previousNinePalace.mutationResults,
    {
      originalDestinyId,
      resolvedDestinyId: finalDestinyId,
      action: "mutate",
      reason: "anti_result",
      mutationDepth: 0,
      debugTags: [`mutation:source:${originalDestinyId}`, `mutation:target:${finalDestinyId}`]
    }
  ];

  return {
    ...draft,
    destinies: {
      ...draft.destinies,
      main: finalTrait
    },
    destinyRollDraft: {
      ...previousRollDraft,
      debug: {
        ...previousRollDraft.debug,
        ninePalace: {
          ...previousNinePalace,
          slotAlignments,
          finalDestinyIds: finalIds,
          eligibilityResults,
          mutationResults
        }
      }
    }
  };
}

function replaceSlotEligibility(
  previous: readonly DestinyEligibilityResult[],
  slot: DestinyRollSlotKey,
  value: DestinyEligibilityResult
): readonly DestinyEligibilityResult[] {
  const slotIndex = slot === "main" ? 0 : slot === "secondary0" ? 1 : slot === "secondary1" ? 2 : 3;
  const next = [...previous];
  next[slotIndex] = value;
  return next;
}

function toTraitState(destinyId: string): DestinyTraitState {
  const destiny = loadDestinyV2Registry().getDestiny(destinyId);
  return {
    traitId: destiny.id,
    name: destiny.name,
    rarity: destiny.quality === "flaw" ? "flaw" : destiny.quality === "mortal" ? "common" : "legendary",
    qualityLabel: destiny.quality,
    description: destiny.description,
    tags: destiny.tags,
    positiveEffects: Object.values(destiny.effects).flat(),
    negativeEffects: destiny.kind === "mutated" ? ["mutation:resolved_from_nine_palace"] : [],
    fateAlignment: "mutated",
    fateAlignmentLabel: "命盘异变",
    fateAlignmentReasonTags: ["mutation:anti_result"],
    mutatedFromTraitId: "source_hidden_by_adapter"
  };
}
