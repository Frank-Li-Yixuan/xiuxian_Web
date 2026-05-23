/**
 * xiuxian-stg combat data contract v0.1
 *
 * Core distinction:
 * - Insight EXP / 灵气经验：high-frequency build progression. It triggers time-stop 顿悟 choices.
 * - Cultivation / 修为：realm progression. It triggers bottlenecks and tribulation events.
 *
 * Gameplay code should keep these two systems separate.
 */

export type Id = string;
export type Seconds = number;
export type Scalar = number;

export interface Vec2 {
  x: number;
  y: number;
}

export type ElementId =
  | "metal"
  | "wood"
  | "water"
  | "fire"
  | "earth"
  | "thunder"
  | "void"
  | "soul"
  | "neutral";

export type Rarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary"
  | "mythic";

export interface RuntimeStats {
  /** 精：生命上限、体魄、受击容错 */
  jing: number;
  /** 气根：真元池、真元获取、法术效率 */
  qiRoot: number;
  /** 神：神识、吸附半径、索敌范围、暴击、穿透 */
  shen: number;
  /** 悟性：顿悟选项质量、额外选项、法术升级倾向 */
  comprehension: number;
  /** 气运：掉落、奇遇、公共重Roll、天道庇佑 */
  fortune: number;
  /** 根骨：灵气经验转化效率、修为吐纳效率 */
  constitution: number;
  /** 业力/煞气：高风险高收益，可能提高雷劫压强 */
  karma: number;
}

export type PlayerId = "p1" | "p2";

export type AliveState =
  | "body"
  | "soul"
  | "yang_shen"
  | "reshaping"
  | "dead";

export interface PlayerCombatState {
  playerId: PlayerId;
  aliveState: AliveState;
  position: Vec2;
  velocity: Vec2;
  hitboxRadius: number;
  hp: number;
  maxHp: number;
  qi: number;
  maxQi: number;
  stats: RuntimeStats;
  equipment: PlayerEquipmentState;
  cooldowns: Record<Id, Seconds>;
  digestionSlots: PillRuntimeSlot[];
  buffs: RuntimeBuff[];
  debuffs: RuntimeDebuff[];
  invulnerableTimer: Seconds;
  rescueProgress: number;
}

export interface PlayerEquipmentState {
  /** 1局外带入 */
  natalArtifactOuter: ArtifactInstance;
  /** 1局内获得 */
  natalArtifactInner?: ArtifactInstance;
  /** 2局外带入 */
  spiritTreasuresOuter: SpiritTreasureInstance[];
  /** 2局内获得 */
  spiritTreasuresInner: SpiritTreasureInstance[];
  /** 固定4格，主动按键释放 */
  spellSlots: SpellSlot[];
  /** 固定3格，主动吞服并消化 */
  pillSlots: PillSlot[];
}

export interface ArtifactInstance {
  definitionId: Id;
  source: "outer" | "inner";
  star: number;
  runtimeLevel: number;
  modifiers?: Modifier[];
}

export interface SpiritTreasureInstance {
  definitionId: Id;
  source: "outer" | "inner";
  star: number;
  runtimeLevel: number;
  modifiers?: Modifier[];
}

export interface SpellSlot {
  slotIndex: 0 | 1 | 2 | 3;
  inputKey: "J" | "K" | "L" | "I";
  spellId: Id | null;
  level: number;
  cooldownRemaining: Seconds;
}

export interface PillSlot {
  slotIndex: 0 | 1 | 2;
  inputKey: "1" | "2" | "3";
  pillId: Id | null;
  stack: number;
}

export interface PillRuntimeSlot {
  pillId: Id;
  state: "idle" | "digesting" | "finished";
  remainingTime: Seconds;
  totalTime: Seconds;
  tickTimer: Seconds;
  sourceSlotIndex: number;
}

export interface RuntimeBuff {
  id: Id;
  tags: string[];
  remainingTime: Seconds;
  params: Record<string, unknown>;
}

export interface RuntimeDebuff {
  id: Id;
  tags: string[];
  remainingTime: Seconds;
  params: Record<string, unknown>;
}

/**
 * Team insight EXP is the high-frequency Roguelike build bar.
 * It is fed by 灵气球 and causes time-stop Insight choices.
 */
export interface TeamInsightExpState {
  level: number;
  exp: number;
  expToNext: number;
  sharedFortuneReroll: number;
  pendingInsight?: InsightSession;
}

