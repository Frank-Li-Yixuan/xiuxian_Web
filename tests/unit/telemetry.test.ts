import { describe, expect, it } from "vitest";

import {
  TelemetryCollector,
  type TelemetryEvent,
  type TelemetrySummary
} from "../../src/debug/TelemetryCollector";
import {
  buildBalanceReport,
  formatBalanceReport,
  type TelemetryTargetPack
} from "../../src/debug/BalanceReport";

describe("TelemetryCollector", () => {
  it("summarizes a local frame-based run into balance metrics", () => {
    const collector = new TelemetryCollector({ simFps: 60, playerIds: ["p1", "p2"] });
    const events: TelemetryEvent[] = [
      { type: "run_start", frame: 0, runId: "run_balance_001", stageId: "stage_01_qingyun" },
      { type: "segment_start", frame: 0, segmentId: "stage_01_04" },
      { type: "active_enemy_count", frame: 600, segmentId: "stage_01_04", count: 18 },
      { type: "active_enemy_count", frame: 1800, segmentId: "stage_01_04", count: 42 },
      { type: "enemy_spawned", frame: 60, entityId: 101, enemyId: "enemy_mountain_imp", segmentId: "stage_01_04" },
      { type: "enemy_defeated", frame: 96, entityId: 101, enemyId: "enemy_mountain_imp", segmentId: "stage_01_04" },
      { type: "segment_end", frame: 4200, segmentId: "stage_01_04" },
      { type: "boss_phase", frame: 14700, bossId: "boss_qingyun_tribulation_spirit", phaseIndex: 0 },
      { type: "boss_phase", frame: 16800, bossId: "boss_qingyun_tribulation_spirit", phaseIndex: 1 },
      { type: "boss_phase", frame: 18900, bossId: "boss_qingyun_tribulation_spirit", phaseIndex: 2 },
      { type: "cultivation_breakthrough", frame: 12000, playerId: "p1", fromLayer: 1, toLayer: 2 },
      { type: "cultivation_gain", frame: 14400, playerId: "p2", layersGained: 1 },
      { type: "boss_defeated", frame: 21600, bossId: "boss_qingyun_tribulation_spirit" }
    ];

    for (const event of events) {
      collector.record(event);
    }
    recordRepeated(collector, "spell_cast", 36, 300, 240);
    recordRepeated(collector, "player_hit", 7, 900, 300);
    recordRepeated(collector, "insight_start", 3, 3300, 3600);

    const summary = collector.summarize();

    expect(summary.run).toEqual({
      runId: "run_balance_001",
      stageId: "stage_01_qingyun",
      startFrame: 0,
      endFrame: 21600,
      durationFrames: 21600,
      durationSeconds: 360
    });
    expect(summary.stageDurationSeconds).toBe(360);
    expect(summary.segments.stage_01_04).toEqual({
      segmentId: "stage_01_04",
      startFrame: 0,
      endFrame: 4200,
      durationFrames: 4200,
      durationSeconds: 70,
      peakEnemies: 42
    });
    expect(summary.enemyTtk).toEqual({
      samples: 1,
      averageSeconds: 0.6,
      byEnemyId: {
        enemy_mountain_imp: { samples: 1, averageSeconds: 0.6 }
      }
    });
    expect(summary.boss).toEqual({
      bossId: "boss_qingyun_tribulation_spirit",
      startFrame: 14700,
      defeatedFrame: 21600,
      durationFrames: 6900,
      durationSeconds: 115,
      phaseCount: 3
    });
    expect(summary.spells.totalCasts).toBe(36);
    expect(summary.spells.castsPerMinutePerPlayer).toBe(3);
    expect(summary.insightCount).toBe(3);
    expect(summary.playerHits.total).toBe(7);
    expect(summary.cultivation.totalLayersGained).toBe(2);
    expect(Object.isFrozen(summary)).toBe(true);
  });
});

describe("BalanceReport", () => {
  it("compares telemetry metrics against target ranges and keeps output local-only", () => {
    const summary = createSummaryForReport();
    const targets: TelemetryTargetPack = {
      version: "test",
      targets: {
        stage01DurationSeconds: { min: 300, max: 420 },
        bossDurationSeconds: { min: 90, max: 100 },
        insightCountStage01: { min: 3, max: 4 },
        spellsCastPerMinutePerPlayer: { min: 3, max: 6 },
        playerHitsStage01: { min: 8, max: 10 },
        segment14PeakEnemies: { min: 35, max: 55 },
        stage01CultivationLayersGained: { min: 1.5, max: 2.5 },
        fpsMediumAt1080p: { target: 60, allowShortDrops: true }
      }
    };

    const report = buildBalanceReport(summary, targets);
    const formatted = formatBalanceReport(report);

    expect(report.transport).toEqual({ mode: "local_only" });
    expect(report.metrics.stage01DurationSeconds?.status).toBe("within_target");
    expect(report.metrics.bossDurationSeconds?.status).toBe("above_target");
    expect(report.metrics.playerHitsStage01?.status).toBe("below_target");
    expect(report.metrics.fpsMediumAt1080p?.status).toBe("target_only");
    expect(report.deviations.map((deviation) => deviation.metricKey)).toEqual([
      "bossDurationSeconds",
      "playerHitsStage01"
    ]);
    expect(formatted).toContain("transport: local_only");
    expect(formatted).toContain("bossDurationSeconds: 115 above_target target 90-100");
    expect(formatted).not.toContain("http");
  });
});

function recordRepeated(
  collector: TelemetryCollector,
  type: "spell_cast" | "player_hit" | "insight_start",
  count: number,
  startFrame: number,
  intervalFrames: number
): void {
  for (let index = 0; index < count; index += 1) {
    const frame = startFrame + intervalFrames * index;
    if (type === "spell_cast") {
      collector.record({
        type,
        frame,
        playerId: index % 2 === 0 ? "p1" : "p2",
        spellId: index % 2 === 0 ? "spell_five_thunder" : "spell_bagua_sword_ring"
      });
    } else if (type === "player_hit") {
      collector.record({
        type,
        frame,
        playerId: index % 2 === 0 ? "p1" : "p2",
        damage: 12
      });
    } else {
      collector.record({
        type,
        frame,
        insightId: `insight_${index + 1}`
      });
    }
  }
}

function createSummaryForReport(): TelemetrySummary {
  const collector = new TelemetryCollector({ simFps: 60, playerIds: ["p1", "p2"] });
  collector.record({ type: "run_start", frame: 0, runId: "run_report", stageId: "stage_01_qingyun" });
  collector.record({ type: "segment_start", frame: 0, segmentId: "stage_01_04" });
  collector.record({ type: "active_enemy_count", frame: 1800, segmentId: "stage_01_04", count: 42 });
  collector.record({ type: "segment_end", frame: 4200, segmentId: "stage_01_04" });
  collector.record({ type: "boss_phase", frame: 14700, bossId: "boss_qingyun_tribulation_spirit", phaseIndex: 0 });
  collector.record({ type: "cultivation_gain", frame: 14400, playerId: "p1", layersGained: 2 });
  collector.record({ type: "boss_defeated", frame: 21600, bossId: "boss_qingyun_tribulation_spirit" });
  recordRepeated(collector, "spell_cast", 36, 300, 240);
  recordRepeated(collector, "player_hit", 7, 900, 300);
  recordRepeated(collector, "insight_start", 3, 3300, 3600);
  return collector.summarize();
}
