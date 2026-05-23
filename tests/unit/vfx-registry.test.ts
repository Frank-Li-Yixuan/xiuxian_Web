import { describe, expect, it } from "vitest";

import artifactVfxData from "../../docs_packages/06_combat_feel_vfx/data/vfx/artifact_vfx_profiles.v0.1.json";
import effectProfilesData from "../../docs_packages/06_combat_feel_vfx/data/vfx/effect_profiles.v0.1.json";
import particleBudgetsData from "../../docs_packages/06_combat_feel_vfx/data/vfx/particle_budgets.v0.1.json";
import readabilityRulesData from "../../docs_packages/06_combat_feel_vfx/data/vfx/readability_rules.v0.1.json";
import screenShakeProfilesData from "../../docs_packages/06_combat_feel_vfx/data/vfx/screen_shake_profiles.v0.1.json";
import spellVfxData from "../../docs_packages/06_combat_feel_vfx/data/vfx/spell_vfx_profiles.v0.1.json";
import tribulationVfxData from "../../docs_packages/06_combat_feel_vfx/data/vfx/tribulation_vfx_profiles.v0.1.json";
import visualTokensData from "../../docs_packages/06_combat_feel_vfx/data/vfx/visual_tokens.v0.1.json";
import { EffectEventQueue, type QueuedEffectEvent } from "../../src/render/vfx/EffectEventQueue";
import { ParticlePool } from "../../src/render/vfx/ParticlePool";
import { ReadabilityGuard } from "../../src/render/vfx/ReadabilityGuard";
import { ScreenShakeManager } from "../../src/render/vfx/ScreenShakeManager";
import { createVfxRegistryFromData } from "../../src/render/vfx/VfxRegistry";

describe("EffectEventQueue", () => {
  it("sorts sim-authored effect events by frame, keeps duration events active, and leaves inputs unchanged", () => {
    const queue = new EffectEventQueue();
    const events: readonly QueuedEffectEvent[] = [
      {
        frame: 18,
        effectId: "low_flame_field",
        position: { x: 720, y: 420 },
        ownerPlayerId: "p1",
        spellId: "spell_red_lotus_fire",
        durationFrames: 120,
        attachedEntityId: 77
      },
      {
        frame: 12,
        effectId: "thunder_gather",
        position: { x: 640, y: 380 },
        ownerPlayerId: "p1",
        spellId: "spell_five_thunder"
      },
      {
        frame: 12,
        effectId: "thunder_chain_hit",
        position: { x: 650, y: 390 },
        ownerPlayerId: "p1",
        spellId: "spell_five_thunder",
        targetEntityId: 9
      }
    ];
    const before = structuredClone(events);

    queue.enqueueMany(events);

    expect(events).toEqual(before);
    expect(queue.drainDue(11)).toEqual([]);
    const dueAt12 = queue.drainDue(12);
    expect(dueAt12.map((event) => event.effectId)).toEqual(["thunder_gather", "thunder_chain_hit"]);
    expect(Object.isFrozen(dueAt12)).toBe(true);
    expect(Object.isFrozen(dueAt12[0])).toBe(true);
    expect(queue.getActive(60)).toEqual([
      expect.objectContaining({
        effectId: "low_flame_field",
        attachedEntityId: 77,
        startFrame: 18,
        endFrame: 138,
        mode: "duration"
      })
    ]);
    expect(queue.getActive(139)).toEqual([]);
  });
});

describe("VfxRegistry", () => {
  it("loads VFX JSON packs and exposes effect, spell, artifact, tribulation, budget, token, and shake lookups", () => {
    const registry = createTestRegistry();

    expect(registry.getEffectProfile("enemy_death_small")).toEqual(
      expect.objectContaining({
        id: "enemy_death_small",
        defaultLayer: "foreground_effects",
        durationFrames: 28,
        screenShake: "small"
      })
    );
    expect(registry.getEffectProfile("pickup_magnet_trail").particles.count).toEqual([1, 2]);
    expect(registry.getSpellProfile("spell_five_thunder").events.map((event) => event.effect)).toEqual([
      "thunder_gather",
      "thunder_chain_hit",
      "thunder_kill_burst"
    ]);
    expect(registry.getArtifactProfile("artifact_xuanyue_seal")).toEqual(
      expect.objectContaining({ projectileShape: "falling_seal", impactEffect: "earth_shock_ring" })
    );
    expect(registry.getTribulationProfile("trib_inrun_qi_to_foundation").warning.layer).toBe("tribulation_warnings");
    expect(registry.getParticleBudget("medium")).toEqual(
      expect.objectContaining({ normalParticles: 800, spellParticles: 280, pickupTrails: 120 })
    );
    expect(registry.getVisualColor("danger", "enemyBullet")).toBe("#ef4444");
    expect(registry.getShakeProfile("ultimate")).toEqual(
      expect.objectContaining({ intensityPx: [15, 20], durationFrames: [30, 45] })
    );
    expect(() => registry.getEffectProfile("missing_effect")).toThrow(/Unknown VFX effect profile/);
  });
});

