import { describe, expect, it } from "vitest";

import { getSaveSlotContinuationTarget } from "../../src/app/screens/SaveSlotScreen";
import type { OutgameProfileState } from "../../src/outgame/ProfileState";
import { completeLifeSimulationForProfile, createDefaultProfileForSlot } from "../../src/save/ProfileFactory";

describe("SaveSlotScreen continuation target", () => {
  it("uses profile stage before legacy lifeSimulation status", () => {
    const created = createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 1_000 });
    const lifeSimulation = {
      ...created,
      stage: "life_simulation" as const,
      lifeSimulation: { status: "simulating" as const, ageYears: 0 }
    };
    const completed = completeLifeSimulationForProfile({
      profile: created,
      nowMs: 2_000,
      ageYears: 18,
      characterName: "Lin Wen"
    });

    expect(getSaveSlotContinuationTarget(created)).toBe("character_creation");
    expect(getSaveSlotContinuationTarget(lifeSimulation)).toBe("profile_ready");
    expect(getSaveSlotContinuationTarget(completed)).toBe("profile_ready");
  });

  it("keeps legacy fallback for profiles without stage", () => {
    const created = createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 1_000 });
    const { stage: _createdStage, ...legacySimulating } = created;
    const completed = completeLifeSimulationForProfile({
      profile: created,
      nowMs: 2_000,
      ageYears: 18,
      characterName: "Lin Wen"
    });
    const { stage: _completedStage, ...legacyCompleted } = completed;

    expect(getSaveSlotContinuationTarget(legacySimulating as OutgameProfileState)).toBe("character_creation");
    expect(getSaveSlotContinuationTarget(legacyCompleted as OutgameProfileState)).toBe("profile_ready");
  });
});
