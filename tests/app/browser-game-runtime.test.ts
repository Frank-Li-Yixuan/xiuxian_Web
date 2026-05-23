import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CanvasRenderer } from "../../src/render/CanvasRenderer";
import type { CanvasLikeContext } from "../../src/render/PrimitiveDrawing";
import { InputButtonBit } from "../../src/sim/input/FrameInput";
import { createBrowserGameRuntime } from "../../src/app/BrowserGameRuntime";
import { LocalKeyboardInputSource } from "../../src/app/LocalKeyboardInput";

describe("browser playable shell", () => {
  it("ships an HTML entry that mounts the browser game app without external resources", () => {
    const html = readFileSync(join(process.cwd(), "index.html"), "utf8");

    expect(html).toContain("/src/app/BrowserGameApp.ts");
    expect(html).toContain("xiuxian-game-root");
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toMatch(/cdn|fonts\.googleapis|@font-face/i);
  });

  it("maps local two-player keyboard state into deterministic FrameInput transitions", () => {
    const input = new LocalKeyboardInputSource(["p1", "p2"]);

    input.setKeyDown("KeyD", true);
    input.setKeyDown("KeyW", true);
    input.setKeyDown("KeyJ", true);
    input.setKeyDown("ShiftLeft", true);
    input.setKeyDown("ArrowLeft", true);
    input.setKeyDown("Numpad1", true);
    input.setKeyDown("Numpad0", true);

    const first = input.createFrameInputs(10);
    const second = input.createFrameInputs(11);

    expect(first).toEqual([
      expect.objectContaining({
        frame: 10,
        playerId: "p1",
        moveX: 1,
        moveY: -1,
        downMask: InputButtonBit.Spell1 | InputButtonBit.Focus,
        pressedMask: InputButtonBit.Spell1 | InputButtonBit.Focus
      }),
      expect.objectContaining({
        frame: 10,
        playerId: "p2",
        moveX: -1,
        moveY: 0,
        downMask: InputButtonBit.Spell1 | InputButtonBit.Interact,
        pressedMask: InputButtonBit.Spell1 | InputButtonBit.Interact
      })
    ]);
    expect(second[0]?.pressedMask).toBe(0);
    expect(second[1]?.pressedMask).toBe(0);
  });

  it("pauses combat during insight and resumes after both players choose rewards", () => {
    const runtime = createBrowserGameRuntime({ mode: "local_coop", seed: 20260523 });
    runtime.forceInsightForReview();

    const opened = runtime.getSnapshot();
    const pausedFrame = opened.simState.frame;
    const p2CultivationBefore = opened.simState.playerCultivations.find((cultivation) => cultivation.playerId === "p2")?.cultivation ?? 0;
    expect(opened.viewState.insight?.visible).toBe(true);
    expect(opened.viewState.insight?.players.find((player) => player.playerId === "p2")?.options[2]?.rewardType).toBe("cultivation_boost");
    expect(opened.viewState.insight?.players.find((player) => player.playerId === "p2")?.options[2]?.keyLabel).toBe("Num5");

    const idleDuringInsight = runtime.step([]);
    expect(idleDuringInsight.simState.frame).toBe(pausedFrame);
    expect(idleDuringInsight.viewState.insight?.visible).toBe(true);

    const completed = runtime.step([
      {
        frame: pausedFrame,
        playerId: "p1",
        moveX: 0,
        moveY: 0,
        downMask: InputButtonBit.Spell1,
        pressedMask: InputButtonBit.Spell1,
        releasedMask: 0,
        inputSeq: 10
      },
      {
        frame: pausedFrame,
        playerId: "p2",
        moveX: 0,
        moveY: 0,
        downMask: InputButtonBit.Spell3,
        pressedMask: InputButtonBit.Spell3,
        releasedMask: 0,
        inputSeq: 11
      }
    ]);

    expect(completed.simState.frame).toBe(pausedFrame);
    expect(completed.viewState.insight).toBeUndefined();
    expect(completed.simState.playerCultivations.find((cultivation) => cultivation.playerId === "p2")?.cultivation).toBeGreaterThan(p2CultivationBefore);

    const resumed = runtime.step([]);
    expect(resumed.simState.frame).toBe(pausedFrame + 1);
    expect(resumed.viewState.insight).toBeUndefined();
  });

  it("keeps Qingyun boss HP gameplay-owned and damageable by player projectiles", () => {
    const runtime = createBrowserGameRuntime({ mode: "single_player", seed: 20260523, startAtBoss: true });
    let snapshot = runtime.getSnapshot();

    for (let frame = 0; frame < 15; frame += 1) {
      snapshot = runtime.step([p1Input({ frame, moveX: 1 })]);
    }

    const spawnedBoss = snapshot.simState.bosses[0];
    expect(spawnedBoss).toEqual(expect.objectContaining({ bossId: "boss_qingyun_tribulation_spirit", hp: 5200 }));

    const oneFrameLater = runtime.step([]);
    expect(oneFrameLater.simState.bosses[0]?.hp).toBe(spawnedBoss?.hp);

    let damaged = oneFrameLater;
    for (let frame = 0; frame < 360; frame += 1) {
      damaged = runtime.step([]);
    }

    expect(damaged.simState.bosses[0]?.hp).toBeLessThan(spawnedBoss?.hp ?? 0);
    expect(damaged.effectEvents.map((event) => event.effectId)).toContain("boss_body");
  });

  it("emits boss death cascade when runtime boss HP reaches zero", () => {
    const runtime = createBrowserGameRuntime({ mode: "single_player", seed: 20260523, startAtBoss: true, bossHpScale: 0.02 });
    let snapshot = runtime.getSnapshot();

    for (let frame = 0; frame < 15; frame += 1) {
      snapshot = runtime.step([p1Input({ frame, moveX: 1 })]);
    }
    for (let frame = 0; frame < 600 && snapshot.effectEvents.every((event) => event.effectId !== "boss_death_cascade"); frame += 1) {
      snapshot = runtime.step([]);
    }

    expect(snapshot.simState.bosses[0]?.hp).toBe(0);
    expect(snapshot.effectEvents.map((event) => event.effectId)).toContain("boss_death_cascade");
  });

  it("creates a real settlement summary from browser boss victory", () => {
    const runtime = createBrowserGameRuntime({ mode: "single_player", seed: 20260523, startAtBoss: true, bossHpScale: 0.02 });
    let snapshot = runtime.getSnapshot();

    for (let frame = 0; frame < 15; frame += 1) {
      snapshot = runtime.step([p1Input({ frame, moveX: 1 })]);
    }
    for (let frame = 0; frame < 600 && snapshot.stageOutcome !== "boss_victory"; frame += 1) {
      snapshot = runtime.step([]);
    }

    expect(snapshot.stageOutcome).toBe("boss_victory");
    expect(snapshot.outgameSummary).toEqual(
      expect.objectContaining({
        receiptId: "receipt_debug_run_stage01_seed_20260522_stage_01_qingyun_boss_victory",
        resourcesKept: expect.objectContaining({
          spirit_stone_low: 370,
          spirit_vein_seed: 1
        })
      })
    );
    expect(snapshot.outgameSummary?.resourcesKept.spirit_stone_low).not.toBe(18);
  });

  it("maps debug team-wipe completion through real settlement data", () => {
    const runtime = createBrowserGameRuntime({ mode: "single_player", seed: 20260523 });

    runtime.completeRunForReview("team_wipe");
    const snapshot = runtime.getSnapshot();

    expect(snapshot.stageOutcome).toBe("team_wipe");
    expect(snapshot.outgameSummary).toEqual(
      expect.objectContaining({
        receiptId: "receipt_debug_run_stage01_seed_20260522_stage_01_qingyun_team_wipe",
        resourcesKept: expect.objectContaining({
          spirit_stone_low: 105,
          qingling_herb: 6,
          demon_core_small: 2
        })
      })
    );
    expect(snapshot.outgameSummary?.resourcesKept.spirit_stone_low).not.toBe(8);
  });

  it("advances a two-player browser runtime through input, renderable view state, insight, rescue, and debug tribulation evidence", () => {
    const runtime = createBrowserGameRuntime({ mode: "local_coop", seed: 20260523 });
    const before = runtime.getSnapshot();
    const p1StartX = before.simState.players.find((player) => player.playerId === "p1")?.position.x;

    runtime.step([
      {
        frame: 0,
        playerId: "p1",
        moveX: 1,
        moveY: -1,
        downMask: InputButtonBit.Spell1 | InputButtonBit.Pill1 | InputButtonBit.Focus,
        pressedMask: InputButtonBit.Spell1 | InputButtonBit.Pill1,
        releasedMask: 0,
        inputSeq: 1
      },
      {
        frame: 0,
        playerId: "p2",
        moveX: -1,
        moveY: 0,
        downMask: InputButtonBit.Spell1,
        pressedMask: InputButtonBit.Spell1,
        releasedMask: 0,
        inputSeq: 2
      }
    ]);
    runtime.forceInsightForReview();
    runtime.forceP2SoulForReview();
    runtime.step([
      {
        frame: 1,
        playerId: "p1",
        moveX: 0,
        moveY: 0,
        downMask: InputButtonBit.Interact,
        pressedMask: InputButtonBit.Interact,
        releasedMask: 0,
        inputSeq: 3
      },
      {
        frame: 1,
        playerId: "p2",
        moveX: 0,
        moveY: 0,
        downMask: 0,
        pressedMask: 0,
        releasedMask: 0,
        inputSeq: 4
      }
    ]);
    runtime.triggerDebugTribulationForReview("p1");

    const snapshot = runtime.getSnapshot();
    const p1 = snapshot.simState.players.find((player) => player.playerId === "p1");
    const p2 = snapshot.simState.players.find((player) => player.playerId === "p2");
    const commands = new CanvasRenderer().buildRenderCommands({
      viewState: snapshot.viewState,
      effectEvents: snapshot.effectEvents
    });

    expect(p1?.position.x).toBeGreaterThan(p1StartX ?? 0);
    expect(p2?.aliveState).toBe("soul");
    expect(snapshot.viewState.players).toHaveLength(2);
    expect(snapshot.viewState.insight?.visible).toBe(true);
    expect(snapshot.viewState.rescue?.visible).toBe(true);
    expect(snapshot.viewState.tribulation?.active).toBe(true);
    expect(snapshot.effectEvents.map((event) => event.effectId)).toEqual(
      expect.arrayContaining(["player_body", "player_projectile_low", "player_hitbox", "tribulation_strike"])
    );
    expect(commands.map((command) => command.layerId)).toEqual(
      expect.arrayContaining(["players", "player_projectiles_low", "player_hitbox", "tribulation_strikes", "hud"])
    );
    expect(snapshot.rcEvidence).toEqual(
      expect.objectContaining({
        browserCanvasPlayable: true,
        localCoopPlayers: 2,
        spellInputObserved: true,
        pillInputObserved: true,
        insightOverlayObserved: true,
        rescueOverlayObserved: true,
        debugTribulationObserved: true
      })
    );
  });

  it("renders browser runtime commands through Canvas 2D primitives without image or font dependencies", () => {
    const runtime = createBrowserGameRuntime({ mode: "local_coop", seed: 20260523 });
    runtime.step([]);

    const renderer = new CanvasRenderer();
    const context = new RecordingCanvasContext();
    renderer.renderFrame(context, runtime.getSnapshot());

    expect(context.operations).not.toContain("drawImage");
    expect(context.operations).not.toContain("externalFont");
    expect(context.operations.some((operation) => operation.startsWith("fillText:"))).toBe(true);
  });
});

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

function p1Input(options: { readonly frame: number; readonly moveX?: -1 | 0 | 1; readonly pressedMask?: number }) {
  return {
    frame: options.frame,
    playerId: "p1" as const,
    moveX: options.moveX ?? 0,
    moveY: 0 as const,
    downMask: options.pressedMask ?? 0,
    pressedMask: options.pressedMask ?? 0,
    releasedMask: 0,
    inputSeq: options.frame + 1
  };
}
