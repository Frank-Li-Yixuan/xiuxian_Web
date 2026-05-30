import { SeededRng } from "../sim/core/SeededRng";
import type {
  AttributeArchetypeDefinition,
  ElementId,
  GenerateOpeningSpiritualRootInput,
  OpeningDraftTags,
  OpeningGenerationLocks,
  OpeningSpiritualRootDraft,
  OpeningSpiritualRootGenerator,
  SpiritualRootCategoryDefinition,
  SpiritualRootState
} from "../types/opening-generator-types.v0.1";
import {
  loadOpeningGeneratorRegistry,
  type OpeningGeneratorRegistry
} from "./OpeningGeneratorRegistry";

const METRIC_KEYS = ["purity", "stability", "conflict", "breadth"] as const;
const RARE_ROOT_CATEGORY_IDS = new Set(["heavenly", "variant", "hidden", "chaos"]);

type MetricKey = (typeof METRIC_KEYS)[number];
type ElementWeights = Readonly<Partial<Record<ElementId, number>>>;

interface OpeningSpiritualRootRngStreams {
  readonly spiritualRoot: SeededRng;
  readonly elementVector: SeededRng;
  readonly metrics: SeededRng;
}

interface CategoryPick {
  readonly category: SpiritualRootCategoryDefinition;
  readonly roll: number;
}

interface ElementVectorResult {
  readonly elements: ElementWeights;
  readonly primaryElement?: ElementId;
  readonly secondaryElements: readonly ElementId[];
  readonly latentRoot?: ElementId;
}

interface RelationshipAnalysis {
  readonly relationTags: readonly string[];
  readonly stabilityDelta: number;
  readonly conflictDelta: number;
  readonly breadthDelta: number;
}

export class DefaultOpeningSpiritualRootGenerator implements OpeningSpiritualRootGenerator {
  private readonly registry: OpeningGeneratorRegistry;

  constructor(registry = loadOpeningGeneratorRegistry()) {
    this.registry = registry;
  }

  generate(input: GenerateOpeningSpiritualRootInput): OpeningSpiritualRootDraft {
    validateInput(input);

    const archetype = this.registry.getAttributeArchetype(input.archetype.id);
    const streams = createOpeningSpiritualRootRngStreams(input.seed, input.rerollIndex);

    if (input.locks?.spiritualRootFull === true) {
      const previous = requirePreviousDraft(input, "spiritualRootFull");
      return deepFreeze({
        draftId: input.draftId,
        seed: input.seed,
        rerollIndex: input.rerollIndex,
        spiritualRoot: cloneJson(previous.spiritualRoot),
        tags: cloneJson(previous.tags),
        distinctivenessScore: previous.distinctivenessScore,
        locks: input.locks,
        debug: {
          selectedArchetypeWeightRoll: 0,
          selectedRootCategoryWeightRoll: 0,
          appliedDramaHookIds: [],
          distributionTags: ["opening:spiritual_root_only", "lock:spiritualRootFull"]
        }
      });
    }

    const categoryPick = selectCategory({
      input,
      registry: this.registry,
      archetype,
      categoryRng: streams.spiritualRoot
    });
    const category = categoryPick.category;
    const previousRoot = input.locks?.spiritualRootElements === true
      ? requirePreviousDraft(input, "spiritualRootElements").spiritualRoot
      : undefined;
    const elements = previousRoot === undefined
      ? rollElementVector(category, archetype, streams.elementVector, this.registry)
      : cloneElementVector(previousRoot);
    const relationship = analyzeRelationships(elementIdsFromVector(elements), this.registry);
    const metrics = rollMetrics(category, streams.metrics, relationship, this.registry);
    const spiritualRoot = buildSpiritualRootState({
      category,
      elements,
      metrics,
      relationship,
      registry: this.registry
    });
    const tags = buildDraftTags(spiritualRoot.tags);
    const draft: OpeningSpiritualRootDraft = {
      draftId: input.draftId,
      seed: input.seed,
      rerollIndex: input.rerollIndex,
      spiritualRoot,
      tags,
      distinctivenessScore: scoreSpiritualRootDistinctiveness(spiritualRoot),
      debug: {
        selectedArchetypeWeightRoll: 0,
        selectedRootCategoryWeightRoll: categoryPick.roll,
        appliedDramaHookIds: [],
        distributionTags: [
          "opening:spiritual_root_only",
          "distribution:three_float_bell",
          `archetype:${archetype.id}`,
          `rootCategory:${category.id}`
        ]
      },
      ...(input.locks === undefined ? {} : { locks: input.locks })
    };

    return deepFreeze(draft);
  }
}

export function generateOpeningSpiritualRootDraft(
  input: GenerateOpeningSpiritualRootInput,
  registry = loadOpeningGeneratorRegistry()
): OpeningSpiritualRootDraft {
  return new DefaultOpeningSpiritualRootGenerator(registry).generate(input);
}

