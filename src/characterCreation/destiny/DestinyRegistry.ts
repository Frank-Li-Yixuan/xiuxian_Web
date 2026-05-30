import conflictSynergyRulesData from "../../../data/destiny/conflict_synergy_rules.v0.1.json";
import destinyTraitsData from "../../../data/destiny/destiny_traits.v0.1.json";
import qualityTablesData from "../../../data/destiny/quality_tables.v0.1.json";
import rerollRulesData from "../../../data/destiny/reroll_rules.v0.1.json";
import type {
  CalamitySeverity,
  DestinyConflictSynergyRulesDataFile,
  DestinyDataBundle,
  DestinyExclusiveRule,
  DestinyQuality,
  DestinyQualityDefinition,
  DestinyQualityTablesDataFile,
  DestinyRerollRulesDataFile,
  DestinySlotType,
  DestinySynergyRule,
  DestinyTagConflictRule,
  DestinyTraitDataFile,
  DestinyTraitDefinition
} from "../../types/destiny-types.v0.1";

const DATA_FILE_NAMES = {
  qualityTables: "quality_tables",
  destinyTraits: "destiny_traits",
  conflictSynergyRules: "conflict_synergy_rules",
  rerollRules: "reroll_rules"
} as const;

const LEGAL_TRAIT_QUALITIES = new Set<DestinyQuality>([
  "mortal",
  "good",
  "rare",
  "mystic",
  "earthly",
  "heavenly",
  "defiant",
  "forbidden",
  "flaw"
]);
const LEGAL_SLOT_TYPES = new Set<DestinySlotType>(["main", "secondary", "flaw", "hidden"]);
const LEGAL_CALAMITY_SEVERITIES = new Set<CalamitySeverity>(["minor", "medium", "major", "death"]);
const SUPPORTED_LOCKABLE_FIELDS = new Set([
  "spiritualRoot",
  "mainDestiny",
  "secondaryDestiny0",
  "secondaryDestiny1",
  "flawDestiny",
  "backgroundOrigin",
  "hiddenFateHint",
  "carriedItem"
]);

export class DestinyRegistry {
  readonly traits: readonly DestinyTraitDefinition[];
  readonly qualities: readonly DestinyQualityDefinition[];
  readonly exclusiveRules: readonly DestinyExclusiveRule[];
  readonly synergyRules: readonly DestinySynergyRule[];
  readonly conflictRules: readonly DestinyTagConflictRule[];
  readonly rerollRules: DestinyRerollRulesDataFile;

  private readonly traitById: ReadonlyMap<string, DestinyTraitDefinition>;
  private readonly qualityById: ReadonlyMap<string, DestinyQualityDefinition>;
  private readonly traitsBySlot: ReadonlyMap<DestinySlotType, readonly DestinyTraitDefinition[]>;

  constructor(data: Required<DestinyDataBundle>) {
    this.traits = freezeArray(data.destinyTraits.traits);
    this.qualities = freezeArray(data.qualityTables.qualities);
    this.exclusiveRules = freezeArray(data.conflictSynergyRules.exclusiveRules);
    this.synergyRules = freezeArray(data.conflictSynergyRules.synergyRules);
    this.conflictRules = freezeArray(data.conflictSynergyRules.conflictRules);
    this.rerollRules = deepFreeze(cloneJson(data.rerollRules));
    this.traitById = indexById(this.traits);
    this.qualityById = indexById(this.qualities);
    this.traitsBySlot = buildTraitsBySlot(this.traits);
  }

  getTrait(id: string): DestinyTraitDefinition {
    const trait = this.traitById.get(id);
    if (trait === undefined) {
      throw new Error(`Missing destiny trait: ${id}`);
    }
    return trait;
  }

  getQuality(id: string): DestinyQualityDefinition {
    const quality = this.qualityById.get(id);
    if (quality === undefined) {
      throw new Error(`Missing destiny quality table entry: ${id}`);
    }
    return quality;
  }

  getTraitsForSlot(slotType: DestinySlotType): readonly DestinyTraitDefinition[] {
    return this.traitsBySlot.get(slotType) ?? [];
  }
}

export const DestinyDataRegistry = DestinyRegistry;

export function loadDestinyRegistry(): DestinyRegistry {
  return createDestinyRegistry({
    qualityTables: qualityTablesData as unknown as DestinyQualityTablesDataFile,
    destinyTraits: destinyTraitsData as unknown as DestinyTraitDataFile,
    conflictSynergyRules: conflictSynergyRulesData as unknown as DestinyConflictSynergyRulesDataFile,
    rerollRules: rerollRulesData as unknown as DestinyRerollRulesDataFile
  });
}

