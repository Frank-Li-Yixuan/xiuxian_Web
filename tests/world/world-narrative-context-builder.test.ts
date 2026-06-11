import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { loadOriginFateRegistry } from "../../src/originFate/OriginFateRegistry";
import {
  buildWorldNarrativeContext,
  createWorldNarrativeContextBuilder
} from "../../src/world/WorldNarrativeContextBuilder";
import { loadWorldbuildingRegistry } from "../../src/world/WorldbuildingRegistry";

describe("WorldNarrativeContextBuilder", () => {
  it("builds safe prompt fragments with world tags, faction tags, truth level, life phase, and glossary terms", () => {
    const registry = loadWorldbuildingRegistry();
    const fragment = buildWorldNarrativeContext(
      {
        locationIds: ["loc_qingshi_village", "loc_bailu_temple"],
        factionIds: ["faction_qingyun_sect"],
        truthLevel: "dream",
        lifePhase: "childhood",
        visibleOmenAliases: ["safe-thunder-omen"]
      },
      registry
    );

    expect(fragment.safeWorldContext.regionId).toBe(registry.startingRegionId);
    expect(fragment.safeWorldContext.agePhaseId).toBe("childhood");
    expect(fragment.safeWorldContext.locationIds).toEqual(["loc_qingshi_village", "loc_bailu_temple"]);
    expect(fragment.safeWorldContext.allowedTerms).toEqual(expect.arrayContaining(["village", "daoist_temple", "qingyun_sect"]));
    const systemTerms = registry.glossary.preferredTerms.system;
    expect(systemTerms).toBeDefined();
    expect(fragment.safeWorldContext.allowedTerms).toEqual(expect.arrayContaining([...(systemTerms ?? [])]));
    expect(fragment.contextPromptFragment).toContain("truthLevel=dream");
    expect(fragment.contextPromptFragment).toContain("lifePhase=childhood");
    expect(fragment.contextPromptFragment).toContain("locationTags=village");
    expect(fragment.contextPromptFragment).toContain("factionTags=qingyun_sect");
    expect(fragment.fallbackTemplateContext.visibleOmenAliases).toEqual(["safe-thunder-omen"]);
  });

  it("includes forbidden modern term rules and keeps LLM authority limited to prose", () => {
    const fragment = buildWorldNarrativeContext({
      locationIds: ["loc_qingshi_village"],
      truthLevel: "mundane",
      lifePhase: "infancy"
    });

    expect(fragment.systemPromptFragment).toContain("forbidden modern terms");
    expect(fragment.systemPromptFragment).toContain("LLM may polish prose only");
    expect(fragment.systemPromptFragment).toContain("must not decide numeric values");
    expect(fragment.systemPromptFragment).toContain("must not decide events");
    expect(fragment.systemPromptFragment).toContain("must not decide success or failure");
    expect(fragment.systemPromptFragment).toContain("must not emit effects or rewards");
    expect(fragment.systemPromptFragment).toContain("must not request or output hidden trueName");
    expect(fragment.forbiddenTerms).toEqual(
      expect.arrayContaining([...loadWorldbuildingRegistry().eventRules.forbiddenModernTerms])
    );
  });

  it("redacts hidden true names and hidden internal ids from all output fragments", () => {
    const originRegistry = loadOriginFateRegistry();
    const hiddenFate = originRegistry.getHiddenFate("hidden_ancient_thunder_blood");
    const fragment = buildWorldNarrativeContext({
      locationIds: ["loc_qingshi_village"],
      factionIds: ["faction_qingyun_sect"],
      truthLevel: "system_omen",
      lifePhase: "adolescence",
      hiddenTrueNames: [hiddenFate.trueName],
      hiddenInternalIds: [hiddenFate.id],
      visibleOmenAliases: [
        "safe-thunder-omen",
        `unsafe-${hiddenFate.trueName}`,
        `unsafe-${hiddenFate.id}`
      ]
    });
    const serialized = JSON.stringify(fragment);

    expect(serialized).not.toContain(hiddenFate.trueName);
    expect(serialized).not.toContain(hiddenFate.id);
    expect(fragment.fallbackTemplateContext.visibleOmenAliases).toEqual(["safe-thunder-omen"]);
    expect(fragment.safetyFlags).toContain("hidden_term_redacted");
  });

  it("throws readable errors for missing locations and factions", () => {
    const builder = createWorldNarrativeContextBuilder();

    expect(() =>
      builder.build({
        locationIds: ["missing_location"],
        truthLevel: "mundane",
        lifePhase: "infancy"
      })
    ).toThrow("Missing world location: missing_location");
    expect(() =>
      builder.build({
        locationIds: ["loc_qingshi_village"],
        factionIds: ["missing_faction"],
        truthLevel: "mundane",
        lifePhase: "infancy"
      })
    ).toThrow("Missing world faction: missing_faction");
  });

  it("requires at least one location id", () => {
    const builder = createWorldNarrativeContextBuilder();

    expect(() =>
      builder.build({
        locationIds: [],
        truthLevel: "mundane",
        lifePhase: "infancy"
      })
    ).toThrow("World narrative context requires at least one location id");
  });

  it("does not use random, fetch, or a DeepSeek client", () => {
    const source = readFileSync("src/world/WorldNarrativeContextBuilder.ts", "utf8");

    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("DeepSeekNarrativeClient");
  });
});
