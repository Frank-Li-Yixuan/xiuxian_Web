import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { DefaultOpeningSpiritualRootGenerator } from "../../src/opening/OpeningSpiritualRootGenerator";
import { loadOpeningGeneratorRegistry } from "../../src/opening/OpeningGeneratorRegistry";
import type {
  AttributeArchetypeResult,
  ElementId,
  OpeningSpiritualRootDraft,
  SpiritualRootState
} from "../../src/types/opening-generator-types.v0.1";

describe("OpeningSpiritualRootGenerator", () => {
  it("generates reproducible spiritual root drafts for the same seed and archetype", () => {
    const generator = new DefaultOpeningSpiritualRootGenerator();
    const archetype = archetypeResult("root_omen");
    const input = { seed: "oag-c003-seed", draftId: "draft_root_001", rerollIndex: 3, archetype };

    const first = generator.generate(input);
    const second = generator.generate(input);

    expect(second).toEqual(first);
  });

  it("changes the generated spiritual root draft when the seed changes", () => {
    const generator = new DefaultOpeningSpiritualRootGenerator();
    const archetype = archetypeResult("balanced_ordinary");

    const first = generator.generate({ seed: "oag-c003-seed-a", draftId: "draft_a", rerollIndex: 0, archetype });
    const second = generator.generate({ seed: "oag-c003-seed-b", draftId: "draft_b", rerollIndex: 0, archetype });

    expect({
      categoryId: second.spiritualRoot.categoryId,
      elements: second.spiritualRoot.elements,
      purity: second.spiritualRoot.purity,
      stability: second.spiritualRoot.stability,
      conflict: second.spiritualRoot.conflict,
      breadth: second.spiritualRoot.breadth
    }).not.toEqual({
      categoryId: first.spiritualRoot.categoryId,
      elements: first.spiritualRoot.elements,
      purity: first.spiritualRoot.purity,
      stability: first.spiritualRoot.stability,
      conflict: first.spiritualRoot.conflict,
      breadth: first.spiritualRoot.breadth
    });
  });

  it("can generate all nine spiritual root categories in a deterministic sample", () => {
    const generator = new DefaultOpeningSpiritualRootGenerator();
    const archetypes = [
      "balanced_ordinary",
      "root_omen",
      "wastebone_reversal",
      "thin_lived_genius",
      "tribulation_bound"
    ].map(archetypeResult);
    const categories = new Set<string>();

    for (let index = 0; index < 900; index += 1) {
      const draft = generator.generate({
        seed: `coverage-root-${index}`,
        draftId: `coverage_${index}`,
        rerollIndex: index % 11,
        archetype: archetypes[index % archetypes.length]!
      });
      categories.add(draft.spiritualRoot.categoryId);
    }

    expect([...categories].sort()).toEqual([
      "chaos",
      "closed",
      "dual",
      "heavenly",
      "hidden",
      "mixed",
      "single",
      "triple",
      "variant"
    ]);
  });

  it("keeps heavenly roots rare in a broad balanced sample", () => {
    const generator = new DefaultOpeningSpiritualRootGenerator();
    const archetype = archetypeResult("balanced_ordinary");
    const drafts = sampleDrafts(generator, archetype, 2000, "balanced-frequency");
    const heavenlyRate = ratio(drafts, (draft) => draft.spiritualRoot.categoryId === "heavenly");

    expect(heavenlyRate).toBeGreaterThan(0.01);
    expect(heavenlyRate).toBeLessThan(0.06);
  });

  it("makes root-omen archetypes significantly more likely to roll rare or special roots", () => {
    const generator = new DefaultOpeningSpiritualRootGenerator();
    const balanced = sampleDrafts(generator, archetypeResult("balanced_ordinary"), 1600, "balanced-special");
    const rootOmen = sampleDrafts(generator, archetypeResult("root_omen"), 1600, "root-omen-special");
    const specialIds = new Set(["heavenly", "variant", "hidden"]);

    const balancedRate = ratio(balanced, (draft) => specialIds.has(draft.spiritualRoot.categoryId));
    const omenRate = ratio(rootOmen, (draft) => specialIds.has(draft.spiritualRoot.categoryId));

    expect(omenRate).toBeGreaterThan(balancedRate + 0.05);
  });

  it("makes wastebone-reversal archetypes significantly more likely to roll closed or hidden roots", () => {
    const generator = new DefaultOpeningSpiritualRootGenerator();
    const balanced = sampleDrafts(generator, archetypeResult("balanced_ordinary"), 1600, "balanced-waste");
    const wastebone = sampleDrafts(generator, archetypeResult("wastebone_reversal"), 1600, "wastebone-special");
    const reversalIds = new Set(["closed", "hidden"]);

    const balancedRate = ratio(balanced, (draft) => reversalIds.has(draft.spiritualRoot.categoryId));
    const wasteboneRate = ratio(wastebone, (draft) => reversalIds.has(draft.spiritualRoot.categoryId));

    expect(wasteboneRate).toBeGreaterThan(balancedRate + 0.035);
  });

  it("marks wood-fire dual roots as generating and water-fire dual roots as controlling with higher conflict", () => {
    const generator = new DefaultOpeningSpiritualRootGenerator();
    const woodFire = generator.generate({
      seed: "wood-fire",
      draftId: "draft_wood_fire",
      rerollIndex: 1,
      archetype: archetypeResult("balanced_ordinary"),
      locks: { spiritualRootElements: true },
      previousDraft: previousRootDraft(rootState("dual", { wood: 56, fire: 44 }))
    });
    const waterFire = generator.generate({
      seed: "water-fire",
      draftId: "draft_water_fire",
      rerollIndex: 1,
      archetype: archetypeResult("balanced_ordinary"),
      locks: { spiritualRootElements: true },
      previousDraft: previousRootDraft(rootState("dual", { water: 50, fire: 50 }))
    });

    expect(woodFire.spiritualRoot.relationTags).toContain("rootRelation:generating");
    expect(waterFire.spiritualRoot.relationTags).toContain("rootRelation:controlling");
    expect(waterFire.spiritualRoot.conflict).toBeGreaterThan(woodFire.spiritualRoot.conflict);
  });

  it("emits thunder root, life-event, mode, and destiny tags for thunder roots", () => {
    const generator = new DefaultOpeningSpiritualRootGenerator();
    const draft = generator.generate({
      seed: "thunder-tags",
      draftId: "draft_thunder",
      rerollIndex: 2,
      archetype: archetypeResult("root_omen"),
      locks: { spiritualRootElements: true },
      previousDraft: previousRootDraft(rootState("variant", { thunder: 100 }))
    });

    expect(draft.spiritualRoot.tags).toContain("root:thunder");
    expect(draft.tags.lifeEventBiasTags).toContain("lifeEvent:thunderstorm_omen");
    expect(draft.tags.modeBiasTags).toContain("mode:thunder");
    expect(draft.tags.destinyBiasTags).toContain("destinyBias:tribulation_affinity");
  });

  it("keeps metrics inside data domains and element percentages normalized to 100", () => {
    const registry = loadOpeningGeneratorRegistry();
    const generator = new DefaultOpeningSpiritualRootGenerator(registry);
    const domains = registry.generationRules.statDomains;

    for (let index = 0; index < 240; index += 1) {
      const draft = generator.generate({
        seed: `range-root-${index}`,
        draftId: `range_root_${index}`,
        rerollIndex: index % 9,
        archetype: archetypeResult(index % 2 === 0 ? "balanced_ordinary" : "root_omen")
      });
      const root = draft.spiritualRoot;
      const elementTotal = Object.values(root.elements).reduce((sum, value) => sum + (value ?? 0), 0);

      expect(elementTotal).toBe(100);
      for (const value of [root.purity, root.stability, root.conflict, root.breadth]) {
        expect(value).toBeGreaterThanOrEqual(domains.rootMetricMin);
        expect(value).toBeLessThanOrEqual(domains.rootMetricMax);
      }
    }
  });

  it("preserves spiritual root category, elements, and full root when locked", () => {
    const generator = new DefaultOpeningSpiritualRootGenerator();
    const first = generator.generate({
      seed: "root-lock-seed-a",
      draftId: "draft_root_lock",
      rerollIndex: 0,
      archetype: archetypeResult("root_omen")
    });

    const categoryLocked = generator.generate({
      seed: "root-lock-seed-b",
      draftId: "draft_root_lock",
      rerollIndex: 1,
      archetype: archetypeResult("balanced_ordinary"),
      locks: { spiritualRootCategory: true },
      previousDraft: first
    });
    expect(categoryLocked.spiritualRoot.categoryId).toBe(first.spiritualRoot.categoryId);
    expect(categoryLocked.spiritualRoot.elements).not.toEqual(first.spiritualRoot.elements);

    const elementsLocked = generator.generate({
      seed: "root-lock-seed-c",
      draftId: "draft_root_lock",
      rerollIndex: 2,
      archetype: archetypeResult("balanced_ordinary"),
      locks: { spiritualRootElements: true },
      previousDraft: first
    });
    expect(elementsLocked.spiritualRoot.categoryId).toBe(first.spiritualRoot.categoryId);
    expect(elementsLocked.spiritualRoot.elements).toEqual(first.spiritualRoot.elements);
    expect(elementsLocked.spiritualRoot.primaryElement).toBe(first.spiritualRoot.primaryElement);
    expect(elementsLocked.spiritualRoot.secondaryElements).toEqual(first.spiritualRoot.secondaryElements);
    expect(elementsLocked.spiritualRoot.latentRoot).toBe(first.spiritualRoot.latentRoot);
    expect(elementsLocked.spiritualRoot.relationTags).toEqual(first.spiritualRoot.relationTags);

    const fullLocked = generator.generate({
      seed: "root-lock-seed-d",
      draftId: "draft_root_lock",
      rerollIndex: 3,
      archetype: archetypeResult("balanced_ordinary"),
      locks: { spiritualRootFull: true },
      previousDraft: first
    });
    expect(fullLocked.spiritualRoot).toEqual(first.spiritualRoot);
    expect(fullLocked.tags).toEqual(first.tags);
  });

  it("requires a previous draft for spiritual root locks", () => {
    const generator = new DefaultOpeningSpiritualRootGenerator();

    expect(() =>
      generator.generate({
        seed: "missing-root-previous",
        draftId: "draft_missing_root_previous",
        rerollIndex: 1,
        archetype: archetypeResult("balanced_ordinary"),
        locks: { spiritualRootFull: true }
      })
    ).toThrow("previousDraft is required when locking spiritualRootFull");
  });

  it("does not use Math.random in the opening spiritual root generator", () => {
    const source = readFileSync("src/opening/OpeningSpiritualRootGenerator.ts", "utf8");

    expect(source).not.toContain("Math.random");
  });
});

