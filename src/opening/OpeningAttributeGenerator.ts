import { SeededRng } from "../sim/core/SeededRng";
import type {
  AptitudeStats,
  AttributeArchetypeDefinition,
  AttributeArchetypeResult,
  CoreSeedStats,
  GenerateOpeningAttributeInput,
  OpeningAttributeDraft,
  OpeningAttributeGenerator,
  OpeningGenerationLocks,
  OpeningGrowthBias
} from "../types/opening-generator-types.v0.1";
import {
  loadOpeningGeneratorRegistry,
  type OpeningGeneratorRegistry
} from "./OpeningGeneratorRegistry";

const APTITUDE_KEYS = ["rootBone", "comprehension", "inspiration", "fortune", "heart", "lifespan"] as const;
const CORE_SEED_KEYS = ["jing", "qi", "shen"] as const;
const DEFAULT_BIAS = 1;

type AptitudeKey = (typeof APTITUDE_KEYS)[number];
type CoreSeedKey = (typeof CORE_SEED_KEYS)[number];

export class DefaultOpeningAttributeGenerator implements OpeningAttributeGenerator {
  private readonly registry: OpeningGeneratorRegistry;

  constructor(registry = loadOpeningGeneratorRegistry()) {
    this.registry = registry;
  }

  generate(input: GenerateOpeningAttributeInput): OpeningAttributeDraft {
    validateInput(input);

    const streams = createOpeningAttributeRngStreams(input.seed, input.rerollIndex);
    const archetypePick = selectArchetype({
      input,
      registry: this.registry,
      archetypeRng: streams.archetype
    });
    const archetypeDefinition = this.registry.getAttributeArchetype(archetypePick.result.id);
    const locks = input.locks;
    const aptitudeLocked = locks?.aptitudeStats === true;
    const aptitude = aptitudeLocked
      ? cloneLockedValue(input, "aptitudeStats", "aptitude")
      : rollAptitudeStats(archetypeDefinition, streams.aptitude, this.registry);
    const coreSeed = locks?.coreSeedStats === true
      ? cloneLockedValue(input, "coreSeedStats", "coreSeed")
      : rollCoreSeedStats(archetypeDefinition, aptitude, streams.coreSeed, this.registry);

    const drama = aptitudeLocked
      ? {
          aptitude,
          score: scoreAttributeDistinctiveness(aptitude),
          appliedHookIds: [],
          tags: []
        }
      : applyDramaCompensation({
          aptitude,
          dramaRng: streams.drama,
          registry: this.registry
        });
    const finalAptitude = drama.aptitude;
    const finalTags = buildDraftTags([...archetypePick.result.tags, ...drama.tags]);

    const draft: OpeningAttributeDraft = {
      draftId: input.draftId,
      seed: input.seed,
      rerollIndex: input.rerollIndex,
      archetype: archetypePick.result,
      aptitude: finalAptitude,
      coreSeed,
      growthBias: buildGrowthBias(finalAptitude, coreSeed, archetypePick.result.tags),
      tags: finalTags,
      distinctivenessScore: drama.score,
      debug: {
        selectedArchetypeWeightRoll: archetypePick.roll,
        selectedRootCategoryWeightRoll: 0,
        appliedDramaHookIds: drama.appliedHookIds,
        distributionTags: ["opening:attribute_only", "distribution:three_float_bell", `archetype:${archetypePick.result.id}`]
      }
    };

    return deepFreeze(locks === undefined ? draft : { ...draft, locks });
  }
}

export function generateOpeningAttributeDraft(
  input: GenerateOpeningAttributeInput,
  registry = loadOpeningGeneratorRegistry()
): OpeningAttributeDraft {
  return new DefaultOpeningAttributeGenerator(registry).generate(input);
}

export function generateAttributeArchetype(
  input: GenerateOpeningAttributeInput,
  registry = loadOpeningGeneratorRegistry()
): AttributeArchetypeResult {
  const streams = createOpeningAttributeRngStreams(input.seed, input.rerollIndex);
  return selectArchetype({
    input,
    registry,
    archetypeRng: streams.archetype
  }).result;
}

export function getOpeningAptitudeDisplayTier(value: number, registry = loadOpeningGeneratorRegistry()): string {
  const tier = registry.generationRules.displayTiers.find((entry) => value >= entry.min && value <= entry.max);
  if (tier === undefined) {
    throw new Error(`Opening aptitude value outside display tier ranges: ${value}`);
  }
  return tier.label;
}

function validateInput(input: GenerateOpeningAttributeInput): void {
  if (input.seed.length === 0) {
    throw new Error("Opening attribute seed must not be empty");
  }
  if (input.draftId.length === 0) {
    throw new Error("Opening attribute draftId must not be empty");
  }
  if (!Number.isInteger(input.rerollIndex) || input.rerollIndex < 0) {
    throw new Error("Opening attribute rerollIndex must be a non-negative integer");
  }
}

