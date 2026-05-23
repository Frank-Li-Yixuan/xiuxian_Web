import { InputButtonBit, hasInputButton, type FrameInput, type PlayerId, validateFrameInput } from "../input/FrameInput";
import { secondsToFrames } from "../SimConstants";
import type { EnemyState } from "../enemies/EnemySystem";
import type { EntityId } from "../entity/EntityManager";
import type { CombatPlayerState, Vec2 } from "../player/PlayerSystem";
import {
  createEffectEvent,
  distanceSquared,
  isWithinRadius,
  type ActiveSpellEffect,
  type EffectEvent,
  type ReflectedSpellProjectile,
  type SpellDamageEvent
} from "./SpellEffects";

export interface SpellDefinitionPack {
  readonly items: readonly SpellDefinition[];
}

export interface SpellDefinition {
  readonly id: string;
  readonly costQi: number;
  readonly cooldown: number;
  readonly targeting: string;
  readonly baseEffect: SpellBaseEffectDefinition;
}

export interface SpellBaseEffectDefinition {
  readonly effectId: string;
  readonly type: SpellEffectType;
  readonly params: Readonly<Record<string, unknown>>;
}

export type SpellEffectType = "chain" | "clear_bullets" | "aoe" | "absorb_bullets";

export interface SpellRuntimePlayerState {
  readonly playerId: PlayerId;
  readonly spellSlots: readonly (string | null)[];
  readonly cooldowns: Readonly<Record<string, number>>;
}

export interface CreateSpellRuntimeInput {
  readonly playerId: PlayerId;
  readonly spellSlots: readonly (string | null)[];
  readonly cooldowns?: Readonly<Record<string, number>>;
}

export interface SpellEnemyProjectileState {
  readonly entityId: EntityId;
  readonly position: Vec2;
  readonly tags?: readonly string[];
  readonly clearable?: boolean;
}

export interface StepSpellSystemOptions {
  readonly frame: number;
  readonly players: readonly CombatPlayerState[];
  readonly frameInputs: readonly FrameInput[];
  readonly enemies: readonly EnemyState[];
  readonly enemyProjectiles: readonly SpellEnemyProjectileState[];
  readonly spellDefinitions: Readonly<Record<string, SpellDefinition>>;
  readonly spellState: readonly SpellRuntimePlayerState[];
}

export interface StepSpellSystemResult {
  readonly players: readonly CombatPlayerState[];
  readonly spellState: readonly SpellRuntimePlayerState[];
  readonly damageEvents: readonly SpellDamageEvent[];
  readonly effectEvents: readonly EffectEvent[];
  readonly activeEffects: readonly ActiveSpellEffect[];
  readonly clearedEnemyProjectileIds: readonly EntityId[];
  readonly absorbedEnemyProjectileIds: readonly EntityId[];
  readonly reflectedProjectiles: readonly ReflectedSpellProjectile[];
}

const SPELL_SLOT_BUTTONS = [
  InputButtonBit.Spell1,
  InputButtonBit.Spell2,
  InputButtonBit.Spell3,
  InputButtonBit.Spell4
] as const;

export function indexSpellDefinitions(
  definitions: readonly SpellDefinition[]
): Readonly<Record<string, SpellDefinition>> {
  const indexed: Record<string, SpellDefinition> = {};
  for (const definition of definitions) {
    validateSpellDefinition(definition);
    if (indexed[definition.id] !== undefined) {
      throw new Error(`Duplicate spell definition id: ${definition.id}`);
    }
    indexed[definition.id] = definition;
  }
  return indexed;
}

export function createSpellRuntimeState(inputs: readonly CreateSpellRuntimeInput[]): readonly SpellRuntimePlayerState[] {
  return inputs.map((input) => {
    if (input.playerId.length === 0) {
      throw new Error("playerId must not be empty");
    }
    return {
      playerId: input.playerId,
      spellSlots: input.spellSlots,
      cooldowns: input.cooldowns ?? {}
    };
  });
}

