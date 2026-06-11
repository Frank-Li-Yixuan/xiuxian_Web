import worldEventRulesData from "../../data/world/world_event_rules.v0.1.json";
import worldFactionsData from "../../data/world/world_factions.v0.1.json";
import worldGlossaryData from "../../data/world/world_glossary.v0.1.json";
import worldRegionsData from "../../data/world/world_regions.v0.1.json";
import type {
  AgeEventRestriction,
  EventTruthLevel,
  FactionDefinition,
  GameplayInterludeType,
  LifePhaseId,
  LocationDefinition,
  RegionDefinition,
  WorldEventRuleSet,
  WorldFactionsDataFile,
  WorldGlossaryDataFile,
  WorldLayerDefinition,
  WorldRegionsDataFile,
  WorldbuildingDataBundle
} from "../types/worldbuilding-types.v0.1";

const DATA_FILE_NAMES = {
  regions: "world_regions",
  factions: "world_factions",
  eventRules: "world_event_rules",
  glossary: "world_glossary"
} as const;

const SUPPORTED_VERSION = "0.1";
const DEFAULT_ALLOWED_GAMEPLAY_INTERLUDES: readonly GameplayInterludeType[] = Object.freeze(["none"]);

const LEGAL_LIFE_PHASES = new Set<LifePhaseId>([
  "infancy",
  "childhood",
  "youth",
  "adolescence",
  "awakening"
]);

const LEGAL_TRUTH_LEVELS = new Set<EventTruthLevel>([
  "mundane",
  "anomalous",
  "dream",
  "trial",
  "combat",
  "system_omen"
]);

const LEGAL_GAMEPLAY_INTERLUDES = new Set<GameplayInterludeType>([
  "none",
  "stg_short_dream",
  "stg_short",
  "stg",
  "horde_short",
  "horde",
  "deckbuilder_trial",
  "deckbuilder",
  "autochess_trial",
  "autochess"
]);

export class WorldbuildingRegistry {
  readonly worldId: string;
  readonly worldName: string;
  readonly startingRegionId: string;
  readonly layers: readonly WorldLayerDefinition[];
  readonly regions: readonly RegionDefinition[];
  readonly locations: readonly LocationDefinition[];
  readonly factions: readonly FactionDefinition[];
  readonly eventRules: WorldEventRuleSet;
  readonly glossary: WorldGlossaryDataFile;

  private readonly locationById: ReadonlyMap<string, LocationDefinition>;
  private readonly factionById: ReadonlyMap<string, FactionDefinition>;

  constructor(data: Required<WorldbuildingDataBundle>) {
    this.worldId = data.regions.worldId;
    this.worldName = data.regions.worldName;
    this.startingRegionId = data.regions.startingRegionId;
    this.layers = freezeArray(data.regions.layers);
    this.regions = freezeArray(data.regions.regions);
    this.locations = freezeArray(data.regions.locations);
    this.factions = freezeArray(data.factions.factions);
    this.eventRules = deepFreeze(cloneJson(data.eventRules));
    this.glossary = deepFreeze(cloneJson(data.glossary));
    this.locationById = indexById(this.locations);
    this.factionById = indexById(this.factions);
  }

  getLocation(id: string): LocationDefinition {
    const location = this.locationById.get(id);
    if (location === undefined) {
      throw new Error(`Missing world location: ${id}`);
    }
    return location;
  }

  getFaction(id: string): FactionDefinition {
    const faction = this.factionById.get(id);
    if (faction === undefined) {
      throw new Error(`Missing world faction: ${id}`);
    }
    return faction;
  }

  getAllowedTruthLevelsForAge(ageMonths: number): readonly EventTruthLevel[] {
    return this.getAgeRestriction(ageMonths).allowedTruthLevels;
  }

