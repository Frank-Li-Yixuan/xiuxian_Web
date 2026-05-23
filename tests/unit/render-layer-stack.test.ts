import { describe, expect, it } from "vitest";

import renderLayersData from "../../docs_packages/06_combat_feel_vfx/data/vfx/render_layers.v0.1.json";
import type { EffectEvent } from "../../src/sim/spells/SpellEffects";
import { CanvasRenderer, type CanvasRenderFrame } from "../../src/render/CanvasRenderer";
import {
  createRenderLayerStack,
  createRenderLayerStackFromData,
  type RenderCommand
} from "../../src/render/RenderLayerStack";
import type { CanvasLikeContext } from "../../src/render/PrimitiveDrawing";
import type { InRunUiViewState } from "../../src/view/InRunViewState";

describe("RenderLayerStack", () => {
  it("indexes render layer data and enforces readability hard-rule ordering", () => {
    const stack = createRenderLayerStackFromData(renderLayersData);

    expect(stack.getLayer("enemy_bullets")?.z).toBe(70);
    expect(stack.isAbove("enemy_bullets", "player_projectiles_high")).toBe(true);
    expect(stack.isAbove("tribulation_warnings", "enemy_bullets")).toBe(true);
    expect(stack.isAbove("tribulation_strikes", "tribulation_warnings")).toBe(true);
    expect(stack.isAbove("player_hitbox", "players")).toBe(true);
    expect(stack.isAbove("player_hitbox", "player_projectiles_high")).toBe(true);
    expect(stack.isAbove("player_hitbox", "rescue_and_soul")).toBe(true);
    expect(stack.isAbove("player_hitbox", "foreground_effects")).toBe(true);
  });

  it("sorts commands by layer z while preserving insertion order inside a layer", () => {
    const stack = createRenderLayerStackFromData(renderLayersData);
    const sorted = stack.sortCommands([
      command("hud_summary", "hud"),
      command("enemy_bullet_01", "enemy_bullets"),
      command("spell_fill_01", "player_projectiles_high"),
      command("enemy_bullet_02", "enemy_bullets"),
      command("trib_warning_01", "tribulation_warnings"),
      command("foreground_fx_01", "foreground_effects"),
      command("rescue_ring_01", "rescue_and_soul"),
      command("player_hitbox_p1", "player_hitbox")
    ]);

    expect(sorted.map((entry) => entry.id)).toEqual([
      "spell_fill_01",
      "enemy_bullet_01",
      "enemy_bullet_02",
      "trib_warning_01",
      "rescue_ring_01",
      "foreground_fx_01",
      "player_hitbox_p1",
      "hud_summary"
    ]);
  });
});