export function stepSpellSystem(options: StepSpellSystemOptions): StepSpellSystemResult {
  const frameInputs = new Map<PlayerId, FrameInput>();
  for (const frameInput of options.frameInputs) {
    validateFrameInput(frameInput);
    frameInputs.set(frameInput.playerId, frameInput);
  }

  const spellStateByPlayer = new Map(options.spellState.map((state) => [state.playerId, state]));
  let players = [...options.players].sort((a, b) => a.playerId.localeCompare(b.playerId));
  const nextSpellState: SpellRuntimePlayerState[] = [];
  const damageEvents: SpellDamageEvent[] = [];
  const effectEvents: EffectEvent[] = [];
  const activeEffects: ActiveSpellEffect[] = [];
  const clearedEnemyProjectileIds: EntityId[] = [];
  const absorbedEnemyProjectileIds: EntityId[] = [];
  const reflectedProjectiles: ReflectedSpellProjectile[] = [];

  for (const player of players) {
    const runtimeState = spellStateByPlayer.get(player.playerId);
    const frameInput = frameInputs.get(player.playerId);
    if (runtimeState === undefined || frameInput === undefined || !canCast(player)) {
      if (runtimeState !== undefined) {
        nextSpellState.push(runtimeState);
      }
      continue;
    }

    const castSlotIndex = getPressedSpellSlotIndex(frameInput);
    if (castSlotIndex === undefined) {
      nextSpellState.push(runtimeState);
      continue;
    }

    const spellId = runtimeState.spellSlots[castSlotIndex] ?? null;
    if (spellId === null) {
      effectEvents.push(createFailedCastEvent(options.frame, player, "empty_slot"));
      nextSpellState.push(runtimeState);
      continue;
    }

    const spell = options.spellDefinitions[spellId];
    if (spell === undefined) {
      throw new Error(`Missing spell definition: ${spellId}`);
    }

    const readyFrame = runtimeState.cooldowns[spellId] ?? 0;
    if (options.frame < readyFrame) {
      effectEvents.push(createFailedCastEvent(options.frame, player, "cooldown", spellId));
      nextSpellState.push(runtimeState);
      continue;
    }

    if (player.qi < spell.costQi) {
      effectEvents.push(createFailedCastEvent(options.frame, player, "insufficient_qi", spellId));
      nextSpellState.push(runtimeState);
      continue;
    }

    players = players.map((candidate) =>
      candidate.playerId === player.playerId ? { ...candidate, qi: candidate.qi - spell.costQi } : candidate
    );

    const castResult = castSpell({
      frame: options.frame,
      player,
      spell,
      enemies: options.enemies,
      enemyProjectiles: options.enemyProjectiles
    });

    damageEvents.push(...castResult.damageEvents);
    effectEvents.push(...castResult.effectEvents);
    activeEffects.push(...castResult.activeEffects);
    clearedEnemyProjectileIds.push(...castResult.clearedEnemyProjectileIds);
    absorbedEnemyProjectileIds.push(...castResult.absorbedEnemyProjectileIds);
    reflectedProjectiles.push(...castResult.reflectedProjectiles);
    nextSpellState.push({
      ...runtimeState,
      cooldowns: {
        ...runtimeState.cooldowns,
        [spellId]: options.frame + secondsToFrames(spell.cooldown)
      }
    });
  }

  return {
    players,
    spellState: nextSpellState.sort((a, b) => a.playerId.localeCompare(b.playerId)),
    damageEvents,
    effectEvents,
    activeEffects,
    clearedEnemyProjectileIds,
    absorbedEnemyProjectileIds,
    reflectedProjectiles
  };
}

interface CastSpellOptions {
  readonly frame: number;
  readonly player: CombatPlayerState;
  readonly spell: SpellDefinition;
  readonly enemies: readonly EnemyState[];
  readonly enemyProjectiles: readonly SpellEnemyProjectileState[];
}

interface CastSpellResult {
  readonly damageEvents: readonly SpellDamageEvent[];
  readonly effectEvents: readonly EffectEvent[];
  readonly activeEffects: readonly ActiveSpellEffect[];
  readonly clearedEnemyProjectileIds: readonly EntityId[];
  readonly absorbedEnemyProjectileIds: readonly EntityId[];
  readonly reflectedProjectiles: readonly ReflectedSpellProjectile[];
}

function castSpell(options: CastSpellOptions): CastSpellResult {
  switch (options.spell.baseEffect.type) {
    case "chain":
      return castChainSpell(options);
    case "clear_bullets":
      return castBulletClearSpell(options);
    case "aoe":
      return castAoeSpell(options);
    case "absorb_bullets":
      return castAbsorbSpell(options);
    default:
      throw new Error(`Unsupported spell effect type: ${options.spell.baseEffect.type}`);
  }
}

