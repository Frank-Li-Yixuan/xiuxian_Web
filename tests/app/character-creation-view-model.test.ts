import { describe, expect, it } from "vitest";

import {
  createCharacterCreationViewModel,
  getCharacterCreationLockKeyForSelection
} from "../../src/app/screens/CharacterCreationViewModel";
import { CharacterCreationController } from "../../src/character/CharacterCreationController";

describe("CharacterCreationViewModel", () => {
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
});
