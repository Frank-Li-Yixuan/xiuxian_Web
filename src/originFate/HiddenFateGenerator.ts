import type { SeededRng } from "../sim/core/SeededRng";
import type {
  BackgroundOriginResult,
  HiddenFateDefinition,
  HiddenFateGenerationResult,
  HiddenFateResultInternal,
  HiddenFateVagueLevel,
  OriginFateGenerationContext,
  VisibleHiddenOmen,
  WeightedCandidateDebug
} from "../types/origin-fate-types.v0.1";
import {
  loadOriginFateRegistry,
  type OriginFateRegistry
} from "./OriginFateRegistry";

const BIAS_MATCH_BONUS = 14;
const ANTI_MATCH_PENALTY = 18;
const LOCK_WEIGHT_BONUS = 1_000;
const SPECIAL_MATCH_BONUS = 56;

const TAG_ALIASES: Readonly<Record<string, readonly string[]>> = {
  destiny_thunder_affinity: ["thunder", "tribulation", "destiny:tribulation_affinity", "root:thunder"],
  destiny_thunder_mind: ["thunder", "root:thunder", "heaven_gaze"],
  flaw_thunder_drawn: ["thunder", "tribulation"],
  destiny_heaven_jealous_talent: ["thunder", "tribulation", "destiny:tribulation", "short_life"],
  destiny_alchemy_prodigy: ["alchemy", "pill_saint", "wood", "fire", "herb", "apothecary"],
  destiny_poisoned_benefit: ["alchemy", "pill_saint", "poison"],
  destiny_herb_affinity: ["alchemy", "wood", "herb"],
  root_thunder: ["thunder", "root:thunder", "thunderstorm_omen"],
  root_fire: ["fire"],
  root_wood: ["wood", "herb"],
  archetype_blessed: ["fortune", "chance_encounter"],
  archetype_thin_lived_genius: ["short_life", "tribulation", "genius"]
};

export function generateHiddenFate(
  context: OriginFateGenerationContext,
  backgroundResult: BackgroundOriginResult,
  registry: OriginFateRegistry = loadOriginFateRegistry(),
  rng: SeededRng
): HiddenFateGenerationResult {
  validateContext(context);

  const contextTokens = collectContextTokens(context, backgroundResult, registry);
  const candidateWeights = context.locks?.hiddenFateId === undefined
    ? registry.hiddenFates.map((hiddenFate) => buildCandidateWeight(hiddenFate, contextTokens))
    : [buildLockedCandidateWeight(registry.getHiddenFate(context.locks.hiddenFateId), contextTokens)];
  const picked = context.locks?.hiddenFateId === undefined
    ? pickWeighted(rng, candidateWeights)
    : candidateWeights[0]!;
  const hiddenFate = registry.getHiddenFate(picked.id);
  const progress = rollInitialProgress(hiddenFate, picked.matchedTags, contextTokens, rng);
  const internal = toHiddenFateInternal(hiddenFate, progress, picked.weight, picked.matchedTags, registry);
  const visibleOmen = toVisibleHiddenOmen(hiddenFate, progress, picked.matchedTags, context, rng, registry);

  return deepFreeze({
    internal,
    visibleOmen,
    debug: {
      candidateWeights
    }
  });
}

function validateContext(context: OriginFateGenerationContext): void {
  if (context.seed.length === 0) {
    throw new Error("Origin fate hidden fate seed must not be empty");
  }
  if (!Number.isInteger(context.rerollIndex) || context.rerollIndex < 0) {
    throw new Error("Origin fate hidden fate rerollIndex must be a non-negative integer");
  }
}

function buildCandidateWeight(hiddenFate: HiddenFateDefinition, contextTokens: ReadonlySet<string>): WeightedCandidateDebug {
  const biasMatches = uniqueStable(hiddenFate.biasTags.flatMap((tag) => getMatchingTokens(tag, contextTokens)));
  const specialMatches = getSpecialCandidateMatches(hiddenFate.id, contextTokens);
  const antiMatches = uniqueStable(hiddenFate.antiBiasTags.flatMap((tag) => getMatchingTokens(tag, contextTokens)));
  const weight = Math.max(
    1,
    round2(
      hiddenFate.baseWeight +
        biasMatches.length * BIAS_MATCH_BONUS +
        specialMatches.length * SPECIAL_MATCH_BONUS -
        antiMatches.length * ANTI_MATCH_PENALTY
    )
  );

  return {
    id: hiddenFate.id,
    weight,
    matchedTags: uniqueStable([...biasMatches, ...specialMatches])
  };
}

function buildLockedCandidateWeight(hiddenFate: HiddenFateDefinition, contextTokens: ReadonlySet<string>): WeightedCandidateDebug {
  const candidate = buildCandidateWeight(hiddenFate, contextTokens);
  return {
    id: candidate.id,
    weight: candidate.weight + LOCK_WEIGHT_BONUS,
    matchedTags: uniqueStable(["lock:hiddenFateId", ...candidate.matchedTags])
  };
}