describe("ParticlePool", () => {
  it("uses visualRng to spawn render-only particles within the active quality budget and merges overflow", () => {
    const registry = createTestRegistry();
    const pool = new ParticlePool({ budgets: particleBudgetsData, quality: "medium" });
    const beforeBudget = structuredClone(particleBudgetsData);

    const result = pool.spawnBurst({
      frame: 42,
      bucket: "normal",
      effectId: "enemy_death_small",
      origin: { x: 900, y: 420 },
      requestedCount: 810,
      lifeFrames: 20,
      visualRng: createSequenceRng([0.25, 0.75, 0.5, 0.1])
    });

    expect(particleBudgetsData).toEqual(beforeBudget);
    expect(result).toEqual({ requested: 810, spawned: 800, dropped: 10, merged: true });
    expect(pool.getStats()).toEqual(
      expect.objectContaining({ quality: "medium", capacity: 800, active: 800, mergedBursts: 1, droppedParticles: 10 })
    );
    const active = pool.getActiveParticles();
    expect(active).toHaveLength(800);
    expect(Object.isFrozen(active)).toBe(true);
    expect(active[0]).toEqual(
      expect.objectContaining({
        effectId: "enemy_death_small",
        bucket: "normal",
        spawnFrame: 42,
        expiresFrame: 62
      })
    );
    expect(active.at(-1)).toEqual(expect.objectContaining({ mergedCount: 11 }));

    pool.update(62);

    expect(pool.getStats().active).toBe(0);
    expect(registry.getParticleBudget("medium").normalParticles).toBe(800);
  });
});

describe("ScreenShakeManager", () => {
  it("composes render-only camera shake by max intensity, never additive, and suppresses shake near tribulation impact", () => {
    const manager = new ScreenShakeManager({
      profiles: screenShakeProfilesData,
      visualRng: createSequenceRng([0.5, 0.5, 0.25, 0.75])
    });

    expect(manager.trigger({ profileId: "small", frame: 100 })).toEqual(expect.objectContaining({ accepted: true }));
    expect(manager.trigger({ profileId: "medium", frame: 100 })).toEqual(expect.objectContaining({ accepted: true }));

    const state = manager.getState(100);
    expect(state.renderOnly).toBe(true);
    expect(state.intensityPx).toBeLessThanOrEqual(8);
    expect(state.intensityPx).toBeGreaterThanOrEqual(5);
    expect(state.remainingFrames).toBeGreaterThanOrEqual(10);
    expect(manager.getCameraOffset(104)).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
    expect(Math.hypot(manager.getCameraOffset(104).x, manager.getCameraOffset(104).y)).toBeLessThanOrEqual(8);

    const suppressed = manager.trigger({ profileId: "large", frame: 120, nextTribulationImpactFrame: 145 });

    expect(suppressed).toEqual({ accepted: false, reason: "tribulation_protection_window" });
    expect(manager.getState(146).intensityPx).toBe(0);
  });
});

describe("ReadabilityGuard", () => {
  it("dims spell fills near enemy bullets, punches hitbox holes, and compresses pickup trails during high pressure", () => {
    const guard = new ReadabilityGuard({ rules: readabilityRulesData });

    const result = guard.apply({
      frame: 300,
      effects: [
        {
          id: "lotus_field",
          effectId: "low_flame_field",
          kind: "player_spell_fill",
          layerId: "player_projectiles_high",
          position: { x: 900, y: 500 },
          radius: 96,
          alpha: 0.8
        },
        {
          id: "pickup_trail_cluster",
          effectId: "pickup_magnet_trail",
          kind: "pickup_trail",
          layerId: "pickup_trails",
          position: { x: 920, y: 780 },
          radius: 8,
          alpha: 0.75,
          count: 160
        }
      ],
      enemyBullets: [{ x: 930, y: 500, radius: 7 }],
      playerHitboxes: [{ playerId: "p1", x: 900, y: 500, radius: 7 }],
      tribulationActive: true
    });

    expect(result.adjustedEffects).toEqual([
      expect.objectContaining({
        id: "lotus_field",
        alpha: 0.293,
        readabilityFlags: ["large_spell_alpha_cap", "dimmed_near_enemy_bullet", "protected_hitbox_hole"],
        protectedHitboxHoleRadiusPx: 24
      }),
      expect.objectContaining({
        id: "pickup_trail_cluster",
        count: 100,
        readabilityFlags: ["compressed_pickup_trails"]
      })
    ]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.adjustedEffects)).toBe(true);
  });
});

function createTestRegistry() {
  return createVfxRegistryFromData({
    effectProfiles: effectProfilesData,
    spellProfiles: spellVfxData,
    artifactProfiles: artifactVfxData,
    tribulationProfiles: tribulationVfxData,
    particleBudgets: particleBudgetsData,
    visualTokens: visualTokensData,
    readabilityRules: readabilityRulesData,
    screenShakeProfiles: screenShakeProfilesData
  });
}

function createSequenceRng(values: readonly number[]) {
  let index = 0;
  return {
    next01(): number {
      const value = values[index % values.length];
      index += 1;
      return value ?? 0;
    }
  };
}