function createOpeningAttributeRngStreams(seed: string, rerollIndex: number): {
  readonly archetype: SeededRng;
  readonly aptitude: SeededRng;
  readonly coreSeed: SeededRng;
  readonly drama: SeededRng;
} {
  const root = new SeededRng(`${seed}:opening_attribute:${rerollIndex}`, "opening_attribute");
  return {
    archetype: root.fork("archetype"),
    aptitude: root.fork("aptitude"),
    coreSeed: root.fork("coreSeed"),
    drama: root.fork("drama")
  };
}

function selectArchetype({
  input,
  registry,
  archetypeRng
}: {
  readonly input: GenerateOpeningAttributeInput;
  readonly registry: OpeningGeneratorRegistry;
  readonly archetypeRng: SeededRng;
}): {
  readonly result: AttributeArchetypeResult;
  readonly roll: number;
} {
  if (input.locks?.attributeArchetype === true) {
    const previous = requirePreviousDraft(input, "attributeArchetype");
    registry.getAttributeArchetype(previous.archetype.id);
    return { result: cloneJson(previous.archetype), roll: 0 };
  }

  const picked = pickWeightedWithRoll(archetypeRng, registry.attributeArchetypes);
  return { result: toArchetypeResult(picked.item), roll: picked.roll };
}

function rollAptitudeStats(
  archetype: AttributeArchetypeDefinition,
  rng: SeededRng,
  registry: OpeningGeneratorRegistry
): AptitudeStats {
  const domains = registry.generationRules.statDomains;
  const stats = {} as Record<AptitudeKey, number>;

  for (const key of APTITUDE_KEYS) {
    const [min, max] = archetype.aptitudeRanges[key];
    const skew = archetype.skew?.[key] ?? 0;
    const bell = clampNumber(bell01(rng) + skew, 0, 1);
    stats[key] = clampInteger(Math.round(min + bell * (max - min)), domains.aptitudeMin, domains.aptitudeHardMax);
  }

  return stats;
}

function rollCoreSeedStats(
  archetype: AttributeArchetypeDefinition,
  aptitude: AptitudeStats,
  rng: SeededRng,
  registry: OpeningGeneratorRegistry
): CoreSeedStats {
  const domains = registry.generationRules.statDomains;

  return {
    jing: clampInteger(
      Math.round(archetype.coreSeedBase.jing + bellSpread(rng, 2) + (aptitude.rootBone - 50) / 16 + (aptitude.lifespan - 50) / 32),
      domains.coreSeedMin,
      domains.coreSeedMax
    ),
    qi: clampInteger(
      Math.round(archetype.coreSeedBase.qi + bellSpread(rng, 2) + (aptitude.fortune - 50) / 36 + (aptitude.heart - 50) / 42),
      domains.coreSeedMin,
      domains.coreSeedMax
    ),
    shen: clampInteger(
      Math.round(archetype.coreSeedBase.shen + bellSpread(rng, 2) + (aptitude.comprehension - 50) / 24 + (aptitude.inspiration - 50) / 24),
      domains.coreSeedMin,
      domains.coreSeedMax
    )
  };
}

function applyDramaCompensation({
  aptitude,
  dramaRng,
  registry
}: {
  readonly aptitude: AptitudeStats;
  readonly dramaRng: SeededRng;
  readonly registry: OpeningGeneratorRegistry;
}): {
  readonly aptitude: AptitudeStats;
  readonly score: number;
  readonly appliedHookIds: readonly string[];
  readonly tags: readonly string[];
} {
  const minimumScore = registry.generationRules.distinctiveness.minimumScoreAfterCompensation;
  const baseScore = scoreAttributeDistinctiveness(aptitude);

  if (baseScore >= minimumScore) {
    return { aptitude, score: baseScore, appliedHookIds: [], tags: [] };
  }

  const hook = dramaRng.pickWeighted(
    registry.generationRules.distinctiveness.compensationHooks.map((candidate) => ({ item: candidate, weight: 1 }))
  );
  const adjustedAptitude = applyAptitudeEffects(aptitude, hook.effect, registry);
  const adjustedScore = scoreAttributeDistinctiveness(adjustedAptitude);

  return {
    aptitude: adjustedAptitude,
    score: Math.max(minimumScore, adjustedScore + 1),
    appliedHookIds: [hook.id],
    tags: hook.tags
  };
}

function scoreAttributeDistinctiveness(aptitude: AptitudeStats): number {
  const values = Object.values(aptitude);
  let score = 0;

  if (values.some((value) => value >= 90)) {
    score += 2;
  }
  if (values.some((value) => value <= 20)) {
    score += 1;
  }
  if (aptitude.lifespan <= 25) {
    score += 1;
  }
  if (aptitude.inspiration >= 85) {
    score += 1;
  }
  if (aptitude.fortune >= 85) {
    score += 1;
  }

  return score;
}

