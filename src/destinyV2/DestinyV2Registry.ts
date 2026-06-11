import conflictSynergyMutationRulesData from "../../data/destiny_v2/conflict_synergy_mutation_rules.v0.1.json";
import coreDestinyDefinitionsData from "../../data/destiny_v2/core_destiny_definitions.v0.1.json";
import lifeManifestationHooksData from "../../data/destiny_v2/life_manifestation_hooks.v0.1.json";
import modeProjectionHooksData from "../../data/destiny_v2/mode_projection_hooks.v0.1.json";
import type {
  CoreDestinyDefinitionsDataFile,
  DestinyDefinitionV2,
  DestinyEffectsProjection,
  DestinyManifestationDefinition,
  DestinyModeProjectionDefinition,
  DestinyQuality,
  DestinySlot,
  DestinySynergyRule,
  DestinyV2ConflictSynergyMutationRulesDataFile,
  DestinyV2DataBundle,
  EligibilityExpression,
  HardConflictRule,
  LifeManifestationHooksDataFile,
  LifeManifestationPhaseId,
  ModeProjectionHooksDataFile,
  SoftConflictRule
} from "../types/destiny-eligibility-types.v0.1";

const DATA_FILE_NAMES = {
  coreDestinyDefinitions: "core_destiny_definitions",
  conflictSynergyMutationRules: "conflict_synergy_mutation_rules",
  lifeManifestationHooks: "life_manifestation_hooks",
  modeProjectionHooks: "mode_projection_hooks"
} as const;

const SUPPORTED_VERSION = "0.1";

const DESTINY_QUALITIES = new Set<string>([
  "mortal",
  "good",
  "rare",
  "arcane",
  "earth",
  "heaven",
  "reversal",
  "forbidden",
  "flaw"
] satisfies readonly DestinyQuality[]);
const DESTINY_KINDS = new Set<string>(["destiny", "flaw", "mutated"]);
const DESTINY_SLOTS = new Set<string>(["main", "secondary", "flaw", "mutated"] satisfies readonly DestinySlot[]);
const FATE_ATTRIBUTE_IDS = new Set<string>([
  "jing",
  "qi",
  "shen",
  "rootBone",
  "comprehension",
  "inspiration",
  "fortune",
  "heart",
  "lifespan",
  "merit",
  "karma"
]);
const DERIVED_SCORE_IDS = new Set<string>([
  "talentScore",
  "vesselScore",
  "stabilityScore",
  "destinyPressureScore",
  "lateBloomScore",
  "rebellionScore"
]);
const LIFE_MANIFESTATION_PHASE_IDS = [
  "infant_0_3",
  "child_4_8",
  "juvenile_9_13",
  "youth_14_17",
  "adult_18"
] as const satisfies readonly LifeManifestationPhaseId[];
const EFFECT_BUCKETS = ["lifeSim", "outerBattlefield", "outgame", "horde", "deckbuilder", "autochess"] as const;

export class DestinyV2Registry {
  readonly destinies: readonly DestinyDefinitionV2[];
  readonly hardConflicts: readonly HardConflictRule[];
  readonly softConflicts: readonly SoftConflictRule[];
  readonly synergies: readonly DestinySynergyRule[];
  readonly phaseManifestationRules: Readonly<Record<LifeManifestationPhaseId, string>>;
  readonly destinyManifestations: readonly DestinyManifestationDefinition[];
  readonly modeProjectionPrinciple: string;
  readonly modeProjections: readonly DestinyModeProjectionDefinition[];

  private readonly destinyById: ReadonlyMap<string, DestinyDefinitionV2>;
  private readonly destiniesBySlot: ReadonlyMap<DestinySlot, readonly DestinyDefinitionV2[]>;
  private readonly manifestationByDestinyId: ReadonlyMap<string, DestinyManifestationDefinition>;
  private readonly modeProjectionByDestinyId: ReadonlyMap<string, DestinyModeProjectionDefinition>;

