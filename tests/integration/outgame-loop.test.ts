import { describe, expect, it } from "vitest";

import {
  applyRunSettlementReceipt,
  cloneOutgameProfile,
  type OutgameProfileState
} from "../../src/outgame/ProfileState";
import { claimIdleYield, type IdleYieldConfig } from "../../src/outgame/IdleYieldSystem";
import { craftAlchemyRecipe, type AlchemyRecipePack } from "../../src/outgame/AlchemySystem";
import {
  upgradeArtifactStar,
  type ArtifactProgressionPack
} from "../../src/outgame/ArtifactProgressionSystem";
import {
  trainMethod,
  upgradeSpellMastery,
  type CultivationMethodPack,
  type SpellCompendiumPack
} from "../../src/outgame/CultivationTrainingSystem";
import defaultProfileData from "../../data/outgame/default_profile.v0.1.json";
import sampleReceiptData from "../../data/outgame/sample_settlement_receipt_stage01_clear.v0.1.json";
import idleYieldData from "../../data/outgame/idle_yield.v0.1.json";
import alchemyRecipeData from "../../data/outgame/alchemy_recipes.v0.1.json";
import artifactProgressionData from "../../data/outgame/artifact_progression.v0.1.json";
import cultivationMethodData from "../../data/outgame/cultivation_methods.v0.1.json";
import spellCompendiumData from "../../data/outgame/spell_compendium.v0.1.json";
import type { RunSettlementReceipt } from "../../src/sim/settlement/RunSettlement";

const DEFAULT_PROFILE = defaultProfileData as unknown as OutgameProfileState;
const SAMPLE_RECEIPT = sampleReceiptData as unknown as RunSettlementReceipt;
const IDLE_YIELD = idleYieldData as unknown as IdleYieldConfig;
const ALCHEMY_RECIPES = alchemyRecipeData as unknown as AlchemyRecipePack;
const ARTIFACT_PROGRESSION = artifactProgressionData as unknown as ArtifactProgressionPack;
const CULTIVATION_METHODS = cultivationMethodData as unknown as CultivationMethodPack;
const SPELL_COMPENDIUM = spellCompendiumData as unknown as SpellCompendiumPack;

describe("Outgame profile and module loop", () => {
  it("applies a run settlement receipt once and keeps receipt replay idempotent", () => {
    const profile = cloneOutgameProfile(DEFAULT_PROFILE);
    const before = structuredClone(profile);

    const applied = applyRunSettlementReceipt({ profile, receipt: SAMPLE_RECEIPT });
    const replayed = applyRunSettlementReceipt({ profile: applied.profile, receipt: SAMPLE_RECEIPT });

    expect(profile).toEqual(before);
    expect(applied.applied).toBe(true);
    expect(replayed.applied).toBe(false);
    expect(replayed.profile).toEqual(applied.profile);
    expect(applied.profile.appliedReceiptIds).toEqual(["debug_receipt_stage01_clear_001"]);
    expect(applied.profile.flags.firstStageCleared).toBe(true);
    expect(applied.profile.wallet).toEqual(
      expect.objectContaining({
        spirit_stone_low: 500,
        qingling_herb: 28,
        clear_mind_grass: 5,
        black_iron_essence: 17,
        demon_core_small: 12,
        spirit_jade: 2,
        thunder_marow: 1,
        jade_slip_fragment: 3,
        spirit_vein_seed: 1,
        spell_page_thunder: 1
      })
    );
  });

  it("claims spirit gathering idle yield without producing insight experience", () => {
    const profile = cloneOutgameProfile(DEFAULT_PROFILE);

    const result = claimIdleYield({
      profile,
      idleYield: IDLE_YIELD,
      nowMs: 60 * 60 * 1000,
      eventRoll: 0.99
    });

    expect(result.claim).toEqual({
      elapsedMinutes: 60,
      cappedMinutes: 60,
      rewards: { spirit_stone_low: 48 },
      cultivationGain: 72,
      eventIds: [],
      newLastClaimAtMs: 60 * 60 * 1000
    });
    expect(result.profile.wallet.spirit_stone_low).toBe(168);
    expect(result.profile.realm.cultivation).toBe(72);
    expect(result.profile.idle.lastClaimAtMs).toBe(60 * 60 * 1000);
    expect(result.profile.wallet).not.toHaveProperty("insight_exp");
  });

  it("crafts a rejuvenation pill, upgrades Qingshuang Sword, and trains method plus spell mastery", () => {
    const settled = applyRunSettlementReceipt({
      profile: cloneOutgameProfile(DEFAULT_PROFILE),
      receipt: SAMPLE_RECEIPT
    }).profile;
    const claimed = claimIdleYield({
      profile: settled,
      idleYield: IDLE_YIELD,
      nowMs: 60 * 60 * 1000,
      eventRoll: 0.99
    }).profile;

    const crafted = craftAlchemyRecipe({
      profile: claimed,
      recipes: ALCHEMY_RECIPES,
      recipeId: "recipe_rejuvenation_pill"
    });
    expect(crafted.profile.pills.rejuvenation_pill).toBe(2);
    expect(crafted.profile.wallet.qingling_herb).toBe(25);
    expect(crafted.profile.wallet.demon_core_small).toBe(11);
    expect(crafted.profile.wallet.spirit_stone_low).toBe(528);

    const forged = upgradeArtifactStar({
      profile: crafted.profile,
      progression: ARTIFACT_PROGRESSION,
      artifactId: "artifact_qingshuang_sword"
    });
    expect(forged.profile.artifacts.artifact_qingshuang_sword).toEqual({ unlocked: true, star: 2 });
    expect(forged.profile.wallet.spirit_stone_low).toBe(368);
    expect(forged.profile.wallet.black_iron_essence).toBe(9);
    expect(forged.profile.wallet.demon_core_small).toBe(8);

    const trained = trainMethod({
      profile: {
        ...forged.profile,
        methods: {
          ...forged.profile.methods,
          method_sharp_metal: {
            unlocked: true,
            level: 1,
            trainingProgress: 200
          }
        }
      },
      methods: CULTIVATION_METHODS,
      methodId: "method_sharp_metal",
      trainingPower: 10
    });
    expect(trained.profile.methods.method_sharp_metal).toEqual({
      unlocked: true,
      level: 2,
      trainingProgress: 0
    });
    expect(trained.profile.wallet.spirit_stone_low).toBe(258);

    const mastered = upgradeSpellMastery({
      profile: trained.profile,
      compendium: SPELL_COMPENDIUM,
      spellId: "spell_five_thunder"
    });
    expect(mastered.profile.spells.spell_five_thunder).toEqual({ unlocked: true, masteryLevel: 2 });
    expect(mastered.profile.wallet.spirit_stone_low).toBe(18);
    expect(mastered.profile.wallet.thunder_marow).toBe(0);
  });
});
