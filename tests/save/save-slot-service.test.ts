import { describe, expect, it } from "vitest";

import { createDefaultProfileForSlot } from "../../src/save/ProfileFactory";
import { SAVE_SLOT_IDS, createSaveSlotService } from "../../src/save/SaveSlotService";

describe("SaveSlotService", () => {
  it("lists three empty slots and disables continue when storage has no profiles", () => {
    const service = createSaveSlotService({ storage: new MemoryStorage(), nowMs: () => 1_000 });

    expect(SAVE_SLOT_IDS).toEqual(["slot_1", "slot_2", "slot_3"]);
    expect(service.hasAnySave()).toBe(false);
    expect(service.listSlots()).toEqual([
      { slotId: "slot_1", index: 0, profile: null, occupied: false },
      { slotId: "slot_2", index: 1, profile: null, occupied: false },
      { slotId: "slot_3", index: 2, profile: null, occupied: false }
    ]);
  });

  it("creates a slot-specific default profile without merging cultivation and insight exp", () => {
    const profile = createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 1_234 });

    expect(profile.profileId).toBe("local_slot_1");
    expect(profile.createdAtMs).toBe(1_234);
    expect(profile.updatedAtMs).toBe(1_234);
    expect(profile.realm).toEqual(
      expect.objectContaining({
        realmId: "qi_refining",
        layer: 1,
        cultivation: 0,
        cultivationToNext: 300
      })
    );
    expect(profile.wallet).not.toHaveProperty("insight_exp");
    expect(profile.flags.firstStageCleared).toBe(false);
  });

  it("writes, reads, overwrites, and deletes a profile by save slot", () => {
    const storage = new MemoryStorage();
    const service = createSaveSlotService({ storage, nowMs: () => 2_000 });
    const firstProfile = createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 1_000 });

    service.writeProfile("slot_1", firstProfile);

    expect(service.hasAnySave()).toBe(true);
    expect(service.readProfile("slot_1")).toEqual(firstProfile);
    expect(service.listSlots()[0]).toEqual({ slotId: "slot_1", index: 0, profile: firstProfile, occupied: true });

    const replacement = createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 3_000 });
    service.writeProfile("slot_1", replacement);
    expect(service.readProfile("slot_1")?.createdAtMs).toBe(3_000);
    expect(service.readProfile("slot_1")).not.toEqual(firstProfile);

    service.deleteProfile("slot_1");
    expect(service.readProfile("slot_1")).toBeNull();
    expect(service.hasAnySave()).toBe(false);
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