function validateInput(input: GenerateOpeningSpiritualRootInput): void {
  if (input.seed.length === 0) {
    throw new Error("Opening spiritual root seed must not be empty");
  }
  if (input.draftId.length === 0) {
    throw new Error("Opening spiritual root draftId must not be empty");
  }
  if (!Number.isInteger(input.rerollIndex) || input.rerollIndex < 0) {
    throw new Error("Opening spiritual root rerollIndex must be a non-negative integer");
  }
  if (input.archetype.id.length === 0) {
    throw new Error("Opening spiritual root archetype id must not be empty");
  }
}

function createOpeningSpiritualRootRngStreams(seed: string, rerollIndex: number): OpeningSpiritualRootRngStreams {
  const root = new SeededRng(`${seed}:opening_spiritual_root:${rerollIndex}`, "opening_spiritual_root");
  return {
    spiritualRoot: root.fork("spiritualRoot"),
    elementVector: root.fork("elementVector"),
    metrics: root.fork("metrics")
  };
}

function selectCategory({
  input,
  registry,
  archetype,
  categoryRng
}: {
  readonly input: GenerateOpeningSpiritualRootInput;
  readonly registry: OpeningGeneratorRegistry;
  readonly archetype: AttributeArchetypeDefinition;
  readonly categoryRng: SeededRng;
}): CategoryPick {
  if (input.locks?.spiritualRootCategory === true || input.locks?.spiritualRootElements === true) {
    const previous = requirePreviousDraft(
      input,
      input.locks?.spiritualRootCategory === true ? "spiritualRootCategory" : "spiritualRootElements"
    );
    return {
      category: registry.getSpiritualRootCategory(previous.spiritualRoot.categoryId),
      roll: 0
    };
  }

  const modifiers = archetype.rootCategoryWeightModifiers ?? {};
  const choices = registry.rootCategories.map((category) => ({
    item: category,
    weight: category.weight * (modifiers[category.id] ?? 1)
  }));
  const picked = pickWeightedWithRoll(categoryRng, choices);

  return { category: picked.item, roll: picked.roll };
}

function rollElementVector(
  category: SpiritualRootCategoryDefinition,
  archetype: AttributeArchetypeDefinition,
  rng: SeededRng,
  registry: OpeningGeneratorRegistry
): ElementVectorResult {
  const allowedElements = category.allowedElements ?? registry.elements.map((element) => element.id);
  const elementCount = Math.min(
    allowedElements.length,
    rng.rangeInt(category.elementCount[0], category.elementCount[1])
  );
  const selectedElements = pickDistinctWeightedElements({
    rng,
    choices: allowedElements,
    archetype,
    registry,
    count: elementCount
  });
  const elements = allocateElementPercentages(selectedElements, rng);
  const ordered = orderElementsByWeight(elements);
  const latentRoot = category.hasLatentRoot === true
    ? pickLatentRoot(selectedElements, archetype, rng, registry)
    : undefined;

  return {
    elements,
    ...(ordered[0] === undefined ? {} : { primaryElement: ordered[0][0] }),
    secondaryElements: ordered.slice(1).map(([element]) => element),
    ...(latentRoot === undefined ? {} : { latentRoot })
  };
}

function pickDistinctWeightedElements({
  rng,
  choices,
  archetype,
  registry,
  count
}: {
  readonly rng: SeededRng;
  readonly choices: readonly ElementId[];
  readonly archetype: AttributeArchetypeDefinition;
  readonly registry: OpeningGeneratorRegistry;
  readonly count: number;
}): readonly ElementId[] {
  const remaining = [...choices];
  const selected: ElementId[] = [];

  while (selected.length < count && remaining.length > 0) {
    const picked = pickWeightedWithRoll(
      rng,
      remaining.map((elementId) => ({
        item: elementId,
        weight: elementWeight(elementId, archetype, registry)
      }))
    ).item;
    selected.push(picked);
    remaining.splice(remaining.indexOf(picked), 1);
  }

  return selected;
}

function pickLatentRoot(
  selectedElements: readonly ElementId[],
  archetype: AttributeArchetypeDefinition,
  rng: SeededRng,
  registry: OpeningGeneratorRegistry
): ElementId | undefined {
  const remaining = registry.elements
    .map((element) => element.id)
    .filter((elementId) => !selectedElements.includes(elementId));
  if (remaining.length === 0) {
    return undefined;
  }

  return pickWeightedWithRoll(
    rng,
    remaining.map((elementId) => ({
      item: elementId,
      weight: elementWeight(elementId, archetype, registry)
    }))
  ).item;
}

