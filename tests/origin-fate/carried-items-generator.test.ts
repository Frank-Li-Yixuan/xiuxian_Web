import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { generateBackgroundOrigin } from "../../src/originFate/BackgroundOriginGenerator";
import { generateCarriedItems } from "../../src/originFate/CarriedItemsGenerator";
import { generateHiddenFate } from "../../src/originFate/HiddenFateGenerator";
import { loadOriginFateRegistry } from "../../src/originFate/OriginFateRegistry";
import { SeededRng } from "../../src/sim/core/SeededRng";
import type {
  BackgroundOriginResult,
  HiddenFateResultInternal,
  OriginFateGenerationContext
} from "../../src/types/origin-fate-types.v0.1";

describe("CarriedItemsGenerator", () => {
  it("generates reproducible carried items with conversion previews and no duplicates", () => {
    const registry = loadOriginFateRegistry();
    const context = contextWithTags({
      seed: "hfo-c004-seed",
      openingTags: ["lifeEvent:ancestral_relic"],
      destinyTags: ["destiny_sword_bone"],
      spiritualRootTags: ["root:metal"],
      aptitudeTags: ["aptitude:fortune_high"]
    });
    const background = backgroundFor(context, "origin_fallen_cultivator_descendant");
    const hiddenFate = hiddenFateFor(context, background, "hidden_past_life_sword_soul");

    const first = generateCarriedItems(context, background, hiddenFate, registry, new SeededRng(`${context.seed}:items`, "test"));
    const second = generateCarriedItems(context, background, hiddenFate, registry, new SeededRng(`${context.seed}:items`, "test"));

    expect(second).toEqual(first);
    expect(first.items.length).toBeGreaterThanOrEqual(registry.generationRules.carriedItems.minCount);
    expect(first.items.length).toBeLessThanOrEqual(registry.generationRules.carriedItems.maxCount);
    expect(new Set(first.items.map((item) => item.itemId)).size).toBe(first.items.length);
    expect(first.items[0]?.conversion.label.length).toBeGreaterThan(0);
    expect(first.items[0]?.conversion.outerBattlefieldEffect.length).toBeGreaterThan(0);
    expect(first.items[0]?.conversion.dongfuHook.length).toBeGreaterThan(0);
    expect(first.debug.candidateWeights).toHaveLength(registry.carriedItems.length);
  });

  it("uses locked carried items directly across rerolls", () => {
    const registry = loadOriginFateRegistry();
    const context = contextWithTags({
      seed: "hfo-c004-lock",
      rerollIndex: 3,
      locks: {
        carriedItemIds: ["origin_item_ancestral_jade", "origin_item_wordless_page"]
      }
    });
    const background = backgroundFor(context, "origin_mountain_orphan");
    const hiddenFate = hiddenFateFor(context, background, "hidden_merit_seed");

    const result = generateCarriedItems(context, background, hiddenFate, registry, new SeededRng("lock-items", "test"));

    expect(result.items.map((item) => item.itemId)).toEqual(["origin_item_ancestral_jade", "origin_item_wordless_page"]);
    expect(result.items.every((item) => item.matchedTags.includes("lock:carriedItemIds"))).toBe(true);
    expect(result.debug.candidateWeights).toHaveLength(2);
  });

  it("raises fallen cultivator descendant items: wooden sword, wordless page, and ancestral jade", () => {
    const registry = loadOriginFateRegistry();
    const neutralContext = contextWithTags({ seed: "neutral-fallen-items" });
    const biasedContext = contextWithTags({
      seed: "biased-fallen-items",
      openingTags: ["lifeEvent:ancestral_relic", "fallen_lineage", "relic"],
      destinyTags: ["destiny_sword_bone", "destiny_old_scroll"],
      spiritualRootTags: ["root:metal"],
      aptitudeTags: ["aptitude:comprehension_high"]
    });
    const neutralBackground = backgroundFor(neutralContext, "origin_mountain_orphan");
    const biasedBackground = backgroundFor(biasedContext, "origin_fallen_cultivator_descendant");
    const neutralHidden = hiddenFateFor(neutralContext, neutralBackground, "hidden_merit_seed");
    const biasedHidden = hiddenFateFor(biasedContext, biasedBackground, "hidden_past_life_sword_soul");

    const neutral = generateCarriedItems(neutralContext, neutralBackground, neutralHidden, registry, new SeededRng("neutral-fallen", "test"));
    const biased = generateCarriedItems(biasedContext, biasedBackground, biasedHidden, registry, new SeededRng("biased-fallen", "test"));

    expect(weightFor(biased, "origin_item_broken_wooden_sword")).toBeGreaterThan(
      weightFor(neutral, "origin_item_broken_wooden_sword") + 40
    );
    expect(weightFor(biased, "origin_item_wordless_page")).toBeGreaterThan(weightFor(neutral, "origin_item_wordless_page") + 35);
    expect(weightFor(biased, "origin_item_ancestral_jade")).toBeGreaterThan(weightFor(neutral, "origin_item_ancestral_jade") + 35);
    expect(matchesFor(biased, "origin_item_broken_wooden_sword")).toEqual(expect.arrayContaining(["fallen_lineage", "sword"]));
  });

  it("raises apothecary bronze furnace with apothecary, alchemy, wood, and fire tags", () => {
    const registry = loadOriginFateRegistry();
    const neutralContext = contextWithTags({ seed: "neutral-apothecary-item" });
    const biasedContext = contextWithTags({
      seed: "biased-apothecary-item",
      openingTags: ["lifeEvent:apothecary", "lifeEvent:herb"],
      destinyTags: ["destiny_alchemy_prodigy", "alchemy", "fire"],
      spiritualRootTags: ["root:wood", "root:fire"],
      aptitudeTags: ["aptitude:inspiration_high"]
    });
    const neutralBackground = backgroundFor(neutralContext, "origin_mountain_orphan");
    const biasedBackground = backgroundFor(biasedContext, "origin_apothecary_apprentice");
    const neutralHidden = hiddenFateFor(neutralContext, neutralBackground, "hidden_merit_seed");
    const biasedHidden = hiddenFateFor(biasedContext, biasedBackground, "hidden_pill_saint_remains");

    const neutral = generateCarriedItems(neutralContext, neutralBackground, neutralHidden, registry, new SeededRng("neutral-apothecary-item", "test"));
    const biased = generateCarriedItems(biasedContext, biasedBackground, biasedHidden, registry, new SeededRng("biased-apothecary-item", "test"));

    expect(weightFor(biased, "item_apothecary_bronze_furnace")).toBeGreaterThan(
      weightFor(neutral, "item_apothecary_bronze_furnace") + 50
    );
    expect(weightFor(biased, "item_apothecary_bronze_furnace")).toBeGreaterThan(
      weightFor(biased, "item_black_bone_flute")
    );
    expect(matchesFor(biased, "item_apothecary_bronze_furnace")).toEqual(
      expect.arrayContaining(["apothecary", "alchemy", "wood", "fire", "pill_saint_remains"])
    );
  });

  it("raises gravekeeper black bone flute with graveyard, yin, soul, and lunar hidden fate tags", () => {
    const registry = loadOriginFateRegistry();
    const neutralContext = contextWithTags({ seed: "neutral-grave-item" });
    const biasedContext = contextWithTags({
      seed: "biased-grave-item",
      openingTags: ["lifeEvent:graveyard", "lifeEvent:night"],
      destinyTags: ["destiny_yin_eye"],
      spiritualRootTags: ["root:yin", "root:water"],
      aptitudeTags: ["aptitude:inspiration_high"]
    });
    const neutralBackground = backgroundFor(neutralContext, "origin_mountain_orphan");
    const biasedBackground = backgroundFor(biasedContext, "origin_gravekeeper_child");
    const neutralHidden = hiddenFateFor(neutralContext, neutralBackground, "hidden_merit_seed");
    const biasedHidden = hiddenFateFor(biasedContext, biasedBackground, "hidden_lunar_remnant_vein");

    const neutral = generateCarriedItems(neutralContext, neutralBackground, neutralHidden, registry, new SeededRng("neutral-grave-item", "test"));
    const biased = generateCarriedItems(biasedContext, biasedBackground, biasedHidden, registry, new SeededRng("biased-grave-item", "test"));

    expect(weightFor(biased, "item_black_bone_flute")).toBeGreaterThan(weightFor(neutral, "item_black_bone_flute") + 45);
    expect(weightFor(biased, "item_black_bone_flute")).toBeGreaterThan(weightFor(biased, "item_apothecary_bronze_furnace"));
    expect(matchesFor(biased, "item_black_bone_flute")).toEqual(
      expect.arrayContaining(["graveyard", "yin", "soul", "lunar_remnant_vein"])
    );
  });

  it("keeps ancestral jade conversion as a treasure fragment protection clue", () => {
    const registry = loadOriginFateRegistry();
    const context = contextWithTags({
      seed: "ancestral-jade-conversion",
      locks: { carriedItemIds: ["origin_item_ancestral_jade"] }
    });
    const background = backgroundFor(context, "origin_fallen_cultivator_descendant");
    const hiddenFate = hiddenFateFor(context, background, "hidden_merit_seed");

    const result = generateCarriedItems(context, background, hiddenFate, registry, new SeededRng("ancestral-jade", "test"));
    const jade = result.items[0];

    expect(jade?.itemId).toBe("origin_item_ancestral_jade");
    expect(jade?.conversion.type).toBe("treasure_fragment");
    expect(jade?.conversion.dongfuHook).toBe("unlock_jade_treasure_repair");
    expect(jade?.conversion.outerBattlefieldEffect).toMatch(/护|shield|protect|护命|护盾/u);
  });

  it("does not use Math.random in the carried items generator", () => {
    const source = readFileSync("src/originFate/CarriedItemsGenerator.ts", "utf8");

    expect(source).not.toContain("Math.random");
  });
});

