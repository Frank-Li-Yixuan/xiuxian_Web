import { describe, expect, it } from "vitest";

import {
  AbilityVfxRenderer,
  getAbilityVfxProfile
} from "../../src/render/AbilityVfxRenderer";
import type { CanvasPresentationAbilityVfxEvent, CanvasPresentationState } from "../../src/render/CanvasPresentationState";
import type { CanvasLikeContext } from "../../src/render/PrimitiveDrawing";

describe("AbilityVfxRenderer", () => {
  it("maps BAS-C008 spell, artifact, pill, and treasure sources to readable VFX profiles", () => {
    expect(getAbilityVfxProfile("spell_five_thunder")).toEqual(
      expect.objectContaining({
        kind: "spell",
        color: "#a78bfa",
        sfxCueId: "sfx.spell.five_thunder_cast_01"
      })
    );
    expect(getAbilityVfxProfile("spell_bagua_sword_ring")).toEqual(expect.objectContaining({ layerId: "player_projectiles_high" }));
    expect(getAbilityVfxProfile("spell_red_lotus_fire")).toEqual(expect.objectContaining({ fillAlphaMax: 0.32 }));
    expect(getAbilityVfxProfile("spell_sleeve_universe")).toEqual(expect.objectContaining({ secondaryColor: "#0f172a" }));

    expect(getAbilityVfxProfile("artifact_qingshuang_sword")).toEqual(expect.objectContaining({ kind: "artifact" }));
    expect(getAbilityVfxProfile("artifact_ziyang_gourd")).toEqual(expect.objectContaining({ color: "#f97316" }));
    expect(getAbilityVfxProfile("artifact_xuanyue_seal")).toEqual(expect.objectContaining({ layerId: "player_projectiles_high" }));

    expect(getAbilityVfxProfile("pill_rejuvenation")).toEqual(expect.objectContaining({ color: "#22c55e" }));
    expect(getAbilityVfxProfile("pill_burning_blood")).toEqual(expect.objectContaining({ color: "#fb7185" }));
    expect(getAbilityVfxProfile("pill_clear_mind")).toEqual(expect.objectContaining({ color: "#38bdf8" }));
    expect(getAbilityVfxProfile("pill_minor_breakthrough")).toEqual(expect.objectContaining({ color: "#facc15" }));

    expect(getAbilityVfxProfile("treasure_minor_sword_array")).toEqual(expect.objectContaining({ kind: "treasure" }));
    expect(getAbilityVfxProfile("treasure_bagua_jade")).toEqual(expect.objectContaining({ color: "#bfdbfe" }));
    expect(getAbilityVfxProfile("treasure_gold_toad")).toEqual(expect.objectContaining({ color: "#facc15" }));
    expect(getAbilityVfxProfile("treasure_tongxin_lock")).toEqual(expect.objectContaining({ color: "#d946ef" }));
  });

  it("creates stable layer commands for all 14 BAS-C008 ability VFX targets", () => {
    const presentation = presentationFixture({
      frame: 120,
      abilityVfx: [
        abilityEvent("spell_five_thunder", "cast", { x: 820, y: 760 }, { x: 820, y: 300 }),
        abilityEvent("spell_bagua_sword_ring", "active", { x: 880, y: 780 }),
        abilityEvent("spell_red_lotus_fire", "active", { x: 930, y: 420 }),
        abilityEvent("spell_sleeve_universe", "active", { x: 960, y: 720 }, { x: 960, y: 520 }),
        abilityEvent("artifact_qingshuang_sword", "hit", { x: 740, y: 430 }),
        abilityEvent("artifact_ziyang_gourd", "hit", { x: 800, y: 440 }),
        abilityEvent("artifact_xuanyue_seal", "cast", { x: 860, y: 390 }),
        abilityEvent("pill_rejuvenation", "digest", { x: 900, y: 850 }),
        abilityEvent("pill_burning_blood", "digest", { x: 940, y: 850 }),
        abilityEvent("pill_clear_mind", "swallow", { x: 980, y: 850 }),
        abilityEvent("pill_minor_breakthrough", "complete", { x: 1020, y: 850 }),
        abilityEvent("treasure_minor_sword_array", "active", { x: 880, y: 780 }),
        abilityEvent("treasure_bagua_jade", "active", { x: 880, y: 780 }),
        abilityEvent("treasure_gold_toad", "trigger", { x: 880, y: 780 }, { x: 700, y: 650 }),
        abilityEvent("treasure_tongxin_lock", "active", { x: 880, y: 780 }, { x: 1040, y: 780 })
      ]
    });

    const commands = new AbilityVfxRenderer().createCommands(presentation);
    const context = new RecordingAbilityContext();

    for (const command of commands) {
      command.draw(context);
    }

    expect(commands.map((command) => command.id)).toEqual([
      "ability_vfx_spell_five_thunder_cast",
      "ability_vfx_spell_bagua_sword_ring_active",
      "ability_vfx_spell_red_lotus_fire_active",
      "ability_vfx_spell_sleeve_universe_active",
      "ability_vfx_artifact_qingshuang_sword_hit",
      "ability_vfx_artifact_ziyang_gourd_hit",
      "ability_vfx_artifact_xuanyue_seal_cast",
      "ability_vfx_pill_rejuvenation_digest",
      "ability_vfx_pill_burning_blood_digest",
      "ability_vfx_pill_clear_mind_swallow",
      "ability_vfx_pill_minor_breakthrough_complete",
      "ability_vfx_treasure_minor_sword_array_active",
      "ability_vfx_treasure_bagua_jade_active",
      "ability_vfx_treasure_gold_toad_trigger",
      "ability_vfx_treasure_tongxin_lock_active"
    ]);
    expect(commands.every((command) => command.layerId === "player_projectiles_high" || command.layerId === "pickup_trails")).toBe(true);
    expect(context.operations).toEqual(expect.arrayContaining(["command:player_projectiles_high:ability_vfx_spell_five_thunder_cast"]));
    expect(context.operations).toEqual(expect.arrayContaining(["command:pickup_trails:ability_vfx_treasure_gold_toad_trigger"]));
    expect(context.operations).toEqual(expect.arrayContaining(["fillStyle:#0f172a"]));
  });

  it("dims large spell fills under pressure and keeps enemy bullet and hitbox layers untouched", () => {
    const highPressure = presentationFixture({
      frame: 30,
      enemyProjectiles: Array.from({ length: 100 }, (_, index) => ({
        entityId: 1000 + index,
        ownerKind: "enemy" as const,
        ownerId: "enemy_pressure",
        renderKind: "enemy_basic" as const,
        position: { x: 500 + index, y: 300 },
        velocity: { x: 0, y: 180 },
        radius: 7
      })),
      players: [
        {
          playerId: "p1",
          position: { x: 930, y: 850 },
          renderColor: "player1",
          realmLayer: 1,
          aliveState: "body",
          focusActive: true,
          hpRatio: 1,
          qiRatio: 1
        }
      ],
      abilityVfx: [
        {
          ...abilityEvent("spell_red_lotus_fire", "active", { x: 930, y: 850 }),
          frame: 30,
          startFrame: 0,
          endFrame: 90
        }
      ]
    });
    const context = new RecordingAbilityContext();

    const commands = new AbilityVfxRenderer().createCommands(highPressure);
    commands[0]?.draw(context);

    expect(commands.map((command) => command.layerId)).toEqual(["player_projectiles_high"]);
    expect(context.operations).toContain("globalAlpha:0.192");
    expect(context.operations).toContain("fillStyle:#020617");
    expect(commands.map((command) => command.layerId)).not.toContain("enemy_bullets");
    expect(commands.map((command) => command.layerId)).not.toContain("player_hitbox");
  });
});

function abilityEvent(
  sourceId: string,
  phase: CanvasPresentationAbilityVfxEvent["phase"],
  position: { readonly x: number; readonly y: number },
  targetPosition?: { readonly x: number; readonly y: number }
): CanvasPresentationAbilityVfxEvent {
  return {
    id: `${sourceId}_${phase}`,
    kind: getAbilityVfxProfile(sourceId).kind,
    sourceId,
    ownerPlayerId: "p1",
    frame: 120,
    startFrame: 100,
    endFrame: 180,
    position,
    radius: sourceId === "spell_red_lotus_fire" ? 180 : 92,
    phase,
    ...(targetPosition === undefined ? {} : { targetPosition }),
    ...(getAbilityVfxProfile(sourceId).sfxCueId === undefined ? {} : { sfxCueId: getAbilityVfxProfile(sourceId).sfxCueId })
  };
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

class RecordingAbilityContext implements CanvasLikeContext {
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
    this.operations.push(`globalAlpha:${Math.round(value * 1000) / 1000}`);
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
