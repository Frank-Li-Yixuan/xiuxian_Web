import { describe, expect, it } from "vitest";

import { Combat2dAssetRegistry, type Combat2dManifest } from "../../src/assets/CombatAssetRegistry";
import {
  BackgroundParallaxRenderer,
  resolveBackgroundReadability,
  resolveBackgroundScene
} from "../../src/render/BackgroundParallaxRenderer";
import { CanvasRenderer } from "../../src/render/CanvasRenderer";
import type { CanvasPresentationState } from "../../src/render/CanvasPresentationState";
import type { CanvasLikeContext } from "../../src/render/PrimitiveDrawing";
import { SpriteAssetRegistry, type SpriteImageLike } from "../../src/render/SpriteAssetRegistry";
import type { InRunUiViewState } from "../../src/view/InRunViewState";

describe("BackgroundParallaxRenderer", () => {
  it("creates far and near background commands on readability-safe layers", () => {
    const renderer = new BackgroundParallaxRenderer();
    const commands = renderer.createCommands({ viewState: viewState(), presentation: presentationFixture({ frame: 12 }) });

    expect(commands.map((command) => `${command.layerId}:${command.id}`)).toEqual([
      "background_far:background_parallax_far",
      "background_near:background_parallax_near"
    ]);
  });

  it("uses the local space background asset when the sprite registry has background.space_dark_01", async () => {
    const renderer = new BackgroundParallaxRenderer({ spriteRegistry: await createSpriteRegistry() });
    const context = new RecordingBackgroundContext();

    for (const command of renderer.createCommands({ viewState: viewState(), presentation: presentationFixture({ frame: 0 }) })) {
      command.draw(context);
    }

    expect(context.operations.some((operation) => operation.startsWith("drawImage:background.space_dark_01"))).toBe(true);
  });

  it("derives parallax offsets from fixed presentation frames", async () => {
    const renderer = new BackgroundParallaxRenderer({ spriteRegistry: await createSpriteRegistry() });
    const frame0 = new RecordingBackgroundContext();
    const frame90 = new RecordingBackgroundContext();

    renderer
      .createCommands({ viewState: viewState(), presentation: presentationFixture({ frame: 0 }) })[0]
      ?.draw(frame0);
    renderer
      .createCommands({ viewState: viewState(), presentation: presentationFixture({ frame: 90 }) })[0]
      ?.draw(frame90);

    expect(frame0.operations.filter((operation) => operation.startsWith("drawImage:"))).not.toEqual(
      frame90.operations.filter((operation) => operation.startsWith("drawImage:"))
    );
  });

  it("reduces decorative intensity during high pressure and tribulation sky states", () => {
    const normal = resolveBackgroundReadability(viewState({ intensity: "medium" }), presentationFixture({ enemyProjectiles: [] }));
    const highPressure = resolveBackgroundReadability(
      viewState({ intensity: "high" }),
      presentationFixture({ enemyProjectiles: createEnemyProjectiles(100) })
    );
    const tribulation = resolveBackgroundReadability(
      viewState({ intensity: "boss" }),
      presentationFixture({
        warnings: [{ id: "trib", kind: "tribulation", position: { x: 960, y: 520 }, radius: 96, severity: "lethal" }]
      })
    );

    expect(highPressure.highPressure).toBe(true);
    expect(highPressure.fogAlpha).toBeLessThan(normal.fogAlpha);
    expect(highPressure.brightnessAlpha).toBeLessThan(normal.brightnessAlpha);
    expect(tribulation.tribulationSky).toBe(true);
    expect(tribulation.fogAlpha).toBeLessThan(normal.fogAlpha);
  });

  it("falls back to procedural drawing without drawImage when no sprite registry is available", () => {
    const renderer = new BackgroundParallaxRenderer();
    const context = new RecordingBackgroundContext();

    for (const command of renderer.createCommands({ viewState: viewState(), presentation: presentationFixture({ frame: 30 }) })) {
      command.draw(context);
    }

    expect(context.operations.some((operation) => operation.startsWith("drawImage:"))).toBe(false);
    expect(context.operations).toEqual(expect.arrayContaining(["command:background_far:background_parallax_far"]));
  });

  it("resolves qingyun stages separately from the default outer battlefield", () => {
    expect(resolveBackgroundScene(viewState({ stageName: "青云山·妖潮初临" }))).toBe("qingyun_mountain");
    expect(resolveBackgroundScene(viewState({ stageName: "BAS-C011 Outer Battlefield" }))).toBe("outer_battlefield");
  });
});