/**
 * Cultivation state is realm progression.
 * It is fed by time-based 周天吐纳, elixirs, treasures, elite/Boss materials, or specific choices.
 * It must not trigger ordinary Roguelike reward choices.
 */
export interface PlayerCultivationState {
  playerId: PlayerId;
  realmId: Id;
  layer: number;
  cultivation: number;
  cultivationToNext: number;
  bottleneck?: CultivationBottleneckState;
  inTribulation: boolean;
}

export interface CultivationBottleneckState {
  targetRealmId: Id;
  targetLayer: number;
  type: "minor_layer" | "major_realm";
  requiredEventId?: Id;
  triggeredAtRunStageId?: Id;
}

export interface InsightSession {
  id: Id;
  teamLevelBefore: number;
  state: "open" | "resolving" | "closed";
  playerChoices: Record<PlayerId, InsightChoice[]>;
  selected: Partial<Record<PlayerId, InsightChoice>>;
  rerollsUsed: Partial<Record<PlayerId, number>>;
}

export type InsightChoiceType =
  | "spell_new"
  | "spell_upgrade"
  | "technique"
  | "talent"
  | "constitution"
  | "spirit_treasure"
  | "natal_artifact_inner"
  | "pill"
  | "cultivation_boost"
  | "heavenly_material";

export interface InsightChoice {
  choiceId: Id;
  type: InsightChoiceType;
  rarity: Rarity;
  targetId: Id;
  displayName: string;
  description: string;
  weightTrace?: string;
}

export interface Modifier {
  stat: string;
  op: "add" | "mul" | "set";
  value: number;
  tags?: string[];
}

export interface ArtifactDefinition {
  id: Id;
  name: string;
  element: ElementId;
  role: "straight_pierce" | "fan_aoe" | "delayed_slam" | "special";
  rarity: Rarity;
  attack: AttackPatternDefinition;
  starUpgrades: StarUpgrade[];
  tags: string[];
}

export interface AttackPatternDefinition {
  patternId: Id;
  fireInterval: Seconds;
  projectileSpeed?: number;
  damage: number;
  projectileCount?: number;
  spreadAngleDeg?: number;
  pierce?: number;
  radius?: number;
  delay?: Seconds;
  params?: Record<string, unknown>;
}

export interface StarUpgrade {
  star: number;
  name: string;
  description: string;
  modifiers: Modifier[];
  unlocks?: Id[];
}

export interface SpiritTreasureDefinition {
  id: Id;
  name: string;
  role: "offense" | "defense" | "utility" | "coop";
  element: ElementId;
  rarity: Rarity;
  effect: EffectDefinition;
  starUpgrades: StarUpgrade[];
  tags: string[];
}

export interface SpellDefinition {
  id: Id;
  name: string;
  element: ElementId;
  school: "thunder" | "sword" | "fire" | "defense" | "void" | "soul" | "water" | "wood";
  targeting: "self_center" | "front_fixed" | "nearest_enemy" | "screen_center" | "forward_area";
  costQi: number;
  cooldown: Seconds;
  maxLevel: number;
  baseEffect: EffectDefinition;
  levelUpgrades: LevelUpgrade[];
  tags: string[];
}

export interface PillDefinition {
  id: Id;
  name: string;
  rarity: Rarity;
  digestTime: Seconds;
  maxStack: number;
  effects: EffectDefinition[];
  afterEffects?: EffectDefinition[];
  tags: string[];
}

export interface EffectDefinition {
  effectId: Id;
  type:
    | "projectile"
    | "aoe"
    | "chain"
    | "absorb_bullets"
    | "clear_bullets"
    | "heal_over_time"
    | "buff"
    | "cleanse"
    | "summon_orbit"
    | "pickup_radius"
    | "coop_link"
    | "cultivation_gain"
    | "insight_exp_gain"
    | "tribulation";
  params: Record<string, unknown>;
}

export interface LevelUpgrade {
  level: number;
  name: string;
  description: string;
  modifiers: Modifier[];
}

export interface EnemyDefinition {
  id: Id;
  name: string;
  element: ElementId;
  hp: number;
  speed: number;
  contactDamage: number;
  behaviorId: Id;
  behaviorParams: Record<string, unknown>;
  bulletPatternId?: Id;
  drops: Id;
  tags: string[];
}

export interface BossDefinition {
  id: Id;
  name: string;
  element: ElementId;
  hp: number;
  entry: {
    fromY: number;
    toY: number;
    duration: Seconds;
  };
  phases: BossPhaseDefinition[];
  drops: Id;
  rewards: Id[];
  tags: string[];
}

