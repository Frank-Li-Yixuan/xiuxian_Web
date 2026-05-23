import type { SeededRng } from "../core/SeededRng";

export interface RewardPoolPack {
  readonly items: readonly RewardPoolDefinition[];
}

export interface RewardPoolDefinition {
  readonly id: string;
  readonly rules: RewardPoolRules;
  readonly entries: readonly RewardEntryDefinition[];
}

export interface RewardPoolRules {
  readonly choicesPerPlayer: number;
  readonly allowDuplicateAcrossPlayers: boolean;
  readonly allowCultivationBoost: boolean;
  readonly allowMajorRealmBreakthroughChoice: boolean;
}

export type RewardType =
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

export type RewardRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface RewardEntryDefinition {
  readonly type: RewardType;
  readonly targetId: string;
  readonly weight: number;
  readonly rarity: RewardRarity;
  readonly conditions?: readonly RewardCondition[];
}

export type RewardCondition =
  | "has_empty_spell_slot"
  | "has_spell_slot_filled"
  | "has_inner_treasure_slot"
  | "inner_artifact_empty"
  | "not_in_tribulation";

export interface RewardPlayerContext {
  readonly playerId: string;
  readonly spellSlots: readonly (string | null)[];
  readonly innerTreasureSlots: readonly (string | null)[];
  readonly innerArtifactId: string | null;
  readonly inTribulation: boolean;
}

export interface RewardChoice {
  readonly optionId: string;
  readonly playerId: string;
  readonly rewardPoolId: string;
  readonly reward: {
    readonly type: RewardType;
    readonly targetId: string;
    readonly rarity: RewardRarity;
  };
}

export interface GenerateRewardChoicesOptions {
  readonly rewardPool: RewardPoolDefinition;
  readonly playerId: string;
  readonly choicesPerPlayer: number;
  readonly rewardRng: SeededRng;
  readonly excludedTargetIds: Set<string>;
  readonly context: RewardPlayerContext;
}

export type RewardPoolsById = Readonly<Record<string, RewardPoolDefinition>>;

export function indexRewardPools(definitions: readonly RewardPoolDefinition[]): RewardPoolsById {
  const indexed: Record<string, RewardPoolDefinition> = {};
  for (const definition of definitions) {
    validateRewardPool(definition);
    if (indexed[definition.id] !== undefined) {
      throw new Error(`Duplicate reward pool id: ${definition.id}`);
    }
    indexed[definition.id] = definition;
  }
  return indexed;
}

export function generateRewardChoices(options: GenerateRewardChoicesOptions): readonly RewardChoice[] {
  if (options.playerId.length === 0) {
    throw new Error("playerId must not be empty");
  }
  if (!Number.isInteger(options.choicesPerPlayer) || options.choicesPerPlayer < 0) {
    throw new Error("choicesPerPlayer must be a non-negative integer");
  }

  const selected: RewardChoice[] = [];
  let candidates = getEligibleEntries(options.rewardPool, options.context, options.excludedTargetIds);

  while (selected.length < options.choicesPerPlayer && candidates.length > 0) {
    const picked = options.rewardRng.pickWeighted(candidates.map((entry) => ({ item: entry, weight: entry.weight })));
    const choice: RewardChoice = {
      optionId: createOptionId(options.playerId, selected.length, picked),
      playerId: options.playerId,
      rewardPoolId: options.rewardPool.id,
      reward: {
        type: picked.type,
        targetId: picked.targetId,
        rarity: picked.rarity
      }
    };

    selected.push(choice);
    options.excludedTargetIds.add(picked.targetId);
    candidates = candidates.filter((entry) => entry.targetId !== picked.targetId);
  }

  return selected;
}

function getEligibleEntries(
  rewardPool: RewardPoolDefinition,
  context: RewardPlayerContext,
  excludedTargetIds: ReadonlySet<string>
): readonly RewardEntryDefinition[] {
  return rewardPool.entries
    .filter((entry) => entry.weight > 0)
    .filter((entry) => !excludedTargetIds.has(entry.targetId))
    .filter((entry) => rewardPool.rules.allowCultivationBoost || entry.type !== "cultivation_boost")
    .filter((entry) => rewardPool.rules.allowMajorRealmBreakthroughChoice || entry.type !== "constitution")
    .filter((entry) => (entry.conditions ?? []).every((condition) => isConditionMet(condition, context)))
    .sort(
      (a, b) =>
        a.type.localeCompare(b.type) ||
        a.targetId.localeCompare(b.targetId) ||
        a.rarity.localeCompare(b.rarity) ||
        a.weight - b.weight
    );
}

function isConditionMet(condition: RewardCondition, context: RewardPlayerContext): boolean {
  switch (condition) {
    case "has_empty_spell_slot":
      return context.spellSlots.some((spellId) => spellId === null);
    case "has_spell_slot_filled":
      return context.spellSlots.some((spellId) => spellId !== null);
    case "has_inner_treasure_slot":
      return context.innerTreasureSlots.some((treasureId) => treasureId === null);
    case "inner_artifact_empty":
      return context.innerArtifactId === null;
    case "not_in_tribulation":
      return !context.inTribulation;
    default:
      assertNever(condition);
  }
}

function createOptionId(playerId: string, index: number, reward: RewardEntryDefinition): string {
  return `${playerId}_choice_${index}_${reward.type}_${reward.targetId}`;
}

function validateRewardPool(definition: RewardPoolDefinition): void {
  if (definition.id.length === 0) {
    throw new Error("reward pool id must not be empty");
  }
  if (!Number.isInteger(definition.rules.choicesPerPlayer) || definition.rules.choicesPerPlayer <= 0) {
    throw new Error(`reward pool ${definition.id} choicesPerPlayer must be a positive integer`);
  }
  for (const entry of definition.entries) {
    validateRewardEntry(definition.id, entry);
  }
}

function validateRewardEntry(poolId: string, entry: RewardEntryDefinition): void {
  if (entry.targetId.length === 0) {
    throw new Error(`reward pool ${poolId} targetId must not be empty`);
  }
  if (!Number.isFinite(entry.weight) || entry.weight < 0) {
    throw new Error(`reward pool ${poolId} entry weight must be non-negative`);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unsupported reward condition: ${value}`);
}
