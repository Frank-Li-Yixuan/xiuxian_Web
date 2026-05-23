import { assertNonNegativeInteger, secondsToFrames } from "../SimConstants";
import type { EntityId } from "../entity/EntityManager";
import { BossTimelineRunner, type BossPhaseDefinition, type BossTimelineEvent } from "./BossTimelineRunner";

export type BossEncounterStatus = "entering" | "active" | "defeated";
export type BossProjectileOwnerKind = "boss" | "tribulation" | "summon";
export type BossSettlementDropType =
  | "insight_exp_orb"
  | "qi_orb"
  | "outer_material"
  | "cultivation_material"
  | "heavenly_material"
  | "reward_token";

export interface BossDefinition {
  readonly id: string;
  readonly name: string;
  readonly element: string;
  readonly hp: number;
  readonly entry: {
    readonly fromY: number;
    readonly toY: number;
    readonly duration: number;
  };
  readonly phases: readonly BossPhaseDefinition[];
  readonly drops: string;
  readonly rewards: readonly string[];
  readonly tags?: readonly string[];
}

export interface BossCombatState {
  readonly entityId: EntityId;
  readonly bossId: string;
  readonly hp: number;
  readonly maxHp: number;
  readonly phaseIndex: number;
  readonly phaseId: string;
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
  readonly spawnFrame: number;
  readonly entryEndFrame: number;
  readonly phaseStartFrame: number;
  readonly status: BossEncounterStatus;
  readonly defeatedFrame?: number;
}

export interface CreateBossStateOptions {
  readonly definition: BossDefinition;
  readonly entityId: EntityId;
  readonly spawnFrame: number;
  readonly x: number;
  readonly hpScale?: number;
}

export interface BossAttackEvent {
  readonly frame: number;
  readonly bossId: string;
  readonly phaseId: string;
  readonly patternId: string;
  readonly repeatIndex: number;
  readonly params: Readonly<Record<string, unknown>>;
  readonly projectileOwnerKind: BossProjectileOwnerKind;
  readonly projectileCount: number;
  readonly warningFrames?: number;
  readonly summonEnemyId?: string;
}

export interface BossEffectEvent {
  readonly frame: number;
  readonly effectId: "boss_phase_shift" | "boss_death_cascade";
  readonly bossId: string;
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
  readonly phaseId: string;
}

export interface BossPhaseTransition {
  readonly frame: number;
  readonly fromPhaseId: string;
  readonly toPhaseId: string;
}

export interface BossSystemDropTablePack {
  readonly items: readonly BossDropTableDefinition[];
}

export interface BossDropTableDefinition {
  readonly id: string;
  readonly entries: readonly BossDropTableEntry[];
}

export interface BossDropTableEntry {
  readonly dropId: string;
  readonly type: BossSettlementDropType;
  readonly amount: number;
  readonly chance: number;
  readonly params?: Readonly<Record<string, unknown>>;
}

export interface BossSettlementMaterial {
  readonly pickupId: string;
  readonly type: BossSettlementDropType;
  readonly amount: number;
  readonly params?: Readonly<Record<string, unknown>>;
}

export interface BossDeathRewards {
  readonly bossId: string;
  readonly dropTableId: string;
  readonly rewardPoolIds: readonly string[];
  readonly settlementMaterials: readonly BossSettlementMaterial[];
}

export interface BossDropRng {
  nextFloat01(): number;
}

export interface StepBossFrameOptions {
  readonly definition: BossDefinition;
  readonly boss: BossCombatState;
  readonly frame: number;
  readonly incomingDamage?: number;
  readonly dropTables?: readonly BossDropTableDefinition[];
  readonly dropRolls?: Readonly<Record<string, readonly number[]>>;
  readonly dropRng?: BossDropRng;
}

export interface BossFrameResult {
  readonly boss: BossCombatState;
  readonly attackEvents: readonly BossAttackEvent[];
  readonly effectEvents: readonly BossEffectEvent[];
  readonly phaseTransitions: readonly BossPhaseTransition[];
  readonly deathRewards?: BossDeathRewards;
}

