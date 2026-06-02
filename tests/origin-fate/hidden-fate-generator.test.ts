import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { generateBackgroundOrigin } from "../../src/originFate/BackgroundOriginGenerator";
import { generateHiddenFate } from "../../src/originFate/HiddenFateGenerator";
import { loadOriginFateRegistry } from "../../src/originFate/OriginFateRegistry";
import { SeededRng } from "../../src/sim/core/SeededRng";
import type {
  BackgroundOriginResult,
  OriginFateGenerationContext
} from "../../src/types/origin-fate-types.v0.1";

describe("HiddenFateGenerator", () => {
  it("generates reproducible hidden fate internals and safe visible omens for the same seed", () => {
    const registry = loadOriginFateRegistry();
    const context = contextWithTags({
      seed: "hfo-c003-seed",
      openingTags: ["lifeEvent:ancestral_dream"],
      destinyTags: ["destiny_thunder_affinity"],
      spiritualRootTags: ["root:thunder"],
      aptitudeTags: ["aptitude:inspiration_high"]
    });
    const background = backgroundFor(context, "origin_mountain_orphan");

    const first = generateHiddenFate(context, background, registry, new SeededRng(`${context.seed}:hidden`, "test"));
    const second = generateHiddenFate(context, background, registry, new SeededRng(`${context.seed}:hidden`, "test"));

    expect(second).toEqual(first);
    expect(first.internal.hiddenFateId.length).toBeGreaterThan(0);
    expect(first.internal.trueName.length).toBeGreaterThan(0);
    expect(first.internal.progress).toBeGreaterThanOrEqual(0);
    expect(first.internal.progress).toBeLessThanOrEqual(100);
    expect(first.visibleOmen.hints.length).toBeGreaterThan(0);
    expect(JSON.stringify(first.visibleOmen)).not.toContain(first.internal.trueName);
    expect(first.debug.candidateWeights).toHaveLength(registry.hiddenFates.length);
  });

  it("uses divination tokens to reveal an extra hint and category without leaking trueName", () => {
    const registry = loadOriginFateRegistry();
    const baseContext = contextWithTags({
      seed: "hfo-c003-divination",
      locks: { hiddenFateId: "hidden_ancient_thunder_blood" },
      openingTags: ["lifeEvent:ancestral_dream"],
      destinyTags: ["destiny_thunder_affinity"],
      spiritualRootTags: ["root:thunder"],
      aptitudeTags: ["aptitude:inspiration_high"]
    });
    const background = backgroundFor(baseContext, "origin_mountain_orphan");

    const normal = generateHiddenFate(baseContext, background, registry, new SeededRng("divination-normal", "test"));
    const divined = generateHiddenFate(
      { ...baseContext, divinationTokens: 1 },
      background,
      registry,
      new SeededRng("divination-normal", "test")
    );

    expect(divined.internal.hiddenFateId).toBe(normal.internal.hiddenFateId);
    expect(divined.visibleOmen.hints.length).toBeGreaterThan(normal.visibleOmen.hints.length);
    expect(divined.visibleOmen.revealedCategory).toBe("bloodline");
    expect(divined.visibleOmen.relatedTags).toEqual(expect.arrayContaining(["thunder", "tribulation"]));
    expect(JSON.stringify(divined.visibleOmen)).not.toContain(divined.internal.trueName);
  });

  it("makes high inspiration and fortune samples average higher hidden fate progress", () => {
    const registry = loadOriginFateRegistry();
    const lowProgress = averageProgress("low-hidden-progress", {
      aptitudeTags: ["aptitude:inspiration_low", "aptitude:fortune_low"],
      locks: { hiddenFateId: "hidden_ancient_thunder_blood" }
    });
    const highProgress = averageProgress("high-hidden-progress", {
      aptitudeTags: ["aptitude:inspiration_high", "aptitude:fortune_high"],
      openingTags: ["archetype:blessed"],
      destinyTags: ["destiny_fortune_star"],
      spiritualRootTags: ["root:thunder"],
      locks: { hiddenFateId: "hidden_ancient_thunder_blood" }
    });

    expect(highProgress).toBeGreaterThan(lowProgress + 8);
    expect(registry.getHiddenFate("hidden_ancient_thunder_blood").initialProgressRange[0]).toBeGreaterThanOrEqual(0);
  });

  it("raises ancient thunder blood weight with thunder root and thunder-affinity destiny tags", () => {
    const registry = loadOriginFateRegistry();
    const neutralContext = contextWithTags({ seed: "neutral-thunder-fate" });
    const biasedContext = contextWithTags({
      seed: "biased-thunder-fate",
      openingTags: ["lifeEvent:ancestral_dream"],
      destinyTags: ["destiny_thunder_affinity", "tribulation", "thunder"],
      spiritualRootTags: ["root:thunder", "rootRelation:storm"],
      aptitudeTags: ["aptitude:inspiration_high"]
    });
    const background = backgroundFor(biasedContext, "origin_mountain_orphan");

    const neutral = generateHiddenFate(neutralContext, background, registry, new SeededRng("neutral-thunder", "test"));
    const biased = generateHiddenFate(biasedContext, background, registry, new SeededRng("biased-thunder", "test"));

    expect(weightFor(biased, "hidden_ancient_thunder_blood")).toBeGreaterThan(
      weightFor(neutral, "hidden_ancient_thunder_blood") + 50
    );
    expect(weightFor(biased, "hidden_ancient_thunder_blood")).toBeGreaterThan(weightFor(biased, "hidden_pill_saint_remains"));
    expect(matchesFor(biased, "hidden_ancient_thunder_blood")).toEqual(
      expect.arrayContaining(["thunder", "tribulation", "root:thunder"])
    );
  });

  it("raises pill saint remains weight with apothecary background and alchemy destiny tags", () => {
    const registry = loadOriginFateRegistry();
    const neutralContext = contextWithTags({ seed: "neutral-pill-fate" });
    const biasedContext = contextWithTags({
      seed: "biased-pill-fate",
      openingTags: ["lifeEvent:apothecary", "lifeEvent:alchemy"],
      destinyTags: ["destiny_alchemy_prodigy", "alchemy", "fire"],
      spiritualRootTags: ["root:wood", "root:fire"],
      aptitudeTags: ["aptitude:inspiration_high"]
    });
    const background = backgroundFor(biasedContext, "origin_apothecary_apprentice");

    const neutral = generateHiddenFate(neutralContext, background, registry, new SeededRng("neutral-pill", "test"));
    const biased = generateHiddenFate(biasedContext, background, registry, new SeededRng("biased-pill", "test"));

    expect(weightFor(biased, "hidden_pill_saint_remains")).toBeGreaterThan(
      weightFor(neutral, "hidden_pill_saint_remains") + 45
    );
    expect(weightFor(biased, "hidden_pill_saint_remains")).toBeGreaterThan(weightFor(biased, "hidden_ancient_thunder_blood"));
    expect(matchesFor(biased, "hidden_pill_saint_remains")).toEqual(
      expect.arrayContaining(["alchemy", "fire", "wood"])
    );
  });

  it("does not use Math.random in the hidden fate generator", () => {
    const source = readFileSync("src/originFate/HiddenFateGenerator.ts", "utf8");

    expect(source).not.toContain("Math.random");
  });
});

type GeneratedHiddenFate = ReturnType<typeof generateHiddenFate>;

function contextWithTags(overrides: Partial<OriginFateGenerationContext>): OriginFateGenerationContext {
  return {
    seed: overrides.seed ?? "hfo-c003-default",
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

function averageProgress(seedPrefix: string, overrides: Partial<OriginFateGenerationContext>): number {
  const registry = loadOriginFateRegistry();
  const values = Array.from({ length: 96 }, (_, index) => {
    const context = contextWithTags({
      ...overrides,
      seed: `${seedPrefix}-${index}`,
      rerollIndex: index % 5
    });
    const background = backgroundFor(context, "origin_mountain_orphan");
    return generateHiddenFate(context, background, registry, new SeededRng(`${context.seed}:hidden`, "test")).internal.progress;
  });

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function weightFor(generated: GeneratedHiddenFate, id: string): number {
  return generated.debug.candidateWeights.find((candidate) => candidate.id === id)?.weight ?? 0;
}

function matchesFor(generated: GeneratedHiddenFate, id: string): readonly string[] {
  return generated.debug.candidateWeights.find((candidate) => candidate.id === id)?.matchedTags ?? [];
}
