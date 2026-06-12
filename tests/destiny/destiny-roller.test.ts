import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import qualityTablesData from "../../data/destiny/quality_tables.v0.1.json";
import { DestinyCombinationEngine } from "../../src/characterCreation/destiny/DestinyCombinationEngine";
import { createDestinyRegistry, loadDestinyRegistry } from "../../src/characterCreation/destiny/DestinyRegistry";
import {
  DefaultDestinyRoller,
  generateDestinyRollDraft
} from "../../src/characterCreation/destiny/DestinyRoller";
import { evaluateNinePalace } from "../../src/ninePalace/NinePalaceScoring";
import type {
  DestinyDataBundle,
  DestinyQuality,
  DestinyQualityDefinition,
  DestinyRollDraft,
  FateMeterState
} from "../../src/types/destiny-types.v0.1";
import type { OpeningInnateDraft } from "../../src/types/opening-generator-types.v0.1";

describe("DestinyRoller", () => {
  it("generates reproducible destiny selections for the same seed and opening tags", () => {
    const input = {
      seed: "dt-c002-repro",
      draftId: "draft_destiny_repro",
      rerollIndex: 0,
      openingInnateDraft: makeOpeningDraft(["destinyBias:tribulation_affinity"])
    };

    const first = generateDestinyRollDraft(input);
    const second = generateDestinyRollDraft(input);

    expect(second).toEqual(first);
    expect(first.destinies.main.quality).not.toBe("mortal");
    expect(first.destinies.secondary).toHaveLength(2);
    expect(first.destinies.flaw.quality).toBe("flaw");
    expect(first.destinies.flaw.slotTypes).toEqual(["flaw"]);
    expect(Object.isFrozen(first.destinies.main)).toBe(true);
  });

  it("runs 1000 deterministic rolls without hard-exclusive collisions or invalid slots", () => {
    const roller = new DefaultDestinyRoller();
    const registry = loadDestinyRegistry();
    const engine = new DestinyCombinationEngine(registry);

    for (let index = 0; index < 1_000; index += 1) {
      const draft = roller.generate({
        seed: `dt-c002-smoke-${index}`,
        draftId: `draft_${index}`,
        rerollIndex: index,
        openingInnateDraft: makeOpeningDraft(index % 2 === 0 ? ["destinyBias:tribulation_affinity"] : [])
      });
      const traitIds = getTraitIds(draft);

      expect(draft.destinies.main.slotTypes).toContain("main");
      expect(draft.destinies.main.quality).not.toBe("mortal");
      expect(draft.destinies.secondary.every((trait) => trait.slotTypes.includes("secondary"))).toBe(true);
      expect(draft.destinies.flaw.slotTypes).toEqual(["flaw"]);
      expect(new Set(traitIds).size).toBe(traitIds.length);
      expect(engine.hasHardExclusive(traitIds)).toBe(false);
    }
  });

  it("surfaces synergyWarnings and conflictWarnings through the combination engine", () => {
    const registry = createDestinyRegistry(makeCombinationFixture());
    const roller = new DefaultDestinyRoller(registry);

    const synergyDraft = roller.generate({
      seed: "dt-c003-synergy",
      draftId: "draft_dt_c003_synergy",
      rerollIndex: 0,
      openingInnateDraft: makeOpeningDraft(["destinyBias:tribulation_affinity"])
    });
    expect(getTraitIds(synergyDraft)).toEqual([
      "destiny_heaven_jealous_talent",
      "destiny_thunder_affinity",
      "destiny_artifact_blessed",
      "flaw_minor"
    ]);
    expect(synergyDraft.destinies.synergies.map((rule) => rule.id)).toEqual(["syn_heaven_thunder"]);
    expect(synergyDraft.destinies.synergyWarnings.join("\n")).toContain("syn_heaven_thunder");
    expect(synergyDraft.destinies.warnings.join("\n")).toContain("syn_heaven_thunder");

    const softConflictRoller = new DefaultDestinyRoller(createDestinyRegistry(makeSoftConflictFixture()));
    const softConflictDraft = softConflictRoller.generate({
      seed: "dt-c003-soft-conflict",
      draftId: "draft_dt_c003_soft_conflict",
      rerollIndex: 0
    });
    expect(getTraitIds(softConflictDraft)).toEqual([
      "destiny_alchemy_prodigy",
      "destiny_artifact_blessed",
      "destiny_fire_yin_bridge",
      "flaw_minor"
    ]);
    expect(softConflictDraft.destinies.softConflicts).toEqual(["ex_alchemy_artifact_core"]);
    expect(softConflictDraft.destinies.conflictWarnings.join("\n")).toContain("ex_alchemy_artifact_core");
    expect(softConflictDraft.destinies.conflictWarnings.join("\n")).toContain("con_fire_cold");
    expect(softConflictDraft.destinies.warnings.join("\n")).toContain("con_fire_cold");
  });

  it("rejects locked previous drafts that already contain hard-exclusive destiny traits", () => {
    const registry = createDestinyRegistry(makeLockedHardExclusiveFixture());
    const roller = new DefaultDestinyRoller(registry);
    const previousDraft = makePreviousHardExclusiveDraft(registry);

    expect(() =>
      roller.generate({
        seed: "dt-c003-locked-exclusive",
        draftId: "draft_dt_c003_locked_exclusive",
        rerollIndex: 1,
        locks: {
          mainDestiny: true,
          secondaryDestiny0: true,
          secondaryDestiny1: true,
          flawDestiny: true
        },
        previousDraft
      })
    ).toThrow("Locked destiny traits contain hard-exclusive rules: ex_heaven_late");
  });

  it("keeps main quality distribution close to the data quality table", () => {
    const roller = new DefaultDestinyRoller();
    const registry = loadDestinyRegistry();
    const sampleCount = 6_000;
    const counts = new Map<DestinyQuality, number>();

    for (let index = 0; index < sampleCount; index += 1) {
      const draft = roller.generate({
        seed: `dt-c002-quality-${index}`,
        draftId: `draft_quality_${index}`,
        rerollIndex: index
      });
      counts.set(draft.destinies.main.quality, (counts.get(draft.destinies.main.quality) ?? 0) + 1);
    }

    const expected = normalizeAvailableQualityWeights("main", registry.getTraitsForSlot("main"), registry);
    for (const [quality, expectedRate] of Object.entries(expected)) {
      const observedRate = (counts.get(quality as DestinyQuality) ?? 0) / sampleCount;

      expect(observedRate).toBeGreaterThan(0);
      expect(Math.abs(observedRate - expectedRate)).toBeLessThan(Math.max(0.025, expectedRate * 0.35));
    }
    expect(counts.has("mortal")).toBe(false);
  });

  it("uses OpeningInnateDraft destiny bias tags to increase related trait weights", () => {
    const roller = new DefaultDestinyRoller();
    const sampleCount = 512;
    let neutralThunderSelections = 0;
    let biasedThunderSelections = 0;

    for (let index = 0; index < sampleCount; index += 1) {
      const neutral = roller.generate({
        seed: `dt-c002-bias-${index}`,
        draftId: `draft_bias_neutral_${index}`,
        rerollIndex: index,
        openingInnateDraft: makeOpeningDraft([])
      });
      const biased = roller.generate({
        seed: `dt-c002-bias-${index}`,
        draftId: `draft_bias_tagged_${index}`,
        rerollIndex: index,
        openingInnateDraft: makeOpeningDraft(["destinyBias:tribulation_affinity"])
      });

      neutralThunderSelections += countThunderDestinies(neutral);
      biasedThunderSelections += countThunderDestinies(biased);
    }

    expect(biasedThunderSelections).toBeGreaterThan(neutralThunderSelections * 1.5);
  });

  it("preserves locked destiny fields while rerolling unlocked slots", () => {
    const roller = new DefaultDestinyRoller();
    const first = roller.generate({
      seed: "dt-c002-locks",
      draftId: "draft_locks",
      rerollIndex: 0
    });

    const rerolled = roller.generate({
      seed: "dt-c002-locks",
      draftId: "draft_locks",
      rerollIndex: 1,
      locks: {
        mainDestiny: true,
        flawDestiny: true
      },
      previousDraft: first
    });

    expect(rerolled.destinies.main).toEqual(first.destinies.main);
    expect(rerolled.destinies.flaw).toEqual(first.destinies.flaw);
    expect(rerolled.locks).toEqual({
      mainDestiny: true,
      flawDestiny: true
    });
    expect(destinySignature(rerolled)).not.toBe(destinySignature(first));
    expect(() =>
      roller.generate({
        seed: "dt-c002-locks",
        draftId: "draft_locks",
        rerollIndex: 2,
        locks: { mainDestiny: true }
      })
    ).toThrow("previousDraft is required when locking mainDestiny");
  });

  it("advances and spends the fate meter to boost low-quality main destiny rolls", () => {
    const registry = createDestinyRegistry(makeFateMeterFixture());
    const roller = new DefaultDestinyRoller(registry);

    const lowQuality = roller.generate({
      seed: "dt-c002-fate-low",
      draftId: "draft_fate_low",
      rerollIndex: 0,
      fateMeter: { value: 0, guaranteeRareNext: false }
    });
    expect(lowQuality.destinies.main.quality).toBe("good");
    expect(lowQuality.fateMeter.value).toBe(1);

    const guaranteed = roller.generate({
      seed: "dt-c002-fate-guarantee",
      draftId: "draft_fate_guarantee",
      rerollIndex: 1,
      fateMeter: { value: registry.rerollRules.fateMeter.thresholdGuaranteeRare, guaranteeRareNext: true }
    });
    expect(guaranteed.destinies.main.quality).toBe("rare");
    expect(guaranteed.debug.fateMeterBefore.guaranteeRareNext).toBe(true);
    expect(guaranteed.fateMeter.value).toBe(2);
  });

  it("does not use Math.random in the destiny roller", () => {
    const source = readFileSync("src/characterCreation/destiny/DestinyRoller.ts", "utf8");

    expect(source).not.toContain("Math.random");
  });
});

