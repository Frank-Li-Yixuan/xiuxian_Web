export interface VfxVec2 {
  readonly x: number;
  readonly y: number;
}

export interface QueuedEffectEvent {
  readonly frame: number;
  readonly effectId: string;
  readonly position: VfxVec2;
  readonly ownerPlayerId?: string;
  readonly spellId?: string;
  readonly targetEntityId?: number;
  readonly attachedEntityId?: number;
  readonly durationFrames?: number;
  readonly intensity?: number;
  readonly seed?: number;
  readonly tags?: readonly string[];
}

export interface NormalizedEffectEvent extends QueuedEffectEvent {
  readonly mode: "one_shot" | "duration";
  readonly startFrame: number;
  readonly endFrame?: number;
}

interface StoredEffectEvent {
  readonly event: NormalizedEffectEvent;
  readonly order: number;
}

export class EffectEventQueue {
  private readonly allEvents: StoredEffectEvent[] = [];
  private readonly pendingEvents: StoredEffectEvent[] = [];
  private nextOrder = 0;

  public enqueue(event: QueuedEffectEvent): void {
    const stored: StoredEffectEvent = {
      event: normalizeEvent(event),
      order: this.nextOrder
    };
    this.nextOrder += 1;
    this.allEvents.push(stored);
    this.pendingEvents.push(stored);
  }

  public enqueueMany(events: readonly QueuedEffectEvent[]): void {
    for (const event of events) {
      this.enqueue(event);
    }
  }

  public drainDue(frame: number): readonly NormalizedEffectEvent[] {
    const due: StoredEffectEvent[] = [];
    const pending: StoredEffectEvent[] = [];

    for (const stored of this.pendingEvents) {
      if (stored.event.frame <= frame) {
        due.push(stored);
      } else {
        pending.push(stored);
      }
    }

    this.pendingEvents.length = 0;
    this.pendingEvents.push(...pending);

    return freezeEventArray(sortStored(due).map((stored) => stored.event));
  }

  public peekDue(frame: number): readonly NormalizedEffectEvent[] {
    return freezeEventArray(
      sortStored(this.pendingEvents.filter((stored) => stored.event.frame <= frame)).map((stored) => stored.event)
    );
  }

  public getActive(frame: number): readonly NormalizedEffectEvent[] {
    const active = this.allEvents
      .filter((stored) => {
        const event = stored.event;
        return event.mode === "duration" && event.startFrame <= frame && event.endFrame !== undefined && frame < event.endFrame;
      });

    return freezeEventArray(sortStored(active).map((stored) => stored.event));
  }
}

function normalizeEvent(event: QueuedEffectEvent): NormalizedEffectEvent {
  if (!Number.isInteger(event.frame) || event.frame < 0) {
    throw new Error(`EffectEvent ${event.effectId} frame must be a non-negative integer`);
  }
  if (event.effectId.length === 0) {
    throw new Error("EffectEvent effectId must not be empty");
  }
  if (!Number.isFinite(event.position.x) || !Number.isFinite(event.position.y)) {
    throw new Error(`EffectEvent ${event.effectId} position must be finite`);
  }

  const durationFrames = event.durationFrames ?? 0;
  if (!Number.isInteger(durationFrames) || durationFrames < 0) {
    throw new Error(`EffectEvent ${event.effectId} durationFrames must be a non-negative integer`);
  }

  const normalized: NormalizedEffectEvent = {
    ...copyEvent(event),
    mode: durationFrames > 0 ? "duration" : "one_shot",
    startFrame: event.frame,
    ...(durationFrames > 0 ? { durationFrames, endFrame: event.frame + durationFrames } : {})
  };

  return deepFreeze(normalized);
}

function copyEvent(event: QueuedEffectEvent): QueuedEffectEvent {
  return {
    frame: event.frame,
    effectId: event.effectId,
    position: { x: event.position.x, y: event.position.y },
    ...(event.ownerPlayerId !== undefined ? { ownerPlayerId: event.ownerPlayerId } : {}),
    ...(event.spellId !== undefined ? { spellId: event.spellId } : {}),
    ...(event.targetEntityId !== undefined ? { targetEntityId: event.targetEntityId } : {}),
    ...(event.attachedEntityId !== undefined ? { attachedEntityId: event.attachedEntityId } : {}),
    ...(event.durationFrames !== undefined ? { durationFrames: event.durationFrames } : {}),
    ...(event.intensity !== undefined ? { intensity: event.intensity } : {}),
    ...(event.seed !== undefined ? { seed: event.seed } : {}),
    ...(event.tags !== undefined ? { tags: [...event.tags] } : {})
  };
}

function sortStored(events: readonly StoredEffectEvent[]): readonly StoredEffectEvent[] {
  return [...events].sort((a, b) => a.event.frame - b.event.frame || a.order - b.order);
}

function freezeEventArray(events: readonly NormalizedEffectEvent[]): readonly NormalizedEffectEvent[] {
  return Object.freeze([...events]);
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