export function createDestinyRegistry(data: DestinyDataBundle): DestinyRegistry {
  const issues = validateDestinyData(data);
  if (issues.length > 0) {
    throw new Error(`Destiny data validation failed:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
  }
  return new DestinyRegistry(data as Required<DestinyDataBundle>);
}

export function validateDestinyData(data: DestinyDataBundle): string[] {
  const issues: string[] = [];
  const qualityTables = requireFile(data.qualityTables, DATA_FILE_NAMES.qualityTables, issues);
  const destinyTraits = requireFile(data.destinyTraits, DATA_FILE_NAMES.destinyTraits, issues);
  const conflictSynergyRules = requireFile(data.conflictSynergyRules, DATA_FILE_NAMES.conflictSynergyRules, issues);
  const rerollRules = requireFile(data.rerollRules, DATA_FILE_NAMES.rerollRules, issues);

  if (
    qualityTables === undefined ||
    destinyTraits === undefined ||
    conflictSynergyRules === undefined ||
    rerollRules === undefined
  ) {
    return issues;
  }

  const qualityIds = validateQualityTables(qualityTables, issues);
  const traitIds = validateDestinyTraits(destinyTraits, qualityIds, issues);
  validateConflictSynergyRules(conflictSynergyRules, traitIds, issues);
  validateRerollRules(rerollRules, issues);

  return issues;
}

function validateQualityTables(data: DestinyQualityTablesDataFile, issues: string[]): ReadonlySet<string> {
  if (!Array.isArray(data.qualities) || data.qualities.length === 0) {
    issues.push("quality_tables.qualities must contain at least one quality");
    return new Set();
  }

  const qualityIds = new Set<string>();
  const ranks = new Set<number>();
  for (const [index, quality] of data.qualities.entries()) {
    const path = `quality_tables.qualities[${index}]`;
    if (typeof quality.id !== "string" || quality.id.length === 0) {
      issues.push(`${path}.id must not be empty`);
    } else if (qualityIds.has(quality.id)) {
      issues.push(`duplicate destiny quality id: ${quality.id}`);
    } else if (!LEGAL_TRAIT_QUALITIES.has(quality.id as DestinyQuality) || quality.id === "flaw") {
      issues.push(`${path}.id is not a legal quality table id: ${quality.id}`);
      qualityIds.add(quality.id);
    } else {
      qualityIds.add(quality.id);
    }

    if (!Number.isInteger(quality.rank) || quality.rank <= 0) {
      issues.push(`${path}.rank must be a positive integer`);
    } else if (ranks.has(quality.rank)) {
      issues.push(`duplicate destiny quality rank: ${quality.rank}`);
    } else {
      ranks.add(quality.rank);
    }

    validateRange(`${path}.positiveBudget`, quality.positiveBudget, 0, Number.POSITIVE_INFINITY, issues);
    validateRange(`${path}.negativeBudget`, quality.negativeBudget, 0, Number.POSITIVE_INFINITY, issues);
  }

  validateQualityWeights("quality_tables.qualityWeights.main", data.qualityWeights?.main ?? {}, qualityIds, issues);
  validateQualityWeights("quality_tables.qualityWeights.secondary", data.qualityWeights?.secondary ?? {}, qualityIds, issues);
  validateSeverityWeights("quality_tables.qualityWeights.flawSeverity", data.qualityWeights?.flawSeverity ?? {}, issues);

  return qualityIds;
}

function validateDestinyTraits(
  data: DestinyTraitDataFile,
  qualityIds: ReadonlySet<string>,
  issues: string[]
): ReadonlySet<string> {
  if (!Array.isArray(data.traits) || data.traits.length === 0) {
    issues.push("destiny_traits.traits must contain at least one trait");
    return new Set();
  }

  const traitIds = new Set<string>();
  for (const [index, trait] of data.traits.entries()) {
    const path = `destiny_traits.traits[${index}]`;
    if (typeof trait.id !== "string" || trait.id.length === 0) {
      issues.push(`${path}.id must not be empty`);
    } else if (traitIds.has(trait.id)) {
      issues.push(`duplicate destiny trait id: ${trait.id}`);
    } else {
      traitIds.add(trait.id);
    }

    if (!LEGAL_TRAIT_QUALITIES.has(trait.quality)) {
      issues.push(`${path}.quality references unknown quality: ${String(trait.quality)}`);
    } else if (trait.quality !== "flaw" && !qualityIds.has(trait.quality)) {
      issues.push(`${path}.quality references missing quality table entry: ${trait.quality}`);
    }

    if (!Array.isArray(trait.slotTypes) || trait.slotTypes.length === 0) {
      issues.push(`${path}.slotTypes must contain at least one slot type`);
    } else {
      for (const [slotIndex, slotType] of trait.slotTypes.entries()) {
        if (!LEGAL_SLOT_TYPES.has(slotType)) {
          issues.push(`${path}.slotTypes[${slotIndex}] is not a legal destiny slot type: ${String(slotType)}`);
        }
      }
    }

    if (typeof trait.baseWeight !== "number" || !Number.isFinite(trait.baseWeight) || trait.baseWeight <= 0) {
      issues.push(`${path}.baseWeight must be > 0`);
    }
    if (trait.quality === "flaw") {
      if (trait.slotTypes.length !== 1 || trait.slotTypes[0] !== "flaw") {
        issues.push(`${trait.id} with quality flaw must only use slotTypes [flaw]`);
      }
      if (trait.calamitySeverity === undefined || !LEGAL_CALAMITY_SEVERITIES.has(trait.calamitySeverity)) {
        issues.push(`${trait.id} with quality flaw must define a legal calamitySeverity`);
      }
    } else if (trait.slotTypes.includes("flaw")) {
      issues.push(`${trait.id} must use quality flaw for the flaw slot`);
    }
    if (trait.calamitySeverity !== undefined && !LEGAL_CALAMITY_SEVERITIES.has(trait.calamitySeverity)) {
      issues.push(`${path}.calamitySeverity is not legal: ${String(trait.calamitySeverity)}`);
    }
  }

  validateSlotCoverage(data.traits, issues);
  return traitIds;
}

function validateConflictSynergyRules(
  data: DestinyConflictSynergyRulesDataFile,
  traitIds: ReadonlySet<string>,
  issues: string[]
): void {
  validateTraitRules("conflict_synergy_rules.exclusiveRules", data.exclusiveRules, traitIds, issues);
  validateTraitRules("conflict_synergy_rules.synergyRules", data.synergyRules, traitIds, issues);
  validateTagConflictRules(data.conflictRules, issues);
}

function validateTraitRules(
  path: string,
  rules: readonly { readonly id: string; readonly traits: readonly string[] }[],
  traitIds: ReadonlySet<string>,
  issues: string[]
): void {
  const ruleIds = new Set<string>();
  for (const [index, rule] of (rules ?? []).entries()) {
    const rulePath = `${path}[${index}]`;
    validateUniqueId(rule.id, ruleIds, "destiny rule id", `${rulePath}.id`, issues);
    if (!Array.isArray(rule.traits) || rule.traits.length < 2) {
      issues.push(`${rulePath}.traits must contain at least two trait ids`);
      continue;
    }
    for (const [traitIndex, traitId] of rule.traits.entries()) {
      if (!traitIds.has(traitId)) {
        issues.push(`${rulePath}.traits[${traitIndex}] references unknown trait id: ${traitId}`);
      }
    }
  }
}

function validateTagConflictRules(rules: readonly DestinyTagConflictRule[], issues: string[]): void {
  const ruleIds = new Set<string>();
  for (const [index, rule] of (rules ?? []).entries()) {
    const path = `conflict_synergy_rules.conflictRules[${index}]`;
    validateUniqueId(rule.id, ruleIds, "destiny conflict rule id", `${path}.id`, issues);
    const tags = Array.isArray(rule.tags) ? rule.tags.filter((tag) => typeof tag === "string" && tag.length > 0) : [];
    if (tags.length < 2) {
      issues.push(`${path}.tags must contain at least two tags`);
    }
  }
}

function validateRerollRules(data: DestinyRerollRulesDataFile, issues: string[]): void {
  validateNonNegativeNumber("reroll_rules.initialLocks", data.initialLocks, issues);
  validateNonNegativeNumber("reroll_rules.initialDivinationTokens", data.initialDivinationTokens, issues);
  validateNonNegativeNumber("reroll_rules.maxLockedFields", data.maxLockedFields, issues);
  validateLockableFields("reroll_rules.lockableFields", data.lockableFields, issues);
  validateLockableFields("reroll_rules.advancedLockableFields", data.advancedLockableFields, issues);
  validateNonNegativeNumber("reroll_rules.fateMeter.initial", data.fateMeter?.initial, issues);
  validateFiniteNumber("reroll_rules.fateMeter.noRareOrAboveDelta", data.fateMeter?.noRareOrAboveDelta, issues);
  validateFiniteNumber("reroll_rules.fateMeter.rareDelta", data.fateMeter?.rareDelta, issues);
  validateNonNegativeNumber("reroll_rules.fateMeter.thresholdBoost", data.fateMeter?.thresholdBoost, issues);
  validateNonNegativeNumber("reroll_rules.fateMeter.thresholdGuaranteeRare", data.fateMeter?.thresholdGuaranteeRare, issues);
  if ((data.fateMeter?.thresholdBoost ?? 0) > (data.fateMeter?.thresholdGuaranteeRare ?? 0)) {
    issues.push("reroll_rules.fateMeter.thresholdBoost must be <= thresholdGuaranteeRare");
  }
  validateNonNegativeNumber("reroll_rules.highQualityLimits.maxEarthlyOrAbovePerDraft", data.highQualityLimits?.maxEarthlyOrAbovePerDraft, issues);
  validateNonNegativeNumber("reroll_rules.highQualityLimits.maxForbiddenPerDraft", data.highQualityLimits?.maxForbiddenPerDraft, issues);
  validateNonNegativeNumber("reroll_rules.rerollHistory.recordLast", data.rerollHistory?.recordLast, issues);
  validateNonNegativeNumber("reroll_rules.rerollHistory.repetitionPenalty", data.rerollHistory?.repetitionPenalty, issues);
}

function validateSlotCoverage(traits: readonly DestinyTraitDefinition[], issues: string[]): void {
  for (const slotType of ["main", "secondary", "flaw"] as const) {
    if (!traits.some((trait) => trait.slotTypes.includes(slotType))) {
      issues.push(`destiny_traits.traits must include at least one ${slotType} trait`);
    }
  }
}

function validateQualityWeights(
  path: string,
  weights: Readonly<Record<string, number>>,
  qualityIds: ReadonlySet<string>,
  issues: string[]
): void {
  for (const [qualityId, weight] of Object.entries(weights)) {
    if (!qualityIds.has(qualityId)) {
      issues.push(`${path}.${qualityId} references unknown quality`);
    }
    validateNonNegativeNumber(`${path}.${qualityId}`, weight, issues);
  }
}

function validateSeverityWeights(path: string, weights: Readonly<Record<string, number>>, issues: string[]): void {
  for (const [severity, weight] of Object.entries(weights)) {
    if (!LEGAL_CALAMITY_SEVERITIES.has(severity as CalamitySeverity)) {
      issues.push(`${path}.${severity} references unknown calamity severity`);
    }
    validateNonNegativeNumber(`${path}.${severity}`, weight, issues);
  }
}

function validateLockableFields(path: string, fields: readonly string[], issues: string[]): void {
  if (!Array.isArray(fields)) {
    issues.push(`${path} must be an array`);
    return;
  }
  for (const [index, field] of fields.entries()) {
    if (!SUPPORTED_LOCKABLE_FIELDS.has(field)) {
      issues.push(`${path}[${index}] is not a supported lockable field: ${field}`);
    }
  }
}

function validateRange(path: string, value: readonly number[] | undefined, minDomain: number, maxDomain: number, issues: string[]): void {
  if (!Array.isArray(value) || value.length !== 2 || typeof value[0] !== "number" || typeof value[1] !== "number") {
    issues.push(`${path} must be a [min, max] number tuple`);
    return;
  }
  const [min, max] = value;
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    issues.push(`${path} must contain finite numbers`);
    return;
  }
  if (min > max) {
    issues.push(`${path} min must be <= max`);
  }
  if (min < minDomain || max > maxDomain) {
    issues.push(`${path} must stay within domain ${minDomain}..${maxDomain}`);
  }
}

function validateUniqueId(value: string, seen: Set<string>, label: string, path: string, issues: string[]): void {
  if (typeof value !== "string" || value.length === 0) {
    issues.push(`${path} must not be empty`);
    return;
  }
  if (seen.has(value)) {
    issues.push(`duplicate ${label}: ${value}`);
    return;
  }
  seen.add(value);
}

function validateFiniteNumber(path: string, value: unknown, issues: string[]): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push(`${path} must be a finite number`);
  }
}

function validateNonNegativeNumber(path: string, value: unknown, issues: string[]): void {
  validateFiniteNumber(path, value, issues);
  if (typeof value === "number" && Number.isFinite(value) && value < 0) {
    issues.push(`${path} must be >= 0`);
  }
}

function requireFile<T>(file: T | undefined, name: string, issues: string[]): T | undefined {
  if (file === undefined || file === null) {
    issues.push(`Missing destiny data file: ${name}`);
    return undefined;
  }
  return file;
}

function buildTraitsBySlot(traits: readonly DestinyTraitDefinition[]): ReadonlyMap<DestinySlotType, readonly DestinyTraitDefinition[]> {
  const entries = new Map<DestinySlotType, DestinyTraitDefinition[]>();
  for (const trait of traits) {
    for (const slotType of trait.slotTypes) {
      const existing = entries.get(slotType) ?? [];
      existing.push(trait);
      entries.set(slotType, existing);
    }
  }
  return new Map([...entries.entries()].map(([slotType, slotTraits]) => [slotType, Object.freeze([...slotTraits])]));
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
