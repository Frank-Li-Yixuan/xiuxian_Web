import attributeArchetypesData from "../../data/opening/attribute_archetypes.v0.1.json";
import generationRulesData from "../../data/opening/generation_rules.v0.1.json";
import rootElementWeightsData from "../../data/opening/root_element_weights.v0.1.json";
import spiritualRootsData from "../../data/opening/spiritual_roots.v0.1.json";
import type {
  AttributeArchetypeDefinition,
  ElementId,
  OpeningElementDefinition,
  OpeningAttributeArchetypesDataFile,
  OpeningGenerationRulesDefinition,
  OpeningGeneratorDataFiles,
  OpeningRootElementWeightsDefinition,
  OpeningSpiritualRootsDataFile,
  SpiritualRootCategoryDefinition
} from "../types/opening-generator-types.v0.1";

const DATA_FILE_NAMES = {
  attributeArchetypes: "attribute_archetypes",
  spiritualRoots: "spiritual_roots",
  rootElementWeights: "root_element_weights",
  generationRules: "generation_rules"
} as const;

const APTITUDE_KEYS = ["rootBone", "comprehension", "inspiration", "fortune", "heart", "lifespan"] as const;
const ROOT_METRIC_KEYS = ["purity", "stability", "conflict", "breadth"] as const;

export class OpeningGeneratorRegistry {
  readonly attributeArchetypes: readonly AttributeArchetypeDefinition[];
  readonly rootCategories: readonly SpiritualRootCategoryDefinition[];
  readonly elements: readonly OpeningElementDefinition[];
  readonly rootElementWeights: OpeningRootElementWeightsDefinition;
  readonly generationRules: OpeningGenerationRulesDefinition;

  private readonly attributeArchetypeById: ReadonlyMap<string, AttributeArchetypeDefinition>;
  private readonly rootCategoryById: ReadonlyMap<string, SpiritualRootCategoryDefinition>;
  private readonly elementById: ReadonlyMap<string, OpeningElementDefinition>;

  constructor(data: Required<OpeningGeneratorDataFiles>) {
    this.attributeArchetypes = freezeArray(data.attributeArchetypes.archetypes);
    this.rootCategories = freezeArray(data.spiritualRoots.rootCategories);
    this.elements = freezeArray(data.spiritualRoots.elements);
    this.rootElementWeights = deepFreeze(cloneJson(data.rootElementWeights));
    this.generationRules = deepFreeze(cloneJson(data.generationRules));
    this.attributeArchetypeById = indexById(this.attributeArchetypes);
    this.rootCategoryById = indexById(this.rootCategories);
    this.elementById = indexById(this.elements);
  }

  getAttributeArchetype(id: string): AttributeArchetypeDefinition {
    const archetype = this.attributeArchetypeById.get(id);
    if (archetype === undefined) {
      throw new Error(`Missing opening attribute archetype: ${id}`);
    }
    return archetype;
  }

  getSpiritualRootCategory(id: string): SpiritualRootCategoryDefinition {
    const category = this.rootCategoryById.get(id);
    if (category === undefined) {
      throw new Error(`Missing opening spiritual root category: ${id}`);
    }
    return category;
  }

  getElement(id: string): OpeningElementDefinition {
    const element = this.elementById.get(id);
    if (element === undefined) {
      throw new Error(`Missing opening element: ${id}`);
    }
    return element;
  }

  getBaseElementWeight(id: string): number {
    const weights = this.rootElementWeights.baseElementWeights as Readonly<Record<string, number>>;
    const weight = weights[id];
    if (weight === undefined) {
      throw new Error(`Missing opening base element weight: ${id}`);
    }
    return weight;
  }
}

export const OpeningDataRegistry = OpeningGeneratorRegistry;

export function loadOpeningGeneratorRegistry(): OpeningGeneratorRegistry {
  return createOpeningGeneratorRegistry({
    attributeArchetypes: attributeArchetypesData as unknown as OpeningAttributeArchetypesDataFile,
    spiritualRoots: spiritualRootsData as unknown as OpeningSpiritualRootsDataFile,
    rootElementWeights: rootElementWeightsData as unknown as OpeningRootElementWeightsDefinition,
    generationRules: generationRulesData as unknown as OpeningGenerationRulesDefinition
  });
}

