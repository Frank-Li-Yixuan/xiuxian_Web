import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DevCombatAssetPlaygroundScreen } from "../../src/app/screens/DevCombatAssetPlaygroundScreen";

describe("dev combat asset playground", () => {
  it("routes /dev/combat-asset-playground through the React entrypoint", () => {
    const mainSource = readFileSync("src/app/main.tsx", "utf8");

    expect(mainSource).toContain("/dev/combat-asset-playground");
    expect(mainSource).toContain("DevCombatAssetPlaygroundScreen");
  });

  it("SSR-renders projectile, pickup, impact, ability, entity sprite, and 100 enemy bullet playground controls", () => {
    const markup = renderToStaticMarkup(createElement(DevCombatAssetPlaygroundScreen));

    expect(markup).toContain("dev-combat-asset-playground-screen");
    expect(markup).toContain("Combat Asset Playground");
    expect(markup).toContain("100 enemy bullets");
    expect(markup).toContain("Projectile skins");
    expect(markup).toContain("Pickup magnet");
    expect(markup).toContain("Impact / death VFX");
    expect(markup).toContain("Spell / Artifact / Pill / Treasure VFX");
    expect(markup).toContain("Entity Sprite Animation");
    expect(markup).toContain("projectile_hit");
    expect(markup).toContain("enemy_damaged");
    expect(markup).toContain("enemy_killed");
    expect(markup).toContain("elite_killed");
    expect(markup).toContain("player_hit");
    expect(markup).toContain("shield_break");
    expect(markup).toContain("boss_phase_changed");
    expect(markup).toContain("boss_killed");
    expect(markup).toContain("spell_five_thunder");
    expect(markup).toContain("spell_bagua_sword_ring");
    expect(markup).toContain("spell_red_lotus_fire");
    expect(markup).toContain("spell_sleeve_universe");
    expect(markup).toContain("artifact_qingshuang_sword");
    expect(markup).toContain("artifact_ziyang_gourd");
    expect(markup).toContain("artifact_xuanyue_seal");
    expect(markup).toContain("pill_rejuvenation");
    expect(markup).toContain("pill_burning_blood");
    expect(markup).toContain("pill_clear_mind");
    expect(markup).toContain("pill_minor_breakthrough");
    expect(markup).toContain("treasure_minor_sword_array");
    expect(markup).toContain("treasure_bagua_jade");
    expect(markup).toContain("treasure_gold_toad");
    expect(markup).toContain("treasure_tongxin_lock");
    expect(markup).toContain("entity.player.cultivator_01");
    expect(markup).toContain("entity.player.soul_01");
    expect(markup).toContain("entity.enemy.mountain_imp_01");
    expect(markup).toContain("entity.enemy.wolf_demon_01");
    expect(markup).toContain("entity.enemy.elite_split_wind_wolf_01");
    expect(markup).toContain("entity.enemy.rogue_cultivator_shadow_01");
    expect(markup).toContain("entity.enemy.stone_armor_demon_01");
    expect(markup).toContain("Play All");
    expect(markup).toContain("Entities");
    expect(markup).toContain("Idle");
    expect(markup).toContain("Move");
    expect(markup).toContain("Attack");
    expect(markup).toContain("Hit");
    expect(markup).toContain("Death");
    expect(markup).toContain("Spells");
    expect(markup).toContain("Pills");
    expect(markup).toContain("Treasures");
    expect(markup).toContain("Play Magnet");
    expect(markup).toContain("Pause");
    expect(markup).toContain("Step");
    expect(markup).toContain("Density");
  });
});
