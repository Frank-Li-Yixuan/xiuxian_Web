import { SIM_FPS } from "../sim/SimConstants";

export type TelemetryEntityId = string | number;

export type TelemetryEventType =
  | "run_start"
  | "run_end"
  | "segment_start"
  | "segment_end"
  | "active_enemy_count"
  | "enemy_spawned"
  | "enemy_defeated"
  | "enemy_ttk_sample"
  | "boss_spawned"
  | "boss_phase"
  | "boss_defeated"
  | "player_hit"
  | "spell_cast"
  | "pill_swallowed"
  | "pill_digest_complete"
  | "insight_start"
  | "insight_choice"
  | "reroll"
  | "cultivation_gain"
  | "cultivation_breakthrough"
  | "tribulation_start"
  | "tribulation_end"
  | "player_soul"
  | "rescue_start"
  | "rescue_success"
  | "settlement_created"
  | "outgame_upgrade"
  | "second_run_start";

export interface TelemetryEvent {
  readonly type: TelemetryEventType;
  readonly frame: number;
  readonly runId?: string;
  readonly stageId?: string;
  readonly segmentId?: string;
  readonly count?: number;
  readonly entityId?: TelemetryEntityId;
  readonly enemyId?: string;
  readonly bossId?: string;
  readonly phaseIndex?: number;
  readonly playerId?: string;
  readonly spellId?: string;
  readonly damage?: number;
  readonly insightId?: string;
  readonly fromLayer?: number;
  readonly toLayer?: number;
  readonly layersGained?: number;
  readonly amount?: number;
  readonly seconds?: number;
}

export interface TelemetryCollectorOptions {
  readonly simFps?: number;
  readonly playerIds?: readonly string[];
}

export interface TelemetryRunSummary {
  readonly runId?: string;
  readonly stageId?: string;
  readonly startFrame?: number;
  readonly endFrame?: number;
  readonly durationFrames: number;
  readonly durationSeconds: number;
}

export interface TelemetrySegmentSummary {
  readonly segmentId: string;
  readonly startFrame?: number;
  readonly endFrame?: number;
  readonly durationFrames: number;
  readonly durationSeconds: number;
  readonly peakEnemies: number;
}

export interface TelemetryAverageSummary {
  readonly samples: number;
  readonly averageSeconds: number;
}

export interface TelemetryBossSummary {
  readonly bossId?: string;
  readonly startFrame?: number;
  readonly defeatedFrame?: number;
  readonly durationFrames: number;
  readonly durationSeconds: number;
  readonly phaseCount: number;
}

export interface TelemetrySpellSummary {
  readonly totalCasts: number;
  readonly castsByPlayer: Readonly<Record<string, number>>;
  readonly castsBySpell: Readonly<Record<string, number>>;
  readonly castsPerMinutePerPlayer: number;
}

export interface TelemetryHitSummary {
  readonly total: number;
  readonly byPlayer: Readonly<Record<string, number>>;
}

export interface TelemetryCultivationSummary {
  readonly totalLayersGained: number;
  readonly layersGainedByPlayer: Readonly<Record<string, number>>;
  readonly totalRawGain: number;
  readonly rawGainByPlayer: Readonly<Record<string, number>>;
}

export interface TelemetrySummary {
  readonly simFps: number;
  readonly run: TelemetryRunSummary;
  readonly stageDurationSeconds: number;
  readonly segments: Readonly<Record<string, TelemetrySegmentSummary>>;
  readonly segmentPeakEnemies: Readonly<Record<string, number>>;
  readonly enemyTtk: TelemetryAverageSummary & {
    readonly byEnemyId: Readonly<Record<string, TelemetryAverageSummary>>;
  };
  readonly boss: TelemetryBossSummary;
  readonly spells: TelemetrySpellSummary;
  readonly insightCount: number;
  readonly playerHits: TelemetryHitSummary;
  readonly cultivation: TelemetryCultivationSummary;
  readonly eventCounts: Readonly<Record<string, number>>;
}

interface MutableSegmentSummary {
  segmentId: string;
  startFrame?: number;
  endFrame?: number;
  peakEnemies: number;
}

interface EnemySpawnSample {
  readonly frame: number;
  readonly enemyId?: string;
}

