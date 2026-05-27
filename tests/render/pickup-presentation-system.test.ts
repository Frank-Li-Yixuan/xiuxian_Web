import { describe, expect, it } from "vitest";

import { Combat2dAssetRegistry, type Combat2dManifest } from "../../src/assets/CombatAssetRegistry";
import type { CanvasPresentationPickup } from "../../src/render/CanvasPresentationState";
import { CanvasRenderer } from "../../src/render/CanvasRenderer";
import type { CanvasLikeContext } from "../../src/render/PrimitiveDrawing";
import { PickupPresentationSystem } from "../../src/render/PickupPresentationSystem";
import { SpriteAssetRegistry, type SpriteImageLike } from "../../src/render/SpriteAssetRegistry";
import type { InRunUiViewState } from "../../src/view/InRunViewState";

describe("PickupPresentationSystem", () => {
  it("advances pickup presentation through spawn, idle, magnet, travel, and collect phases", async () => {
    const system = await createSystem();
    const pickup = pickupFixture({ entityId: 101, pickupId: "drop_qi_orb", renderKind: "qi_orb" });

    expect(system.describePickup(pickup, 100)).toEqual(
      expect.objectContaining({ phase: "spawnBurst", assetId: "pickup.qi_orb_01", sfxCueId: "sfx.pickup.qi_orb_01" })
    );
    expect(system.describePickup(pickup, 124).phase).toBe("floatIdle");
    expect(system.describePickup(pickup, 194).phase).toBe("magnetAcquire");
    expect(system.describePickup(pickup, 222).phase).toBe("magnetTravel");
    expect(system.describePickup(pickup, 260).phase).toBe("collectFlash");
  });

  it("keeps qi, zhenyuan, and material pickups visually and audibly distinguishable in presentation metadata", async () => {
    const system = await createSystem();

    expect(system.describePickup(pickupFixture({ pickupId: "drop_qi_orb", renderKind: "qi_orb" }), 20)).toEqual(
      expect.objectContaining({ assetId: "pickup.qi_orb_01", color: "#38bdf8", sfxCueId: "sfx.pickup.qi_orb_01" })
    );
    expect(system.describePickup(pickupFixture({ pickupId: "drop_spirit_exp", renderKind: "spirit_exp" }), 20)).toEqual(
      expect.objectContaining({ assetId: "pickup.zhenyuan_orb_01", color: "#34d399", sfxCueId: "sfx.pickup.qi_orb_01" })
    );
    expect(system.describePickup(pickupFixture({ pickupId: "material_demon_core", renderKind: "material" }), 20)).toEqual(
      expect.objectContaining({ assetId: "pickup.zhenyuan_orb_01", color: "#facc15", sfxCueId: "sfx.pickup.rare_drop_01" })
    );
  });

  it("draws pickup sprites plus procedural glint without mutating pickup state", async () => {
    const system = await createSystem();
    const pickup = pickupFixture({ entityId: 202, pickupId: "material_demon_core", renderKind: "material", position: { x: 640, y: 500 } });
    const before = structuredClone(pickup);
    const context = new RecordingPickupContext();
    const commands = system.createCommands({ frame: 55, pickups: [pickup] });

    expect(commands.map((command) => `${command.layerId}:${command.id}`)).toEqual(["pickup_trails:pickup_presentation_202"]);

    commands[0]?.draw(context);

    expect(pickup).toEqual(before);
    expect(context.operations).toEqual(expect.arrayContaining(["drawImage:zhenyuan_orb_01", "strokeStyle:#facc15", "fillStyle:#fef3c7"]));
  });

  it("lets CanvasRenderer keep procedural pickups until a pickup presentation system is injected", async () => {
    const pickupPresentationSystem = await createSystem();
    const pickup = pickupFixture({ entityId: 303, pickupId: "drop_qi_orb", renderKind: "qi_orb" });
    const presentation = {
      frame: 70,
      screen: { width: 1920, height: 1080 },
      players: [],
      enemies: [],
      playerProjectiles: [],
      enemyProjectiles: [],
      pickups: [pickup],
      warnings: [],
      visualEvents: []
    } as const;

    const fallbackCommands = new CanvasRenderer().buildRenderCommands({
      viewState: viewState(),
      effectEvents: [],
      presentation
    });
    const injectedCommands = new CanvasRenderer({ pickupPresentationSystem }).buildRenderCommands({
      viewState: viewState(),
      effectEvents: [],
      presentation
    });

    expect(fallbackCommands.map((command) => command.id)).toContain("presentation_pickup_303");
    expect(injectedCommands.map((command) => command.id)).toContain("pickup_presentation_303");
    expect(injectedCommands.map((command) => command.id)).not.toContain("presentation_pickup_303");
  });
});

async function createSystem(): Promise<PickupPresentationSystem> {
  const spriteRegistry = await SpriteAssetRegistry.preload(new Combat2dAssetRegistry(createManifest()), {
    imageLoader: async (_path, asset) => image(asset.id)
  });
  return new PickupPresentationSystem({ spriteRegistry });
}

function createManifest(): Combat2dManifest {
  return {
    version: "0.1",
    namespace: "assets.2d.combat",
    root: "/assets/2d/",
    assets: {
      "pickup.qi_orb_01": asset({
        path: "/assets/2d/combat/pickups/qi_orb_01.png",
        type: "spriteSheet",
        category: "pickup",
        frameWidth: 32,
        frameHeight: 32,
        frameCount: 6,
        fps: 12,
        loop: true,
        blendMode: "screen",
        recommendedScale: 1
      }),
      "pickup.zhenyuan_orb_01": asset({
        path: "/assets/2d/combat/pickups/zhenyuan_orb_01.png",
        type: "spriteSheet",
        category: "pickup",
        frameWidth: 32,
        frameHeight: 32,
        frameCount: 6,
        fps: 12,
        loop: true,
        blendMode: "screen",
        recommendedScale: 1
      })
    }
  };
}

function asset(overrides: Partial<Combat2dManifest["assets"][string]>): Combat2dManifest["assets"][string] {
  return {
    path: "/assets/2d/test.png",
    type: "spriteSheet",
    category: "pickup",
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
  return { width: 192, height: 32, debugId: id.replace("pickup.", "") } as unknown as SpriteImageLike;
}

function pickupFixture(overrides: Partial<CanvasPresentationPickup>): CanvasPresentationPickup {
  return {
    entityId: 1,
    pickupId: "drop_qi_orb",
    position: { x: 500, y: 500 },
    label: "气",
    renderKind: "qi_orb",
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
      nextTriggerText: "pickup presentation test",
      sharedFortuneReroll: 2,
      isReadyToInsight: false
    },
    stage: {
      stageName: "Pickup Presentation Test",
      segmentName: "test",
      segmentIndex: 2,
      segmentCount: 5,
      timeRemaining: 30,
      intensity: "medium"
    },
    prompts: []
  };
}

class RecordingPickupContext implements CanvasLikeContext {
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
