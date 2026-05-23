export interface ReadabilityRulesData {
  readonly rules: {
    readonly protectedHitboxRadiusPx: number;
    readonly largeSpellAlphaMax: number;
    readonly maxDisplayedPickupTrailsHighPressure: number;
  } & Record<string, number>;
}

export interface ReadabilityEffect {
  readonly id: string;
  readonly effectId: string;
  readonly kind: "player_spell_fill" | "pickup_trail" | "screen_flash" | "background_fx" | "other";
  readonly layerId: string;
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
  readonly radius: number;
  readonly alpha: number;
  readonly count?: number;
}

export interface ReadabilityCircle {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

export interface ReadabilityHitbox extends ReadabilityCircle {
  readonly playerId: string;
}

export interface ReadabilityGuardInput {
  readonly frame: number;
  readonly effects: readonly ReadabilityEffect[];
  readonly enemyBullets: readonly ReadabilityCircle[];
  readonly playerHitboxes: readonly ReadabilityHitbox[];
  readonly tribulationActive: boolean;
}

export interface AdjustedReadabilityEffect extends ReadabilityEffect {
  readonly alpha: number;
  readonly count?: number;
  readonly readabilityFlags: readonly string[];
  readonly protectedHitboxHoleRadiusPx?: number;
}

export interface ReadabilityGuardResult {
  readonly frame: number;
  readonly adjustedEffects: readonly AdjustedReadabilityEffect[];
}

export interface ReadabilityGuardOptions {
  readonly rules: ReadabilityRulesData;
}

export class ReadabilityGuard {
  private readonly rules: ReadabilityRulesData["rules"];

  public constructor(options: ReadabilityGuardOptions) {
    this.rules = options.rules.rules;
  }

  public apply(input: ReadabilityGuardInput): ReadabilityGuardResult {
    const adjustedEffects = input.effects.map((effect) => this.adjustEffect(effect, input));

    return deepFreeze({
      frame: input.frame,
      adjustedEffects
    });
  }

  private adjustEffect(effect: ReadabilityEffect, input: ReadabilityGuardInput): AdjustedReadabilityEffect {
    let alpha = effect.alpha;
    let count = effect.count;
    const flags: string[] = [];
    let protectedHitboxHoleRadiusPx: number | undefined;

    if (effect.kind === "player_spell_fill" && alpha > this.rules.largeSpellAlphaMax) {
      alpha = this.rules.largeSpellAlphaMax;
      flags.push("large_spell_alpha_cap");
    }

    if (effect.kind === "player_spell_fill" && input.enemyBullets.some((bullet) => intersects(effect, bullet))) {
      alpha *= 0.65;
      flags.push("dimmed_near_enemy_bullet");
    }

    if (effect.kind === "player_spell_fill" && input.playerHitboxes.some((hitbox) => intersectsProtectedHitbox(effect, hitbox, this.rules.protectedHitboxRadiusPx))) {
      protectedHitboxHoleRadiusPx = this.rules.protectedHitboxRadiusPx;
      flags.push("protected_hitbox_hole");
    }

    if (
      effect.kind === "pickup_trail" &&
      (input.tribulationActive || input.enemyBullets.length > 80) &&
      count !== undefined &&
      count > this.rules.maxDisplayedPickupTrailsHighPressure
    ) {
      count = this.rules.maxDisplayedPickupTrailsHighPressure;
      flags.push("compressed_pickup_trails");
    }

    return {
      ...effect,
      alpha: round3(alpha),
      ...(count !== undefined ? { count } : {}),
      readabilityFlags: Object.freeze(flags),
      ...(protectedHitboxHoleRadiusPx !== undefined ? { protectedHitboxHoleRadiusPx } : {})
    };
  }
}

function intersects(effect: ReadabilityEffect, circle: ReadabilityCircle): boolean {
  return distanceSquared(effect.position, circle) <= (effect.radius + circle.radius) ** 2;
}

function intersectsProtectedHitbox(effect: ReadabilityEffect, hitbox: ReadabilityHitbox, protectedRadius: number): boolean {
  return distanceSquared(effect.position, hitbox) <= (effect.radius + protectedRadius) ** 2;
}

function distanceSquared(a: { readonly x: number; readonly y: number }, b: { readonly x: number; readonly y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
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
