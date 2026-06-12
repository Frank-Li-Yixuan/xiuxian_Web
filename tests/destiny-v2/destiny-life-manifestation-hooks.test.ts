import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  getDestinyLifeManifestationHooksForAge,
  getLifeManifestationPhaseForAgeMonths,
  projectDestinyLifeManifestationHooks
} from "../../src/destinyV2/DestinyLifeManifestationHooks";
import type { DestinySelectionState, DestinyTraitState } from "../../src/character/CharacterCreationTypes";

describe("DestinyLifeManifestationHooks", () => {
  it("projects heaven-jealous talent hooks and filters them by age phase", () => {
    const selection = makeSelection([
      "destiny_heaven_jealous_talent",
      "destiny_heaven_jealous_talent",
      "destiny_small_merit"
    ]);

    const projection = projectDestinyLifeManifestationHooks(selection);

    expect(projection.traitIds).toEqual([
      "destiny_heaven_jealous_talent",
      "destiny_small_merit",
      "flaw_weak_body"
    ]);
    expect(projection.hooks.map((hook) => hook.hook)).toEqual(
      expect.arrayContaining(["early_speech_or_scripture", "fever_after_insight"])
    );
    expect(projection.hooksByPhase.infant_0_3.map((hook) => hook.hook)).toEqual(["early_speech_or_scripture"]);
    expect(projection.hooksByPhase.child_4_8.map((hook) => hook.hook)).toEqual(["fever_after_insight"]);
    expect(projection.missingManifestationTraitIds).toEqual(["destiny_small_merit", "flaw_weak_body"]);

    expect(getDestinyLifeManifestationHooksForAge(selection, 24).hooks.map((hook) => hook.hook)).toEqual([
      "early_speech_or_scripture"
    ]);
    expect(getDestinyLifeManifestationHooksForAge(selection, 60).hooks.map((hook) => hook.hook)).toEqual([
      "fever_after_insight"
    ]);
  });

  it("projects cowardly, waste-root, and demon hooks as structured non-numeric hooks", () => {
    const projection = projectDestinyLifeManifestationHooks(
      makeSelection(["destiny_cowardly_supreme", "destiny_waste_root_reversal", "destiny_demon_seed"])
    );
    const hookIds = projection.hooks.map((hook) => hook.hook);

    expect(hookIds).toEqual(
      expect.arrayContaining([
        "hides_from_disaster",
        "seclusion_choice_boost",
        "first_failed_breathing",
        "chain_break_in_body",
        "forbidden_word_dream",
        "shrine_shadow_bargain"
      ])
    );
    expect(projection.hooks.every((hook) => typeof hook.visible === "string" && hook.visible.length > 0)).toBe(true);
    expect(JSON.stringify(projection)).not.toContain("Multiplier");
    expect(JSON.stringify(projection)).not.toContain("modifier_");
  });

  it("maps age months to manifestation phases and rejects invalid ages", () => {
    expect(getLifeManifestationPhaseForAgeMonths(0)).toBe("infant_0_3");
    expect(getLifeManifestationPhaseForAgeMonths(47)).toBe("infant_0_3");
    expect(getLifeManifestationPhaseForAgeMonths(48)).toBe("child_4_8");
    expect(getLifeManifestationPhaseForAgeMonths(107)).toBe("child_4_8");
    expect(getLifeManifestationPhaseForAgeMonths(108)).toBe("juvenile_9_13");
    expect(getLifeManifestationPhaseForAgeMonths(167)).toBe("juvenile_9_13");
    expect(getLifeManifestationPhaseForAgeMonths(168)).toBe("youth_14_17");
    expect(getLifeManifestationPhaseForAgeMonths(215)).toBe("youth_14_17");
    expect(getLifeManifestationPhaseForAgeMonths(216)).toBe("adult_18");

    expect(() => getLifeManifestationPhaseForAgeMonths(-1)).toThrow(
      "ageMonths must be a non-negative integer"
    );
    expect(() => getLifeManifestationPhaseForAgeMonths(1.5)).toThrow(
      "ageMonths must be a non-negative integer"
    );
  });

  it("records mutation-card missing manifestations without borrowing source hooks", () => {
    const projection = projectDestinyLifeManifestationHooks(
      makeSelection(["destiny_false_heavenly_burden", "destiny_hidden_killer", "destiny_pure_lotus_shadow"])
    );

    expect(projection.hooks).toEqual([]);
    expect(projection.missingManifestationTraitIds).toEqual([
      "destiny_false_heavenly_burden",
      "destiny_hidden_killer",
      "destiny_pure_lotus_shadow",
      "flaw_weak_body"
    ]);
  });

  it("does not mutate input, returns frozen output, and avoids side-effect APIs or hidden names", () => {
    const selection = makeSelection(["destiny_demon_seed"]);
    const before = structuredClone(selection);

    const first = projectDestinyLifeManifestationHooks(selection);
    const second = projectDestinyLifeManifestationHooks(selection);

    expect(selection).toEqual(before);
    expect(second).toEqual(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.hooks)).toBe(true);
    expect(Object.isFrozen(first.hooks[0])).toBe(true);
    expect(JSON.stringify(first)).not.toContain("trueName");
    expect(JSON.stringify(first)).not.toContain("hiddenInternal");

    const source = readFileSync("src/destinyV2/DestinyLifeManifestationHooks.ts", "utf8");
    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("performance.now");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("trueName");
  });
});

function makeSelection(traitIds: readonly string[]): DestinySelectionState {
  const [
    main = "destiny_heaven_jealous_talent",
    secondary0 = "destiny_cowardly_supreme",
    secondary1 = "destiny_waste_root_reversal"
  ] = traitIds;
  return {
    main: makeTrait(main),
    secondary: [makeTrait(secondary0), makeTrait(secondary1)],
    flaw: makeTrait("flaw_weak_body"),
    synergies: [],
    softConflicts: [],
    synergyWarnings: [],
    conflictWarnings: [],
    warnings: []
  };
}

function makeTrait(traitId: string): DestinyTraitState {
  return {
    traitId,
    name: traitId,
    rarity: traitId.startsWith("flaw_") ? "flaw" : "rare",
    tags: [],
    positiveEffects: [],
    negativeEffects: []
  };
}