describe("CanvasRenderer background injection", () => {
  it("uses the injected parallax renderer instead of default background commands", () => {
    const injectedCommands = new CanvasRenderer({ backgroundParallaxRenderer: new BackgroundParallaxRenderer() }).buildRenderCommands({
      viewState: viewState(),
      effectEvents: []
    });
    const fallbackCommands = new CanvasRenderer().buildRenderCommands({
      viewState: viewState(),
      effectEvents: []
    });

    expect(injectedCommands.map((command) => `${command.layerId}:${command.id}`).slice(0, 2)).toEqual([
      "background_far:background_parallax_far",
      "background_near:background_parallax_near"
    ]);
    expect(fallbackCommands.map((command) => command.id).slice(0, 2)).toEqual(["background_far", "background_near"]);
  });
});

async function createSpriteRegistry(): Promise<SpriteAssetRegistry> {
  return SpriteAssetRegistry.preload(new Combat2dAssetRegistry(createManifest()), {
    imageLoader: async (_path, asset) => ({ width: 272, height: 160, debugId: asset.id }) as unknown as SpriteImageLike
  });
}

function createManifest(): Combat2dManifest {
  return {
    version: "0.1",
    namespace: "assets.2d.combat",
    root: "/assets/2d/",
    assets: {
      "background.space_dark_01": {
        path: "/assets/2d/combat/backgrounds/space_dark_01.png",
        type: "parallaxLayer",
        category: "background",
        sourceName: "OpenGameArt",
        sourceUrl: "https://opengameart.org/content/space-background-3",
        author: "ansimuz",
        license: "CC0",
        attributionRequired: false,
        downloadDate: "2026-05-26",
        originalFileName: "space_background_pack.zip/layers/parallax-space-backgound.png",
        required: true,
        blendMode: "normal",
        anchor: { x: 0, y: 0 },
        recommendedScale: 4,
        notes: "Fixture background asset."
      }
    }
  };
}

function presentationFixture(overrides: Partial<CanvasPresentationState> = {}): CanvasPresentationState {
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

function createEnemyProjectiles(count: number): CanvasPresentationState["enemyProjectiles"] {
  return Array.from({ length: count }, (_, index) => ({
    entityId: index + 1,
    ownerKind: "enemy" as const,
    ownerId: "enemy_swarm",
    renderKind: "enemy_basic" as const,
    position: { x: 420 + (index % 20) * 42, y: 140 + Math.floor(index / 20) * 52 },
    velocity: { x: 0, y: 180 },
    radius: 7
  }));
}

function viewState(overrides: Partial<InRunUiViewState["stage"]> = {}): InRunUiViewState {
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
      nextTriggerText: "background parallax test",
      sharedFortuneReroll: 2,
      isReadyToInsight: false
    },
    stage: {
      stageName: "BAS-C011 Outer Battlefield",
      segmentName: "Background test",
      segmentIndex: 1,
      segmentCount: 1,
      timeRemaining: 30,
      intensity: "medium",
      ...overrides
    },
    prompts: []
  };
}

class RecordingBackgroundContext implements CanvasLikeContext {
  public readonly operations: string[] = [];

  public fillStyle: string | CanvasGradient | CanvasPattern = "#000000";
  public strokeStyle: string | CanvasGradient | CanvasPattern = "#000000";
  public globalAlpha = 1;
  public globalCompositeOperation?: GlobalCompositeOperation;
  public lineWidth = 1;
  public font = "";
  public textAlign: CanvasTextAlign = "left";
  public textBaseline: CanvasTextBaseline = "alphabetic";

  public recordCommand(layerId: string, commandId: string): void {
    this.operations.push(`command:${layerId}:${commandId}`);
  }

  public save(): void {}
  public restore(): void {}
  public beginPath(): void {}
  public closePath(): void {}
  public rect(): void {}
  public moveTo(): void {}
  public lineTo(): void {}
  public fill(): void {
    this.operations.push(`fill:${String(this.fillStyle)}:${this.globalAlpha}`);
  }
  public stroke(): void {
    this.operations.push(`stroke:${String(this.strokeStyle)}:${this.globalAlpha}`);
  }
  public clearRect(): void {}
  public fillRect(x: number, y: number, width: number, height: number): void {
    this.operations.push(`fillRect:${String(this.fillStyle)}:${this.globalAlpha}:${x}:${y}:${width}:${height}`);
  }
  public fillText(text: string): void {
    this.operations.push(`fillText:${text}`);
  }
  public arc(x: number, y: number, radius: number): void {
    this.operations.push(`arc:${x}:${y}:${radius}:${String(this.fillStyle)}:${this.globalAlpha}`);
  }
  public drawImage(
    image: CanvasImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number
  ): void {
    const debugId = (image as { readonly debugId?: string }).debugId ?? "image";
    this.operations.push(`drawImage:${debugId}:${sx}:${sy}:${sw}:${sh}:${dx}:${dy}:${dw}:${dh}:${this.globalAlpha}`);
  }
}
