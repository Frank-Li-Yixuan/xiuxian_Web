export type SettlementMode = "single_player" | "local_coop_shared_profile" | "online_coop_personal_profile";
export type RunSettlementOutcome = "boss_victory" | "team_wipe";
export type ResourceMap = Readonly<Record<string, number>>;

export interface SettlementRewardConfig {
  readonly schemaVersion: string;
  readonly stageId: string;
  readonly rules: {
    readonly baseResourcesKept: "100_percent" | string;
    readonly difficultyMultipliers: Readonly<Record<string, SettlementDifficultyMultiplier>>;
    readonly onlineCoopBaseRewardsDuplicatedPerPlayer: boolean;
    readonly rareRewardsRolledPerPlayer: boolean;
  };
  readonly progressRewardBands: readonly SettlementRewardBand[];
}

export interface SettlementDifficultyMultiplier {
  readonly base: number;
  readonly rare: number;
}

export interface SettlementRewardBand {
  readonly id: string;
  readonly label: string;
  readonly stageProgressMin?: string;
  readonly stageProgressMax?: string;
  readonly requiresBossKill?: string;
  readonly rewards: Readonly<Record<string, readonly number[]>>;
  readonly firstClearBonus?: ResourceMap;
}

export interface SettlementMaterial {
  readonly pickupId: string;
  readonly type: string;
  readonly amount: number;
  readonly params?: Readonly<Record<string, unknown>>;
}

export interface RunSettlementReceipt {
  readonly receiptId: string;
  readonly runId: string;
  readonly profileId: string;
  readonly mode: SettlementMode;
  readonly stageId: string;
  readonly difficulty: string;
  readonly reachedSegment: string;
  readonly bossKilled?: string;
  readonly baseRewards: ResourceMap;
  readonly bonusRewards?: ResourceMap;
  readonly firstClearBonus?: ResourceMap;
  readonly cultivationRewards?: number;
  readonly appliedAtMs: null;
}

export interface CreateRunSettlementReceiptOptions {
  readonly runId: string;
  readonly profileId: string;
  readonly mode: SettlementMode;
  readonly stageId: string;
  readonly difficulty: string;
  readonly reachedSegment: string;
  readonly outcome: RunSettlementOutcome;
  readonly rewardConfig: SettlementRewardConfig;
  readonly firstClear: boolean;
  readonly bossKilled?: string;
  readonly collectedBaseRewards?: ResourceMap;
  readonly bossSettlementMaterials?: readonly SettlementMaterial[];
}

export function createRunSettlementReceipt(options: CreateRunSettlementReceiptOptions): RunSettlementReceipt {
  validateOptions(options);
  const band = selectRewardBand(options);
  const baseMultiplier = options.rewardConfig.rules.difficultyMultipliers[options.difficulty]?.base ?? 1;
  const baseRewards = mergeResources(
    options.collectedBaseRewards ?? {},
    materializeBandRewards(band.rewards, baseMultiplier)
  );
  const bonusRewards = materializeBossBonusRewards(options.bossSettlementMaterials ?? []);
  const cultivationRewards = materializeCultivationRewards(options.bossSettlementMaterials ?? []);
  const firstClearBonus = options.firstClear && band.firstClearBonus !== undefined ? copyResourceMap(band.firstClearBonus) : undefined;

  return deepFreeze({
    receiptId: `receipt_${options.runId}_${options.stageId}_${options.outcome}`,
    runId: options.runId,
    profileId: options.profileId,
    mode: options.mode,
    stageId: options.stageId,
    difficulty: options.difficulty,
    reachedSegment: options.reachedSegment,
    ...(options.outcome === "boss_victory" && options.bossKilled !== undefined ? { bossKilled: options.bossKilled } : {}),
    baseRewards,
    ...(hasResources(bonusRewards) ? { bonusRewards } : {}),
    ...(firstClearBonus === undefined ? {} : { firstClearBonus }),
    ...(cultivationRewards > 0 ? { cultivationRewards } : {}),
    appliedAtMs: null
  });
}

function selectRewardBand(options: CreateRunSettlementReceiptOptions): SettlementRewardBand {
  if (options.outcome === "boss_victory") {
    const bossBand = options.rewardConfig.progressRewardBands.find(
      (band) => band.requiresBossKill !== undefined && band.requiresBossKill === options.bossKilled
    );
    if (bossBand !== undefined) {
      return bossBand;
    }
    throw new Error(`No settlement reward band for boss kill ${options.bossKilled ?? "<none>"}`);
  }

  const reached = parseSegmentOrdinal(options.reachedSegment);
  const progressBand = options.rewardConfig.progressRewardBands.find((band) => {
    if (band.requiresBossKill !== undefined || band.stageProgressMin === undefined || band.stageProgressMax === undefined) {
      return false;
    }
    const min = parseSegmentOrdinal(band.stageProgressMin);
    const max = parseSegmentOrdinal(band.stageProgressMax);
    return reached >= min && reached <= max;
  });
  if (progressBand !== undefined) {
    return progressBand;
  }
  throw new Error(`No settlement reward band for reached segment ${options.reachedSegment}`);
}

