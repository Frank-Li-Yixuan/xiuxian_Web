import {
  loadLifeInterludeRegistry,
  type LifeInterludeRegistry
} from "./LifeInterludeRegistry";
import type {
  InterludeDifficultyTier,
  InterludeRealityLayer,
  LifeInterludeAgeHardRule,
  LifeInterludeCandidate,
  LifeInterludeCandidateDebug,
  LifeInterludeDefinition,
  LifeInterludeHistoryEntry,
  LifeInterludeMode,
  LifeInterludeTriggerBlockReason,
  LifeInterludeTriggerBlockReasonCode,
  LifeInterludeTriggerContext,
  LifeInterludeTriggerEvaluation
} from "../types/life-interlude-types.v0.1";

export const LIFE_INTERLUDE_TRIGGER_ENGINE_SOURCE = "life_interludes_v0_1_trigger_engine";

export interface LifeInterludeTriggerEngineContext {
  readonly registry?: LifeInterludeRegistry;
}

interface SignalContext {
  readonly tokenSet: ReadonlySet<string>;
  readonly publicTags: readonly string[];
}

interface ScoredCandidate {
  readonly candidate: LifeInterludeCandidate;
  readonly sortMode: LifeInterludeMode;
  readonly sortId: string;
}

interface WeightEntry {
  readonly source: string;
  readonly weight: number;
}

interface PenaltyEntry {
  readonly source: string;
  readonly amount: number;
}

const DIFFICULTY_RANK: Readonly<Record<InterludeDifficultyTier, number>> = {
  safe: 0,
  steady: 1,
  risky: 2,
  dangerous: 3,
  forbidden: 4,
  destiny: 5
};

const DISPLAY_RISK: Readonly<Record<InterludeDifficultyTier, string>> = {
  safe: "稳妥",
  steady: "可控",
  risky: "有险",
  dangerous: "危险",
  forbidden: "禁忌",
  destiny: "命劫"
};

const CHILDHOOD_PLAYABLE_REALITY_LAYERS = new Set<InterludeRealityLayer>([
  "dream",
  "training",
  "spirit_projection"
]);

const BASE_REQUIRED_HOOK_WEIGHT = 16;
const STORYLINE_TAG_WEIGHT = 8;
const THREAD_TAG_WEIGHT = 8;
const ROOT_TAG_WEIGHT = 10;
const DESTINY_TAG_WEIGHT = 10;
const ORIGIN_TAG_WEIGHT = 10;
const ITEM_TAG_WEIGHT = 10;
const MODE_PREFERENCE_WEIGHT = 5;
const SAME_MODE_COOLDOWN_PENALTY = 10;
const SAME_THREAD_COOLDOWN_PENALTY = 10;
const MIN_PLAYABLE_EVIDENCE_SCORE = 2;

export class LifeInterludeTriggerEngine {
  private readonly registry: LifeInterludeRegistry;

  constructor(context: LifeInterludeTriggerEngineContext = {}) {
    this.registry = context.registry ?? loadLifeInterludeRegistry();
  }

  evaluate(context: LifeInterludeTriggerContext): readonly LifeInterludeCandidate[] {
    return this.evaluateDetailed(context).candidates;
  }

  evaluateDetailed(context: LifeInterludeTriggerContext): LifeInterludeTriggerEvaluation {
    const signals = buildSignalContext(context);
    const ageRule = findAgeHardRule(this.registry.triggerRules.ageHardRules, context.ageMonth);
    const blocked: LifeInterludeTriggerBlockReason[] = [];
    const candidates: ScoredCandidate[] = [];

    for (const definition of this.registry.listInterludes()) {
      const blockReasons = getBlockReasons(definition, context, signals, ageRule);
      if (blockReasons.length > 0) {
        blocked.push(...blockReasons);
        continue;
      }
      candidates.push(scoreDefinition(definition, context, signals, this.registry));
    }

    const sortedCandidates = freezeArray(
      candidates
        .sort(compareScoredCandidates)
        .map((item) => item.candidate)
    );

    const evaluation = {
      candidates: sortedCandidates,
      blocked: freezeArray(blocked.map((reason) => deepFreeze({ ...reason }))),
      debug: deepFreeze({
        source: LIFE_INTERLUDE_TRIGGER_ENGINE_SOURCE,
        signalTags: freezeArray(signals.publicTags),
        ...(ageRule === undefined ? {} : {
          ageRule: deepFreeze({
            ageMonths: freezeArray([ageRule.ageMonths[0], ageRule.ageMonths[1]]) as readonly [number, number],
            allowedModes: freezeArray([...ageRule.allowedModes]),
            ...(ageRule.maxDifficulty === undefined ? {} : { maxDifficulty: ageRule.maxDifficulty })
          })
        })
      })
    } satisfies LifeInterludeTriggerEvaluation;

    return deepFreeze(evaluation);
  }
}