  getAllowedGameplayInterludesForAge(ageMonths: number): readonly GameplayInterludeType[] {
    return this.getAgeRestriction(ageMonths).allowedGameplayInterludes ?? DEFAULT_ALLOWED_GAMEPLAY_INTERLUDES;
  }

  getForbiddenModernTerms(): readonly string[] {
    return this.eventRules.forbiddenModernTerms;
  }

  private getAgeRestriction(ageMonths: number): AgeEventRestriction {
    if (!Number.isInteger(ageMonths) || ageMonths < 0) {
      throw new Error("ageMonths must be a non-negative integer");
    }
    const restriction = this.eventRules.ageRestrictions.find(({ ageRangeMonths }) => {
      const [minAgeMonths, maxAgeMonths] = ageRangeMonths;
      return ageMonths >= minAgeMonths && ageMonths <= maxAgeMonths;
    });
    if (restriction === undefined) {
      throw new Error(`Missing world age restriction for ageMonths: ${ageMonths}`);
    }
    return restriction;
  }
}

export function loadWorldbuildingRegistry(): WorldbuildingRegistry {
  return createWorldbuildingRegistry({
    regions: worldRegionsData as unknown as WorldRegionsDataFile,
    factions: worldFactionsData as unknown as WorldFactionsDataFile,
    eventRules: worldEventRulesData as unknown as WorldEventRuleSet,
    glossary: worldGlossaryData as unknown as WorldGlossaryDataFile
  });
}

