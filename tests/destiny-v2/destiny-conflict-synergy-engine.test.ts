import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { applyDestinyConflictSynergy } from "../../src/destinyV2/DestinyConflictSynergyEngine";
import { loadDestinyV2Registry } from "../../src/destinyV2/DestinyV2Registry";
import type {
  DestinyDefinitionV2,
  HardConflictRule
} from "../../src/types/destiny-eligibility-types.v0.1";

describe("DestinyConflictSynergyEngine", () => {
  it("mutates demon seed and clear glass heart into pure lotus shadow", () => {
    const registry = loadDestinyV2Registry();
    const selected = getDestinies(registry, ["destiny_demon_seed", "destiny_clear_glass_heart"]);

    const result = applyDestinyConflictSynergy(selected, { registry });

    expect(result.finalDestinyIds).toEqual(["destiny_pure_lotus_shadow"]);
    expect(result.removedDestinyIds).toEqual(["destiny_demon_seed", "destiny_clear_glass_heart"]);
    expect(result.mutatedDestinyIds).toEqual(["destiny_pure_lotus_shadow"]);
    expect(result.rerollDestinyIds).toEqual([]);
    expect(result.debugTags).toEqual(
      expect.arrayContaining([
        "hard_conflict:mutate:destiny_demon_seed+destiny_clear_glass_heart->destiny_pure_lotus_shadow"
      ])
    );
  });

  it("removes the later selected destiny and requests reroll for hard conflicts without mutation", () => {
    const registry = loadDestinyV2Registry();

    const heavenLate = applyDestinyConflictSynergy(
      getDestinies(registry, ["destiny_heaven_jealous_talent", "destiny_late_bloomer"]),
      { registry }
    );
    expect(heavenLate.finalDestinyIds).toEqual(["destiny_heaven_jealous_talent"]);
    expect(heavenLate.removedDestinyIds).toEqual(["destiny_late_bloomer"]);
    expect(heavenLate.rerollDestinyIds).toEqual(["destiny_late_bloomer"]);
    expect(heavenLate.conflictWarnings.join("\n")).toContain("destiny_heaven_jealous_talent");
    expect(heavenLate.conflictWarnings.join("\n")).toContain("destiny_late_bloomer");

    const cowardBattle = applyDestinyConflictSynergy(
      getDestinies(registry, ["destiny_battle_nourished", "destiny_cowardly_supreme"]),
      { registry }
    );
    expect(cowardBattle.finalDestinyIds).toEqual(["destiny_battle_nourished"]);
    expect(cowardBattle.removedDestinyIds).toEqual(["destiny_cowardly_supreme"]);
    expect(cowardBattle.rerollDestinyIds).toEqual(["destiny_cowardly_supreme"]);
  });

  it("keeps soft conflicts and records warnings without reroll", () => {
    const registry = loadDestinyV2Registry();

    const result = applyDestinyConflictSynergy(
      getDestinies(registry, ["destiny_alchemy_prodigy", "destiny_artifact_blessed"]),
      { registry }
    );

    expect(result.finalDestinyIds).toEqual(["destiny_alchemy_prodigy", "destiny_artifact_blessed"]);
    expect(result.removedDestinyIds).toEqual([]);
    expect(result.rerollDestinyIds).toEqual([]);
    expect(result.conflictWarnings).toHaveLength(1);
    expect(result.warnings).toEqual(result.conflictWarnings);
  });

  it("keeps synergies and exposes synergy names, tags, and warnings", () => {
    const registry = loadDestinyV2Registry();

    const result = applyDestinyConflictSynergy(
      getDestinies(registry, ["destiny_heaven_jealous_talent", "destiny_thunder_tribulation_affinity"]),
      { registry }
    );

    expect(result.finalDestinyIds).toEqual([
      "destiny_heaven_jealous_talent",
      "destiny_thunder_tribulation_affinity"
    ]);
    expect(result.synergies.map((synergy) => synergy.name)).toContain("慧光引雷");
    expect(result.synergyTags).toEqual(["tribulation_reward_up", "thunder_omen_up"]);
    expect(result.synergyWarnings.join("\n")).toContain("慧光引雷");
    expect(result.warnings).toEqual(result.synergyWarnings);
  });

  it("deduplicates selected destinies, applies multiple rules in data order, and stays deterministic", () => {
    const registry = loadDestinyV2Registry();
    const selected = getDestinies(registry, [
      "destiny_heaven_jealous_talent",
      "destiny_heaven_jealous_talent",
      "destiny_thunder_tribulation_affinity",
      "destiny_alchemy_prodigy",
      "destiny_artifact_blessed"
    ]);
    const selectedBefore = structuredClone(selected);

    const first = applyDestinyConflictSynergy(selected, { registry });
    const second = applyDestinyConflictSynergy(selected, { registry });

    expect(first).toEqual(second);
    expect(selected).toEqual(selectedBefore);
    expect(first.finalDestinyIds).toEqual([
      "destiny_heaven_jealous_talent",
      "destiny_thunder_tribulation_affinity",
      "destiny_alchemy_prodigy",
      "destiny_artifact_blessed"
    ]);
    expect(first.synergyTags).toEqual(["tribulation_reward_up", "thunder_omen_up"]);
    expect(first.conflictWarnings).toHaveLength(1);
  });

  it("falls back to removing the later candidate when a hard-conflict mutation target is missing", () => {
    const registry = loadDestinyV2Registry();
    const rules: readonly HardConflictRule[] = [
      {
        a: "destiny_demon_seed",
        b: "destiny_clear_glass_heart",
        mutation: "missing_mutation_target",
        reason: "fixture missing target"
      }
    ];

    const result = applyDestinyConflictSynergy(
      getDestinies(registry, ["destiny_clear_glass_heart", "destiny_demon_seed"]),
      {
        registry,
        hardConflicts: rules,
        softConflicts: [],
        synergies: []
      }
    );

    expect(result.finalDestinyIds).toEqual(["destiny_clear_glass_heart"]);
    expect(result.removedDestinyIds).toEqual(["destiny_demon_seed"]);
    expect(result.rerollDestinyIds).toEqual(["destiny_demon_seed"]);
    expect(result.mutatedDestinyIds).toEqual([]);
    expect(result.debugTags).toEqual(expect.arrayContaining(["hard_conflict:missing_mutation_target:missing_mutation_target"]));
  });

  it("does not use nondeterministic or runtime side-effect APIs in the engine", () => {
    const source = readFileSync("src/destinyV2/DestinyConflictSynergyEngine.ts", "utf8");

    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("performance.now");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("trueName");
  });
});

function getDestinies(
  registry: { getDestiny(id: string): DestinyDefinitionV2 },
  ids: readonly string[]
): readonly DestinyDefinitionV2[] {
  return ids.map((id) => registry.getDestiny(id));
}