export function createBossState(options: CreateBossStateOptions): BossCombatState {
  validateBossDefinition(options.definition);
  assertNonNegativeInteger(options.entityId, "entityId");
  if (options.entityId < 1) {
    throw new Error("entityId must be positive");
  }
  assertNonNegativeInteger(options.spawnFrame, "spawnFrame");
  if (!Number.isFinite(options.x)) {
    throw new Error("boss x must be finite");
  }

  const firstPhase = requirePhase(options.definition, 0);
  const maxHp = Math.round(options.definition.hp * (options.hpScale ?? 1));
  if (maxHp <= 0) {
    throw new Error("boss maxHp must be positive");
  }
  const entryEndFrame = options.spawnFrame + secondsToFrames(options.definition.entry.duration);

  return freezeBoss({
    entityId: options.entityId,
    bossId: options.definition.id,
    hp: maxHp,
    maxHp,
    phaseIndex: 0,
    phaseId: firstPhase.id,
    position: {
      x: options.x,
      y: options.definition.entry.fromY
    },
    spawnFrame: options.spawnFrame,
    entryEndFrame,
    phaseStartFrame: entryEndFrame,
    status: "entering"
  });
}

export function stepBossFrame(options: StepBossFrameOptions): BossFrameResult {
  validateBossDefinition(options.definition);
  assertNonNegativeInteger(options.frame, "frame");
  if (options.boss.status === "defeated") {
    return freezeResult({
      boss: options.boss,
      attackEvents: [],
      effectEvents: [],
      phaseTransitions: []
    });
  }

  const incomingDamage = options.incomingDamage ?? 0;
  if (!Number.isFinite(incomingDamage) || incomingDamage < 0) {
    throw new Error("incomingDamage must be a non-negative finite number");
  }

  const nextHp = Math.max(0, round3(options.boss.hp - incomingDamage));
  const position = resolveEntryPosition(options.definition, options.boss, options.frame);

  if (nextHp <= 0) {
    const defeatedBoss = freezeBoss({
      ...options.boss,
      hp: 0,
      position,
      status: "defeated",
      defeatedFrame: options.frame
    });
    const deathEffect = createEffectEvent(options.frame, "boss_death_cascade", defeatedBoss);

    return freezeResult({
      boss: defeatedBoss,
      attackEvents: [],
      effectEvents: [deathEffect],
      phaseTransitions: [],
      deathRewards: materializeDeathRewards(options.definition, options)
    });
  }

  const status: BossEncounterStatus = options.frame < options.boss.entryEndFrame ? "entering" : "active";
  const nextPhaseIndex = resolvePhaseIndex(options.definition, nextHp, options.boss.maxHp);
  const currentPhase = requirePhase(options.definition, options.boss.phaseIndex);
  const nextPhase = requirePhase(options.definition, nextPhaseIndex);
  const phaseChanged = nextPhaseIndex !== options.boss.phaseIndex;
  const phaseStartFrame = phaseChanged ? options.frame : options.boss.phaseStartFrame;
  const boss = freezeBoss({
    ...options.boss,
    hp: nextHp,
    phaseIndex: nextPhaseIndex,
    phaseId: nextPhase.id,
    position,
    phaseStartFrame,
    status
  });
  const phaseTransitions = phaseChanged
    ? [
        freezeTransition({
          frame: options.frame,
          fromPhaseId: currentPhase.id,
          toPhaseId: nextPhase.id
        })
      ]
    : [];
  const phaseEffects = phaseChanged ? [createEffectEvent(options.frame, "boss_phase_shift", boss)] : [];
  const attackEvents = status === "active" ? createAttackEvents(options.definition, boss, options.frame) : [];

  return freezeResult({
    boss,
    attackEvents,
    effectEvents: phaseEffects,
    phaseTransitions
  });
}

