import { describe, expect, it } from "vitest";

import { CharacterDraftGenerator } from "../../src/character/CharacterDraftGenerator";
import { buildCharacterOriginV02ProfileShape } from "../../src/character/CharacterCreationV02Adapter";
import { applyCharacterDraftToProfile } from "../../src/character/CharacterProfileMapper";
import { createInitialLifeSimulationState } from "../../src/lifeSimulation/LifeSimulationInitializer";
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
    const v02ProfileShape = buildCharacterOriginV02ProfileShape(draft);
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
      originFateNarrativeState: draft.originFateNarrativeState,
      background: draft.background,
      hiddenFate: draft.hiddenFate,
      carriedItems: draft.carriedItems,
      destinyEvaluationResults: v02ProfileShape.destinyEvaluationResults,
      carriedItemLifecycleSummary: v02ProfileShape.carriedItemLifecycleSummary,
      lifeStorylineInitialScores: v02ProfileShape.lifeStorylineInitialScores,
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
        originFateNarrativeState: draft.originFateNarrativeState,
        monthlyLogs: []
      })
    );
    expect(loaded?.lifeSimulationState?.hiddenFateProgress[draft.originFate.hiddenFateInternal.hiddenFateId]).toBe(
      draft.originFate.hiddenFateInternal.progress
    );
    for (const item of draft.originFate.carriedItems) {
      expect(loaded?.lifeSimulationState?.carriedItemAffinity[item.itemId]).toBe(0);
    }
    expect(loaded?.lifeSimulationState?.lifeStorylineState).toEqual(
      expect.objectContaining({
        storylineScores: expect.any(Array),
        downstreamActiveStorylineIds: expect.any(Array),
        eventThreads: expect.any(Array),
        threadSummaries: expect.any(Array),
        recentHooks: [],
        recentStorylineHooks: [],
        interludeCandidateSeeds: [],
        stageTransitionSignals: []
      })
    );
    const lifeStorylineState = loaded?.lifeSimulationState?.lifeStorylineState;
    expect(lifeStorylineState?.storylineScores.length).toBeGreaterThan(0);
    expect(lifeStorylineState?.downstreamActiveStorylineIds.length).toBeGreaterThanOrEqual(1);
    expect(lifeStorylineState?.downstreamActiveStorylineIds.length).toBeLessThanOrEqual(3);
    expect(lifeStorylineState?.eventThreads.length).toBeGreaterThan(0);
    expect(lifeStorylineState?.eventThreads.every((thread) =>
      lifeStorylineState.downstreamActiveStorylineIds.includes(thread.storylineId)
    )).toBe(true);
    expect(JSON.stringify(lifeStorylineState)).not.toMatch(/trueName(?!Revealed)|true_name|truename|hiddenFateInternal/i);
    expect(loaded?.realm).toEqual(profile.realm);
  });

  it("initializes a deterministic fallback life storyline state for old profile origins", () => {
    const profile = createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 1_000, saveName: "Legacy Origin" });
    const draft = new CharacterDraftGenerator({ seed: "profile-mapper-legacy-lst" }).generate({
      slotId: "slot_1",
      nowMs: 1_500,
      name: "Lin Wen"
    });
    const confirmed = applyCharacterDraftToProfile({ profile, draft, nowMs: 2_000 });
    if (confirmed.characterOrigin === undefined) {
      throw new Error("test expected character origin");
    }
    const {
      destinyEvaluationResults: _destinyEvaluationResults,
      carriedItemLifecycleSummary: _carriedItemLifecycleSummary,
      lifeStorylineInitialScores: _lifeStorylineInitialScores,
      ...legacyOrigin
    } = confirmed.characterOrigin;

    const state = createInitialLifeSimulationState(
      profile,
      legacyOrigin,
      "legacy_profile_fallback_seed"
    );

    expect(state.lifeStorylineState).toEqual(expect.objectContaining({
      storylineScores: expect.any(Array),
      downstreamActiveStorylineIds: expect.any(Array),
      eventThreads: expect.any(Array)
    }));
    expect(state.lifeStorylineState?.debug?.source).toBe("legacy_profile_fallback");
    expect(state.lifeStorylineState?.downstreamActiveStorylineIds.length).toBeGreaterThanOrEqual(1);
    expect(state.lifeStorylineState?.downstreamActiveStorylineIds.length).toBeLessThanOrEqual(3);
    expect(JSON.stringify(state.lifeStorylineState)).not.toMatch(/trueName(?!Revealed)|true_name|truename|hiddenFateInternal/i);
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
