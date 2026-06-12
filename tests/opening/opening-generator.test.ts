import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { DefaultOpeningGenerator } from "../../src/opening/OpeningGenerator";
import { evaluateNinePalace } from "../../src/ninePalace/NinePalaceScoring";

describe("OpeningGenerator", () => {
  it("generates reproducible full opening innate drafts for the same seed and reroll index", () => {
    const generator = new DefaultOpeningGenerator();
    const input = { seed: "oag-c004-seed", draftId: "draft_opening_001", rerollIndex: 0 };

    const first = generator.generate(input);
    const second = generator.generate(input);

    expect(second).toEqual(first);
    expect(first.spiritualRoot.categoryId.length).toBeGreaterThan(0);
    expect(first.archetype.id.length).toBeGreaterThan(0);
  });

  it("merges attribute and spiritual root bias tags into the full draft", () => {
    const generator = new DefaultOpeningGenerator();
    const draft = generator.generate({ seed: "oag-c004-tag-merge", draftId: "draft_tags", rerollIndex: 0 });

    expect(draft.tags.lifeEventBiasTags.some((tag) => tag.startsWith("archetype:"))).toBe(true);
    expect(draft.tags.modeBiasTags.length).toBeGreaterThan(0);
    expect(draft.spiritualRoot.tags.some((tag) => tag.startsWith("root:"))).toBe(true);
    expect(draft.distinctivenessScore).toBeGreaterThanOrEqual(0);
  });

  it("adds a deterministic nine palace evaluation from generated core seed and aptitude", () => {
    const generator = new DefaultOpeningGenerator();
    const draft = generator.generate({ seed: "npf-c004-opening-evaluation", draftId: "draft_npf_c004", rerollIndex: 0 });

    expect(draft.ninePalaceEvaluation).toEqual(evaluateNinePalace({
      ...draft.coreSeed,
      ...draft.aptitude
    }));
    expect(draft.tags.destinyBiasTags).toEqual(
      expect.arrayContaining(draft.ninePalaceEvaluation.tags.destinyBiasTags)
    );
    expect(draft.tags.lifeEventBiasTags).toEqual(
      expect.arrayContaining(draft.ninePalaceEvaluation.tags.lifeEventBiasTags)
    );
  });

  it("preserves the attribute side when attribute locks are active", () => {
    const generator = new DefaultOpeningGenerator();
    const first = generator.generate({ seed: "oag-c004-lock-attribute", draftId: "draft_attr_lock", rerollIndex: 0 });

    const rerolled = generator.generate({
      seed: "oag-c004-lock-attribute",
      draftId: "draft_attr_lock",
      rerollIndex: 1,
      locks: { attributeArchetype: true, aptitudeStats: true, coreSeedStats: true },
      previousDraft: first
    });

    expect(rerolled.archetype).toEqual(first.archetype);
    expect(rerolled.aptitude).toEqual(first.aptitude);
    expect(rerolled.coreSeed).toEqual(first.coreSeed);
    expect(rerolled.ninePalaceEvaluation).toEqual(first.ninePalaceEvaluation);
    expect(rootSignature(rerolled)).not.toBe(rootSignature(first));
  });

  it("preserves the full spiritual root when spiritual root lock is active", () => {
    const generator = new DefaultOpeningGenerator();
    const first = generator.generate({ seed: "oag-c004-lock-root", draftId: "draft_root_lock", rerollIndex: 0 });

    const rerolled = generator.generate({
      seed: "oag-c004-lock-root",
      draftId: "draft_root_lock",
      rerollIndex: 1,
      locks: { spiritualRootFull: true },
      previousDraft: first
    });

    expect(rerolled.spiritualRoot).toEqual(first.spiritualRoot);
    expect({
      archetype: rerolled.archetype.id,
      aptitude: rerolled.aptitude,
      coreSeed: rerolled.coreSeed
    }).not.toEqual({
      archetype: first.archetype.id,
      aptitude: first.aptitude,
      coreSeed: first.coreSeed
    });
  });

  it("requires a previous draft when preserving locked opening fields", () => {
    const generator = new DefaultOpeningGenerator();

    expect(() =>
      generator.generate({
        seed: "oag-c004-missing-previous",
        draftId: "draft_missing_previous",
        rerollIndex: 1,
        locks: { spiritualRootFull: true }
      })
    ).toThrow("previousDraft is required when locking spiritualRootFull");
  });

  it("does not use Math.random in the full opening generator", () => {
    const source = readFileSync("src/opening/OpeningGenerator.ts", "utf8");

    expect(source).not.toContain("Math.random");
  });
});

function rootSignature(draft: ReturnType<DefaultOpeningGenerator["generate"]>): string {
  return JSON.stringify({
    categoryId: draft.spiritualRoot.categoryId,
    elements: draft.spiritualRoot.elements,
    primaryElement: draft.spiritualRoot.primaryElement,
    metrics: {
      purity: draft.spiritualRoot.purity,
      stability: draft.spiritualRoot.stability,
      conflict: draft.spiritualRoot.conflict,
      breadth: draft.spiritualRoot.breadth
    }
  });
}
