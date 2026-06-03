import { describe, expect, it } from "vitest";

import { DestinyCombinationEngine } from "../../src/characterCreation/destiny/DestinyCombinationEngine";
import { createDestinyRegistry, loadDestinyRegistry } from "../../src/characterCreation/destiny/DestinyRegistry";
import { CharacterDraftGenerator } from "../../src/character/CharacterDraftGenerator";
import type { DestinyTraitState } from "../../src/character/CharacterCreationTypes";
import type { DestinyDataBundle, DestinyQuality, DestinyQualityDefinition } from "../../src/types/destiny-types.v0.1";

describe("CharacterDraftGenerator", () => {
  it("generates a complete character creation draft", () => {
    const generator = new CharacterDraftGenerator({ seed: "cc-c001-complete" });

    const draft = generator.generate({ slotId: "slot_1", nowMs: 1_000 });

    expect(draft.draftId).toBe("draft_slot_1_0");
    expect(draft.slotId).toBe("slot_1");
    expect(draft.name).toBe("无名散修");
    expect(draft.coreStats).toEqual({
      jing: expect.any(Number),
      qi: expect.any(Number),
      shen: expect.any(Number)
    });
    expect(draft.aptitude).toEqual({
      rootBone: expect.any(Number),
      comprehension: expect.any(Number),
      inspiration: expect.any(Number),
      fortune: expect.any(Number),
      heart: expect.any(Number),
      lifespan: expect.any(Number)
    });
    expect(draft.openingInnateDraft.draftId).toBe(draft.draftId);
    expect(draft.coreStats).toEqual(draft.openingInnateDraft.coreSeed);
    expect(draft.aptitude).toEqual(draft.openingInnateDraft.aptitude);
    expect(draft.spiritualRoot.rootId).toMatch(/^opening_/);
    expect(draft.attributeLock).toBe(false);
    expect(draft.spiritualRootLock).toBe(false);
    expect(draft.destinies.main.traitId).toMatch(/^destiny_/);
    expect(draft.destinies.secondary).toHaveLength(2);
    expect(draft.destinies.flaw.traitId).toMatch(/^flaw_/);
    expect(draft.originFate.draftId).toBe(draft.draftId);
    expect(draft.background.backgroundId).toMatch(/^origin_/);
    expect(draft.background.backgroundId).toBe(draft.originFate.backgroundOrigin.originId);
    expect(draft.hiddenFate.hiddenFateId).toMatch(/^hidden_/);
    expect(draft.carriedItems.length).toBeGreaterThan(0);
    expect(draft.divinationTokens).toBe(1);
    expect(draft.rerollCount).toBe(0);
  });

  it("does not select destiny traits that are exclusive with each other", () => {
    const registry = loadDestinyRegistry();
    const engine = new DestinyCombinationEngine(registry);
    const generator = new CharacterDraftGenerator({ seed: "cc-c001-exclusive" });

    for (let index = 0; index < 80; index += 1) {
      const draft = generator.generate({ slotId: "slot_1", nowMs: 1_000 + index });
      expect(engine.hasHardExclusive(allDestinyTraits(draft.destinies).map((trait) => trait.traitId))).toBe(false);
    }
  });

  it("fails closed when destiny registry data would force an exclusive destiny collision", () => {
    const destinyRegistry = createDestinyRegistry(makeCollisionOnlyDestinyData());
    const generator = new CharacterDraftGenerator({ seed: "cc-c001-no-compatible", destinyRegistry });

    expect(() => generator.generate({ slotId: "slot_1", nowMs: 1_000 })).toThrow(/No compatible destiny traits/);
  });

  it("keeps a locked main destiny when rerolling", () => {
    const generator = new CharacterDraftGenerator({ seed: "cc-c001-lock-main" });
    const draft = generator.generate({ slotId: "slot_2", nowMs: 2_000 });

    const rerolled = generator.reroll(draft, {
      locks: { mainDestiny: true },
      nowMs: 3_000
    });

    expect(rerolled.destinies.main).toEqual(draft.destinies.main);
    expect(rerolled.locks.mainDestiny).toBe(true);
    expect(rerolled.rerollCount).toBe(1);
    expect(rerolled.updatedAtMs).toBe(3_000);
  });

  it("can change unlocked fields on reroll", () => {
    const generator = new CharacterDraftGenerator({ seed: "cc-c001-reroll-change" });
    const draft = generator.generate({ slotId: "slot_3", nowMs: 4_000 });

    const rerolled = generator.reroll(draft, { nowMs: 5_000 });

    expect(getUnlockedSignature(rerolled)).not.toBe(getUnlockedSignature(draft));
  });

  it("always draws the flaw destiny from the flaw slot", () => {
    const registry = loadDestinyRegistry();
    const generator = new CharacterDraftGenerator({ seed: "cc-c001-flaw", destinyRegistry: registry });

    const draft = generator.generate({ slotId: "slot_1", nowMs: 6_000 });
    const flawDefinition = registry.getTrait(draft.destinies.flaw.traitId);

    expect(flawDefinition.slotTypes).toContain("flaw");
    expect(draft.destinies.flaw.quality).toBe("flaw");
    expect(draft.destinies.flaw.rarity).toBe("flaw");
  });
});

