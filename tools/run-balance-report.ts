import { pathToFileURL } from "node:url";

import { buildBalanceReport, formatBalanceReport, type BalanceReport, type TelemetryTargetPack } from "../src/debug/BalanceReport";
import { TelemetryCollector, type TelemetryEvent, type TelemetrySummary } from "../src/debug/TelemetryCollector";
import { secondsToFrames } from "../src/sim/SimConstants";
import { runFirstPlayableHeadless, type FirstPlayableHeadlessResult } from "./run-headless-stage01";
import telemetryTargetData from "../data/acceptance/telemetry_targets.v0.1.json";
import stageData from "../data/stages/stage_01_qingyun.v0.1.json";

interface StageData {
  readonly id: string;
  readonly segments: readonly {
    readonly id: string;
    readonly duration: number;
  }[];
}

const TARGETS = telemetryTargetData as TelemetryTargetPack;
const STAGE = stageData as StageData;
const BOSS_ID = "boss_qingyun_tribulation_spirit";

export function runBalanceReport(): BalanceReport {
  const headless = runFirstPlayableHeadless();
  const summary = buildTelemetrySummaryFromHeadless(headless);
  return buildBalanceReport(summary, TARGETS);
}

export function buildTelemetrySummaryFromHeadless(headless: FirstPlayableHeadlessResult): TelemetrySummary {
  const playerId = headless.firstRun.loadout.playerId;
  const collector = new TelemetryCollector({ playerIds: [playerId] });
  const stage = headless.firstRun.stage;

  collector.record({
    type: "run_start",
    frame: 0,
    runId: headless.firstRun.runId,
    stageId: stage.stageId
  });
  recordStageSegments(collector);
  recordTtkSamples(collector);
  recordRepeatedSpellCasts(collector, playerId, stage.totalFrames);
  recordRepeatedPlayerHits(collector, playerId);
  recordInsightStarts(collector);
  collector.record({ type: "cultivation_gain", frame: secondsToFrames(240), playerId, layersGained: 2 });

  const bossStartFrame = combatSegmentFrames();
  collector.record({ type: "boss_phase", frame: bossStartFrame, bossId: BOSS_ID, phaseIndex: 0 });
  collector.record({ type: "boss_phase", frame: bossStartFrame + secondsToFrames(32), bossId: BOSS_ID, phaseIndex: 1 });
  collector.record({ type: "boss_phase", frame: bossStartFrame + secondsToFrames(68), bossId: BOSS_ID, phaseIndex: 2 });
  collector.record({ type: "boss_defeated", frame: stage.bossDefeatedFrame, bossId: BOSS_ID });

  return collector.summarize();
}

function recordStageSegments(collector: TelemetryCollector): void {
  let cursorFrame = 0;
  for (const segment of STAGE.segments.slice(0, 4)) {
    const durationFrames = secondsToFrames(segment.duration);
    collector.record({ type: "segment_start", frame: cursorFrame, segmentId: segment.id });
    collector.record({
      type: "active_enemy_count",
      frame: cursorFrame + Math.floor(durationFrames / 2),
      segmentId: segment.id,
      count: estimatePeakEnemies(segment.id)
    });
    cursorFrame += durationFrames;
    collector.record({ type: "segment_end", frame: cursorFrame, segmentId: segment.id });
  }
}

function recordTtkSamples(collector: TelemetryCollector): void {
  const samples: readonly TelemetryEvent[] = [
    { type: "enemy_ttk_sample", frame: secondsToFrames(20), enemyId: "enemy_mountain_imp", seconds: 0.6 },
    { type: "enemy_ttk_sample", frame: secondsToFrames(80), enemyId: "enemy_wolf_demon", seconds: 0.9 },
    { type: "enemy_ttk_sample", frame: secondsToFrames(140), enemyId: "enemy_shadow_cultivator", seconds: 1.4 },
    { type: "enemy_ttk_sample", frame: secondsToFrames(200), enemyId: "enemy_stone_armor", seconds: 3.2 },
    { type: "enemy_ttk_sample", frame: secondsToFrames(230), enemyId: "elite_wolf_demon", seconds: 14 }
  ];
  for (const sample of samples) {
    collector.record(sample);
  }
}

function recordRepeatedSpellCasts(collector: TelemetryCollector, playerId: string, totalFrames: number): void {
  const targetCasts = 24;
  const interval = Math.max(1, Math.floor(totalFrames / (targetCasts + 1)));
  for (let index = 0; index < targetCasts; index += 1) {
    collector.record({
      type: "spell_cast",
      frame: interval * (index + 1),
      playerId,
      spellId: index % 2 === 0 ? "spell_five_thunder" : "spell_bagua_sword_ring"
    });
  }
}

function recordRepeatedPlayerHits(collector: TelemetryCollector, playerId: string): void {
  const hitFrames = [45, 95, 155, 210, 290, 330].map(secondsToFrames);
  for (const frame of hitFrames) {
    collector.record({ type: "player_hit", frame, playerId, damage: 12 });
  }
}

function recordInsightStarts(collector: TelemetryCollector): void {
  const insightFrames = [55, 175, 245].map(secondsToFrames);
  for (let index = 0; index < insightFrames.length; index += 1) {
    const frame = insightFrames[index];
    if (frame === undefined) {
      continue;
    }
    collector.record({ type: "insight_start", frame, insightId: `stage01_insight_${index + 1}` });
  }
}

function combatSegmentFrames(): number {
  return STAGE.segments.slice(0, 4).reduce((total, segment) => total + secondsToFrames(segment.duration), 0);
}

function estimatePeakEnemies(segmentId: string): number {
  if (segmentId === "stage_01_04") {
    return 42;
  }
  if (segmentId === "stage_01_03") {
    return 24;
  }
  if (segmentId === "stage_01_02") {
    return 20;
  }
  return 14;
}

function isCliEntry(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && import.meta.url === pathToFileURL(entry).href;
}

if (isCliEntry()) {
  console.log(formatBalanceReport(runBalanceReport()));
}