function getBlockReasons(
  definition: LifeInterludeDefinition,
  context: LifeInterludeTriggerContext,
  signals: SignalContext,
  ageRule: LifeInterludeAgeHardRule | undefined
): readonly LifeInterludeTriggerBlockReason[] {
  const reasons: LifeInterludeTriggerBlockReason[] = [];
  if (ageRule === undefined) {
    reasons.push(block(definition.id, "ageHardRule", `No age hard rule matched age ${context.ageMonth}`));
  } else {
    if (!ageRule.allowedModes.includes(definition.mode)) {
      reasons.push(block(definition.id, "modeNotAllowed", `${definition.mode} is not allowed at age ${context.ageMonth}`));
    }
    if (
      ageRule.maxDifficulty !== undefined &&
      DIFFICULTY_RANK[definition.difficultyTier] > DIFFICULTY_RANK[ageRule.maxDifficulty]
    ) {
      reasons.push(
        block(
          definition.id,
          "difficultyTooHigh",
          `${definition.difficultyTier} exceeds ${ageRule.maxDifficulty} at age ${context.ageMonth}`
        )
      );
    }
  }
  if (context.ageMonth < definition.ageRange[0] || context.ageMonth > definition.ageRange[1]) {
    reasons.push(block(definition.id, "ageRange", `Age ${context.ageMonth} is outside ${definition.ageRange[0]}-${definition.ageRange[1]}`));
  }
  if (
    context.ageMonth >= 48 &&
    context.ageMonth <= 107 &&
    definition.mode !== "text_check" &&
    !CHILDHOOD_PLAYABLE_REALITY_LAYERS.has(definition.realityLayer)
  ) {
    reasons.push(
      block(
        definition.id,
        "realityLayerNotAllowed",
        `${definition.realityLayer} is not allowed for childhood playable interludes`
      )
    );
  }
  const missingHooks = (definition.requiredHooks ?? []).filter((hook) => !hasSignal(signals.tokenSet, hook));
  if (missingHooks.length > 0) {
    reasons.push(
      block(
        definition.id,
        "missingRequiredHook",
        `Missing required hooks: ${missingHooks.filter(isPublicSignal).join(",")}`
      )
    );
  }
  if (definition.mode !== "text_check") {
    const evidence = getPlayableEvidenceScore(definition, context, signals);
    if (evidence < MIN_PLAYABLE_EVIDENCE_SCORE) {
      reasons.push(
        block(
          definition.id,
          "insufficientEvidence",
          `Playable interlude requires ${MIN_PLAYABLE_EVIDENCE_SCORE} evidence signals, got ${evidence}`
        )
      );
    }
  }
  return reasons;
}

function getPlayableEvidenceScore(
  definition: LifeInterludeDefinition,
  context: LifeInterludeTriggerContext,
  signals: SignalContext
): number {
  let score = 0;
  if ((definition.requiredHooks ?? []).some((hook) => hasSignal(signals.tokenSet, hook))) {
    score += 2;
  }
  if (definition.storylineTags.some((tag) => hasSignal(signals.tokenSet, tag))) {
    score += 1;
  }
  if (definition.threadTags.some((tag) => hasSignal(signals.tokenSet, tag))) {
    score += hasStrongThreadEvidence(context.activeThreadTags) ? 2 : 1;
  }
  if ((definition.preferredDestinies ?? []).some((tag) => hasSignal(signals.tokenSet, tag))) {
    score += 1;
  }
  if ((definition.preferredRoots ?? []).some((tag) => hasSignal(signals.tokenSet, tag))) {
    score += 1;
  }
  if ((definition.preferredOrigins ?? []).some((tag) => hasSignal(signals.tokenSet, tag))) {
    score += 1;
  }
  if ((definition.preferredItems ?? []).some((tag) => hasSignal(signals.tokenSet, tag))) {
    score += 1;
  }
  return score;
}

function hasStrongThreadEvidence(tags: readonly string[]): boolean {
  return tags.some((tag) => {
    const normalized = normalizeToken(tag);
    return normalized === "crisis" ||
      normalized === "developing" ||
      normalized === "thread_stage:crisis" ||
      normalized === "thread_stage:developing" ||
      normalized === "thread_stage_crisis" ||
      normalized === "thread_stage_developing";
  });
}