describe("CanvasRenderer", () => {
  it("builds read-only canvas commands from ViewState and EffectEvents without mutating inputs", () => {
    const viewState = createViewState();
    const effectEvents: readonly EffectEvent[] = [
      effect("spell_damage_field", { x: 900, y: 420 }),
      effect("enemy_bullet", { x: 910, y: 710 }),
      effect("player_hitbox", { x: 880, y: 900 }),
      effect("tribulation_strike", { x: 760, y: 500 })
    ];
    const beforeView = structuredClone(viewState);
    const beforeEffects = structuredClone(effectEvents);
    const renderer = new CanvasRenderer({
      layerStack: createRenderLayerStackFromData(renderLayersData)
    });

    const commands = renderer.buildRenderCommands({
      viewState,
      effectEvents
    });

    expect(viewState).toEqual(beforeView);
    expect(effectEvents).toEqual(beforeEffects);
    expect(commands.map((entry) => `${entry.layerId}:${entry.id}`)).toEqual([
      "background_far:background_far",
      "background_near:background_near",
      "player_projectiles_high:effect_spell_damage_field_0",
      "enemy_bullets:effect_enemy_bullet_1",
      "tribulation_warnings:tribulation_warning_warn_001",
      "tribulation_strikes:effect_tribulation_strike_3",
      "rescue_and_soul:rescue_p2",
      "player_hitbox:effect_player_hitbox_2",
      "hud:hud_stage",
      "hud:hud_team_insight",
      "hud:hud_boss",
      "hud:hud_p1",
      "hud:hud_p2",
      "major_overlay:insight_overlay"
    ]);
    expect(Object.isFrozen(commands)).toBe(true);
  });

  it("renders sorted commands through procedural primitive drawing only", () => {
    const context = new RecordingCanvasContext();
    const renderer = new CanvasRenderer({
      layerStack: createRenderLayerStack([
        { id: "background_far", z: 0, description: "bg" },
        { id: "enemy_bullets", z: 70, description: "danger" },
        { id: "tribulation_warnings", z: 80, description: "trib" },
        { id: "player_hitbox", z: 110, description: "hitbox" },
        { id: "hud", z: 200, description: "hud" }
      ])
    });

    renderer.renderCommands(context, [
      command("hud", "hud"),
      command("hitbox", "player_hitbox"),
      command("enemy", "enemy_bullets"),
      command("background", "background_far"),
      command("trib", "tribulation_warnings")
    ]);

    expect(context.operations.filter((operation) => operation.startsWith("command:"))).toEqual([
      "command:background_far:background",
      "command:enemy_bullets:enemy",
      "command:tribulation_warnings:trib",
      "command:player_hitbox:hitbox",
      "command:hud:hud"
    ]);
    expect(context.operations).not.toContain("drawImage");
    expect(context.operations).not.toContain("externalFont");
  });

  it("draws first playable readability surfaces for boss death, insight choices, and settlement", () => {
    const baseViewState = createViewState();
    const viewState: InRunUiViewState = {
      ...baseViewState,
      insight: {
        visible: true,
        mode: "coop",
        sharedFortuneReroll: 1,
        players: [
          {
            playerId: "p1",
            selected: false,
            guardianState: false,
            options: [
              {
                optionId: "insight_01",
                rewardType: "spell_upgrade",
                name: "青云剑意",
                rarity: "rare",
                shortDescription: "飞剑穿透提升",
                buildSynergyTags: ["metal"],
                keyLabel: "J"
              }
            ]
          }
        ]
      }
    };
    const frame: CanvasRenderFrame & {
      readonly outgameSummary: {
        readonly receiptId: string;
        readonly resourcesKept: Readonly<Record<string, number>>;
        readonly upgrades: readonly string[];
        readonly secondRunPowerDelta: number;
      };
    } = {
      viewState,
      effectEvents: [effect("boss_death_cascade", { x: 960, y: 240 }), effect("boss_phase_shift", { x: 960, y: 240 })],
      outgameSummary: {
        receiptId: "receipt_debug_run_stage01_seed_20260522_stage_01_qingyun_boss_victory",
        resourcesKept: {
          spirit_stone_low: 370,
          thunder_marow: 1,
          spirit_vein_seed: 1
        },
        upgrades: ["五雷法页 +1"],
        secondRunPowerDelta: 31.4
      }
    };
    const context = new RecordingCanvasContext();

    new CanvasRenderer().renderFrame(context, frame);

    expect(context.operations).toContain("translate:6:-4");
    expect(context.operations.some((operation) => operation.startsWith("arc:960:240:96:"))).toBe(true);
    expect(context.operations).toContain("fillText:青云剑意:760:430");
    expect(context.operations).toContain("fillText:归府结算:960:302");
    expect(context.operations).toContain("fillText:灵石 +370:960:358");
    expect(context.operations).toContain("fillText:五雷法页 +1:960:430");
    expect(context.operations).not.toContain("drawImage");
    expect(context.operations).not.toContain("externalFont");
  });
});

function command(id: string, layerId: string): RenderCommand {
  return {
    id,
    layerId,
    draw: (context) => {
      context.recordCommand?.(layerId, id);
      context.beginPath();
      context.arc(0, 0, 1, 0, Math.PI * 2);
      context.fill();
    }
  };
}

function effect(effectId: string, position: { readonly x: number; readonly y: number }): EffectEvent {
  return {
    frame: 100,
    ownerPlayerId: "p1",
    spellId: "test",
    effectId,
    position
  };
}

