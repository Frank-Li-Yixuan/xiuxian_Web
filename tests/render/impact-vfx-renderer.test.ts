import { beforeEach, describe, expect, it } from "vitest";

import {
  ImpactVfxRenderer,
  computeImpactScreenShake,
  createImpactSpriteVfxRequests,
  getImpactVfxProfile
} from "../../src/render/ImpactVfxRenderer";
import type { CanvasPresentationState, CanvasPresentationVisualEvent } from "../../src/render/CanvasPresentationState";
import type { CanvasLikeContext } from "../../src/render/PrimitiveDrawing";

describe("impact VFX renderer", () => {
  beforeEach(() => {
    eventSerial = 1;
  });

  it("maps every BAS-C007 impact event to visual, shake, sprite, and SFX metadata", () => {
    expect(getImpactVfxProfile("projectile_hit")).toEqual(
      expect.objectContaining({
        color: "#fef3c7",
        sfxCueId: "sfx.hit.enemy_light_01",
        priority: "low"
      })
    );
    expect(getImpactVfxProfile("projectile_hit").shakeIntensity).toBeUndefined();
    expect(getImpactVfxProfile("enemy_damaged")).toEqual(expect.objectContaining({ sfxCueId: "sfx.hit.enemy_light_01" }));
    expect(getImpactVfxProfile("enemy_killed")).toEqual(
      expect.objectContaining({
        spriteAssetId: "vfx.explosion.small_01",
        sfxCueId: "sfx.death.enemy_small_burst_01",
        shakeIntensity: "small"
      })
    );
    expect(getImpactVfxProfile("elite_killed")).toEqual(
      expect.objectContaining({
        spriteAssetId: "vfx.explosion.small_01",
        sfxCueId: "sfx.explosion.elite_heavy_01",
        shakeIntensity: "medium"
      })
    );
    expect(getImpactVfxProfile("player_hit")).toEqual(
      expect.objectContaining({
        sfxCueId: "sfx.shield.impact_break_01",
        layerId: "players",
        shakeIntensity: "small"
      })
    );
    expect(getImpactVfxProfile("shield_break")).toEqual(expect.objectContaining({ spriteAssetId: "vfx.shield.barrier_01" }));
    expect(getImpactVfxProfile("boss_phase_changed")).toEqual(expect.objectContaining({ spriteAssetId: "vfx.lightning.chain_01" }));
    expect(getImpactVfxProfile("boss_killed")).toEqual(
      expect.objectContaining({
        spriteAssetId: "vfx.explosion.small_01",
        sfxCueId: "sfx.explosion.elite_heavy_01",
        shakeIntensity: "ultimate"
      })
    );
  });

  it("creates low-layer impact commands so enemy bullet cores and player hitboxes stay readable", () => {
    const presentation = createPresentation({
      visualEvents: [
        impactEvent("projectile_hit", 20, { x: 520, y: 320 }),
        impactEvent("enemy_killed", 20, { x: 620, y: 300 }),
        impactEvent("elite_killed", 20, { x: 720, y: 280 })
      ],
      enemyProjectiles: createEnemyProjectiles(4)
    });

    const commands = new ImpactVfxRenderer().createCommands(presentation);
    const context = new RecordingImpactContext();

    for (const command of commands) {
      command.draw(context);
    }

    expect(commands.map((command) => command.layerId)).toEqual([
      "player_projectiles_high",
      "player_projectiles_high",
      "player_projectiles_high"
    ]);
    expect(context.operations).toEqual(expect.arrayContaining(["command:player_projectiles_high:impact_vfx_projectile_hit_1"]));
    expect(context.operations).toEqual(expect.arrayContaining(["fillText:破:620:254"]));
    expect(context.operations).not.toContain("command:enemy_bullets:impact_vfx_enemy_killed_2");
  });

  it("generates sprite VFX requests from impact events without mutating the source events", () => {
    const events = [
      impactEvent("enemy_killed", 15, { x: 500, y: 260 }),
      impactEvent("shield_break", 15, { x: 640, y: 420 }),
      impactEvent("boss_phase_changed", 15, { x: 960, y: 210 }),
      impactEvent("boss_killed", 15, { x: 960, y: 190 })
    ];

    const requests = createImpactSpriteVfxRequests({
      frame: 15,
      visualEvents: events,
      enemyProjectiles: [],
      warnings: []
    });

    expect(requests.map((request) => request.assetId)).toEqual([
      "vfx.explosion.small_01",
      "vfx.shield.barrier_01",
      "vfx.lightning.chain_01",
      "vfx.explosion.small_01"
    ]);
    expect(requests.map((request) => request.layerId)).toEqual([
      "player_projectiles_high",
      "player_projectiles_high",
      "player_projectiles_high",
      "foreground_effects"
    ]);
    expect(events[0]).not.toHaveProperty("assetId");
  });

  it("degrades low-priority hit sparks under pressure but keeps critical feedback and caps shake", () => {
    const visualEvents = [
      ...Array.from({ length: 24 }, (_, index) => impactEvent("projectile_hit", 90, { x: 400 + index, y: 250 })),
      impactEvent("enemy_damaged", 90, { x: 500, y: 250 }),
      impactEvent("enemy_killed", 90, { x: 540, y: 250 }),
      impactEvent("elite_killed", 90, { x: 600, y: 250 }),
      impactEvent("boss_killed", 90, { x: 960, y: 200 })
    ];
    const highPressure = createPresentation({
      frame: 90,
      visualEvents,
      enemyProjectiles: createEnemyProjectiles(100)
    });

    const commands = new ImpactVfxRenderer().createCommands(highPressure);
    const shake = computeImpactScreenShake(highPressure);

    expect(commands.filter((command) => command.id.startsWith("impact_vfx_projectile_hit_"))).toHaveLength(12);
    expect(commands.map((command) => command.id)).not.toContain("impact_vfx_enemy_damaged_25");
    expect(commands.map((command) => command.id)).toEqual(
      expect.arrayContaining(["impact_vfx_enemy_killed_26", "impact_vfx_elite_killed_27", "impact_vfx_boss_killed_28"])
    );
    expect(Math.abs(shake.x)).toBeLessThanOrEqual(8);
    expect(Math.abs(shake.y)).toBeLessThanOrEqual(8);

    const clearFieldShake = computeImpactScreenShake(createPresentation({ frame: 90, visualEvents, enemyProjectiles: [] }));
    expect(Math.max(Math.abs(clearFieldShake.x), Math.abs(clearFieldShake.y))).toBeGreaterThan(
      Math.max(Math.abs(shake.x), Math.abs(shake.y))
    );
  });
});

