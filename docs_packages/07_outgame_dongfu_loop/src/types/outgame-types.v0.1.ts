/**
 * 局外洞府最小闭环 v0.1 TypeScript 数据契约草案
 * 目标：支撑结算、资源钱包、聚灵阵、藏经阁、炼丹房、炼器阁、劫雷台和 Loadout。
 */

export type Id = string;
export type ResourceId = Id;
export type BuildingId = Id;
export type MethodId = Id;
export type SpellId = Id;
export type ArtifactId = Id;
export type TreasureId = Id;
export type PillId = Id;
export type RealmId = 'qi_refining' | 'foundation' | 'golden_core' | string;

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ElementId = 'metal' | 'wood' | 'water' | 'fire' | 'earth' | 'thunder' | 'void' | string;
export type ResourceMap = Record<ResourceId, number>;

export interface OutgameProfileState {
  saveVersion: string;
  profileId: string;
  createdAtMs?: number;
  updatedAtMs?: number;

  realm: RealmProgressState;
  wallet: ResourceWallet;
  buildings: Record<BuildingId, BuildingState>;

  methods: Record<MethodId, MethodProgressState>;
  spells: Record<SpellId, SpellMasteryState>;
  artifacts: Record<ArtifactId, EquipmentProgressState>;
  treasures: Record<TreasureId, EquipmentProgressState>;
  pills: Record<PillId, number>;

  alchemy: AlchemyState;
  idle: IdleState;
  activeTraining: MethodTrainingAllocation[];

  activeLoadoutId: string;
  loadouts: LoadoutPresetState[];

  appliedReceiptIds: string[];
  flags: OutgameFlags;
}

export interface RealmProgressState {
  realmId: RealmId;
  layer: number;
  cultivation: number;
  cultivationToNext: number;
  atBottleneck: boolean;
  bottleneckTrialId?: Id;
  injuryDebuffs?: OutgameDebuffState[];
}

export interface ResourceWallet {
  [resourceId: ResourceId]: number;
}

export interface BuildingState {
  level: number;
  unlocked?: boolean;
}

export interface MethodProgressState {
  unlocked: boolean;
  level: number;
  trainingProgress: number;
  equippedAsMain?: boolean;
}

export interface SpellMasteryState {
  unlocked: boolean;
  masteryLevel: number;
}

export interface EquipmentProgressState {
  unlocked: boolean;
  star: number;
}

export interface AlchemyState {
  toxin: {
    body: number;
    qi: number;
    shen: number;
  };
  permanentPillProgress: {
    jing: number;
    qiRoot: number;
    shen: number;
  };
}

export interface IdleState {
  lastClaimAtMs: number;
  pendingEventIds: Id[];
}

export interface OutgameDebuffState {
  id: Id;
  remainingRuns?: number;
  expiresAtMs?: number;
  effects: Record<string, number | boolean | string>;
}

export interface OutgameFlags {
  firstStageCleared?: boolean;
  foundationTrialUnlocked?: boolean;
  [flag: string]: boolean | undefined;
}

export interface MethodTrainingAllocation {
  methodId: MethodId;
  allocationWeight: number;
}

export interface LoadoutPresetState {
  id: string;
  name: string;
  mainMethodId: MethodId | null;
  natalArtifactId: ArtifactId | null;
  spiritTreasureIds: Array<TreasureId | null>; // length <= 2
  spellIds: Array<SpellId | null>;             // length 4
  pillIds: Array<PillId | null>;               // length 3
}

export interface RunSettlementReceipt {
  receiptId: string;
  runId: string;
  profileId: string;
  mode: 'single_player' | 'local_coop_shared_profile' | 'online_coop_personal_profile';
  stageId: string;
  difficulty: 'normal' | 'hard' | 'tribulation' | string;
  reachedSegment: string;
  bossKilled?: string;
  baseRewards: ResourceMap;
  bonusRewards?: ResourceMap;
  firstClearBonus?: ResourceMap;
  cultivationRewards?: number;
  appliedAtMs: number | null;
}

export interface IdleClaimRequest {
  profileId: string;
  nowMs: number;
}

export interface IdleClaimResult {
  elapsedMinutes: number;
  cappedMinutes: number;
  rewards: ResourceMap;
  cultivationGain: number;
  eventIds: Id[];
  newLastClaimAtMs: number;
}

