import { describe, expect, it } from "vitest";

import {
  DEFAULT_COMBAT_BOUNDS,
  DEFAULT_FOCUS_SPEED_MULTIPLIER,
  createCombatPlayer,
  stepPlayers
} from "../../src/sim/player/PlayerSystem";
import { InputButtonBit, type FrameInput } from "../../src/sim/input/FrameInput";
import { SIM_FPS, secondsToFrames } from "../../src/sim/SimConstants";
import {
  createArtifactRuntimeState,
  stepArtifactSystem,
  type ArtifactDefinition
} from "../../src/sim/artifacts/ArtifactSystem";
import { ProjectileManager } from "../../src/sim/projectiles/ProjectileSystem";

const ARTIFACTS: Readonly<Record<string, ArtifactDefinition>> = {
  artifact_qingshuang_sword: {
    id: "artifact_qingshuang_sword",
    attack: {
      patternId: "straight_pierce_sword",
      fireInterval: 0.18,
      projectileSpeed: 850,
      damage: 10,
      projectileCount: 1,
      pierce: 1
    }
  },
  artifact_ziyang_gourd: {
    id: "artifact_ziyang_gourd",
    attack: {
      patternId: "fan_flame_breath",
      fireInterval: 0.36,
      projectileSpeed: 420,
      damage: 7,
      projectileCount: 5,
      spreadAngleDeg: 55
    }
  },
  artifact_xuanyue_seal: {
    id: "artifact_xuanyue_seal",
    attack: {
      patternId: "delayed_area_slam",
      fireInterval: 0.85,
      damage: 36,
      radius: 90,
      delay: 0.45
    }
  }
};

describe("PlayerSystem", () => {
  it("moves P1 and P2 from frame inputs with normalized diagonal speed", () => {
    const players = [
      createCombatPlayer({
        playerId: "p1",
        natalArtifactId: "artifact_qingshuang_sword",
        position: { x: 700, y: 900 }
      }),
      createCombatPlayer({
        playerId: "p2",
        natalArtifactId: "artifact_ziyang_gourd",
        position: { x: 900, y: 850 }
      })
    ];

    const nextPlayers = stepPlayers({
      players,
      frameInputs: [
        frameInput({ playerId: "p1", moveX: 1, moveY: -1 }),
        frameInput({ playerId: "p2", moveX: -1, moveY: 0 })
      ]
    });

    const diagonalDelta = (400 / SIM_FPS) * Math.SQRT1_2;
    expect(nextPlayers[0]?.position.x).toBeCloseTo(700 + diagonalDelta, 8);
    expect(nextPlayers[0]?.position.y).toBeCloseTo(900 - diagonalDelta, 8);
    expect(nextPlayers[1]?.position.x).toBeCloseTo(900 - 400 / SIM_FPS, 8);
    expect(nextPlayers[1]?.position.y).toBe(850);
  });

  it("reduces speed in focus mode and clamps to combat bounds by hitbox radius", () => {
    const players = [
      createCombatPlayer({
        playerId: "p1",
        natalArtifactId: "artifact_qingshuang_sword",
        position: { x: DEFAULT_COMBAT_BOUNDS.x + 3, y: DEFAULT_COMBAT_BOUNDS.y + 3 }
      })
    ];

    const nextPlayers = stepPlayers({
      players,
      frameInputs: [
        frameInput({
          playerId: "p1",
          moveX: -1,
          moveY: -1,
          downMask: InputButtonBit.Focus
        })
      ]
    });

    const player = nextPlayers[0];
    expect(player?.position.x).toBe(DEFAULT_COMBAT_BOUNDS.x + 7);
    expect(player?.position.y).toBe(DEFAULT_COMBAT_BOUNDS.y + 7);
    expect(player?.focusSpeedMultiplier).toBe(DEFAULT_FOCUS_SPEED_MULTIPLIER);
  });
});

