import type { EntityId } from "../entity/EntityManager";
import type { EnemyState } from "../enemies/EnemySystem";
import type { CombatPlayerState, Vec2 } from "../player/PlayerSystem";
import type { ProjectileState } from "../projectiles/ProjectileSystem";

export interface EnemyProjectileState {
  readonly entityId: EntityId;
  readonly ownerKind: "enemy" | "boss" | "tribulation";
  readonly ownerId: string;
  readonly position: Vec2;
  readonly velocity: Vec2;
  readonly damage: number;
  readonly radius: number;
  readonly spawnFrame: number;
}

export type DamageSourceKind = "player_projectile" | "enemy_projectile" | "contact";

export interface EnemyDamageEvent {
  readonly targetKind: "enemy";
  readonly targetEntityId: EntityId;
  readonly sourceKind: "player_projectile" | "spell";
  readonly sourceEntityId?: EntityId;
  readonly sourcePlayerId: string;
  readonly amount: number;
}

export interface BossCollisionState {
  readonly entityId: EntityId;
  readonly position: Vec2;
  readonly status?: "entering" | "active" | "defeated";
}

export interface BossDamageEvent {
  readonly targetKind: "boss";
  readonly targetEntityId: EntityId;
  readonly sourceKind: "player_projectile" | "spell";
  readonly sourceEntityId: EntityId;
  readonly sourcePlayerId: string;
  readonly amount: number;
}

export interface PlayerDamageEvent {
  readonly targetKind: "player";
  readonly targetPlayerId: string;
  readonly sourceKind: "enemy_projectile" | "contact";
  readonly sourceEntityId: EntityId;
  readonly amount: number;
}

export type DamageEvent = EnemyDamageEvent | BossDamageEvent | PlayerDamageEvent;

export interface ResolveCollisionFrameOptions {
  readonly frame: number;
  readonly players: readonly CombatPlayerState[];
  readonly enemies: readonly EnemyState[];
  readonly bosses?: readonly BossCollisionState[];
  readonly playerProjectiles: readonly ProjectileState[];
  readonly enemyProjectiles: readonly EnemyProjectileState[];
}

export interface CollisionFrameResult {
  readonly damageEvents: readonly DamageEvent[];
  readonly consumedPlayerProjectileIds: readonly EntityId[];
  readonly consumedEnemyProjectileIds: readonly EntityId[];
}

const DEFAULT_ENEMY_HIT_RADIUS = 16;

export function resolveCollisionFrame(options: ResolveCollisionFrameOptions): CollisionFrameResult {
  const damageEvents: DamageEvent[] = [];
  const consumedPlayerProjectileIds: EntityId[] = [];
  const consumedEnemyProjectileIds: EntityId[] = [];
  const sortedEnemies = [...options.enemies].sort((a, b) => a.entityId - b.entityId);
  const sortedBosses = [...(options.bosses ?? [])].filter((boss) => boss.status !== "defeated").sort((a, b) => a.entityId - b.entityId);
  const sortedPlayers = [...options.players].sort((a, b) => a.playerId.localeCompare(b.playerId));

  for (const projectile of [...options.playerProjectiles].sort((a, b) => a.entityId - b.entityId)) {
    if (!isPlayerProjectileActive(projectile, options.frame)) {
      continue;
    }

    let hits = 0;
    for (const enemy of sortedEnemies) {
      if (collides(projectile.position, getProjectileCollisionRadius(projectile), enemy.position, getEnemyHitRadius(enemy))) {
        damageEvents.push({
          targetKind: "enemy",
          targetEntityId: enemy.entityId,
          sourceKind: "player_projectile",
          sourceEntityId: projectile.entityId,
          sourcePlayerId: projectile.ownerPlayerId,
          amount: projectile.damage
        });
        hits += 1;
        if (projectile.kind === "linear" && hits > projectile.pierce) {
          consumedPlayerProjectileIds.push(projectile.entityId);
          break;
        }
      }
    }
    for (const boss of sortedBosses) {
      if (projectile.kind === "linear" && hits > projectile.pierce) {
        break;
      }
      if (collides(projectile.position, getProjectileCollisionRadius(projectile), boss.position, getBossHitRadius())) {
        damageEvents.push({
          targetKind: "boss",
          targetEntityId: boss.entityId,
          sourceKind: "player_projectile",
          sourceEntityId: projectile.entityId,
          sourcePlayerId: projectile.ownerPlayerId,
          amount: projectile.damage
        });
        hits += 1;
        if (projectile.kind === "linear") {
          consumedPlayerProjectileIds.push(projectile.entityId);
          break;
        }
      }
    }
  }

  for (const projectile of [...options.enemyProjectiles].sort((a, b) => a.entityId - b.entityId)) {
    for (const player of sortedPlayers) {
      if (!isDamageablePlayer(player)) {
        continue;
      }
      if (collides(projectile.position, projectile.radius, player.position, player.hitboxRadius)) {
        damageEvents.push({
          targetKind: "player",
          targetPlayerId: player.playerId,
          sourceKind: "enemy_projectile",
          sourceEntityId: projectile.entityId,
          amount: projectile.damage
        });
        consumedEnemyProjectileIds.push(projectile.entityId);
        break;
      }
    }
  }

  for (const enemy of sortedEnemies) {
    for (const player of sortedPlayers) {
      if (!isDamageablePlayer(player)) {
        continue;
      }
      if (collides(enemy.position, getEnemyHitRadius(enemy), player.position, player.hitboxRadius)) {
        damageEvents.push({
          targetKind: "player",
          targetPlayerId: player.playerId,
          sourceKind: "contact",
          sourceEntityId: enemy.entityId,
          amount: enemy.contactDamage
        });
      }
    }
  }

  return {
    damageEvents,
    consumedPlayerProjectileIds,
    consumedEnemyProjectileIds
  };
}

function isPlayerProjectileActive(projectile: ProjectileState, frame: number): boolean {
  return projectile.kind !== "delayed_area" || frame >= projectile.spawnFrame + projectile.delayFrames;
}

function getProjectileCollisionRadius(projectile: ProjectileState): number {
  return projectile.kind === "delayed_area" ? projectile.radius : projectile.radius;
}

function getEnemyHitRadius(enemy: EnemyState): number {
  return enemy.tags.includes("elite") || enemy.tags.includes("tank") ? 24 : DEFAULT_ENEMY_HIT_RADIUS;
}

function getBossHitRadius(): number {
  return 72;
}

function isDamageablePlayer(player: CombatPlayerState): boolean {
  return player.aliveState === "body" || player.aliveState === "yang_shen";
}

function collides(aPosition: Vec2, aRadius: number, bPosition: Vec2, bRadius: number): boolean {
  const dx = aPosition.x - bPosition.x;
  const dy = aPosition.y - bPosition.y;
  const radius = aRadius + bRadius;
  return dx * dx + dy * dy <= radius * radius;
}
