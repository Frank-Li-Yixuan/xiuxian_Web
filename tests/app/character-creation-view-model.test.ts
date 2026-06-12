import { describe, expect, it } from "vitest";

import {
  createCharacterCreationViewModel,
  getCharacterCreationLockKeyForSelection
} from "../../src/app/screens/CharacterCreationViewModel";
import { getCharacterCreationSelectionForDetailTarget } from "../../src/app/screens/CharacterCreationDetailInteractions";
import { CharacterCreationController } from "../../src/character/CharacterCreationController";
import { evaluateNinePalace } from "../../src/ninePalace/NinePalaceScoring";
import { loadOriginFateRegistry } from "../../src/originFate/OriginFateRegistry";
import { loadOriginFateNarrativeRegistry } from "../../src/originFate/OriginFateNarrativeRegistry";
import type { NinePalaceAttributes } from "../../src/types/nine-palace-fate-types.v0.1";
import type {
  GenerateOpeningInnateInput,
  OpeningDraftTags,
  OpeningGenerator,
  OpeningInnateDraft
} from "../../src/types/opening-generator-types.v0.1";

describe("CharacterCreationViewModel", () => {
  it("maps clickable CCUI2 detail targets to stable tab and card selection", () => {
    const current = { activeTab: "stats", selectedSlot: "secondary1" } as const;

    expect(getCharacterCreationSelectionForDetailTarget(current, { type: "stats" })).toEqual({
      activeTab: "stats",
      selectedSlot: "secondary1"
    });
    expect(getCharacterCreationSelectionForDetailTarget(current, { type: "root" })).toEqual({
      activeTab: "root",
      selectedSlot: "secondary1"
    });
    expect(getCharacterCreationSelectionForDetailTarget(current, { type: "origin" })).toEqual({
      activeTab: "origin",
      selectedSlot: "secondary1"
    });
    expect(getCharacterCreationSelectionForDetailTarget(current, { type: "items" })).toEqual({
      activeTab: "items",
      selectedSlot: "secondary1"
    });
    expect(getCharacterCreationSelectionForDetailTarget(current, { type: "destiny", slot: "flaw" })).toEqual({
      activeTab: "destiny",
      selectedSlot: "flaw"
    });
  });

  it("exposes lock budget, fate meter, divination status, and destiny card display data", () => {
    const controller = new CharacterCreationController({ seed: "dt-c004-view-model" });
    const draft = controller.generate({ slotId: "slot_vm", nowMs: 1_000 });

    const viewModel = createCharacterCreationViewModel(draft, {
      selectedSlot: "main",
      activeTab: "destiny"
    });

    expect(viewModel.lockBudget.maxLocks).toBe(2);
    expect(viewModel.lockBudget.locksRemaining).toBe(2);
    expect(viewModel.fateMeter.value).toBe(draft.destinyRerollSession?.fateMeter.value);
    expect(viewModel.canUseDivination).toBe(true);
    expect(viewModel.destinyCards).toHaveLength(4);
    expect(viewModel.destinyCards[0]).toMatchObject({
      slot: "main",
      lockKey: "mainDestiny",
      traitId: draft.destinies.main.traitId,
      locked: false
    });
    expect(viewModel.selectedLockKey).toBe("mainDestiny");
    expect(viewModel.selectedLock).toMatchObject({
      key: "mainDestiny",
      label: "主天命",
      locked: false,
      canToggle: true,
      canAdd: true,
      buttonLabel: "锁定主天命"
    });
    expect(viewModel.actions.reroll).toEqual({ label: "重新推演", disabled: false });
    expect(viewModel.actions.lock).toMatchObject({
      label: "锁定主天命",
      disabled: false
    });
    expect(viewModel.actions.divination).toEqual({
      label: `天机推演 ${draft.divinationTokens}`,
      disabled: false
    });
  });

  it("maps screen selection to the correct lock key and remaining lock count", () => {
    const controller = new CharacterCreationController({ seed: "dt-c004-view-locks" });
    const draft = controller.generate({ slotId: "slot_vm_locks", nowMs: 1_000 });
    const locked = controller.toggleLock(draft, { lockKey: "mainDestiny", nowMs: 2_000 });

    const viewModel = createCharacterCreationViewModel(locked, {
      selectedSlot: "main",
      activeTab: "destiny"
    });

    expect(viewModel.lockBudget.activeLocks).toEqual(["mainDestiny"]);
    expect(viewModel.lockBudget.locksRemaining).toBe(1);
    expect(viewModel.destinyCards[0]?.locked).toBe(true);
    expect(getCharacterCreationLockKeyForSelection({ activeTab: "root", selectedSlot: "main" })).toBe("spiritualRoot");
    expect(getCharacterCreationLockKeyForSelection({ activeTab: "origin", selectedSlot: "main" })).toBe("background");
    expect(getCharacterCreationLockKeyForSelection({ activeTab: "items", selectedSlot: "main" })).toBe("carriedItems");
    expect(getCharacterCreationLockKeyForSelection({ activeTab: "stats", selectedSlot: "main" })).toBeUndefined();
  });

  it("exposes lock target labels and disabled states for every selectable creation area", () => {
    const controller = new CharacterCreationController({ seed: "ccui2-c003-lock-labels" });
    const draft = controller.generate({ slotId: "slot_lock_labels", nowMs: 1_000 });

    const cases = [
      { activeTab: "root", selectedSlot: "main", key: "spiritualRoot", label: "灵根", buttonLabel: "锁定灵根" },
      { activeTab: "destiny", selectedSlot: "main", key: "mainDestiny", label: "主天命", buttonLabel: "锁定主天命" },
      { activeTab: "destiny", selectedSlot: "secondary0", key: "secondaryDestiny0", label: "副天命 1", buttonLabel: "锁定副天命 1" },
      { activeTab: "destiny", selectedSlot: "secondary1", key: "secondaryDestiny1", label: "副天命 2", buttonLabel: "锁定副天命 2" },
      { activeTab: "destiny", selectedSlot: "flaw", key: "flawDestiny", label: "劫命", buttonLabel: "锁定劫命" },
      { activeTab: "origin", selectedSlot: "main", key: "background", label: "身世", buttonLabel: "锁定身世" },
      { activeTab: "items", selectedSlot: "main", key: "carriedItems", label: "随身物", buttonLabel: "锁定随身物" }
    ] as const;

    for (const item of cases) {
      const viewModel = createCharacterCreationViewModel(draft, {
        activeTab: item.activeTab,
        selectedSlot: item.selectedSlot
      });

      expect(viewModel.selectedLock).toMatchObject({
        key: item.key,
        label: item.label,
        locked: false,
        canToggle: true,
        canAdd: true,
        buttonLabel: item.buttonLabel
      });
      expect(viewModel.actions.lock.label).toBe(item.buttonLabel);
      expect(viewModel.actions.lock.disabled).toBe(false);
    }

    const statsViewModel = createCharacterCreationViewModel(draft, {
      activeTab: "stats",
      selectedSlot: "main"
    });
    expect(statsViewModel.selectedLock).toBeUndefined();
    expect(statsViewModel.actions.lock).toMatchObject({
      label: "选择可锁定项",
      disabled: true
    });
    expect(statsViewModel.lockTargets.map((target) => target.label)).toEqual([
      "灵根",
      "主天命",
      "副天命 1",
      "副天命 2",
      "劫命",
      "身世",
      "随身物"
    ]);
  });

  it("exposes real opening attributes, spiritual-root metrics, destiny cards, and safe origin fate text", () => {
    const registry = loadOriginFateRegistry();
    const controller = new CharacterCreationController({ seed: "ccui2-c002-view-model" });
    const draft = controller.generate({ slotId: "slot_ccui2_c002_vm", nowMs: 1_000 });
    const hiddenFate = registry.getHiddenFate(draft.originFate.hiddenFateInternal.hiddenFateId);

    const viewModel = createCharacterCreationViewModel(draft, {
      selectedSlot: "main",
      activeTab: "stats"
    });

    expect(Object.fromEntries(viewModel.coreTreasureRows.map((row) => [row.id, row.value]))).toEqual(draft.openingInnateDraft.coreSeed);
    expect(viewModel.coreTreasureRows.every((row) => row.description.length > 0)).toBe(true);
    expect(Object.fromEntries(viewModel.aptitudeRows.map((row) => [row.id, row.value]))).toEqual(draft.openingInnateDraft.aptitude);
    expect(viewModel.aptitudeRows.every((row) => row.description.length > 0)).toBe(true);
    expect(viewModel.spiritualRoot.displayName).toBe(draft.openingInnateDraft.spiritualRoot.displayName);
    expect(viewModel.spiritualRoot.categoryId).toBe(draft.openingInnateDraft.spiritualRoot.categoryId);
    expect(viewModel.spiritualRoot.metrics).toEqual({
      purity: draft.openingInnateDraft.spiritualRoot.purity,
      stability: draft.openingInnateDraft.spiritualRoot.stability,
      conflict: draft.openingInnateDraft.spiritualRoot.conflict,
      breadth: draft.openingInnateDraft.spiritualRoot.breadth
    });
    expect(viewModel.spiritualRoot.metricRows.every((row) => row.description.length > 0)).toBe(true);
    expect(viewModel.spiritualRoot.elements.map((element) => [element.id, element.percentage])).toEqual(
      Object.entries(draft.openingInnateDraft.spiritualRoot.elements)
        .filter(([, value]) => value !== undefined && value > 0)
        .sort(([firstId, firstValue], [secondId, secondValue]) => (secondValue ?? 0) - (firstValue ?? 0) || firstId.localeCompare(secondId))
    );
    expect(viewModel.destinyCards.map((card) => card.traitId)).toEqual([
      draft.destinies.main.traitId,
      draft.destinies.secondary[0].traitId,
      draft.destinies.secondary[1].traitId,
      draft.destinies.flaw.traitId
    ]);
    expect(viewModel.destinyCards.every((card) => card.description.length > 0)).toBe(true);
    expect(viewModel.originFate.backgroundName).toBe(draft.originFate.backgroundOrigin.name);
    expect(viewModel.originFate.omen.levelLabel).toBe(draft.originFate.visibleHiddenOmen.levelLabel);
    expect(viewModel.originFate.carriedItems.map((item) => item.itemId)).toEqual(
      draft.originFate.carriedItems.map((item) => item.itemId)
    );

    const originJson = JSON.stringify(viewModel.originFate);
    expect(originJson).not.toContain(hiddenFate.trueName);
    expect(originJson).not.toContain(draft.originFate.hiddenFateInternal.hiddenFateId);
    expect(originJson).not.toContain(String(draft.originFate.hiddenFateInternal.progress));
  });

  it("exposes safe nine-palace destiny alignment labels without leaking hidden names", () => {
    const registry = loadOriginFateRegistry();
    const controller = new CharacterCreationController({ seed: "npf-c004-view-model-alignment" });
    const draft = controller.generate({ slotId: "slot_npf_c004_vm", nowMs: 1_000 });
    const hiddenFate = registry.getHiddenFate(draft.originFate.hiddenFateInternal.hiddenFateId);

    const viewModel = createCharacterCreationViewModel(draft, {
      selectedSlot: "main",
      activeTab: "destiny"
    });

    expect(viewModel.destinyCards.every((card) => card.fateAlignment !== undefined)).toBe(true);
    expect(viewModel.destinyCards.every((card) => card.fateAlignmentLabel.length > 0)).toBe(true);
    expect(viewModel.destinyCards.map((card) => card.fateAlignment)).toContain("matched");
    const serialized = JSON.stringify(viewModel);
    expect(serialized).not.toContain(hiddenFate.trueName);
    expect(serialized).not.toContain(draft.originFate.hiddenFateInternal.hiddenFateId);
    expect(serialized).not.toContain("trueName");
  });

  it("exposes DEM-C006 destiny v2 detail projections without hidden leakage", () => {
    const registry = loadOriginFateRegistry();
    const controller = new CharacterCreationController({
      seed: "dem-c006-view-model-detail",
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
    const draft = controller.generate({ slotId: "slot_dem_c006_vm_detail", nowMs: 1_000 });
    const hiddenFate = registry.getHiddenFate(draft.originFate.hiddenFateInternal.hiddenFateId);

    const viewModel = createCharacterCreationViewModel(draft, {
      selectedSlot: "main",
      activeTab: "destiny"
    });
    const card = viewModel.destinyCards.find((item) => item.traitId === "destiny_heaven_jealous_talent");

    expect(card?.lifeImpactHooks.map((hook) => hook.hook)).toEqual(
      expect.arrayContaining(["early_speech_or_scripture", "fever_after_insight"])
    );
    expect(card?.modeProjectionBuckets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          bucket: "outerBattlefield",
          tags: expect.arrayContaining(["first_insight_quality_plus_1"])
        }),
        expect.objectContaining({
          bucket: "autochess",
          tags: expect.arrayContaining(["genius_core_piece_bonus"])
        })
      ])
    );
    expect(card?.synergies).toEqual(expect.any(Array));
    expect(card?.conflictWarnings).toEqual(expect.any(Array));
    const serialized = JSON.stringify(viewModel);
    expect(serialized).not.toContain(hiddenFate.trueName);
    expect(serialized).not.toContain(draft.originFate.hiddenFateInternal.hiddenFateId);
    expect(serialized).not.toContain("hiddenFateInternal");
    expect(serialized).not.toContain("trueName");
  });

  it("exposes MIG-C003 v0.2 adapter summaries without mutation source or hidden-name leakage", () => {
    const originRegistry = loadOriginFateRegistry();
    const narrativeRegistry = loadOriginFateNarrativeRegistry();
    const controller = new CharacterCreationController({
      seed: "mig-c003-view-model-v02",
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
    const draft = controller.generate({ slotId: "slot_mig_c003_vm", nowMs: 1_000 });
    const hiddenFate = originRegistry.getHiddenFate(draft.originFate.hiddenFateInternal.hiddenFateId);

    const viewModel = createCharacterCreationViewModel(draft, {
      selectedSlot: "main",
      activeTab: "destiny"
    });
    const mainCard = viewModel.destinyCards[0];

    expect(viewModel.v02.ninePalace.derivedScores.talentScore).toBe(draft.openingInnateDraft.ninePalaceEvaluation.derived.talentScore);
    expect(viewModel.v02.destinyEvaluationResults).toHaveLength(4);
    expect(viewModel.v02.destinyEvaluationResults[0]).toMatchObject({
      finalDestinyId: "destiny_false_heavenly_burden",
      mutation: {
        mutated: true,
        visibleExplanation: "原始天机产生偏转"
      }
    });
    expect(mainCard).toMatchObject({
      traitId: "destiny_false_heavenly_burden",
      mutationExplanation: "原始天机产生偏转"
    });
    expect(viewModel.v02.originNarrativeSummary.activeStorylineLabels.length).toBeGreaterThan(0);
    expect(viewModel.v02.carriedItemLifecycleSummary.items.length).toBeGreaterThan(0);
    expect(viewModel.v02.lifeStorylineInitialScores.storylines.length).toBeGreaterThan(0);
    expect(viewModel.v02.lifeStageInitialState.identityStageIds).toContain("mortal_child");

    const serialized = JSON.stringify(viewModel);
    expect(serialized).not.toContain(hiddenFate.trueName);
    expect(serialized).not.toContain(draft.originFate.hiddenFateInternal.hiddenFateId);
    expect(serialized).not.toContain("destiny_heaven_jealous_talent");
    expect(serialized).not.toContain("hiddenFateInternal");
    expect(serialized).not.toContain("trueName");
    for (const narrativeHiddenFate of narrativeRegistry.hiddenFates) {
      expect(serialized).not.toContain(narrativeHiddenFate.trueName);
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

function makeOpeningDraft(attributes: NinePalaceAttributes): OpeningInnateDraft {
  const ninePalaceEvaluation = evaluateNinePalace(attributes);
  const tags: OpeningDraftTags = {
    destinyBiasTags: ninePalaceEvaluation.tags.destinyBiasTags,
    lifeEventBiasTags: ninePalaceEvaluation.tags.lifeEventBiasTags,
    hiddenFateBiasTags: ninePalaceEvaluation.tags.hiddenFateBiasTags,
    modeBiasTags: ninePalaceEvaluation.tags.modeBiasTags
  };

  return {
    draftId: "draft_dem_c006_vm",
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
