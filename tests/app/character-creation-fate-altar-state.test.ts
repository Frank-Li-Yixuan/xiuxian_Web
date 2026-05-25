import { describe, expect, it } from "vitest";

import { GENERATED_UI_ASSET_IDS } from "../../src/assets/generatedUiAssets";
import {
  getDestinyOverlayClasses,
  getRootAuraAssetId,
  getStatAuraCssVars,
  toggleCharacterCreationLock
} from "../../src/app/screens/CharacterCreationFateAltarState";
import type { CharacterCreationLocks, DestinyTraitState, SpiritualRootState } from "../../src/character/CharacterCreationTypes";

describe("character creation fate altar state", () => {
  it("maps spiritual root elements to the correct altar aura asset", () => {
    expect(getRootAuraAssetId(root("root_heavenly_metal", ["metal"]))).toBe(GENERATED_UI_ASSET_IDS.rootAuraMetal);
    expect(getRootAuraAssetId(root("root_heavenly_thunder", ["thunder"]))).toBe(GENERATED_UI_ASSET_IDS.rootAuraThunder);
    expect(getRootAuraAssetId(root("root_future_unknown", ["wind"]))).toBe(GENERATED_UI_ASSET_IDS.rootAuraMixed);
  });

  it("turns high jing qi shen values into nonzero CSS aura variables", () => {
    const vars = getStatAuraCssVars({ jing: 91, qi: 88, shen: 84 });

    expect(Number(vars["--jing-aura"])).toBeGreaterThan(0);
    expect(Number(vars["--qi-aura"])).toBeGreaterThan(0);
    expect(Number(vars["--shen-aura"])).toBeGreaterThan(0);
  });

  it("derives visible destiny overlay classes from trait tags", () => {
    const classes = getDestinyOverlayClasses([
      destiny("destiny_thunder", ["雷法", "剑修"]),
      destiny("flaw_short_life", ["短寿", "劫命"])
    ]);

    expect(classes).toContain("has-thunder-destiny");
    expect(classes).toContain("has-sword-destiny");
    expect(classes).toContain("has-tribulation-destiny");
  });

  it("toggles the selected lock key without changing unrelated locks", () => {
    const locks: CharacterCreationLocks = {
      spiritualRoot: false,
      mainDestiny: false,
      secondaryDestiny0: true,
      secondaryDestiny1: false,
      flawDestiny: false,
      background: false,
      hiddenFate: false
    };

    const next = toggleCharacterCreationLock(locks, "mainDestiny");

    expect(next.mainDestiny).toBe(true);
    expect(next.secondaryDestiny0).toBe(true);
    expect(locks.mainDestiny).toBe(false);
  });
});

function root(rootId: string, elements: readonly string[]): SpiritualRootState {
  return {
    rootId,
    displayName: rootId,
    elements,
    rarity: "common",
    tags: []
  };
}

function destiny(traitId: string, tags: readonly string[]): DestinyTraitState {
  return {
    traitId,
    name: traitId,
    rarity: traitId.startsWith("flaw_") ? "flaw" : "rare",
    tags,
    positiveEffects: [],
    negativeEffects: []
  };
}
