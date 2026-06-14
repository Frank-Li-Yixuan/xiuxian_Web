import { describe, expect, it } from "vitest";

import { CharacterCreationController } from "../../src/character/CharacterCreationController";
import { applyCharacterDraftToProfile } from "../../src/character/CharacterProfileMapper";
import type { CharacterCreationDraft } from "../../src/character/CharacterCreationTypes";
import { cloneOutgameProfile, type OutgameProfileState } from "../../src/outgame/ProfileState";
import { loadOriginFateRegistry } from "../../src/originFate/OriginFateRegistry";
import { loadOriginFateNarrativeRegistry } from "../../src/originFate/OriginFateNarrativeRegistry";
import { createDefaultProfileForSlot } from "../../src/save/ProfileFactory";

describe("MIG-C003B character origin v0.2 profile shape", () => {
  it("confirming a character writes public-safe destiny evaluation results", () => {
    const { draft, origin } = confirmDraft("mig-c003b-destiny-shape");
    const v02Shape = requireV02ProfileShape(origin);
    const main = requireDefined(
      v02Shape.destinyEvaluationResults.find((result) => result.slot === "main"),
      "main destiny evaluation result"
    );

    expect(v02Shape.destinyEvaluationResults).toHaveLength(4);
    expect(main).toMatchObject({
      slot: "main",
      selectedDestinyIds: expect.arrayContaining([
        draft.destinies.main.traitId,
        draft.destinies.secondary[0].traitId,
        draft.destinies.secondary[1].traitId,
        draft.destinies.flaw.traitId
      ]),
      originalDestinyId: expect.any(String),
      finalDestinyId: draft.destinies.main.traitId,
      finalDisplayedDestinyId: draft.destinies.main.traitId,
      publicLabel: draft.destinies.main.name,
      publicDescription: expect.any(String),
      eligibilityResult: expect.objectContaining({
        eligible: expect.any(Boolean),
        supportLevel: expect.any(String),
        reasonTags: expect.any(Array)
      }),
      conflictSynergy: expect.objectContaining({
        synergyTags: expect.any(Array),
        synergyWarnings: expect.any(Array),
        conflictWarnings: expect.any(Array)
      }),
      lifeManifestationHooks: expect.any(Array),
      modeProjectionHooks: expect.any(Object)
    });
    expect(JSON.stringify(main)).not.toContain("trueName");
    expect(JSON.stringify(main)).not.toContain("mutation:source:");
  });

  it("confirming a character writes carried item lifecycle summary", () => {
    const { origin } = confirmDraft("mig-c003b-carried-item-shape");
    const summary = requireDefined(origin.carriedItemLifecycleSummary, "carriedItemLifecycleSummary");
    const item = requireDefined(summary.items[0], "first carried item lifecycle summary");

    expect(summary.items.length).toBeGreaterThan(0);
    expect(item).toMatchObject({
      itemId: expect.any(String),
      name: expect.any(String),
      lifecycleStage: expect.any(String),
      lifecycleText: expect.any(String),
      affinity: expect.any(Number),
      affinityBand: expect.stringMatching(/^(dormant|warm|resonant|bound)$/),
      publicOmenText: expect.any(String),
      lifeEventTags: expect.any(Array),
      age18Hooks: expect.any(Array),
      narrativeChainRefs: expect.any(Array)
    });
    expect(item.publicOmenText.length).toBeGreaterThan(0);
    expect(item.narrativeChainRefs.length).toBeGreaterThan(0);
  });

  it("confirming a character writes deterministic initial life storyline scores", () => {
    const { origin } = confirmDraft("mig-c003b-life-storyline-shape");
    const scores = requireDefined(origin.lifeStorylineInitialScores, "lifeStorylineInitialScores");
    const firstStoryline = requireDefined(scores.storylines[0], "first life storyline score");

    expect(scores.source).toMatch(/character_creation_v02|life_storylines/);
    expect(scores.storylines.length).toBeGreaterThan(0);
    expect(firstStoryline).toMatchObject({
      storylineId: expect.any(String),
      label: expect.any(String),
      score: expect.any(Number),
      status: expect.any(String),
      tags: expect.any(Array)
    });
    expect(scores.debug?.scoreBreakdownByStoryline).toEqual(expect.any(Object));
  });

  it("does not serialize hidden true names or hidden internal ids into public v0.2 profile fields", () => {
    const legacyRegistry = loadOriginFateRegistry();
    const narrativeRegistry = loadOriginFateNarrativeRegistry();
    const { draft, confirmed, origin } = confirmDraft("mig-c003b-leak-scan");
    const v02Shape = requireV02ProfileShape(origin);
    const publicV02Json = JSON.stringify({
      destinyEvaluationResults: v02Shape.destinyEvaluationResults,
      carriedItemLifecycleSummary: v02Shape.carriedItemLifecycleSummary,
      lifeStorylineInitialScores: v02Shape.lifeStorylineInitialScores
    });
    const serializedProfile = JSON.stringify(confirmed);
    const trueNameKeyPaths = findTrueNameKeyPaths(JSON.parse(serializedProfile));

    for (const hiddenFate of legacyRegistry.hiddenFates) {
      expect(serializedProfile).not.toContain(hiddenFate.trueName);
    }
    for (const hiddenFate of narrativeRegistry.hiddenFates) {
      expect(serializedProfile).not.toContain(hiddenFate.trueName);
    }
    expect(trueNameKeyPaths).toEqual([]);
    expect(publicV02Json).not.toContain("hiddenFateInternal");
    expect(publicV02Json).not.toContain(draft.originFate.hiddenFateInternal.hiddenFateId);
  });

  it("keeps the confirmed character creation flow in life_simulation", () => {
    const { confirmed, draft } = confirmDraft("mig-c003b-life-flow");

    expect(confirmed.stage).toBe("life_simulation");
    expect(confirmed.characterOrigin?.characterId).toBe(draft.draftId);
    expect(confirmed.lifeSimulation).toEqual({ status: "simulating", ageYears: 0 });
    expect(confirmed.lifeSimulationState?.characterId).toBe(draft.draftId);
  });

  it("keeps old profile shapes clone-compatible when v0.2 fields are absent", () => {
    const { confirmed, origin } = confirmDraft("mig-c003b-old-profile");
    const oldProfile: OutgameProfileState = {
      ...confirmed,
      characterOrigin: omitV02ProfileFields(origin)
    };

    const loaded = cloneOutgameProfile(JSON.parse(JSON.stringify(oldProfile)) as OutgameProfileState);

    expect(loaded.characterOrigin?.characterId).toBe(confirmed.characterOrigin?.characterId);
    expect(loaded.stage).toBe("life_simulation");
  });

  it("lock and reroll then confirm writes a consistent v0.2 shape", () => {
    const controller = new CharacterCreationController({ seed: "mig-c003b-locked-reroll" });
    const first = controller.generate({ slotId: "slot_1", nowMs: 1_000, name: "Lin Wen" });
    const locked = controller.toggleLock(first, { lockKey: "mainDestiny", nowMs: 1_500 });
    const rerolled = controller.reroll(locked, {
      nowMs: 2_000,
      locks: { mainDestiny: true },
      name: "Lin Wen"
    });
    const origin = confirmExistingDraft(rerolled).origin;
    const v02Shape = requireV02ProfileShape(origin);
    const main = requireDefined(
      v02Shape.destinyEvaluationResults.find((result) => result.slot === "main"),
      "main destiny evaluation result"
    );

    expect(rerolled.locks.mainDestiny).toBe(true);
    expect(main).toMatchObject({
      finalDestinyId: rerolled.destinies.main.traitId,
      finalDisplayedDestinyId: rerolled.destinies.main.traitId
    });
    expect(main?.selectedDestinyIds).toEqual([
      rerolled.destinies.main.traitId,
      rerolled.destinies.secondary[0].traitId,
      rerolled.destinies.secondary[1].traitId,
      rerolled.destinies.flaw.traitId
    ]);
  });

  it("same seed and same locked choices persist the same v0.2 profile shape", () => {
    const first = confirmLockedReroll("mig-c003b-determinism");
    const second = confirmLockedReroll("mig-c003b-determinism");
    const firstShape = requireV02ProfileShape(first.origin);
    const secondShape = requireV02ProfileShape(second.origin);

    expect(firstShape.destinyEvaluationResults).toEqual(secondShape.destinyEvaluationResults);
    expect(firstShape.carriedItemLifecycleSummary).toEqual(secondShape.carriedItemLifecycleSummary);
    expect(firstShape.lifeStorylineInitialScores).toEqual(secondShape.lifeStorylineInitialScores);
  });
});

