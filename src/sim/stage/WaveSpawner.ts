import { secondsToFrames } from "../SimConstants";
import type { SeededRng } from "../core/SeededRng";
import { DEFAULT_COMBAT_BOUNDS, type CombatBounds, type Vec2 } from "../player/PlayerSystem";
import type { SpawnGroupDefinition, StageFrameContext } from "./StageRunner";

export interface EnemySpawnRequest {
  readonly enemyId: string;
  readonly position: Vec2;
  readonly spawnFrame: number;
  readonly sourceSegmentId: string;
  readonly sourceWaveIndex: number;
  readonly sourceGroupIndex: number;
  readonly spawnIndex: number;
  readonly targetRule?: string;
}

export interface WaveSpawnerOptions {
  readonly stageRng: SeededRng;
  readonly combatBounds?: CombatBounds;
}

const TOP_SPAWN_Y = -40;
const ELITE_SPAWN_Y = -80;
const SIDE_SPAWN_MARGIN = 40;

export class WaveSpawner {
  private readonly stageRng: SeededRng;
  private readonly combatBounds: CombatBounds;
  private readonly spawnedByGroupKey = new Map<string, number>();

  public constructor(options: WaveSpawnerOptions) {
    this.stageRng = options.stageRng;
    this.combatBounds = options.combatBounds ?? DEFAULT_COMBAT_BOUNDS;
  }

  public getSpawnsForFrame(context: StageFrameContext): readonly EnemySpawnRequest[] {
    const spawns: EnemySpawnRequest[] = [];

    for (let waveIndex = 0; waveIndex < context.segment.waves.length; waveIndex += 1) {
      const wave = context.segment.waves[waveIndex];
      if (wave === undefined) {
        continue;
      }

      const waveStartFrame = secondsToFrames(wave.startTime);
      const waveEndFrame = secondsToFrames(wave.endTime);
      if (context.segmentFrame < waveStartFrame || context.segmentFrame > waveEndFrame) {
        continue;
      }

      for (let groupIndex = 0; groupIndex < wave.spawnGroups.length; groupIndex += 1) {
        const group = wave.spawnGroups[groupIndex];
        if (group === undefined) {
          continue;
        }

        const groupKey = `${context.segmentId}:${waveIndex}:${groupIndex}`;
        let spawnedCount = this.spawnedByGroupKey.get(groupKey) ?? 0;
        const intervalFrames = Math.max(1, secondsToFrames(group.interval));

        while (spawnedCount < group.count) {
          const scheduledFrame = waveStartFrame + spawnedCount * intervalFrames;
          if (scheduledFrame > waveEndFrame || context.segmentFrame < scheduledFrame) {
            break;
          }

          spawns.push(this.createSpawnRequest(context, group, waveIndex, groupIndex, spawnedCount));
          spawnedCount += 1;
        }

        this.spawnedByGroupKey.set(groupKey, spawnedCount);
      }
    }

    return spawns;
  }

  private createSpawnRequest(
    context: StageFrameContext,
    group: SpawnGroupDefinition,
    waveIndex: number,
    groupIndex: number,
    spawnIndex: number
  ): EnemySpawnRequest {
    const base = {
      enemyId: group.enemyId,
      position: this.resolveSpawnPosition(group, spawnIndex),
      spawnFrame: context.absoluteFrame,
      sourceSegmentId: context.segmentId,
      sourceWaveIndex: waveIndex,
      sourceGroupIndex: groupIndex,
      spawnIndex
    };

    if (group.targetRule === undefined) {
      return base;
    }

    return {
      ...base,
      targetRule: group.targetRule
    };
  }

  private resolveSpawnPosition(group: SpawnGroupDefinition, spawnIndex: number): Vec2 {
    switch (group.pattern) {
      case "random_top":
        return { x: this.randomX(group.xRange), y: TOP_SPAWN_Y };
      case "line":
        return { x: getFixedX(group, spawnIndex), y: TOP_SPAWN_Y };
      case "fixed_points":
        return { x: getFixedX(group, spawnIndex), y: TOP_SPAWN_Y };
      case "paired_sides":
        return {
          x: this.sideX(spawnIndex),
          y: this.stageRng.rangeFloat(120, 300)
        };
      case "side_stream":
        return {
          x: this.sideX(spawnIndex),
          y: this.stageRng.rangeFloat(80, 220)
        };
      case "elite_center":
        return {
          x: this.combatBounds.x + this.combatBounds.width / 2,
          y: ELITE_SPAWN_Y
        };
      default:
        throw new Error(`Unsupported spawn pattern: ${group.pattern}`);
    }
  }

  private randomX(xRange: readonly [number, number] | undefined): number {
    const minX = xRange?.[0] ?? this.combatBounds.x;
    const maxX = xRange?.[1] ?? this.combatBounds.x + this.combatBounds.width;
    return this.stageRng.rangeFloat(minX, maxX);
  }

  private sideX(spawnIndex: number): number {
    const isLeft = spawnIndex % 2 === 0;
    return isLeft
      ? this.combatBounds.x - SIDE_SPAWN_MARGIN
      : this.combatBounds.x + this.combatBounds.width + SIDE_SPAWN_MARGIN;
  }
}

function getFixedX(group: SpawnGroupDefinition, spawnIndex: number): number {
  if (group.fixedX === undefined || group.fixedX.length === 0) {
    throw new Error(`Spawn pattern '${group.pattern}' requires fixedX`);
  }
  const fixedX = group.fixedX[spawnIndex % group.fixedX.length];
  if (fixedX === undefined) {
    throw new Error("fixedX selection failed");
  }
  return fixedX;
}
