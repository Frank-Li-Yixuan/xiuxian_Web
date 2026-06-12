import carriedItemNarrativeChainsData from "../../data/origin_fate_v02/carried_item_narrative_chains.v0.2.json";
import hiddenFateDefinitionsData from "../../data/origin_fate_v02/hidden_fate_definitions.v0.2.json";
import omenPhraseBankData from "../../data/origin_fate_v02/omen_phrase_bank.v0.2.json";
import originItemHiddenSynergyRulesData from "../../data/origin_fate_v02/origin_item_hidden_synergy_rules.v0.2.json";
import originStorylineDefinitionsData from "../../data/origin_fate_v02/origin_storyline_definitions.v0.2.json";
import revealStageRulesData from "../../data/origin_fate_v02/reveal_stage_rules.v0.2.json";
import type {
  CarriedItemLifecycleStage,
  CarriedItemNarrativeChainsDataFileV02,
  CarriedItemNarrativeDefinitionV02,
  HiddenFateCategory,
  HiddenFateDefinitionV02,
  HiddenFateDefinitionsDataFileV02,
  HiddenFateRarity,
  HiddenFateRevealBand,
  Id,
  OmenPhraseBankDataFileV02,
  OmenPhraseDefinitionV02,
  OriginFateNarrativeDataBundle,
  OriginFateNarrativeRevealBandRuleV02,
  OriginFateNarrativeSynergyEffectType,
  OriginItemHiddenSynergyRuleV02,
  OriginItemHiddenSynergyRulesDataFileV02,
  OriginStorylineDefinitionV02,
  OriginStorylineDefinitionsDataFileV02,
  RevealStageRulesDataFileV02
} from "../types/origin-fate-narrative-types.v0.2";

const DATA_FILE_NAMES = {
  hiddenFates: "hidden_fate_definitions",
  originStorylines: "origin_storyline_definitions",
  carriedItems: "carried_item_narrative_chains",
  revealStageRules: "reveal_stage_rules",
  omenPhraseBank: "omen_phrase_bank",
  synergyRules: "origin_item_hidden_synergy_rules"
} as const;

const SUPPORTED_VERSION = "0.2";

const HIDDEN_FATE_CATEGORIES = new Set<string>([
  "bloodline",
  "pastLife",
  "curseSeal",
  "karmicSeed",
  "systemResonance",
  "karmicObject",
  "battlefieldEcho",
  "falseOmen"
] satisfies readonly HiddenFateCategory[]);
const HIDDEN_FATE_RARITIES = new Set<string>(["minor", "rare", "epic", "legendary", "forbidden"] satisfies readonly HiddenFateRarity[]);
const REQUIRED_ITEM_LIFECYCLE_STAGES = ["obtained", "noticed", "converted"] as const satisfies readonly CarriedItemLifecycleStage[];
const LEGAL_SYNERGY_EFFECT_TYPES = new Set<string>([
  "progressBonus",
  "itemAffinityBonus",
  "unlockThread",
  "riskBonus",
  "age18Hook"
] satisfies readonly OriginFateNarrativeSynergyEffectType[]);

export class OriginFateNarrativeRegistry {
  readonly hiddenFates: readonly HiddenFateDefinitionV02[];
  readonly originStorylines: readonly OriginStorylineDefinitionV02[];
  readonly carriedItems: readonly CarriedItemNarrativeDefinitionV02[];
  readonly revealBands: readonly OriginFateNarrativeRevealBandRuleV02[];
  readonly revealStageRules: RevealStageRulesDataFileV02;
  readonly omenPhrases: readonly OmenPhraseDefinitionV02[];
  readonly synergyRules: readonly OriginItemHiddenSynergyRuleV02[];

