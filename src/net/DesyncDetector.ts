export interface StateHashReport {
  readonly clientId: string;
  readonly frame: number;
  readonly simFrame: number;
  readonly hash: string;
  readonly rngDigest: string;
  readonly entityCountDigest: string;
}

export interface HashComparison {
  readonly frame: number;
  readonly matched: boolean;
  readonly reports: readonly StateHashReport[];
  readonly hostClientId: string;
  readonly hostHash: string;
}

export interface HashMismatch {
  readonly frame: number;
  readonly hostClientId: string;
  readonly hostHash: string;
  readonly reports: readonly StateHashReport[];
}

export type DesyncEventKind = "suspected_desync" | "repair_required";

export interface DesyncEvent {
  readonly kind: DesyncEventKind;
  readonly frame: number;
  readonly mismatchStreak: number;
  readonly mismatch: HashMismatch;
}

export interface DesyncDetectorRecordResult {
  readonly comparison?: HashComparison;
  readonly mismatch?: HashMismatch;
  readonly event?: DesyncEvent;
}

export interface DesyncDetectorOptions {
  readonly clientIds: readonly string[];
  readonly hostClientId: string;
  readonly consecutiveMismatchThreshold?: number;
}

export class DesyncDetector {
  private readonly clientIds: readonly string[];
  private readonly hostClientId: string;
  private readonly consecutiveMismatchThreshold: number;
  private readonly reportsByFrame = new Map<number, Map<string, StateHashReport>>();
  private mismatchStreak = 0;

  public constructor(options: DesyncDetectorOptions) {
    assertClientSet(options.clientIds, options.hostClientId);
    this.clientIds = [...options.clientIds];
    this.hostClientId = options.hostClientId;
    this.consecutiveMismatchThreshold = options.consecutiveMismatchThreshold ?? 2;
    if (!Number.isInteger(this.consecutiveMismatchThreshold) || this.consecutiveMismatchThreshold <= 0) {
      throw new Error("consecutiveMismatchThreshold must be a positive integer");
    }
  }

  public recordReport(report: StateHashReport): DesyncDetectorRecordResult {
    validateReport(report);
    if (!this.clientIds.includes(report.clientId)) {
      throw new Error(`unknown hash report clientId: ${report.clientId}`);
    }

    let frameReports = this.reportsByFrame.get(report.frame);
    if (frameReports === undefined) {
      frameReports = new Map<string, StateHashReport>();
      this.reportsByFrame.set(report.frame, frameReports);
    }
    frameReports.set(report.clientId, report);

    if (frameReports.size < this.clientIds.length) {
      return {};
    }

    const comparison = compareFrameReports({
      frame: report.frame,
      clientIds: this.clientIds,
      hostClientId: this.hostClientId,
      frameReports
    });
    if (comparison.matched) {
      this.mismatchStreak = 0;
      return { comparison };
    }

    const mismatch = {
      frame: comparison.frame,
      hostClientId: comparison.hostClientId,
      hostHash: comparison.hostHash,
      reports: comparison.reports
    };
    this.mismatchStreak += 1;
    return {
      comparison,
      mismatch,
      event: {
        kind: this.mismatchStreak >= this.consecutiveMismatchThreshold ? "repair_required" : "suspected_desync",
        frame: comparison.frame,
        mismatchStreak: this.mismatchStreak,
        mismatch
      }
    };
  }
}

function compareFrameReports(options: {
  readonly frame: number;
  readonly clientIds: readonly string[];
  readonly hostClientId: string;
  readonly frameReports: ReadonlyMap<string, StateHashReport>;
}): HashComparison {
  const reports = options.clientIds.map((clientId) => {
    const report = options.frameReports.get(clientId);
    if (report === undefined) {
      throw new Error(`missing report for client ${clientId} at frame ${options.frame}`);
    }
    return report;
  });
  const hostReport = options.frameReports.get(options.hostClientId);
  if (hostReport === undefined) {
    throw new Error(`missing host report at frame ${options.frame}`);
  }
  const matched = reports.every((candidate) => candidate.hash === hostReport.hash);

  return Object.freeze({
    frame: options.frame,
    matched,
    reports: Object.freeze(reports),
    hostClientId: options.hostClientId,
    hostHash: hostReport.hash
  });
}

function assertClientSet(clientIds: readonly string[], hostClientId: string): void {
  if (clientIds.length < 2) {
    throw new Error("DesyncDetector requires at least two clients");
  }
  if (hostClientId.length === 0) {
    throw new Error("hostClientId must not be empty");
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
  if (!seen.has(hostClientId)) {
    throw new Error("hostClientId must be one of clientIds");
  }
}

function validateReport(report: StateHashReport): void {
  if (report.clientId.length === 0) {
    throw new Error("hash report clientId must not be empty");
  }
  assertNonNegativeInteger(report.frame, "hash report frame");
  assertNonNegativeInteger(report.simFrame, "hash report simFrame");
  if (report.hash.length === 0) {
    throw new Error("hash report hash must not be empty");
  }
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
}
