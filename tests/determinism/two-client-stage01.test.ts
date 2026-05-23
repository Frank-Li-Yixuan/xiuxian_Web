import { describe, expect, it } from "vitest";

import {
  runTwoClientLockstepHarness,
  type LockstepFrameStep,
  type LockstepHashState
} from "../../src/net/LockstepHarness";
import { createSnapshotCorrectionResponse } from "../../src/net/SnapshotManager";
import { computeStateHash } from "../../src/sim/core/StateHash";
import { InputButtonBit, type FrameInput } from "../../src/sim/input/FrameInput";
import { runFirstPlayableHeadless } from "../../tools/run-headless-stage01";

describe("Two-client stage01 determinism harness", () => {
  it("keeps two clients in lockstep with same seed, same delayed inputs, and 120-frame hash reports", () => {
    const stage01 = runFirstPlayableHeadless({
      runId: "two_client_stage01_seed_10001",
      seed: 10001,
      secondRunSeed: 10002
    });
    const result = runTwoClientLockstepHarness({
      runId: "two_client_stage01_seed_10001",
      seed: 10001,
      durationFrames: 6000,
      inputDelayFrames: 4,
      hashEveryFrames: 120,
      snapshotEveryFrames: 120,
      playerIds: ["p1", "p2"],
      clientIds: ["client_a", "client_b"],
      createInitialState: ({ clientId }) => createStage01LockstepState(stage01.finalStateHash, clientId),
      stepFrame: stepStage01LockstepFrame,
      hashState: hashStage01LockstepState,
      inputScript: createStage01Input
    });

    expect(result.inputDelayFrames).toBe(4);
    expect(result.inputDeliveries[0]).toEqual(
      expect.objectContaining({
        sourceFrame: 0,
        targetFrame: 4,
        playerId: "p1"
      })
    );
    expect(result.clients.map((client) => client.clientId)).toEqual(["client_a", "client_b"]);
    expect(result.mismatches).toEqual([]);
    expect(result.correctionRequests).toEqual([]);
    expect(result.comparisons).toHaveLength(50);
    expect(result.comparisons.map((comparison) => comparison.frame)).toEqual(
      Array.from({ length: 50 }, (_, index) => (index + 1) * 120)
    );
    expect(result.clients[0]?.hashReports).toHaveLength(50);
    expect(result.clients[0]?.snapshotFrames).toEqual(result.comparisons.map((comparison) => comparison.frame));
    expect(result.clients[0]?.finalHash).toBe(result.clients[1]?.finalHash);
    expect(result.clients[0]?.finalState).toEqual(result.clients[1]?.finalState);
  });

  it("detects a persistent mismatch and exposes the host snapshot correction placeholder", () => {
    const stage01 = runFirstPlayableHeadless({
      runId: "two_client_stage01_seed_10001",
      seed: 10001,
      secondRunSeed: 10002
    });
    const result = runTwoClientLockstepHarness({
      runId: "two_client_stage01_seed_10001",
      seed: 10001,
      durationFrames: 600,
      inputDelayFrames: 4,
      hashEveryFrames: 120,
      snapshotEveryFrames: 120,
      playerIds: ["p1", "p2"],
      clientIds: ["client_a", "client_b"],
      createInitialState: ({ clientId }) => createStage01LockstepState(stage01.finalStateHash, clientId),
      stepFrame: (input) => {
        const next = stepStage01LockstepFrame(input);
        return input.clientId === "client_b" && input.frame >= 240
          ? { ...next, injectedDrift: next.injectedDrift + 1 }
          : next;
      },
      hashState: hashStage01LockstepState,
      inputScript: createStage01Input
    });

    expect(result.mismatches.map((mismatch) => mismatch.frame)).toEqual([360, 480, 600]);
    expect(result.correctionRequests).toEqual([
      expect.objectContaining({
        frame: 480,
        requesterClientId: "client_b",
        hostClientId: "client_a",
        reason: "hash_mismatch"
      }),
      expect.objectContaining({
        frame: 600,
        requesterClientId: "client_b",
        hostClientId: "client_a",
        reason: "hash_mismatch"
      })
    ]);

    const latestRequest = result.correctionRequests.at(-1);
    expect(latestRequest).toBeDefined();
    const hostSnapshot = result.clients[0]?.snapshotManager.getLatestSnapshot();
    expect(hostSnapshot).toEqual(expect.objectContaining({ frame: 600, clientId: "client_a" }));
    const response = createSnapshotCorrectionResponse({
      request: latestRequest!,
      snapshot: hostSnapshot!,
      inputHistory: result.inputHistoryAfter(hostSnapshot!.frame)
    });
    expect(response.type).toBe("snapshot_correction_response");
    expect(response.requestId).toBe(latestRequest?.requestId);
    expect(response.snapshot.frame).toBe(600);
  });
});