export function createOpeningGeneratorRegistry(data: OpeningGeneratorDataFiles): OpeningGeneratorRegistry {
  const issues = validateOpeningGeneratorData(data);
  if (issues.length > 0) {
    throw new Error(`Opening generator data validation failed:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
  }
  return new OpeningGeneratorRegistry(data as Required<OpeningGeneratorDataFiles>);
}

export function validateOpeningGeneratorData(data: OpeningGeneratorDataFiles): string[] {
  const issues: string[] = [];
  const attributeArchetypes = requireFile(data.attributeArchetypes, DATA_FILE_NAMES.attributeArchetypes, issues);
  const spiritualRoots = requireFile(data.spiritualRoots, DATA_FILE_NAMES.spiritualRoots, issues);
  const rootElementWeights = requireFile(data.rootElementWeights, DATA_FILE_NAMES.rootElementWeights, issues);
  const generationRules = requireFile(data.generationRules, DATA_FILE_NAMES.generationRules, issues);

  if (attributeArchetypes === undefined || spiritualRoots === undefined || rootElementWeights === undefined || generationRules === undefined) {
    return issues;
  }

  const statDomains = generationRules.statDomains;
  const elementIds = new Set<string>();
  const archetypeIds = new Set<string>();

  if (!Array.isArray(attributeArchetypes.archetypes) || attributeArchetypes.archetypes.length === 0) {
    issues.push("attribute_archetypes.archetypes must contain at least one archetype");
  }
  if (!Array.isArray(spiritualRoots.rootCategories) || spiritualRoots.rootCategories.length === 0) {
    issues.push("spiritual_roots.rootCategories must contain at least one root category");
  }
  if (!Array.isArray(spiritualRoots.elements) || spiritualRoots.elements.length === 0) {
    issues.push("spiritual_roots.elements must contain at least one element");
  }

  for (const [index, archetype] of attributeArchetypes.archetypes.entries()) {
    const path = `attribute_archetypes.archetypes[${index}]`;
    validatePositiveWeight(`${path}.weight`, archetype.weight, issues);
    if (typeof archetype.id === "string" && archetype.id.length > 0) {
      archetypeIds.add(archetype.id);
    }
    for (const key of APTITUDE_KEYS) {
      validateRange({
        path: `${path}.aptitudeRanges.${key}`,
        range: archetype.aptitudeRanges?.[key],
        minDomain: statDomains.aptitudeMin,
        maxDomain: statDomains.aptitudeHardMax,
        issues
      });
    }
  }

  for (const [index, category] of spiritualRoots.rootCategories.entries()) {
    const path = `spiritual_roots.rootCategories[${index}]`;
    validatePositiveWeight(`${path}.weight`, category.weight, issues);
    validateRange({ path: `${path}.elementCount`, range: category.elementCount, minDomain: 1, maxDomain: Number.POSITIVE_INFINITY, issues });
    for (const key of ROOT_METRIC_KEYS) {
      validateRange({
        path: `${path}.metricRanges.${key}`,
        range: category.metricRanges?.[key],
        minDomain: statDomains.rootMetricMin,
        maxDomain: statDomains.rootMetricMax,
        issues
      });
    }
  }

  for (const [index, element] of spiritualRoots.elements.entries()) {
    if (typeof element.id !== "string" || element.id.length === 0) {
      issues.push(`spiritual_roots.elements[${index}].id is required`);
      continue;
    }
    elementIds.add(element.id);
  }

  for (const [elementId, weight] of Object.entries(rootElementWeights.baseElementWeights ?? {})) {
    validateElementReference(`root_element_weights.baseElementWeights.${elementId}`, elementId, elementIds, issues);
    validatePositiveWeight(`root_element_weights.baseElementWeights.${elementId}`, weight, issues);
  }

  for (const [archetypeId, modifiers] of Object.entries(rootElementWeights.archetypeElementModifiers ?? {})) {
    if (!archetypeIds.has(archetypeId)) {
      issues.push(`root_element_weights.archetypeElementModifiers.${archetypeId} references unknown archetype id`);
    }
    for (const [elementId, modifier] of Object.entries(modifiers ?? {})) {
      validateElementReference(`root_element_weights.archetypeElementModifiers.${archetypeId}.${elementId}`, elementId, elementIds, issues);
      validatePositiveWeight(`root_element_weights.archetypeElementModifiers.${archetypeId}.${elementId}`, modifier, issues);
    }
  }

  validateElementPairs("root_element_weights.relationships.generating", rootElementWeights.relationships?.generating ?? [], elementIds, issues);
  validateElementPairs("root_element_weights.relationships.controlling", rootElementWeights.relationships?.controlling ?? [], elementIds, issues);
  for (const [index, relationship] of (rootElementWeights.relationships?.special ?? []).entries()) {
    validateElementPair(`root_element_weights.relationships.special[${index}].pair`, relationship.pair, elementIds, issues);
  }

  return issues;
}

function requireFile<T>(file: T | undefined, name: string, issues: string[]): T | undefined {
  if (file === undefined || file === null) {
    issues.push(`Missing opening data file: ${name}`);
    return undefined;
  }
  return file;
}

function validatePositiveWeight(path: string, value: unknown, issues: string[]): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    issues.push(`${path} must be > 0`);
  }
}

function validateRange({
  path,
  range,
  minDomain,
  maxDomain,
  issues
}: {
  readonly path: string;
  readonly range: unknown;
  readonly minDomain: number;
  readonly maxDomain: number;
  readonly issues: string[];
}): void {
  if (!Array.isArray(range) || range.length !== 2 || typeof range[0] !== "number" || typeof range[1] !== "number") {
    issues.push(`${path} must be a [min, max] number tuple`);
    return;
  }
  const [min, max] = range;
  if (min > max) {
    issues.push(`${path} min must be <= max`);
  }
  if (min < minDomain || max > maxDomain) {
    issues.push(`${path} must stay within root metric domain ${minDomain}..${maxDomain}`);
  }
}

function validateElementPairs(path: string, pairs: readonly (readonly [string, string])[], elementIds: ReadonlySet<string>, issues: string[]): void {
  for (const [index, pair] of pairs.entries()) {
    validateElementPair(`${path}[${index}]`, pair, elementIds, issues);
  }
}

function validateElementPair(path: string, pair: readonly string[] | undefined, elementIds: ReadonlySet<string>, issues: string[]): void {
  if (!Array.isArray(pair) || pair.length !== 2) {
    issues.push(`${path} must be an element id pair`);
    return;
  }
  validateElementReference(`${path}[0]`, pair[0], elementIds, issues);
  validateElementReference(`${path}[1]`, pair[1], elementIds, issues);
}

function validateElementReference(path: string, elementId: string, elementIds: ReadonlySet<string>, issues: string[]): void {
  if (!elementIds.has(elementId)) {
    issues.push(`${path} references unknown element id`);
  }
}

function indexById<T extends { readonly id: string }>(entries: readonly T[]): ReadonlyMap<string, T> {
  return new Map(entries.map((entry) => [entry.id, deepFreeze(cloneJson(entry))]));
}

function freezeArray<T>(entries: readonly T[]): readonly T[] {
  return Object.freeze(entries.map((entry) => deepFreeze(cloneJson(entry))));
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