interface TtkSample {
  readonly enemyId: string;
  readonly seconds: number;
}

export class TelemetryCollector {
  private readonly simFps: number;
  private readonly configuredPlayerIds: readonly string[];
  private readonly events: TelemetryEvent[] = [];

  public constructor(options: TelemetryCollectorOptions = {}) {
    const simFps = options.simFps ?? SIM_FPS;
    assertPositiveFinite(simFps, "simFps");
    this.simFps = simFps;
    this.configuredPlayerIds = Object.freeze([...(options.playerIds ?? [])]);
  }

  public record(event: TelemetryEvent): void {
    assertNonNegativeInteger(event.frame, "event.frame");
    if (event.type.length === 0) {
      throw new Error("telemetry event type must not be empty");
    }
    this.events.push(Object.freeze({ ...event }));
  }

  public summarize(): TelemetrySummary {
    const events = [...this.events].sort(compareEvents);
    const run = summarizeRun(events, this.simFps);
    const segments = summarizeSegments(events, this.simFps);
    const enemyTtk = summarizeEnemyTtk(events, this.simFps);
    const boss = summarizeBoss(events, this.simFps);
    const spells = summarizeSpells(events, run.durationSeconds, this.configuredPlayerIds);
    const playerHits = summarizePlayerHits(events);
    const cultivation = summarizeCultivation(events);

    return deepFreeze({
      simFps: this.simFps,
      run,
      stageDurationSeconds: run.durationSeconds,
      segments,
      segmentPeakEnemies: Object.fromEntries(
        Object.entries(segments).map(([segmentId, segment]) => [segmentId, segment.peakEnemies])
      ),
      enemyTtk,
      boss,
      spells,
      insightCount: events.filter((event) => event.type === "insight_start").length,
      playerHits,
      cultivation,
      eventCounts: countBy(events, (event) => event.type)
    });
  }
}

function summarizeRun(events: readonly TelemetryEvent[], simFps: number): TelemetryRunSummary {
  const start = events.find((event) => event.type === "run_start");
  const end =
    findLast(events, (event) => event.type === "run_end") ??
    findLast(events, (event) => event.type === "boss_defeated") ??
    findLast(events, (event) => event.type === "settlement_created");
  const startFrame = start?.frame ?? minFrame(events);
  const endFrame = end?.frame ?? maxFrame(events);
  const durationFrames =
    startFrame === undefined || endFrame === undefined ? 0 : Math.max(0, endFrame - startFrame);

  return {
    ...(start?.runId === undefined ? {} : { runId: start.runId }),
    ...(start?.stageId === undefined ? {} : { stageId: start.stageId }),
    ...(startFrame === undefined ? {} : { startFrame }),
    ...(endFrame === undefined ? {} : { endFrame }),
    durationFrames,
    durationSeconds: round3(framesToSeconds(durationFrames, simFps))
  };
}

function summarizeSegments(
  events: readonly TelemetryEvent[],
  simFps: number
): Readonly<Record<string, TelemetrySegmentSummary>> {
  const segments = new Map<string, MutableSegmentSummary>();

  for (const event of events) {
    if (event.segmentId === undefined) {
      continue;
    }

    if (event.type === "segment_start") {
      getMutableSegment(segments, event.segmentId).startFrame = event.frame;
    } else if (event.type === "segment_end") {
      getMutableSegment(segments, event.segmentId).endFrame = event.frame;
    } else if (event.type === "active_enemy_count") {
      assertNonNegativeInteger(event.count ?? 0, "active_enemy_count.count");
      const segment = getMutableSegment(segments, event.segmentId);
      segment.peakEnemies = Math.max(segment.peakEnemies, event.count ?? 0);
    }
  }

  const result: Record<string, TelemetrySegmentSummary> = {};
  for (const segment of segments.values()) {
    const durationFrames =
      segment.startFrame === undefined || segment.endFrame === undefined
        ? 0
        : Math.max(0, segment.endFrame - segment.startFrame);
    result[segment.segmentId] = {
      segmentId: segment.segmentId,
      ...(segment.startFrame === undefined ? {} : { startFrame: segment.startFrame }),
      ...(segment.endFrame === undefined ? {} : { endFrame: segment.endFrame }),
      durationFrames,
      durationSeconds: round3(framesToSeconds(durationFrames, simFps)),
      peakEnemies: segment.peakEnemies
    };
  }
  return result;
}

