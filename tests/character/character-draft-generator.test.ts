import { describe, expect, it } from "vitest";

import { loadCharacterCreationData } from "../../src/character/CharacterCreationData";
import { CharacterDraftGenerator } from "../../src/character/CharacterDraftGenerator";
import type { DestinyTraitState, LoadedCharacterCreationData } from "../../src/character/CharacterCreationTypes";

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
    expect(draft.background.backgroundId).toMatch(/^bg_/);
    expect(draft.hiddenFate.hiddenFateId).toMatch(/^hidden_/);
    expect(draft.carriedItems.length).toBeGreaterThan(0);
    expect(draft.divinationTokens).toBe(1);
    expect(draft.rerollCount).toBe(0);
  });

  it("does not select destiny traits that are exclusive with each other", () => {
    const data = loadCharacterCreationData();
    const generator = new CharacterDraftGenerator({ seed: "cc-c001-exclusive", data });

    for (let index = 0; index < 80; index += 1) {
      const draft = generator.generate({ slotId: "slot_1", nowMs: 1_000 + index });
      expect(hasExclusiveCollision(allDestinyTraits(draft.destinies), data.destinyTraits)).toBe(false);
    }
  });

  it("fails closed when data would force an exclusive destiny collision", () => {
    const data = makeCollisionOnlyData();
    const generator = new CharacterDraftGenerator({ seed: "cc-c001-no-compatible", data });

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
    const data = loadCharacterCreationData();
    const generator = new CharacterDraftGenerator({ seed: "cc-c001-flaw", data });

    const draft = generator.generate({ slotId: "slot_1", nowMs: 6_000 });
    const flawDefinition = data.destinyTraits.find((trait) => trait.id === draft.destinies.flaw.traitId);

    expect(flawDefinition?.slotTypes).toContain("flaw");
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

function hasExclusiveCollision(
  traits: readonly DestinyTraitState[],
  definitions: ReturnType<typeof loadCharacterCreationData>["destinyTraits"]
): boolean {
  const selectedIds = new Set(traits.map((trait) => trait.traitId));
  for (const trait of traits) {
    const definition = definitions.find((candidate) => candidate.id === trait.traitId);
    if (definition?.exclusiveWith?.some((exclusiveId) => selectedIds.has(exclusiveId)) === true) {
      return true;
    }
  }
  return false;
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

function makeCollisionOnlyData(): LoadedCharacterCreationData {
  const data = loadCharacterCreationData();
  return {
    ...data,
    destinyTraits: [
      {
        id: "destiny_test_main",
        name: "测试主命格",
        slotTypes: ["main"],
        rarity: "common",
        tags: [],
        description: "测试",
        positiveEffects: [],
        negativeEffects: [],
        exclusiveWith: ["destiny_test_secondary_a", "destiny_test_secondary_b"]
      },
      {
        id: "destiny_test_secondary_a",
        name: "测试副命格一",
        slotTypes: ["secondary"],
        rarity: "common",
        tags: [],
        description: "测试",
        positiveEffects: [],
        negativeEffects: []
      },
      {
        id: "destiny_test_secondary_b",
        name: "测试副命格二",
        slotTypes: ["secondary"],
        rarity: "common",
        tags: [],
        description: "测试",
        positiveEffects: [],
        negativeEffects: []
      },
      {
        id: "flaw_test",
        name: "测试缺陷",
        slotTypes: ["flaw"],
        rarity: "flaw",
        tags: [],
        description: "测试",
        positiveEffects: [],
        negativeEffects: []
      }
    ]
  };
}
