export interface SimulationSnapshot<TState> {
  readonly type: "simulation_snapshot";
  readonly clientId: string;
  readonly frame: number;
  readonly stateHash: string;
  readonly state: TState;
}

export interface SnapshotCorrectionRequest {
  readonly type: "snapshot_correction_request";
  readonly requestId: string;
  readonly frame: number;
  readonly requesterClientId: string;
  readonly hostClientId: string;
  readonly reason: "hash_mismatch" | "reconnect" | "manual";
}

export interface SnapshotCorrectionResponse<TState> {
  readonly type: "snapshot_correction_response";
  readonly requestId: string;
  readonly requesterClientId: string;
  readonly hostClientId: string;
  readonly snapshot: SimulationSnapshot<TState>;
  readonly inputHistory: readonly unknown[];
}

export interface SnapshotManagerOptions {
  readonly clientId: string;
  readonly maxSnapshots?: number;
}

export class SnapshotManager<TState> {
  private readonly clientId: string;
  private readonly maxSnapshots: number;
  private readonly snapshots: SimulationSnapshot<TState>[] = [];

  public constructor(options: SnapshotManagerOptions) {
    if (options.clientId.length === 0) {
      throw new Error("clientId must not be empty");
    }
    this.clientId = options.clientId;
    this.maxSnapshots = options.maxSnapshots ?? 180;
    if (!Number.isInteger(this.maxSnapshots) || this.maxSnapshots <= 0) {
      throw new Error("maxSnapshots must be a positive integer");
    }
  }

  public saveSnapshot(frame: number, state: TState, stateHash: string): SimulationSnapshot<TState> {
    assertNonNegativeInteger(frame, "snapshot frame");
    if (stateHash.length === 0) {
      throw new Error("stateHash must not be empty");
    }

    const snapshot = deepFreeze({
      type: "simulation_snapshot" as const,
      clientId: this.clientId,
      frame,
      stateHash,
      state: structuredClone(state)
    });
    this.snapshots.push(snapshot);
    while (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
    return snapshot;
  }

  public getSnapshotFrames(): readonly number[] {
    return Object.freeze(this.snapshots.map((snapshot) => snapshot.frame));
  }

  public getLatestSnapshot(): SimulationSnapshot<TState> | undefined {
    return this.snapshots.at(-1);
  }

  public getLatestSnapshotAtOrBefore(frame: number): SimulationSnapshot<TState> | undefined {
    assertNonNegativeInteger(frame, "snapshot lookup frame");
    for (let index = this.snapshots.length - 1; index >= 0; index -= 1) {
      const snapshot = this.snapshots[index];
      if (snapshot !== undefined && snapshot.frame <= frame) {
        return snapshot;
      }
    }
    return undefined;
  }

  public restoreSnapshot(snapshot: SimulationSnapshot<TState>): TState {
    validateSnapshot(snapshot);
    return structuredClone(snapshot.state);
  }
}

export function createSnapshotCorrectionRequest(options: {
  readonly frame: number;
  readonly requesterClientId: string;
  readonly hostClientId: string;
  readonly reason: SnapshotCorrectionRequest["reason"];
}): SnapshotCorrectionRequest {
  assertNonNegativeInteger(options.frame, "snapshot correction frame");
  if (options.requesterClientId.length === 0) {
    throw new Error("requesterClientId must not be empty");
  }
  if (options.hostClientId.length === 0) {
    throw new Error("hostClientId must not be empty");
  }
  if (options.requesterClientId === options.hostClientId) {
    throw new Error("snapshot requester must not be the host");
  }

  return Object.freeze({
    type: "snapshot_correction_request",
    requestId: `snapshot_repair_${options.frame}_${options.requesterClientId}_from_${options.hostClientId}`,
    frame: options.frame,
    requesterClientId: options.requesterClientId,
    hostClientId: options.hostClientId,
    reason: options.reason
  });
}

export function createSnapshotCorrectionResponse<TState>(options: {
  readonly request: SnapshotCorrectionRequest;
  readonly snapshot: SimulationSnapshot<TState>;
  readonly inputHistory: readonly unknown[];
}): SnapshotCorrectionResponse<TState> {
  validateSnapshot(options.snapshot);
  if (options.snapshot.clientId !== options.request.hostClientId) {
    throw new Error("snapshot correction response must use a host snapshot");
  }

  return deepFreeze({
    type: "snapshot_correction_response" as const,
    requestId: options.request.requestId,
    requesterClientId: options.request.requesterClientId,
    hostClientId: options.request.hostClientId,
    snapshot: options.snapshot,
    inputHistory: structuredClone(options.inputHistory)
  });
}

function validateSnapshot<TState>(snapshot: SimulationSnapshot<TState>): void {
  if (snapshot.type !== "simulation_snapshot") {
    throw new Error("invalid snapshot type");
  }
  if (snapshot.clientId.length === 0) {
    throw new Error("snapshot clientId must not be empty");
  }
  assertNonNegativeInteger(snapshot.frame, "snapshot frame");
  if (snapshot.stateHash.length === 0) {
    throw new Error("snapshot stateHash must not be empty");
  }
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}
