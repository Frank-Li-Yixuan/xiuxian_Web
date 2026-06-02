import { describe, expect, it } from "vitest";

import { CharacterCreationController } from "../../src/character/CharacterCreationController";
import { applyCharacterDraftToProfile } from "../../src/character/CharacterProfileMapper";
import { loadOriginFateRegistry } from "../../src/originFate/OriginFateRegistry";
import { createDefaultProfileForSlot } from "../../src/save/ProfileFactory";

describe("CharacterCreationController origin fate integration", () => {
  it("generates an originFate draft and projects safe visible fields into legacy creation fields", () => {
    const registry = loadOriginFateRegistry();
    const controller = new CharacterCreationController({ seed: "hfo-c005-controller-generate" });

    const draft = controller.generate({ slotId: "slot_origin_fate", nowMs: 1_000 });
    const hiddenFateDefinition = registry.getHiddenFate(draft.originFate.hiddenFateInternal.hiddenFateId);

    expect(draft.originFate.draftId).toBe(draft.draftId);
    expect(draft.originFate.backgroundOrigin.originId).toBe(draft.background.backgroundId);
    expect(draft.originFate.backgroundOrigin.name).toBe(draft.background.name);
    expect(draft.originFate.visibleHiddenOmen.hints.length).toBeGreaterThan(0);
    expect(draft.hiddenFate.hint).toContain(draft.originFate.visibleHiddenOmen.hints[0]);
    expect(draft.hiddenFate.revealed).toBe(false);
    expect(draft.hiddenFate.secretName).toBeUndefined();
    expect(JSON.stringify(draft.hiddenFate)).not.toContain(hiddenFateDefinition.trueName);
    expect(JSON.stringify(draft.hiddenFate)).not.toContain(String(draft.originFate.hiddenFateInternal.progress));
    expect(draft.carriedItems.map((item) => item.itemId)).toEqual(draft.originFate.carriedItems.map((item) => item.itemId));
    expect(draft.carriedItems.every((item) => item.outerBattlefieldConversion !== undefined)).toBe(true);
  });

  it("rerolls originFate while preserving locked background and carried item slots", () => {
    const controller = new CharacterCreationController({ seed: "hfo-c005-controller-reroll-locks" });
    const first = controller.generate({ slotId: "slot_origin_locks", nowMs: 1_000 });

    const rerolled = controller.reroll(first, {
      nowMs: 2_000,
      locks: {
        background: true,
        carriedItems: true
      }
    });

    expect(rerolled.rerollCount).toBe(first.rerollCount + 1);
    expect(rerolled.locks.background).toBe(true);
    expect(rerolled.locks.carriedItems).toBe(true);
    expect(rerolled.originFate.backgroundOrigin).toEqual(first.originFate.backgroundOrigin);
    expect(rerolled.background).toEqual(first.background);
    expect(rerolled.originFate.carriedItems).toEqual(first.originFate.carriedItems);
    expect(rerolled.carriedItems).toEqual(first.carriedItems);
    expect(originFateUnlockedSignature(rerolled)).not.toBe(originFateUnlockedSignature(first));
  });

  it("persists originFate into confirmed profile character origin", () => {
    const controller = new CharacterCreationController({ seed: "hfo-c005-profile" });
    const profile = createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 1_000 });
    const draft = controller.generate({ slotId: "slot_1", nowMs: 1_500, name: "Lin Wen" });

    const confirmed = applyCharacterDraftToProfile({
      profile,
      draft,
      nowMs: 2_000,
      ageYears: 18
    });

    expect(confirmed.characterOrigin?.originFate).toEqual(draft.originFate);
    expect(confirmed.characterOrigin?.background).toEqual(draft.background);
    expect(confirmed.characterOrigin?.hiddenFate.secretName).toBeUndefined();
    expect(confirmed.characterOrigin?.carriedItems).toEqual(draft.carriedItems);
  });
});

function originFateUnlockedSignature(draft: ReturnType<CharacterCreationController["generate"]>): string {
  return JSON.stringify({
    hiddenFate: draft.originFate.hiddenFateInternal.hiddenFateId,
    omen: draft.originFate.visibleHiddenOmen,
    lifeEventBiasTags: draft.originFate.lifeEventBiasTags,
    modeProjectionTags: draft.originFate.modeProjectionTags
  });
}