function getTraitIds(draft: DestinyRollDraft): readonly string[] {
  return [draft.destinies.main.id, ...draft.destinies.secondary.map((trait) => trait.id), draft.destinies.flaw.id];
}

function destinySignature(draft: DestinyRollDraft): string {
  return JSON.stringify(getTraitIds(draft));
}

function countThunderDestinies(draft: DestinyRollDraft): number {
  return [draft.destinies.main, ...draft.destinies.secondary, draft.destinies.flaw].filter((trait) =>
    trait.tags.some((tag) => tag === "thunder" || tag === "tribulation")
  ).length;
}

function normalizeAvailableQualityWeights(
  table: "main" | "secondary",
  traits: readonly { readonly quality: DestinyQuality }[],
  _registry: ReturnType<typeof loadDestinyRegistry>
): Readonly<Record<string, number>> {
  const available = new Set(traits.map((trait) => trait.quality));
  const qualityWeights = qualityTablesData.qualityWeights[table];
  const filtered = Object.fromEntries(
    Object.entries(qualityWeights).filter(([quality, weight]) => available.has(quality as DestinyQuality) && weight > 0)
  );
  const total = Object.values(filtered).reduce((sum, weight) => sum + weight, 0);

  return Object.fromEntries(Object.entries(filtered).map(([quality, weight]) => [quality, weight / total]));
}

