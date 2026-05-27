import { describe, expect, it } from "vitest";

import { Combat2dAssetRegistry, type Combat2dManifest } from "../../src/assets/CombatAssetRegistry";
import type { CanvasPresentationEnemy, CanvasPresentationPlayer, CanvasPresentationState } from "../../src/render/CanvasPresentationState";
import { CanvasRenderer } from "../../src/render/CanvasRenderer";
import type { CanvasLikeContext } from "../../src/render/PrimitiveDrawing";
import {
  SpriteEntityRenderer,
  resolveSpriteEntityAssetId,
  resolveSpriteEntityAnimation
} from "../../src/render/SpriteEntityRenderer";
import { SpriteAssetRegistry, type SpriteImageLike } from "../../src/render/SpriteAssetRegistry";
import type { InRunUiViewState } from "../../src/view/InRunViewState";

describe("SpriteEntityRenderer", () => {
  it("maps players and enemy render kinds to fixed BAS-C009 sprite asset ids", () => {
    expect(resolveSpriteEntityAssetId({ entityKind: "player", player: player({ aliveState: "body" }) })).toBe(
      "entity.player.cultivator_01"
    );
    expect(resolveSpriteEntityAssetId({ entityKind: "player", player: player({ aliveState: "soul" }) })).toBe(
      "entity.player.soul_01"
    );
    expect(resolveSpriteEntityAssetId({ entityKind: "enemy", enemy: enemy({ renderKind: "mountain_imp" }) })).toBe(
      "entity.enemy.mountain_imp_01"
    );
    expect(resolveSpriteEntityAssetId({ entityKind: "enemy", enemy: enemy({ renderKind: "wolf_demon" }) })).toBe(
      "entity.enemy.wolf_demon_01"
    );
    expect(resolveSpriteEntityAssetId({ entityKind: "enemy", enemy: enemy({ renderKind: "elite_split_wind_wolf" }) })).toBe(
      "entity.enemy.elite_split_wind_wolf_01"
    );
    expect(resolveSpriteEntityAssetId({ entityKind: "enemy", enemy: enemy({ renderKind: "rogue_cultivator_shadow" }) })).toBe(
      "entity.enemy.rogue_cultivator_shadow_01"
    );
    expect(resolveSpriteEntityAssetId({ entityKind: "enemy", enemy: enemy({ renderKind: "stone_armor_demon" }) })).toBe(
      "entity.enemy.stone_armor_demon_01"
    );
    expect(resolveSpriteEntityAssetId({ entityKind: "enemy", enemy: enemy({ renderKind: "unknown" }) })).toBeUndefined();
  });

  it("chooses presentation-only idle, move, attack, hit, death, cast, and soul clips", () => {
    const base = presentation({
      frame: 120,
      players: [
        player({
          playerId: "p1",
          velocity: { x: 180, y: -30 }
        })
      ],
      enemies: [
        enemy({ entityId: 1, renderKind: "wolf_demon", velocity: { x: 260, y: 60 }, animationHint: "attack" }),
        enemy({ entityId: 2, renderKind: "stone_armor_demon", velocity: { x: 0, y: 0 } })
      ],
      entityAnimationEvents: [
        {
          id: "cast_p1",
          entityKind: "player",
          entityId: "p1",
          animation: "cast",
          frame: 120,
          startFrame: 118,
          endFrame: 138,
          position: { x: 960, y: 820 }
        },
        {
          id: "hit_stone",
          entityKind: "enemy",
          entityId: "2",
          animation: "hit",
          frame: 120,
          startFrame: 119,
          endFrame: 131,
          position: { x: 850, y: 300 },
          sourceId: "enemy_stone_armor_demon"
        },
        {
          id: "death_imp",
          entityKind: "enemy",
          entityId: "3",
          animation: "death",
          frame: 120,
          startFrame: 116,
          endFrame: 150,
          position: { x: 700, y: 260 },
          sourceId: "enemy_mountain_imp"
        }
      ]
    });

    expect(resolveSpriteEntityAnimation(base, base.players[0]!)).toEqual(expect.objectContaining({ clip: "cast" }));
    expect(resolveSpriteEntityAnimation(base, { ...base.players[0]!, aliveState: "soul" })).toEqual(expect.objectContaining({ clip: "soul" }));
    expect(resolveSpriteEntityAnimation(base, { ...base.players[0]!, velocity: { x: 0, y: 0 } })).toEqual(expect.objectContaining({ clip: "idle" }));
    expect(resolveSpriteEntityAnimation(base, base.enemies[0]!)).toEqual(expect.objectContaining({ clip: "attack" }));
    expect(resolveSpriteEntityAnimation(base, base.enemies[1]!)).toEqual(expect.objectContaining({ clip: "hit" }));
    expect(resolveSpriteEntityAnimation(base, enemy({ entityId: 3, renderKind: "mountain_imp" }))).toEqual(
      expect.objectContaining({ clip: "death" })
    );
  });

  it("draws sprite sheets for known entities and keeps CanvasRenderer layer order readable", async () => {
    const renderer = await createRenderer();
    const frame = presentation({
      frame: 42,
      enemies: [
        enemy({ entityId: 1, renderKind: "mountain_imp", position: { x: 720, y: 280 }, velocity: { x: 0, y: 120 } }),
        enemy({ entityId: 2, renderKind: "wolf_demon", position: { x: 860, y: 320 }, animationHint: "attack" })
      ],
      players: [player({ playerId: "p1", position: { x: 960, y: 840 }, velocity: { x: 90, y: 0 } })],
      enemyProjectiles: [
        {
          entityId: 20,
          ownerKind: "enemy",
          ownerId: "enemy_wolf_demon",
          renderKind: "enemy_basic",
          position: { x: 960, y: 500 },
          velocity: { x: 0, y: 180 },
          radius: 7
        }
      ],
      warnings: [
        {
          id: "charge_2",
          kind: "wolf_charge",
          position: { x: 860, y: 320 },
          radius: 64,
          severity: "high"
        }
      ]
    });
    const commands = new CanvasRenderer({ spriteEntityRenderer: renderer }).buildRenderCommands({
      viewState: viewState(),
      effectEvents: [],
      presentation: frame
    });
    const context = new RecordingEntityContext();

    for (const command of commands) {
      command.draw(context);
    }

    expect(commands.map((command) => `${command.layerId}:${command.id}`)).toEqual(
      expect.arrayContaining([
        "enemies:sprite_entity_enemy_1",
        "enemies:sprite_entity_enemy_2",
        "tribulation_warnings:sprite_entity_wolf_charge_2",
        "players:sprite_entity_player_p1",
        "player_hitbox:presentation_player_hitbox_p1"
      ])
    );
    expect(commands.findIndex((command) => command.layerId === "enemies")).toBeLessThan(
      commands.findIndex((command) => command.layerId === "enemy_bullets")
    );
    expect(commands.findIndex((command) => command.layerId === "players")).toBeLessThan(
      commands.findIndex((command) => command.layerId === "player_hitbox")
    );
    expect(context.operations).toEqual(
      expect.arrayContaining([
        "drawImage:entity.enemy.mountain_imp_01",
        "drawImage:entity.enemy.wolf_demon_01",
        "drawImage:entity.player.cultivator_01",
        "strokeStyle:#f97316"
      ])
    );
  });

  it("falls back procedurally for unknown or missing entity sprite assets", async () => {
    const spriteRegistry = await SpriteAssetRegistry.preload(new Combat2dAssetRegistry(manifest(["entity.player.cultivator_01"])), {
      imageLoader: async (_path, asset) => image(asset.id)
    });
    const renderer = new SpriteEntityRenderer({ spriteRegistry });
    const commands = renderer.createCommands(
      presentation({
        frame: 1,
        enemies: [enemy({ entityId: 9, renderKind: "unknown" })],
        players: [player({ playerId: "p1" })]
      })
    );
    const context = new RecordingEntityContext();

    for (const command of commands) {
      command.draw(context);
    }

    expect(commands.map((command) => command.id)).toEqual(
      expect.arrayContaining(["sprite_entity_enemy_fallback_9", "sprite_entity_player_p1"])
    );
    expect(context.operations).toContain("drawImage:entity.player.cultivator_01");
    expect(context.operations).not.toContain("drawImage:entity.enemy.mountain_imp_01");
    expect(context.operations).toContain("fillStyle:#111827");
  });

  it("adds rogue cultivator cast glow and stone armor hit sparks as render-only readability cues", async () => {
    const renderer = await createRenderer();
    const state = presentation({
      frame: 75,
      enemies: [
        enemy({ entityId: 11, renderKind: "rogue_cultivator_shadow", animationHint: "attack" }),
        enemy({ entityId: 12, renderKind: "stone_armor_demon" })
      ],
      entityAnimationEvents: [
        {
          id: "stone_hit",
          entityKind: "enemy",
          entityId: "12",
          animation: "hit",
          frame: 75,
          startFrame: 75,
          endFrame: 87,
          position: { x: 980, y: 280 },
          sourceId: "enemy_stone_armor_demon"
        }
      ]
    });
    const context = new RecordingEntityContext();

    for (const command of renderer.createCommands(state)) {
      command.draw(context);
    }

    expect(context.operations).toEqual(expect.arrayContaining(["strokeStyle:#a855f7", "strokeStyle:#fef3c7", "fillStyle:#facc15"]));
  });
});