function scoreDefinition(
  definition: LifeInterludeDefinition,
  context: LifeInterludeTriggerContext,
  signals: SignalContext,
  registry: LifeInterludeRegistry
): ScoredCandidate {
  const weights: WeightEntry[] = [{ source: "baseWeight", weight: definition.baseWeight }];
  const matchedTags: string[] = [];
  const matchedHooks: string[] = [];

  addMatchWeight(weights, matchedHooks, "requiredHooks", definition.requiredHooks ?? [], signals.tokenSet, BASE_REQUIRED_HOOK_WEIGHT);
  addMatchWeight(weights, matchedTags, "storylineTags", definition.storylineTags, signals.tokenSet, STORYLINE_TAG_WEIGHT);
  addMatchWeight(weights, matchedTags, "threadTags", definition.threadTags, signals.tokenSet, THREAD_TAG_WEIGHT);
  addMatchWeight(weights, matchedTags, "preferredRoots", definition.preferredRoots ?? [], signals.tokenSet, ROOT_TAG_WEIGHT);
  addMatchWeight(weights, matchedTags, "preferredDestinies", definition.preferredDestinies ?? [], signals.tokenSet, DESTINY_TAG_WEIGHT);
  addMatchWeight(weights, matchedTags, "preferredOrigins", definition.preferredOrigins ?? [], signals.tokenSet, ORIGIN_TAG_WEIGHT);
  addMatchWeight(weights, matchedTags, "preferredItems", definition.preferredItems ?? [], signals.tokenSet, ITEM_TAG_WEIGHT);

  for (const rule of registry.triggerRules.modePreferenceRules) {
    if (rule.mode !== definition.mode || context.ageMonth < rule.ageMinMonths) {
      continue;
    }
    addMatchWeight(weights, matchedTags, "modePreference", rule.preferredTags, signals.tokenSet, MODE_PREFERENCE_WEIGHT);
  }

  const penalties = calculatePenalties(definition, context, registry);
  const fatigueMultiplier = getFatigueMultiplier(context.recentInterludesLast24Months, registry);
  const rawWeight = weights.reduce((sum, entry) => sum + entry.weight, 0) -
    penalties.reduce((sum, entry) => sum + entry.amount, 0);
  const finalWeight = roundWeight(Math.max(0, rawWeight) * fatigueMultiplier);

  const debug = deepFreeze({
    source: LIFE_INTERLUDE_TRIGGER_ENGINE_SOURCE,
    matchedTags: freezeArray(uniqueStable(matchedTags.filter(isPublicSignal))),
    matchedHooks: freezeArray(uniqueStable(matchedHooks.filter(isPublicSignal))),
    penalties: freezeArray(penalties.map((penalty) => deepFreeze({ ...penalty }))),
    fatigueMultiplier,
    weightBreakdown: freezeArray(weights.map((entry) => deepFreeze({ ...entry })))
  } satisfies LifeInterludeCandidateDebug);
  const durationPreview = getDurationPreview(definition);

  const candidate = deepFreeze({
    definitionId: definition.id,
    mode: definition.mode,
    name: definition.name,
    difficultyTier: definition.difficultyTier,
    displayRisk: DISPLAY_RISK[definition.difficultyTier],
    ...(durationPreview === undefined ? {} : { durationPreview }),
    worldExplanation: definition.worldExplanation,
    autoResolveAllowed: true,
    finalWeight,
    debug
  } satisfies LifeInterludeCandidate);

  return {
    candidate,
    sortMode: definition.mode,
    sortId: definition.id
  };
}

function addMatchWeight(
  weights: WeightEntry[],
  matches: string[],
  source: string,
  values: readonly string[],
  tokenSet: ReadonlySet<string>,
  weightPerMatch: number
): void {
  const matched = values.filter((value) => hasSignal(tokenSet, value));
  if (matched.length === 0) {
    return;
  }
  weights.push({
    source,
    weight: matched.length * weightPerMatch
  });
  matches.push(...matched);
}

function calculatePenalties(
  definition: LifeInterludeDefinition,
  context: LifeInterludeTriggerContext,
  registry: LifeInterludeRegistry
): readonly PenaltyEntry[] {
  const penalties: PenaltyEntry[] = [];
  const budget = registry.getFrequencyBudget();
  const candidateThreadTokens = buildTokenSet(definition.threadTags);
  for (const history of context.interludeHistory) {
    const monthsAgo = context.ageMonth - history.ageMonth;
    if (monthsAgo < 0) {
      continue;
    }
    if (history.mode === definition.mode && monthsAgo <= budget.cooldowns.sameModeMonths) {
      penalties.push({
        source: `sameModeCooldown:${history.mode}`,
        amount: SAME_MODE_COOLDOWN_PENALTY
      });
    }
    if (
      history.sourceThreadId !== undefined &&
      monthsAgo <= budget.cooldowns.sameThreadMonths &&
      historyMatchesThread(history, candidateThreadTokens)
    ) {
      penalties.push({
        source: `sameThreadCooldown:${history.sourceThreadId}`,
        amount: SAME_THREAD_COOLDOWN_PENALTY
      });
    }
  }
  return penalties;
}