function makeOpeningDraft(destinyBiasTags: readonly string[]): OpeningInnateDraft {
  const attributes = {
    jing: 12,
    qi: 12,
    shen: 12,
    rootBone: 50,
    comprehension: 50,
    inspiration: 50,
    fortune: 50,
    heart: 50,
    lifespan: 50
  };

  return {
    draftId: "opening_draft_for_destiny",
    seed: "opening-seed",
    rerollIndex: 0,
    archetype: {
      id: "test_archetype",
      name: "test",
      description: "test",
      tags: []
    },
    aptitude: {
      rootBone: attributes.rootBone,
      comprehension: attributes.comprehension,
      inspiration: attributes.inspiration,
      fortune: attributes.fortune,
      heart: attributes.heart,
      lifespan: attributes.lifespan
    },
    coreSeed: {
      jing: attributes.jing,
      qi: attributes.qi,
      shen: attributes.shen
    },
    spiritualRoot: {
      categoryId: "dual",
      displayName: "test root",
      elements: { thunder: 60, fire: 40 },
      primaryElement: "thunder",
      secondaryElements: ["fire"],
      purity: 70,
      stability: 60,
      conflict: 40,
      breadth: 55,
      relationTags: [],
      tags: ["root:thunder"]
    },
    growthBias: {
      jingGrowth: 1,
      qiGrowth: 1,
      shenGrowth: 1,
      studyBias: 1,
      martialBias: 1,
      alchemyBias: 1,
      artifactBias: 1,
      seclusionBias: 1,
      adventureBias: 1
    },
    tags: {
      destinyBiasTags,
      lifeEventBiasTags: [],
      modeBiasTags: [],
      hiddenFateBiasTags: []
    },
    ninePalaceEvaluation: evaluateNinePalace(attributes),
    distinctivenessScore: 2
  };
}

