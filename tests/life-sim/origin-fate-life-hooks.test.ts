import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import monthlyEventsData from "../../data/life_sim/monthly_events.v0.1.json";
import {
  calculateMonthlyLifeEventWeight,
  createLifeEventContextFromOriginFate,
  createMajorChoiceContextFromOriginFate,
  filterMonthlyLifeEventCandidates,
  getHiddenFateBandForLifeSimulation,
  getLifeEventBiasFromOriginFate,
  shouldAllowHiddenMajorChoiceOptions
} from "../../src/lifeSimulation/OriginFateLifeHooks";
import { DefaultOriginFateGenerator } from "../../src/originFate/OriginFateGenerator";
import type { MonthlyLifeEventDefinition } from "../../src/types/life-monthly-events-types.v0.1";
import type { OriginFateDraft } from "../../src/types/origin-fate-types.v0.1";

const monthlyEvents = (monthlyEventsData as unknown as { readonly events: readonly MonthlyLifeEventDefinition[] }).events;

describe("OriginFateLifeHooks", () => {
  it("merges background, hidden fate, and carried item tags into life event bias", () => {
    const draft = originFateWith({
      seed: "hfo-c006-apothecary",
      backgroundOriginId: "origin_apothecary_apprentice",
      hiddenFateId: "hidden_pill_saint_remains",
      carriedItemIds: ["item_apothecary_bronze_furnace"]
    });

    const bias = getLifeEventBiasFromOriginFate(draft);

    expect(bias.backgroundOriginId).toBe("origin_apothecary_apprentice");
    expect(bias.hiddenFateId).toBe("hidden_pill_saint_remains");
    expect(bias.carriedItemIds).toEqual(["item_apothecary_bronze_furnace"]);
    expect(bias.lifeEventBiasTags).toEqual(
      expect.arrayContaining(["apothecary", "alchemy", "herb", "fire", "wood", "furnace_dream", "alchemy_practice"])
    );
  });

  it("raises alchemy and apothecary monthly event weights for the apothecary bronze furnace", () => {
    const neutral = originFateWith({
      seed: "hfo-c006-neutral",
      backgroundOriginId: "origin_mountain_orphan",
      hiddenFateId: "hidden_merit_seed",
      carriedItemIds: ["origin_item_family_letter"]
    });
    const apothecary = originFateWith({
      seed: "hfo-c006-apothecary-weight",
      backgroundOriginId: "origin_apothecary_apprentice",
      hiddenFateId: "hidden_pill_saint_remains",
      carriedItemIds: ["item_apothecary_bronze_furnace"]
    });
    const cauldronDream = monthlyEvent("m009_dream_of_cauldron");
    const herbSorting = monthlyEvent("m013_herb_sorting");

    expect(calculateMonthlyLifeEventWeight(cauldronDream, createLifeEventContextFromOriginFate(apothecary, { ageMonths: 24 }))).toBeGreaterThan(
      calculateMonthlyLifeEventWeight(cauldronDream, createLifeEventContextFromOriginFate(neutral, { ageMonths: 24 }))
    );
    expect(calculateMonthlyLifeEventWeight(herbSorting, createLifeEventContextFromOriginFate(apothecary, { ageMonths: 72 }))).toBeGreaterThan(
      calculateMonthlyLifeEventWeight(herbSorting, createLifeEventContextFromOriginFate(neutral, { ageMonths: 72 }))
    );
  });

  it("raises thunderstorm monthly event weights for ancient thunder blood", () => {
    const neutral = originFateWith({
      seed: "hfo-c006-neutral-thunder",
      backgroundOriginId: "origin_apothecary_apprentice",
      hiddenFateId: "hidden_pill_saint_remains",
      carriedItemIds: ["origin_item_family_letter"]
    });
    const thunder = originFateWith({
      seed: "hfo-c006-thunder",
      backgroundOriginId: "origin_mountain_orphan",
      hiddenFateId: "hidden_ancient_thunder_blood",
      carriedItemIds: ["origin_item_old_talisman"]
    });
    const birthCry = monthlyEvent("m001_thunder_birth_cry");
    const boneAche = monthlyEvent("m032_thunder_bone_ache");

    expect(calculateMonthlyLifeEventWeight(birthCry, createLifeEventContextFromOriginFate(thunder, { ageMonths: 12 }))).toBeGreaterThan(
      calculateMonthlyLifeEventWeight(birthCry, createLifeEventContextFromOriginFate(neutral, { ageMonths: 12 }))
    );
    expect(filterMonthlyLifeEventCandidates([boneAche], createLifeEventContextFromOriginFate(thunder, { ageMonths: 120 }))).toEqual([boneAche]);
  });

  it("raises night dream, soul, and heart-demon events for the black bone flute", () => {
    const neutral = originFateWith({
      seed: "hfo-c006-neutral-flute",
      backgroundOriginId: "origin_apothecary_apprentice",
      hiddenFateId: "hidden_merit_seed",
      carriedItemIds: ["origin_item_family_letter"]
    });
    const flute = originFateWith({
      seed: "hfo-c006-flute",
      backgroundOriginId: "origin_gravekeeper_child",
      hiddenFateId: "hidden_lunar_remnant_vein",
      carriedItemIds: ["item_black_bone_flute"]
    });
    const shadowMirror = monthlyEvent("m077_shadow_in_mirror");

    expect(filterMonthlyLifeEventCandidates([shadowMirror], createLifeEventContextFromOriginFate(flute, { ageMonths: 144 }))).toEqual([shadowMirror]);
    expect(calculateMonthlyLifeEventWeight(shadowMirror, createLifeEventContextFromOriginFate(flute, { ageMonths: 144 }))).toBeGreaterThan(
      calculateMonthlyLifeEventWeight(shadowMirror, createLifeEventContextFromOriginFate(neutral, { ageMonths: 144 }))
    );
  });

  it("maps hidden fate progress >= 70 into near-awake life-sim gates and major-choice hidden option signals", () => {
    const highProgress = withHiddenProgress(
      originFateWith({
        seed: "hfo-c006-high-progress",
        backgroundOriginId: "origin_mountain_orphan",
        hiddenFateId: "hidden_ancient_thunder_blood",
        carriedItemIds: ["origin_item_old_talisman"]
      }),
      72
    );
    const gatedEvent: MonthlyLifeEventDefinition = {
      ...monthlyEvent("m001_thunder_birth_cry"),
      id: "test_near_awake_hidden_gate",
      ageRangeMonths: [84, 120],
      conditions: [
        {
          kind: "hiddenFateBandAtLeast",
          hiddenFateId: "hidden_ancient_thunder_blood",
          band: "near_awake"
        }
      ]
    };

    expect(getHiddenFateBandForLifeSimulation(highProgress)).toBe("near_awake");
    expect(filterMonthlyLifeEventCandidates([gatedEvent], createLifeEventContextFromOriginFate(highProgress, { ageMonths: 96 }))).toEqual([
      gatedEvent
    ]);
    expect(shouldAllowHiddenMajorChoiceOptions(highProgress)).toBe(true);
    expect(createMajorChoiceContextFromOriginFate(highProgress, { ageMonths: 96, phaseId: "childhood" }).flags).toMatchObject({
      "hiddenFateProgress.hidden_ancient_thunder_blood": 72,
      "hiddenFateBand.hidden_ancient_thunder_blood": "near_awake",
      "hiddenChoiceOptions.enabled": true
    });
  });

  it("does not use Math.random in the origin fate life hook module", () => {
    const source = readFileSync("src/lifeSimulation/OriginFateLifeHooks.ts", "utf8");

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
      progressBand: "nearAwakened"
    }
  };
}

function monthlyEvent(id: string): MonthlyLifeEventDefinition {
  const event = monthlyEvents.find((candidate) => candidate.id === id);
  if (event === undefined) {
    throw new Error(`Missing monthly event fixture: ${id}`);
  }
  return event;
}
