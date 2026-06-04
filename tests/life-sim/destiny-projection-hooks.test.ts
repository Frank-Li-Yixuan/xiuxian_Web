import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  getLifeSimDestinyModifiers,
  getModeDestinyModifiers,
  getOuterBattlefieldDestinyModifiers
} from "../../src/lifeSimulation/DestinyProjectionHooks";
import { loadDestinyRegistry } from "../../src/characterCreation/destiny/DestinyRegistry";
import { createDefaultProfileForSlot } from "../../src/save/ProfileFactory";
import type { OutgameProfileState } from "../../src/outgame/ProfileState";
import type {
  CharacterCreationDraft,
  CharacterOriginState,
  DestinySelectionState,
  DestinyTraitState
} from "../../src/character/CharacterCreationTypes";

describe("DestinyProjectionHooks", () => {
  it("projects heaven jealous talent into life-sim study, insight, lifespan, and tribulation modifiers", () => {
    const draft = makeDraft(["destiny_heaven_jealous_talent"]);

    const modifiers = getLifeSimDestinyModifiers(draft);

    expect(modifiers.traitIds).toContain("destiny_heaven_jealous_talent");
    expect(modifiers.studyGainMultiplier).toBe(4);
    expect(modifiers.insightGainMultiplier).toBe(4);
    expect(modifiers.lifespanMultiplier).toBe(0.3);
    expect(modifiers.tribulationPowerDelta).toBe(2);
  });

  it("projects turtle supreme into idle cultivation and outer battlefield survival modifiers", () => {
    const profile = makeProfile(["destiny_turtle_supreme"]);

    const life = getLifeSimDestinyModifiers(profile);
    const mode = getOuterBattlefieldDestinyModifiers(profile);

    expect(life.idleGainPerStack).toBe(0.3);
    expect(life.hiddenCultivationMaxStacks).toBe(10);
    expect(life.rawNumericModifiers.combatKillRewardMultiplier).toBe(0.8);
    expect(mode.outerBattlefieldModifiers).toEqual(
      expect.arrayContaining(["modifier_goudao_survival_shield", "modifier_active_spell_damage_minor_down"])
    );
  });

  it("projects waste root defiant into early cultivation, reversal tokens, and near-death battlefield hook", () => {
    const profile = makeProfile(["destiny_waste_root_defiant"]);

    const life = getLifeSimDestinyModifiers(profile);
    const mode = getOuterBattlefieldDestinyModifiers(profile);

    expect(life.earlyCultivationMultiplier).toBe(0.5);
    expect(life.failureTokenGain).toBe(1);
    expect(mode.outerBattlefieldModifiers).toEqual(
      expect.arrayContaining(["modifier_starting_stat_minor_down", "modifier_first_near_death_reversal"])
    );
  });

  it("projects alchemy prodigy into alchemy, dan toxin, pill loadout, and pill digest modifiers", () => {
    const profile = makeProfile(["destiny_alchemy_prodigy"]);

    const life = getLifeSimDestinyModifiers(profile);
    const mode = getOuterBattlefieldDestinyModifiers(profile);

    expect(life.alchemyGainMultiplier).toBe(1.8);
    expect(life.alchemySuccessBonus).toBe(0.2);
    expect(life.danToxinGainMultiplier).toBe(0.75);
    expect(mode.outerBattlefieldLoadout).toContain("pill_rejuvenation");
    expect(mode.outerBattlefieldModifiers).toContain("modifier_pill_digest_speed_minor");
  });

  it("returns the same life-sim modifiers from draft and confirmed profile sources", () => {
    const draft = makeDraft(["destiny_heaven_jealous_talent", "destiny_alchemy_prodigy"]);
    const profile = makeProfile(["destiny_heaven_jealous_talent", "destiny_alchemy_prodigy"]);

    expect(getLifeSimDestinyModifiers(profile)).toEqual(getLifeSimDestinyModifiers(draft));
  });

  it("uses the same outer battlefield projection for normal and intro battlefield modes", () => {
    const profile = makeProfile(["destiny_heaven_jealous_talent", "destiny_thunder_affinity"]);

    const outer = getModeDestinyModifiers(profile, "outer_battlefield");
    const intro = getModeDestinyModifiers(profile, "outer_battlefield_intro");

    expect(intro.outerBattlefieldModifiers).toEqual(outer.outerBattlefieldModifiers);
    expect(intro.outerBattlefieldLoadout).toEqual(outer.outerBattlefieldLoadout);
    expect(outer.synergyProjectionIds).toContain("syn_heaven_thunder");
  });

  it("returns empty default modifiers when a profile has no confirmed character origin", () => {
    const profile = createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 1_000 });

    expect(getLifeSimDestinyModifiers(profile)).toMatchObject({
      traitIds: [],
      studyGainMultiplier: 1,
      insightGainMultiplier: 1,
      lifespanMultiplier: 1,
      tribulationPowerDelta: 0
    });
    expect(getOuterBattlefieldDestinyModifiers(profile)).toMatchObject({
      traitIds: [],
      outerBattlefieldModifiers: [],
      outerBattlefieldLoadout: []
    });
  });

  it("keeps destiny projection data aligned with current registry ids", () => {
    const projectionSource = readFileSync("data/age18/destiny_projection_rules.v0.1.json", "utf8");
    const projectionData = JSON.parse(projectionSource) as {
      readonly projections: Readonly<Record<string, unknown>>;
      readonly synergyProjections: Readonly<Record<string, { readonly requires: readonly string[] }>>;
    };
    const registry = loadDestinyRegistry();

    expect(projectionSource).not.toContain("destiny_supreme_goudao");
    expect(projectionSource).not.toContain("destiny_waste_root_reversal");
    expect(projectionSource).not.toContain("destiny_alchemy_genius");
    expect(projectionSource).not.toContain("destiny_clear_glass_heart");
    expect(projectionSource).not.toContain("destiny_lifespan_borrowing");
    for (const traitId of Object.keys(projectionData.projections)) {
      expect(registry.getTrait(traitId).id).toBe(traitId);
    }
    for (const projection of Object.values(projectionData.synergyProjections)) {
      for (const traitId of projection.requires) {
        expect(registry.getTrait(traitId).id).toBe(traitId);
      }
    }
  });

  it("does not depend on UI, render, audio, sim, or Math.random", () => {
    const source = readFileSync("src/lifeSimulation/DestinyProjectionHooks.ts", "utf8");

    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("../sim/");
    expect(source).not.toContain("../app/");
    expect(source).not.toContain("../ui/");
    expect(source).not.toContain("../render/");
    expect(source).not.toContain("../audio/");
  });
});