type GeneratedCarriedItems = ReturnType<typeof generateCarriedItems>;

function contextWithTags(overrides: Partial<OriginFateGenerationContext>): OriginFateGenerationContext {
  return {
    seed: overrides.seed ?? "hfo-c004-default",
    rerollIndex: overrides.rerollIndex ?? 0,
    openingTags: overrides.openingTags ?? [],
    destinyTags: overrides.destinyTags ?? [],
    spiritualRootTags: overrides.spiritualRootTags ?? [],
    aptitudeTags: overrides.aptitudeTags ?? [],
    ...(overrides.locks === undefined ? {} : { locks: overrides.locks }),
    ...(overrides.divinationTokens === undefined ? {} : { divinationTokens: overrides.divinationTokens })
  };
}

function backgroundFor(context: OriginFateGenerationContext, backgroundOriginId: string): BackgroundOriginResult {
  return generateBackgroundOrigin(
    {
      ...context,
      locks: {
        ...context.locks,
        backgroundOriginId
      }
    },
    loadOriginFateRegistry(),
    new SeededRng(`${context.seed}:background:${backgroundOriginId}`, "test_background")
  ).result;
}

function hiddenFateFor(
  context: OriginFateGenerationContext,
  background: BackgroundOriginResult,
  hiddenFateId: string
): HiddenFateResultInternal {
  return generateHiddenFate(
    {
      ...context,
      locks: {
        ...context.locks,
        hiddenFateId
      }
    },
    background,
    loadOriginFateRegistry(),
    new SeededRng(`${context.seed}:hidden:${hiddenFateId}`, "test_hidden")
  ).internal;
}

function weightFor(generated: GeneratedCarriedItems, id: string): number {
  return generated.debug.candidateWeights.find((candidate) => candidate.id === id)?.weight ?? 0;
}

function matchesFor(generated: GeneratedCarriedItems, id: string): readonly string[] {
  return generated.debug.candidateWeights.find((candidate) => candidate.id === id)?.matchedTags ?? [];
}
