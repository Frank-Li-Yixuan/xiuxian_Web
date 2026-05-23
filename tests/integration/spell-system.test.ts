import { describe, expect, it } from "vitest";

import { InputButtonBit, type FrameInput } from "../../src/sim/input/FrameInput";
import { createCombatPlayer } from "../../src/sim/player/PlayerSystem";
import { EnemyManager, type EnemyDefinition } from "../../src/sim/enemies/EnemySystem";
import { secondsToFrames } from "../../src/sim/SimConstants";
import {
  createSpellRuntimeState,
  indexSpellDefinitions,
  stepSpellSystem,
  type SpellDefinitionPack
} from "../../src/sim/spells/SpellSystem";
import spellsData from "../../data/spells/spells.v0.1.json";

const SPELLS = indexSpellDefinitions((spellsData as SpellDefinitionPack).items);

const MOUNTAIN_IMP: EnemyDefinition = {
  id: "enemy_mountain_imp",
  hp: 22,
  speed: 120,
  contactDamage: 10,
  behaviorId: "straight_down",
  tags: ["normal"]
};

describe("SpellSystem", () => {
  it("casts Five Thunder from Spell1, consumes qi, starts frame cooldown, damages chained nearest enemies, and emits effects", () => {
    const p1 = createCombatPlayer({
      playerId: "p1",
      natalArtifactId: "artifact_qingshuang_sword",
      position: { x: 800, y: 900 },
      qi: 100
    });
    const enemyManager = new EnemyManager();
    const enemies = [
      spawnEnemy(enemyManager, 1, { x: 805, y: 300 }),
      spawnEnemy(enemyManager, 2, { x: 830, y: 330 }),
      spawnEnemy(enemyManager, 3, { x: 1200, y: 340 })
    ];

    const result = stepSpellSystem({
      frame: 120,
      players: [p1],
      frameInputs: [input("p1", InputButtonBit.Spell1)],
      enemies,
      enemyProjectiles: [],
      spellDefinitions: SPELLS,
      spellState: createSpellRuntimeState([
        {
          playerId: "p1",
          spellSlots: ["spell_five_thunder", "spell_bagua_sword_ring", null, null]
        }
      ])
    });

    expect(result.players[0]?.qi).toBe(55);
    expect(result.spellState[0]?.cooldowns.spell_five_thunder).toBe(120 + secondsToFrames(8));
    expect(result.damageEvents).toEqual([
      expect.objectContaining({
        targetKind: "enemy",
        targetEntityId: enemies[0]?.entityId,
        sourceKind: "spell",
        sourceSpellId: "spell_five_thunder",
        amount: 70
      }),
      expect.objectContaining({
        targetKind: "enemy",
        targetEntityId: enemies[1]?.entityId,
        sourceKind: "spell",
        sourceSpellId: "spell_five_thunder",
        amount: 44
      })
    ]);
    expect(result.effectEvents.map((event) => event.effectId)).toEqual(["thunder_gather", "thunder_chain_hit"]);
  });

  it("prevents casts when qi is insufficient or cooldown is active", () => {
    const p1 = createCombatPlayer({
      playerId: "p1",
      natalArtifactId: "artifact_qingshuang_sword",
      position: { x: 800, y: 900 },
      qi: 30
    });

    const insufficient = stepSpellSystem({
      frame: 20,
      players: [p1],
      frameInputs: [input("p1", InputButtonBit.Spell1)],
      enemies: [],
      enemyProjectiles: [],
      spellDefinitions: SPELLS,
      spellState: createSpellRuntimeState([{ playerId: "p1", spellSlots: ["spell_five_thunder", null, null, null] }])
    });

    expect(insufficient.players[0]?.qi).toBe(30);
    expect(insufficient.effectEvents).toEqual([
      expect.objectContaining({ effectId: "spell_cast_failed", reason: "insufficient_qi" })
    ]);

    const cooling = stepSpellSystem({
      frame: 30,
      players: [{ ...p1, qi: 100 }],
      frameInputs: [input("p1", InputButtonBit.Spell1)],
      enemies: [],
      enemyProjectiles: [],
      spellDefinitions: SPELLS,
      spellState: [
        {
          playerId: "p1",
          spellSlots: ["spell_five_thunder", null, null, null],
          cooldowns: { spell_five_thunder: 120 }
        }
      ]
    });

    expect(cooling.players[0]?.qi).toBe(100);
    expect(cooling.effectEvents).toEqual([expect.objectContaining({ effectId: "spell_cast_failed", reason: "cooldown" })]);
  });

  it("casts Bagua Sword Ring, clears only normal bullets, and emits an EffectEvent instead of visual particles", () => {
    const p1 = createCombatPlayer({
      playerId: "p1",
      natalArtifactId: "artifact_qingshuang_sword",
      position: { x: 900, y: 820 },
      qi: 100
    });

    const result = stepSpellSystem({
      frame: 200,
      players: [p1],
      frameInputs: [input("p1", InputButtonBit.Spell2)],
      enemies: [],
      enemyProjectiles: [
        enemyBullet(1, { x: 930, y: 820 }, ["normal"], true),
        enemyBullet(2, { x: 950, y: 850 }, ["tribulation"], false),
        enemyBullet(3, { x: 1300, y: 820 }, ["normal"], true)
      ],
      spellDefinitions: SPELLS,
      spellState: createSpellRuntimeState([
        {
          playerId: "p1",
          spellSlots: ["spell_five_thunder", "spell_bagua_sword_ring", null, null]
        }
      ])
    });

    expect(result.players[0]?.qi).toBe(65);
    expect(result.clearedEnemyProjectileIds).toEqual([1]);
    expect(result.activeEffects).toEqual([
      expect.objectContaining({
        spellId: "spell_bagua_sword_ring",
        ownerPlayerId: "p1",
        kind: "bullet_clear_aura",
        startFrame: 200,
        endFrame: 200 + secondsToFrames(3)
      })
    ]);
    expect(result.effectEvents).toEqual([expect.objectContaining({ effectId: "bagua_ring_open" })]);
  });

  it("casts Red Lotus Fire as a persistent field ahead of the player and emits warning/field events", () => {
    const p1 = createCombatPlayer({
      playerId: "p1",
      natalArtifactId: "artifact_qingshuang_sword",
      position: { x: 960, y: 860 },
      qi: 100
    });

    const result = stepSpellSystem({
      frame: 240,
      players: [p1],
      frameInputs: [input("p1", InputButtonBit.Spell3)],
      enemies: [],
      enemyProjectiles: [],
      spellDefinitions: SPELLS,
      spellState: createSpellRuntimeState([
        {
          playerId: "p1",
          spellSlots: [null, null, "spell_red_lotus_fire", null]
        }
      ])
    });

    expect(result.players[0]?.qi).toBe(60);
    expect(result.activeEffects).toEqual([
      expect.objectContaining({
        spellId: "spell_red_lotus_fire",
        kind: "damage_field",
        position: { x: 960, y: 580 },
        radius: 180,
        startFrame: 240,
        endFrame: 240 + secondsToFrames(4)
      })
    ]);
    expect(result.effectEvents.map((event) => event.effectId)).toEqual(["lotus_area_warning", "low_flame_field"]);
  });

  it("casts Sleeve Universe, absorbs only clearable normal bullets, and emits reflect metadata", () => {
    const p1 = createCombatPlayer({
      playerId: "p1",
      natalArtifactId: "artifact_qingshuang_sword",
      position: { x: 960, y: 860 },
      qi: 100
    });

    const result = stepSpellSystem({
      frame: 300,
      players: [p1],
      frameInputs: [input("p1", InputButtonBit.Spell4)],
      enemies: [],
      enemyProjectiles: [
        enemyBullet(10, { x: 930, y: 810 }, ["normal"], true),
        enemyBullet(11, { x: 900, y: 820 }, ["boss"], false),
        enemyBullet(12, { x: 1200, y: 860 }, ["normal"], true)
      ],
      spellDefinitions: SPELLS,
      spellState: createSpellRuntimeState([
        {
          playerId: "p1",
          spellSlots: [null, null, null, "spell_sleeve_universe"]
        }
      ])
    });

    expect(result.players[0]?.qi).toBe(50);
    expect(result.absorbedEnemyProjectileIds).toEqual([10]);
    expect(result.reflectedProjectiles).toEqual([
      expect.objectContaining({
        ownerPlayerId: "p1",
        sourceSpellId: "spell_sleeve_universe",
        damage: 9,
        spawnFrame: 300 + secondsToFrames(2)
      })
    ]);
    expect(result.effectEvents.map((event) => event.effectId)).toEqual([
      "void_fan_open",
      "bullet_absorb_lines",
      "void_core_compress",
      "sword_qi_reflect"
    ]);
  });
});

function input(playerId: string, pressedMask: number): FrameInput {
  return {
    frame: 0,
    playerId,
    moveX: 0,
    moveY: 0,
    downMask: pressedMask,
    pressedMask,
    releasedMask: 0,
    inputSeq: 0
  };
}

function spawnEnemy(
  enemyManager: EnemyManager,
  spawnIndex: number,
  position: { readonly x: number; readonly y: number }
) {
  return enemyManager.spawnEnemy({
    enemyDefinition: MOUNTAIN_IMP,
    position,
    spawnFrame: 0,
    sourceSegmentId: "test",
    sourceWaveIndex: 0,
    sourceGroupIndex: 0,
    spawnIndex
  });
}

function enemyBullet(
  entityId: number,
  position: { readonly x: number; readonly y: number },
  tags: readonly string[],
  clearable: boolean
) {
  return {
    entityId,
    ownerKind: "enemy" as const,
    ownerId: "enemy_rogue_cultivator_shadow",
    position,
    velocity: { x: 0, y: 240 },
    damage: 12,
    radius: 6,
    spawnFrame: 0,
    tags,
    clearable
  };
}
