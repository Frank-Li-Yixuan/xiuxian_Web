export interface HashableEntity {
  readonly entityId: number;
}

export interface HashablePlayer {
  readonly playerId: string;
}

export interface HashableSimState {
  readonly runId: string;
  readonly seed: number;
  readonly dataPackHash: string;
  readonly stageId: string;
  readonly frame: number;
  readonly players: readonly HashablePlayer[];
  readonly enemies: readonly HashableEntity[];
  readonly projectiles: readonly HashableEntity[];
  readonly pickups: readonly HashableEntity[];
  readonly bosses: readonly HashableEntity[];
  readonly tribulations: readonly object[];
  readonly teamInsightExp: object;
  readonly playerCultivations: readonly HashablePlayer[];
  readonly rescueStates: readonly object[];
  readonly rng: object;
}

export interface NormalizedSimStateForHash {
  readonly runId: string;
  readonly seed: number;
  readonly dataPackHash: string;
  readonly stageId: string;
  readonly frame: number;
  readonly players: readonly HashablePlayer[];
  readonly enemies: readonly HashableEntity[];
  readonly projectiles: readonly HashableEntity[];
  readonly pickups: readonly HashableEntity[];
  readonly bosses: readonly HashableEntity[];
  readonly tribulations: readonly object[];
  readonly teamInsightExp: object;
  readonly playerCultivations: readonly HashablePlayer[];
  readonly rescueStates: readonly object[];
  readonly rng: object;
}

const FNV_OFFSET_BASIS = 2_166_136_261;
const FNV_PRIME = 16_777_619;

export function computeStateHash(state: HashableSimState): string {
  return fnv1a32(stableStringify(normalizeStateForHash(state))).toString(16).padStart(8, "0");
}

export function normalizeStateForHash(state: HashableSimState): NormalizedSimStateForHash {
  return {
    runId: state.runId,
    seed: state.seed,
    dataPackHash: state.dataPackHash,
    stageId: state.stageId,
    frame: state.frame,
    players: sortByPlayerId(state.players),
    enemies: sortByEntityId(state.enemies),
    projectiles: sortByEntityId(state.projectiles),
    pickups: sortByEntityId(state.pickups),
    bosses: sortByEntityId(state.bosses),
    tribulations: sortRecords(state.tribulations, ["id", "triggeringPlayerId", "startFrame"]),
    teamInsightExp: state.teamInsightExp,
    playerCultivations: sortByPlayerId(state.playerCultivations),
    rescueStates: sortRecords(state.rescueStates, ["downedPlayerId", "rescuerPlayerId"]),
    rng: state.rng
  };
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
    .join(",")}}`;
}

function sortByEntityId<T extends HashableEntity>(items: readonly T[]): readonly T[] {
  return [...items].sort((a, b) => a.entityId - b.entityId);
}

function sortByPlayerId<T extends HashablePlayer>(items: readonly T[]): readonly T[] {
  return [...items].sort((a, b) => a.playerId.localeCompare(b.playerId));
}

function sortRecords<T extends object>(items: readonly T[], fields: readonly string[]): readonly T[] {
  return [...items].sort((a, b) => {
    for (const field of fields) {
      const left = scalarSortValue(readField(a, field));
      const right = scalarSortValue(readField(b, field));
      const comparison = left.localeCompare(right);
      if (comparison !== 0) {
        return comparison;
      }
    }
    return stableStringify(a).localeCompare(stableStringify(b));
  });
}

function readField(object: object, field: string): unknown {
  return (object as Record<string, unknown>)[field];
}

function scalarSortValue(value: unknown): string {
  if (typeof value === "number") {
    return value.toString().padStart(12, "0");
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }
  return "";
}

function fnv1a32(value: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash >>> 0;
}
