import { describe, expect, it } from "vitest";

import { CharacterCreationController } from "../../src/character/CharacterCreationController";
import type { CharacterCreationRarity } from "../../src/character/CharacterCreationTypes";

describe("CharacterCreationController opening integration", () => {
  it("generates a character draft with a projected opening innate draft", () => {
    const controller = new CharacterCreationController({ seed: "oag-c004-controller-generate" });

    const draft = controller.generate({ slotId: "slot_opening", nowMs: 1_000 });

    expect(draft.openingInnateDraft.draftId).toBe(draft.draftId);
    expect(draft.coreStats).toEqual(draft.openingInnateDraft.coreSeed);
    expect(draft.aptitude).toEqual(draft.openingInnateDraft.aptitude);
    expect(draft.spiritualRoot).toEqual(projectOpeningRoot(draft.openingInnateDraft.spiritualRoot));
    expect(draft.attributeLock).toBe(false);
    expect(draft.spiritualRootLock).toBe(false);
  });

  it("rerolls unlocked opening fields and increments the reroll count", () => {
    const controller = new CharacterCreationController({ seed: "oag-c004-controller-reroll" });
    const first = controller.generate({ slotId: "slot_reroll", nowMs: 1_000 });

    const rerolled = controller.reroll(first, { nowMs: 2_000 });

    expect(rerolled.rerollCount).toBe(first.rerollCount + 1);
    expect(openingSignature(rerolled)).not.toBe(openingSignature(first));
    expect(rerolled.attributeLock).toBe(false);
    expect(rerolled.spiritualRootLock).toBe(false);
  });

  it("preserves opening attributes when attributeLock is enabled", () => {
    const controller = new CharacterCreationController({ seed: "oag-c004-controller-attr-lock" });
    const first = controller.generate({ slotId: "slot_attr_lock", nowMs: 1_000 });

    const rerolled = controller.reroll(first, { nowMs: 2_000, attributeLock: true });

    expect(rerolled.attributeLock).toBe(true);
    expect(rerolled.openingInnateDraft.archetype).toEqual(first.openingInnateDraft.archetype);
    expect(rerolled.openingInnateDraft.aptitude).toEqual(first.openingInnateDraft.aptitude);
    expect(rerolled.openingInnateDraft.coreSeed).toEqual(first.openingInnateDraft.coreSeed);
    expect(rerolled.aptitude).toEqual(first.aptitude);
    expect(rerolled.coreStats).toEqual(first.coreStats);
  });

  it("preserves opening spiritual roots and legacy projected roots when spiritualRootLock is enabled", () => {
    const controller = new CharacterCreationController({ seed: "oag-c004-controller-root-lock" });
    const first = controller.generate({ slotId: "slot_root_lock", nowMs: 1_000 });

    const rerolled = controller.reroll(first, { nowMs: 2_000, spiritualRootLock: true });

    expect(rerolled.spiritualRootLock).toBe(true);
    expect(rerolled.openingInnateDraft.spiritualRoot).toEqual(first.openingInnateDraft.spiritualRoot);
    expect(rerolled.spiritualRoot).toEqual(first.spiritualRoot);
  });
});

function openingSignature(draft: ReturnType<CharacterCreationController["generate"]>): string {
  return JSON.stringify({
    archetype: draft.openingInnateDraft.archetype.id,
    aptitude: draft.openingInnateDraft.aptitude,
    coreSeed: draft.openingInnateDraft.coreSeed,
    spiritualRoot: draft.openingInnateDraft.spiritualRoot
  });
}

function projectOpeningRoot(root: ReturnType<CharacterCreationController["generate"]>["openingInnateDraft"]["spiritualRoot"]): {
  readonly rootId: string;
  readonly displayName: string;
  readonly elements: readonly string[];
  readonly rarity: CharacterCreationRarity;
  readonly tags: readonly string[];
} {
  return {
    rootId: `opening_${root.categoryId}_${root.primaryElement ?? "none"}`,
    displayName: root.displayName,
    elements: Object.entries(root.elements)
      .filter(([, value]) => value !== undefined && value > 0)
      .sort(([firstElement, firstValue], [secondElement, secondValue]) => (secondValue ?? 0) - (firstValue ?? 0) || firstElement.localeCompare(secondElement))
      .map(([element]) => element),
    rarity: mapRarity(root.categoryId),
    tags: root.tags
  };
}

function mapRarity(categoryId: string): CharacterCreationRarity {
  switch (categoryId) {
    case "closed":
      return "flaw";
    case "single":
    case "dual":
      return "common";
    case "triple":
    case "mixed":
      return "uncommon";
    case "hidden":
    case "variant":
      return "rare";
    case "chaos":
      return "epic";
    case "heavenly":
      return "legendary";
    default:
      return "common";
  }
}
