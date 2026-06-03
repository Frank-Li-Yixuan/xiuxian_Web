import { describe, expect, it } from "vitest";

import { CharacterCreationController } from "../../src/character/CharacterCreationController";
import { applyCharacterDraftToProfile } from "../../src/character/CharacterProfileMapper";
import { createDefaultProfileForSlot } from "../../src/save/ProfileFactory";

describe("CharacterCreationController destiny reroll integration", () => {
  it("generates DT-backed destiny selection state and reroll session metadata", () => {
    const controller = new CharacterCreationController({ seed: "dt-c004-generate" });

    const draft = controller.generate({ slotId: "slot_dt_c004", nowMs: 1_000 });

    expect(draft.destinyRollDraft?.destinies.main.id).toBe(draft.destinies.main.traitId);
    expect(draft.destinyRollDraft?.destinies.secondary[0]?.id).toBe(draft.destinies.secondary[0].traitId);
    expect(draft.destinyRollDraft?.destinies.flaw.id).toBe(draft.destinies.flaw.traitId);
    expect(draft.destinies.synergyWarnings).toEqual(draft.destinyRollDraft?.destinies.synergyWarnings);
    expect(draft.destinies.conflictWarnings).toEqual(draft.destinyRollDraft?.destinies.conflictWarnings);
    expect(draft.destinyRerollSession?.fateMeter).toEqual(draft.destinyRollDraft?.fateMeter);
    expect(draft.destinyRerollSession?.locksRemaining).toBe(2);
  });

  it("rerolls unlocked destinies and tracks fate meter history", () => {
    const controller = new CharacterCreationController({ seed: "dt-c004-reroll" });
    const first = controller.generate({ slotId: "slot_reroll", nowMs: 1_000 });

    const rerolled = controller.reroll(first, { nowMs: 2_000 });

    expect(rerolled.rerollCount).toBe(first.rerollCount + 1);
    expect(rerolled.destinyRerollSession?.rerollCount).toBe(1);
    expect(destinySignature(rerolled)).not.toBe(destinySignature(first));
    expect(rerolled.destinyRerollSession?.previousTraitIds).toEqual(
      expect.arrayContaining([first.destinies.main.traitId, rerolled.destinies.main.traitId])
    );
  });

  it("preserves each locked destiny slot independently", () => {
    const lockCases = [
      ["mainDestiny", (draft: Draft) => draft.destinies.main.traitId],
      ["secondaryDestiny0", (draft: Draft) => draft.destinies.secondary[0].traitId],
      ["secondaryDestiny1", (draft: Draft) => draft.destinies.secondary[1].traitId],
      ["flawDestiny", (draft: Draft) => draft.destinies.flaw.traitId]
    ] as const;

    for (const [lockKey, readTraitId] of lockCases) {
      const controller = new CharacterCreationController({ seed: `dt-c004-lock-${lockKey}` });
      const first = controller.generate({ slotId: `slot_${lockKey}`, nowMs: 1_000 });

      const rerolled = controller.reroll(first, {
        nowMs: 2_000,
        locks: { [lockKey]: true }
      });

      expect(readTraitId(rerolled)).toBe(readTraitId(first));
      expect(rerolled.locks[lockKey]).toBe(true);
      expect(rerolled.destinyRerollSession?.locksRemaining).toBe(1);
    }
  });

  it("enforces the destiny lock budget when toggling locks", () => {
    const controller = new CharacterCreationController({ seed: "dt-c004-lock-budget" });
    const first = controller.generate({ slotId: "slot_budget", nowMs: 1_000 });

    const oneLocked = controller.toggleLock(first, { lockKey: "mainDestiny", nowMs: 2_000 });
    const twoLocked = controller.toggleLock(oneLocked, { lockKey: "secondaryDestiny0", nowMs: 3_000 });

    expect(twoLocked.destinyRerollSession?.locksRemaining).toBe(0);
    expect(() => controller.toggleLock(twoLocked, { lockKey: "flawDestiny", nowMs: 4_000 })).toThrow(
      "Character creation lock budget exceeded"
    );
    expect(twoLocked.locks.flawDestiny).toBe(false);
  });

  it("spends divination tokens to force the rare-guarantee fate meter path", () => {
    const controller = new CharacterCreationController({ seed: "dt-c004-divination" });
    const first = controller.generate({ slotId: "slot_divination", nowMs: 1_000 });

    const divined = controller.reroll(first, { nowMs: 2_000, useDivination: true });

    expect(divined.divinationTokens).toBe(first.divinationTokens - 1);
    expect(divined.destinyRollDraft?.debug.fateMeterBefore.guaranteeRareNext).toBe(true);
    expect(qualityRank(divined.destinyRollDraft?.destinies.main.quality)).toBeGreaterThanOrEqual(qualityRank("rare"));
    expect(() => controller.reroll(divined, { nowMs: 3_000, useDivination: true })).toThrow(
      "No divination tokens remaining"
    );
  });

  it("persists selected destiny data but not draft-only reroll session state into confirmed profiles", () => {
    const controller = new CharacterCreationController({ seed: "dt-c004-profile" });
    const profile = createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 1_000 });
    const draft = controller.reroll(
      controller.generate({ slotId: "slot_1", nowMs: 1_500, name: "Lin Wen" }),
      { nowMs: 1_800, locks: { mainDestiny: true } }
    );

    const confirmed = applyCharacterDraftToProfile({
      profile,
      draft,
      nowMs: 2_000,
      ageYears: 18
    });
    const originRecord = confirmed.characterOrigin as unknown as Record<string, unknown>;

    expect(confirmed.characterOrigin?.destinies).toEqual(draft.destinies);
    expect(originRecord.destinyRollDraft).toBeUndefined();
    expect(originRecord.destinyRerollSession).toBeUndefined();
    expect(originRecord.divinationTokens).toBeUndefined();
    expect(originRecord.locks).toBeUndefined();
  });
});

type Draft = ReturnType<CharacterCreationController["generate"]>;

function destinySignature(draft: Draft): string {
  return JSON.stringify([
    draft.destinies.main.traitId,
    ...draft.destinies.secondary.map((trait) => trait.traitId),
    draft.destinies.flaw.traitId
  ]);
}

function qualityRank(quality: string | undefined): number {
  const ranks: Record<string, number> = {
    flaw: 0,
    mortal: 1,
    good: 2,
    rare: 3,
    mystic: 4,
    earthly: 5,
    heavenly: 6,
    defiant: 6,
    forbidden: 7
  };
  return ranks[quality ?? "flaw"] ?? 0;
}