function requireV02ProfileShape(origin: NonNullable<OutgameProfileState["characterOrigin"]>): {
  readonly destinyEvaluationResults: NonNullable<typeof origin.destinyEvaluationResults>;
  readonly carriedItemLifecycleSummary: NonNullable<typeof origin.carriedItemLifecycleSummary>;
  readonly lifeStorylineInitialScores: NonNullable<typeof origin.lifeStorylineInitialScores>;
} {
  return {
    destinyEvaluationResults: requireDefined(origin.destinyEvaluationResults, "destinyEvaluationResults"),
    carriedItemLifecycleSummary: requireDefined(origin.carriedItemLifecycleSummary, "carriedItemLifecycleSummary"),
    lifeStorylineInitialScores: requireDefined(origin.lifeStorylineInitialScores, "lifeStorylineInitialScores")
  };
}

function omitV02ProfileFields(
  origin: NonNullable<OutgameProfileState["characterOrigin"]>
): NonNullable<OutgameProfileState["characterOrigin"]> {
  const {
    destinyEvaluationResults: _destinyEvaluationResults,
    carriedItemLifecycleSummary: _carriedItemLifecycleSummary,
    lifeStorylineInitialScores: _lifeStorylineInitialScores,
    ...legacyOrigin
  } = origin;
  return legacyOrigin;
}