export interface BossPhaseDefinition {
  id: Id;
  hpThreshold: number;
  timeline: BossAttackEvent[];
}

export interface BossAttackEvent {
  at: Seconds;
  patternId: Id;
  repeat?: {
    count: number;
    interval: Seconds;
  };
  params?: Record<string, unknown>;
}

export interface StageDefinition {
  id: Id;
  name: string;
  actIndex: number;
  scrollSpeed: number;
  backgroundTheme: string;
  segments: StageSegmentDefinition[];
  bossId: Id;
  stageRules: StageRuleDefinition;
}

export interface StageRuleDefinition {
  allowInsightPause: boolean;
  allowDynamicTribulation: boolean;
  maxInsightPausesPerSegment: number;
  cultivationBreathRateMultiplier: number;
  rescueRuleId: Id;
}

export interface StageSegmentDefinition {
  id: Id;
  name: string;
  duration: Seconds;
  waves: WaveDefinition[];
  endEvent:
    | { type: "insight"; rewardPoolId: Id }
    | { type: "elite"; enemyId: Id; rewardPoolId?: Id }
    | { type: "reward_choice"; rewardPoolId: Id }
    | { type: "none" };
}

export interface WaveDefinition {
  startTime: Seconds;
  endTime: Seconds;
  spawnGroups: SpawnGroupDefinition[];
  intensity: number;
}

export interface SpawnGroupDefinition {
  enemyId: Id;
  pattern:
    | "line"
    | "side_stream"
    | "random_top"
    | "paired_sides"
    | "elite_center"
    | "fixed_points";
  count: number;
  interval: Seconds;
  xRange?: [number, number];
  fixedX?: number[];
  y?: number;
  targetRule?: "nearest_player" | "p1" | "p2" | "center";
}

export interface DropTableDefinition {
  id: Id;
  entries: DropEntry[];
}

export interface DropEntry {
  dropId: Id;
  type:
    | "insight_exp_orb"
    | "qi_orb"
    | "cultivation_material"
    | "heavenly_material"
    | "outer_material"
    | "pill"
    | "instant_talisman"
    | "reward_token";
  amount: number;
  chance: number;
  params?: Record<string, unknown>;
}

export interface RewardPoolDefinition {
  id: Id;
  name: string;
  entries: RewardPoolEntry[];
  rules: RewardPoolRules;
}

export interface RewardPoolEntry {
  type: InsightChoiceType;
  targetId: Id;
  weight: number;
  rarity: Rarity;
  conditions?: string[];
}

export interface RewardPoolRules {
  choicesPerPlayer: number;
  allowDuplicateAcrossPlayers: boolean;
  allowCultivationBoost: boolean;
  allowMajorRealmBreakthroughChoice: boolean;
}

export interface RealmDefinition {
  id: Id;
  name: string;
  order: number;
  layers: number;
  baseStatMultiplier: number;
  qiPoolMultiplier: number;
  shenMultiplier: number;
  unlocks: string[];
  breakthrough: {
    type: "none" | "minor_layer" | "major_realm";
    nextRealmId?: Id;
    tribulationEventId?: Id;
    outOfRunTribulationStageId?: Id;
  };
}

export interface DynamicTribulationEventDefinition {
  id: Id;
  name: string;
  trigger: {
    type: "cultivation_full";
    realmFrom: Id;
    realmTo: Id;
  };
  duration: Seconds;
  overlay: {
    skyDarken: number;
    edgeVignette: number;
    bgmMood: "heavy" | "violent" | "silent";
    warningText: string;
  };
  mechanics: TribulationMechanicDefinition[];
  success: EffectDefinition[];
  failure?: EffectDefinition[];
}

export interface TribulationMechanicDefinition {
  at: Seconds;
  patternId: Id;
  repeat?: {
    count: number;
    interval: Seconds;
  };
  params: Record<string, unknown>;
}

export interface RunConfig {
  runId: Id;
  seed: number;
  difficulty: "normal" | "hard" | "tribulation";
  stageId: Id;
  players: Record<PlayerId, PlayerLoadout>;
}

export interface PlayerLoadout {
  selectedMainMethodId?: Id;
  natalArtifactId: Id;
  spiritTreasureIds: Id[];
  spellIds: Array<Id | null>;
  pillIds: Array<Id | null>;
  baseStats: RuntimeStats;
  startingRealmId: Id;
  startingLayer: number;
}