function createAttackEvents(definition: BossDefinition, boss: BossCombatState, frame: number): readonly BossAttackEvent[] {
  const phase = requirePhase(definition, boss.phaseIndex);
  const timeline = new BossTimelineRunner(phase);

  return Object.freeze(
    timeline.getEventsForFrame(frame, boss.phaseStartFrame).map((event) => freezeAttackEvent(timelineEventToAttack(definition, boss, event)))
  );
}

function timelineEventToAttack(definition: BossDefinition, boss: BossCombatState, event: BossTimelineEvent): BossAttackEvent {
  const pattern = resolvePattern(event);
  return {
    frame: event.frame,
    bossId: definition.id,
    phaseId: boss.phaseId,
    patternId: event.patternId,
    repeatIndex: event.repeatIndex,
    params: event.params,
    projectileOwnerKind: pattern.ownerKind,
    projectileCount: pattern.projectileCount,
    ...(pattern.warningFrames !== undefined ? { warningFrames: pattern.warningFrames } : {}),
    ...(pattern.summonEnemyId !== undefined ? { summonEnemyId: pattern.summonEnemyId } : {})
  };
}

function resolvePattern(event: BossTimelineEvent): {
  readonly ownerKind: BossProjectileOwnerKind;
  readonly projectileCount: number;
  readonly warningFrames?: number;
  readonly summonEnemyId?: string;
} {
  switch (event.patternId) {
    case "boss_five_way_slow_orbs":
      return { ownerKind: "boss", projectileCount: 5 };
    case "boss_targeted_triple_thunder":
      return withWarningFrames({ ownerKind: "boss", projectileCount: 3 }, warningFrames(event.params));
    case "summon_stage01_imps":
      return { ownerKind: "summon", projectileCount: getNumberParam(event.params, "count", 0), summonEnemyId: "enemy_mountain_imp" };
    case "tribulation_warning_columns":
      return withWarningFrames(
        { ownerKind: "tribulation", projectileCount: getNumberParam(event.params, "columns", 1) },
        warningFrames(event.params)
      );
    case "summon_side_wolves":
      return {
        ownerKind: "summon",
        projectileCount: getNumberParam(event.params, "countPerSide", 1) * 2,
        summonEnemyId: "enemy_wolf_demon"
      };
    case "boss_ring_bullets":
      return { ownerKind: "boss", projectileCount: getNumberParam(event.params, "bulletCount", 1) };
    case "boss_fast_tracking_thunder":
      return { ownerKind: "boss", projectileCount: 2 };
    case "summon_stone_armor":
      return { ownerKind: "summon", projectileCount: getNumberParam(event.params, "count", 1), summonEnemyId: "enemy_stone_armor_demon" };
    case "boss_major_thunder_punishment":
      return withWarningFrames(
        { ownerKind: "tribulation", projectileCount: getNumberParam(event.params, "columns", 1) },
        warningFrames(event.params)
      );
    default:
      return { ownerKind: "boss", projectileCount: 1 };
  }
}

function withWarningFrames(
  pattern: {
    readonly ownerKind: BossProjectileOwnerKind;
    readonly projectileCount: number;
    readonly summonEnemyId?: string;
  },
  frames: number | undefined
): {
  readonly ownerKind: BossProjectileOwnerKind;
  readonly projectileCount: number;
  readonly warningFrames?: number;
  readonly summonEnemyId?: string;
} {
  return frames === undefined ? pattern : { ...pattern, warningFrames: frames };
}

function warningFrames(params: Readonly<Record<string, unknown>>): number | undefined {
  const warningTime = params.warningTime;
  return typeof warningTime === "number" && Number.isFinite(warningTime) ? secondsToFrames(warningTime) : undefined;
}

function materializeDeathRewards(definition: BossDefinition, options: StepBossFrameOptions): BossDeathRewards {
  const table = (options.dropTables ?? []).find((candidate) => candidate.id === definition.drops);
  const settlementMaterials = table === undefined ? [] : materializeSettlementMaterials(table, options);

  return deepFreeze({
    bossId: definition.id,
    dropTableId: definition.drops,
    rewardPoolIds: [...definition.rewards],
    settlementMaterials
  });
}

