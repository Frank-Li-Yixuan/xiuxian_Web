import type { EntityId } from "../entity/EntityManager";
import type { EnemyState } from "../enemies/EnemySystem";
import type { CombatPlayerState, Vec2 } from "../player/PlayerSystem";
import type { DamageEvent } from "./CollisionSystem";

export interface KilledEnemyState {
  readonly entityId: EntityId;
  readonly enemyId: string;
  readonly position: Vec2;
  readonly dropTableId: string;
}

export interface ApplyDamageEventsOptions {
  readonly players: readonly CombatPlayerState[];
  readonly enemies: readonly EnemyState[];
  readonly damageEvents: readonly DamageEvent[];
}

export interface DamageSystemResult {
  readonly players: readonly CombatPlayerState[];
  readonly enemies: readonly EnemyState[];
  readonly killedEnemies: readonly KilledEnemyState[];
}

export function applyDamageEvents(options: ApplyDamageEventsOptions): DamageSystemResult {
  const damageByEnemy = new Map<EntityId, number>();
  const damageByPlayer = new Map<string, number>();

  for (const event of options.damageEvents) {
    if (event.targetKind === "enemy") {
      damageByEnemy.set(event.targetEntityId, (damageByEnemy.get(event.targetEntityId) ?? 0) + event.amount);
    } else {
      damageByPlayer.set(event.targetPlayerId, (damageByPlayer.get(event.targetPlayerId) ?? 0) + event.amount);
    }
  }

  const killedEnemies: KilledEnemyState[] = [];
  const enemies: EnemyState[] = [];

  for (const enemy of options.enemies) {
    const incomingDamage = damageByEnemy.get(enemy.entityId) ?? 0;
    const finalDamage = applyEnemyArmor(incomingDamage, enemy.armor);
    const nextHp = Math.max(0, enemy.hp - finalDamage);
    if (nextHp <= 0) {
      killedEnemies.push({
        entityId: enemy.entityId,
        enemyId: enemy.enemyId,
        position: enemy.position,
        dropTableId: inferDropTableId(enemy.enemyId)
      });
    } else {
      enemies.push({ ...enemy, hp: nextHp });
    }
  }

  const players = options.players.map((player) => {
    const incomingDamage = damageByPlayer.get(player.playerId) ?? 0;
    if (incomingDamage <= 0) {
      return player;
    }

    return {
      ...player,
      hp: Math.max(0, player.hp - incomingDamage),
      aliveState: player.hp - incomingDamage <= 0 ? "soul" : player.aliveState
    };
  });

  return {
    players,
    enemies: enemies.sort((a, b) => a.entityId - b.entityId),
    killedEnemies: killedEnemies.sort((a, b) => a.entityId - b.entityId)
  };
}

function applyEnemyArmor(damage: number, armor: number): number {
  if (damage <= 0) {
    return 0;
  }
  const armorMultiplier = Math.min(Math.max(1 - Math.max(0, armor), 0.35), 1);
  return damage * armorMultiplier;
}

function inferDropTableId(enemyId: string): string {
  if (enemyId.startsWith("enemy_")) {
    return `drop_${enemyId.slice("enemy_".length)}`;
  }
  return `drop_${enemyId}`;
}
