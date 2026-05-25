import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import renderLayersData from "../../docs_packages/06_combat_feel_vfx/data/vfx/render_layers.v0.1.json";
import { createRenderLayerStackFromData } from "../../src/render/RenderLayerStack";
import {
  VFX_LAB_PRESETS,
  VFX_LAB_SCENARIOS,
  createVfxLabFrame,
  createVfxLabReadabilitySummary
} from "../../src/app/vfx-lab/VfxLabModel";

describe("vfx lab model", () => {
  it("defines the five scripted VFX validation scenarios and three intensity presets", () => {
    expect(VFX_LAB_SCENARIOS.map((scenario) => scenario.id)).toEqual([
      "five_thunder_chain",
      "red_lotus_field",
      "sleeve_universe_absorb",
      "tribulation_warning",
      "boss_death_cascade"
    ]);
    expect(VFX_LAB_PRESETS.map((preset) => preset.id)).toEqual(["readable", "balanced", "flashy"]);

    const appEntry = readFileSync(join(process.cwd(), "src/app/main.tsx"), "utf8");
    expect(appEntry).toContain('window.location.pathname === "/vfx-lab"');
  });

  it("creates renderable frames for every scenario and preset without relying on sim imports", () => {
    for (const scenario of VFX_LAB_SCENARIOS) {
      for (const preset of VFX_LAB_PRESETS) {
        const frame = createVfxLabFrame({
          scenarioId: scenario.id,
          presetId: preset.id,
          frame: 90
        });

        expect(frame.viewState.screen).toEqual(expect.objectContaining({ width: 1920, height: 1080 }));
        expect(frame.presentation?.frame).toBe(90 % scenario.durationFrames);
        expect(frame.presentation?.players[0]).toEqual(expect.objectContaining({ playerId: "p1", focusActive: true }));
        expect(frame.effectEvents.length).toBeGreaterThan(0);
      }
    }

    const source = readFileSync(join(process.cwd(), "src/app/vfx-lab/VfxLabModel.ts"), "utf8");
    expect(source).not.toMatch(/from ["']\.\.\/\.\.\/sim\//);
    expect(source).not.toMatch(/from ["']\.\.\/sim\//);
  });

  it("keeps enemy bullets above large player spell effects in the lab render stack", () => {
    const stack = createRenderLayerStackFromData(renderLayersData);

    expect(stack.isAbove("enemy_bullets", "player_projectiles_high")).toBe(true);
    expect(stack.isAbove("tribulation_warnings", "enemy_bullets")).toBe(true);
    expect(stack.isAbove("player_hitbox", "foreground_effects")).toBe(true);
  });

  it("reports readability protections for high-pressure red lotus frames", () => {
    const frame = createVfxLabFrame({
      scenarioId: "red_lotus_field",
      presetId: "flashy",
      frame: 140
    });

    const summary = createVfxLabReadabilitySummary(frame);

    expect(summary.enemyBulletCount).toBeGreaterThanOrEqual(80);
    expect(summary.activeParticleBudget).toBeGreaterThan(0);
    expect(summary.flags).toEqual(expect.arrayContaining(["large_spell_alpha_cap", "dimmed_near_enemy_bullet", "protected_hitbox_hole"]));
    expect(summary.adjustedEffects.some((effect) => effect.protectedHitboxHoleRadiusPx === 24)).toBe(true);
  });
});
