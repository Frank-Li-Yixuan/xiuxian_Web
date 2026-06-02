import type { SeededRng } from "../sim/core/SeededRng";
import type {
  BackgroundOriginResult,
  CarriedItemDefinition,
  CarriedItemResult,
  CarriedItemsGenerationResult,
  HiddenFateResultInternal,
  OriginFateGenerationContext,
  WeightedCandidateDebug
} from "../types/origin-fate-types.v0.1";
import {
  loadOriginFateRegistry,
  type OriginFateRegistry
} from "./OriginFateRegistry";

const MATCH_WEIGHT_BONUS = 11;
const HIDDEN_FATE_SYNERGY_BONUS = 28;
const ORIGIN_DIRECT_BONUS = 24;
const SPECIAL_MATCH_BONUS = 42;
const LOCK_WEIGHT_BONUS = 1_000;

const TAG_ALIASES: Readonly<Record<string, readonly string[]>> = {
  destiny_alchemy_prodigy: ["alchemy", "apothecary", "wood", "fire", "medicine", "pill_saint_remains"],
  destiny_poisoned_benefit: ["alchemy", "medicine", "poison"],
  destiny_herb_affinity: ["alchemy", "herb", "wood", "medicine"],
  destiny_sword_bone: ["sword", "metal", "wooden_sword", "past_life_sword_soul"],
  destiny_old_scroll: ["scripture", "wordless_page", "heaven_book_fragment", "comprehension"],
  destiny_yin_eye: ["yin", "soul", "graveyard", "night", "lunar_remnant_vein"],
  destiny_thunder_affinity: ["thunder", "tribulation"],
  root_metal: ["metal", "sword"],
  root_wood: ["wood", "herb", "alchemy"],
  root_fire: ["fire", "alchemy"],
  root_yin: ["yin", "soul", "night"],
  root_water: ["water", "river", "lunar_remnant_vein"],
  aptitude_comprehension_high: ["comprehension", "scripture"],
  aptitude_inspiration_high: ["dream", "spirit_vision"],
  aptitude_fortune_high: ["fortune", "old_coin", "chance"],
  hidden_pill_saint_remains: ["pill_saint_remains", "alchemy", "apothecary", "medicine"],
  hidden_past_life_sword_soul: ["past_life_sword_soul", "sword", "wooden_sword", "fallen_lineage"],
  hidden_lunar_remnant_vein: ["lunar_remnant_vein", "yin", "soul", "night"],
  hidden_merit_seed: ["merit", "protection", "family"],
  hidden_dragon_bone_unawakened: ["dragon_bone", "dragon_bone_unawakened", "beast", "hunter"],
  hidden_system_resonance_body: ["system_resonance", "old_coin", "ancestral_jade"],
  hidden_heaven_book_fragment: ["heaven_book_fragment", "wordless_page", "scripture"],
  hidden_demon_mark: ["demon_mark", "demon", "forbidden", "graveyard"],
  hidden_void_battlefield_echo: ["void_battlefield_echo", "war", "battle", "martial"]
};

const BACKGROUND_ALIASES: Readonly<Record<string, readonly string[]>> = {
  origin_mountain_orphan: ["orphan", "relic", "letter", "old_coin", "wooden_sword"],
  origin_apothecary_apprentice: ["apothecary", "alchemy", "bronze_furnace", "medicine", "wood", "fire"],
  origin_daoist_temple_servant: ["temple", "incense_burner", "old_talisman", "rain_scripture", "ritual"],
  origin_hunter_child: ["hunter", "wooden_sword", "hunting_bow", "beast", "forest"],
  origin_fallen_cultivator_descendant: [
    "fallen_lineage",
    "relic",
    "wordless_page",
    "wooden_sword",
    "ancestral_jade",
    "family_letter",
    "sword",
    "scripture"
  ],
  origin_refugee_orphan: ["refugee", "family_letter", "cracked_coin", "old_talisman", "survival"],
  origin_village_scholar: ["scholar", "wordless_page", "rain_scripture", "cracked_coin", "scripture"],
  origin_merchant_bastard: ["merchant", "cracked_coin", "ancestral_jade", "family_letter", "fortune"],
  origin_gravekeeper_child: ["gravekeeper", "graveyard", "black_bone_flute", "old_talisman", "stone_charm", "yin", "soul"]
};

