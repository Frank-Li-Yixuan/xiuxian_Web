import {
  loadLifeInterludeRegistry,
  type LifeInterludeRegistry
} from "./LifeInterludeRegistry";
import type {
  InterludeDifficultyTier,
  LifeInterludeAutoResolveFallbackInput,
  LifeInterludeDefinition,
  LifeInterludeMode,
  LifeInterludeModeDefinition,
  LifeInterludeOutcome,
  LifeInterludePlayerProjection,
  LifeInterludeResult,
  LifeInterludeRewardTable,
  LifeInterludeRunConfig,
  LifeInterludeRunConfigDebug,
  LifeInterludeRunConfigFactoryInput,
  LifeInterludeScenario,
  LifeInterludeWritebackEffect
} from "../types/life-interlude-types.v0.1";
import type { LifeSimulationState } from "../types/life-monthly-events-types.v0.1";
import type { MajorChoiceOptionInstance } from "../types/major-life-choice-types.v0.1";

export const LIFE_INTERLUDE_RUN_CONFIG_FACTORY_SOURCE = "life_interludes_v0_1_run_config_factory";

type AgeScale = LifeInterludeRunConfigDebug["ageScale"];

interface ScenarioBuildInput {
  readonly definition: LifeInterludeDefinition;
  readonly modeDefinition: LifeInterludeModeDefinition;
  readonly lifeSimulationState: LifeSimulationState;
  readonly majorChoiceOption: MajorChoiceOptionInstance;
  readonly modeWrapper: string;
}

const AGE_SCALE_MULTIPLIER: Readonly<Record<AgeScale, number>> = {
  child: 0.62,
  youth: 0.82,
  adolescent: 1
};

const MODE_SKILL_KEYS: Readonly<Record<LifeInterludeMode, readonly (keyof LifeSimulationState["lifeSkills"])[]>> = {
  stg: ["martial", "survival"],
  horde: ["survival", "alchemy"],
  deckbuilder: ["study", "ritual"],
  formation_auto: ["ritual", "craft"],
  text_check: ["study", "social"]
};

export class LifeInterludeRunConfigFactory {
  private readonly registry: LifeInterludeRegistry;

  constructor(registry?: LifeInterludeRegistry) {
    this.registry = registry ?? loadLifeInterludeRegistry();
  }

  createRunConfig(input: LifeInterludeRunConfigFactoryInput): LifeInterludeRunConfig {
    const registry = input.registry ?? this.registry;
    const definition = registry.getInterlude(input.candidate.definitionId);
    const modeDefinition = registry.getMode(definition.mode);
    const writebackRule = registry.getWritebackRule(definition.resultWritebackId);
    const ageScale = getAgeScale(input.lifeSimulationState.ageMonths);
    const modeWrapper = chooseModeWrapper(modeDefinition, input.seed, definition.id);
    const publicTags = buildPublicTags(input.lifeSimulationState, input.majorChoiceOption, input.candidate.mode, definition);
    const interludeRunId = buildRunId(input);
    const durationTargetSeconds = getDurationTargetSeconds(definition, input.lifeSimulationState.ageMonths);
    const turnLimit = definition.turnLimit;
    const rewards = buildRewards(writebackRule.outcomes);
    const failurePolicy = deepFreeze({
      canGameOver: false,
      preserveLifeSimulation: true,
      allowRetry: true,
      autoResolveFallback: registry.getFrequencyBudget().autoResolveRules.autoResolveMaxOutcome
    } satisfies LifeInterludeRunConfig["failurePolicy"]);
    const debug = deepFreeze({
      source: LIFE_INTERLUDE_RUN_CONFIG_FACTORY_SOURCE,
      modeWrapper,
      ageScale,
      publicTags: freezeArray(publicTags)
    } satisfies LifeInterludeRunConfigDebug);

    return deepFreeze({
      interludeRunId,
      definitionId: definition.id,
      mode: definition.mode,
      seed: input.seed,
      ageMonth: input.lifeSimulationState.ageMonths,
      sourceChoiceId: input.majorChoiceOption.instanceId,
      ...(input.sourceThreadId === undefined || !isPublicSignal(input.sourceThreadId) ? {} : { sourceThreadId: input.sourceThreadId }),
      resultWritebackId: definition.resultWritebackId,
      difficultyTier: input.candidate.difficultyTier,
      ...(durationTargetSeconds === undefined ? {} : { durationTargetSeconds }),
      ...(turnLimit === undefined ? {} : { turnLimit }),
      playerProjection: buildPlayerProjection(input.lifeSimulationState, input.majorChoiceOption, definition.mode, ageScale),
      scenario: buildScenario({
        definition,
        modeDefinition,
        lifeSimulationState: input.lifeSimulationState,
        majorChoiceOption: input.majorChoiceOption,
        modeWrapper
      }),
      rewards,
      failurePolicy,
      debug
    } satisfies LifeInterludeRunConfig);
  }

