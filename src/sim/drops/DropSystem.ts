import { EntityManager } from "../entity/EntityManager";
import type { EntityId } from "../entity/EntityManager";
import type { Vec2 } from "../player/PlayerSystem";
import type { KilledEnemyState } from "../combat/DamageSystem";

export type DropPickupType =
  | "insight_exp_orb"
  | "qi_orb"
  | "outer_material"
  | "cultivation_material"
  | "heavenly_material"
  | "reward_token";

export interface DropTablePack {
  readonly items: readonly DropTableDefinition[];
}

export interface DropTableDefinition {
  readonly id: string;
  readonly entries: readonly DropTableEntry[];
}

export interface DropTableEntry {
  readonly dropId: string;
  readonly type: DropPickupType;
  readonly amount: number;
  readonly chance: number;
  readonly params?: Readonly<Record<string, unknown>>;
}

export interface PickupState {
  readonly entityId: EntityId;
  readonly pickupId: string;
  readonly type: DropPickupType;
  readonly amount: number;
  readonly position: Vec2;
  readonly spawnFrame: number;
  readonly params?: Readonly<Record<string, unknown>>;
}

export interface DropRng {
  nextFloat01(): number;
}

export interface MaterializeDropsOptions {
  readonly frame: number;
  readonly killedEnemies: readonly KilledEnemyState[];
  readonly dropTables: Readonly<Record<string, DropTableDefinition>>;
  readonly dropRng?: DropRng;
  readonly dropRolls?: Readonly<Record<string, readonly number[]>>;
}

type PickupPayload = Omit<PickupState, "entityId">;

const DROP_SPACING_X = 12;

export function createDropTableIndex(
  dropTables: readonly DropTableDefinition[]
): Readonly<Record<string, DropTableDefinition>> {
  const indexed: Record<string, DropTableDefinition> = {};
  for (const table of dropTables) {
    validateDropTable(table);
    if (indexed[table.id] !== undefined) {
      throw new Error(`Duplicate drop table id: ${table.id}`);
    }
    indexed[table.id] = table;
  }
  return indexed;
}

export function materializeDrops(options: MaterializeDropsOptions): readonly PickupState[] {
  const pickupManager = new EntityManager<PickupPayload>();

  for (const killedEnemy of [...options.killedEnemies].sort((a, b) => a.entityId - b.entityId)) {
    const table = options.dropTables[killedEnemy.dropTableId];
    if (table === undefined) {
      throw new Error(`Missing drop table: ${killedEnemy.dropTableId}`);
    }

    let emittedIndex = 0;
    for (let entryIndex = 0; entryIndex < table.entries.length; entryIndex += 1) {
      const entry = table.entries[entryIndex];
      if (entry === undefined) {
        continue;
      }
      if (!passesDropChance(table.id, entryIndex, entry.chance, options)) {
        continue;
      }

      const position = {
        x: killedEnemy.position.x + emittedIndex * DROP_SPACING_X,
        y: killedEnemy.position.y
      };
      const basePickup = {
        pickupId: entry.dropId,
        type: entry.type,
        amount: entry.amount,
        position,
        spawnFrame: options.frame
      };

      pickupManager.create(entry.params === undefined ? basePickup : { ...basePickup, params: entry.params });
      emittedIndex += 1;
    }
  }

  return pickupManager.getAllSorted();
}

function passesDropChance(
  tableId: string,
  entryIndex: number,
  chance: number,
  options: MaterializeDropsOptions
): boolean {
  if (chance >= 1) {
    return true;
  }
  if (chance <= 0) {
    return false;
  }

  const roll = options.dropRolls?.[tableId]?.[entryIndex] ?? options.dropRng?.nextFloat01();
  if (roll === undefined) {
    throw new Error(`Drop chance for ${tableId}[${entryIndex}] requires dropRng or dropRolls`);
  }

  return roll < chance;
}

function validateDropTable(table: DropTableDefinition): void {
  if (table.id.length === 0) {
    throw new Error("drop table id must not be empty");
  }
  for (const entry of table.entries) {
    if (entry.dropId.length === 0) {
      throw new Error(`drop table ${table.id} contains empty dropId`);
    }
    if (!Number.isFinite(entry.amount) || entry.amount < 0) {
      throw new Error(`drop table ${table.id} entry amount must be non-negative`);
    }
    if (!Number.isFinite(entry.chance) || entry.chance < 0 || entry.chance > 1) {
      throw new Error(`drop table ${table.id} entry chance must be between 0 and 1`);
    }
  }
}