  constructor(data: Required<DestinyV2DataBundle>) {
    this.destinies = freezeArray(data.coreDestinyDefinitions.destinies);
    this.hardConflicts = freezeArray(data.conflictSynergyMutationRules.hardConflicts);
    this.softConflicts = freezeArray(data.conflictSynergyMutationRules.softConflicts);
    this.synergies = freezeArray(data.conflictSynergyMutationRules.synergies);
    this.phaseManifestationRules = deepFreeze(cloneJson(data.lifeManifestationHooks.phaseManifestationRules));
    this.destinyManifestations = freezeArray(data.lifeManifestationHooks.destinyManifestations);
    this.modeProjectionPrinciple = data.modeProjectionHooks.modeProjectionPrinciple;
    this.modeProjections = freezeArray(data.modeProjectionHooks.projections);
    this.destinyById = indexById(this.destinies);
    this.destiniesBySlot = buildDestiniesBySlot(this.destinies);
    this.manifestationByDestinyId = indexByDestinyId(this.destinyManifestations);
    this.modeProjectionByDestinyId = indexByDestinyId(this.modeProjections);
  }

  getDestiny(id: string): DestinyDefinitionV2 {
    const destiny = this.destinyById.get(id);
    if (destiny === undefined) {
      throw new Error(`Missing destiny v2 definition: ${id}`);
    }
    return destiny;
  }

  getDestiniesForSlot(slot: DestinySlot): readonly DestinyDefinitionV2[] {
    return this.destiniesBySlot.get(slot) ?? [];
  }

  getManifestation(destinyId: string): DestinyManifestationDefinition {
    const manifestation = this.manifestationByDestinyId.get(destinyId);
    if (manifestation === undefined) {
      throw new Error(`Missing destiny v2 manifestation: ${destinyId}`);
    }
    return manifestation;
  }

  getModeProjection(destinyId: string): DestinyModeProjectionDefinition {
    const projection = this.modeProjectionByDestinyId.get(destinyId);
    if (projection === undefined) {
      throw new Error(`Missing destiny v2 mode projection: ${destinyId}`);
    }
    return projection;
  }
}

export function loadDestinyV2Registry(): DestinyV2Registry {
  return createDestinyV2Registry({
    coreDestinyDefinitions: coreDestinyDefinitionsData as unknown as CoreDestinyDefinitionsDataFile,
    conflictSynergyMutationRules:
      conflictSynergyMutationRulesData as unknown as DestinyV2ConflictSynergyMutationRulesDataFile,
    lifeManifestationHooks: lifeManifestationHooksData as unknown as LifeManifestationHooksDataFile,
    modeProjectionHooks: modeProjectionHooksData as unknown as ModeProjectionHooksDataFile
  });
}