function makeFateMeterFixture(): DestinyDataBundle {
  const goodQuality = makeQuality("good", 2);
  const rareQuality = makeQuality("rare", 3);
  const mortalQuality = makeQuality("mortal", 1);

  return {
    qualityTables: {
      version: "test",
      qualities: [mortalQuality, goodQuality, rareQuality],
      qualityWeights: {
        main: { good: 1, rare: 0 },
        secondary: { mortal: 1 },
        flawSeverity: { minor: 1 }
      },
      budgetCostReference: []
    },
    destinyTraits: {
      version: "test",
      traits: [
        makeTrait("destiny_good_main", "good", ["main"], ["plain"]),
        makeTrait("destiny_rare_main", "rare", ["main"], ["rare"]),
        makeTrait("destiny_mortal_secondary_a", "mortal", ["secondary"], ["plain"]),
        makeTrait("destiny_mortal_secondary_b", "mortal", ["secondary"], ["plain"]),
        makeTrait("flaw_minor", "flaw", ["flaw"], ["plain"], "minor")
      ]
    },
    conflictSynergyRules: {
      version: "test",
      exclusiveRules: [],
      synergyRules: [],
      conflictRules: []
    },
    rerollRules: {
      version: "test",
      freeReroll: true,
      initialLocks: 2,
      initialDivinationTokens: 1,
      maxLockedFields: 2,
      lockableFields: ["mainDestiny", "secondaryDestiny0", "secondaryDestiny1", "flawDestiny"],
      advancedLockableFields: [],
      fateMeter: {
        initial: 0,
        noRareOrAboveDelta: 1,
        rareDelta: -2,
        mysticOrAboveReset: true,
        thresholdBoost: 2,
        thresholdGuaranteeRare: 4,
        boostRule: "test"
      },
      highQualityLimits: {
        maxEarthlyOrAbovePerDraft: 1,
        allowSecondEarthlyOrAboveWithDivination: false,
        maxForbiddenPerDraft: 1
      },
      rerollHistory: {
        recordLast: 20,
        repetitionPenalty: 0.5
      }
    }
  };
}

function makeCombinationFixture(): DestinyDataBundle {
  const base = makeFateMeterFixture();
  return {
    ...base,
    destinyTraits: {
      version: "test",
      traits: [
    makeTrait("destiny_heaven_jealous_talent", "heavenly", ["main"], ["tribulation"]),
    makeTrait("destiny_alchemy_prodigy", "mystic", ["main"], ["alchemy", "fire"]),
    makeTrait("destiny_thunder_affinity", "mystic", ["secondary"], ["thunder"]),
    makeTrait("destiny_artifact_blessed", "mystic", ["secondary"], ["artifact"]),
    makeTrait("destiny_fire_yin_bridge", "good", ["secondary"], ["fire", "yin"]),
    makeTrait("flaw_minor", "flaw", ["flaw"], ["plain"], "minor")
      ]
    },
    qualityTables: {
      ...base.qualityTables!,
      qualities: [makeQuality("good", 2), makeQuality("mystic", 4), makeQuality("heavenly", 6)],
      qualityWeights: {
        main: { mystic: 1, heavenly: 1_000 },
        secondary: { mystic: 1_000, good: 1 },
        flawSeverity: { minor: 1 }
      }
    },
    conflictSynergyRules: {
      version: "test",
      exclusiveRules: [
        {
          id: "ex_alchemy_artifact_core",
          traits: ["destiny_alchemy_prodigy", "destiny_artifact_blessed"],
          soft: true,
          reason: "alchemy and artifact production both want the core slot"
        }
      ],
      synergyRules: [
        {
          id: "syn_heaven_thunder",
          traits: ["destiny_heaven_jealous_talent", "destiny_thunder_affinity"],
          name: "heaven thunder",
          description: "heaven jealousy resonates with thunder",
          effects: ["tribulationPower +1"]
        }
      ],
      conflictRules: [
        {
          id: "con_fire_cold",
          tags: ["fire", "yin"],
          description: "fire and yin conflict"
        }
      ]
    }
  };
}