function historyMatchesThread(
  history: LifeInterludeHistoryEntry,
  candidateThreadTokens: ReadonlySet<string>
): boolean {
  if (history.sourceThreadId === undefined) {
    return false;
  }
  for (const token of buildTokenSet([history.sourceThreadId])) {
    if (candidateThreadTokens.has(token)) {
      return true;
    }
  }
  return false;
}

function getFatigueMultiplier(
  recentInterludesLast24Months: number,
  registry: LifeInterludeRegistry
): number {
  const matchingRule = registry.getFrequencyBudget().fatigue.find((rule) =>
    recentInterludesLast24Months >= rule.recentPlayableInterludesLast24Months[0] &&
    recentInterludesLast24Months <= rule.recentPlayableInterludesLast24Months[1]
  );
  return matchingRule?.weightMultiplier ?? 1;
}

function findAgeHardRule(
  rules: readonly LifeInterludeAgeHardRule[],
  ageMonth: number
): LifeInterludeAgeHardRule | undefined {
  return rules.find((rule) => ageMonth >= rule.ageMonths[0] && ageMonth <= rule.ageMonths[1]);
}

function block(
  definitionId: string,
  reason: LifeInterludeTriggerBlockReasonCode,
  message: string
): LifeInterludeTriggerBlockReason {
  return deepFreeze({
    definitionId,
    reason,
    message
  });
}

function compareScoredCandidates(left: ScoredCandidate, right: ScoredCandidate): number {
  return right.candidate.finalWeight - left.candidate.finalWeight ||
    left.sortMode.localeCompare(right.sortMode) ||
    left.sortId.localeCompare(right.sortId);
}

function getDurationPreview(definition: LifeInterludeDefinition): string | undefined {
  if (definition.durationTargetSeconds !== undefined) {
    return `${definition.durationTargetSeconds}s`;
  }
  if (definition.turnLimit !== undefined) {
    return `${definition.turnLimit} turns`;
  }
  return undefined;
}

function buildSignalContext(context: LifeInterludeTriggerContext): SignalContext {
  const rawSignals = [
    ...context.recentMonthlyEventIds.map((id) => `monthly:${id}`),
    ...context.recentMonthlyEventIds,
    ...context.recentHooks.map((id) => `hook:${id}`),
    ...context.recentHooks,
    ...context.activeStorylineTags,
    ...context.activeThreadTags,
    ...context.openingTags,
    ...context.destinyTags,
    ...context.rootTags,
    ...context.originTags,
    ...context.itemTags,
    ...context.currentWoundIds.map((id) => `wound:${id}`),
    ...context.currentWoundIds,
    ...context.currentHeartKnotIds.map((id) => `heartKnot:${id}`),
    ...context.currentHeartKnotIds
  ].filter(isSafeForInternalMatching);
  return {
    tokenSet: buildTokenSet(rawSignals),
    publicTags: freezeArray(uniqueStable(rawSignals.filter(isPublicSignal)))
  };
}

function buildTokenSet(values: readonly string[]): ReadonlySet<string> {
  const tokenSet = new Set<string>();
  for (const value of values) {
    addTokenVariants(tokenSet, value);
  }
  return tokenSet;
}

function hasSignal(tokenSet: ReadonlySet<string>, expected: string): boolean {
  for (const token of buildTokenSet([expected])) {
    if (tokenSet.has(token)) {
      return true;
    }
  }
  return false;
}

function addTokenVariants(tokens: Set<string>, value: string): void {
  if (!isSafeForInternalMatching(value)) {
    return;
  }
  const normalized = normalizeToken(value);
  if (normalized.length === 0) {
    return;
  }
  tokens.add(normalized);
  for (const alias of getTokenAliases(normalized)) {
    tokens.add(alias);
  }
}

function getTokenAliases(normalized: string): readonly string[] {
  const aliases: string[] = [];
  for (const prefix of ["destiny", "hidden", "item", "origin", "root", "storyline", "thread", "hook"] as const) {
    if (normalized.startsWith(`${prefix}_`)) {
      const rest = normalized.slice(prefix.length + 1);
      aliases.push(`${prefix}:${rest}`, rest);
    }
    if (normalized.startsWith(`${prefix}:`)) {
      const rest = normalized.slice(prefix.length + 1);
      aliases.push(`${prefix}_${rest}`, rest);
    }
  }
  return aliases;
}

function isSafeForInternalMatching(value: string): boolean {
  const normalized = normalizeToken(value);
  return normalized.length > 0 &&
    !normalized.includes("true_name") &&
    !normalized.includes("truename");
}

function isPublicSignal(value: string): boolean {
  const normalized = normalizeToken(value);
  return isSafeForInternalMatching(value) &&
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

function roundWeight(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.round(value * 100) / 100);
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