async function createRenderer(): Promise<SpriteEntityRenderer> {
  const spriteRegistry = await SpriteAssetRegistry.preload(new Combat2dAssetRegistry(manifest()), {
    imageLoader: async (_path, asset) => image(asset.id)
  });
  return new SpriteEntityRenderer({ spriteRegistry });
}

function manifest(ids: readonly string[] = ENTITY_ASSET_IDS): Combat2dManifest {
  return {
    version: "0.1",
    namespace: "assets.2d.combat",
    root: "/assets/2d/",
    assets: Object.fromEntries(ids.map((id) => [id, asset(id)]))
  };
}

const ENTITY_ASSET_IDS = [
  "entity.player.cultivator_01",
  "entity.player.soul_01",
  "entity.enemy.mountain_imp_01",
  "entity.enemy.wolf_demon_01",
  "entity.enemy.elite_split_wind_wolf_01",
  "entity.enemy.rogue_cultivator_shadow_01",
  "entity.enemy.stone_armor_demon_01"
] as const;

function asset(id: string): Combat2dManifest["assets"][string] {
  return {
    path: `/assets/2d/combat/${id.includes(".player.") ? "player" : "enemies"}/${id.replaceAll(".", "_")}.png`,
    type: "spriteSheet",
    category: id.includes(".player.") ? "player" : "enemy",
    sourceName: "Internal 3D bake",
    sourceUrl: "internal://baked/3d-to-2d/entity-sprites",
    author: "Xiuxian STG Team",
    license: "CC0",
    attributionRequired: false,
    downloadDate: "2026-05-26",
    originalFileName: `${id}.png`,
    frameWidth: 128,
    frameHeight: 128,
    frameCount: 20,
    fps: 12,
    loop: true,
    blendMode: "normal",
    anchor: { x: 0.5, y: 0.68 },
    recommendedScale: 0.62,
    animationClips: {
      idle: { startFrame: 0, frameCount: 4, fps: 8, loop: true },
      move: { startFrame: 4, frameCount: 4, fps: 12, loop: true },
      attack: { startFrame: 8, frameCount: 4, fps: 12, loop: false },
      hit: { startFrame: 12, frameCount: 4, fps: 18, loop: false },
      death: { startFrame: 16, frameCount: 4, fps: 12, loop: false },
      cast: { startFrame: 8, frameCount: 4, fps: 12, loop: false },
      soul: { startFrame: 0, frameCount: 4, fps: 8, loop: true }
    },
    required: true,
    notes: "Fixture."
  };
}