function summarizeEnemyTtk(
  events: readonly TelemetryEvent[],
  simFps: number
): TelemetryAverageSummary & { readonly byEnemyId: Readonly<Record<string, TelemetryAverageSummary>> } {
  const spawned = new Map<string, EnemySpawnSample>();
  const samples: TtkSample[] = [];

  for (const event of events) {
    if (event.type === "enemy_spawned" && event.entityId !== undefined) {
      spawned.set(String(event.entityId), {
        frame: event.frame,
        ...(event.enemyId === undefined ? {} : { enemyId: event.enemyId })
      });
    } else if (event.type === "enemy_defeated" && event.entityId !== undefined) {
      const spawn = spawned.get(String(event.entityId));
      if (spawn === undefined) {
        continue;
      }
      const enemyId = event.enemyId ?? spawn.enemyId ?? "unknown_enemy";
      const durationFrames = Math.max(0, event.frame - spawn.frame);
      samples.push({ enemyId, seconds: round3(framesToSeconds(durationFrames, simFps)) });
      spawned.delete(String(event.entityId));
    } else if (event.type === "enemy_ttk_sample") {
      assertNonNegativeNumber(event.seconds ?? 0, "enemy_ttk_sample.seconds");
      samples.push({
        enemyId: event.enemyId ?? "unknown_enemy",
        seconds: round3(event.seconds ?? 0)
      });
    }
  }

  return {
    samples: samples.length,
    averageSeconds: averageSeconds(samples),
    byEnemyId: averageSecondsByEnemy(samples)
  };
}

function summarizeBoss(events: readonly TelemetryEvent[], simFps: number): TelemetryBossSummary {
  const start = events.find((event) => event.type === "boss_spawned" || event.type === "boss_phase");
  const defeated = findLast(events, (event) => event.type === "boss_defeated");
  const bossId = start?.bossId ?? defeated?.bossId;
  const durationFrames =
    start === undefined || defeated === undefined ? 0 : Math.max(0, defeated.frame - start.frame);
  const phaseIndexes = new Set<number>();
  let phaseEvents = 0;
  for (const event of events) {
    if (event.type !== "boss_phase") {
      continue;
    }
    phaseEvents += 1;
    if (event.phaseIndex !== undefined) {
      phaseIndexes.add(event.phaseIndex);
    }
  }

  return {
    ...(bossId === undefined ? {} : { bossId }),
    ...(start === undefined ? {} : { startFrame: start.frame }),
    ...(defeated === undefined ? {} : { defeatedFrame: defeated.frame }),
    durationFrames,
    durationSeconds: round3(framesToSeconds(durationFrames, simFps)),
    phaseCount: phaseIndexes.size > 0 ? phaseIndexes.size : phaseEvents
  };
}

function summarizeSpells(
  events: readonly TelemetryEvent[],
  runDurationSeconds: number,
  configuredPlayerIds: readonly string[]
): TelemetrySpellSummary {
  const spellEvents = events.filter((event) => event.type === "spell_cast");
  const playerIds = new Set(configuredPlayerIds);
  const castsByPlayer: Record<string, number> = {};
  const castsBySpell: Record<string, number> = {};

  for (const event of spellEvents) {
    if (event.playerId !== undefined) {
      playerIds.add(event.playerId);
      increment(castsByPlayer, event.playerId, 1);
    }
    increment(castsBySpell, event.spellId ?? "unknown_spell", 1);
  }

  const playerCount = playerIds.size > 0 ? playerIds.size : 1;
  const durationMinutes = runDurationSeconds / 60;
  const castsPerMinutePerPlayer =
    durationMinutes <= 0 ? 0 : round3(spellEvents.length / playerCount / durationMinutes);

  return {
    totalCasts: spellEvents.length,
    castsByPlayer,
    castsBySpell,
    castsPerMinutePerPlayer
  };
}

