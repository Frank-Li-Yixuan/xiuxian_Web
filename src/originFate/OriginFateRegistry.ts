import backgroundOriginsData from "../../data/origin_fate/background_origins.v0.1.json";
import carriedItemsData from "../../data/origin_fate/carried_items.v0.1.json";
import generationRulesData from "../../data/origin_fate/generation_rules.v0.1.json";
import hiddenFatesData from "../../data/origin_fate/hidden_fates.v0.1.json";
import revealRulesData from "../../data/origin_fate/reveal_rules.v0.1.json";
import type {
  BackgroundOriginDataFile,
  BackgroundOriginDefinition,
  CarriedItemConversionType,
  CarriedItemDataFile,
  CarriedItemDefinition,
  HiddenFateCategory,
  HiddenFateDataFile,
  HiddenFateDefinition,
  OriginFateDataBundle,
  OriginFateGenerationRulesDataFile,
  OriginFateRevealRulesDataFile,
  OriginRarity
} from "../types/origin-fate-types.v0.1";

const DATA_FILE_NAMES = {
  backgroundOrigins: "background_origins",
  hiddenFates: "hidden_fates",
  carriedItems: "carried_items",
  generationRules: "generation_rules",
  revealRules: "reveal_rules"
} as const;

const LEGAL_RARITIES = new Set<OriginRarity>(["common", "uncommon", "rare", "epic", "legendary", "mythic"]);
const LEGAL_HIDDEN_FATE_CATEGORIES = new Set<HiddenFateCategory>([
  "bloodline",
  "pastLife",
  "curseSeal",
  "karmicSeed",
  "systemResonance",
  "karmicObject"
]);
const LEGAL_CARRIED_ITEM_CONVERSION_TYPES = new Set<CarriedItemConversionType>([
  "artifact_clue",
  "treasure_fragment",
  "dongfu_building_bonus",
  "spell_clue",
  "talisman",
  "forbidden_clue",
  "karmic_memory",
  "fortune_token",
  "combat_training",
  "ritual_clue",
  "method_clue",
  "minor_treasure_clue"
]);

export class OriginFateRegistry {
  readonly backgroundOrigins: readonly BackgroundOriginDefinition[];
  readonly hiddenFates: readonly HiddenFateDefinition[];
  readonly carriedItems: readonly CarriedItemDefinition[];
  readonly generationRules: OriginFateGenerationRulesDataFile;
  readonly revealRules: OriginFateRevealRulesDataFile;

  private readonly backgroundOriginById: ReadonlyMap<string, BackgroundOriginDefinition>;
  private readonly hiddenFateById: ReadonlyMap<string, HiddenFateDefinition>;
  private readonly carriedItemById: ReadonlyMap<string, CarriedItemDefinition>;

  constructor(data: Required<OriginFateDataBundle>) {
    this.backgroundOrigins = freezeArray(data.backgroundOrigins.origins);
    this.hiddenFates = freezeArray(data.hiddenFates.hiddenFates);
    this.carriedItems = freezeArray(data.carriedItems.items);
    this.generationRules = deepFreeze(cloneJson(data.generationRules));
    this.revealRules = deepFreeze(cloneJson(data.revealRules));
    this.backgroundOriginById = indexById(this.backgroundOrigins);
    this.hiddenFateById = indexById(this.hiddenFates);
    this.carriedItemById = indexById(this.carriedItems);
  }

  getBackgroundOrigin(id: string): BackgroundOriginDefinition {
    const origin = this.backgroundOriginById.get(id);
    if (origin === undefined) {
      throw new Error(`Missing background origin: ${id}`);
    }
    return origin;
  }

  listBackgroundOrigins(): readonly BackgroundOriginDefinition[] {
    return this.backgroundOrigins;
  }

  getHiddenFate(id: string): HiddenFateDefinition {
    const hiddenFate = this.hiddenFateById.get(id);
    if (hiddenFate === undefined) {
      throw new Error(`Missing hidden fate: ${id}`);
    }
    return hiddenFate;
  }