function allDestinyTraits(destinies: {
  readonly main: DestinyTraitState;
  readonly secondary: readonly [DestinyTraitState, DestinyTraitState];
  readonly flaw: DestinyTraitState;
}): readonly DestinyTraitState[] {
  return [destinies.main, ...destinies.secondary, destinies.flaw];
}

function getUnlockedSignature(draft: {
  readonly spiritualRoot: { readonly rootId: string };
  readonly destinies: {
    readonly main: { readonly traitId: string };
    readonly secondary: readonly [{ readonly traitId: string }, { readonly traitId: string }];
    readonly flaw: { readonly traitId: string };
  };
  readonly background: { readonly backgroundId: string };
  readonly hiddenFate: { readonly hiddenFateId: string };
  readonly carriedItems: readonly { readonly itemId: string }[];
}): string {
  return JSON.stringify({
    root: draft.spiritualRoot.rootId,
    main: draft.destinies.main.traitId,
    secondary: draft.destinies.secondary.map((trait) => trait.traitId),
    flaw: draft.destinies.flaw.traitId,
    background: draft.background.backgroundId,
    hiddenFate: draft.hiddenFate.hiddenFateId,
    items: draft.carriedItems.map((item) => item.itemId)
  });
}

function makeCollisionOnlyDestinyData(): DestinyDataBundle {
  return {
    qualityTables: {
      version: "test",
      qualities: [makeQuality("good", 2)],
      qualityWeights: {
        main: { good: 1 },
        secondary: { good: 1 },
        flawSeverity: { minor: 1 }
      },
      budgetCostReference: []
    },
    destinyTraits: {
      version: "test",
      traits: [
        makeTrait("destiny_test_main", "good", ["main"]),
        makeTrait("destiny_test_secondary_a", "good", ["secondary"]),
        makeTrait("destiny_test_secondary_b", "good", ["secondary"]),
        makeTrait("flaw_test", "flaw", ["flaw"], "minor")
      ]
    },
    conflictSynergyRules: {
      version: "test",
      exclusiveRules: [
        {
          id: "ex_main_secondary_a",
          traits: ["destiny_test_main", "destiny_test_secondary_a"],
          reason: "test main excludes secondary a"
        },
        {
          id: "ex_main_secondary_b",
          traits: ["destiny_test_main", "destiny_test_secondary_b"],
          reason: "test main excludes secondary b"
        }
      ],
      synergyRules: [],
      conflictRules: []
    },
    rerollRules: {
      version: "test",
      freeReroll: true,
      initialLocks: 2,
      initialDivinationTokens: 1,
      maxLockedFields: 2,
      lockableFields: ["spiritualRoot", "mainDestiny", "secondaryDestiny0", "secondaryDestiny1", "flawDestiny"],
      advancedLockableFields: [],
      fateMeter: {
        initial: 0,
        noRareOrAboveDelta: 1,
        rareDelta: -2,
        mysticOrAboveReset: true,
        thresholdBoost: 2,
        thresholdGuaranteeRare: 4,
        boostRule: "test"
      },
      highQualityLimits: {
        maxEarthlyOrAbovePerDraft: 1,
        allowSecondEarthlyOrAboveWithDivination: false,
        maxForbiddenPerDraft: 1
      },
      rerollHistory: {
        recordLast: 20,
        repetitionPenalty: 0.5
      }
    }
  };
}

function makeQuality(id: Exclude<DestinyQuality, "flaw">, rank: number): DestinyQualityDefinition {
  return {
    id,
    name: id,
    rank,
    positiveBudget: [1, 2],
    negativeBudget: [0, 1],
    frameAsset: `destiny_card_${id}`,
    color: "#ffffff"
  };
}

function makeTrait(
  id: string,
  quality: DestinyQuality,
  slotTypes: readonly ("main" | "secondary" | "flaw")[],
  calamitySeverity?: "minor"
) {
  return {
    id,
    name: id,
    quality,
    slotTypes,
    ...(calamitySeverity === undefined ? {} : { calamitySeverity }),
    tags: [],
    description: id,
    positiveEffects: [],
    negativeEffects: [],
    modifiers: {},
    baseWeight: 100
  };
}