function image(id: string): SpriteImageLike {
  return { width: 128 * 20, height: 128, debugId: id } as unknown as SpriteImageLike;
}

function presentation(overrides: Partial<CanvasPresentationState> = {}): CanvasPresentationState {
  return {
    frame: 0,
    screen: { width: 1920, height: 1080 },
    players: [],
    enemies: [],
    playerProjectiles: [],
    enemyProjectiles: [],
    pickups: [],
    warnings: [],
    visualEvents: [],
    ...overrides
  };
}

function player(overrides: Partial<CanvasPresentationPlayer> = {}): CanvasPresentationPlayer {
  return {
    playerId: "p1",
    position: { x: 960, y: 820 },
    velocity: { x: 0, y: 0 },
    renderColor: "player1",
    realmLayer: 1,
    aliveState: "body",
    focusActive: false,
    hpRatio: 1,
    qiRatio: 1,
    ...overrides
  };
}

function enemy(overrides: Partial<CanvasPresentationEnemy> = {}): CanvasPresentationEnemy {
  return {
    entityId: 1,
    enemyId: "enemy_mountain_imp",
    renderKind: "mountain_imp",
    position: { x: 800, y: 260 },
    velocity: { x: 0, y: 0 },
    spawnFrame: 0,
    hpRatio: 1,
    ...overrides
  };
}

