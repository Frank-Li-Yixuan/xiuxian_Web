export type ResourceMap = Readonly<Record<string, number>>;

export interface SpendResourcesResult {
  readonly wallet: ResourceMap;
  readonly spent: ResourceMap;
}

export function addResources(wallet: ResourceMap, resources: ResourceMap): ResourceMap {
  const next: Record<string, number> = {};
  copyResourcesInto(next, wallet);
  for (const [resourceId, amount] of Object.entries(resources)) {
    validateResource(resourceId, amount);
    if (amount > 0) {
      next[resourceId] = round3((next[resourceId] ?? 0) + amount);
    }
  }
  return Object.freeze(next);
}

export function canAfford(wallet: ResourceMap, cost: ResourceMap | undefined): boolean {
  if (cost === undefined) {
    return true;
  }
  for (const [resourceId, amount] of Object.entries(cost)) {
    validateResource(resourceId, amount);
    if ((wallet[resourceId] ?? 0) < amount) {
      return false;
    }
  }
  return true;
}

export function spendResources(wallet: ResourceMap, cost: ResourceMap | undefined): SpendResourcesResult {
  if (cost === undefined || Object.keys(cost).length === 0) {
    return deepFreeze({ wallet: addResources(wallet, {}), spent: {} });
  }
  if (!canAfford(wallet, cost)) {
    throw new Error("wallet cannot afford requested resource cost");
  }

  const next: Record<string, number> = {};
  copyResourcesInto(next, wallet);
  for (const [resourceId, amount] of Object.entries(cost)) {
    validateResource(resourceId, amount);
    next[resourceId] = round3((next[resourceId] ?? 0) - amount);
  }
  return deepFreeze({
    wallet: next,
    spent: copyResourceMap(cost)
  });
}

export function copyResourceMap(resources: ResourceMap): ResourceMap {
  const copy: Record<string, number> = {};
  copyResourcesInto(copy, resources);
  return Object.freeze(copy);
}

function copyResourcesInto(target: Record<string, number>, resources: ResourceMap): void {
  for (const [resourceId, amount] of Object.entries(resources)) {
    validateResource(resourceId, amount);
    target[resourceId] = amount;
  }
}

function validateResource(resourceId: string, amount: number): void {
  if (resourceId.length === 0) {
    throw new Error("resource id must not be empty");
  }
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`resource ${resourceId} must be non-negative finite`);
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
