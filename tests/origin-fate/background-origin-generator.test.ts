import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  generateBackgroundOrigin
} from "../../src/originFate/BackgroundOriginGenerator";
import { loadOriginFateRegistry } from "../../src/originFate/OriginFateRegistry";
import { SeededRng } from "../../src/sim/core/SeededRng";
import type { OriginFateGenerationContext } from "../../src/types/origin-fate-types.v0.1";

describe("BackgroundOriginGenerator", () => {
  it("generates reproducible background origin results and debug weights for the same seed", () => {
    const registry = loadOriginFateRegistry();
    const context = contextWithTags({
      seed: "hfo-c002-seed",
      openingTags: ["lifeEvent:ordinary_family"],
      destinyTags: ["destiny_good_memory"],
      spiritualRootTags: ["root:wood"],
      aptitudeTags: ["aptitude:comprehension_high"]
    });

    const first = generateBackgroundOrigin(context, registry, new SeededRng(`${context.seed}:background`, "test"));
    const second = generateBackgroundOrigin(context, registry, new SeededRng(`${context.seed}:background`, "test"));

    expect(second).toEqual(first);
    expect(first.result.originId.length).toBeGreaterThan(0);
    expect(first.result.name.length).toBeGreaterThan(0);
    expect(first.result.visibleDescription.length).toBeGreaterThan(0);
    expect(first.result.appliedWeight).toBeGreaterThan(0);
    expect(first.debug.candidateWeights).toHaveLength(registry.backgroundOrigins.length);
    expect(first.debug.candidateWeights.every((candidate) => candidate.weight > 0)).toBe(true);
  });

  it("returns the locked background origin directly across rerolls", () => {
    const registry = loadOriginFateRegistry();
    const locked = generateBackgroundOrigin(
      contextWithTags({
        seed: "hfo-c002-lock-a",
        rerollIndex: 0,
        locks: { backgroundOriginId: "origin_apothecary_apprentice" }
      }),
      registry,
      new SeededRng("lock-a", "test")
    );
    const rerolled = generateBackgroundOrigin(
      contextWithTags({
        seed: "hfo-c002-lock-b",
        rerollIndex: 9,
        openingTags: ["lifeEvent:war", "origin:refugee"],
        destinyTags: ["destiny_lone_star"],
        spiritualRootTags: ["root:metal"],
        aptitudeTags: ["aptitude:fortune_low"],
        locks: { backgroundOriginId: "origin_apothecary_apprentice" }
      }),
      registry,
      new SeededRng("lock-b", "test")
    );

    expect(rerolled.result).toEqual(locked.result);
    expect(rerolled.result.originId).toBe("origin_apothecary_apprentice");
    expect(rerolled.result.matchedTags).toContain("lock:backgroundOriginId");
    expect(rerolled.debug.candidateWeights).toHaveLength(1);
    expect(rerolled.debug.candidateWeights[0]?.id).toBe("origin_apothecary_apprentice");
  });

  it("raises apothecary apprentice weight with apothecary, alchemy, herb, wood, and fire tags", () => {
    const registry = loadOriginFateRegistry();
    const neutral = generateBackgroundOrigin(contextWithTags({ seed: "neutral-apothecary" }), registry, new SeededRng("neutral", "test"));
    const biased = generateBackgroundOrigin(
      contextWithTags({
        seed: "biased-apothecary",
        openingTags: ["lifeEvent:apothecary", "lifeEvent:herb"],
        destinyTags: ["destiny_alchemy_prodigy", "alchemy", "fire"],
        spiritualRootTags: ["root:wood", "rootRelation:generating"],
        aptitudeTags: ["aptitude:inspiration_high"]
      }),
      registry,
      new SeededRng("biased", "test")
    );

    const neutralWeight = weightFor(neutral, "origin_apothecary_apprentice");
    const biasedWeight = weightFor(biased, "origin_apothecary_apprentice");

    expect(biasedWeight).toBeGreaterThan(neutralWeight + 40);
    expect(weightFor(biased, "origin_apothecary_apprentice")).toBeGreaterThan(weightFor(biased, "origin_refugee_orphan"));
    expect(matchesFor(biased, "origin_apothecary_apprentice")).toEqual(
      expect.arrayContaining(["apothecary", "alchemy", "herb", "wood", "fire"])
    );
  });

  it("raises mountain orphan weight with thunder, orphan, and heaven-jealous style tags", () => {
    const registry = loadOriginFateRegistry();
    const neutral = generateBackgroundOrigin(contextWithTags({ seed: "neutral-orphan" }), registry, new SeededRng("neutral-o", "test"));
    const biased = generateBackgroundOrigin(
      contextWithTags({
        seed: "biased-orphan",
        openingTags: ["archetype:thin_lived_genius", "lifeEvent:ancestral_dream"],
        destinyTags: ["destiny_heaven_jealous_talent", "tribulation", "thunder"],
        spiritualRootTags: ["root:thunder", "rootRelation:storm"],
        aptitudeTags: ["aptitude:lifespan_low"]
      }),
      registry,
      new SeededRng("biased-o", "test")
    );

    const neutralWeight = weightFor(neutral, "origin_mountain_orphan");
    const biasedWeight = weightFor(biased, "origin_mountain_orphan");

    expect(biasedWeight).toBeGreaterThan(neutralWeight + 35);
    expect(matchesFor(biased, "origin_mountain_orphan")).toEqual(
      expect.arrayContaining(["ancestral_dream", "thunder", "tribulation", "orphan"])
    );
    expect(weightFor(biased, "origin_mountain_orphan")).toBeGreaterThan(weightFor(biased, "origin_apothecary_apprentice"));
  });

  it("does not use Math.random in the background origin generator", () => {
    const source = readFileSync("src/originFate/BackgroundOriginGenerator.ts", "utf8");

    expect(source).not.toContain("Math.random");
  });
});

type GeneratedBackgroundOrigin = ReturnType<typeof generateBackgroundOrigin>;

function contextWithTags(overrides: Partial<OriginFateGenerationContext>): OriginFateGenerationContext {
  return {
    seed: overrides.seed ?? "hfo-c002-default",
    rerollIndex: overrides.rerollIndex ?? 0,
    openingTags: overrides.openingTags ?? [],
    destinyTags: overrides.destinyTags ?? [],
    spiritualRootTags: overrides.spiritualRootTags ?? [],
    aptitudeTags: overrides.aptitudeTags ?? [],
    ...(overrides.locks === undefined ? {} : { locks: overrides.locks }),
    ...(overrides.divinationTokens === undefined ? {} : { divinationTokens: overrides.divinationTokens })
  };
}

function weightFor(generated: GeneratedBackgroundOrigin, id: string): number {
  return generated.debug.candidateWeights.find((candidate) => candidate.id === id)?.weight ?? 0;
}

function matchesFor(generated: GeneratedBackgroundOrigin, id: string): readonly string[] {
  return generated.debug.candidateWeights.find((candidate) => candidate.id === id)?.matchedTags ?? [];
}