  listHiddenFates(): readonly HiddenFateDefinition[] {
    return this.hiddenFates;
  }

  getCarriedItem(id: string): CarriedItemDefinition {
    const item = this.carriedItemById.get(id);
    if (item === undefined) {
      throw new Error(`Missing carried item: ${id}`);
    }
    return item;
  }

  listCarriedItems(): readonly CarriedItemDefinition[] {
    return this.carriedItems;
  }
}

export function loadOriginFateRegistry(): OriginFateRegistry {
  return createOriginFateRegistry({
    backgroundOrigins: backgroundOriginsData as unknown as BackgroundOriginDataFile,
    hiddenFates: hiddenFatesData as unknown as HiddenFateDataFile,
    carriedItems: carriedItemsData as unknown as CarriedItemDataFile,
    generationRules: generationRulesData as unknown as OriginFateGenerationRulesDataFile,
    revealRules: revealRulesData as unknown as OriginFateRevealRulesDataFile
  });
}

export function createOriginFateRegistry(data: OriginFateDataBundle): OriginFateRegistry {
  const issues = validateOriginFateData(data);
  if (issues.length > 0) {
    throw new Error(`Origin fate data validation failed:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
  }
  return new OriginFateRegistry(data as Required<OriginFateDataBundle>);
}

export function validateOriginFateData(data: OriginFateDataBundle): string[] {
  const issues: string[] = [];
  const backgroundOrigins = requireFile(data.backgroundOrigins, DATA_FILE_NAMES.backgroundOrigins, issues);
  const hiddenFates = requireFile(data.hiddenFates, DATA_FILE_NAMES.hiddenFates, issues);
  const carriedItems = requireFile(data.carriedItems, DATA_FILE_NAMES.carriedItems, issues);
  const generationRules = requireFile(data.generationRules, DATA_FILE_NAMES.generationRules, issues);
  const revealRules = requireFile(data.revealRules, DATA_FILE_NAMES.revealRules, issues);

  if (
    backgroundOrigins === undefined ||
    hiddenFates === undefined ||
    carriedItems === undefined ||
    generationRules === undefined ||
    revealRules === undefined
  ) {
    return issues;
  }

  validateBackgroundOrigins(backgroundOrigins, issues);
  validateHiddenFates(hiddenFates, issues);
  validateCarriedItems(carriedItems, issues);
  validateGenerationRules(generationRules, issues);
  validateRevealRules(revealRules, issues);

  return issues;
}

function validateBackgroundOrigins(data: BackgroundOriginDataFile, issues: string[]): void {
  const origins = Array.isArray(data.origins) ? data.origins : [];
  if (origins.length === 0) {
    issues.push("origin_fate.background_origins.origins must contain at least one background origin");
    return;
  }

  const ids = new Set<string>();
  for (const [index, origin] of origins.entries()) {
    const path = `origin_fate.background_origins.origins[${index}]`;
    validateUniqueId(origin.id, ids, "background origin id", `${path}.id`, issues);
    validateRarity(`${path}.rarity`, origin.rarity, issues);
    validatePositiveNumber(`${path}.baseWeight`, origin.baseWeight, issues);
  }
}

function validateHiddenFates(data: HiddenFateDataFile, issues: string[]): void {
  const hiddenFates = Array.isArray(data.hiddenFates) ? data.hiddenFates : [];
  if (hiddenFates.length === 0) {
    issues.push("origin_fate.hidden_fates.hiddenFates must contain at least one hidden fate");
    return;
  }

  const ids = new Set<string>();
  for (const [index, hiddenFate] of hiddenFates.entries()) {
    const path = `origin_fate.hidden_fates.hiddenFates[${index}]`;
    validateUniqueId(hiddenFate.id, ids, "hidden fate id", `${path}.id`, issues);
    validateRarity(`${path}.rarity`, hiddenFate.rarity, issues);
    validatePositiveNumber(`${path}.baseWeight`, hiddenFate.baseWeight, issues);
    if (!LEGAL_HIDDEN_FATE_CATEGORIES.has(hiddenFate.category)) {
      issues.push(`${path}.category is not legal: ${String(hiddenFate.category)}`);
    }
    validateRange(`${path}.initialProgressRange`, hiddenFate.initialProgressRange, 0, 100, issues);
    validateOmenHints(`${path}.omenHints`, hiddenFate.omenHints, issues);
    validateRevealThresholds(`${path}.revealThresholds`, hiddenFate.revealThresholds, issues);
    validateProgressSources(`${path}.progressSources`, hiddenFate.progressSources, issues);
    validateModeEffects(`${path}.outerBattlefieldEffects`, hiddenFate.outerBattlefieldEffects, issues);
  }
}

function validateCarriedItems(data: CarriedItemDataFile, issues: string[]): void {
  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) {
    issues.push("origin_fate.carried_items.items must contain at least one carried item");
    return;
  }

  const ids = new Set<string>();
  for (const [index, item] of items.entries()) {
    const path = `origin_fate.carried_items.items[${index}]`;
    validateUniqueId(item.id, ids, "carried item id", `${path}.id`, issues);
    validateRarity(`${path}.rarity`, item.rarity, issues);
    validatePositiveNumber(`${path}.baseWeight`, item.baseWeight, issues);
    validateCarriedItemConversion(`${path}.eighteenConversion`, item.eighteenConversion, issues);
  }
}

function validateGenerationRules(data: OriginFateGenerationRulesDataFile, issues: string[]): void {
  if (!Array.isArray(data.pipeline) || data.pipeline.length === 0) {
    issues.push("origin_fate.generation_rules.pipeline must contain at least one step");
  }
  validateAtLeast("origin_fate.generation_rules.backgroundOrigin.count", data.backgroundOrigin?.count, 1, issues);
  if (data.hiddenFate?.alwaysGenerateInternally !== true) {
    issues.push("origin_fate.generation_rules.hiddenFate.alwaysGenerateInternally must be true");
  }
  validateAtLeast("origin_fate.generation_rules.carriedItems.minCount", data.carriedItems?.minCount, 0, issues);
  validateAtLeast("origin_fate.generation_rules.carriedItems.maxCount", data.carriedItems?.maxCount, 0, issues);
  if (
    typeof data.carriedItems?.minCount === "number" &&
    typeof data.carriedItems?.maxCount === "number" &&
    data.carriedItems.maxCount < data.carriedItems.minCount
  ) {
    issues.push("origin_fate.generation_rules.carriedItems.maxCount must be >= minCount");
  }
  if (data.determinism?.forbidMathRandom !== true) {
    issues.push("origin_fate.generation_rules.determinism.forbidMathRandom must be true");
  }
  validateRange(
    "origin_fate.generation_rules.hiddenFate.progressRoll.defaultRange",
    data.hiddenFate?.progressRoll?.defaultRange,
    0,
    100,
    issues
  );
  validateRange(
    "origin_fate.generation_rules.hiddenFate.progressRoll.rareHighProgressRange",
    data.hiddenFate?.progressRoll?.rareHighProgressRange,
    0,
    100,
    issues
  );
}

function validateRevealRules(data: OriginFateRevealRulesDataFile, issues: string[]): void {
  const progressBands = Array.isArray(data.progressBands) ? data.progressBands : [];
  if (progressBands.length === 0) {
    issues.push("origin_fate.reveal_rules.progressBands must contain at least one progress band");
    return;
  }

  const ids = new Set<string>();
  for (const [index, band] of progressBands.entries()) {
    const path = `origin_fate.reveal_rules.progressBands[${index}]`;
    validateUniqueId(band.id, ids, "origin fate progress band id", `${path}.id`, issues);
    validateRange(`${path}.range`, band.range, 0, 100, issues);
  }

  for (const [bandId, chance] of Object.entries(data.age18RevealFormula?.baseRevealChanceByBand ?? {})) {
    validateDomainNumber(`origin_fate.reveal_rules.age18RevealFormula.baseRevealChanceByBand.${bandId}`, chance, 0, 1, issues);
  }
}

function validateCarriedItemConversion(path: string, conversion: CarriedItemDefinition["eighteenConversion"] | undefined, issues: string[]): void {
  if (conversion === undefined || conversion === null) {
    issues.push(`${path} must exist`);
    return;
  }
  if (!LEGAL_CARRIED_ITEM_CONVERSION_TYPES.has(conversion.type)) {
    issues.push(`${path}.type is not legal: ${String(conversion.type)}`);
  }
  validateNonEmptyString(`${path}.label`, conversion.label, issues);
  validateNonEmptyString(`${path}.outerBattlefieldEffect`, conversion.outerBattlefieldEffect, issues);
  validateNonEmptyString(`${path}.dongfuHook`, conversion.dongfuHook, issues);
}

function validateOmenHints(path: string, hints: readonly string[], issues: string[]): void {
  const validHints = Array.isArray(hints) ? hints.filter((hint) => typeof hint === "string" && hint.length > 0) : [];
  if (validHints.length === 0) {
    issues.push(`${path} must contain at least one hint`);
  }
}

function validateRevealThresholds(path: string, thresholds: HiddenFateDefinition["revealThresholds"], issues: string[]): void {
  for (const key of ["hintOnly", "suspicious", "halfAwakened", "awakened"] as const) {
    validateDomainNumber(`${path}.${key}`, thresholds?.[key], 0, 100, issues);
  }
}

function validateProgressSources(path: string, sources: HiddenFateDefinition["progressSources"], issues: string[]): void {
  for (const [index, source] of (sources ?? []).entries()) {
    validateNonEmptyString(`${path}[${index}].sourceTag`, source.sourceTag, issues);
    validateFiniteNumber(`${path}[${index}].delta`, source.delta, issues);
  }
}

function validateModeEffects(path: string, effects: HiddenFateDefinition["outerBattlefieldEffects"], issues: string[]): void {
  for (const [index, effect] of (effects ?? []).entries()) {
    validateDomainNumber(`${path}[${index}].threshold`, effect.threshold, 0, 100, issues);
    validateNonEmptyString(`${path}[${index}].effect`, effect.effect, issues);
  }
}

function validateRarity(path: string, rarity: OriginRarity, issues: string[]): void {
  if (!LEGAL_RARITIES.has(rarity)) {
    issues.push(`${path} is not legal: ${String(rarity)}`);
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

function validateAtLeast(path: string, value: unknown, minimum: number, issues: string[]): void {
  validateFiniteNumber(path, value, issues);
  if (typeof value === "number" && Number.isFinite(value) && value < minimum) {
    issues.push(`${path} must be >= ${minimum}`);
  }
}

function validatePositiveNumber(path: string, value: unknown, issues: string[]): void {
  validateFiniteNumber(path, value, issues);
  if (typeof value === "number" && Number.isFinite(value) && value <= 0) {
    issues.push(`${path} must be > 0`);
  }
}

function validateDomainNumber(path: string, value: unknown, minDomain: number, maxDomain: number, issues: string[]): void {
  validateFiniteNumber(path, value, issues);
  if (typeof value === "number" && Number.isFinite(value) && (value < minDomain || value > maxDomain)) {
    issues.push(`${path} must stay within domain ${minDomain}..${maxDomain}`);
  }
}

function validateFiniteNumber(path: string, value: unknown, issues: string[]): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push(`${path} must be a finite number`);
  }
}

function validateNonEmptyString(path: string, value: unknown, issues: string[]): void {
  if (typeof value !== "string" || value.length === 0) {
    issues.push(`${path} must not be empty`);
  }
}

function requireFile<T>(file: T | undefined, name: string, issues: string[]): T | undefined {
  if (file === undefined || file === null) {
    issues.push(`Missing origin fate data file: ${name}`);
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