function rollInitialProgress(
  hiddenFate: HiddenFateDefinition,
  matchedTags: readonly string[],
  contextTokens: ReadonlySet<string>,
  rng: SeededRng
): number {
  const [min, max] = hiddenFate.initialProgressRange;
  const base = rng.rangeFloat(min, max + 1);
  const inspirationBonus = contextTokens.has("inspiration_high") || contextTokens.has("aptitude:inspiration_high") ? 8 : 0;
  const fortuneBonus = contextTokens.has("fortune_high") || contextTokens.has("aptitude:fortune_high") ? 6 : 0;
  const matchBonus = Math.min(18, matchedTags.filter((tag) => !tag.startsWith("lock:")).length * 2);
  const lowPenalty = contextTokens.has("inspiration_low") || contextTokens.has("fortune_low") ? 4 : 0;

  return clampInteger(Math.round(base + inspirationBonus + fortuneBonus + matchBonus - lowPenalty), 0, 100);
}

function toHiddenFateInternal(
  hiddenFate: HiddenFateDefinition,
  progress: number,
  appliedWeight: number,
  matchedTags: readonly string[],
  registry: OriginFateRegistry
): HiddenFateResultInternal {
  return {
    hiddenFateId: hiddenFate.id,
    trueName: hiddenFate.trueName,
    category: hiddenFate.category,
    progress,
    progressBand: resolveVisibleProgressLevel(progress, registry).id,
    matchedTags,
    appliedWeight
  };
}

function toVisibleHiddenOmen(
  hiddenFate: HiddenFateDefinition,
  progress: number,
  matchedTags: readonly string[],
  context: OriginFateGenerationContext,
  rng: SeededRng,
  registry: OriginFateRegistry
): VisibleHiddenOmen {
  const progressLevel = resolveVisibleProgressLevel(progress, registry);
  const divined = (context.divinationTokens ?? 0) > 0;
  const maxHints = Math.min(
    hiddenFate.omenHints.length,
    registry.generationRules.visibleOmen.maxHintsShown + (divined ? 1 : 0)
  );
  const hints = pickHints(hiddenFate.omenHints, maxHints, rng);
  const base: VisibleHiddenOmen = {
    vagueLevel: progressLevel.id,
    levelLabel: progressLevel.label,
    hints,
    riskHint: hiddenFate.visibleRiskHint
  };

  if (!divined) {
    return base;
  }

  return {
    ...base,
    revealedCategory: hiddenFate.category,
    relatedTags: matchedTags.filter((tag) => !tag.startsWith("lock:"))
  };
}

function resolveVisibleProgressLevel(progress: number, registry: OriginFateRegistry): {
  readonly id: HiddenFateVagueLevel;
  readonly label: string;
} {
  const level = registry.generationRules.uiSummary.hiddenProgressLevels.find(
    (candidate) => progress >= candidate.range[0] && progress <= candidate.range[1]
  );
  if (level === undefined) {
    throw new Error(`Hidden fate progress outside visible level ranges: ${progress}`);
  }
  return {
    id: level.id,
    label: level.label
  };
}

function pickHints(hints: readonly string[], count: number, rng: SeededRng): readonly string[] {
  if (count <= 0) {
    return [];
  }
  if (hints.length <= count) {
    return [...hints];
  }

  const start = rng.rangeInt(0, hints.length - 1);
  return Array.from({ length: count }, (_, index) => hints[(start + index) % hints.length]!);
}

function collectContextTokens(
  context: OriginFateGenerationContext,
  backgroundResult: BackgroundOriginResult,
  registry: OriginFateRegistry
): ReadonlySet<string> {
  const tokens = new Set<string>();
  const background = registry.getBackgroundOrigin(backgroundResult.originId);
  for (const tag of [
    ...context.openingTags,
    ...context.destinyTags,
    ...context.spiritualRootTags,
    ...context.aptitudeTags,
    ...backgroundResult.matchedTags,
    ...background.toneTags,
    ...background.lifeEventBiasTags,
    ...background.hiddenFateBiasTags,
    ...background.modeBiasTags
  ]) {
    addTagTokens(tokens, tag);
  }
  return tokens;
}

function getMatchingTokens(rawTag: string, contextTokens: ReadonlySet<string>): readonly string[] {
  const tagTokens = new Set<string>();
  addTagTokens(tagTokens, rawTag);
  return [...tagTokens].filter((token) => contextTokens.has(token));
}

function getSpecialCandidateMatches(hiddenFateId: string, contextTokens: ReadonlySet<string>): readonly string[] {
  const matches: string[] = [];
  if (hiddenFateId === "hidden_pill_saint_remains" && contextTokens.has("destiny_alchemy_prodigy")) {
    matches.push("destiny_alchemy_prodigy");
  }
  if (hiddenFateId === "hidden_ancient_thunder_blood" && contextTokens.has("destiny_thunder_affinity")) {
    matches.push("destiny_thunder_affinity");
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

function pickWeighted(rng: SeededRng, candidates: readonly WeightedCandidateDebug[]): WeightedCandidateDebug {
  if (candidates.length === 0) {
    throw new Error("Hidden fate generator requires at least one candidate");
  }

  const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  if (totalWeight <= 0) {
    throw new Error("Hidden fate generator requires at least one positive candidate weight");
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

function uniqueStable<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.trunc(Math.min(max, Math.max(min, value)));
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
