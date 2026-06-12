import { describe, expect, it } from "vitest";

import { CharacterDraftGenerator } from "../../src/character/CharacterDraftGenerator";
import { mapCharacterDraftToOrigin } from "../../src/character/CharacterProfileMapper";
import { createInitialLifeSimulationState } from "../../src/lifeSimulation/LifeSimulationInitializer";
import { createDefaultProfileForSlot } from "../../src/save/ProfileFactory";

describe("LifeSimulationInitializer NPF-C005", () => {
  it("stores a safe nine palace summary from the confirmed character origin", () => {
    const generator = new CharacterDraftGenerator({ seed: "npf-c005-initializer" });
    const draft = generator.generate({ slotId: "slot_npf_c005", nowMs: 1_000 });
    const origin = mapCharacterDraftToOrigin(draft, 2_000);

    const state = createInitialLifeSimulationState(
      createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 1_000 }),
      origin,
      "npf-c005-life-seed"
    );

    expect(state.ninePalaceSummary?.attributes).toEqual(draft.openingInnateDraft.ninePalaceEvaluation.attributes);
    expect(state.ninePalaceSummary?.derivedScores).toEqual(draft.openingInnateDraft.ninePalaceEvaluation.derived);
    expect(state.ninePalaceSummary?.lifeEventBiasTags).toEqual(
      expect.arrayContaining(draft.openingInnateDraft.ninePalaceEvaluation.tags.lifeEventBiasTags)
    );
    expect(Object.isFrozen(state.ninePalaceSummary)).toBe(true);
    expect(JSON.stringify(state.ninePalaceSummary)).not.toContain("trueName");
    expect(JSON.stringify(state.ninePalaceSummary)).not.toContain("hiddenInternal");
  });

  it("keeps nine palace summary absent for legacy origins without an opening evaluation", () => {
    const generator = new CharacterDraftGenerator({ seed: "npf-c005-legacy" });
    const draft = generator.generate({ slotId: "slot_npf_c005_legacy", nowMs: 1_000 });
    const origin = mapCharacterDraftToOrigin(draft, 2_000);
    const legacyOrigin = {
      ...origin,
      openingInnateDraft: {
        ...origin.openingInnateDraft,
        ninePalaceEvaluation: undefined
      }
    } as unknown as typeof origin;

    const state = createInitialLifeSimulationState(
      createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 1_000 }),
      legacyOrigin,
      "npf-c005-legacy-life-seed"
    );

    expect(state.ninePalaceSummary).toBeUndefined();
  });
});