function makeDraft(traitIds: readonly string[]): CharacterCreationDraft {
  return {
    draftId: "draft_dt_c005",
    slotId: "slot_dt_c005",
    name: "DT C005",
    appearance: {
      templateId: "test",
      genderPresentation: "androgynous",
      temperament: "calm",
      robeColor: "ink"
    },
    coreStats: { jing: 50, qi: 50, shen: 50 },
    aptitude: { rootBone: 50, comprehension: 50, inspiration: 50, fortune: 50, heart: 50, lifespan: 50 },
    spiritualRoot: {
      rootId: "root_test",
      displayName: "root_test",
      elements: [],
      rarity: "common",
      tags: []
    },
    openingInnateDraft: undefined as unknown as CharacterCreationDraft["openingInnateDraft"],
    destinies: makeDestinies(traitIds),
    originFate: undefined as unknown as CharacterCreationDraft["originFate"],
    background: undefined as unknown as CharacterCreationDraft["background"],
    hiddenFate: undefined as unknown as CharacterCreationDraft["hiddenFate"],
    carriedItems: [],
    locks: {
      spiritualRoot: false,
      mainDestiny: false,
      secondaryDestiny0: false,
      secondaryDestiny1: false,
      flawDestiny: false,
      background: false,
      hiddenFate: false,
      carriedItems: false
    },
    attributeLock: false,
    spiritualRootLock: false,
    rerollCount: 0,
    divinationTokens: 0,
    createdAtMs: 1_000,
    updatedAtMs: 1_000
  };
}

function makeProfile(traitIds: readonly string[]): OutgameProfileState {
  const profile = createDefaultProfileForSlot({ slotId: "slot_1", nowMs: 1_000 });
  return {
    ...profile,
    characterOrigin: {
      characterId: "character_dt_c005",
      name: "DT C005",
      appearance: {
        templateId: "test",
        genderPresentation: "androgynous",
        temperament: "calm",
        robeColor: "ink"
      },
      coreStats: { jing: 50, qi: 50, shen: 50 },
      aptitude: { rootBone: 50, comprehension: 50, inspiration: 50, fortune: 50, heart: 50, lifespan: 50 },
      spiritualRoot: {
        rootId: "root_test",
        displayName: "root_test",
        elements: [],
        rarity: "common",
        tags: []
      },
      openingInnateDraft: undefined as unknown as CharacterOriginState["openingInnateDraft"],
      destinies: makeDestinies(traitIds),
      originFate: undefined as unknown as CharacterOriginState["originFate"],
      background: undefined as unknown as CharacterOriginState["background"],
      hiddenFate: undefined as unknown as CharacterOriginState["hiddenFate"],
      carriedItems: [],
      attributeLock: false,
      spiritualRootLock: false,
      confirmedAtMs: 1_000
    }
  };
}

function makeDestinies(traitIds: readonly string[]): DestinySelectionState {
  const [main = "destiny_heaven_jealous_talent", secondary0 = "destiny_early_wisdom", secondary1 = "destiny_good_memory"] = traitIds;
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
