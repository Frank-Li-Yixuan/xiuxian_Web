import { describe, expect, it } from "vitest";

import { Combat2dAssetRegistry, type Combat2dManifest } from "../../src/assets/CombatAssetRegistry";
import type { CanvasPresentationState } from "../../src/render/CanvasPresentationState";
import { CanvasRenderer } from "../../src/render/CanvasRenderer";
import { CombatVfxRenderer } from "../../src/render/CombatVfxRenderer";
import type { CanvasLikeContext } from "../../src/render/PrimitiveDrawing";
import { SpriteAssetRegistry, type SpriteImageLike } from "../../src/render/SpriteAssetRegistry";
import type { InRunUiViewState } from "../../src/view/InRunViewState";

describe("CombatVfxRenderer", () => {
  it("creates canvas sprite commands with transform, alpha, blend mode, and source frame metadata", async () => {
    const renderer = await createRenderer(asset({ loop: true, blendMode: "normal", recommendedScale: 0.5 }));
    const context = new RecordingSpriteContext();
    const commands = renderer.createCommands(
      presentation({
        frame: 10,
        spriteVfx: [
          {
            id: "explosion_001",
            assetId: "vfx.explosion.small_01",
            position: { x: 120, y: 240 },
            startFrame: 0,
            alpha: 0.75,
            scale: 2,
            rotation: 0.25,
            blendModeOverride: "screen"
          }
        ]
      })
    );

    expect(commands.map((command) => `${command.layerId}:${command.id}`)).toEqual(["foreground_effects:sprite_vfx_explosion_001"]);

    commands[0]?.draw(context);

    expect(context.operations).toEqual(
      expect.arrayContaining([
        "command:foreground_effects:sprite_vfx_explosion_001",
        "globalAlpha:0.75",
        "globalCompositeOperation:screen",
        "translate:120:240",
        "rotate:0.25",
        "scale:1:1",
        "drawImage:32:32:32:32:-16:-16:32:32"
      ])
    );
  });

  it("skips completed non-loop sprite requests before creating commands", async () => {
    const renderer = await createRenderer(asset({ fps: 60, frameCount: 2, loop: false }));

    const commands = renderer.createCommands(
      presentation({
        frame: 4,
        spriteVfx: [
          {
            id: "finished",
            assetId: "vfx.explosion.small_01",
            position: { x: 0, y: 0 },
            startFrame: 0
          }
        ]
      })
    );

    expect(commands).toEqual([]);
  });

  it("only adds sprite VFX to CanvasRenderer when a combat VFX renderer is injected", async () => {
    const combatVfxRenderer = await createRenderer(asset({ loop: true }));
    const frame = {
      viewState: viewState(),
      effectEvents: [],
      presentation: presentation({
        frame: 1,
        spriteVfx: [
          {
            id: "injected",
            assetId: "vfx.explosion.small_01",
            position: { x: 100, y: 100 },
            startFrame: 0
          }
        ]
      })
    };

    expect(new CanvasRenderer().buildRenderCommands(frame).map((command) => command.id)).not.toContain("sprite_vfx_injected");
    expect(new CanvasRenderer({ combatVfxRenderer }).buildRenderCommands(frame).map((command) => command.id)).toContain("sprite_vfx_injected");
  });
});

async function createRenderer(manifestAsset: Combat2dManifest["assets"][string]): Promise<CombatVfxRenderer> {
  const spriteRegistry = await SpriteAssetRegistry.preload(new Combat2dAssetRegistry(manifest(manifestAsset)), {
    imageLoader: async () => image(96, 64)
  });
  return new CombatVfxRenderer({ spriteRegistry });
}

function manifest(manifestAsset: Combat2dManifest["assets"][string]): Combat2dManifest {
  return {
    version: "0.1",
    namespace: "assets.2d.combat",
    root: "/assets/2d/",
    assets: {
      "vfx.explosion.small_01": manifestAsset
    }
  };
}

function asset(overrides: Partial<Combat2dManifest["assets"][string]>): Combat2dManifest["assets"][string] {
  return {
    path: "/assets/2d/combat/vfx/explosion_small_01.png",
    type: "spriteSheet",
    category: "explosion",
    sourceName: "Test Source",
    sourceUrl: "https://example.com/test",
    author: "Test Author",
    license: "CC0",
    attributionRequired: false,
    downloadDate: "2026-05-26",
    originalFileName: "test.png",
    required: true,
    notes: "Fixture.",
    frameWidth: 32,
    frameHeight: 32,
    frameCount: 6,
    fps: 24,
    loop: false,
    anchor: { x: 0.5, y: 0.5 },
    recommendedScale: 1,
    ...overrides
  };
}

function image(width: number, height: number): SpriteImageLike {
  return { width, height } as unknown as SpriteImageLike;
}

function presentation(overrides: Partial<CanvasPresentationState>): CanvasPresentationState {
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
      nextTriggerText: "sprite vfx test",
      sharedFortuneReroll: 2,
      isReadyToInsight: false
    },
    stage: {
      stageName: "Sprite VFX Test",
      segmentName: "test",
      segmentIndex: 2,
      segmentCount: 5,
      timeRemaining: 30,
      intensity: "medium"
    },
    prompts: []
  };
}

class RecordingSpriteContext implements CanvasLikeContext {
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

  public drawImage(
    _image: CanvasImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number
  ): void {
    this.operations.push(`drawImage:${sx}:${sy}:${sw}:${sh}:${dx}:${dy}:${dw}:${dh}`);
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
