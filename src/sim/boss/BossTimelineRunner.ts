import { assertNonNegativeInteger, secondsToFrames } from "../SimConstants";

export interface BossTimelineRepeatDefinition {
  readonly count: number;
  readonly interval: number;
}

export interface BossTimelineEntryDefinition {
  readonly at: number;
  readonly patternId: string;
  readonly repeat?: BossTimelineRepeatDefinition;
  readonly params?: Readonly<Record<string, unknown>>;
}

export interface BossPhaseDefinition {
  readonly id: string;
  readonly hpThreshold: number;
  readonly timeline: readonly BossTimelineEntryDefinition[];
}

export interface BossTimelineEvent {
  readonly frame: number;
  readonly phaseFrame: number;
  readonly phaseId: string;
  readonly patternId: string;
  readonly repeatIndex: number;
  readonly params: Readonly<Record<string, unknown>>;
}

interface ScheduledTimelineEvent {
  readonly phaseFrame: number;
  readonly patternId: string;
  readonly repeatIndex: number;
  readonly params: Readonly<Record<string, unknown>>;
  readonly order: number;
}

export class BossTimelineRunner {
  private readonly phase: BossPhaseDefinition;
  private readonly scheduledEvents: readonly ScheduledTimelineEvent[];

  public constructor(phase: BossPhaseDefinition) {
    validatePhase(phase);
    this.phase = phase;
    this.scheduledEvents = buildSchedule(phase);
  }

  public getEventsForFrame(frame: number, phaseStartFrame: number): readonly BossTimelineEvent[] {
    assertNonNegativeInteger(frame, "frame");
    assertNonNegativeInteger(phaseStartFrame, "phaseStartFrame");

    const phaseFrame = frame - phaseStartFrame;
    if (phaseFrame < 0) {
      return Object.freeze([]);
    }

    const events = this.scheduledEvents
      .filter((event) => event.phaseFrame === phaseFrame)
      .map((event) =>
        freezeEvent({
          frame,
          phaseFrame,
          phaseId: this.phase.id,
          patternId: event.patternId,
          repeatIndex: event.repeatIndex,
          params: event.params
        })
      );

    return Object.freeze(events);
  }

  public getScheduledEvents(): readonly ScheduledTimelineEvent[] {
    return this.scheduledEvents;
  }
}

function buildSchedule(phase: BossPhaseDefinition): readonly ScheduledTimelineEvent[] {
  const events: ScheduledTimelineEvent[] = [];
  let order = 0;

  for (const entry of phase.timeline) {
    const repeatCount = entry.repeat?.count ?? 1;
    const repeatInterval = entry.repeat?.interval ?? 0;
    for (let repeatIndex = 0; repeatIndex < repeatCount; repeatIndex += 1) {
      events.push({
        phaseFrame: secondsToFrames(entry.at + repeatIndex * repeatInterval),
        patternId: entry.patternId,
        repeatIndex,
        params: freezeRecord(entry.params ?? {}),
        order
      });
      order += 1;
    }
  }

  return Object.freeze([...events].sort((a, b) => a.phaseFrame - b.phaseFrame || a.order - b.order));
}

function validatePhase(phase: BossPhaseDefinition): void {
  if (phase.id.length === 0) {
    throw new Error("boss phase id must not be empty");
  }
  if (!Number.isFinite(phase.hpThreshold) || phase.hpThreshold < 0 || phase.hpThreshold > 1) {
    throw new Error(`boss phase ${phase.id} hpThreshold must be between 0 and 1`);
  }
  for (const entry of phase.timeline) {
    if (!Number.isFinite(entry.at) || entry.at < 0) {
      throw new Error(`boss phase ${phase.id} timeline at must be non-negative`);
    }
    if (entry.patternId.length === 0) {
      throw new Error(`boss phase ${phase.id} timeline patternId must not be empty`);
    }
    if (entry.repeat !== undefined) {
      assertNonNegativeInteger(entry.repeat.count, "repeat.count");
      if (entry.repeat.count < 1) {
        throw new Error("repeat.count must be at least 1");
      }
      if (!Number.isFinite(entry.repeat.interval) || entry.repeat.interval < 0) {
        throw new Error("repeat.interval must be non-negative");
      }
    }
  }
}

function freezeRecord(record: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  return Object.freeze({ ...record });
}

function freezeEvent(event: BossTimelineEvent): BossTimelineEvent {
  return Object.freeze(event);
}
