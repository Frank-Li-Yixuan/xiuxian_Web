import { describe, expect, it } from "vitest";

import { createBrowserGameRuntime } from "../../src/app/BrowserGameRuntime";

describe("browser runtime impact VFX presentation", () => {
  it("derives projectile hit and enemy damage feedback from runtime damage without polluting SimState", () => {
    const runtime = createBrowserGameRuntime({ mode: "single_player", seed: 20260523, startAtBoss: true });
    let snapshot = runtime.getSnapshot();
    let sawProjectileHit = false;
    let sawEnemyDamaged = false;

    for (let frame = 0; frame < 420 && (!sawProjectileHit || !sawEnemyDamaged); frame += 1) {
      snapshot = runtime.step(frame < 15 ? [p1MoveRight(frame)] : []);
      const kinds = snapshot.presentation.visualEvents.map((event) => event.kind);
      sawProjectileHit ||= kinds.includes("projectile_hit");
      sawEnemyDamaged ||= kinds.includes("enemy_damaged");
    }

    expect(sawProjectileHit).toBe(true);
    expect(sawEnemyDamaged).toBe(true);
    expect(snapshot.presentation.visualEvents.some((event) => event.sfxCueId === "sfx.hit.enemy_light_01")).toBe(true);
    expect(Object.keys(snapshot.simState)).not.toEqual(expect.arrayContaining(["presentation", "visualEvents", "spriteVfx"]));
  });

  it("derives enemy death and boss death feedback with sprite requests and SFX hooks", () => {
    const stageRuntime = createBrowserGameRuntime({ mode: "local_coop", seed: 20260523 });
    let stageSnapshot = stageRuntime.getSnapshot();
    let sawEnemyKilled = false;

    for (let frame = 0; frame < 1800 && !sawEnemyKilled; frame += 1) {
      stageSnapshot = stageRuntime.step([]);
      sawEnemyKilled = stageSnapshot.presentation.visualEvents.some((event) => event.kind === "enemy_killed" || event.kind === "elite_killed");
    }

    expect(sawEnemyKilled).toBe(true);
    expect(stageSnapshot.presentation.spriteVfx?.some((request) => request.assetId === "vfx.explosion.small_01")).toBe(true);

    const bossRuntime = createBrowserGameRuntime({ mode: "single_player", seed: 20260523, startAtBoss: true, bossHpScale: 0.02 });
    let bossSnapshot = bossRuntime.getSnapshot();

    for (let frame = 0; frame < 700 && bossSnapshot.presentation.visualEvents.every((event) => event.kind !== "boss_killed"); frame += 1) {
      bossSnapshot = bossRuntime.step(frame < 15 ? [p1MoveRight(frame)] : []);
    }

    expect(bossSnapshot.presentation.visualEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "boss_killed",
          sfxCueId: "sfx.explosion.elite_heavy_01",
          shakeIntensity: "ultimate"
        })
      ])
    );
    expect(bossSnapshot.presentation.spriteVfx?.map((request) => request.assetId)).toContain("vfx.explosion.small_01");
  });
});

function p1MoveRight(frame: number) {
  return {
    frame,
    playerId: "p1" as const,
    moveX: 1 as const,
    moveY: 0 as const,
    downMask: 0,
    pressedMask: 0,
    releasedMask: 0,
    inputSeq: frame + 1
  };
}
