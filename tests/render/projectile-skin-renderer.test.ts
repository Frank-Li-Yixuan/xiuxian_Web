import { describe, expect, it } from "vitest";

import { Combat2dAssetRegistry, type Combat2dManifest } from "../../src/assets/CombatAssetRegistry";
import type { CanvasPresentationState } from "../../src/render/CanvasPresentationState";
import { CanvasRenderer } from "../../src/render/CanvasRenderer";
import type { CanvasLikeContext } from "../../src/render/PrimitiveDrawing";
import { ProjectileSkinRenderer } from "../../src/render/ProjectileSkinRenderer";
import { SpriteAssetRegistry, type SpriteImageLike } from "../../src/render/SpriteAssetRegistry";
import type { InRunUiViewState } from "../../src/view/InRunViewState";

describe("ProjectileSkinRenderer", () => {
  it("maps player and enemy projectiles to distinct sprite skins and keeps enemy bullets readable", async () => {
    const renderer = await createRenderer();
    const presentation = presentationFixture({
      frame: 12,
      playerProjectiles: [
        {
          entityId: 10,
          ownerPlayerId: "p1",
          artifactId: "artifact_qingshuang_sword",
          renderKind: "flying_sword",
          position: { x: 500, y: 700 },
          velocity: { x: 0, y: -720 },
          radius: 5,
          pierce: 1
        }
      ],
      enemyProjectiles: [
        {
          entityId: 20,
          ownerKind: "enemy",
          ownerId: "enemy_wolf_demon",
          renderKind: "enemy_basic",
          position: { x: 620, y: 360 },
          velocity: { x: 0, y: 180 },
          radius: 7
        }
      ]
    });
    const context = new RecordingProjectileContext();
    const commands = renderer.createCommands(presentation);

    expect(renderer.resolveDensityMode(presentation)).toBe("full");
    expect(commands.map((command) => `${command.layerId}:${command.id}`)).toEqual([
      "player_projectiles_low:projectile_skin_player_10",
      "enemy_bullets:projectile_skin_enemy_20"
    ]);

    for (const command of commands) {
      command.draw(context);
    }

    expect(context.operations).toEqual(expect.arrayContaining(["drawImage:player_energy_01", "drawImage:enemy_danger_01"]));
    expect(context.operations).toEqual(expect.arrayContaining(["fillStyle:#ffffff", "strokeStyle:#ef4444"]));
  });

  it("uses simplified high-density drawing for 100 enemy bullets while preserving white cores and danger rings", async () => {
    const renderer = await createRenderer();
    const presentation = presentationFixture({
      frame: 24,
      enemyProjectiles: Array.from({ length: 100 }, (_, index) => ({
        entityId: 1_000 + index,
        ownerKind: "enemy" as const,
        ownerId: "enemy_swarm",
        renderKind: "enemy_basic" as const,
        position: { x: 420 + (index % 20) * 36, y: 160 + Math.floor(index / 20) * 48 },
        velocity: { x: 0, y: 180 },
        radius: 7
      }))
    });
    const context = new RecordingProjectileContext();

    expect(renderer.resolveDensityMode(presentation)).toBe("simplified");

    const commands = renderer.createCommands(presentation);
    expect(commands).toHaveLength(100);

    commands[0]?.draw(context);

    expect(context.operations).not.toContain("drawImage:enemy_danger_01");
    expect(context.operations).toEqual(expect.arrayContaining(["fillStyle:#ffffff", "strokeStyle:#ef4444"]));
  });

  it("lets CanvasRenderer keep procedural projectiles until a projectile skin renderer is injected", async () => {
    const projectileSkinRenderer = await createRenderer();
    const presentation = presentationFixture({
      frame: 12,
      playerProjectiles: [
        {
          entityId: 10,
          ownerPlayerId: "p1",
          artifactId: "artifact_qingshuang_sword",
          renderKind: "flying_sword",
          position: { x: 500, y: 700 },
          velocity: { x: 0, y: -720 },
          radius: 5,
          pierce: 1
        }
      ],
      enemyProjectiles: [
        {
          entityId: 20,
          ownerKind: "enemy",
          ownerId: "enemy_wolf_demon",
          renderKind: "enemy_basic",
          position: { x: 620, y: 360 },
          velocity: { x: 0, y: 180 },
          radius: 7
        }
      ]
    });

    const fallbackCommands = new CanvasRenderer().buildRenderCommands({
      viewState: viewState(),
      effectEvents: [],
      presentation
    });
    const injectedCommands = new CanvasRenderer({ projectileSkinRenderer }).buildRenderCommands({
      viewState: viewState(),
      effectEvents: [],
      presentation
    });

    expect(fallbackCommands.map((command) => command.id)).toEqual(
      expect.arrayContaining(["presentation_player_projectile_10", "presentation_enemy_projectile_20"])
    );
    expect(injectedCommands.map((command) => command.id)).toEqual(
      expect.arrayContaining(["projectile_skin_player_10", "projectile_skin_enemy_20"])
    );
    expect(injectedCommands.map((command) => command.id)).not.toContain("presentation_player_projectile_10");
    expect(injectedCommands.findIndex((command) => command.layerId === "player_projectiles_low")).toBeLessThan(
      injectedCommands.findIndex((command) => command.layerId === "enemy_bullets")
    );
  });
});

async function createRenderer(): Promise<ProjectileSkinRenderer> {
  const spriteRegistry = await SpriteAssetRegistry.preload(new Combat2dAssetRegistry(createManifest()), {
    imageLoader: async (_path, asset) => image(asset.id)
  });
  return new ProjectileSkinRenderer({ spriteRegistry });
}

function createManifest(): Combat2dManifest {
  return {
    version: "0.1",
    namespace: "assets.2d.combat",
    root: "/assets/2d/",
    assets: {
      "projectile.player_energy_01": asset({
        path: "/assets/2d/combat/bullets/player_energy_01.png",
        type: "image",
        category: "projectile",
        blendMode: "screen",
        anchor: { x: 0.5, y: 0.5 },
        recommendedScale: 1
      }),
      "projectile.enemy_danger_01": asset({
        path: "/assets/2d/combat/bullets/enemy_danger_01.png",
        type: "image",
        category: "projectile",
        blendMode: "screen",
        anchor: { x: 0.5, y: 0.5 },
        recommendedScale: 1
      })
    }
  };
}

function asset(overrides: Partial<Combat2dManifest["assets"][string]>): Combat2dManifest["assets"][string] {
  return {
    path: "/assets/2d/test.png",
    type: "image",
    category: "test",
    sourceName: "Test Source",
    sourceUrl: "https://example.com/test",
    author: "Test Author",
    license: "CC0",
    attributionRequired: false,
    downloadDate: "2026-05-26",
    originalFileName: "test.png",
    required: true,
    notes: "Fixture.",
    ...overrides
  };
}

function image(id: string): SpriteImageLike {
  return { width: 32, height: 32, debugId: id.replace("projectile.", "") } as unknown as SpriteImageLike;
}

function presentationFixture(overrides: Partial<CanvasPresentationState>): CanvasPresentationState {
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
      nextTriggerText: "projectile skin test",
      sharedFortuneReroll: 2,
      isReadyToInsight: false
    },
    stage: {
      stageName: "Projectile Skin Test",
      segmentName: "test",
      segmentIndex: 2,
      segmentCount: 5,
      timeRemaining: 30,
      intensity: "medium"
    },
    prompts: []
  };
}

class RecordingProjectileContext implements CanvasLikeContext {
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
