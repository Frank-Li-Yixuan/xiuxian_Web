import type { EntityId } from "../entity/EntityManager";
import type { Vec2 } from "../player/PlayerSystem";

export type SpellEffectKind = "chain_damage" | "bullet_clear_aura" | "damage_field" | "bullet_absorb";

export interface EffectEvent {
  readonly frame: number;
  readonly ownerPlayerId: string;
  readonly spellId: string;
  readonly effectId: string;
  readonly position: Vec2;
  readonly targetEntityId?: EntityId;
  readonly reason?: "insufficient_qi" | "cooldown" | "empty_slot";
}

export interface ActiveSpellEffect {
  readonly spellId: string;
  readonly ownerPlayerId: string;
  readonly kind: "bullet_clear_aura" | "damage_field" | "bullet_absorb_window";
  readonly position: Vec2;
  readonly radius: number;
  readonly startFrame: number;
  readonly endFrame: number;
  readonly tickIntervalFrames?: number;
  readonly tickDamage?: number;
}

export interface SpellDamageEvent {
  readonly targetKind: "enemy";
  readonly targetEntityId: EntityId;
  readonly sourceKind: "spell";
  readonly sourceSpellId: string;
  readonly sourcePlayerId: string;
  readonly amount: number;
}

export interface ReflectedSpellProjectile {
  readonly ownerPlayerId: string;
  readonly sourceSpellId: string;
  readonly position: Vec2;
  readonly damage: number;
  readonly spawnFrame: number;
  readonly absorbedProjectileIds: readonly EntityId[];
}

export function createEffectEvent(input: EffectEvent): EffectEvent {
  return input;
}

export function distanceSquared(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function isWithinRadius(a: Vec2, b: Vec2, radius: number): boolean {
  return distanceSquared(a, b) <= radius * radius;
}