function materializeBandRewards(ranges: Readonly<Record<string, readonly number[]>>, multiplier: number): ResourceMap {
  const rewards: Record<string, number> = {};
  for (const [resourceId, range] of Object.entries(ranges)) {
    const amount = materializeRange(range, multiplier);
    if (amount > 0) {
      rewards[resourceId] = amount;
    }
  }
  return Object.freeze(rewards);
}

function materializeRange(range: readonly number[], multiplier: number): number {
  if (range.length !== 2) {
    throw new Error("reward range must contain exactly two values");
  }
  const min = range[0];
  const max = range[1];
  if (min === undefined || max === undefined) {
    throw new Error("reward range must contain exactly two values");
  }
  assertNonNegativeFinite(min, "reward range min");
  assertNonNegativeFinite(max, "reward range max");
  assertPositiveFinite(multiplier, "difficulty multiplier");
  if (max < min) {
    throw new Error("reward range max must be greater than or equal to min");
  }
  return Math.round(((min + max) / 2) * multiplier);
}

function materializeBossBonusRewards(materials: readonly SettlementMaterial[]): ResourceMap {
  const rewards: Record<string, number> = {};
  for (const material of materials) {
    validateSettlementMaterial(material);
    rewards[material.pickupId] = (rewards[material.pickupId] ?? 0) + material.amount;
  }
  return Object.freeze(rewards);
}

function materializeCultivationRewards(materials: readonly SettlementMaterial[]): number {
  let total = 0;
  for (const material of materials) {
    validateSettlementMaterial(material);
    const gain = material.params?.cultivationGain;
    if (typeof gain === "number" && Number.isFinite(gain) && gain > 0) {
      total += gain;
    }
  }
  return total;
}

function mergeResources(base: ResourceMap, added: ResourceMap): ResourceMap {
  const merged: Record<string, number> = {};
  addResourcesInto(merged, base);
  addResourcesInto(merged, added);
  return Object.freeze(merged);
}

function copyResourceMap(resources: ResourceMap): ResourceMap {
  const copy: Record<string, number> = {};
  addResourcesInto(copy, resources);
  return Object.freeze(copy);
}

function addResourcesInto(target: Record<string, number>, resources: ResourceMap): void {
  for (const [resourceId, amount] of Object.entries(resources)) {
    if (resourceId.length === 0) {
      throw new Error("resource id must not be empty");
    }
    assertNonNegativeFinite(amount, `resource ${resourceId}`);
    if (amount > 0) {
      target[resourceId] = (target[resourceId] ?? 0) + amount;
    }
  }
}

function hasResources(resources: ResourceMap): boolean {
  return Object.keys(resources).length > 0;
}

function parseSegmentOrdinal(segment: string): number {
  const shortMatch = /^(\d+)-(\d+)$/.exec(segment);
  if (shortMatch !== null) {
    return Number(shortMatch[1]) * 100 + Number(shortMatch[2]);
  }

  const stageMatch = /^stage_(\d+)_(\d+)$/.exec(segment);
  if (stageMatch !== null) {
    return Number(stageMatch[1]) * 100 + Number(stageMatch[2]);
  }

  throw new Error(`Unsupported stage segment format: ${segment}`);
}

function validateOptions(options: CreateRunSettlementReceiptOptions): void {
  if (options.runId.length === 0) {
    throw new Error("runId must not be empty");
  }
  if (options.profileId.length === 0) {
    throw new Error("profileId must not be empty");
  }
  if (options.stageId.length === 0 || options.stageId !== options.rewardConfig.stageId) {
    throw new Error("stageId must match settlement reward config");
  }
  if (options.reachedSegment.length === 0) {
    throw new Error("reachedSegment must not be empty");
  }
  if (options.rewardConfig.rules.baseResourcesKept !== "100_percent") {
    throw new Error("v0.1 RunSettlement only supports 100_percent base resource keep rules");
  }
}

function validateSettlementMaterial(material: SettlementMaterial): void {
  if (material.pickupId.length === 0) {
    throw new Error("settlement material pickupId must not be empty");
  }
  assertNonNegativeFinite(material.amount, `settlement material ${material.pickupId}`);
}

function assertPositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be positive finite`);
  }
}

function assertNonNegativeFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be non-negative finite`);
  }
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