function viewState(): InRunUiViewState {
  return {
    mode: "combat",
    screen: { width: 1920, height: 1080, scale: 1, safeArea: { x: 360, y: 0, width: 1200, height: 1080 } },
    players: [],
    teamInsight: {
      visible: true,
      teamLevel: 1,
      exp: 0,
      expToNext: 60,
      progress01: 0,
      nextTriggerText: "entity sprite test",
      sharedFortuneReroll: 2,
      isReadyToInsight: false
    },
    stage: {
      stageName: "Entity Sprite Test",
      segmentName: "test",
      segmentIndex: 2,
      segmentCount: 5,
      timeRemaining: 30,
      intensity: "medium"
    },
    prompts: []
  };
}

class RecordingEntityContext implements CanvasLikeContext {
  public readonly operations: string[] = [];

  public recordCommand(layerId: string, commandId: string): void {
    this.operations.push(`command:${layerId}:${commandId}`);
  }
  public save(): void {
    this.operations.push("save");
  }
  public restore(): void {
    this.operations.push("restore");
  }
  public beginPath(): void {
    this.operations.push("beginPath");
  }
  public closePath(): void {
    this.operations.push("closePath");
  }
  public arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void {
    this.operations.push(`arc:${x}:${y}:${radius}:${startAngle}:${endAngle}`);
  }
  public rect(x: number, y: number, width: number, height: number): void {
    this.operations.push(`rect:${x}:${y}:${width}:${height}`);
  }
  public moveTo(x: number, y: number): void {
    this.operations.push(`moveTo:${x}:${y}`);
  }
  public lineTo(x: number, y: number): void {
    this.operations.push(`lineTo:${x}:${y}`);
  }
  public fill(): void {
    this.operations.push("fill");
  }
  public stroke(): void {
    this.operations.push("stroke");
  }
  public clearRect(x: number, y: number, width: number, height: number): void {
    this.operations.push(`clearRect:${x}:${y}:${width}:${height}`);
  }
  public fillRect(x: number, y: number, width: number, height: number): void {
    this.operations.push(`fillRect:${x}:${y}:${width}:${height}`);
  }
  public fillText(text: string, x: number, y: number): void {
    this.operations.push(`fillText:${text}:${x}:${y}`);
  }
  public translate(x: number, y: number): void {
    this.operations.push(`translate:${x}:${y}`);
  }
  public rotate(angle: number): void {
    this.operations.push(`rotate:${angle}`);
  }
  public scale(x: number, y: number): void {
    this.operations.push(`scale:${x}:${y}`);
  }
  public drawImage(imageLike: CanvasImageSource): void {
    this.operations.push(`drawImage:${String((imageLike as { readonly debugId?: string }).debugId ?? "unknown")}`);
  }
  public set fillStyle(value: string | CanvasGradient | CanvasPattern) {
    this.operations.push(`fillStyle:${String(value)}`);
  }
  public set strokeStyle(value: string | CanvasGradient | CanvasPattern) {
    this.operations.push(`strokeStyle:${String(value)}`);
  }
  public set globalAlpha(value: number) {
    this.operations.push(`globalAlpha:${value}`);
  }
  public set globalCompositeOperation(value: GlobalCompositeOperation) {
    this.operations.push(`globalCompositeOperation:${value}`);
  }
  public set lineWidth(value: number) {
    this.operations.push(`lineWidth:${value}`);
  }
  public set font(value: string) {
    this.operations.push(`font:${value}`);
  }
  public set textAlign(value: CanvasTextAlign) {
    this.operations.push(`textAlign:${value}`);
  }
  public set textBaseline(value: CanvasTextBaseline) {
    this.operations.push(`textBaseline:${value}`);
  }
}
