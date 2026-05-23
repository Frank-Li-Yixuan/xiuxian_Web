import type { TelemetrySummary } from "./TelemetryCollector";

export type BalanceMetricKey =
  | "stage01DurationSeconds"
  | "bossDurationSeconds"
  | "insightCountStage01"
  | "spellsCastPerMinutePerPlayer"
  | "playerHitsStage01"
  | "segment14PeakEnemies"
  | "stage01CultivationLayersGained"
  | "debugTribulationPassRateNewPlayer"
  | "debugTribulationPassRateSkilled"
  | "fpsMediumAt1080p";

export type BalanceMetricStatus = "within_target" | "below_target" | "above_target" | "target_only";

export interface TelemetryMetricTarget {
  readonly min?: number;
  readonly max?: number;
  readonly target?: number;
  readonly allowShortDrops?: boolean;
}

export interface TelemetryTargetPack {
  readonly version: string;
  readonly targets: Readonly<Record<string, TelemetryMetricTarget>>;
}

export interface BalanceMetricReport {
  readonly metricKey: string;
  readonly value?: number;
  readonly target: TelemetryMetricTarget;
  readonly status: BalanceMetricStatus;
  readonly deviates: boolean;
}

export interface BalanceReport {
  readonly version: string;
  readonly transport: {
    readonly mode: "local_only";
  };
  readonly summary: TelemetrySummary;
  readonly metrics: Readonly<Record<string, BalanceMetricReport>>;
  readonly deviations: readonly BalanceMetricReport[];
}

export function buildBalanceReport(summary: TelemetrySummary, targetPack: TelemetryTargetPack): BalanceReport {
  const actuals = collectBalanceActuals(summary);
  const metrics: Record<string, BalanceMetricReport> = {};

  for (const [metricKey, target] of Object.entries(targetPack.targets)) {
    const value = actuals[metricKey];
    const status = compareTarget(value, target);
    metrics[metricKey] = {
      metricKey,
      ...(value === undefined ? {} : { value }),
      target,
      status,
      deviates: status === "below_target" || status === "above_target"
    };
  }

  const deviations = Object.values(metrics).filter((metric) => metric.deviates);
  return deepFreeze({
    version: targetPack.version,
    transport: { mode: "local_only" },
    summary,
    metrics,
    deviations
  });
}

export function formatBalanceReport(report: BalanceReport): string {
  const lines = [
    `Balance Report ${report.version}`,
    "transport: local_only",
    `stageDurationSeconds: ${formatNumber(report.summary.stageDurationSeconds)}`,
    `enemyTtkAverageSeconds: ${formatNumber(report.summary.enemyTtk.averageSeconds)} samples ${report.summary.enemyTtk.samples}`,
    `bossDurationSeconds: ${formatNumber(report.summary.boss.durationSeconds)}`,
    `spellCastsPerMinutePerPlayer: ${formatNumber(report.summary.spells.castsPerMinutePerPlayer)}`,
    `insightCount: ${report.summary.insightCount}`,
    `playerHitCount: ${report.summary.playerHits.total}`,
    `cultivationLayersGained: ${formatNumber(report.summary.cultivation.totalLayersGained)}`,
    "metrics:"
  ];

  for (const metric of Object.values(report.metrics)) {
    const valueText = metric.value === undefined ? "uncollected" : formatNumber(metric.value);
    lines.push(`- ${metric.metricKey}: ${valueText} ${metric.status} ${formatTarget(metric.target)}`);
  }

  lines.push("deviations:");
  if (report.deviations.length === 0) {
    lines.push("- none");
  } else {
    for (const deviation of report.deviations) {
      const valueText = deviation.value === undefined ? "uncollected" : formatNumber(deviation.value);
      lines.push(`- ${deviation.metricKey}: ${valueText} ${deviation.status} ${formatTarget(deviation.target)}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function collectBalanceActuals(summary: TelemetrySummary): Readonly<Record<string, number>> {
  const actuals: Record<string, number> = {
    stage01DurationSeconds: summary.stageDurationSeconds,
    bossDurationSeconds: summary.boss.durationSeconds,
    insightCountStage01: summary.insightCount,
    spellsCastPerMinutePerPlayer: summary.spells.castsPerMinutePerPlayer,
    playerHitsStage01: summary.playerHits.total,
    stage01CultivationLayersGained: summary.cultivation.totalLayersGained
  };

  const segment14 = summary.segments.stage_01_04;
  if (segment14 !== undefined) {
    actuals.segment14PeakEnemies = segment14.peakEnemies;
  }

  return actuals;
}

function compareTarget(value: number | undefined, target: TelemetryMetricTarget): BalanceMetricStatus {
  if (value === undefined) {
    return "target_only";
  }
  if (target.min !== undefined && value < target.min) {
    return "below_target";
  }
  if (target.max !== undefined && value > target.max) {
    return "above_target";
  }
  if (target.target !== undefined) {
    if (value < target.target) {
      return "below_target";
    }
    if (value > target.target) {
      return "above_target";
    }
  }
  return "within_target";
}

function formatTarget(target: TelemetryMetricTarget): string {
  if (target.min !== undefined && target.max !== undefined) {
    return `target ${formatNumber(target.min)}-${formatNumber(target.max)}`;
  }
  if (target.min !== undefined) {
    return `target >=${formatNumber(target.min)}`;
  }
  if (target.max !== undefined) {
    return `target <=${formatNumber(target.max)}`;
  }
  if (target.target !== undefined) {
    return `target ${formatNumber(target.target)}`;
  }
  return "target unbounded";
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
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