function summarizePlayerHits(events: readonly TelemetryEvent[]): TelemetryHitSummary {
  const hits = events.filter((event) => event.type === "player_hit");
  const byPlayer: Record<string, number> = {};
  for (const event of hits) {
    increment(byPlayer, event.playerId ?? "unknown_player", 1);
  }

  return {
    total: hits.length,
    byPlayer
  };
}

function summarizeCultivation(events: readonly TelemetryEvent[]): TelemetryCultivationSummary {
  const layersGainedByPlayer: Record<string, number> = {};
  const rawGainByPlayer: Record<string, number> = {};

  for (const event of events) {
    if (event.type === "cultivation_breakthrough") {
      const layers = event.layersGained ?? computeLayerDelta(event.fromLayer, event.toLayer);
      addPlayerValue(layersGainedByPlayer, event.playerId, layers);
    } else if (event.type === "cultivation_gain") {
      addPlayerValue(layersGainedByPlayer, event.playerId, event.layersGained ?? 0);
      addPlayerValue(rawGainByPlayer, event.playerId, event.amount ?? 0);
    }
  }

  return {
    totalLayersGained: round3(sumValues(layersGainedByPlayer)),
    layersGainedByPlayer,
    totalRawGain: round3(sumValues(rawGainByPlayer)),
    rawGainByPlayer
  };
}

function getMutableSegment(segments: Map<string, MutableSegmentSummary>, segmentId: string): MutableSegmentSummary {
  const existing = segments.get(segmentId);
  if (existing !== undefined) {
    return existing;
  }
  const created: MutableSegmentSummary = { segmentId, peakEnemies: 0 };
  segments.set(segmentId, created);
  return created;
}

function computeLayerDelta(fromLayer: number | undefined, toLayer: number | undefined): number {
  if (fromLayer === undefined || toLayer === undefined) {
    return 0;
  }
  return Math.max(0, toLayer - fromLayer);
}

function addPlayerValue(target: Record<string, number>, playerId: string | undefined, value: number): void {
  assertNonNegativeNumber(value, "cultivation gain");
  increment(target, playerId ?? "unknown_player", value);
}

function averageSeconds(samples: readonly TtkSample[]): number {
  if (samples.length === 0) {
    return 0;
  }
  return round3(samples.reduce((total, sample) => total + sample.seconds, 0) / samples.length);
}

function averageSecondsByEnemy(samples: readonly TtkSample[]): Readonly<Record<string, TelemetryAverageSummary>> {
  const grouped = new Map<string, TtkSample[]>();
  for (const sample of samples) {
    const values = grouped.get(sample.enemyId) ?? [];
    values.push(sample);
    grouped.set(sample.enemyId, values);
  }

  const result: Record<string, TelemetryAverageSummary> = {};
  for (const [enemyId, values] of grouped) {
    result[enemyId] = {
      samples: values.length,
      averageSeconds: averageSeconds(values)
    };
  }
  return result;
}

function countBy<T>(items: readonly T[], getKey: (item: T) => string): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    increment(counts, getKey(item), 1);
  }
  return counts;
}

function increment(counts: Record<string, number>, key: string, amount: number): void {
  counts[key] = round3((counts[key] ?? 0) + amount);
}

function sumValues(values: Readonly<Record<string, number>>): number {
  return Object.values(values).reduce((sum, value) => sum + value, 0);
}

function findLast<T>(items: readonly T[], predicate: (item: T) => boolean): T | undefined {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (item !== undefined && predicate(item)) {
      return item;
    }
  }
  return undefined;
}

function minFrame(events: readonly TelemetryEvent[]): number | undefined {
  if (events.length === 0) {
    return undefined;
  }
  return events[0]?.frame;
}

function maxFrame(events: readonly TelemetryEvent[]): number | undefined {
  return events[events.length - 1]?.frame;
}

function framesToSeconds(frames: number, simFps: number): number {
  return frames / simFps;
}

function compareEvents(left: TelemetryEvent, right: TelemetryEvent): number {
  return left.frame - right.frame || left.type.localeCompare(right.type);
}

function assertPositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number`);
  }
}

function assertNonNegativeNumber(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative finite number`);
  }
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
}

function round3(value: number): number {
  return Math.round(value * 1_000) / 1_000;
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
