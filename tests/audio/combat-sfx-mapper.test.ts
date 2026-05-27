import { describe, expect, it } from "vitest";

import { CombatSfxMapper } from "../../src/audio/CombatSfxMapper";
import type { CanvasPresentationState } from "../../src/render/CanvasPresentationState";

describe("CombatSfxMapper", () => {
  it("maps projectile spawns and presentation SFX hooks into stable audio requests", () => {
    const mapper = new CombatSfxMapper();
    const requests = mapper.createRequests(
      createPresentation({
        playerProjectiles: [
          {
            entityId: 1,
            ownerPlayerId: "p1",
            artifactId: "artifact_qingshuang_sword",
            renderKind: "flying_sword",
            position: { x: 100, y: 100 },
            velocity: { x: 0, y: -800 },
            radius: 6,
            pierce: 1
          }
        ],
        enemyProjectiles: [
          {
            entityId: 100,
            ownerKind: "enemy",
            ownerId: "enemy_1",
            renderKind: "enemy_basic",
            position: { x: 200, y: 120 },
            velocity: { x: 0, y: 120 },
            radius: 7
          }
        ],
        visualEvents: [
          visualEvent("projectile_hit", "hit_1", "sfx.hit.enemy_light_01"),
          visualEvent("enemy_killed", "kill_1", "sfx.death.enemy_small_burst_01"),
          visualEvent("elite_killed", "elite_1", "sfx.explosion.elite_heavy_01")
        ],
        abilityVfx: [
          {
            id: "spell_cast_1",
            kind: "spell",
            sourceId: "spell_five_thunder",
            ownerPlayerId: "p1",
            frame: 10,
            startFrame: 10,
            endFrame: 30,
            position: { x: 300, y: 400 },
            phase: "cast",
            sfxCueId: "sfx.spell.five_thunder_cast_01"
          },
          {
            id: "pill_swallow_1",
            kind: "pill",
            sourceId: "pill_rejuvenation",
            ownerPlayerId: "p1",
            frame: 10,
            startFrame: 10,
            endFrame: 28,
            position: { x: 300, y: 400 },
            phase: "swallow",
            sfxCueId: "sfx.pill.rejuvenation_heal_01"
          }
        ],
        pickups: [
          {
            entityId: 200,
            pickupId: "pickup_qi_orb",
            position: { x: 320, y: 420 },
            label: "气",
            renderKind: "qi_orb",
            sfxCueId: "sfx.pickup.qi_orb_01"
          },
          {
            entityId: 201,
            pickupId: "pickup_demon_core",
            position: { x: 330, y: 420 },
            label: "妖",
            renderKind: "material",
            sfxCueId: "sfx.pickup.rare_drop_01"
          }
        ]
      })
    );

    expect(requests.map((request) => request.assetId)).toEqual([
      "sfx.artifact.flying_sword_fire_01",
      "sfx.spell.chain_lightning_jump_01",
      "sfx.hit.enemy_light_01",
      "sfx.death.enemy_small_burst_01",
      "sfx.explosion.elite_heavy_01",
      "sfx.spell.five_thunder_cast_01",
      "sfx.pill.rejuvenation_heal_01",
      "sfx.pickup.qi_orb_01",
      "sfx.pickup.rare_drop_01"
    ]);
    expect(requests.find((request) => request.assetId === "sfx.spell.chain_lightning_jump_01")?.volumeScale).toBeLessThan(0.5);

    expect(mapper.createRequests(createPresentation({ frame: 11 }))).toEqual([]);
  });

  it("dedupes persistent pickup and ability ids across frames", () => {
    const mapper = new CombatSfxMapper();
    const presentation = createPresentation({
      abilityVfx: [
        {
          id: "spell_cast_1",
          kind: "spell",
          sourceId: "spell_five_thunder",
          ownerPlayerId: "p1",
          frame: 10,
          startFrame: 10,
          endFrame: 30,
          position: { x: 300, y: 400 },
          phase: "cast",
          sfxCueId: "sfx.spell.five_thunder_cast_01"
        }
      ],
      pickups: [
        {
          entityId: 200,
          pickupId: "pickup_qi_orb",
          position: { x: 320, y: 420 },
          label: "气",
          renderKind: "qi_orb",
          sfxCueId: "sfx.pickup.qi_orb_01"
        }
      ]
    });

    expect(mapper.createRequests(presentation).map((request) => request.assetId)).toEqual([
      "sfx.spell.five_thunder_cast_01",
      "sfx.pickup.qi_orb_01"
    ]);
    expect(mapper.createRequests({ ...presentation, frame: 11 }).map((request) => request.assetId)).toEqual([]);
  });

  it("drops low-priority spam under high pressure but preserves boss and player-critical cues", () => {
    const mapper = new CombatSfxMapper();
    const requests = mapper.createRequests(
      createPresentation({
        enemyProjectiles: Array.from({ length: 100 }, (_, index) => ({
          entityId: 1000 + index,
          ownerKind: "enemy" as const,
          ownerId: `enemy_${index}`,
          renderKind: "enemy_basic" as const,
          position: { x: 100 + index, y: 100 },
          velocity: { x: 0, y: 120 },
          radius: 6
        })),
        visualEvents: [
          visualEvent("projectile_hit", "hit_1", "sfx.hit.enemy_light_01"),
          visualEvent("player_hit", "player_hit_1", "sfx.shield.impact_break_01"),
          visualEvent("boss_killed", "boss_killed_1", "sfx.explosion.elite_heavy_01")
        ],
        warnings: [
          {
            id: "boss_warning_1",
            kind: "boss_warning",
            position: { x: 500, y: 220 },
            radius: 180,
            severity: "high"
          }
        ]
      })
    );

    expect(requests.map((request) => request.assetId)).not.toContain("sfx.hit.enemy_light_01");
    expect(requests.map((request) => request.assetId)).not.toContain("sfx.spell.chain_lightning_jump_01");
    expect(requests.map((request) => request.assetId)).toEqual(
      expect.arrayContaining(["sfx.shield.impact_break_01", "sfx.explosion.elite_heavy_01", "sfx.warning.boss_tribulation_01"])
    );
  });
});

function visualEvent(
  kind: CanvasPresentationState["visualEvents"][number]["kind"],
  id: string,
  sfxCueId: string
): CanvasPresentationState["visualEvents"][number] {
  return {
    id,
    kind,
    frame: 10,
    position: { x: 100, y: 100 },
    color: "#ffffff",
    sfxCueId
  };
}

function createPresentation(overrides: Partial<CanvasPresentationState> = {}): CanvasPresentationState {
  return {
    frame: 10,
    screen: { width: 1920, height: 1080 },
    players: [],
    enemies: [],
    playerProjectiles: [],
    enemyProjectiles: [],
    pickups: [],
    warnings: [],
    visualEvents: [],
    spriteVfx: [],
    abilityVfx: [],
    entityAnimationEvents: [],
    ...overrides
  };
}