function castChainSpell(options: CastSpellOptions): CastSpellResult {
  const params = options.spell.baseEffect.params;
  const initialDamage = numberParam(params, "initialDamage");
  const chainDamage = numberParam(params, "chainDamage");
  const chainCount = integerParam(params, "chainCount");
  const chainRadius = numberParam(params, "chainRadius");
  const enemies = [...options.enemies].sort((a, b) => a.entityId - b.entityId);
  const hitEnemies: EnemyState[] = [];

  for (const enemy of enemies) {
    if (hitEnemies.length === 0 || isWithinRadius(hitEnemies[hitEnemies.length - 1]?.position ?? options.player.position, enemy.position, chainRadius)) {
      hitEnemies.push(enemy);
      if (hitEnemies.length >= chainCount) {
        break;
      }
    }
  }

  const damageEvents = hitEnemies.map((enemy, index) => ({
    targetKind: "enemy" as const,
    targetEntityId: enemy.entityId,
    sourceKind: "spell" as const,
    sourceSpellId: options.spell.id,
    sourcePlayerId: options.player.playerId,
    amount: index === 0 ? initialDamage : chainDamage
  }));

  const effectEvents = [
    createEffectEvent({
      frame: options.frame,
      ownerPlayerId: options.player.playerId,
      spellId: options.spell.id,
      effectId: "thunder_gather",
      position: options.player.position
    })
  ];
  if (hitEnemies.length > 0) {
    const firstTarget = hitEnemies[0];
    if (firstTarget !== undefined) {
      effectEvents.push(
        createEffectEvent({
          frame: options.frame + 4,
          ownerPlayerId: options.player.playerId,
          spellId: options.spell.id,
          effectId: "thunder_chain_hit",
          position: firstTarget.position,
          targetEntityId: firstTarget.entityId
        })
      );
    }
  }

  return emptyCastResult({ damageEvents, effectEvents });
}

function castBulletClearSpell(options: CastSpellOptions): CastSpellResult {
  const params = options.spell.baseEffect.params;
  const radius = numberParam(params, "radius");
  const durationFrames = secondsToFrames(numberParam(params, "duration"));
  const tickIntervalFrames = secondsToFrames(numberParam(params, "tickInterval"));
  const tickDamage = numberParam(params, "tickDamage");
  const clearTags = stringArrayParam(params, "clearBulletTags");
  const clearedEnemyProjectileIds = getClearableProjectileIds(options.enemyProjectiles, options.player.position, radius, clearTags);

  return emptyCastResult({
    effectEvents: [
      createEffectEvent({
        frame: options.frame,
        ownerPlayerId: options.player.playerId,
        spellId: options.spell.id,
        effectId: "bagua_ring_open",
        position: options.player.position
      })
    ],
    activeEffects: [
      {
        spellId: options.spell.id,
        ownerPlayerId: options.player.playerId,
        kind: "bullet_clear_aura",
        position: options.player.position,
        radius,
        startFrame: options.frame,
        endFrame: options.frame + durationFrames,
        tickIntervalFrames,
        tickDamage
      }
    ],
    clearedEnemyProjectileIds
  });
}

function castAoeSpell(options: CastSpellOptions): CastSpellResult {
  const params = options.spell.baseEffect.params;
  const radius = numberParam(params, "radius");
  const durationFrames = secondsToFrames(numberParam(params, "duration"));
  const areaOffsetY = numberParam(params, "areaOffsetY");
  const burnDps = numberParam(params, "burnDps");
  const position = {
    x: options.player.position.x,
    y: options.player.position.y + areaOffsetY
  };

  return emptyCastResult({
    effectEvents: [
      createEffectEvent({
        frame: options.frame,
        ownerPlayerId: options.player.playerId,
        spellId: options.spell.id,
        effectId: "lotus_area_warning",
        position
      }),
      createEffectEvent({
        frame: options.frame + 12,
        ownerPlayerId: options.player.playerId,
        spellId: options.spell.id,
        effectId: "low_flame_field",
        position
      })
    ],
    activeEffects: [
      {
        spellId: options.spell.id,
        ownerPlayerId: options.player.playerId,
        kind: "damage_field",
        position,
        radius,
        startFrame: options.frame,
        endFrame: options.frame + durationFrames,
        tickIntervalFrames: secondsToFrames(1),
        tickDamage: burnDps
      }
    ]
  });
}

