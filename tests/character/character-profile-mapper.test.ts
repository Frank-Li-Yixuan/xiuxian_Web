import { describe, expect, it } from "vitest";

import { CharacterDraftGenerator } from "../../src/character/CharacterDraftGenerator";
import { applyCharacterDraftToProfile } from "../../src/character/CharacterProfileMapper";
import { createDefaultProfileForSlot } from "../../src/save/ProfileFactory";
import { createSaveSlotService } from "../../src/save/SaveSlotService";

describe("CharacterProfileMapper", () => {
  it("maps a confirmed draft into characterOrigin and initializes life simulation state", () => {
    const storage = new MemoryStorage();
    const service = createSaveSlotService({ storage, nowMs: () => 2_000 });
    const profile = createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 1_000, saveName: "Qingyun Newborn" });
    const draft = new CharacterDraftGenerator({ seed: "profile-mapper-confirm" }).generate({
      slotId: "slot_1",
      nowMs: 1_500,
      name: " Lin Wen "
    });

    const confirmed = applyCharacterDraftToProfile({
      profile,
      draft,
      nowMs: 2_000
    });
    service.writeProfile("slot_1", confirmed);
    const loaded = service.readProfile("slot_1");

    expect(loaded?.characterName).toBe("Lin Wen");
    expect(loaded?.stage).toBe("life_simulation");
    expect(loaded?.characterOrigin).toEqual({
      characterId: draft.draftId,
      name: "Lin Wen",
      appearance: draft.appearance,
      coreStats: draft.coreStats,
      aptitude: draft.aptitude,
      spiritualRoot: draft.spiritualRoot,
      openingInnateDraft: draft.openingInnateDraft,
      destinies: draft.destinies,
      originFate: draft.originFate,
      background: draft.background,
      hiddenFate: draft.hiddenFate,
      carriedItems: draft.carriedItems,
      attributeLock: draft.attributeLock,
      spiritualRootLock: draft.spiritualRootLock,
      confirmedAtMs: 2_000
    });
    expect(loaded?.lifeSimulation).toEqual({ status: "simulating", ageYears: 0 });
    expect(loaded?.lifeSimulationState).toEqual(
      expect.objectContaining({
        profileId: "local_slot_1",
        characterId: draft.draftId,
        ageMonths: 0,
        phaseId: "infancy",
        core: draft.coreStats,
        aptitude: draft.aptitude,
        monthlyLogs: []
      })
    );
    expect(loaded?.lifeSimulationState?.hiddenFateProgress[draft.originFate.hiddenFateInternal.hiddenFateId]).toBe(
      draft.originFate.hiddenFateInternal.progress
    );
    for (const item of draft.originFate.carriedItems) {
      expect(loaded?.lifeSimulationState?.carriedItemAffinity[item.itemId]).toBe(0);
    }
    expect(loaded?.realm).toEqual(profile.realm);
  });

  it("rejects a blank confirmed character name", () => {
    const profile = createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 1_000 });
    const draft = new CharacterDraftGenerator({ seed: "profile-mapper-blank" }).generate({
      slotId: "slot_1",
      nowMs: 1_500,
      name: "Lin Wen"
    });

    expect(() =>
      applyCharacterDraftToProfile({
        profile,
        draft: { ...draft, name: "   " },
        nowMs: 2_000
      })
    ).toThrow("character draft name must not be empty");
  });
});

class MemoryStorage implements Storage {
  public readonly store = new Map<string, string>();

  public get length(): number {
    return this.store.size;
  }

  public clear(): void {
    this.store.clear();
  }

  public getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  public key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }

  public removeItem(key: string): void {
    this.store.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}
