export type EntityId = number;

export interface EntityWithId {
  readonly entityId: EntityId;
}

export interface EntityAllocatorState {
  readonly nextEntityId: EntityId;
}

export class EntityManager<TPayload extends object> {
  private nextEntityId: EntityId;
  private readonly entities = new Map<EntityId, TPayload & EntityWithId>();

  public constructor(state: EntityAllocatorState = { nextEntityId: 1 }) {
    if (!Number.isInteger(state.nextEntityId) || state.nextEntityId < 1) {
      throw new Error("nextEntityId must be a positive integer");
    }

    this.nextEntityId = state.nextEntityId;
  }

  public create(payload: TPayload): TPayload & EntityWithId {
    const entity = {
      ...payload,
      entityId: this.nextEntityId
    };

    this.entities.set(this.nextEntityId, entity);
    this.nextEntityId += 1;
    return entity;
  }

  public upsert(entity: TPayload & EntityWithId): void {
    if (!Number.isInteger(entity.entityId) || entity.entityId < 1) {
      throw new Error("entityId must be a positive integer");
    }

    this.entities.set(entity.entityId, entity);
    if (entity.entityId >= this.nextEntityId) {
      this.nextEntityId = entity.entityId + 1;
    }
  }

  public get(entityId: EntityId): (TPayload & EntityWithId) | undefined {
    return this.entities.get(entityId);
  }

  public remove(entityId: EntityId): boolean {
    return this.entities.delete(entityId);
  }

  public getAllSorted(): readonly (TPayload & EntityWithId)[] {
    return [...this.entities.values()].sort((a, b) => a.entityId - b.entityId);
  }

  public clear(): void {
    this.entities.clear();
  }

  public getAllocatorState(): EntityAllocatorState {
    return { nextEntityId: this.nextEntityId };
  }
}
