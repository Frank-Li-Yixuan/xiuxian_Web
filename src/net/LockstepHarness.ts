import {
  DesyncDetector,
  type HashComparison,
  type HashMismatch,
  type StateHashReport
} from "./DesyncDetector";
import {
  SnapshotManager,
  createSnapshotCorrectionRequest,
  type SnapshotCorrectionRequest
} from "./SnapshotManager";
import { InputBuffer } from "../sim/input/InputBuffer";
import {
  createEmptyFrameInput,
  validateFrameInput,
  type FrameInput,
  type PlayerId
} from "../sim/input/FrameInput";

export interface LockstepFrameStepOptions<TState> {
  readonly clientId: string;
  readonly state: TState;
  readonly frame: number;
  readonly frameInputs: readonly FrameInput[];
}

export type LockstepFrameStep<TState> = (options: LockstepFrameStepOptions<TState>) => TState;

export interface LockstepHashStateOptions<TState> {
  readonly clientId: string;
  readonly state: TState;
  readonly runId: string;
  readonly seed: number;
  readonly frame: number;
}

export type LockstepHashState<TState> = (options: LockstepHashStateOptions<TState>) => string;

export type LockstepInputScript = (sourceFrame: number, playerId: PlayerId) => Omit<FrameInput, "frame">;

export interface RunTwoClientLockstepHarnessOptions<TState> {
  readonly runId: string;
  readonly seed: number;
  readonly durationFrames: number;
  readonly inputDelayFrames: number;
  readonly hashEveryFrames: number;
  readonly snapshotEveryFrames: number;
  readonly playerIds: readonly PlayerId[];
  readonly clientIds?: readonly string[];
  readonly createInitialState: (options: { readonly clientId: string }) => TState;
  readonly stepFrame: LockstepFrameStep<TState>;
  readonly hashState: LockstepHashState<TState>;
  readonly inputScript?: LockstepInputScript;
}

export interface InputDeliveryRecord {
  readonly sourceFrame: number;
  readonly targetFrame: number;
  readonly playerId: PlayerId;
  readonly inputSeq: number;
  readonly deliveredClientIds: readonly string[];
}

export interface LockstepClientResult<TState> {
  readonly clientId: string;
  readonly finalState: TState;
  readonly finalHash: string;
  readonly hashReports: readonly StateHashReport[];
  readonly snapshotFrames: readonly number[];
  readonly snapshotManager: SnapshotManager<TState>;
}

export interface TwoClientLockstepHarnessResult<TState> {
  readonly runId: string;
  readonly seed: number;
  readonly durationFrames: number;
  readonly inputDelayFrames: number;
  readonly clients: readonly LockstepClientResult<TState>[];
  readonly comparisons: readonly HashComparison[];
  readonly mismatches: readonly HashMismatch[];
  readonly correctionRequests: readonly SnapshotCorrectionRequest[];
  readonly inputDeliveries: readonly InputDeliveryRecord[];
  readonly inputHistoryAfter: (frame: number) => readonly FrameInput[];
}

interface ClientRuntime<TState> {
  readonly clientId: string;
  readonly inputBuffer: InputBuffer;
  readonly snapshotManager: SnapshotManager<TState>;
  readonly hashReports: StateHashReport[];
  state: TState;
}

export function runTwoClientLockstepHarness<TState>(
  options: RunTwoClientLockstepHarnessOptions<TState>
): TwoClientLockstepHarnessResult<TState> {
  validateOptions(options);

  const clientIds = options.clientIds ?? ["client_a", "client_b"];
  validateClientIds(clientIds);
  const hostClientId = requireFirstClientId(clientIds);
  const clients = clientIds.map((clientId) => createClientRuntime(options, clientId));
  const inputHistory = materializeInputHistory(options, clientIds);
  for (const input of inputHistory.inputs) {
    for (const client of clients) {
      client.inputBuffer.setRemoteInput(input);
    }
  }

  const detector = new DesyncDetector({
    clientIds,
    hostClientId,
    consecutiveMismatchThreshold: 2
  });
  const comparisons: HashComparison[] = [];
  const mismatches: HashMismatch[] = [];
  const correctionRequests: SnapshotCorrectionRequest[] = [];

  for (let frame = 0; frame < options.durationFrames; frame += 1) {
    for (const client of clients) {
      client.state = options.stepFrame({
        clientId: client.clientId,
        state: client.state,
        frame,
        frameInputs: client.inputBuffer.getFrameInputs(frame)
      });
    }

    const reportFrame = frame + 1;
    const shouldHash = reportFrame % options.hashEveryFrames === 0;
    const shouldSnapshot = reportFrame % options.snapshotEveryFrames === 0;
    if (!shouldHash && !shouldSnapshot) {
      continue;
    }

    for (const client of clients) {
      const hash = options.hashState({
        clientId: client.clientId,
        state: client.state,
        runId: options.runId,
        seed: options.seed,
        frame: reportFrame
      });
      if (shouldSnapshot) {
        client.snapshotManager.saveSnapshot(reportFrame, client.state, hash);
      }
      if (shouldHash) {
        const report = createHashReport({
          clientId: client.clientId,
          frame: reportFrame,
          hash
        });
        client.hashReports.push(report);
        const detection = detector.recordReport(report);
        if (detection.comparison !== undefined) {
          comparisons.push(detection.comparison);
        }
        if (detection.mismatch !== undefined) {
          mismatches.push(detection.mismatch);
        }
        if (detection.event?.kind === "repair_required") {
          correctionRequests.push(
            createSnapshotCorrectionRequest({
              frame: detection.event.frame,
              requesterClientId: findRequesterClientId(detection.event.mismatch, hostClientId),
              hostClientId,
              reason: "hash_mismatch"
            })
          );
        }
      }
    }
  }

  return {
    runId: options.runId,
    seed: options.seed,
    durationFrames: options.durationFrames,
    inputDelayFrames: options.inputDelayFrames,
    clients: clients.map((client) => ({
      clientId: client.clientId,
      finalState: client.state,
      finalHash: options.hashState({
        clientId: client.clientId,
        state: client.state,
        runId: options.runId,
        seed: options.seed,
        frame: options.durationFrames
      }),
      hashReports: Object.freeze([...client.hashReports]),
      snapshotFrames: client.snapshotManager.getSnapshotFrames(),
      snapshotManager: client.snapshotManager
    })),
    comparisons: Object.freeze(comparisons),
    mismatches: Object.freeze(mismatches),
    correctionRequests: Object.freeze(correctionRequests),
    inputDeliveries: Object.freeze(inputHistory.deliveries),
    inputHistoryAfter: (frame: number) => Object.freeze(inputHistory.inputs.filter((input) => input.frame > frame))
  };
}