function sampleDrafts(
  generator: DefaultOpeningSpiritualRootGenerator,
  archetype: AttributeArchetypeResult,
  count: number,
  seedPrefix: string
): OpeningSpiritualRootDraft[] {
  return Array.from({ length: count }, (_, index) =>
    generator.generate({
      seed: `${seedPrefix}-${index}`,
      draftId: `${seedPrefix}_${index}`,
      rerollIndex: index % 13,
      archetype
    })
  );
}

function archetypeResult(id: string): AttributeArchetypeResult {
  const definition = loadOpeningGeneratorRegistry().getAttributeArchetype(id);
  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    tags: definition.biasTags
  };
}

function previousRootDraft(spiritualRoot: SpiritualRootState): OpeningSpiritualRootDraft {
  const tags = {
    destinyBiasTags: spiritualRoot.tags.filter((tag) => tag.startsWith("destinyBias:")),
    lifeEventBiasTags: spiritualRoot.tags.filter((tag) => tag.startsWith("lifeEvent:")),
    modeBiasTags: spiritualRoot.tags.filter((tag) => tag.startsWith("mode:")),
    hiddenFateBiasTags: spiritualRoot.tags.filter((tag) => tag.startsWith("hiddenFateBias:"))
  };

  return {
    draftId: "previous_root_draft",
    seed: "previous_root_seed",
    rerollIndex: 0,
    spiritualRoot,
    tags,
    distinctivenessScore: 0
  };
}

function rootState(
  categoryId: SpiritualRootState["categoryId"],
  elements: Readonly<Partial<Record<ElementId, number>>>
): SpiritualRootState {
  const entries = Object.entries(elements)
    .filter(([, value]) => value !== undefined && value > 0)
    .sort(([, first], [, second]) => (second ?? 0) - (first ?? 0)) as [ElementId, number][];
  const tags = entries.map(([element]) => `root:${element}`);

  return {
    categoryId,
    displayName: categoryId,
    elements,
    ...(entries[0] === undefined ? {} : { primaryElement: entries[0][0] }),
    secondaryElements: entries.slice(1).map(([element]) => element),
    purity: 50,
    stability: 50,
    conflict: 20,
    breadth: 50,
    relationTags: [],
    tags
  };
}

function ratio(values: readonly OpeningSpiritualRootDraft[], predicate: (value: OpeningSpiritualRootDraft) => boolean): number {
  return values.filter(predicate).length / values.length;
}