export function generateCarriedItems(
  context: OriginFateGenerationContext,
  backgroundResult: BackgroundOriginResult,
  hiddenFate: HiddenFateResultInternal,
  registry: OriginFateRegistry = loadOriginFateRegistry(),
  rng: SeededRng
): CarriedItemsGenerationResult {
  validateContext(context);

  const contextTokens = collectContextTokens(context, backgroundResult, hiddenFate, registry);
  const lockedIds = context.locks?.carriedItemIds;
  if (lockedIds !== undefined) {
    return generateLockedCarriedItems(lockedIds, registry, contextTokens);
  }

  const candidateWeights = registry.carriedItems.map((item) => buildCandidateWeight(item, contextTokens));
  const secondItemChance = resolveSecondItemChance(contextTokens, registry);
  const targetCount = resolveTargetCount(secondItemChance, registry, rng);
  const selected = pickUniqueWeighted(rng, candidateWeights, targetCount);

  return deepFreeze({
    items: selected.map((candidate) => toCarriedItemResult(registry.getCarriedItem(candidate.id), candidate.weight, candidate.matchedTags)),
    debug: {
      candidateWeights,
      secondItemChance
    }
  });
}

function validateContext(context: OriginFateGenerationContext): void {
  if (context.seed.length === 0) {
    throw new Error("Origin fate carried items seed must not be empty");
  }
  if (!Number.isInteger(context.rerollIndex) || context.rerollIndex < 0) {
    throw new Error("Origin fate carried items rerollIndex must be a non-negative integer");
  }
}

function generateLockedCarriedItems(
  lockedIds: readonly string[],
  registry: OriginFateRegistry,
  contextTokens: ReadonlySet<string>
): CarriedItemsGenerationResult {
  if (lockedIds.length < registry.generationRules.carriedItems.minCount) {
    throw new Error("Locked carried item count is below generation minimum");
  }
  if (lockedIds.length > registry.generationRules.carriedItems.maxCount) {
    throw new Error("Locked carried item count exceeds generation maximum");
  }

  const uniqueIds = uniqueStable(lockedIds);
  if (uniqueIds.length !== lockedIds.length) {
    throw new Error("Locked carried item ids must not contain duplicates");
  }

  const candidateWeights = lockedIds.map((itemId) => {
    const candidate = buildCandidateWeight(registry.getCarriedItem(itemId), contextTokens);
    return {
      id: candidate.id,
      weight: candidate.weight + LOCK_WEIGHT_BONUS,
      matchedTags: uniqueStable(["lock:carriedItemIds", ...candidate.matchedTags])
    };
  });

  return deepFreeze({
    items: candidateWeights.map((candidate) =>
      toCarriedItemResult(registry.getCarriedItem(candidate.id), candidate.weight, candidate.matchedTags)
    ),
    debug: {
      candidateWeights,
      secondItemChance: lockedIds.length >= 2 ? 1 : 0
    }
  });
}

function buildCandidateWeight(item: CarriedItemDefinition, contextTokens: ReadonlySet<string>): WeightedCandidateDebug {
  const itemTokens = collectItemTokens(item);
  const baseMatches = [...contextTokens].filter((tag) => itemTokens.has(tag)).sort();
  const hiddenSynergyMatches = item.hiddenFateSynergyTags.flatMap((tag) => getMatchingTokens(tag, contextTokens));
  const specialMatches = getSpecialCandidateMatches(item.id, contextTokens);
  const directOriginMatches = getDirectOriginMatches(item.id, contextTokens);
  const matchedTags = uniqueStable([...baseMatches, ...hiddenSynergyMatches, ...specialMatches, ...directOriginMatches]);
  const weight = Math.max(
    1,
    round2(
      item.baseWeight +
        baseMatches.length * MATCH_WEIGHT_BONUS +
        hiddenSynergyMatches.length * HIDDEN_FATE_SYNERGY_BONUS +
        specialMatches.length * SPECIAL_MATCH_BONUS +
        directOriginMatches.length * ORIGIN_DIRECT_BONUS
    )
  );

  return {
    id: item.id,
    weight,
    matchedTags
  };
}

