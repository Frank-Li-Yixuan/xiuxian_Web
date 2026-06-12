import { describe, expect, it } from "vitest";

import { CharacterDraftGenerator } from "../../src/character/CharacterDraftGenerator";
import { mapCharacterDraftToOrigin } from "../../src/character/CharacterProfileMapper";
import { createInitialLifeSimulationState } from "../../src/lifeSimulation/LifeSimulationInitializer";
import { loadOriginFateNarrativeRegistry } from "../../src/originFate/OriginFateNarrativeRegistry";
import { createDefaultProfileForSlot } from "../../src/save/ProfileFactory";

describe("LifeSimulationInitializer HFO2-C006", () => {
  it("persists default v0.2 origin fate narrative state from draft to character origin and life simulation", () => {
    const registry = loadOriginFateNarrativeRegistry();
    const generator = new CharacterDraftGenerator({ seed: "hfo2-c006-initializer" });
    const draft = generator.generate({ slotId: "slot_hfo2_c006", nowMs: 1_000 });

    expect(draft.originFateNarrativeState).toBeDefined();
    expect(draft.originFateNarrativeState?.origin.originId).toMatch(/^origin_/);
    expect(draft.originFateNarrativeState?.hiddenFates.length).toBeGreaterThan(0);
    expect(draft.originFateNarrativeState?.carriedItems.length).toBeGreaterThan(0);

    const origin = mapCharacterDraftToOrigin(draft, 2_000);
    const state = createInitialLifeSimulationState(
      createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 1_000 }),
      origin,
      "hfo2-c006-life-seed"
    );

    expect(origin.originFateNarrativeState).toEqual(draft.originFateNarrativeState);
    expect(state.originFateNarrativeState).toEqual(draft.originFateNarrativeState);
    expect(Object.isFrozen(state.originFateNarrativeState)).toBe(true);
    expect(Object.isFrozen(state.originFateNarrativeState?.hiddenFates)).toBe(true);
    expect(JSON.stringify({ draft, origin, state })).not.toContain("\"trueName\":");
    for (const hiddenFate of registry.hiddenFates) {
      expect(JSON.stringify({ draft, origin, state })).not.toContain(hiddenFate.trueName);
    }
  });

  it("keeps v0.2 narrative state absent for legacy character origins", () => {
    const generator = new CharacterDraftGenerator({ seed: "hfo2-c006-legacy" });
    const draft = generator.generate({ slotId: "slot_hfo2_c006_legacy", nowMs: 1_000 });
    const origin = mapCharacterDraftToOrigin(draft, 2_000);
    const { originFateNarrativeState: _omitted, ...legacyOrigin } = origin;

    const state = createInitialLifeSimulationState(
      createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 1_000 }),
      legacyOrigin,
      "hfo2-c006-legacy-life-seed"
    );

    expect(state.originFateNarrativeState).toBeUndefined();
  });
});