export function createDestinyV2Registry(data: DestinyV2DataBundle): DestinyV2Registry {
  const issues = validateDestinyV2Data(data);
  if (issues.length > 0) {
    throw new Error(`Destiny v2 data validation failed:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
  }
  return new DestinyV2Registry(data as Required<DestinyV2DataBundle>);
}

export function validateDestinyV2Data(data: DestinyV2DataBundle): string[] {
  const issues: string[] = [];
  const coreDestinyDefinitions = requireFile(
    data.coreDestinyDefinitions,
    DATA_FILE_NAMES.coreDestinyDefinitions,
    issues
  );
  const conflictSynergyMutationRules = requireFile(
    data.conflictSynergyMutationRules,
    DATA_FILE_NAMES.conflictSynergyMutationRules,
    issues
  );
  const lifeManifestationHooks = requireFile(
    data.lifeManifestationHooks,
    DATA_FILE_NAMES.lifeManifestationHooks,
    issues
  );
  const modeProjectionHooks = requireFile(data.modeProjectionHooks, DATA_FILE_NAMES.modeProjectionHooks, issues);

  if (
    coreDestinyDefinitions === undefined ||
    conflictSynergyMutationRules === undefined ||
    lifeManifestationHooks === undefined ||
    modeProjectionHooks === undefined
  ) {
    return issues;
  }

  const destinyIds = validateCoreDestinyDefinitions(coreDestinyDefinitions, issues);
  validateConflictSynergyMutationRules(conflictSynergyMutationRules, destinyIds, issues);
  validateLifeManifestationHooks(lifeManifestationHooks, destinyIds, issues);
  validateModeProjectionHooks(modeProjectionHooks, destinyIds, issues);

  return issues;
}

function validateCoreDestinyDefinitions(
  data: CoreDestinyDefinitionsDataFile,
  issues: string[]
): ReadonlySet<string> {
  validateVersion(DATA_FILE_NAMES.coreDestinyDefinitions, data.version, issues);
  validateNonEmptyString("core_destiny_definitions.description", data.description, issues);

  const destinyIds = new Set<string>();
  const destinyNames = new Set<string>();
  const destinies = requireNonEmptyArray("core_destiny_definitions.destinies", data.destinies, issues);

  for (const [index, destiny] of destinies.entries()) {
    const path = `core_destiny_definitions.destinies[${index}]`;
    validateUniqueId(destiny.id, destinyIds, "destiny v2 id", `${path}.id`, issues);
    validateUniqueId(destiny.name, destinyNames, "destiny v2 name", `${path}.name`, issues);
    if (!DESTINY_QUALITIES.has(String(destiny.quality))) {
      issues.push(`${path}.quality is not legal: ${String(destiny.quality)}`);
    }
    if (!DESTINY_KINDS.has(String(destiny.kind))) {
      issues.push(`${path}.kind is not legal: ${String(destiny.kind)}`);
    }
    validateDestinySlots(`${path}.allowedSlots`, destiny.allowedSlots, issues);
    validateStringArray(`${path}.tags`, destiny.tags, issues);
    validateNonEmptyString(`${path}.oneLine`, destiny.oneLine, issues);
    validateNonEmptyString(`${path}.description`, destiny.description, issues);
    validateEffectsProjection(`${path}.effects`, destiny.effects, issues);
  }

  for (const [index, destiny] of destinies.entries()) {
    const path = `core_destiny_definitions.destinies[${index}]`;
    validateEligibilityRule(`${path}.eligibility`, destiny.eligibility, destinyIds, issues);
    validateMutationRule(`${path}.mutation`, destiny.mutation, destinyIds, issues);
  }

  return destinyIds;
}

function validateConflictSynergyMutationRules(
  data: DestinyV2ConflictSynergyMutationRulesDataFile,
  destinyIds: ReadonlySet<string>,
  issues: string[]
): void {
  validateVersion(DATA_FILE_NAMES.conflictSynergyMutationRules, data.version, issues);

  for (const [index, conflict] of requireNonEmptyArray(
    "conflict_synergy_mutation_rules.hardConflicts",
    data.hardConflicts,
    issues
  ).entries()) {
    const path = `conflict_synergy_mutation_rules.hardConflicts[${index}]`;
    validateDestinyReference(`${path}.a`, conflict.a, destinyIds, issues);
    validateDestinyReference(`${path}.b`, conflict.b, destinyIds, issues);
    if (conflict.a === conflict.b) {
      issues.push(`${path} must not conflict a destiny with itself`);
    }
    if (conflict.mutation !== undefined) {
      validateDestinyReference(`${path}.mutation`, conflict.mutation, destinyIds, issues);
    }
    validateNonEmptyString(`${path}.reason`, conflict.reason, issues);
  }

  for (const [index, conflict] of requireNonEmptyArray(
    "conflict_synergy_mutation_rules.softConflicts",
    data.softConflicts,
    issues
  ).entries()) {
    const path = `conflict_synergy_mutation_rules.softConflicts[${index}]`;
    validateDestinyReference(`${path}.a`, conflict.a, destinyIds, issues);
    validateDestinyReference(`${path}.b`, conflict.b, destinyIds, issues);
    if (conflict.a === conflict.b) {
      issues.push(`${path} must not conflict a destiny with itself`);
    }
    validateNonEmptyString(`${path}.warning`, conflict.warning, issues);
  }

  for (const [index, synergy] of requireNonEmptyArray(
    "conflict_synergy_mutation_rules.synergies",
    data.synergies,
    issues
  ).entries()) {
    const path = `conflict_synergy_mutation_rules.synergies[${index}]`;
    const ids = requireNonEmptyArray(`${path}.ids`, synergy.ids, issues);
    if (ids.length < 2) {
      issues.push(`${path}.ids must contain at least two destiny ids`);
    }
    for (const [idIndex, id] of ids.entries()) {
      validateDestinyReference(`${path}.ids[${idIndex}]`, id, destinyIds, issues);
    }
    validateNonEmptyString(`${path}.name`, synergy.name, issues);
    validateStringArray(`${path}.effectTags`, synergy.effectTags, issues);
    if (synergy.warning !== undefined) {
      validateNonEmptyString(`${path}.warning`, synergy.warning, issues);
    }
  }
}

function validateLifeManifestationHooks(
  data: LifeManifestationHooksDataFile,
  destinyIds: ReadonlySet<string>,
  issues: string[]
): void {
  validateVersion(DATA_FILE_NAMES.lifeManifestationHooks, data.version, issues);
  const phaseIds = validatePhaseManifestationRules(data.phaseManifestationRules, issues);
  const seenDestinyIds = new Set<string>();

  for (const [index, manifestation] of requireNonEmptyArray(
    "life_manifestation_hooks.destinyManifestations",
    data.destinyManifestations,
    issues
  ).entries()) {
    const path = `life_manifestation_hooks.destinyManifestations[${index}]`;
    const destinyId = validateUniqueId(
      manifestation.destinyId,
      seenDestinyIds,
      "destiny v2 manifestation destiny id",
      `${path}.destinyId`,
      issues
    );
    if (destinyId !== undefined) {
      validateDestinyReference(`${path}.destinyId`, destinyId, destinyIds, issues);
    }
    for (const [eventIndex, event] of requireNonEmptyArray(`${path}.events`, manifestation.events, issues).entries()) {
      const eventPath = `${path}.events[${eventIndex}]`;
      validateNonEmptyString(`${eventPath}.phase`, event.phase, issues);
      if (typeof event.phase === "string" && event.phase.length > 0 && !phaseIds.has(event.phase)) {
        issues.push(`${eventPath}.phase references unknown phase: ${event.phase}`);
      }
      validateNonEmptyString(`${eventPath}.hook`, event.hook, issues);
      validateNonEmptyString(`${eventPath}.visible`, event.visible, issues);
    }
  }
}

function validateModeProjectionHooks(
  data: ModeProjectionHooksDataFile,
  destinyIds: ReadonlySet<string>,
  issues: string[]
): void {
  validateVersion(DATA_FILE_NAMES.modeProjectionHooks, data.version, issues);
  validateNonEmptyString("mode_projection_hooks.modeProjectionPrinciple", data.modeProjectionPrinciple, issues);
  const seenDestinyIds = new Set<string>();

  for (const [index, projection] of requireNonEmptyArray(
    "mode_projection_hooks.projections",
    data.projections,
    issues
  ).entries()) {
    const path = `mode_projection_hooks.projections[${index}]`;
    const destinyId = validateUniqueId(
      projection.destinyId,
      seenDestinyIds,
      "destiny v2 mode projection destiny id",
      `${path}.destinyId`,
      issues
    );
    if (destinyId !== undefined) {
      validateDestinyReference(`${path}.destinyId`, destinyId, destinyIds, issues);
    }
    validateEffectsProjection(path, projection, issues);
  }
}

function validatePhaseManifestationRules(
  phaseRules: Readonly<Record<LifeManifestationPhaseId, string>> | undefined,
  issues: string[]
): ReadonlySet<string> {
  if (phaseRules === undefined || phaseRules === null || Array.isArray(phaseRules) || typeof phaseRules !== "object") {
    issues.push("life_manifestation_hooks.phaseManifestationRules must be an object");
    return new Set();
  }
  const phaseIds = new Set<string>();
  for (const phaseId of LIFE_MANIFESTATION_PHASE_IDS) {
    validateNonEmptyString(`life_manifestation_hooks.phaseManifestationRules.${phaseId}`, phaseRules[phaseId], issues);
    phaseIds.add(phaseId);
  }
  for (const phaseId of Object.keys(phaseRules)) {
    if (!phaseIds.has(phaseId)) {
      issues.push(`life_manifestation_hooks.phaseManifestationRules.${phaseId} is not a supported phase`);
    }
  }
  return phaseIds;
}

function validateEligibilityRule(
  path: string,
  rule: unknown,
  destinyIds: ReadonlySet<string>,
  issues: string[]
): void {
  if (rule === undefined || rule === null || Array.isArray(rule) || typeof rule !== "object") {
    issues.push(`${path} must be an object`);
    return;
  }
  const record = rule as {
    readonly any?: readonly EligibilityExpression[];
    readonly all?: readonly EligibilityExpression[];
    readonly supportAny?: readonly EligibilityExpression[];
    readonly anti?: readonly EligibilityExpression[];
    readonly sourceMutationOf?: readonly string[];
  };

  validateExpressionArrayIfPresent(`${path}.any`, record.any, destinyIds, issues);
  validateExpressionArrayIfPresent(`${path}.all`, record.all, destinyIds, issues);
  validateExpressionArrayIfPresent(`${path}.supportAny`, record.supportAny, destinyIds, issues);
  validateExpressionArrayIfPresent(`${path}.anti`, record.anti, destinyIds, issues);
  if (record.sourceMutationOf !== undefined) {
    for (const [index, id] of requireNonEmptyArray(`${path}.sourceMutationOf`, record.sourceMutationOf, issues).entries()) {
      validateDestinyReference(`${path}.sourceMutationOf[${index}]`, id, destinyIds, issues);
    }
  }
}

function validateExpressionArrayIfPresent(
  path: string,
  expressions: readonly EligibilityExpression[] | undefined,
  destinyIds: ReadonlySet<string>,
  issues: string[]
): void {
  if (expressions === undefined) {
    return;
  }
  if (!Array.isArray(expressions)) {
    issues.push(`${path} must be an array`);
    return;
  }
  for (const [index, expression] of expressions.entries()) {
    validateEligibilityExpression(`${path}[${index}]`, expression, destinyIds, issues);
  }
}

function validateEligibilityExpression(
  path: string,
  expression: unknown,
  destinyIds: ReadonlySet<string>,
  issues: string[]
): void {
  if (expression === undefined || expression === null || Array.isArray(expression) || typeof expression !== "object") {
    issues.push(`${path} must be an object`);
    return;
  }
  const record = expression as Record<string, unknown>;
  let selectorCount = 0;

  if ("attr" in record) {
    selectorCount += 1;
    if (typeof record.attr !== "string" || record.attr.length === 0) {
      issues.push(`${path}.attr must not be empty`);
    } else if (!FATE_ATTRIBUTE_IDS.has(record.attr)) {
      issues.push(`${path}.attr references unknown attribute: ${record.attr}`);
    }
  }
  if ("score" in record) {
    selectorCount += 1;
    if (typeof record.score !== "string" || record.score.length === 0) {
      issues.push(`${path}.score must not be empty`);
    } else if (!DERIVED_SCORE_IDS.has(record.score)) {
      issues.push(`${path}.score references unknown derived score: ${record.score}`);
    }
  }
  if ("tag" in record) {
    selectorCount += 1;
    validateNonEmptyString(`${path}.tag`, record.tag, issues);
  }
  if ("id" in record) {
    selectorCount += 1;
    validateEligibilityDestinyReference(`${path}.id`, record.id, destinyIds, issues);
  }
  if ("flaw" in record) {
    selectorCount += 1;
    validateEligibilityDestinyReference(`${path}.flaw`, record.flaw, destinyIds, issues);
  }
  if ("sumAttrs" in record) {
    selectorCount += 1;
    for (const [index, attr] of requireNonEmptyArray(`${path}.sumAttrs`, record.sumAttrs as readonly unknown[], issues).entries()) {
      if (typeof attr !== "string" || attr.length === 0) {
        issues.push(`${path}.sumAttrs[${index}] must not be empty`);
      } else if (!FATE_ATTRIBUTE_IDS.has(attr)) {
        issues.push(`${path}.sumAttrs[${index}] references unknown attribute: ${attr}`);
      }
    }
  }
  if ("all" in record) {
    selectorCount += 1;
    for (const [index, child] of requireNonEmptyArray(`${path}.all`, record.all as readonly unknown[], issues).entries()) {
      validateEligibilityExpression(`${path}.all[${index}]`, child, destinyIds, issues);
    }
  }
  if (selectorCount === 0) {
    issues.push(`${path} must contain a supported eligibility selector`);
  }

  validateFiniteBoundary(`${path}.gte`, record.gte, issues);
  validateFiniteBoundary(`${path}.lte`, record.lte, issues);
  if (
    typeof record.gte === "number" &&
    Number.isFinite(record.gte) &&
    typeof record.lte === "number" &&
    Number.isFinite(record.lte) &&
    record.gte > record.lte
  ) {
    issues.push(`${path}.gte must be <= lte`);
  }
  if (record.note !== undefined) {
    validateNonEmptyString(`${path}.note`, record.note, issues);
  }
  if (record.severity !== undefined && record.severity !== "hard" && record.severity !== "soft") {
    issues.push(`${path}.severity is not legal: ${String(record.severity)}`);
  }
}

function validateMutationRule(
  path: string,
  mutation: { readonly antiResult?: string; readonly weakSupportResult?: string; readonly sourceConflictResult?: string } | undefined,
  destinyIds: ReadonlySet<string>,
  issues: string[]
): void {
  if (mutation === undefined) {
    return;
  }
  validateDestinyReferenceIfPresent(`${path}.antiResult`, mutation.antiResult, destinyIds, issues);
  validateDestinyReferenceIfPresent(`${path}.weakSupportResult`, mutation.weakSupportResult, destinyIds, issues);
  validateDestinyReferenceIfPresent(`${path}.sourceConflictResult`, mutation.sourceConflictResult, destinyIds, issues);
}

function validateEffectsProjection(path: string, effects: DestinyEffectsProjection | undefined, issues: string[]): void {
  if (effects === undefined || effects === null || Array.isArray(effects) || typeof effects !== "object") {
    issues.push(`${path} must be an object`);
    return;
  }
  let hasEffectBucket = false;
  for (const bucket of EFFECT_BUCKETS) {
    const values = effects[bucket];
    if (values !== undefined) {
      validateStringArray(`${path}.${bucket}`, values, issues);
      if (Array.isArray(values) && values.length > 0) {
        hasEffectBucket = true;
      }
    }
  }
  if (!hasEffectBucket) {
    issues.push(`${path} must contain at least one projection bucket`);
  }
}

function validateDestinySlots(path: string, slots: readonly DestinySlot[] | undefined, issues: string[]): void {
  for (const [index, slot] of requireNonEmptyArray(path, slots, issues).entries()) {
    if (!DESTINY_SLOTS.has(String(slot))) {
      issues.push(`${path}[${index}] is not a legal destiny slot: ${String(slot)}`);
    }
  }
}

function validateDestinyReferenceIfPresent(
  path: string,
  id: unknown,
  destinyIds: ReadonlySet<string>,
  issues: string[]
): void {
  if (id !== undefined) {
    validateDestinyReference(path, id, destinyIds, issues);
  }
}

function validateDestinyReference(path: string, id: unknown, destinyIds: ReadonlySet<string>, issues: string[]): void {
  validateNonEmptyString(path, id, issues);
  if (typeof id === "string" && id.length > 0 && !destinyIds.has(id)) {
    issues.push(`${path} references missing destiny id: ${id}`);
  }
}

function validateEligibilityDestinyReference(
  path: string,
  id: unknown,
  destinyIds: ReadonlySet<string>,
  issues: string[]
): void {
  validateNonEmptyString(path, id, issues);
  if (typeof id === "string" && id.length > 0 && !destinyIds.has(id) && !id.startsWith("flaw_")) {
    issues.push(`${path} references missing destiny id: ${id}`);
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

function validateFiniteBoundary(path: string, value: unknown, issues: string[]): void {
  if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value))) {
    issues.push(`${path} must be a finite number`);
  }
}

function validateNonEmptyString(path: string, value: unknown, issues: string[]): void {
  if (typeof value !== "string" || value.length === 0) {
    issues.push(`${path} must not be empty`);
  }
}

function requireNonEmptyArray<T>(path: string, value: readonly T[] | undefined, issues: string[]): readonly T[] {
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array`);
    return [];
  }
  if (value.length === 0) {
    issues.push(`${path} must contain at least one item`);
  }
  return value;
}

function requireFile<T>(file: T | undefined, name: string, issues: string[]): T | undefined {
  if (file === undefined || file === null) {
    issues.push(`Missing destiny v2 data file: ${name}`);
    return undefined;
  }
  return file;
}

function buildDestiniesBySlot(destinies: readonly DestinyDefinitionV2[]): ReadonlyMap<DestinySlot, readonly DestinyDefinitionV2[]> {
  const entries = new Map<DestinySlot, DestinyDefinitionV2[]>();
  for (const destiny of destinies) {
    for (const slot of destiny.allowedSlots) {
      const existing = entries.get(slot) ?? [];
      existing.push(destiny);
      entries.set(slot, existing);
    }
  }
  return new Map([...entries.entries()].map(([slot, slotDestinies]) => [slot, Object.freeze([...slotDestinies])]));
}

function indexById<T extends { readonly id: string }>(entries: readonly T[]): ReadonlyMap<string, T> {
  return new Map(entries.map((entry) => [entry.id, entry]));
}

function indexByDestinyId<T extends { readonly destinyId: string }>(entries: readonly T[]): ReadonlyMap<string, T> {
  return new Map(entries.map((entry) => [entry.destinyId, entry]));
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