describe("ArtifactSystem", () => {
  it("auto-fires QingShuang sword without shoot input and respects frame cooldowns", () => {
    const players = [
      createCombatPlayer({
        playerId: "p1",
        natalArtifactId: "artifact_qingshuang_sword",
        position: { x: 800, y: 920 }
      })
    ];
    const projectileManager = new ProjectileManager();
    let artifactState = createArtifactRuntimeState(players);

    artifactState = stepArtifactSystem({
      frame: 0,
      players,
      artifactState,
      artifactDefinitions: ARTIFACTS,
      projectileManager
    });

    expect(projectileManager.getProjectilesSorted()).toHaveLength(1);
    expect(projectileManager.getProjectilesSorted()[0]).toMatchObject({
      ownerPlayerId: "p1",
      artifactId: "artifact_qingshuang_sword",
      patternId: "straight_pierce_sword",
      damage: 10,
      pierce: 1,
      velocity: { x: 0, y: -850 },
      position: { x: 800, y: 920 }
    });

    stepArtifactSystem({
      frame: secondsToFrames(0.18) - 1,
      players,
      artifactState,
      artifactDefinitions: ARTIFACTS,
      projectileManager
    });
    expect(projectileManager.getProjectilesSorted()).toHaveLength(1);

    artifactState = stepArtifactSystem({
      frame: secondsToFrames(0.18),
      players,
      artifactState,
      artifactDefinitions: ARTIFACTS,
      projectileManager
    });
    expect(projectileManager.getProjectilesSorted()).toHaveLength(2);
    expect(artifactState[0]?.nextFireFrame).toBe(secondsToFrames(0.18) * 2);
  });

  it("auto-fires ZiYang gourd as a deterministic five-projectile fan", () => {
    const players = [
      createCombatPlayer({
        playerId: "p2",
        natalArtifactId: "artifact_ziyang_gourd",
        position: { x: 760, y: 860 }
      })
    ];
    const projectileManager = new ProjectileManager();

    stepArtifactSystem({
      frame: 0,
      players,
      artifactState: createArtifactRuntimeState(players),
      artifactDefinitions: ARTIFACTS,
      projectileManager
    });

    const projectiles = projectileManager.getProjectilesSorted();
    expect(projectiles).toHaveLength(5);
    expect(projectiles.map((projectile) => projectile.damage)).toEqual([7, 7, 7, 7, 7]);
    expect(projectiles.map((projectile) => projectile.patternId)).toEqual([
      "fan_flame_breath",
      "fan_flame_breath",
      "fan_flame_breath",
      "fan_flame_breath",
      "fan_flame_breath"
    ]);
    expect(projectiles[0]?.velocity.x).toBeLessThan(0);
    expect(projectiles[2]?.velocity.x).toBeCloseTo(0, 8);
    expect(projectiles[2]?.velocity.y).toBeCloseTo(-420, 8);
    expect(projectiles[4]?.velocity.x).toBeCloseTo(-(projectiles[0]?.velocity.x ?? 0), 8);
  });

  it("auto-fires XuanYue seal as a delayed deterministic area slam", () => {
    const players = [
      createCombatPlayer({
        playerId: "p1",
        natalArtifactId: "artifact_xuanyue_seal",
        position: { x: 900, y: 880 }
      })
    ];
    const projectileManager = new ProjectileManager();

    stepArtifactSystem({
      frame: 30,
      players,
      artifactState: createArtifactRuntimeState(players),
      artifactDefinitions: ARTIFACTS,
      projectileManager
    });

    expect(projectileManager.getProjectilesSorted()).toEqual([
      expect.objectContaining({
        ownerPlayerId: "p1",
        artifactId: "artifact_xuanyue_seal",
        patternId: "delayed_area_slam",
        kind: "delayed_area",
        damage: 36,
        radius: 90,
        delayFrames: secondsToFrames(0.45),
        spawnFrame: 30,
        velocity: { x: 0, y: 0 },
        position: { x: 900, y: 560 }
      })
    ]);
  });
});

function frameInput(input: {
  readonly playerId: string;
  readonly moveX: -1 | 0 | 1;
  readonly moveY: -1 | 0 | 1;
  readonly downMask?: number;
}): FrameInput {
  return {
    frame: 0,
    playerId: input.playerId,
    moveX: input.moveX,
    moveY: input.moveY,
    downMask: input.downMask ?? 0,
    pressedMask: 0,
    releasedMask: 0,
    inputSeq: 0
  };
}
