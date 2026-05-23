export type Id = string;

export interface CoreBalanceConfig {
  version: string;
  notes: string[];
  playerBase: PlayerBaseBalance;
  formulas: Record<string, string>;
  artifacts: ArtifactBalanceSection;
  spells: Record<Id, SpellBalance>;
  pills: Record<Id, PillBalance>;
  enemies: Record<Id, EnemyBalance>;
  bosses: Record<Id, BossBalance>;
  insightExp: InsightExpBalance;
  cultivation: CultivationBalance;
  tribulation: TribulationBalanceSection;
  coopScaling: CoopScaling;
  difficultyScaling: Record<string, DifficultyScaling>;
}

export interface PlayerBaseBalance {
  jing: number;
  qiRoot: number;
  shen: number;
  comprehension: number;
  fortune: number;
  constitution: number;
  karma: number;
  maxHp: number;
  maxQi: number;
  moveSpeed: number;
  hitboxRadius: number;
  pickupRadius: number;
  critChance: number;
  critDamage: number;
  armorPierce: number;
  passiveQiRegenPerSecond: number;
  cultivationRegenPerSecond: number;
}

export interface ArtifactBalanceSection {
  outer: Record<Id, Record<string, number | number[]>>;
  innerArtifactPower: Record<string, number>;
}

export interface SpellBalance {
  costQi: number;
  cooldown: number;
  [key: string]: number | boolean | string | string[];
}

export interface PillBalance {
  digestTime: number;
  [key: string]: number | boolean | string[];
}

export interface EnemyBalance {
  hp: number;
  speed: number;
  contactDamage: number;
  targetTtkSeconds?: [number, number];
  [key: string]: number | [number, number] | undefined;
}

export interface BossBalance {
  singlePlayerNormalHp: number;
  twoPlayerNormalHp: number;
  targetDurationSeconds: [number, number];
  phaseHpBreakpoints: number[];
}

export interface InsightExpBalance {
  thresholds: number[];
  maxInsightPausesPerSegment: number;
  stage01Budget: Record<string, number>;
}

export interface CultivationBalance {
  qiRefiningLayerThresholds: number[];
  minorBreakthrough: Record<string, number>;
  stage01Budget: Record<string, number>;
}

export interface TribulationBalanceSection {
  inRunQiToFoundation: InRunTribulationBalance;
}

export interface InRunTribulationBalance {
  duration: number;
  initialWarning: number;
  strikeWarning: number;
  strikeRadius: number;
  strikeDamage: number;
  clearable: boolean;
  bossOverlapDensityMultiplier: number;
  successReward: Record<string, number | boolean>;
}

export interface CoopScaling {
  normalEnemyHp: number;
  eliteHp: number;
  bossHp: number;
  enemyBulletCount: number;
  enemyBulletSpeed: number;
  spawnCount: number;
  insightExpTotal: number;
  materialDropTotal: number;
}

export interface DifficultyScaling {
  enemyHp: number;
  enemyDamage: number;
  bulletSpeed: number;
  bulletCount: number;
  bossHp: number;
  materials: number;
  tribulationFrequency: number;
}
