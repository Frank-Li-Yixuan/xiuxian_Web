import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildMisdirectionCandidates,
  buildPublicOmenView,
  canRevealTrueName,
  getRevealBand
} from "../../src/originFate/RevealMisdirectionEngine";
import { loadOriginFateNarrativeRegistry } from "../../src/originFate/OriginFateNarrativeRegistry";
import type { HiddenFateNarrativeStateV02 } from "../../src/types/origin-fate-narrative-types.v0.2";

describe("RevealMisdirectionEngine", () => {
  it("maps progress values to reveal bands and rejects non-finite progress", () => {
    const registry = loadOriginFateNarrativeRegistry();

    expect(getRevealBand(0, { registry }).id).toBe("seed");
    expect(getRevealBand(20, { registry }).id).toBe("omen");
    expect(getRevealBand(40, { registry }).id).toBe("stirring");
    expect(getRevealBand(60, { registry }).id).toBe("halfReveal");
    expect(getRevealBand(80, { registry }).id).toBe("nearAwake");
    expect(getRevealBand(100, { registry }).id).toBe("awakened");
    expect(() => getRevealBand(Number.NaN, { registry })).toThrow("origin fate v0.2 reveal progress must be a finite number");
  });

  it("builds a character creation omen view without exact progress or hidden true names", () => {
    const registry = loadOriginFateNarrativeRegistry();
    const hiddenFate = registry.getHiddenFate("hidden_ancient_thunder_blood");
    const state = makeHiddenState({
      progress: 60,
      revealBand: "halfReveal",
      misleadingOmenIds: ["mislead_thunder_tribulation"]
    });
    const before = structuredClone(state);

    const first = buildPublicOmenView(state, {
      registry,
      surface: "characterCreation"
    });
    const second = buildPublicOmenView(state, {
      registry,
      surface: "characterCreation"
    });

    expect(second).toEqual(first);
    expect(state).toEqual(before);
    expect(first.surface).toBe("characterCreation");
    expect(first.revealBand).toBe("halfReveal");
    expect(first.revealBandLabel?.length).toBeGreaterThan(0);
    expect(first.omenLines.length).toBeGreaterThan(0);
    expect(first.omenLines.length).toBeLessThanOrEqual(2);
    expect(first.exactProgress).toBeUndefined();
    expect(first.revealedName).toBeUndefined();
    expect(first.misdirectionLines).toContain("misdirection:thunder");
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.omenLines)).toBe(true);
    expect(JSON.stringify(first)).not.toContain(hiddenFate.trueName);
    expect(JSON.stringify(first)).not.toContain("trueName");
    expect(JSON.stringify(first)).not.toContain("60");
  });

  it("builds a monthly log view with only safe narrative text", () => {
    const registry = loadOriginFateNarrativeRegistry();
    const hiddenFate = registry.getHiddenFate("hidden_ancient_thunder_blood");

    const view = buildPublicOmenView(
      makeHiddenState({
        progress: 60,
        revealBand: "halfReveal",
        misleadingOmenIds: ["mislead_thunder_tribulation"]
      }),
      {
        registry,
        surface: "monthlyLog"
      }
    );
    const monthlyLogLike = {
      visibleText: view.omenLines.join("\n"),
      hooks: view.misdirectionLines
    };

    expect(view.surface).toBe("monthlyLog");
    expect(view.revealBand).toBeUndefined();
    expect(view.revealBandLabel).toBeUndefined();
    expect(view.exactProgress).toBeUndefined();
    expect(view.revealedName).toBeUndefined();
    expect(JSON.stringify(view)).not.toContain("halfReveal");
    expect(JSON.stringify(monthlyLogLike)).not.toContain(hiddenFate.trueName);
    expect(JSON.stringify(monthlyLogLike)).not.toContain(hiddenFate.id);
    expect(JSON.stringify(monthlyLogLike)).not.toContain("halfReveal");
    expect(JSON.stringify(monthlyLogLike)).not.toContain("60");
  });

  it("builds a major choice view with vague destiny hints but no hidden name leak", () => {
    const registry = loadOriginFateNarrativeRegistry();
    const hiddenFate = registry.getHiddenFate("hidden_ancient_thunder_blood");

    const view = buildPublicOmenView(
      makeHiddenState({
        progress: 80,
        revealBand: "nearAwake",
        misleadingOmenIds: ["mislead_thunder_tribulation"]
      }),
      {
        registry,
        surface: "majorChoice",
        signalTags: ["thunder", "bone_heat"]
      }
    );
    const pendingChoiceLike = {
      sourceHooks: view.misdirectionLines,
      options: [
        {
          visibleHints: view.destinyOptionHints
        }
      ]
    };

    expect(view.revealBand).toBe("nearAwake");
    expect(view.destinyOptionHints).toEqual(expect.arrayContaining(["destiny_option_hint:thunder"]));
    expect(view.exactProgress).toBeUndefined();
    expect(view.revealedName).toBeUndefined();
    expect(JSON.stringify(pendingChoiceLike)).not.toContain(hiddenFate.trueName);
    expect(JSON.stringify(pendingChoiceLike)).not.toContain("trueName");
  });

  it("allows hidden names only on resolved age18 views", () => {
    const registry = loadOriginFateNarrativeRegistry();
    const hiddenFate = registry.getHiddenFate("hidden_ancient_thunder_blood");
    const unresolved = makeHiddenState({
      progress: 100,
      revealBand: "awakened",
      trueNameRevealed: false
    });
    const resolved = makeHiddenState({
      progress: 100,
      revealBand: "awakened",
      trueNameRevealed: true
    });

    expect(canRevealTrueName(unresolved, { registry, surface: "age18" })).toBe(false);
    expect(canRevealTrueName(resolved, { registry, surface: "age18" })).toBe(true);
    expect(buildPublicOmenView(unresolved, { registry, surface: "age18" }).revealedName).toBeUndefined();
    expect(buildPublicOmenView(resolved, { registry, surface: "age18" }).revealedName).toBe(hiddenFate.trueName);
    expect(buildPublicOmenView(unresolved, { registry, surface: "age18", age18Resolved: true }).revealedName).toBe(
      hiddenFate.trueName
    );
    expect(buildPublicOmenView(resolved, { registry, surface: "characterCreation" }).revealedName).toBeUndefined();
  });

  it("builds deterministic misdirection candidates from signal tags", () => {
    const registry = loadOriginFateNarrativeRegistry();

    const first = buildMisdirectionCandidates(["thunder", "bone_heat"], { registry });
    const second = buildMisdirectionCandidates(["thunder", "bone_heat"], { registry });

    expect(second).toEqual(first);
    expect(first).toEqual([
      expect.objectContaining({
        ruleId: "mislead_thunder_tribulation",
        signals: ["thunder", "bone_heat", "heaven_attention"],
        matchedSignals: ["thunder", "bone_heat"],
        possibleTruthIds: expect.arrayContaining([
          "hidden_ancient_thunder_blood",
          "destiny_thunder_affinity"
        ])
      })
    ]);
    expect(buildMisdirectionCandidates(["unknown_signal"], { registry })).toEqual([]);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first[0])).toBe(true);
  });

  it("does not use nondeterministic or runtime side-effect APIs in the reveal engine", () => {
    const source = readFileSync("src/originFate/RevealMisdirectionEngine.ts", "utf8");

    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("performance.now");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("${hiddenFate.trueName}");
    expect(source).not.toContain("trueName:");
  });
});

function makeHiddenState(options: {
  readonly progress: number;
  readonly revealBand: HiddenFateNarrativeStateV02["revealBand"];
  readonly trueNameRevealed?: boolean;
  readonly misleadingOmenIds?: readonly string[];
}): HiddenFateNarrativeStateV02 {
  return {
    hiddenFateId: "hidden_ancient_thunder_blood",
    progress: options.progress,
    revealBand: options.revealBand,
    knownToPlayer: true,
    trueNameRevealed: options.trueNameRevealed ?? false,
    misleadingOmenIds: options.misleadingOmenIds ?? [],
    omenHistory: []
  };
}