  private readonly hiddenFateById: ReadonlyMap<string, HiddenFateDefinitionV02>;
  private readonly originStorylineById: ReadonlyMap<string, OriginStorylineDefinitionV02>;
  private readonly carriedItemById: ReadonlyMap<string, CarriedItemNarrativeDefinitionV02>;
  private readonly revealBandById: ReadonlyMap<string, OriginFateNarrativeRevealBandRuleV02>;
  private readonly omenPhraseById: ReadonlyMap<string, OmenPhraseDefinitionV02>;
  private readonly synergyRuleById: ReadonlyMap<string, OriginItemHiddenSynergyRuleV02>;

  constructor(data: Required<OriginFateNarrativeDataBundle>) {
    this.hiddenFates = freezeArray(data.hiddenFates);
    this.originStorylines = freezeArray(data.originStorylines);
    this.carriedItems = freezeArray(data.carriedItems);
    this.revealStageRules = deepFreeze(cloneJson(data.revealStageRules));
    this.revealBands = freezeArray(data.revealStageRules.progressBands);
    this.omenPhrases = freezeArray(data.omenPhraseBank.phrases);
    this.synergyRules = freezeArray(data.synergyRules.rules);
    this.hiddenFateById = indexById(this.hiddenFates);
    this.originStorylineById = indexById(this.originStorylines);
    this.carriedItemById = indexById(this.carriedItems);
    this.revealBandById = indexById(this.revealBands);
    this.omenPhraseById = indexById(this.omenPhrases);
    this.synergyRuleById = indexById(this.synergyRules);
  }

  getHiddenFate(id: string): HiddenFateDefinitionV02 {
    const hiddenFate = this.hiddenFateById.get(id);
    if (hiddenFate === undefined) {
      throw new Error(`Missing origin fate v0.2 hidden fate: ${id}`);
    }
    return hiddenFate;
  }

  getOriginStoryline(id: string): OriginStorylineDefinitionV02 {
    const origin = this.originStorylineById.get(id);
    if (origin === undefined) {
      throw new Error(`Missing origin fate v0.2 storyline: ${id}`);
    }
    return origin;
  }

  getCarriedItemNarrative(id: string): CarriedItemNarrativeDefinitionV02 {
    const item = this.carriedItemById.get(id);
    if (item === undefined) {
      throw new Error(`Missing origin fate v0.2 carried item narrative: ${id}`);
    }
    return item;
  }

  getRevealBand(id: string): OriginFateNarrativeRevealBandRuleV02 {
    const band = this.revealBandById.get(id);
    if (band === undefined) {
      throw new Error(`Missing origin fate v0.2 reveal band: ${id}`);
    }
    return band;
  }

  getRevealBandForProgress(progress: number): OriginFateNarrativeRevealBandRuleV02 {
    if (!Number.isFinite(progress)) {
      throw new Error("origin fate v0.2 reveal progress must be a finite number");
    }
    const band = this.revealBands.find(({ min, max }) => progress >= min && progress <= max);
    if (band === undefined) {
      throw new Error(`Missing origin fate v0.2 reveal band for progress: ${progress}`);
    }
    return band;
  }

  getOmenPhrase(id: string): OmenPhraseDefinitionV02 {
    const phrase = this.omenPhraseById.get(id);
    if (phrase === undefined) {
      throw new Error(`Missing origin fate v0.2 omen phrase: ${id}`);
    }
    return phrase;
  }

  getSynergyRule(id: string): OriginItemHiddenSynergyRuleV02 {
    const rule = this.synergyRuleById.get(id);
    if (rule === undefined) {
      throw new Error(`Missing origin fate v0.2 synergy rule: ${id}`);
    }
    return rule;
  }
}

export function loadOriginFateNarrativeRegistry(): OriginFateNarrativeRegistry {
  return createOriginFateNarrativeRegistry({
    hiddenFates: hiddenFateDefinitionsData as unknown as HiddenFateDefinitionsDataFileV02,
    originStorylines: originStorylineDefinitionsData as unknown as OriginStorylineDefinitionsDataFileV02,
    carriedItems: carriedItemNarrativeChainsData as unknown as CarriedItemNarrativeChainsDataFileV02,
    revealStageRules: revealStageRulesData as unknown as RevealStageRulesDataFileV02,
    omenPhraseBank: omenPhraseBankData as unknown as OmenPhraseBankDataFileV02,
    synergyRules: originItemHiddenSynergyRulesData as unknown as OriginItemHiddenSynergyRulesDataFileV02
  });
}