function elementWeight(elementId: ElementId, archetype: AttributeArchetypeDefinition, registry: OpeningGeneratorRegistry): number {
  const modifiers = registry.rootElementWeights.archetypeElementModifiers[archetype.id] ?? {};
  return registry.getBaseElementWeight(elementId) * (modifiers[elementId] ?? 1);
}

function allocateElementPercentages(selectedElements: readonly ElementId[], rng: SeededRng): ElementWeights {
  if (selectedElements.length === 0) {
    throw new Error("Opening spiritual root must select at least one element");
  }
  if (selectedElements.length === 1) {
    return { [selectedElements[0]!]: 100 };
  }

  const rawShares = selectedElements.map((element) => ({
    element,
    raw: 0.35 + rng.nextFloat01()
  }));
  const rawTotal = rawShares.reduce((sum, share) => sum + share.raw, 0);
  const exactShares = rawShares.map((share) => {
    const exact = (share.raw / rawTotal) * 100;
    return {
      element: share.element,
      value: Math.floor(exact),
      remainder: exact - Math.floor(exact)
    };
  });
  let remaining = 100 - exactShares.reduce((sum, share) => sum + share.value, 0);

  for (const share of [...exactShares].sort((first, second) => second.remainder - first.remainder)) {
    if (remaining <= 0) {
      break;
    }
    share.value += 1;
    remaining -= 1;
  }

  return Object.fromEntries(exactShares.map((share) => [share.element, share.value])) as ElementWeights;
}

function cloneElementVector(root: SpiritualRootState): ElementVectorResult {
  return {
    elements: cloneJson(root.elements),
    ...(root.primaryElement === undefined ? {} : { primaryElement: root.primaryElement }),
    secondaryElements: [...root.secondaryElements],
    ...(root.latentRoot === undefined ? {} : { latentRoot: root.latentRoot })
  };
}

function rollMetrics(
  category: SpiritualRootCategoryDefinition,
  rng: SeededRng,
  relationship: RelationshipAnalysis,
  registry: OpeningGeneratorRegistry
): Pick<SpiritualRootState, MetricKey> {
  const metrics = {} as Record<MetricKey, number>;
  const domains = registry.generationRules.statDomains;

  for (const key of METRIC_KEYS) {
    const [min, max] = category.metricRanges[key];
    metrics[key] = clampInteger(
      Math.round(min + bell01(rng) * (max - min)),
      domains.rootMetricMin,
      domains.rootMetricMax
    );
  }

  metrics.stability = clampInteger(metrics.stability + relationship.stabilityDelta, domains.rootMetricMin, domains.rootMetricMax);
  metrics.conflict = clampInteger(metrics.conflict + relationship.conflictDelta, domains.rootMetricMin, domains.rootMetricMax);
  metrics.breadth = clampInteger(metrics.breadth + relationship.breadthDelta, domains.rootMetricMin, domains.rootMetricMax);

  if (relationship.relationTags.includes("rootRelation:generating")) {
    metrics.conflict = Math.min(metrics.conflict, 35);
  }
  if (relationship.relationTags.includes("rootRelation:controlling")) {
    metrics.conflict = Math.max(metrics.conflict, 45);
  }

  return metrics;
}

function analyzeRelationships(elementIds: readonly ElementId[], registry: OpeningGeneratorRegistry): RelationshipAnalysis {
  const relationTags: string[] = [];
  let stabilityDelta = 0;
  let conflictDelta = 0;
  let breadthDelta = 0;

  if (containsAnyPair(elementIds, registry.rootElementWeights.relationships.generating)) {
    relationTags.push("rootRelation:generating");
    stabilityDelta += 8;
    conflictDelta -= 12;
    breadthDelta += 4;
  }
  if (containsAnyPair(elementIds, registry.rootElementWeights.relationships.controlling)) {
    relationTags.push("rootRelation:controlling");
    stabilityDelta -= 8;
    conflictDelta += 26;
    breadthDelta += 3;
  }

  for (const special of registry.rootElementWeights.relationships.special) {
    if (containsPair(elementIds, special.pair)) {
      relationTags.push(...special.tags);
      conflictDelta += special.conflictBonus;
    }
  }

  return {
    relationTags: uniqueStable(relationTags),
    stabilityDelta,
    conflictDelta,
    breadthDelta
  };
}