export interface ResourceDefinition {
  id: ResourceId;
  name: string;
  category: string;
  rarity: Rarity;
  description: string;
}

export interface BuildingDefinition {
  id: BuildingId;
  name: string;
  role: string;
  maxLevelV01: number;
  levels: BuildingLevelDefinition[];
}

export interface BuildingLevelDefinition {
  level: number;
  cost?: ResourceMap;
  effects: Record<string, unknown>;
}

export interface CultivationMethodDefinition {
  id: MethodId;
  name: string;
  type: 'main_method' | 'minor_method' | 'forbidden_method';
  element: ElementId;
  tags: string[];
  unlockCost?: ResourceMap;
  levels: MethodLevelDefinition[];
}

export interface MethodLevelDefinition {
  level: number;
  trainingRequired: number;
  cost?: ResourceMap;
  effects: Record<string, number | boolean | string>;
}

export interface SpellCompendiumDefinition {
  id: SpellId;
  name: string;
  element: ElementId;
  unlockCost?: ResourceMap;
  masteryLevels: SpellMasteryLevelDefinition[];
}

export interface SpellMasteryLevelDefinition {
  level: number;
  cost?: ResourceMap;
  effects: Record<string, number | boolean | string>;
}

export interface AlchemyRecipeDefinition {
  id: Id;
  name: string;
  category: 'combat_pill' | 'permanent_pill' | 'cultivation_pill' | 'breakthrough_pill' | 'detox';
  requiresBuildingLevel?: Record<BuildingId, number>;
  cost: ResourceMap;
  output?: ResourceMap;
  outputPermanentEffect?: PermanentPillEffect;
  toxinReduction?: number;
  notes?: string;
}

export interface PermanentPillEffect {
  jingProgress?: number;
  qiRootProgress?: number;
  shenProgress?: number;
  toxin: {
    body?: number;
    qi?: number;
    shen?: number;
  };
}

export interface EquipmentUpgradeDefinition {
  id: ArtifactId | TreasureId;
  name: string;
  unlockDefault?: boolean;
  unlockCost?: ResourceMap;
  stars: StarUpgradeDefinition[];
}

export interface StarUpgradeDefinition {
  star: number;
  cost?: ResourceMap;
  effects: Record<string, number | boolean | string>;
}

export interface BreakthroughTrialDefinition {
  id: Id;
  name: string;
  fromRealm: RealmId;
  fromLayer: number;
  toRealm: RealmId;
  toLayer: number;
  entryRequirements: BreakthroughEntryRequirements;
  rules: Record<string, boolean | number | string>;
  phases: BreakthroughTrialPhase[];
  onSuccess: BreakthroughSuccessOutcome;
  onFailure: BreakthroughFailureOutcome;
}

export interface BreakthroughEntryRequirements {
  cultivationAtBottleneck: boolean;
  resources: ResourceMap;
  loadout?: {
    requiresNatalArtifact?: boolean;
    minTreasureCount?: number;
  };
}

export interface BreakthroughTrialPhase {
  id: Id;
  name: string;
  durationFrames: number;
  patterns: string[];
  testFocus: string;
  enabledInV01?: boolean;
}

export interface BreakthroughSuccessOutcome {
  realmChange: {
    realmId: RealmId;
    layer: number;
  };
  statMultipliers: Record<string, number>;
  unlocks: string[];
}

export interface BreakthroughFailureOutcome {
  consumeOnEntry: boolean;
  refund?: ResourceMap;
  cultivationStaysAtBottleneck: boolean;
  injuryDebuff?: OutgameDebuffState;
}

export interface OutgameRecommendedAction {
  id: Id;
  priority: number;
  module: 'tribulation' | 'forge' | 'alchemy' | 'idle' | 'scripture' | 'loadout' | 'detox';
  title: string;
  description: string;
  targetId?: Id;
}

export interface DongfuDashboardViewState {
  profileId: string;
  realm: RealmProgressState;
  walletSummary: ResourceMap;
  idlePreview: IdleClaimResult;
  recommendedActions: OutgameRecommendedAction[];
  activeLoadout: LoadoutPresetState;
  redDots: Record<string, boolean>;
}