function confirmDraft(seed: string): {
  readonly draft: CharacterCreationDraft;
  readonly confirmed: OutgameProfileState;
  readonly origin: NonNullable<OutgameProfileState["characterOrigin"]>;
} {
  const controller = new CharacterCreationController({ seed });
  const draft = controller.generate({ slotId: "slot_1", nowMs: 1_000, name: "Lin Wen" });
  return confirmExistingDraft(draft);
}

function confirmLockedReroll(seed: string): {
  readonly draft: CharacterCreationDraft;
  readonly confirmed: OutgameProfileState;
  readonly origin: NonNullable<OutgameProfileState["characterOrigin"]>;
} {
  const controller = new CharacterCreationController({ seed });
  const first = controller.generate({ slotId: "slot_1", nowMs: 1_000, name: "Lin Wen" });
  const locked = controller.toggleLock(first, { lockKey: "mainDestiny", nowMs: 1_500 });
  const rerolled = controller.reroll(locked, {
    nowMs: 2_000,
    locks: { mainDestiny: true },
    name: "Lin Wen"
  });
  return confirmExistingDraft(rerolled);
}

function confirmExistingDraft(draft: CharacterCreationDraft): {
  readonly draft: CharacterCreationDraft;
  readonly confirmed: OutgameProfileState;
  readonly origin: NonNullable<OutgameProfileState["characterOrigin"]>;
} {
  const profile = createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 500 });
  const confirmed = applyCharacterDraftToProfile({ profile, draft, nowMs: 3_000 });
  if (confirmed.characterOrigin === undefined) {
    throw new Error("test expected confirmed character origin");
  }
  return { draft, confirmed, origin: confirmed.characterOrigin };
}

function findTrueNameKeyPaths(value: unknown, path = "$"): string[] {
  if (value === null || typeof value !== "object") {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findTrueNameKeyPaths(item, `${path}[${index}]`));
  }
  return Object.entries(value).flatMap(([key, child]) => {
    const childPath = `${path}.${key}`;
    return [
      ...(key === "trueName" ? [childPath] : []),
      ...findTrueNameKeyPaths(child, childPath)
    ];
  });
}

function requireDefined<T>(value: T | undefined, label: string): T {
  if (value === undefined) {
    throw new Error(`test expected ${label}`);
  }
  return value;
}
