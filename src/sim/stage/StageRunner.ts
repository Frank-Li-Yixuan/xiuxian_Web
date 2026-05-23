import { SIM_FPS, assertNonNegativeInteger, secondsToFrames } from "../SimConstants";

export interface StageDefinition {
  readonly id: string;
  readonly segments: readonly StageSegmentDefinition[];
}

export interface StageSegmentDefinition {
  readonly id: string;
  readonly duration: number;
  readonly waves: readonly WaveDefinition[];
  readonly endEvent?: Readonly<Record<string, unknown>>;
}

export interface WaveDefinition {
  readonly startTime: number;
  readonly endTime: number;
  readonly intensity?: number;
  readonly spawnGroups: readonly SpawnGroupDefinition[];
}

export interface SpawnGroupDefinition {
  readonly enemyId: string;
  readonly pattern: SpawnPatternId;
  readonly count: number;
  readonly interval: number;
  readonly xRange?: readonly [number, number];
  readonly fixedX?: readonly number[];
  readonly targetRule?: string;
}

export type SpawnPatternId =
  | "random_top"
  | "line"
  | "paired_sides"
  | "side_stream"
  | "fixed_points"
  | "elite_center";

export interface StageFrameContext {
  readonly stageId: string;
  readonly absoluteFrame: number;
  readonly segmentId: string;
  readonly segmentIndex: number;
  readonly segmentStartFrame: number;
  readonly segmentFrame: number;
  readonly segmentElapsedSeconds: number;
  readonly segment: StageSegmentDefinition;
}

export interface StageRunnerOptions {
  readonly segmentIds?: readonly string[];
}

interface SegmentPlan {
  readonly segment: StageSegmentDefinition;
  readonly segmentIndex: number;
  readonly startFrame: number;
  readonly endFrameExclusive: number;
}

export class StageRunner {
  public readonly totalFrames: number;

  private readonly stage: StageDefinition;
  private readonly segmentPlans: readonly SegmentPlan[];

  public constructor(stage: StageDefinition, options: StageRunnerOptions = {}) {
    assertStageDefinition(stage);
    this.stage = stage;

    const segments = selectSegments(stage, options.segmentIds);
    let startFrame = 0;
    const plans: SegmentPlan[] = [];

    for (const selected of segments) {
      const durationFrames = secondsToFrames(selected.segment.duration);
      plans.push({
        segment: selected.segment,
        segmentIndex: selected.segmentIndex,
        startFrame,
        endFrameExclusive: startFrame + durationFrames
      });
      startFrame += durationFrames;
    }

    this.segmentPlans = plans;
    this.totalFrames = startFrame;
  }

  public getFrameContext(absoluteFrame: number): StageFrameContext | undefined {
    assertNonNegativeInteger(absoluteFrame, "absoluteFrame");

    for (const plan of this.segmentPlans) {
      if (absoluteFrame >= plan.startFrame && absoluteFrame < plan.endFrameExclusive) {
        const segmentFrame = absoluteFrame - plan.startFrame;
        return {
          stageId: this.stage.id,
          absoluteFrame,
          segmentId: plan.segment.id,
          segmentIndex: plan.segmentIndex,
          segmentStartFrame: plan.startFrame,
          segmentFrame,
          segmentElapsedSeconds: segmentFrame / SIM_FPS,
          segment: plan.segment
        };
      }
    }

    return undefined;
  }
}

function selectSegments(
  stage: StageDefinition,
  segmentIds: readonly string[] | undefined
): readonly { readonly segment: StageSegmentDefinition; readonly segmentIndex: number }[] {
  if (segmentIds === undefined) {
    return stage.segments.map((segment, segmentIndex) => ({ segment, segmentIndex }));
  }

  const segmentsById = new Map(stage.segments.map((segment, segmentIndex) => [segment.id, { segment, segmentIndex }]));
  return segmentIds.map((segmentId) => {
    const segment = segmentsById.get(segmentId);
    if (segment === undefined) {
      throw new Error(`Unknown stage segment id: ${segmentId}`);
    }
    return segment;
  });
}

function assertStageDefinition(stage: StageDefinition): void {
  if (stage.id.length === 0) {
    throw new Error("stage id must not be empty");
  }
  if (stage.segments.length === 0) {
    throw new Error("stage must contain at least one segment");
  }
  for (const segment of stage.segments) {
    if (segment.id.length === 0) {
      throw new Error("stage segment id must not be empty");
    }
    if (!Number.isFinite(segment.duration) || segment.duration < 0) {
      throw new Error("stage segment duration must be non-negative");
    }
  }
}