  createAutoResolveFallback(input: LifeInterludeAutoResolveFallbackInput): LifeInterludeResult {
    return createAutoResolveFallback(input);
  }
}

export function createRunConfig(input: LifeInterludeRunConfigFactoryInput): LifeInterludeRunConfig {
  return new LifeInterludeRunConfigFactory().createRunConfig(input);
}

export function createAutoResolveFallback(input: LifeInterludeAutoResolveFallbackInput): LifeInterludeResult {
  const durationSeconds = input.config.durationTargetSeconds;
  return deepFreeze({
    interludeRunId: input.config.interludeRunId,
    definitionId: input.config.definitionId,
    mode: input.config.mode,
    outcome: "partialSuccess",
    ...(durationSeconds === undefined ? {} : { durationSeconds }),
    playerChoseManual: false,
    visibleSummary: `auto_resolved_placeholder:${input.config.definitionId}:${stableHash(`${input.seed}:${input.config.interludeRunId}`)}`,
    effects: freezeArray([]),
    generatedHooks: freezeArray([])
  } satisfies LifeInterludeResult);
}

function buildRunId(input: LifeInterludeRunConfigFactoryInput): string {
  const source = [
    input.seed,
    input.candidate.definitionId,
    input.majorChoiceOption.instanceId,
    input.lifeSimulationState.characterId,
    String(input.lifeSimulationState.ageMonths)
  ].join("|");
  return `lpi_run_${stableHash(source)}`;
}

function buildPlayerProjection(
  state: LifeSimulationState,
  option: MajorChoiceOptionInstance,
  mode: LifeInterludeMode,
  ageScale: AgeScale
): LifeInterludePlayerProjection {
  const multiplier = AGE_SCALE_MULTIPLIER[ageScale];
  const relevantSkill = MODE_SKILL_KEYS[mode].reduce((sum, key) => sum + state.lifeSkills[key], 0);
  const woundPenalty = state.wounds.reduce((sum, wound) => sum + wound.severity * 3, 0);
  const knotPenalty = state.heartKnots.reduce((sum, knot) => sum + knot.severity * 2, 0);
  const maxHp = clampInt(
    (40 + state.core.jing * 0.62 + state.aptitude.rootBone * 0.22 + relevantSkill * 1.8 - woundPenalty) * multiplier,
    35,
    240
  );
  const maxQi = clampInt(
    (20 + state.core.qi * 0.5 + state.core.shen * 0.25 + state.aptitude.inspiration * 0.15 - knotPenalty) * multiplier,
    10,
    180
  );
  const moveSpeed = clampNumber(
    (3.2 + state.core.qi / 90 + state.lifeSkills.martial / 30) * (ageScale === "child" ? 0.88 : 1),
    2.8,
    5.8
  );
  return deepFreeze({
    maxHp,
    maxQi,
    moveSpeed,
    skillTags: freezeArray(publicUnique([
      `mode:${mode}`,
      ...option.tags,
      ...skillTagsFromLifeSkills(state.lifeSkills),
      ...state.wounds.flatMap((wound) => wound.tags),
      ...state.heartKnots.flatMap((knot) => knot.tags)
    ])),
    destinyModifiers: freezeArray(publicUnique(readSafeFlags(state, ["destiny", "root", "origin"]))),
    itemModifiers: freezeArray(publicUnique([
      ...Object.entries(state.carriedItemAffinity).map(([itemId, affinity]) => `${itemId}:affinity_${toAffinityBand(affinity)}`),
      ...readSafeFlags(state, ["item", "carried_item", "carriedItem"])
    ]))
  } satisfies LifeInterludePlayerProjection);
}