export function createOriginFateNarrativeRegistry(data: OriginFateNarrativeDataBundle): OriginFateNarrativeRegistry {
  const issues = validateOriginFateNarrativeData(data);
  if (issues.length > 0) {
    throw new Error(`Origin fate narrative data validation failed:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
  }
  return new OriginFateNarrativeRegistry(data as Required<OriginFateNarrativeDataBundle>);
}

export function validateOriginFateNarrativeData(data: OriginFateNarrativeDataBundle): string[] {
  const issues: string[] = [];
  const hiddenFates = requireFile(data.hiddenFates, DATA_FILE_NAMES.hiddenFates, issues);
  const originStorylines = requireFile(data.originStorylines, DATA_FILE_NAMES.originStorylines, issues);
  const carriedItems = requireFile(data.carriedItems, DATA_FILE_NAMES.carriedItems, issues);
  const revealStageRules = requireFile(data.revealStageRules, DATA_FILE_NAMES.revealStageRules, issues);
  const omenPhraseBank = requireFile(data.omenPhraseBank, DATA_FILE_NAMES.omenPhraseBank, issues);
  const synergyRules = requireFile(data.synergyRules, DATA_FILE_NAMES.synergyRules, issues);

  if (
    hiddenFates === undefined ||
    originStorylines === undefined ||
    carriedItems === undefined ||
    revealStageRules === undefined ||
    omenPhraseBank === undefined ||
    synergyRules === undefined
  ) {
    return issues;
  }

  const hiddenFateIds = validateHiddenFates(hiddenFates, issues);
  const originIds = validateOriginStorylines(originStorylines, issues);
  const carriedItemIds = validateCarriedItems(carriedItems, issues);
  const revealBandIds = validateRevealStageRules(revealStageRules, hiddenFateIds, issues);
  validateOmenPhraseBank(omenPhraseBank, hiddenFates, issues);
  validateLocalReferences(hiddenFates, originStorylines, carriedItems, originIds, hiddenFateIds, carriedItemIds, revealBandIds, issues);
  validateSynergyRules(synergyRules, originIds, hiddenFateIds, carriedItemIds, issues);

  return issues;
}

function validateHiddenFates(data: HiddenFateDefinitionsDataFileV02, issues: string[]): ReadonlySet<string> {
  const ids = new Set<string>();
  const hiddenFates = requireNonEmptyArray(DATA_FILE_NAMES.hiddenFates, data, issues);
  for (const [index, hiddenFate] of hiddenFates.entries()) {
    const path = `${DATA_FILE_NAMES.hiddenFates}[${index}]`;
    validateUniqueId(hiddenFate.id, ids, "origin fate v0.2 hidden fate id", `${path}.id`, issues);
    validateNonEmptyString(`${path}.trueName`, hiddenFate.trueName, issues);
    validateNonEmptyString(`${path}.publicAlias`, hiddenFate.publicAlias, issues);
    if (!HIDDEN_FATE_CATEGORIES.has(String(hiddenFate.category))) {
      issues.push(`${path}.category is not legal: ${String(hiddenFate.category)}`);
    }
    if (!HIDDEN_FATE_RARITIES.has(String(hiddenFate.rarity))) {
      issues.push(`${path}.rarity is not legal: ${String(hiddenFate.rarity)}`);
    }
    validateStringArray(`${path}.primaryTags`, hiddenFate.primaryTags, issues);
    validateStringArray(`${path}.antiTags`, hiddenFate.antiTags, issues);
    validateStringArray(`${path}.preferredRoots`, hiddenFate.preferredRoots, issues);
    validateStringArray(`${path}.preferredDestinies`, hiddenFate.preferredDestinies, issues);
    validateStringArray(`${path}.misleadingOmenIds`, hiddenFate.misleadingOmenIds, issues);
    validateStringArray(`${path}.lifeEventHooks`, hiddenFate.lifeEventHooks, issues);
    validateStringArray(`${path}.majorChoiceHooks`, hiddenFate.majorChoiceHooks, issues);
    validateStringArray(`${path}.interludeHooks`, hiddenFate.interludeHooks, issues);
    validateStringArray(`${path}.stageTransitionTokens`, hiddenFate.stageTransitionTokens, issues);
    validateStringArray(`${path}.age18Outcomes`, hiddenFate.age18Outcomes, issues);

    const stages = requireNonEmptyArray(`${path}.omenStages`, hiddenFate.omenStages, issues);
    if (stages.length < 2) {
      issues.push(`${path}.omenStages must contain at least 2 omen stages`);
    }
    for (const [stageIndex, stage] of stages.entries()) {
      validateNonEmptyString(`${path}.omenStages[${stageIndex}].band`, stage.band, issues);
      validateNonEmptyString(`${path}.omenStages[${stageIndex}].text`, stage.text, issues);
      if (isNonEmptyString(hiddenFate.trueName) && isNonEmptyString(stage.text) && stage.text.includes(hiddenFate.trueName)) {
        issues.push(`${path}.omenStages[${stageIndex}].text leaks hidden trueName`);
      }
    }
  }
  return ids;
}

function validateOriginStorylines(data: OriginStorylineDefinitionsDataFileV02, issues: string[]): ReadonlySet<string> {
  const ids = new Set<string>();
  const origins = requireNonEmptyArray(DATA_FILE_NAMES.originStorylines, data, issues);
  for (const [index, origin] of origins.entries()) {
    const path = `${DATA_FILE_NAMES.originStorylines}[${index}]`;
    validateUniqueId(origin.id, ids, "origin fate v0.2 storyline id", `${path}.id`, issues);
    validateNonEmptyString(`${path}.name`, origin.name, issues);
    validateStringArray(`${path}.regionTags`, origin.regionTags, issues);
    validateNonEmptyString(`${path}.narrativeTheme`, origin.narrativeTheme, issues);
    validateStringArray(`${path}.storylineBias`, origin.storylineBias, issues);
    validateStringArray(`${path}.earlyEchoEvents`, origin.earlyEchoEvents, issues);
    validateStringArray(`${path}.childhoodSeedEvents`, origin.childhoodSeedEvents, issues);
    validateStringArray(`${path}.youthConflictEvents`, origin.youthConflictEvents, issues);
    validateStringArray(`${path}.teenChoiceEvents`, origin.teenChoiceEvents, issues);
    validateStringArray(`${path}.hiddenFateBias`, origin.hiddenFateBias, issues);
    validateStringArray(`${path}.carriedItemBias`, origin.carriedItemBias, issues);
    validateStringArray(`${path}.interludeBias`, origin.interludeBias, issues);
    if (!Array.isArray(origin.storylineBias) || origin.storylineBias.length === 0) {
      issues.push(`${path}.storylineBias must contain at least one storyline`);
    }
    if (!Array.isArray(origin.carriedItemBias) || origin.carriedItemBias.length === 0) {
      issues.push(`${path}.carriedItemBias must contain at least one item`);
    }
  }
  return ids;
}

function validateCarriedItems(data: CarriedItemNarrativeChainsDataFileV02, issues: string[]): ReadonlySet<string> {
  const ids = new Set<string>();
  const items = requireNonEmptyArray(DATA_FILE_NAMES.carriedItems, data, issues);
  for (const [index, item] of items.entries()) {
    const path = `${DATA_FILE_NAMES.carriedItems}[${index}]`;
    validateUniqueId(item.id, ids, "origin fate v0.2 carried item id", `${path}.id`, issues);
    validateNonEmptyString(`${path}.name`, item.name, issues);
    validateNonEmptyString(`${path}.surfaceDescription`, item.surfaceDescription, issues);
    validateStringArray(`${path}.preferredOrigins`, item.preferredOrigins, issues);
    validateStringArray(`${path}.preferredHiddenFates`, item.preferredHiddenFates, issues);
    validateStringArray(`${path}.preferredDestinies`, item.preferredDestinies, issues);
    validateStringArray(`${path}.eventHooks`, item.eventHooks, issues);
    validateStringArray(`${path}.interludeHooks`, item.interludeHooks, issues);
    validateStringArray(`${path}.age18Conversions`, item.age18Conversions, issues);
    validateStringArray(`${path}.dongfuHooks`, item.dongfuHooks, issues);
    const lifecycle = requireNonEmptyArray(`${path}.lifecycle`, item.lifecycle, issues);
    const stages = new Set(lifecycle.map((entry) => entry.stage));
    for (const requiredStage of REQUIRED_ITEM_LIFECYCLE_STAGES) {
      if (!stages.has(requiredStage)) {
        issues.push(`${path}.lifecycle missing required stage: ${requiredStage}`);
      }
    }
    for (const [entryIndex, entry] of lifecycle.entries()) {
      validateNonEmptyString(`${path}.lifecycle[${entryIndex}].stage`, entry.stage, issues);
      validateNonEmptyString(`${path}.lifecycle[${entryIndex}].text`, entry.text, issues);
    }
  }
  return ids;
}

function validateRevealStageRules(
  data: RevealStageRulesDataFileV02,
  hiddenFateIds: ReadonlySet<string>,
  issues: string[]
): ReadonlySet<string> {
  validateVersion(DATA_FILE_NAMES.revealStageRules, data.version, issues);
  const ids = new Set<string>();
  const bands = requireNonEmptyArray("reveal_stage_rules.progressBands", data.progressBands, issues);
  let previousMax: number | undefined;
  for (const [index, band] of bands.entries()) {
    const path = `reveal_stage_rules.progressBands[${index}]`;
    validateUniqueId(band.id, ids, "origin fate v0.2 reveal band id", `${path}.id`, issues);
    validateFiniteNumber(`${path}.min`, band.min, issues);
    validateFiniteNumber(`${path}.max`, band.max, issues);
    validateNonEmptyString(`${path}.uiLabel`, band.uiLabel, issues);
    if (typeof band.canShowTrueName !== "boolean") {
      issues.push(`${path}.canShowTrueName must be a boolean`);
    }
    if (Number.isFinite(band.min) && Number.isFinite(band.max) && band.min > band.max) {
      issues.push(`${path}.min must be <= max`);
    }
    if (previousMax !== undefined && Number.isFinite(band.min) && band.min <= previousMax) {
      issues.push(`${path} overlaps previous reveal band`);
    }
    if (Number.isFinite(band.max)) {
      previousMax = band.max;
    }
  }

  if (typeof data.revealPolicies !== "object" || data.revealPolicies === null) {
    issues.push("reveal_stage_rules.revealPolicies must exist");
  } else {
    for (const [policyId, policy] of Object.entries(data.revealPolicies)) {
      const path = `reveal_stage_rules.revealPolicies.${policyId}`;
      if (typeof policy.allowTrueName !== "boolean") {
        issues.push(`${path}.allowTrueName must be a boolean`);
      }
      if (typeof policy.allowExactProgress !== "boolean") {
        issues.push(`${path}.allowExactProgress must be a boolean`);
      }
    }
  }

  const ruleIds = new Set<string>();
  const rules = requireNonEmptyArray("reveal_stage_rules.misdirectionRules", data.misdirectionRules, issues);
  for (const [index, rule] of rules.entries()) {
    const path = `reveal_stage_rules.misdirectionRules[${index}]`;
    validateUniqueId(rule.id, ruleIds, "origin fate v0.2 misdirection rule id", `${path}.id`, issues);
    validateStringArray(`${path}.signals`, rule.signals, issues);
    validateStringArray(`${path}.possibleTruths`, rule.possibleTruths, issues);
    for (const [truthIndex, truthId] of (rule.possibleTruths ?? []).entries()) {
      if (isNonEmptyString(truthId) && truthId.startsWith("hidden_") && !hiddenFateIds.has(truthId)) {
        issues.push(`${path}.possibleTruths[${truthIndex}] references missing hidden fate id: ${truthId}`);
      }
    }
  }

  return ids;
}

function validateOmenPhraseBank(
  data: OmenPhraseBankDataFileV02,
  hiddenFates: HiddenFateDefinitionsDataFileV02,
  issues: string[]
): ReadonlySet<string> {
  validateVersion(DATA_FILE_NAMES.omenPhraseBank, data.version, issues);
  const trueNames = hiddenFates.map((hiddenFate) => hiddenFate.trueName).filter(isNonEmptyString);
  const ids = new Set<string>();
  const phrases = requireNonEmptyArray("omen_phrase_bank.phrases", data.phrases, issues);
  for (const [index, phrase] of phrases.entries()) {
    const path = `omen_phrase_bank.phrases[${index}]`;
    validateUniqueId(phrase.id, ids, "origin fate v0.2 omen phrase id", `${path}.id`, issues);
    validateStringArray(`${path}.tags`, phrase.tags, issues);
    validateNonEmptyString(`${path}.text`, phrase.text, issues);
    if (isNonEmptyString(phrase.text) && trueNames.some((trueName) => phrase.text.includes(trueName))) {
      issues.push(`${path}.text leaks hidden trueName`);
    }
  }
  return ids;
}

function validateLocalReferences(
  hiddenFates: HiddenFateDefinitionsDataFileV02,
  origins: OriginStorylineDefinitionsDataFileV02,
  items: CarriedItemNarrativeChainsDataFileV02,
  originIds: ReadonlySet<string>,
  hiddenFateIds: ReadonlySet<string>,
  itemIds: ReadonlySet<string>,
  revealBandIds: ReadonlySet<string>,
  issues: string[]
): void {
  for (const [index, hiddenFate] of hiddenFates.entries()) {
    const path = `${DATA_FILE_NAMES.hiddenFates}[${index}]`;
    validateReferenceArray(`${path}.preferredItems`, hiddenFate.preferredItems, itemIds, "carried item id", issues);
    for (const [stageIndex, stage] of (hiddenFate.omenStages ?? []).entries()) {
      if (isNonEmptyString(stage.band) && !revealBandIds.has(stage.band)) {
        issues.push(`${path}.omenStages[${stageIndex}].band references unknown reveal band: ${stage.band}`);
      }
    }
  }

  for (const [index, origin] of origins.entries()) {
    const path = `${DATA_FILE_NAMES.originStorylines}[${index}]`;
    validateReferenceArray(`${path}.hiddenFateBias`, origin.hiddenFateBias, hiddenFateIds, "hidden fate id", issues);
    validateReferenceArray(`${path}.carriedItemBias`, origin.carriedItemBias, itemIds, "carried item id", issues);
  }

  for (const [index, item] of items.entries()) {
    const path = `${DATA_FILE_NAMES.carriedItems}[${index}]`;
    validateReferenceArray(`${path}.preferredHiddenFates`, item.preferredHiddenFates, hiddenFateIds, "hidden fate id", issues);
  }
}

function validateSynergyRules(
  data: OriginItemHiddenSynergyRulesDataFileV02,
  originIds: ReadonlySet<string>,
  hiddenFateIds: ReadonlySet<string>,
  itemIds: ReadonlySet<string>,
  issues: string[]
): void {
  validateVersion(DATA_FILE_NAMES.synergyRules, data.version, issues);
  const ids = new Set<string>();
  const rules = requireNonEmptyArray("origin_item_hidden_synergy_rules.rules", data.rules, issues);
  for (const [index, rule] of rules.entries()) {
    const path = `origin_item_hidden_synergy_rules.rules[${index}]`;
    validateUniqueId(rule.id, ids, "origin fate v0.2 synergy rule id", `${path}.id`, issues);
    validateReference(`${path}.originId`, rule.originId, originIds, "origin id", issues);
    validateReference(`${path}.itemId`, rule.itemId, itemIds, "carried item id", issues);
    validateReference(`${path}.hiddenFateId`, rule.hiddenFateId, hiddenFateIds, "hidden fate id", issues);
    const effects = requireNonEmptyArray(`${path}.effects`, rule.effects, issues);
    for (const [effectIndex, effect] of effects.entries()) {
      const effectPath = `${path}.effects[${effectIndex}]`;
      if (!LEGAL_SYNERGY_EFFECT_TYPES.has(String(effect.type))) {
        issues.push(`${effectPath}.type is not legal: ${String(effect.type)}`);
      }
      validateNonEmptyString(`${effectPath}.target`, effect.target, issues);
      if (effect.value !== undefined) {
        validateFiniteNumber(`${effectPath}.value`, effect.value, issues);
      }
      if (effect.type === "progressBonus") {
        validateReference(`${effectPath}.target`, effect.target, hiddenFateIds, "hidden fate id", issues);
      }
      if (effect.type === "itemAffinityBonus") {
        validateReference(`${effectPath}.target`, effect.target, itemIds, "carried item id", issues);
      }
    }
  }
}

function requireFile<T>(file: T | undefined, name: string, issues: string[]): T | undefined {
  if (file === undefined) {
    issues.push(`Missing origin fate narrative data file: ${name}`);
    return undefined;
  }
  return file;
}

function requireNonEmptyArray<T>(path: string, value: readonly T[] | undefined, issues: string[]): readonly T[] {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push(`${path} must contain at least one item`);
    return [];
  }
  return value;
}

function validateVersion(path: string, version: unknown, issues: string[]): void {
  if (version !== SUPPORTED_VERSION) {
    issues.push(`${path}.version must be ${SUPPORTED_VERSION}`);
  }
}

function validateUniqueId(value: unknown, ids: Set<string>, label: string, path: string, issues: string[]): void {
  if (!isNonEmptyString(value)) {
    issues.push(`${path} must not be empty`);
    return;
  }
  if (ids.has(value)) {
    issues.push(`duplicate ${label}: ${value}`);
    return;
  }
  ids.add(value);
}

function validateNonEmptyString(path: string, value: unknown, issues: string[]): void {
  if (!isNonEmptyString(value)) {
    issues.push(`${path} must not be empty`);
  }
}

function validateStringArray(path: string, value: readonly string[] | undefined, issues: string[]): void {
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array`);
    return;
  }
  for (const [index, item] of value.entries()) {
    if (!isNonEmptyString(item)) {
      issues.push(`${path}[${index}] must not be empty`);
    }
  }
}

