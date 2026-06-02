import type { SeededRng } from "../sim/core/SeededRng";
import type {
  BackgroundOriginDefinition,
  BackgroundOriginGenerationResult,
  BackgroundOriginResult,
  OriginFateGenerationContext,
  WeightedCandidateDebug
} from "../types/origin-fate-types.v0.1";
import {
  loadOriginFateRegistry,
  type OriginFateRegistry
} from "./OriginFateRegistry";

const MATCH_WEIGHT_BONUS = 12;
const LOCK_WEIGHT_BONUS = 1_000;

const TAG_ALIASES: Readonly<Record<string, readonly string[]>> = {
  destiny_alchemy_prodigy: ["alchemy", "apothecary", "herb", "wood", "fire", "pill"],
  destiny_poisoned_benefit: ["alchemy", "apothecary", "pill", "poison"],
  destiny_herb_affinity: ["alchemy", "apothecary", "herb", "wood"],
  destiny_heaven_jealous_talent: ["orphan", "thunder", "tribulation", "ancestral_dream", "genius"],
  destiny_thunder_affinity: ["thunder", "tribulation", "thunderstorm_omen"],
  destiny_thunder_mind: ["thunder", "spirit_vision", "dream"],
  flaw_thunder_drawn: ["thunder", "tribulation", "thunderstorm_omen"],
  archetype_thin_lived_genius: ["orphan", "tribulation", "genius"],
  root_thunder: ["thunder", "thunderstorm_omen"],
  root_wood: ["wood", "herb"],
  root_fire: ["fire", "alchemy"]
};

const ORIGIN_ALIASES: Readonly<Record<string, readonly string[]>> = {
  origin_mountain_orphan: ["orphan", "thunder", "tribulation", "ancestral_dream"],
  origin_apothecary_apprentice: ["apothecary", "alchemy", "herb", "wood", "fire", "pill"],
  origin_daoist_temple_servant: ["daoist", "temple", "ritual", "incense", "scripture"],
  origin_hunter_child: ["hunter", "forest", "beast", "martial"],
  origin_fallen_cultivator_descendant: ["fallen_lineage", "relic", "past_life", "sword", "scripture"],
  origin_refugee_orphan: ["refugee", "war", "survival", "karma"],
  origin_village_scholar: ["scholar", "study", "book", "comprehension"],
  origin_merchant_bastard: ["merchant", "resource", "trade", "family_conflict"],
  origin_gravekeeper_child: ["graveyard", "yin", "soul", "dream"]
};

export function generateBackgroundOrigin(
  context: OriginFateGenerationContext,
  registry: OriginFateRegistry = loadOriginFateRegistry(),
  rng: SeededRng
): BackgroundOriginGenerationResult {
  validateContext(context);

  if (context.locks?.backgroundOriginId !== undefined) {
    const origin = registry.getBackgroundOrigin(context.locks.backgroundOriginId);
    const result = toBackgroundOriginResult(origin, origin.baseWeight + LOCK_WEIGHT_BONUS, ["lock:backgroundOriginId"]);
    return deepFreeze({
      result,
      debug: {
        candidateWeights: [
          {
            id: origin.id,
            weight: result.appliedWeight,
            matchedTags: result.matchedTags
          }
        ]
      }
    });
  }

  const contextTokens = collectContextTokens(context);
  const candidateWeights = registry.backgroundOrigins.map((origin) => buildCandidateWeight(origin, contextTokens));
  const picked = pickWeighted(rng, candidateWeights);

  return deepFreeze({
    result: toBackgroundOriginResult(
      registry.getBackgroundOrigin(picked.id),
      picked.weight,
      picked.matchedTags
    ),
    debug: {
      candidateWeights
    }
  });
}

function validateContext(context: OriginFateGenerationContext): void {
  if (context.seed.length === 0) {
    throw new Error("Origin fate background seed must not be empty");
  }
  if (!Number.isInteger(context.rerollIndex) || context.rerollIndex < 0) {
    throw new Error("Origin fate background rerollIndex must be a non-negative integer");
  }
}

function buildCandidateWeight(
  origin: BackgroundOriginDefinition,
  contextTokens: ReadonlySet<string>
): WeightedCandidateDebug {
  const originTokens = collectOriginTokens(origin);
  const matchedTags = [...contextTokens].filter((tag) => originTokens.has(tag)).sort();
  const weight = round2(origin.baseWeight + matchedTags.length * MATCH_WEIGHT_BONUS);

  return {
    id: origin.id,
    weight,
    matchedTags
  };
}

function toBackgroundOriginResult(
  origin: BackgroundOriginDefinition,
  appliedWeight: number,
  matchedTags: readonly string[]
): BackgroundOriginResult {
  return {
    originId: origin.id,
    name: origin.name,
    visibleDescription: origin.visibleDescription,
    appliedWeight,
    matchedTags
  };
}

function collectContextTokens(context: OriginFateGenerationContext): ReadonlySet<string> {
  const tokens = new Set<string>();
  for (const tag of [
    ...context.openingTags,
    ...context.destinyTags,
    ...context.spiritualRootTags,
    ...context.aptitudeTags
  ]) {
    addTagTokens(tokens, tag);
  }
  return tokens;
}

function collectOriginTokens(origin: BackgroundOriginDefinition): ReadonlySet<string> {
  const tokens = new Set<string>();
  for (const value of [
    origin.id,
    origin.name,
    ...origin.toneTags,
    ...origin.lifeEventBiasTags,
    ...origin.hiddenFateBiasTags,
    ...origin.carriedItemBiasTags,
    ...origin.modeBiasTags
  ]) {
    addTagTokens(tokens, value);
  }
  for (const alias of ORIGIN_ALIASES[origin.id] ?? []) {
    addTagTokens(tokens, alias);
  }
  return tokens;
}

function addTagTokens(tokens: Set<string>, rawTag: string): void {
  const normalized = normalizeToken(rawTag);
  if (normalized.length === 0) {
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
    tokens.add(alias);
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

function pickWeighted(rng: SeededRng, candidates: readonly WeightedCandidateDebug[]): WeightedCandidateDebug {
  if (candidates.length === 0) {
    throw new Error("Background origin generator requires at least one candidate");
  }

  const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  if (totalWeight <= 0) {
    throw new Error("Background origin generator requires at least one positive candidate weight");
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