function castAbsorbSpell(options: CastSpellOptions): CastSpellResult {
  const params = options.spell.baseEffect.params;
  const radius = numberParam(params, "absorbRadius");
  const durationFrames = secondsToFrames(numberParam(params, "absorbDuration"));
  const maxAbsorbedBullets = integerParam(params, "maxAbsorbedBullets");
  const reflectProjectileDamage = numberParam(params, "reflectProjectileDamage");
  const absorbTags = stringArrayParam(params, "absorbBulletTags");
  const absorbedEnemyProjectileIds = getClearableProjectileIds(
    options.enemyProjectiles,
    options.player.position,
    radius,
    absorbTags
  ).slice(0, maxAbsorbedBullets);

  const reflectedProjectiles =
    absorbedEnemyProjectileIds.length === 0
      ? []
      : [
          {
            ownerPlayerId: options.player.playerId,
            sourceSpellId: options.spell.id,
            position: options.player.position,
            damage: reflectProjectileDamage,
            spawnFrame: options.frame + durationFrames,
            absorbedProjectileIds: absorbedEnemyProjectileIds
          }
        ];

  return emptyCastResult({
    effectEvents: [
      createEffectEvent({
        frame: options.frame,
        ownerPlayerId: options.player.playerId,
        spellId: options.spell.id,
        effectId: "void_fan_open",
        position: options.player.position
      }),
      createEffectEvent({
        frame: options.frame + 8,
        ownerPlayerId: options.player.playerId,
        spellId: options.spell.id,
        effectId: "bullet_absorb_lines",
        position: options.player.position
      }),
      createEffectEvent({
        frame: options.frame + durationFrames,
        ownerPlayerId: options.player.playerId,
        spellId: options.spell.id,
        effectId: "void_core_compress",
        position: options.player.position
      }),
      createEffectEvent({
        frame: options.frame + durationFrames + secondsToFrames(0.5),
        ownerPlayerId: options.player.playerId,
        spellId: options.spell.id,
        effectId: "sword_qi_reflect",
        position: options.player.position
      })
    ],
    activeEffects: [
      {
        spellId: options.spell.id,
        ownerPlayerId: options.player.playerId,
        kind: "bullet_absorb_window",
        position: options.player.position,
        radius,
        startFrame: options.frame,
        endFrame: options.frame + durationFrames
      }
    ],
    absorbedEnemyProjectileIds,
    reflectedProjectiles
  });
}

function emptyCastResult(overrides: Partial<CastSpellResult>): CastSpellResult {
  return {
    damageEvents: overrides.damageEvents ?? [],
    effectEvents: overrides.effectEvents ?? [],
    activeEffects: overrides.activeEffects ?? [],
    clearedEnemyProjectileIds: overrides.clearedEnemyProjectileIds ?? [],
    absorbedEnemyProjectileIds: overrides.absorbedEnemyProjectileIds ?? [],
    reflectedProjectiles: overrides.reflectedProjectiles ?? []
  };
}

function getClearableProjectileIds(
  projectiles: readonly SpellEnemyProjectileState[],
  center: Vec2,
  radius: number,
  allowedTags: readonly string[]
): EntityId[] {
  return [...projectiles]
    .sort((a, b) => a.entityId - b.entityId)
    .filter((projectile) => {
      const tags = projectile.tags ?? [];
      return (
        projectile.clearable === true &&
        tags.some((tag) => allowedTags.includes(tag)) &&
        isWithinRadius(center, projectile.position, radius)
      );
    })
    .map((projectile) => projectile.entityId);
}

function getPressedSpellSlotIndex(frameInput: FrameInput): number | undefined {
  for (let index = 0; index < SPELL_SLOT_BUTTONS.length; index += 1) {
    const button = SPELL_SLOT_BUTTONS[index];
    if (button !== undefined && hasInputButton(frameInput.pressedMask, button)) {
      return index;
    }
  }
  return undefined;
}

function canCast(player: CombatPlayerState): boolean {
  return player.aliveState === "body" || player.aliveState === "yang_shen";
}

function createFailedCastEvent(
  frame: number,
  player: CombatPlayerState,
  reason: "insufficient_qi" | "cooldown" | "empty_slot",
  spellId = "none"
): EffectEvent {
  return createEffectEvent({
    frame,
    ownerPlayerId: player.playerId,
    spellId,
    effectId: "spell_cast_failed",
    position: player.position,
    reason
  });
}

function validateSpellDefinition(definition: SpellDefinition): void {
  if (definition.id.length === 0) {
    throw new Error("spell id must not be empty");
  }
  if (!Number.isFinite(definition.costQi) || definition.costQi < 0) {
    throw new Error(`spell ${definition.id} costQi must be non-negative`);
  }
  if (!Number.isFinite(definition.cooldown) || definition.cooldown < 0) {
    throw new Error(`spell ${definition.id} cooldown must be non-negative`);
  }
}

function numberParam(params: Readonly<Record<string, unknown>>, key: string): number {
  const value = params[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`spell param ${key} must be a finite number`);
  }
  return value;
}

function integerParam(params: Readonly<Record<string, unknown>>, key: string): number {
  const value = numberParam(params, key);
  if (!Number.isInteger(value)) {
    throw new Error(`spell param ${key} must be an integer`);
  }
  return value;
}

function stringArrayParam(params: Readonly<Record<string, unknown>>, key: string): readonly string[] {
  const value = params[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`spell param ${key} must be a string array`);
  }
  return value;
}

export type {
  ActiveSpellEffect,
  EffectEvent,
  ReflectedSpellProjectile,
  SpellDamageEvent
} from "./SpellEffects";
