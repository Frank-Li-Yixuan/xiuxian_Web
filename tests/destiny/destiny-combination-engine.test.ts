import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { DestinyCombinationEngine } from "../../src/characterCreation/destiny/DestinyCombinationEngine";
import { loadDestinyRegistry } from "../../src/characterCreation/destiny/DestinyRegistry";

describe("DestinyCombinationEngine", () => {
  const engine = new DestinyCombinationEngine(loadDestinyRegistry());

  it("detects canonical hard-exclusive destiny combinations", () => {
    expect(engine.hasHardExclusive(["destiny_heaven_jealous_talent", "destiny_late_bloomer"])).toBe(true);
    expect(engine.getHardExclusiveRuleIds(["destiny_heaven_jealous_talent", "destiny_late_bloomer"])).toContain("ex_heaven_late");

    expect(engine.hasHardExclusive(["destiny_turtle_supreme", "destiny_battle_nourished"])).toBe(true);
    expect(engine.getHardExclusiveRuleIds(["destiny_turtle_supreme", "destiny_battle_nourished"])).toContain("ex_turtle_battle");
  });

  it("returns synergy rules and readable synergy warnings", () => {
    const heavenThunder = engine.evaluateTraitIds(["destiny_heaven_jealous_talent", "destiny_thunder_affinity"]);
    expect(heavenThunder.synergies.map((rule) => rule.id)).toContain("syn_heaven_thunder");
    expect(heavenThunder.synergyWarnings.join("\n")).toContain("syn_heaven_thunder");

    const defiantTenacious = engine.evaluateTraitIds(["destiny_waste_root_defiant", "destiny_tenacious"]);
    expect(defiantTenacious.synergies.map((rule) => rule.id)).toContain("syn_defiant_tenacious");
    expect(defiantTenacious.synergyWarnings.join("\n")).toContain("syn_defiant_tenacious");
  });

  it("returns soft conflict and tag conflict warnings", () => {
    const softConflict = engine.evaluateTraitIds(["destiny_alchemy_prodigy", "destiny_artifact_blessed"]);
    expect(softConflict.softConflictRuleIds).toEqual(["ex_alchemy_artifact_core"]);
    expect(softConflict.conflictWarnings.join("\n")).toContain("ex_alchemy_artifact_core");

    const tagConflict = engine.getConflictWarnings(["fire", "yin"]);
    expect(tagConflict.join("\n")).toContain("con_fire_cold");
  });

  it("does not use Math.random in the combination engine", () => {
    const source = readFileSync("src/characterCreation/destiny/DestinyCombinationEngine.ts", "utf8");

    expect(source).not.toContain("Math.random");
  });
});