function toCarriedItemResult(
  item: CarriedItemDefinition,
  appliedWeight: number,
  matchedTags: readonly string[]
): CarriedItemResult {
  return {
    itemId: item.id,
    name: item.name,
    visibleDescription: item.visibleDescription,
    conversion: item.eighteenConversion,
    matchedTags,
    appliedWeight
  };
}

function resolveSecondItemChance(contextTokens: ReadonlySet<string>, registry: OriginFateRegistry): number {
  let chance = registry.generationRules.carriedItems.secondItemBaseChance;
  for (const modifier of registry.generationRules.carriedItems.secondItemChanceModifiers) {
    const modifierTokens = new Set<string>();
    addTagTokens(modifierTokens, modifier.conditionTag);
    if ([...modifierTokens].some((tag) => contextTokens.has(tag))) {
      chance += modifier.delta;
    }
  }
  return round2(clamp(chance, 0, 1));
}

function resolveTargetCount(secondItemChance: number, registry: OriginFateRegistry, rng: SeededRng): number {
  const { minCount, maxCount } = registry.generationRules.carriedItems;
  const secondItemAllowed = maxCount >= 2 && rng.bool(secondItemChance);
  return clampInteger(minCount + (secondItemAllowed ? 1 : 0), minCount, maxCount);
}

function pickUniqueWeighted(
  rng: SeededRng,
  candidates: readonly WeightedCandidateDebug[],
  targetCount: number
): readonly WeightedCandidateDebug[] {
  if (candidates.length === 0) {
    throw new Error("Carried item generator requires at least one candidate");
  }
  if (targetCount > candidates.length) {
    throw new Error("Carried item generator cannot pick more unique items than available candidates");
  }

  const remaining = candidates.map((candidate) => ({ ...candidate }));
  const selected: WeightedCandidateDebug[] = [];
  while (selected.length < targetCount) {
    const picked = pickWeighted(rng, remaining);
    selected.push(picked);
    const pickedIndex = remaining.findIndex((candidate) => candidate.id === picked.id);
    remaining.splice(pickedIndex, 1);
  }
  return selected;
}

function pickWeighted(rng: SeededRng, candidates: readonly WeightedCandidateDebug[]): WeightedCandidateDebug {
  const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  if (totalWeight <= 0) {
    throw new Error("Carried item generator requires at least one positive candidate weight");
  }

  const roll = rng.rangeFloat(0, totalWeight);
  let cumulative = 0;
  let fallback = candidates[0]!;
  for (const candidate of candidates) {
    if (candidate.weight > 0) {
      fallback = candidate;
    }
    cumulative += candidate.weight;
    if (roll < cumulative) {
      return candidate;
    }
  }
  return fallback;
}

function collectContextTokens(
  context: OriginFateGenerationContext,
  backgroundResult: BackgroundOriginResult,
  hiddenFate: HiddenFateResultInternal,
  registry: OriginFateRegistry
): ReadonlySet<string> {
  const tokens = new Set<string>();
  const background = registry.getBackgroundOrigin(backgroundResult.originId);
  const hiddenFateDefinition = registry.getHiddenFate(hiddenFate.hiddenFateId);

  for (const tag of [
    ...context.openingTags,
    ...context.destinyTags,
    ...context.spiritualRootTags,
    ...context.aptitudeTags,
    backgroundResult.originId,
    ...backgroundResult.matchedTags,
    ...background.toneTags,
    ...background.lifeEventBiasTags,
    ...background.hiddenFateBiasTags,
    ...background.carriedItemBiasTags,
    ...background.modeBiasTags,
    hiddenFate.hiddenFateId,
    hiddenFate.category,
    hiddenFate.progressBand,
    ...hiddenFate.matchedTags,
    ...hiddenFateDefinition.biasTags,
    ...hiddenFateDefinition.lifeEventBiasTags,
    ...hiddenFateDefinition.dongfuHooks
  ]) {
    addTagTokens(tokens, tag);
  }

  for (const alias of BACKGROUND_ALIASES[backgroundResult.originId] ?? []) {
    addTagTokens(tokens, alias);
  }

  return tokens;
}

