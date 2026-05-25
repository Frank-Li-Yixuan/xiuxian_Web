import { describe, expect, it } from "vitest";

import { CharacterDraftGenerator } from "../../src/character/CharacterDraftGenerator";
import { applyCharacterDraftToProfile } from "../../src/character/CharacterProfileMapper";
import { createDefaultProfileForSlot } from "../../src/save/ProfileFactory";
import { createSaveSlotService } from "../../src/save/SaveSlotService";

describe("CharacterProfileMapper", () => {
  it("maps a confirmed draft into characterOrigin and persists it through SaveSlotService", () => {
    const storage = new MemoryStorage();
    const service = createSaveSlotService({ storage, nowMs: () => 2_000 });
    const profile = createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 1_000, saveName: "青云新生" });
    const draft = new CharacterDraftGenerator({ seed: "profile-mapper-confirm" }).generate({
      slotId: "slot_1",
      nowMs: 1_500,
      name: "林问道"
    });

    const confirmed = applyCharacterDraftToProfile({
      profile,
      draft,
      nowMs: 2_000,
      ageYears: 18
    });
    service.writeProfile("slot_1", confirmed);
    const loaded = service.readProfile("slot_1");

    expect(loaded?.characterName).toBe("林问道");
    expect(loaded?.characterOrigin).toEqual({
      characterId: draft.draftId,
      name: "林问道",
      appearance: draft.appearance,
      coreStats: draft.coreStats,
      aptitude: draft.aptitude,
      spiritualRoot: draft.spiritualRoot,
      destinies: draft.destinies,
      background: draft.background,
      hiddenFate: draft.hiddenFate,
      carriedItems: draft.carriedItems,
      confirmedAtMs: 2_000
    });
    expect(loaded?.lifeSimulation).toEqual({ status: "completed", ageYears: 18 });
    expect(loaded?.realm).toEqual(profile.realm);
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