function validateReferenceArray(
  path: string,
  values: readonly string[] | undefined,
  legalIds: ReadonlySet<string>,
  label: string,
  issues: string[]
): void {
  if (!Array.isArray(values)) {
    return;
  }
  for (const [index, value] of values.entries()) {
    if (isNonEmptyString(value) && !legalIds.has(value)) {
      issues.push(`${path}[${index}] references missing ${label}: ${value}`);
    }
  }
}

function validateReference(
  path: string,
  value: unknown,
  legalIds: ReadonlySet<string>,
  label: string,
  issues: string[]
): void {
  if (!isNonEmptyString(value)) {
    issues.push(`${path} must not be empty`);
    return;
  }
  if (!legalIds.has(value)) {
    issues.push(`${path} references missing ${label}: ${value}`);
  }
}

function validateFiniteNumber(path: string, value: unknown, issues: string[]): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push(`${path} must be a finite number`);
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function indexById<T extends { readonly id: string }>(items: readonly T[]): ReadonlyMap<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function freezeArray<T extends object>(items: readonly T[]): readonly T[] {
  return Object.freeze(items.map((item) => deepFreeze(cloneJson(item))));
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null) {
    return value;
  }
  Object.freeze(value);
  for (const nested of Object.values(value)) {
    deepFreeze(nested);
  }
  return value;
}