function collectItemTokens(item: CarriedItemDefinition): ReadonlySet<string> {
  const tokens = new Set<string>();
  for (const value of [
    item.id,
    item.name,
    item.rarity,
    item.eighteenConversion.type,
    item.eighteenConversion.label,
    item.eighteenConversion.outerBattlefieldEffect,
    item.eighteenConversion.dongfuHook,
    ...item.biasTags,
    ...item.hiddenFateSynergyTags,
    ...item.lifeEventTags
  ]) {
    addTagTokens(tokens, value);
  }
  return tokens;
}

function getMatchingTokens(rawTag: string, contextTokens: ReadonlySet<string>): readonly string[] {
  const tagTokens = new Set<string>();
  addTagTokens(tagTokens, rawTag);
  return [...tagTokens].filter((token) => contextTokens.has(token));
}

function getSpecialCandidateMatches(itemId: string, contextTokens: ReadonlySet<string>): readonly string[] {
  const matches: string[] = [];
  if (
    contextTokens.has("origin_fallen_cultivator_descendant") &&
    (itemId === "origin_item_broken_wooden_sword" ||
      itemId === "origin_item_wordless_page" ||
      itemId === "origin_item_ancestral_jade")
  ) {
    matches.push("origin_fallen_cultivator_descendant");
  }
  if (itemId === "item_apothecary_bronze_furnace" && contextTokens.has("origin_apothecary_apprentice")) {
    matches.push("origin_apothecary_apprentice");
  }
  if (itemId === "item_black_bone_flute" && contextTokens.has("origin_gravekeeper_child")) {
    matches.push("origin_gravekeeper_child");
  }
  if (itemId === "item_apothecary_bronze_furnace" && contextTokens.has("hidden_pill_saint_remains")) {
    matches.push("pill_saint_remains");
  }
  if (itemId === "item_black_bone_flute" && contextTokens.has("hidden_lunar_remnant_vein")) {
    matches.push("lunar_remnant_vein");
  }
  if (itemId === "origin_item_broken_wooden_sword" && contextTokens.has("hidden_past_life_sword_soul")) {
    matches.push("past_life_sword_soul");
  }
  if (itemId === "origin_item_wordless_page" && contextTokens.has("hidden_heaven_book_fragment")) {
    matches.push("heaven_book_fragment");
  }
  return matches;
}

function getDirectOriginMatches(itemId: string, contextTokens: ReadonlySet<string>): readonly string[] {
  const matches: string[] = [];
  if (itemId === "origin_item_broken_wooden_sword" && contextTokens.has("wooden_sword")) {
    matches.push("wooden_sword");
  }
  if (itemId === "origin_item_wordless_page" && contextTokens.has("wordless_page")) {
    matches.push("wordless_page");
  }
  if (itemId === "origin_item_ancestral_jade" && contextTokens.has("ancestral_jade")) {
    matches.push("ancestral_jade");
  }
  if (itemId === "item_apothecary_bronze_furnace" && contextTokens.has("bronze_furnace")) {
    matches.push("bronze_furnace");
  }
  if (itemId === "item_black_bone_flute" && contextTokens.has("black_bone_flute")) {
    matches.push("black_bone_flute");
  }
  return matches;
}

function addTagTokens(tokens: Set<string>, rawTag: string): void {
  const normalized = normalizeToken(rawTag);
  if (normalized.length === 0) {
    return;
  }
  if (tokens.has(normalized)) {
    return;
  }

  tokens.add(normalized);
  for (const part of normalized.split("_")) {
    if (part.length > 1) {
      tokens.add(part);
    }
  }
  for (const part of normalized.split(":")) {
    if (part.length > 1) {
      tokens.add(part);
      for (const nested of part.split("_")) {
        if (nested.length > 1) {
          tokens.add(nested);
        }
      }
    }
  }

  const aliasKey = normalized.replace(/:/g, "_");
  for (const alias of TAG_ALIASES[aliasKey] ?? []) {
    addTagTokens(tokens, alias);
  }
}

function normalizeToken(value: string): string {
  return value
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9:_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
}

function uniqueStable<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.trunc(clamp(value, min, max));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}