function createClientRuntime<TState>(
  options: RunTwoClientLockstepHarnessOptions<TState>,
  clientId: string
): ClientRuntime<TState> {
  return {
    clientId,
    inputBuffer: new InputBuffer({
      inputDelayFrames: options.inputDelayFrames,
      playerIds: options.playerIds
    }),
    snapshotManager: new SnapshotManager<TState>({ clientId }),
    hashReports: [],
    state: options.createInitialState({ clientId })
  };
}

function materializeInputHistory<TState>(
  options: RunTwoClientLockstepHarnessOptions<TState>,
  clientIds: readonly string[]
): {
  readonly inputs: readonly FrameInput[];
  readonly deliveries: readonly InputDeliveryRecord[];
} {
  const inputs: FrameInput[] = [];
  const deliveries: InputDeliveryRecord[] = [];
  for (let sourceFrame = 0; sourceFrame < options.durationFrames; sourceFrame += 1) {
    for (const playerId of options.playerIds) {
      const draft = options.inputScript?.(sourceFrame, playerId) ?? createDefaultInputDraft(sourceFrame, playerId);
      const targetFrame = sourceFrame + options.inputDelayFrames;
      const input: FrameInput = {
        ...draft,
        frame: targetFrame,
        playerId
      };
      validateFrameInput(input);
      inputs.push(input);
      deliveries.push(
        Object.freeze({
          sourceFrame,
          targetFrame,
          playerId,
          inputSeq: input.inputSeq,
          deliveredClientIds: Object.freeze([...clientIds])
        })
      );
    }
  }

  return {
    inputs: Object.freeze(inputs),
    deliveries: Object.freeze(deliveries)
  };
}

function createDefaultInputDraft(sourceFrame: number, playerId: PlayerId): Omit<FrameInput, "frame"> {
  return {
    ...createEmptyFrameInput(0, playerId, sourceFrame),
    playerId,
    inputSeq: sourceFrame
  };
}

function createHashReport(options: {
  readonly clientId: string;
  readonly frame: number;
  readonly hash: string;
}): StateHashReport {
  return Object.freeze({
    clientId: options.clientId,
    frame: options.frame,
    simFrame: options.frame,
    hash: options.hash,
    rngDigest: "not_materialized_in_harness_v0_1",
    entityCountDigest: "not_materialized_in_harness_v0_1"
  });
}

function findRequesterClientId(mismatch: HashMismatch, hostClientId: string): string {
  const hostHash = mismatch.hostHash;
  const requester = mismatch.reports.find((report) => report.clientId !== hostClientId && report.hash !== hostHash);
  if (requester === undefined) {
    throw new Error("could not determine desynced requester client");
  }
  return requester.clientId;
}

function validateOptions<TState>(options: RunTwoClientLockstepHarnessOptions<TState>): void {
  if (options.runId.length === 0) {
    throw new Error("runId must not be empty");
  }
  assertNonNegativeInteger(options.seed, "seed");
  if (options.durationFrames <= 0 || !Number.isInteger(options.durationFrames)) {
    throw new Error("durationFrames must be a positive integer");
  }
  assertNonNegativeInteger(options.inputDelayFrames, "inputDelayFrames");
  if (options.hashEveryFrames <= 0 || !Number.isInteger(options.hashEveryFrames)) {
    throw new Error("hashEveryFrames must be a positive integer");
  }
  if (options.snapshotEveryFrames <= 0 || !Number.isInteger(options.snapshotEveryFrames)) {
    throw new Error("snapshotEveryFrames must be a positive integer");
  }
  validatePlayerIds(options.playerIds);
}

function validateClientIds(clientIds: readonly string[]): void {
  if (clientIds.length !== 2) {
    throw new Error("v0.1 LockstepHarness requires exactly two clients");
  }
  const seen = new Set<string>();
  for (const clientId of clientIds) {
    if (clientId.length === 0) {
      throw new Error("clientId must not be empty");
    }
    if (seen.has(clientId)) {
      throw new Error(`duplicate clientId: ${clientId}`);
    }
    seen.add(clientId);
  }
}

function validatePlayerIds(playerIds: readonly PlayerId[]): void {
  if (playerIds.length === 0) {
    throw new Error("playerIds must not be empty");
  }
  const seen = new Set<string>();
  for (const playerId of playerIds) {
    if (playerId.length === 0) {
      throw new Error("playerId must not be empty");
    }
    if (seen.has(playerId)) {
      throw new Error(`duplicate playerId: ${playerId}`);
    }
    seen.add(playerId);
  }
}

function requireFirstClientId(clientIds: readonly string[]): string {
  const clientId = clientIds[0];
  if (clientId === undefined) {
    throw new Error("clientIds must not be empty");
  }
  return clientId;
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
}