function makeLockedHardExclusiveFixture(): DestinyDataBundle {
  const base = makeCombinationFixture();
  return {
    ...base,
    destinyTraits: {
      version: "test",
      traits: [
        makeTrait("destiny_heaven_jealous_talent", "heavenly", ["main"], ["tribulation"]),
        makeTrait("destiny_late_bloomer", "mystic", ["secondary"], ["growth"]),
        makeTrait("destiny_thunder_affinity", "mystic", ["secondary"], ["thunder"]),
        makeTrait("flaw_minor", "flaw", ["flaw"], ["plain"], "minor")
      ]
    },
    conflictSynergyRules: {
      version: "test",
      exclusiveRules: [
        {
          id: "ex_heaven_late",
          traits: ["destiny_heaven_jealous_talent", "destiny_late_bloomer"],
          reason: "early genius cannot be late bloomer"
        }
      ],
      synergyRules: [],
      conflictRules: []
    }
  };
}

function makeSoftConflictFixture(): DestinyDataBundle {
  const base = makeFateMeterFixture();
  return {
    ...base,
    destinyTraits: {
      version: "test",
      traits: [
        makeTrait("destiny_alchemy_prodigy", "mystic", ["main"], ["alchemy", "fire"]),
        makeTrait("destiny_artifact_blessed", "mystic", ["secondary"], ["artifact"]),
        makeTrait("destiny_fire_yin_bridge", "good", ["secondary"], ["fire", "yin"]),
        makeTrait("flaw_minor", "flaw", ["flaw"], ["plain"], "minor")
      ]
    },
    qualityTables: {
      ...base.qualityTables!,
      qualities: [makeQuality("good", 2), makeQuality("mystic", 4)],
      qualityWeights: {
        main: { mystic: 1 },
        secondary: { mystic: 1_000, good: 1 },
        flawSeverity: { minor: 1 }
      }
    },
    conflictSynergyRules: {
      version: "test",
      exclusiveRules: [
        {
          id: "ex_alchemy_artifact_core",
          traits: ["destiny_alchemy_prodigy", "destiny_artifact_blessed"],
          soft: true,
          reason: "alchemy and artifact production both want the core slot"
        }
      ],
      synergyRules: [],
      conflictRules: [
        {
          id: "con_fire_cold",
          tags: ["fire", "yin"],
          description: "fire and yin conflict"
        }
      ]
    }
  };
}

function makePreviousHardExclusiveDraft(registry: ReturnType<typeof createDestinyRegistry>): DestinyRollDraft {
  return {
    draftId: "previous_locked_exclusive",
    seed: "previous",
    rerollIndex: 0,
    destinies: {
      main: registry.getTrait("destiny_heaven_jealous_talent"),
      secondary: [registry.getTrait("destiny_late_bloomer"), registry.getTrait("destiny_thunder_affinity")],
      flaw: registry.getTrait("flaw_minor"),
      synergies: [],
      softConflicts: [],
      synergyWarnings: [],
      conflictWarnings: [],
      warnings: []
    },
    fateMeter: { value: 0, guaranteeRareNext: false },
    debug: {
      attempts: 0,
      rejectedByExclusive: [],
      selectedWeights: {},
      fateMeterBefore: { value: 0, guaranteeRareNext: false },
      fateMeterAfter: { value: 0, guaranteeRareNext: false }
    }
  };
}

function makeQuality(id: Exclude<DestinyQuality, "flaw">, rank: number): DestinyQualityDefinition {
  return {
    id,
    name: id,
    rank,
    positiveBudget: [1, 2],
    negativeBudget: [0, 1],
    frameAsset: `destiny_card_${id}`,
    color: "#ffffff"
  };
}

function makeTrait(
  id: string,
  quality: DestinyQuality,
  slotTypes: readonly ("main" | "secondary" | "flaw")[],
  tags: readonly string[],
  calamitySeverity?: "minor" | "medium" | "major" | "death"
) {
  return {
    id,
    name: id,
    quality,
    slotTypes,
    ...(calamitySeverity === undefined ? {} : { calamitySeverity }),
    tags,
    description: id,
    positiveEffects: [],
    negativeEffects: [],
    modifiers: {},
    baseWeight: 100
  };
}