function createViewState(): InRunUiViewState {
  return {
    mode: "insight_paused",
    screen: {
      width: 1920,
      height: 1080,
      scale: 1,
      safeArea: { x: 0, y: 0, width: 1920, height: 1080 }
    },
    players: [
      {
        playerId: "p1",
        core: {
          playerId: "p1",
          displayName: "P1",
          colorToken: "player1",
          realmName: "练气",
          realmLayer: 9,
          hp: 35,
          maxHp: 100,
          qi: 30,
          maxQi: 100,
          aliveState: "body",
          activeStatusTags: [],
          lowHp: true,
          canBeRescued: false
        },
        cultivation: {
          playerId: "p1",
          realmName: "练气",
          layer: 9,
          cultivation: 860,
          cultivationToNext: 860,
          progress01: 1,
          regenPerSecond: 1.6,
          bottleneck: { type: "major_realm", targetRealmName: "筑基", tribulationIncoming: true }
        },
        spells: [],
        pills: [],
        artifacts: {},
        treasures: { slots: [] },
        buildSummary: { techniqueTags: [], talentTags: [], constitutionTags: [] }
      },
      {
        playerId: "p2",
        core: {
          playerId: "p2",
          displayName: "P2",
          colorToken: "player2",
          realmName: "练气",
          realmLayer: 2,
          hp: 0,
          maxHp: 100,
          qi: 70,
          maxQi: 100,
          aliveState: "soul",
          activeStatusTags: [],
          lowHp: true,
          canBeRescued: true,
          rescueProgress: 0.5
        },
        cultivation: {
          playerId: "p2",
          realmName: "练气",
          layer: 2,
          cultivation: 40,
          cultivationToNext: 190,
          progress01: 0.211,
          regenPerSecond: 1.6
        },
        spells: [],
        pills: [],
        artifacts: {},
        treasures: { slots: [] },
        buildSummary: { techniqueTags: [], talentTags: [], constitutionTags: [] }
      }
    ],
    teamInsight: {
      visible: true,
      teamLevel: 3,
      exp: 180,
      expToNext: 180,
      progress01: 1,
      nextTriggerText: "下一次顿悟",
      sharedFortuneReroll: 2,
      isReadyToInsight: true
    },
    stage: {
      stageName: "青云山·妖潮初临",
      segmentName: "妖潮压境",
      segmentIndex: 4,
      segmentCount: 5,
      timeRemaining: 69.333,
      nextEventText: "Boss将临",
      intensity: "high"
    },
    boss: {
      visible: true,
      bossId: "boss_qingyun_tribulation_spirit",
      name: "青云劫灵",
      hp: 2600,
      maxHp: 5200,
      phaseIndex: 2,
      phaseCount: 3,
      phaseName: "phase_2_cloud_press"
    },
    tribulation: {
      active: true,
      playerId: "p1",
      tribulationName: "练气破筑基·局内三九雷劫",
      phase: "active",
      remainingTime: 23.333,
      warningText: "天象异变 · 三九雷劫",
      canClearThunder: false,
      targetRealmName: "筑基",
      lightningWarnings: [
        {
          id: "warn_001",
          x: 760,
          y: 500,
          radius: 80,
          timeToImpact: 1,
          severity: "lethal"
        }
      ]
    },
    rescue: {
      visible: true,
      downedPlayerId: "p2",
      rescuerPlayerId: "p1",
      canRescue: true,
      inRange: true,
      progress01: 0.5,
      hpCostPreviewPercent: 0.35,
      keyLabel: "H",
      decayActive: false
    },
    insight: {
      visible: true,
      mode: "coop",
      sharedFortuneReroll: 2,
      players: []
    },
    prompts: []
  };
}

class RecordingCanvasContext implements CanvasLikeContext {
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
    if (!value.includes("system-ui")) {
      this.operations.push("externalFont");
    }
  }

  public set textAlign(value: CanvasTextAlign) {
    this.operations.push(`textAlign:${value}`);
  }

  public set textBaseline(value: CanvasTextBaseline) {
    this.operations.push(`textBaseline:${value}`);
  }
}
