import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import carriedItemNarrativeChainsData from "../../data/origin_fate_v02/carried_item_narrative_chains.v0.2.json";
import hiddenFateDefinitionsData from "../../data/origin_fate_v02/hidden_fate_definitions.v0.2.json";
import omenPhraseBankData from "../../data/origin_fate_v02/omen_phrase_bank.v0.2.json";
import originItemHiddenSynergyRulesData from "../../data/origin_fate_v02/origin_item_hidden_synergy_rules.v0.2.json";
import originStorylineDefinitionsData from "../../data/origin_fate_v02/origin_storyline_definitions.v0.2.json";
import revealStageRulesData from "../../data/origin_fate_v02/reveal_stage_rules.v0.2.json";
import {
  createOriginFateNarrativeRegistry,
  loadOriginFateNarrativeRegistry,
  validateOriginFateNarrativeData
} from "../../src/originFate/OriginFateNarrativeRegistry";

describe("OriginFateNarrativeRegistry", () => {
  it("loads checked-in HFO2 v0.2 data into stable lookup registries", () => {
    const registry = loadOriginFateNarrativeRegistry();

    expect(registry.hiddenFates).toHaveLength(10);
    expect(registry.originStorylines).toHaveLength(6);
    expect(registry.carriedItems).toHaveLength(12);
    expect(registry.revealBands).toHaveLength(6);
    expect(registry.omenPhrases).toHaveLength(10);
    expect(registry.synergyRules).toHaveLength(5);
    expect(registry.getHiddenFate("hidden_ancient_thunder_blood").category).toBe("bloodline");
    expect(registry.getOriginStoryline("origin_apothecary_apprentice").carriedItemBias).toContain(
      "item_apothecary_bronze_furnace"
    );
    expect(registry.getCarriedItemNarrative("item_apothecary_bronze_furnace").lifecycle.map((item) => item.stage)).toEqual(
      expect.arrayContaining(["obtained", "noticed", "converted"])
    );
    expect(registry.getRevealBand("seed").canShowTrueName).toBe(false);
    expect(registry.getRevealBandForProgress(100).id).toBe("awakened");
    expect(registry.getOmenPhrase("omen_thunder_01").tags).toContain("thunder");
    expect(registry.getSynergyRule("synergy_apothecary_furnace_dan_saint").hiddenFateId).toBe(
      "hidden_alchemy_saint_bone"
    );
    expect(Object.isFrozen(registry.hiddenFates)).toBe(true);
    expect(Object.isFrozen(registry.getHiddenFate("hidden_ancient_thunder_blood"))).toBe(true);
    expect(Object.isFrozen(registry.getSynergyRule("synergy_apothecary_furnace_dan_saint").effects[0])).toBe(true);
  });

  it("throws readable errors for missing lookups and missing data files", () => {
    const registry = loadOriginFateNarrativeRegistry();

    expect(() => registry.getHiddenFate("missing_hidden")).toThrow("Missing origin fate v0.2 hidden fate: missing_hidden");
    expect(() => registry.getOriginStoryline("missing_origin")).toThrow(
      "Missing origin fate v0.2 storyline: missing_origin"
    );
    expect(() => registry.getCarriedItemNarrative("missing_item")).toThrow(
      "Missing origin fate v0.2 carried item narrative: missing_item"
    );
    expect(() => registry.getRevealBand("missing_band")).toThrow("Missing origin fate v0.2 reveal band: missing_band");
    expect(() => registry.getOmenPhrase("missing_omen")).toThrow("Missing origin fate v0.2 omen phrase: missing_omen");
    expect(() => registry.getSynergyRule("missing_synergy")).toThrow(
      "Missing origin fate v0.2 synergy rule: missing_synergy"
    );
    expect(() =>
      createOriginFateNarrativeRegistry({
        originStorylines: cloneOriginFateNarrativeData().originStorylines,
        carriedItems: cloneOriginFateNarrativeData().carriedItems,
        revealStageRules: cloneOriginFateNarrativeData().revealStageRules,
        omenPhraseBank: cloneOriginFateNarrativeData().omenPhraseBank,
        synergyRules: cloneOriginFateNarrativeData().synergyRules
      })
    ).toThrow("Missing origin fate narrative data file: hidden_fate_definitions");
  });

  it("validates ids, lifecycle stages, local references, reveal bands, and hidden trueName leaks", () => {
    const invalid = cloneOriginFateNarrativeData();
    invalid.hiddenFates[1].id = invalid.hiddenFates[0].id;
    invalid.hiddenFates[0].omenStages[0].text = invalid.hiddenFates[0].trueName;
    invalid.hiddenFates[2].omenStages[0].band = "missing_band";
    invalid.originStorylines[0].carriedItemBias = [];
    invalid.originStorylines[1].hiddenFateBias[0] = "missing_hidden";
    invalid.carriedItems[0].lifecycle = invalid.carriedItems[0].lifecycle.filter((entry: any) => entry.stage !== "converted");
    invalid.carriedItems[1].preferredHiddenFates[0] = "missing_hidden";
    invalid.revealStageRules.progressBands[1].min = invalid.revealStageRules.progressBands[0].max;
    invalid.omenPhraseBank.phrases[0].id = invalid.omenPhraseBank.phrases[1].id;
    invalid.synergyRules.rules[0].itemId = "missing_item";
    invalid.synergyRules.rules[1].effects[0].target = "missing_hidden";

    const issues = validateOriginFateNarrativeData(invalid as never);
    const joined = issues.join("\n");

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`duplicate origin fate v0.2 hidden fate id: ${invalid.hiddenFates[0].id}`),
        expect.stringContaining("hidden_fate_definitions[0].omenStages[0].text leaks hidden trueName"),
        expect.stringContaining("hidden_fate_definitions[2].omenStages[0].band references unknown reveal band: missing_band"),
        expect.stringContaining("origin_storyline_definitions[0].carriedItemBias must contain at least one item"),
        expect.stringContaining(
          "origin_storyline_definitions[1].hiddenFateBias[0] references missing hidden fate id: missing_hidden"
        ),
        expect.stringContaining("carried_item_narrative_chains[0].lifecycle missing required stage: converted"),
        expect.stringContaining(
          "carried_item_narrative_chains[1].preferredHiddenFates[0] references missing hidden fate id: missing_hidden"
        ),
        expect.stringContaining("reveal_stage_rules.progressBands[1] overlaps previous reveal band"),
        expect.stringContaining(`duplicate origin fate v0.2 omen phrase id: ${invalid.omenPhraseBank.phrases[1].id}`),
        expect.stringContaining(
          "origin_item_hidden_synergy_rules.rules[0].itemId references missing carried item id: missing_item"
        ),
        expect.stringContaining(
          "origin_item_hidden_synergy_rules.rules[1].effects[0].target references missing hidden fate id: missing_hidden"
        )
      ])
    );
    expect(joined).not.toContain(invalid.hiddenFates[0].trueName);
  });

  it("does not use nondeterministic or runtime side-effect APIs in the registry", () => {
    const source = readFileSync("src/originFate/OriginFateNarrativeRegistry.ts", "utf8");

    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("performance.now");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("fetch(");
  });
});

function cloneOriginFateNarrativeData(): any {
  return {
    hiddenFates: structuredClone(hiddenFateDefinitionsData),
    originStorylines: structuredClone(originStorylineDefinitionsData),
    carriedItems: structuredClone(carriedItemNarrativeChainsData),
    revealStageRules: structuredClone(revealStageRulesData),
    omenPhraseBank: structuredClone(omenPhraseBankData),
    synergyRules: structuredClone(originItemHiddenSynergyRulesData)
  };
}