function materializeSettlementMaterials(table: BossDropTableDefinition, options: StepBossFrameOptions): readonly BossSettlementMaterial[] {
  const materials: BossSettlementMaterial[] = [];
  for (let entryIndex = 0; entryIndex < table.entries.length; entryIndex += 1) {
    const entry = table.entries[entryIndex];
    if (entry === undefined || !isSettlementMaterial(entry.type) || !passesDropChance(table.id, entryIndex, entry.chance, options)) {
      continue;
    }
    materials.push(
      entry.params === undefined
        ? { pickupId: entry.dropId, type: entry.type, amount: entry.amount }
        : { pickupId: entry.dropId, type: entry.type, amount: entry.amount, params: entry.params }
    );
  }
  return Object.freeze(materials);
}

function isSettlementMaterial(type: BossSettlementDropType): boolean {
  return type === "outer_material" || type === "cultivation_material" || type === "heavenly_material";
}

function passesDropChance(tableId: string, entryIndex: number, chance: number, options: StepBossFrameOptions): boolean {
  if (chance >= 1) {
    return true;
  }
  if (chance <= 0) {
    return false;
  }
  const roll = options.dropRolls?.[tableId]?.[entryIndex] ?? options.dropRng?.nextFloat01();
  return roll !== undefined && roll < chance;
}

function resolveEntryPosition(definition: BossDefinition, boss: BossCombatState, frame: number): BossCombatState["position"] {
  if (frame <= boss.spawnFrame) {
    return { x: boss.position.x, y: definition.entry.fromY };
  }
  if (frame >= boss.entryEndFrame) {
    return { x: boss.position.x, y: definition.entry.toY };
  }
  const entryFrames = Math.max(1, boss.entryEndFrame - boss.spawnFrame);
  const progress01 = (frame - boss.spawnFrame) / entryFrames;
  return {
    x: boss.position.x,
    y: round3(definition.entry.fromY + (definition.entry.toY - definition.entry.fromY) * progress01)
  };
}

function resolvePhaseIndex(definition: BossDefinition, hp: number, maxHp: number): number {
  const hpRatio = maxHp <= 0 ? 0 : hp / maxHp;
  for (let index = 0; index < definition.phases.length - 1; index += 1) {
    const phase = requirePhase(definition, index);
    if (hpRatio > phase.hpThreshold) {
      return index;
    }
  }
  return definition.phases.length - 1;
}

function requirePhase(definition: BossDefinition, phaseIndex: number): BossPhaseDefinition {
  const phase = definition.phases[phaseIndex];
  if (phase === undefined) {
    throw new Error(`Missing boss ${definition.id} phase index ${phaseIndex}`);
  }
  return phase;
}

function createEffectEvent(frame: number, effectId: BossEffectEvent["effectId"], boss: BossCombatState): BossEffectEvent {
  return Object.freeze({
    frame,
    effectId,
    bossId: boss.bossId,
    position: boss.position,
    phaseId: boss.phaseId
  });
}

function validateBossDefinition(definition: BossDefinition): void {
  if (definition.id.length === 0) {
    throw new Error("boss id must not be empty");
  }
  if (!Number.isFinite(definition.hp) || definition.hp <= 0) {
    throw new Error(`boss ${definition.id} hp must be positive`);
  }
  if (definition.phases.length !== 3) {
    throw new Error(`boss ${definition.id} must define exactly three phases for v0.1`);
  }
}

function getNumberParam(params: Readonly<Record<string, unknown>>, key: string, fallback: number): number {
  const value = params[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function freezeBoss(boss: BossCombatState): BossCombatState {
  return deepFreeze(boss);
}

function freezeAttackEvent(event: BossAttackEvent): BossAttackEvent {
  return deepFreeze(event);
}

function freezeTransition(transition: BossPhaseTransition): BossPhaseTransition {
  return Object.freeze(transition);
}

function freezeResult(result: BossFrameResult): BossFrameResult {
  return deepFreeze(result);
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
