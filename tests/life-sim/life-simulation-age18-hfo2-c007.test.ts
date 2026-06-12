import { describe, expect, it } from "vitest";

import { CharacterDraftGenerator } from "../../src/character/CharacterDraftGenerator";
import { mapCharacterDraftToOrigin } from "../../src/character/CharacterProfileMapper";
import { createInitialLifeSimulationState } from "../../src/lifeSimulation/LifeSimulationInitializer";
import {
  resolveAge18OriginFateConversionFromLifeSimulationState
} from "../../src/originFate/Age18OriginFateConversionEngineV02";
import { loadOriginFateNarrativeRegistry } from "../../src/originFate/OriginFateNarrativeRegistry";
import { createDefaultProfileForSlot } from "../../src/save/ProfileFactory";

describe("LifeSimulation age18 HFO2-C007 bridge", () => {
  it("resolves an HFO2 age18 conversion payload from LifeSimulationState narrative state", () => {
    const registry = loadOriginFateNarrativeRegistry();
    const generator = new CharacterDraftGenerator({ seed: "hfo2-c007-life-state" });
    const draft = generator.generate({ slotId: "slot_hfo2_c007", nowMs: 1_000 });
    const origin = mapCharacterDraftToOrigin(draft, 2_000);
    const state = createInitialLifeSimulationState(
      createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 1_000 }),
      origin,
      "hfo2-c007-life-sim"
    );

    const resolution = resolveAge18OriginFateConversionFromLifeSimulationState(state);

    expect(resolution).toBeDefined();
    expect(resolution?.longTermTags).toContain(`origin:${state.originFateNarrativeState?.origin.originId}`);
    expect(resolution?.traceability.length).toBeGreaterThan(0);
    const serialized = JSON.stringify({
      sealedHiddenFates: resolution?.sealedHiddenFates,
      debugTags: resolution?.debugTags,
      traceability: resolution?.traceability
    });
    for (const hiddenFate of registry.hiddenFates) {
      expect(serialized).not.toContain(hiddenFate.trueName);
    }
  });

  it("keeps legacy life states compatible when allowMissing is true", () => {
    const generator = new CharacterDraftGenerator({ seed: "hfo2-c007-legacy" });
    const draft = generator.generate({ slotId: "slot_hfo2_c007_legacy", nowMs: 1_000 });
    const origin = mapCharacterDraftToOrigin(draft, 2_000);
    const { originFateNarrativeState: _omitted, ...legacyOrigin } = origin;
    const state = createInitialLifeSimulationState(
      createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 1_000 }),
      legacyOrigin,
      "hfo2-c007-legacy-life-sim"
    );

    expect(resolveAge18OriginFateConversionFromLifeSimulationState(state, { allowMissing: true })).toBeUndefined();
    expect(() => resolveAge18OriginFateConversionFromLifeSimulationState(state)).toThrow(
      "Missing origin fate narrative state for HFO2 age18 conversion"
    );
  });
});
