import { describe, expect, it } from "vitest";

import { CharacterCreationController } from "../../src/character/CharacterCreationController";
import { applyCharacterDraftToProfile } from "../../src/character/CharacterProfileMapper";
import {
  applyAge18OriginFateResolutionToProfile,
  resolveAge18OriginFate
} from "../../src/originFate/Age18OriginFateResolver";
import { createDefaultProfileForSlot } from "../../src/save/ProfileFactory";
import { createSaveSlotService } from "../../src/save/SaveSlotService";
import { SeededRng } from "../../src/sim/core/SeededRng";

describe("character profile age18 origin fate persistence", () => {
  it("writes age18 origin fate conversion results into profile and preserves them through save storage", () => {
    const controller = new CharacterCreationController({ seed: "hfo-c007-profile" });
    const profile = createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 1_000 });
    const draft = controller.generate({ slotId: "slot_1", nowMs: 1_500, name: "Lin Wen" });
    const confirmed = applyCharacterDraftToProfile({
      profile,
      draft,
      nowMs: 2_000,
      ageYears: 18
    });
    const resolution = resolveAge18OriginFate(draft.originFate, {}, new SeededRng("hfo-c007-profile-resolution", "age18_test"));

    const updated = applyAge18OriginFateResolutionToProfile({
      profile: confirmed,
      resolution,
      nowMs: 2_500
    });
    const service = createSaveSlotService({ storage: new MemoryStorage(), nowMs: () => 3_000 });
    service.writeProfile("slot_1", updated);
    const loaded = service.readProfile("slot_1");

    expect(updated.age18OriginFate).toEqual(resolution);
    expect(updated.lifeSimulation).toEqual({ status: "completed", ageYears: 18 });
    expect(updated.flags.originFateAge18Resolved).toBe(true);
    expect(updated.updatedAtMs).toBe(2_500);
    expect(loaded?.age18OriginFate).toEqual(resolution);
    expect(loaded?.characterOrigin?.originFate).toEqual(draft.originFate);
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