interface Stage01LockstepState {
  readonly runStageHash: string;
  readonly frame: number;
  readonly inputDigest: number;
  readonly p1FocusFrames: number;
  readonly p2FocusFrames: number;
  readonly injectedDrift: number;
}

function createStage01LockstepState(runStageHash: string, clientId: string): Stage01LockstepState {
  expect(clientId.length).toBeGreaterThan(0);
  return {
    runStageHash,
    frame: 0,
    inputDigest: 0,
    p1FocusFrames: 0,
    p2FocusFrames: 0,
    injectedDrift: 0
  };
}

const stepStage01LockstepFrame: LockstepFrameStep<Stage01LockstepState> = ({ state, frameInputs }) => {
  const inputDigest = frameInputs.reduce((digest, input) => {
    const playerSalt = input.playerId === "p1" ? 17 : 31;
    return (
      (digest +
        playerSalt +
        input.frame * 3 +
        input.inputSeq * 5 +
        input.moveX * 7 +
        input.moveY * 11 +
        input.downMask * 13 +
        input.pressedMask * 19 +
        input.releasedMask * 23) >>>
      0
    );
  }, state.inputDigest);

  return {
    ...state,
    frame: state.frame + 1,
    inputDigest,
    p1FocusFrames: state.p1FocusFrames + (isFocusHeld(frameInputs, "p1") ? 1 : 0),
    p2FocusFrames: state.p2FocusFrames + (isFocusHeld(frameInputs, "p2") ? 1 : 0)
  };
};

const hashStage01LockstepState: LockstepHashState<Stage01LockstepState> = ({ runId, seed, frame, state }) => {
  const hashPlayers = [
    {
      playerId: "p1",
      focusFrames: state.p1FocusFrames,
      inputDigest: state.inputDigest,
      injectedDrift: state.injectedDrift
    },
    {
      playerId: "p2",
      focusFrames: state.p2FocusFrames,
      inputDigest: state.inputDigest,
      injectedDrift: state.injectedDrift
    }
  ];
  const hashCultivations = [
    { playerId: "p1", realmId: "realm_qi_refining", layer: 1 },
    { playerId: "p2", realmId: "realm_qi_refining", layer: 1 }
  ];

  return computeStateHash({
    runId,
    seed,
    dataPackHash: state.runStageHash,
    stageId: "stage_01_qingyun",
    frame,
    players: hashPlayers,
    enemies: [],
    projectiles: [],
    pickups: [],
    bosses: [],
    tribulations: [],
    teamInsightExp: { level: 1, exp: 0, expToNext: 100, sharedFortuneReroll: 0 },
    playerCultivations: hashCultivations,
    rescueStates: [],
    rng: { scriptSeed: seed, frameDigest: state.inputDigest }
  });
};

function createStage01Input(sourceFrame: number, playerId: string): Omit<FrameInput, "frame"> {
  const focusHeld = playerId === "p1" ? sourceFrame % 90 < 30 : sourceFrame % 120 >= 80;
  const spellPressed = sourceFrame % (playerId === "p1" ? 240 : 360) === 0;
  const downMask = focusHeld ? InputButtonBit.Focus : 0;
  const pressedMask = spellPressed ? InputButtonBit.Spell1 : 0;

  return {
    playerId,
    moveX: sourceFrame % 180 < 90 ? -1 : 1,
    moveY: playerId === "p1" ? -1 : 1,
    downMask: downMask | pressedMask,
    pressedMask,
    releasedMask: 0,
    inputSeq: sourceFrame + (playerId === "p1" ? 1 : 100_001)
  };
}

function isFocusHeld(inputs: readonly FrameInput[], playerId: string): boolean {
  return inputs.some((input) => input.playerId === playerId && (input.downMask & InputButtonBit.Focus) === InputButtonBit.Focus);
}