function applyAptitudeEffects(
  aptitude: AptitudeStats,
  effects: Readonly<Record<string, number>>,
  registry: OpeningGeneratorRegistry
): AptitudeStats {
  const domains = registry.generationRules.statDomains;
  const adjusted = { ...aptitude };

  for (const key of APTITUDE_KEYS) {
    const effect = effects[key];
    if (effect !== undefined) {
      adjusted[key] = clampInteger(adjusted[key] + effect, domains.aptitudeMin, domains.aptitudeHardMax);
    }
  }

  return adjusted;
}

function buildGrowthBias(aptitude: AptitudeStats, coreSeed: CoreSeedStats, biasTags: readonly string[]): OpeningGrowthBias {
  return {
    jingGrowth: biasFrom(coreSeed.jing, aptitude.rootBone, hasTag(biasTags, "martial_training") ? 0.08 : 0),
    qiGrowth: biasFrom(coreSeed.qi, aptitude.heart, hasTag(biasTags, "meditation") ? 0.08 : 0),
    shenGrowth: biasFrom(coreSeed.shen, aptitude.comprehension, hasTag(biasTags, "early_learning") ? 0.08 : 0),
    studyBias: biasFrom(aptitude.comprehension, aptitude.inspiration, hasTag(biasTags, "early_learning") ? 0.1 : 0),
    martialBias: biasFrom(aptitude.rootBone, coreSeed.jing * 4, hasTag(biasTags, "martial_training") ? 0.12 : 0),
    alchemyBias: biasFrom(aptitude.inspiration, coreSeed.qi * 4, hasTag(biasTags, "chance_encounter") ? 0.06 : 0),
    artifactBias: biasFrom(aptitude.comprehension, coreSeed.qi * 4, hasTag(biasTags, "spiritual_root_omen") ? 0.08 : 0),
    seclusionBias: biasFrom(aptitude.heart, coreSeed.shen * 4, hasTag(biasTags, "meditation") ? 0.1 : 0),
    adventureBias: biasFrom(aptitude.fortune, aptitude.inspiration, hasTag(biasTags, "calamity") ? 0.08 : 0)
  };
}

function buildDraftTags(tags: readonly string[]): OpeningAttributeDraft["tags"] {
  return {
    destinyBiasTags: tags.filter((tag) => tag.startsWith("destinyBias:")),
    lifeEventBiasTags: tags.filter((tag) => tag.startsWith("lifeEvent:") || tag.startsWith("archetype:") || tag.startsWith("drama:")),
    modeBiasTags: tags.filter((tag) => tag.startsWith("mode:")),
    hiddenFateBiasTags: tags.filter((tag) => tag.startsWith("hiddenFateBias:"))
  };
}

function cloneLockedValue<K extends "aptitude" | "coreSeed">(
  input: GenerateOpeningAttributeInput,
  lockName: keyof Pick<OpeningGenerationLocks, "aptitudeStats" | "coreSeedStats">,
  fieldName: K
): OpeningAttributeDraft[K] {
  return cloneJson(requirePreviousDraft(input, lockName)[fieldName]);
}

function requirePreviousDraft(
  input: GenerateOpeningAttributeInput,
  lockName: keyof Pick<OpeningGenerationLocks, "attributeArchetype" | "aptitudeStats" | "coreSeedStats">
): OpeningAttributeDraft {
  if (input.previousDraft === undefined) {
    throw new Error(`previousDraft is required when locking ${lockName}`);
  }
  return input.previousDraft;
}

function pickWeightedWithRoll<T extends { readonly weight: number }>(
  rng: SeededRng,
  choices: readonly T[]
): {
  readonly item: T;
  readonly roll: number;
} {
  const totalWeight = choices.reduce((sum, choice) => sum + choice.weight, 0);
  if (choices.length === 0 || totalWeight <= 0) {
    throw new Error("Opening archetype weights must contain at least one positive choice");
  }

  const roll = rng.rangeFloat(0, totalWeight);
  let cumulative = 0;
  let fallback = choices[0]!;
  for (const choice of choices) {
    if (choice.weight > 0) {
      fallback = choice;
    }
    cumulative += choice.weight;
    if (roll < cumulative) {
      return { item: choice, roll };
    }
  }
  return { item: fallback, roll };
}

function toArchetypeResult(archetype: AttributeArchetypeDefinition): AttributeArchetypeResult {
  return {
    id: archetype.id,
    name: archetype.name,
    description: archetype.description,
    tags: archetype.biasTags
  };
}

function bell01(rng: SeededRng): number {
  return (rng.nextFloat01() + rng.nextFloat01() + rng.nextFloat01()) / 3;
}

function bellSpread(rng: SeededRng, radius: number): number {
  return (bell01(rng) - 0.5) * radius * 2;
}

function biasFrom(first: number, second: number, bonus: number): number {
  const base = DEFAULT_BIAS + ((first + second) / 2 - 50) / 180 + bonus;
  return round2(clampNumber(base, 0.75, 1.35));
}

function hasTag(tags: readonly string[], partial: string): boolean {
  return tags.some((tag) => tag.includes(partial));
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.trunc(clampNumber(value, min, max));
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function cloneJson<T>(value: T): T {
  return structuredClone(value);
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}