function buildScenario(input: ScenarioBuildInput): LifeInterludeScenario {
  const base = {
    title: input.definition.name,
    description: input.definition.description,
    worldExplanation: input.definition.worldExplanation
  };
  switch (input.definition.mode) {
    case "stg":
      return deepFreeze({
        ...base,
        enemyPool: freezeArray(publicUnique([
          input.lifeSimulationState.ageMonths < 108 && input.definition.realityLayer === "spirit_projection"
            ? "stg:short_spirit_projection"
            : "stg:short_trial",
          ...getStgScenarioTags(input.definition),
          ...toPrefixedTags("root", input.definition.preferredRoots ?? []),
          ...toPrefixedTags("thread", input.definition.threadTags),
          `wrapper:${input.modeWrapper}`
        ]))
      });
    case "horde":
      return deepFreeze({
        ...base,
        enemyPool: freezeArray(publicUnique([
          "horde:survival_wave",
          "horde:protect_resource",
          ...toPrefixedTags("thread", input.definition.threadTags),
          ...toPrefixedTags("storyline", input.definition.storylineTags),
          `wrapper:${input.modeWrapper}`
        ]))
      });
    case "deckbuilder":
      return deepFreeze({
        ...base,
        cardPool: freezeArray(publicUnique([
          "deckbuilder:question",
          `turns:${input.definition.turnLimit ?? input.modeDefinition.defaultTurnLimit ?? 6}`,
          ...toPrefixedTags("thread", input.definition.threadTags),
          ...input.majorChoiceOption.tags,
          `wrapper:${input.modeWrapper}`
        ]))
      });
    case "formation_auto":
      return deepFreeze({
        ...base,
        boardPreset: `formation_auto:${stripPrefix(input.definition.id, "interlude_")}`,
        enemyPool: freezeArray(publicUnique([
          "formation_auto:board_pulse",
          ...toPrefixedTags("thread", input.definition.threadTags),
          `wrapper:${input.modeWrapper}`
        ]))
      });
    case "text_check":
      return deepFreeze(base);
  }
}

function getStgScenarioTags(definition: LifeInterludeDefinition): readonly string[] {
  if (definition.id === "interlude_outer_battlefield_dream") {
    return ["stg:outer_battlefield_echo"];
  }
  if (definition.id === "interlude_rainy_back_mountain") {
    return ["stg:thunder_back_mountain"];
  }
  return ["stg:generic_short"];
}

function buildRewards(
  outcomes: Partial<Record<LifeInterludeOutcome, readonly LifeInterludeWritebackEffect[]>>
): LifeInterludeRewardTable {
  return deepFreeze({
    successEffects: freezeArray(publicEffects(outcomes.success ?? [])),
    failureEffects: freezeArray(publicEffects(outcomes.failure ?? [])),
    ...(outcomes.hiddenSuccess === undefined ? {} : { hiddenSuccessEffects: freezeArray(publicEffects(outcomes.hiddenSuccess)) })
  });
}

function publicEffects(effects: readonly LifeInterludeWritebackEffect[]): readonly LifeInterludeWritebackEffect[] {
  return effects
    .filter((effect) => isPublicValue(JSON.stringify(effect)))
    .map((effect) => deepFreeze(structuredClone(effect)));
}

function getDurationTargetSeconds(
  definition: LifeInterludeDefinition,
  ageMonths: number
): number | undefined {
  if (definition.durationTargetSeconds === undefined) {
    return undefined;
  }
  if (ageMonths < 108 && definition.mode === "stg") {
    return Math.min(definition.durationTargetSeconds, 90);
  }
  return definition.durationTargetSeconds;
}

