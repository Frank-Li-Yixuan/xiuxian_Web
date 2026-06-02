import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  calculateAge18HiddenFateRevealChance,
  resolveAge18OriginFate
} from "../../src/originFate/Age18OriginFateResolver";
import { DefaultOriginFateGenerator } from "../../src/originFate/OriginFateGenerator";
import { SeededRng } from "../../src/sim/core/SeededRng";
import type { OriginFateDraft } from "../../src/types/origin-fate-types.v0.1";

describe("Age18OriginFateResolver", () => {
  it("converts apothecary bronze furnace into alchemy and rejuvenation-pill hooks", () => {
    const originFate = originFateWith({
      seed: "hfo-c007-bronze-furnace",
      backgroundOriginId: "origin_apothecary_apprentice",
      hiddenFateId: "hidden_pill_saint_remains",
      carriedItemIds: ["item_apothecary_bronze_furnace"]
    });

    const resolution = resolveAge18OriginFate(originFate, {}, new SeededRng("hfo-c007-furnace", "age18_test"));

    expect(resolution.convertedItems).toEqual([
      expect.objectContaining({
        itemId: "item_apothecary_bronze_furnace",
        conversionType: "dongfu_building_bonus"
      })
    ]);
    expect(resolution.convertedItems[0]?.label).toContain("炉");
    expect(resolution.convertedItems[0]?.outerBattlefieldEffect).toMatch(/回春丹|丹药|pill|rejuvenation/u);
    expect(resolution.outerBattlefieldModifiers.join("\n")).toMatch(/回春丹|丹药|pill|rejuvenation/u);
    expect(resolution.dongfuHooks).toContain("alchemy_room_initial_fire_control_bonus");
    expect(resolution.longTermTags).toEqual(expect.arrayContaining(["conversion:dongfu_building_bonus", "carriedItem:item_apothecary_bronze_furnace"]));
  });

  it("converts broken wooden sword into flying-sword and sword-soul clues", () => {
    const originFate = originFateWith({
      seed: "hfo-c007-wooden-sword",
      backgroundOriginId: "origin_fallen_cultivator_descendant",
      hiddenFateId: "hidden_past_life_sword_soul",
      carriedItemIds: ["origin_item_broken_wooden_sword"]
    });

    const resolution = resolveAge18OriginFate(originFate, {}, new SeededRng("hfo-c007-wooden-sword", "age18_test"));

    expect(resolution.convertedItems[0]).toEqual(
      expect.objectContaining({
        itemId: "origin_item_broken_wooden_sword",
        conversionType: "artifact_clue"
      })
    );
    expect(resolution.convertedItems[0]?.label).toMatch(/飞剑|sword/i);
    expect(resolution.outerBattlefieldModifiers.join("\n")).toMatch(/飞剑|剑意|sword/i);
    expect(resolution.dongfuHooks).toContain("artifact_warming_sword_clue");
    expect(resolution.longTermTags).toEqual(expect.arrayContaining(["conversion:artifact_clue", "carriedItem:origin_item_broken_wooden_sword"]));
  });

  it("converts ancestral jade into shield or spirit-treasure fragment clues", () => {
    const originFate = originFateWith({
      seed: "hfo-c007-jade",
      backgroundOriginId: "origin_fallen_cultivator_descendant",
      hiddenFateId: "hidden_merit_seed",
      carriedItemIds: ["origin_item_ancestral_jade"]
    });

    const resolution = resolveAge18OriginFate(originFate, {}, new SeededRng("hfo-c007-jade", "age18_test"));

    expect(resolution.convertedItems[0]).toEqual(
      expect.objectContaining({
        itemId: "origin_item_ancestral_jade",
        conversionType: "treasure_fragment"
      })
    );
    expect(resolution.outerBattlefieldModifiers.join("\n")).toMatch(/护盾|护命|protect|shield|treasure/i);
    expect(resolution.dongfuHooks).toContain("unlock_jade_treasure_repair");
    expect(resolution.longTermTags).toEqual(expect.arrayContaining(["conversion:treasure_fragment", "carriedItem:origin_item_ancestral_jade"]));
  });

  it("reveals high-progress hidden fate and includes threshold effects and dongfu hooks", () => {
    const originFate = withHiddenProgress(
      originFateWith({
        seed: "hfo-c007-high-thunder",
        backgroundOriginId: "origin_mountain_orphan",
        hiddenFateId: "hidden_ancient_thunder_blood",
        carriedItemIds: ["origin_item_old_talisman"]
      }),
      100
    );

    const resolution = resolveAge18OriginFate(originFate, {}, new SeededRng("hfo-c007-high-thunder", "age18_test"));

    expect(resolution.revealedHiddenFate).toEqual(
      expect.objectContaining({
        hiddenFateId: "hidden_ancient_thunder_blood",
        trueName: expect.any(String),
        category: "bloodline",
        progress: 100
      })
    );
    expect(resolution.revealedHiddenFate?.trueName.length).toBeGreaterThan(0);
    expect(resolution.revealedHiddenFate?.effects.length).toBeGreaterThan(0);
    expect(resolution.dongfuHooks).toEqual(expect.arrayContaining(["unlock_thunder_pool_clue", "increase_tribulation_reward"]));
    expect(resolution.longTermTags).toEqual(expect.arrayContaining(["hiddenFate:revealed", "hiddenFate:hidden_ancient_thunder_blood"]));
  });

  it("calculates higher reveal chance for higher hidden-fate progress", () => {
    const base = originFateWith({
      seed: "hfo-c007-chance",
      backgroundOriginId: "origin_mountain_orphan",
      hiddenFateId: "hidden_ancient_thunder_blood",
      carriedItemIds: ["origin_item_old_talisman"]
    });

    const low = calculateAge18HiddenFateRevealChance(withHiddenProgress(base, 20), {});
    const suspicious = calculateAge18HiddenFateRevealChance(withHiddenProgress(base, 40), {});
    const high = calculateAge18HiddenFateRevealChance(withHiddenProgress(base, 72), {});
    const awakened = calculateAge18HiddenFateRevealChance(withHiddenProgress(base, 100), {});

    expect(suspicious.chance).toBeGreaterThan(low.chance);
    expect(high.chance).toBeGreaterThan(suspicious.chance);
    expect(awakened.chance).toBe(1);
    expect(high.bandId).toBe("halfAwakened");
  });

  it("applies life summary modifiers for inspiration, fortune, destiny, carried item, and curse-seal heart risk", () => {
    const curse = withHiddenProgress(
      originFateWith({
        seed: "hfo-c007-modifiers",
        backgroundOriginId: "origin_refugee_orphan",
        hiddenFateId: "hidden_demon_mark",
        carriedItemIds: ["item_black_bone_flute"]
      }),
      72
    );

    const base = calculateAge18HiddenFateRevealChance(curse, {});
    const boosted = calculateAge18HiddenFateRevealChance(curse, {
      aptitude: {
        inspiration: 95,
        fortune: 92,
        heart: 20
      },
      destinyTags: ["demon", "heart_demon"],
      carriedItemTags: ["demon_mark", "item_black_bone_flute"]
    });

    expect(boosted.chance).toBeGreaterThan(base.chance);
    expect(boosted.chance).toBe(1);
    expect(boosted.appliedModifiers).toEqual(
      expect.arrayContaining(["inspiration >= 90", "fortune >= 90", "matchingDestinyTag", "matchingCarriedItem"])
    );
    expect(boosted.appliedModifiers.join("\n")).toContain("curseSeal");
  });

  it("does not use Math.random in the age18 origin fate resolver", () => {
    const source = readFileSync("src/originFate/Age18OriginFateResolver.ts", "utf8");

    expect(source).not.toContain("Math.random");
  });
});

function originFateWith(options: {
  readonly seed: string;
  readonly backgroundOriginId: string;
  readonly hiddenFateId: string;
  readonly carriedItemIds: readonly string[];
}): OriginFateDraft {
  const generator = new DefaultOriginFateGenerator();
  return generator.generate({
    seed: options.seed,
    draftId: `${options.seed}-draft`,
    rerollIndex: 0,
    openingTags: [],
    destinyTags: [],
    spiritualRootTags: [],
    aptitudeTags: [],
    locks: {
      backgroundOriginId: options.backgroundOriginId,
      hiddenFateId: options.hiddenFateId,
      carriedItemIds: options.carriedItemIds
    }
  });
}

function withHiddenProgress(draft: OriginFateDraft, progress: number): OriginFateDraft {
  return {
    ...draft,
    hiddenFateInternal: {
      ...draft.hiddenFateInternal,
      progress,
      progressBand: progress >= 100 ? "awakened" : progress >= 70 ? "nearAwakened" : progress >= 30 ? "stirring" : "faint"
    }
  };
}
