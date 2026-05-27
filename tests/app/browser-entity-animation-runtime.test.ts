import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { createBrowserGameRuntime } from "../../src/app/BrowserGameRuntime";
import { InputButtonBit, type FrameInput } from "../../src/sim/input/FrameInput";

describe("browser runtime entity animation presentation", () => {
  it("derives player cast and enemy hit/death animation events without polluting SimState", () => {
    const runtime = createBrowserGameRuntime({ mode: "local_coop", seed: 20260523 });
    let snapshot = runtime.step([input(0, "p1", InputButtonBit.Spell1)]);

    expect(snapshot.presentation.entityAnimationEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityKind: "player",
          entityId: "p1",
          animation: "cast",
          sourceId: "spell_five_thunder"
        })
      ])
    );

    let sawEnemyHit = false;
    let sawEnemyDeath = false;
    for (let frame = 1; frame < 2600 && (!sawEnemyHit || !sawEnemyDeath); frame += 1) {
      snapshot = runtime.step([]);
      sawEnemyHit ||= snapshot.presentation.entityAnimationEvents?.some(
        (event) => event.entityKind === "enemy" && event.animation === "hit"
      ) === true;
      sawEnemyDeath ||= snapshot.presentation.entityAnimationEvents?.some(
        (event) => event.entityKind === "enemy" && event.animation === "death"
      ) === true;
    }

    expect(sawEnemyHit).toBe(true);
    expect(sawEnemyDeath).toBe(true);
    expect(Object.keys(snapshot.simState)).not.toEqual(
      expect.arrayContaining(["entityAnimationEvents", "animationHint", "spriteEntity", "presentation"])
    );
  });

  it("surfaces render-only velocity, spawnFrame, and animation hints from runtime presentation", () => {
    const runtime = createBrowserGameRuntime({ mode: "local_coop", seed: 20260523 });
    let snapshot = runtime.getSnapshot();

    for (let frame = 0; frame < 2100 && snapshot.presentation.warnings.every((warning) => warning.kind !== "wolf_charge"); frame += 1) {
      snapshot = runtime.step([]);
    }

    expect(snapshot.presentation.players[0]).toEqual(
      expect.objectContaining({
        velocity: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) })
      })
    );
    expect(snapshot.presentation.enemies.some((enemy) => enemy.spawnFrame !== undefined)).toBe(true);
    expect(snapshot.presentation.enemies.some((enemy) => enemy.animationHint === "attack")).toBe(true);
    expect(Object.keys(snapshot.simState)).not.toEqual(expect.arrayContaining(["velocity", "spawnFrame", "animationHint"]));
  });

  it("keeps BrowserGameApp entity sprite loading as an async render-only upgrade with fallback", () => {
    const appSource = readFileSync(join(process.cwd(), "src/app/BrowserGameApp.ts"), "utf8");

    expect(appSource).toContain("SpriteEntityRenderer");
    expect(appSource).toContain("spriteEntityRenderer: new SpriteEntityRenderer");
    expect(appSource).toContain('canvas.dataset.combatAssetRenderer = "procedural-fallback"');
  });
});

function input(frame: number, playerId: "p1" | "p2", pressedMask: number): FrameInput {
  return {
    frame,
    playerId,
    moveX: 0,
    moveY: 0,
    downMask: pressedMask,
    pressedMask,
    releasedMask: 0,
    inputSeq: frame + (playerId === "p1" ? 1 : 1000)
  };
}