function chooseModeWrapper(
  modeDefinition: LifeInterludeModeDefinition,
  seed: string,
  definitionId: string
): string {
  const wrappers = modeDefinition.worldWrappers.filter(isPublicSignal);
  if (wrappers.length === 0) {
    return modeDefinition.id;
  }
  return wrappers[stableHashNumber(`${seed}:${definitionId}:${modeDefinition.id}`) % wrappers.length] ?? modeDefinition.id;
}

function buildPublicTags(
  state: LifeSimulationState,
  option: MajorChoiceOptionInstance,
  mode: LifeInterludeMode,
  definition: LifeInterludeDefinition
): readonly string[] {
  return publicUnique([
    `mode:${mode}`,
    `definition:${definition.id}`,
    ...option.tags,
    ...definition.storylineTags.map((tag) => `storyline:${tag}`),
    ...definition.threadTags.map((tag) => `thread:${tag}`),
    ...definition.preferredRoots?.map((tag) => `root:${tag}`) ?? [],
    ...definition.preferredDestinies ?? [],
    ...definition.preferredOrigins ?? [],
    ...definition.preferredItems ?? [],
    ...readSafeFlags(state, ["destiny", "root", "origin", "item", "carried_item", "carriedItem"])
  ]);
}

function skillTagsFromLifeSkills(skills: LifeSimulationState["lifeSkills"]): readonly string[] {
  return Object.entries(skills)
    .filter(([, value]) => value >= 6)
    .map(([key, value]) => `lifeSkill:${key}:${toSkillBand(value)}`);
}

function readSafeFlags(
  state: LifeSimulationState,
  keys: readonly string[]
): readonly string[] {
  const expected = new Set(keys.map(normalizeToken));
  const values: string[] = [];
  for (const [key, value] of Object.entries(state.flags)) {
    const normalizedKey = normalizeToken(key);
    if (!expected.has(normalizedKey) || !isPublicSignal(key)) {
      continue;
    }
    if (typeof value === "string" && isPublicSignal(value)) {
      values.push(value);
    }
  }
  return values;
}

function toPrefixedTags(prefix: string, tags: readonly string[]): readonly string[] {
  return tags.map((tag) => tag.includes(":") ? tag : `${prefix}:${tag}`);
}

function getAgeScale(ageMonths: number): AgeScale {
  if (ageMonths < 108) {
    return "child";
  }
  if (ageMonths < 168) {
    return "youth";
  }
  return "adolescent";
}

function toAffinityBand(value: number): string {
  if (value >= 75) {
    return "high";
  }
  if (value >= 45) {
    return "medium";
  }
  return "low";
}

function toSkillBand(value: number): string {
  if (value >= 15) {
    return "high";
  }
  if (value >= 8) {
    return "medium";
  }
  return "low";
}

function stripPrefix(value: string, prefix: string): string {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

function isPublicValue(value: string): boolean {
  const normalized = normalizeToken(value);
  return normalized.length > 0 &&
    !normalized.includes("true_name") &&
    !normalized.includes("truename") &&
    !normalized.includes("hidden_fate_internal");
}

function isPublicSignal(value: string): boolean {
  const normalized = normalizeToken(value);
  return isPublicValue(value) &&
    !normalized.startsWith("hidden:") &&
    !normalized.startsWith("hidden_") &&
    !normalized.includes("internal_hidden");
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

function publicUnique(values: readonly string[]): readonly string[] {
  return uniqueStable(values.map((value) => value.trim()).filter(isPublicSignal));
}

function stableHash(value: string): string {
  return stableHashNumber(value).toString(36).padStart(8, "0");
}

function stableHashNumber(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

function clampInt(value: number, min: number, max: number): number {
  return Math.trunc(Math.min(max, Math.max(min, value)));
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, value)) * 100) / 100;
}

function uniqueStable<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function freezeArray<T>(entries: readonly T[]): readonly T[] {
  return Object.freeze([...entries]);
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