export function createWorldbuildingRegistry(data: WorldbuildingDataBundle): WorldbuildingRegistry {
  const issues = validateWorldbuildingData(data);
  if (issues.length > 0) {
    throw new Error(`Worldbuilding data validation failed:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
  }
  return new WorldbuildingRegistry(data as Required<WorldbuildingDataBundle>);
}

export function validateWorldbuildingData(data: WorldbuildingDataBundle): string[] {
  const issues: string[] = [];
  const regions = requireFile(data.regions, DATA_FILE_NAMES.regions, issues);
  const factions = requireFile(data.factions, DATA_FILE_NAMES.factions, issues);
  const eventRules = requireFile(data.eventRules, DATA_FILE_NAMES.eventRules, issues);
  const glossary = requireFile(data.glossary, DATA_FILE_NAMES.glossary, issues);

  if (regions === undefined || factions === undefined || eventRules === undefined || glossary === undefined) {
    return issues;
  }

  const { layerIds, regionIds } = validateWorldRegions(regions, issues);
  validateWorldFactions(factions, issues);
  validateWorldEventRules(eventRules, issues);
  validateWorldGlossary(glossary, issues);

  if (regions.startingRegionId !== undefined && !regionIds.has(regions.startingRegionId)) {
    issues.push(`world_regions.startingRegionId references unknown region: ${String(regions.startingRegionId)}`);
  }
  validateLocationLayerReferences(regions.locations, layerIds, issues);

  return issues;
}

function validateWorldRegions(
  data: WorldRegionsDataFile,
  issues: string[]
): { readonly layerIds: ReadonlySet<string>; readonly regionIds: ReadonlySet<string> } {
  validateVersion(DATA_FILE_NAMES.regions, data.version, issues);
  validateNonEmptyString("world_regions.worldId", data.worldId, issues);
  validateNonEmptyString("world_regions.worldName", data.worldName, issues);
  validateNonEmptyString("world_regions.startingRegionId", data.startingRegionId, issues);

  const layerIds = new Set<string>();
  const layers = requireNonEmptyArray("world_regions.layers", data.layers, issues);
  for (const [index, layer] of layers.entries()) {
    const path = `world_regions.layers[${index}]`;
    validateUniqueId(layer.id, layerIds, "world layer id", `${path}.id`, issues);
    validateNonEmptyString(`${path}.name`, layer.name, issues);
    validateNonEmptyString(`${path}.description`, layer.description, issues);
    if (typeof layer.earlyLifeAllowed !== "boolean") {
      issues.push(`${path}.earlyLifeAllowed must be a boolean`);
    }
  }

  const regionIds = new Set<string>();
  const regions = requireNonEmptyArray("world_regions.regions", data.regions, issues);
  for (const [index, region] of regions.entries()) {
    const path = `world_regions.regions[${index}]`;
    validateUniqueId(region.id, regionIds, "world region id", `${path}.id`, issues);
    validateNonEmptyString(`${path}.name`, region.name, issues);
    if (region.parent !== undefined) {
      validateNonEmptyString(`${path}.parent`, region.parent, issues);
    }
    validateStringArray(`${path}.tags`, region.tags, issues);
    validateNonEmptyString(`${path}.description`, region.description, issues);
  }

  for (const [index, region] of regions.entries()) {
    if (region.parent !== undefined && region.parent.startsWith("region_") && !regionIds.has(region.parent)) {
      issues.push(`world_regions.regions[${index}].parent references unknown region: ${region.parent}`);
    }
  }

  const locationIds = new Set<string>();
  const locations = requireNonEmptyArray("world_regions.locations", data.locations, issues);
  for (const [index, location] of locations.entries()) {
    const path = `world_regions.locations[${index}]`;
    validateUniqueId(location.id, locationIds, "world location id", `${path}.id`, issues);
    validateNonEmptyString(`${path}.name`, location.name, issues);
    validateNonEmptyString(`${path}.layer`, location.layer, issues);
    validateStringArray(`${path}.tags`, location.tags, issues);
    validateLifePhases(`${path}.lifePhases`, location.lifePhases, issues);
    validateNonEmptyString(`${path}.description`, location.description, issues);
  }

  return { layerIds, regionIds };
}

function validateLocationLayerReferences(
  locations: readonly LocationDefinition[] | undefined,
  layerIds: ReadonlySet<string>,
  issues: string[]
): void {
  for (const [index, location] of (Array.isArray(locations) ? locations : []).entries()) {
    if (typeof location.layer === "string" && location.layer.length > 0 && !layerIds.has(location.layer)) {
      issues.push(`world_regions.locations[${index}].layer references unknown layer: ${location.layer}`);
    }
  }
}

function validateWorldFactions(data: WorldFactionsDataFile, issues: string[]): void {
  validateVersion(DATA_FILE_NAMES.factions, data.version, issues);
  const ids = new Set<string>();
  const factions = requireNonEmptyArray("world_factions.factions", data.factions, issues);
  for (const [index, faction] of factions.entries()) {
    const path = `world_factions.factions[${index}]`;
    validateUniqueId(faction.id, ids, "world faction id", `${path}.id`, issues);
    validateNonEmptyString(`${path}.name`, faction.name, issues);
    validateNonEmptyString(`${path}.type`, faction.type, issues);
    validateNonEmptyString(`${path}.visibilityInEarlyLife`, faction.visibilityInEarlyLife, issues);
    validateStringArray(`${path}.tags`, faction.tags, issues);
    validateNonEmptyString(`${path}.description`, faction.description, issues);
  }
}

function validateWorldEventRules(data: WorldEventRuleSet, issues: string[]): void {
  validateVersion(DATA_FILE_NAMES.eventRules, data.version, issues);
  const truthLevelIds = validateTruthLevels(data.truthLevels, issues);
  validateAgeRestrictions(data.ageRestrictions, truthLevelIds, issues);
  validateStringArray("world_event_rules.forbiddenModernTerms", data.forbiddenModernTerms, issues);
  validateStringArray("world_event_rules.requiredFieldsForEvents", data.requiredFieldsForEvents, issues);
  if (data.hiddenNameLeakForbidden !== true) {
    issues.push("world_event_rules.hiddenNameLeakForbidden must be true");
  }
}

function validateTruthLevels(
  truthLevels: WorldEventRuleSet["truthLevels"] | undefined,
  issues: string[]
): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const [index, truthLevel] of requireNonEmptyArray("world_event_rules.truthLevels", truthLevels, issues).entries()) {
    const path = `world_event_rules.truthLevels[${index}]`;
    const id = validateUniqueId(truthLevel.id, ids, "world truth level id", `${path}.id`, issues);
    if (id !== undefined && !LEGAL_TRUTH_LEVELS.has(id as EventTruthLevel)) {
      issues.push(`${path}.id is not a legal truth level: ${id}`);
    }
    validateNonEmptyString(`${path}.name`, truthLevel.name, issues);
    validateNonEmptyString(`${path}.description`, truthLevel.description, issues);
  }
  return ids;
}

function validateAgeRestrictions(
  ageRestrictions: readonly AgeEventRestriction[] | undefined,
  truthLevelIds: ReadonlySet<string>,
  issues: string[]
): void {
  const ranges: { readonly path: string; readonly min: number; readonly max: number }[] = [];
  const restrictions = requireNonEmptyArray("world_event_rules.ageRestrictions", ageRestrictions, issues);
  for (const [index, restriction] of restrictions.entries()) {
    const path = `world_event_rules.ageRestrictions[${index}]`;
    if (!LEGAL_LIFE_PHASES.has(restriction.phase)) {
      issues.push(`${path}.phase is not legal: ${String(restriction.phase)}`);
    }
    const range = validateAgeRange(`${path}.ageRangeMonths`, restriction.ageRangeMonths, issues);
    if (range !== undefined) {
      ranges.push({ path: `${path}.ageRangeMonths`, min: range[0], max: range[1] });
    }
    validateTruthLevelReferences(`${path}.allowedTruthLevels`, restriction.allowedTruthLevels, truthLevelIds, issues);
    if (restriction.allowedGameplayInterludes !== undefined) {
      validateGameplayInterludes(`${path}.allowedGameplayInterludes`, restriction.allowedGameplayInterludes, issues);
    }
    if (restriction.forbiddenGameplayInterludes !== undefined) {
      validateGameplayInterludes(`${path}.forbiddenGameplayInterludes`, restriction.forbiddenGameplayInterludes, issues);
    }
    validateNonEmptyString(`${path}.notes`, restriction.notes, issues);
  }
  validateAgeRangeOverlap(ranges, issues);
}

function validateWorldGlossary(data: WorldGlossaryDataFile, issues: string[]): void {
  validateVersion(DATA_FILE_NAMES.glossary, data.version, issues);
  if (data.preferredTerms === null || typeof data.preferredTerms !== "object" || Array.isArray(data.preferredTerms)) {
    issues.push("world_glossary.preferredTerms must be an object");
  } else {
    const entries = Object.entries(data.preferredTerms);
    if (entries.length === 0) {
      issues.push("world_glossary.preferredTerms must contain at least one term group");
    }
    for (const [key, terms] of entries) {
      validateNonEmptyString(`world_glossary.preferredTerms.${key}.key`, key, issues);
      validateStringArray(`world_glossary.preferredTerms.${key}`, terms, issues);
    }
  }
  validateStringArray("world_glossary.toneRules", data.toneRules, issues);
  validateStringArray("world_glossary.bannedTone", data.bannedTone, issues);
}

function validateTruthLevelReferences(
  path: string,
  truthLevels: readonly EventTruthLevel[] | undefined,
  truthLevelIds: ReadonlySet<string>,
  issues: string[]
): void {
  const values = requireNonEmptyArray(path, truthLevels, issues);
  for (const [index, truthLevel] of values.entries()) {
    if (typeof truthLevel !== "string" || truthLevel.length === 0) {
      issues.push(`${path}[${index}] must not be empty`);
    } else if (!truthLevelIds.has(truthLevel)) {
      issues.push(`${path}[${index}] references unknown truth level: ${truthLevel}`);
    }
  }
}

function validateGameplayInterludes(
  path: string,
  interludes: readonly GameplayInterludeType[] | undefined,
  issues: string[]
): void {
  const values = requireNonEmptyArray(path, interludes, issues);
  for (const [index, interlude] of values.entries()) {
    if (!LEGAL_GAMEPLAY_INTERLUDES.has(interlude)) {
      issues.push(`${path}[${index}] is not a legal gameplay interlude: ${String(interlude)}`);
    }
  }
}

function validateLifePhases(path: string, phases: readonly LifePhaseId[] | undefined, issues: string[]): void {
  const values = requireNonEmptyArray(path, phases, issues);
  for (const [index, phase] of values.entries()) {
    if (!LEGAL_LIFE_PHASES.has(phase)) {
      issues.push(`${path}[${index}] is not a legal life phase: ${String(phase)}`);
    }
  }
}

function validateAgeRange(
  path: string,
  value: readonly number[] | undefined,
  issues: string[]
): readonly [number, number] | undefined {
  if (!Array.isArray(value) || value.length !== 2 || !Number.isInteger(value[0]) || !Number.isInteger(value[1])) {
    issues.push(`${path} must be a [min, max] integer tuple`);
    return undefined;
  }
  const [min, max] = value;
  if (min < 0 || max < 0) {
    issues.push(`${path} must be non-negative`);
  }
  if (min > max) {
    issues.push(`${path} min must be <= max`);
    return undefined;
  }
  return [min, max];
}

function validateAgeRangeOverlap(
  ranges: readonly { readonly path: string; readonly min: number; readonly max: number }[],
  issues: string[]
): void {
  const sorted = [...ranges].sort((a, b) => a.min - b.min || a.max - b.max);
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (previous !== undefined && current !== undefined && current.min <= previous.max) {
      issues.push(`${current.path} overlaps ${previous.path}`);
    }
  }
}

function validateVersion(fileName: string, version: unknown, issues: string[]): void {
  if (version !== SUPPORTED_VERSION) {
    issues.push(`${fileName}.version must be "${SUPPORTED_VERSION}"`);
  }
}

function validateUniqueId(
  value: unknown,
  seen: Set<string>,
  label: string,
  path: string,
  issues: string[]
): string | undefined {
  if (typeof value !== "string" || value.length === 0) {
    issues.push(`${path} must not be empty`);
    return undefined;
  }
  if (seen.has(value)) {
    issues.push(`duplicate ${label}: ${value}`);
    return value;
  }
  seen.add(value);
  return value;
}

function validateStringArray(path: string, value: readonly string[] | undefined, issues: string[]): void {
  const values = requireNonEmptyArray(path, value, issues);
  for (const [index, item] of values.entries()) {
    validateNonEmptyString(`${path}[${index}]`, item, issues);
  }
}

function requireNonEmptyArray<T>(path: string, value: readonly T[] | undefined, issues: string[]): readonly T[] {
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array`);
    return [];
  }
  if (value.length === 0) {
    issues.push(`${path} must contain at least one string`);
  }
  return value;
}

function validateNonEmptyString(path: string, value: unknown, issues: string[]): void {
  if (typeof value !== "string" || value.length === 0) {
    issues.push(`${path} must not be empty`);
  }
}

function requireFile<T>(file: T | undefined, name: string, issues: string[]): T | undefined {
  if (file === undefined || file === null) {
    issues.push(`Missing worldbuilding data file: ${name}`);
    return undefined;
  }
  return file;
}

function indexById<T extends { readonly id: string }>(entries: readonly T[]): ReadonlyMap<string, T> {
  return new Map(entries.map((entry) => [entry.id, entry]));
}

function freezeArray<T>(entries: readonly T[]): readonly T[] {
  return Object.freeze(entries.map((entry) => deepFreeze(cloneJson(entry))));
}

function cloneJson<T>(value: T): T {
  return structuredClone(value);
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