function impactEvent(
  kind: CanvasPresentationVisualEvent["kind"],
  frame: number,
  position: { readonly x: number; readonly y: number }
): CanvasPresentationVisualEvent {
  const profile = getImpactVfxProfile(kind);
  return {
    id: `${kind}_${eventSerial++}`,
    kind,
    frame,
    position,
    color: profile.color,
    intensity: profile.defaultIntensity,
    priority: profile.priority,
    ...(profile.defaultText === undefined ? {} : { text: profile.defaultText }),
    ...(profile.sfxCueId === undefined ? {} : { sfxCueId: profile.sfxCueId }),
    ...(profile.shakeIntensity === undefined ? {} : { shakeIntensity: profile.shakeIntensity })
  };
}

let eventSerial = 1;

function createPresentation(
  options: Partial<Pick<CanvasPresentationState, "frame" | "visualEvents" | "enemyProjectiles" | "warnings">>
): CanvasPresentationState {
  return {
    frame: options.frame ?? 20,
    screen: { width: 1920, height: 1080 },
    players: [],
    enemies: [],
    playerProjectiles: [],
    enemyProjectiles: options.enemyProjectiles ?? [],
    pickups: [],
    warnings: options.warnings ?? [],
    visualEvents: options.visualEvents ?? []
  };
}

function createEnemyProjectiles(count: number): CanvasPresentationState["enemyProjectiles"] {
  return Array.from({ length: count }, (_, index) => ({
    entityId: index + 1,
    ownerKind: "enemy" as const,
    ownerId: "enemy_test",
    renderKind: "enemy_basic" as const,
    position: { x: 400 + index * 4, y: 220 },
    velocity: { x: 0, y: 180 },
    radius: 7
  }));
}

class RecordingImpactContext implements CanvasLikeContext {
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

  public set fillStyle(value: string | CanvasGradient | CanvasPattern) {
    this.operations.push(`fillStyle:${String(value)}`);
  }

  public set strokeStyle(value: string | CanvasGradient | CanvasPattern) {
    this.operations.push(`strokeStyle:${String(value)}`);
  }

  public set globalAlpha(value: number) {
    this.operations.push(`globalAlpha:${value}`);
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