function buildSpiritualRootState({
  category,
  elements,
  metrics,
  relationship,
  registry
}: {
  readonly category: SpiritualRootCategoryDefinition;
  readonly elements: ElementVectorResult;
  readonly metrics: Pick<SpiritualRootState, MetricKey>;
  readonly relationship: RelationshipAnalysis;
  readonly registry: OpeningGeneratorRegistry;
}): SpiritualRootState {
  const elementTags = elementIdsFromVector(elements).flatMap((elementId) => registry.getElement(elementId).tags);
  const latentTags = elements.latentRoot === undefined ? [] : registry.getElement(elements.latentRoot).tags;
  const tags = uniqueStable([
    ...category.tags,
    ...elementTags,
    ...latentTags,
    ...relationship.relationTags
  ]);

  return {
    categoryId: category.id,
    displayName: category.name,
    elements: orderElementsObject(elements.elements),
    ...(elements.primaryElement === undefined ? {} : { primaryElement: elements.primaryElement }),
    secondaryElements: elements.secondaryElements,
    ...(elements.latentRoot === undefined ? {} : { latentRoot: elements.latentRoot }),
    purity: metrics.purity,
    stability: metrics.stability,
    conflict: metrics.conflict,
    breadth: metrics.breadth,
    relationTags: relationship.relationTags,
    tags
  };
}

function scoreSpiritualRootDistinctiveness(spiritualRoot: SpiritualRootState): number {
  let score = 0;

  if (RARE_ROOT_CATEGORY_IDS.has(spiritualRoot.categoryId)) {
    score += 2;
  }
  if (spiritualRoot.relationTags.includes("rootRelation:generating")) {
    score += 1;
  }
  if (spiritualRoot.relationTags.includes("rootRelation:controlling")) {
    score += 1;
  }
  if (spiritualRoot.relationTags.some((tag) => tag !== "rootRelation:generating" && tag !== "rootRelation:controlling")) {
    score += 1;
  }

  return score;
}

function buildDraftTags(tags: readonly string[]): OpeningDraftTags {
  return {
    destinyBiasTags: tags.filter((tag) => tag.startsWith("destinyBias:")),
    lifeEventBiasTags: tags.filter((tag) => tag.startsWith("lifeEvent:")),
    modeBiasTags: tags.filter((tag) => tag.startsWith("mode:")),
    hiddenFateBiasTags: tags.filter((tag) => tag.startsWith("hiddenFateBias:"))
  };
}

function requirePreviousDraft(
  input: GenerateOpeningSpiritualRootInput,
  lockName: keyof Pick<OpeningGenerationLocks, "spiritualRootCategory" | "spiritualRootElements" | "spiritualRootFull">
): OpeningSpiritualRootDraft {
  if (input.previousDraft === undefined) {
    throw new Error(`previousDraft is required when locking ${lockName}`);
  }
  return input.previousDraft;
}

function pickWeightedWithRoll<T>(
  rng: SeededRng,
  choices: readonly { readonly item: T; readonly weight: number }[]
): {
  readonly item: T;
  readonly roll: number;
} {
  const totalWeight = choices.reduce((sum, choice) => sum + Math.max(0, choice.weight), 0);
  if (choices.length === 0 || totalWeight <= 0) {
    throw new Error("Opening spiritual root weights must contain at least one positive choice");
  }

  const roll = rng.rangeFloat(0, totalWeight);
  let cumulative = 0;
  let fallback = choices[0]!.item;
  for (const choice of choices) {
    if (choice.weight > 0) {
      fallback = choice.item;
    }
    cumulative += Math.max(0, choice.weight);
    if (roll < cumulative) {
      return { item: choice.item, roll };
    }
  }
  return { item: fallback, roll };
}

function elementIdsFromVector(elements: ElementVectorResult): readonly ElementId[] {
  const elementIds = orderElementsByWeight(elements.elements).map(([elementId]) => elementId);
  if (elements.latentRoot !== undefined && !elementIds.includes(elements.latentRoot)) {
    return [...elementIds, elements.latentRoot];
  }
  return elementIds;
}

function orderElementsObject(elements: ElementWeights): ElementWeights {
  return Object.fromEntries(orderElementsByWeight(elements)) as ElementWeights;
}

function orderElementsByWeight(elements: ElementWeights): [ElementId, number][] {
  return (Object.entries(elements) as [ElementId, number | undefined][])
    .filter((entry): entry is [ElementId, number] => entry[1] !== undefined && entry[1] > 0)
    .sort(([firstId, firstValue], [secondId, secondValue]) => secondValue - firstValue || firstId.localeCompare(secondId));
}

function containsAnyPair(elementIds: readonly ElementId[], pairs: readonly (readonly [ElementId, ElementId])[]): boolean {
  return pairs.some((pair) => containsPair(elementIds, pair));
}

function containsPair(elementIds: readonly ElementId[], pair: readonly [ElementId, ElementId]): boolean {
  return elementIds.includes(pair[0]) && elementIds.includes(pair[1]);
}

function bell01(rng: SeededRng): number {
  return (rng.nextFloat01() + rng.nextFloat01() + rng.nextFloat01()) / 3;
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.trunc(Math.min(max, Math.max(min, value)));
}

function uniqueStable(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
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
