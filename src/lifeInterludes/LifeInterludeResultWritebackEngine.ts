import { EventThreadEngine } from "../lifeStorylines/EventThreadEngine";
import { loadLifeInterludeRegistry } from "./LifeInterludeRegistry";
import type {
  LifeInterludeAppliedEffect,
  LifeInterludeApplyEffectsInput,
  LifeInterludeOutcome,
  LifeInterludeResult,
  LifeInterludeResultWritebackInput,
  LifeInterludeResultWritebackRegistryReader,
  LifeInterludeRunConfig,
  LifeInterludeSkippedEffect,
  LifeInterludeWritebackApplication,
  LifeInterludeWritebackEffect
} from "../types/life-interlude-types.v0.1";
import type {
  FamilyState,
  LifeHeartKnotState,
  LifePhaseId,
  LifeSimulationState,
  LifeSkills,
  LifeWoundState,
  MonthlyLifeLogEntry,
  MonthlyOutcomeBandId
} from "../types/life-monthly-events-types.v0.1";
import type {
  EventThreadAdvanceHook,
  LifeStorylineState,
  StorylineProgress
} from "../types/life-storylines-types.v0.1";

export const LIFE_INTERLUDE_RESULT_WRITEBACK_ENGINE_SOURCE = "life_interludes_v0_1_result_writeback_engine";

type EffectSource = "registry" | "result";
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type NumericRecord = Record<string, number>;
type FlagRecord = Record<string, number | boolean | string>;

interface QueuedEffect {
  readonly effect: LifeInterludeWritebackEffect;
  readonly source: EffectSource;
}

interface WritebackDraft {
  core: Mutable<LifeSimulationState["core"]>;
  aptitude: Mutable<LifeSimulationState["aptitude"]>;
  lifeSkills: Mutable<LifeSkills>;
  karma: number;
  merit: number;
  heartDemon: number;
  wounds: LifeWoundState[];
  heartKnots: LifeHeartKnotState[];
  family: FamilyState;
  hiddenFateProgress: NumericRecord;
  carriedItemAffinity: NumericRecord;
  flags: FlagRecord;
  lifeStorylineState?: LifeStorylineState;
  generatedHooks: string[];
  logSummaries: string[];
  appliedEffects: LifeInterludeAppliedEffect[];
  skippedEffects: LifeInterludeSkippedEffect[];
}

type StatTarget =
  | { readonly section: "core"; readonly key: keyof LifeSimulationState["core"] }
  | { readonly section: "aptitude"; readonly key: keyof LifeSimulationState["aptitude"] }
  | { readonly section: "lifeSkills"; readonly key: keyof LifeSkills }
  | { readonly section: "family"; readonly key: Exclude<keyof FamilyState, "flags"> }
  | { readonly section: "root"; readonly key: "karma" | "merit" | "heartDemon" };

function hiddenTermFromCodePoints(codePoints: readonly number[]): string {
  return String.fromCodePoint(...codePoints);
}

const HIDDEN_TRUE_NAME_TERMS = [
  hiddenTermFromCodePoints([
    0x53, 0x48, 0x4f, 0x55, 0x4c, 0x44, 0x5f, 0x4e, 0x4f, 0x54, 0x5f, 0x4c, 0x45, 0x41, 0x4b,
    0x5f, 0x48, 0x49, 0x44, 0x44, 0x45, 0x4e, 0x5f, 0x4e, 0x41, 0x4d, 0x45
  ]),
  hiddenTermFromCodePoints([0x53e4, 0x96f7, 0x771f, 0x8840]),
  hiddenTermFromCodePoints([0x4e39, 0x5723, 0x9057, 0x9aa8]),
  hiddenTermFromCodePoints([0x7cfb, 0x7edf, 0x5171, 0x9e23, 0x4f53]),
  hiddenTermFromCodePoints([0x524d, 0x4e16, 0x5251, 0x9b44]),
  hiddenTermFromCodePoints([0x9b54, 0x5370, 0x5fae, 0x75d5]),
  hiddenTermFromCodePoints([0x592a, 0x9634, 0x6b8b, 0x8109]),
  hiddenTermFromCodePoints([0x9f99, 0x9aa8, 0x672a, 0x9192]),
  hiddenTermFromCodePoints([0x5929, 0x4e66, 0x6b8b, 0x9875]),
  hiddenTermFromCodePoints([0x57df, 0x5916, 0x6218, 0x573a, 0x56de, 0x54cd]),
  hiddenTermFromCodePoints([0x529f, 0x5fb7, 0x79cd, 0x5b50])
] as const;

const CORE_STAT_MAP: Readonly<Record<string, keyof LifeSimulationState["core"]>> = {
  jing: "jing",
  qi: "qi",
  shen: "shen"
};

const APTITUDE_STAT_MAP: Readonly<Record<string, keyof LifeSimulationState["aptitude"]>> = {
  rootbone: "rootBone",
  root_bone: "rootBone",
  comprehension: "comprehension",
  inspiration: "inspiration",
  fortune: "fortune",
  heart: "heart",
  lifespan: "lifespan"
};

const LIFE_SKILL_STAT_MAP: Readonly<Record<string, keyof LifeSkills>> = {
  study: "study",
  martial: "martial",
  alchemy: "alchemy",
  herbalism: "alchemy",
  craft: "craft",
  social: "social",
  stealth: "stealth",
  ritual: "ritual",
  survival: "survival"
};

const FAMILY_STAT_MAP: Readonly<Record<string, Exclude<keyof FamilyState, "flags">>> = {
  kinship: "kinship",
  familystrain: "familyStrain",
  family_strain: "familyStrain",
  familywealth: "familyWealth",
  family_wealth: "familyWealth"
};

export class LifeInterludeResultWritebackEngine {
  private readonly registry: LifeInterludeResultWritebackRegistryReader;

  constructor(registry?: LifeInterludeResultWritebackRegistryReader) {
    this.registry = registry ?? loadLifeInterludeRegistry();
  }

  applyResult(input: LifeInterludeResultWritebackInput): LifeInterludeWritebackApplication {
    const registry = input.registry ?? this.registry;
    const skippedEffects: LifeInterludeSkippedEffect[] = [];
    const effectiveOutcome = getEffectiveOutcome(input.result, skippedEffects);
    const rule = registry.getWritebackRule(input.runConfig.resultWritebackId);
    const ruleEffects = rule.outcomes[effectiveOutcome] ?? [];
    const queuedEffects = uniqueQueuedEffects([
      ...ruleEffects.map((effect) => ({ effect, source: "registry" as const })),
      ...input.result.effects.map((effect) => ({ effect, source: "result" as const }))
    ]);

    return applyQueuedEffects({
      state: input.state,
      runConfig: input.runConfig,
      result: input.result,
      effects: queuedEffects,
      effectiveOutcome,
      initialSkippedEffects: skippedEffects,
      ...(input.eventThreadEngine === undefined ? {} : { eventThreadEngine: input.eventThreadEngine })
    });
  }

  applyEffects(input: LifeInterludeApplyEffectsInput): LifeInterludeWritebackApplication {
    const effects = input.effects ?? input.result.effects;
    return applyQueuedEffects({
      state: input.state,
      runConfig: input.runConfig,
      result: input.result,
      effects: uniqueQueuedEffects(effects.map((effect) => ({ effect, source: "result" as const }))),
      effectiveOutcome: input.result.outcome,
      initialSkippedEffects: [],
      ...(input.eventThreadEngine === undefined ? {} : { eventThreadEngine: input.eventThreadEngine })
    });
  }
}

function applyQueuedEffects(input: {
  readonly state: LifeSimulationState;
  readonly runConfig: LifeInterludeRunConfig;
  readonly result: LifeInterludeResult;
  readonly effects: readonly QueuedEffect[];
  readonly effectiveOutcome: LifeInterludeOutcome;
  readonly initialSkippedEffects: readonly LifeInterludeSkippedEffect[];
  readonly eventThreadEngine?: {
    advanceStateByHook(state: LifeStorylineState, hook: EventThreadAdvanceHook): LifeStorylineState;
  };
}): LifeInterludeWritebackApplication {
  const draft = createDraft(input.state, input.result, input.initialSkippedEffects);

  for (const queued of input.effects) {
    if (!isPublicEffect(queued.effect)) {
      draft.skippedEffects.push({
        reason: "unsafePublicEffect",
        effectType: queued.effect.type
      });
      continue;
    }
    applyEffect(draft, input.state, input.runConfig, input.result, queued, input.eventThreadEngine);
  }

  applyDestinyFailureHooks(draft, input.state, input.runConfig, input.result);

  const nextState = buildNextState(input.state, input.runConfig, input.result, draft);
  const application = {
    nextState,
    appliedEffects: freezeArray(draft.appliedEffects),
    skippedEffects: freezeArray(draft.skippedEffects),
    generatedHooks: freezeArray(publicUnique(draft.generatedHooks)),
    debug: deepFreeze({
      source: LIFE_INTERLUDE_RESULT_WRITEBACK_ENGINE_SOURCE,
      resultWritebackId: input.runConfig.resultWritebackId,
      effectiveOutcome: input.effectiveOutcome,
      appliedEffectCount: draft.appliedEffects.length,
      skippedEffectCount: draft.skippedEffects.length,
      generatedHooks: freezeArray(publicUnique(draft.generatedHooks))
    })
  } satisfies LifeInterludeWritebackApplication;

  return deepFreeze(application);
}

function createDraft(
  state: LifeSimulationState,
  result: LifeInterludeResult,
  initialSkippedEffects: readonly LifeInterludeSkippedEffect[]
): WritebackDraft {
  return {
    core: { ...state.core },
    aptitude: { ...state.aptitude },
    lifeSkills: { ...state.lifeSkills },
    karma: state.karma,
    merit: state.merit,
    heartDemon: state.heartDemon,
    wounds: state.wounds.map((wound) => cloneJson(wound)),
    heartKnots: state.heartKnots.map((knot) => cloneJson(knot)),
    family: {
      ...state.family,
      flags: sanitizeFlags(state.family.flags)
    },
    hiddenFateProgress: { ...state.hiddenFateProgress },
    carriedItemAffinity: { ...state.carriedItemAffinity },
    flags: sanitizeFlags(state.flags),
    ...(state.lifeStorylineState === undefined ? {} : { lifeStorylineState: cloneJson(state.lifeStorylineState) }),
    generatedHooks: [...result.generatedHooks.filter(isPublicSignal)],
    logSummaries: [result.visibleSummary].filter(isPublicText),
    appliedEffects: [],
    skippedEffects: initialSkippedEffects.map((effect) => ({ ...effect }))
  };
}

function getEffectiveOutcome(
  result: LifeInterludeResult,
  skippedEffects: LifeInterludeSkippedEffect[]
): LifeInterludeOutcome {
  if (result.outcome === "hiddenSuccess" && !result.playerChoseManual) {
    skippedEffects.push({
      reason: "autoHiddenSuccessDowngraded",
      effectType: "hiddenSuccess"
    });
    return "success";
  }
  return result.outcome;
}

function applyEffect(
  draft: WritebackDraft,
  baseState: LifeSimulationState,
  runConfig: LifeInterludeRunConfig,
  result: LifeInterludeResult,
  queued: QueuedEffect,
  eventThreadEngine?: {
    advanceStateByHook(state: LifeStorylineState, hook: EventThreadAdvanceHook): LifeStorylineState;
  }
): void {
  const effect = queued.effect;
  switch (effect.type) {
    case "modifyStat":
      applyModifyStat(draft, effect, queued.source);
      break;
    case "addWound":
      upsertWound(draft, effect.woundId, effect.severity, baseState.ageMonths, queued.source);
      break;
    case "addHeartKnot":
      upsertHeartKnot(draft, effect.knotId, effect.severity, baseState.ageMonths, queued.source);
      break;
    case "modifyHiddenFateProgress":
      draft.hiddenFateProgress[effect.hiddenFateId] = clampMeter((draft.hiddenFateProgress[effect.hiddenFateId] ?? 0) + effect.amount);
      if (isPublicText(effect.visibleHint)) {
        draft.logSummaries.push(effect.visibleHint);
      }
      pushApplied(draft, queued.source, effect.type, effect.hiddenFateId, effect.amount);
      break;
    case "modifyCarriedItemAffinity":
      draft.carriedItemAffinity[effect.itemId] = clampMeter((draft.carriedItemAffinity[effect.itemId] ?? 0) + effect.amount);
      pushApplied(draft, queued.source, effect.type, effect.itemId, effect.amount);
      break;
    case "modifyStorylineScore":
      applyModifyStorylineScore(draft, effect, queued.source);
      break;
    case "modifyThreadProgress":
      applyModifyThreadProgress(draft, baseState, runConfig, result, effect, queued.source, eventThreadEngine);
      break;
    case "modifyKarmaMerit":
      if (effect.karma !== undefined) {
        draft.karma += effect.karma;
      }
      if (effect.merit !== undefined) {
        draft.merit += effect.merit;
      }
      pushApplied(draft, queued.source, effect.type, "karmaMerit", (effect.karma ?? 0) + (effect.merit ?? 0));
      break;
    case "addAge18Hook":
      addGeneratedHook(draft, effect.hookId, effect.amount ?? 1);
      pushApplied(draft, queued.source, effect.type, effect.hookId, effect.amount ?? 1);
      break;
    case "addLifeLog":
      if (isPublicText(effect.text)) {
        draft.logSummaries.push(effect.text);
        pushApplied(draft, queued.source, effect.type, "lifeLog");
      } else {
        draft.skippedEffects.push({
          reason: "unsafeLifeLogText",
          effectType: effect.type
        });
      }
      break;
  }
}

function applyModifyStat(
  draft: WritebackDraft,
  effect: Extract<LifeInterludeWritebackEffect, { readonly type: "modifyStat" }>,
  source: EffectSource
): void {
  const target = resolveStatTarget(effect.stat);
  if (target === undefined) {
    draft.skippedEffects.push({
      reason: "unknownStat",
      effectType: effect.type,
      target: effect.stat
    });
    return;
  }
  switch (target.section) {
    case "core":
      draft.core[target.key] = clampMeter(draft.core[target.key] + effect.amount);
      break;
    case "aptitude":
      draft.aptitude[target.key] = clampMeter(draft.aptitude[target.key] + effect.amount);
      break;
    case "lifeSkills":
      draft.lifeSkills[target.key] = clampMeter(draft.lifeSkills[target.key] + effect.amount);
      break;
    case "family":
      draft.family = {
        ...draft.family,
        [target.key]: clampMeter(draft.family[target.key] + effect.amount)
      };
      break;
    case "root":
      if (target.key === "heartDemon") {
        draft.heartDemon = clampMeter(draft.heartDemon + effect.amount);
      } else {
        draft[target.key] += effect.amount;
      }
      break;
  }
  pushApplied(draft, source, effect.type, effect.stat, effect.amount);
}

function resolveStatTarget(stat: string): StatTarget | undefined {
  const normalized = normalizeToken(stat);
  const coreKey = CORE_STAT_MAP[normalized];
  if (coreKey !== undefined) {
    return { section: "core", key: coreKey };
  }
  const aptitudeKey = APTITUDE_STAT_MAP[normalized];
  if (aptitudeKey !== undefined) {
    return { section: "aptitude", key: aptitudeKey };
  }
  const skillKey = LIFE_SKILL_STAT_MAP[normalized];
  if (skillKey !== undefined) {
    return { section: "lifeSkills", key: skillKey };
  }
  const familyKey = FAMILY_STAT_MAP[normalized];
  if (familyKey !== undefined) {
    return { section: "family", key: familyKey };
  }
  if (normalized === "karma") {
    return { section: "root", key: "karma" };
  }
  if (normalized === "merit") {
    return { section: "root", key: "merit" };
  }
  if (normalized === "heartdemon" || normalized === "heart_demon") {
    return { section: "root", key: "heartDemon" };
  }
  return undefined;
}

function upsertWound(
  draft: WritebackDraft,
  woundId: string,
  severity: number,
  ageMonths: number,
  source: EffectSource
): void {
  const index = draft.wounds.findIndex((wound) => wound.id === woundId);
  if (index >= 0) {
    const existing = draft.wounds[index]!;
    draft.wounds[index] = {
      ...existing,
      severity: clampSeverity(existing.severity + severity)
    };
  } else {
    draft.wounds.push({
      id: woundId,
      name: woundId,
      severity: clampSeverity(severity),
      tags: freezeArray([woundId]),
      createdAtMonth: ageMonths
    });
  }
  pushApplied(draft, source, "addWound", woundId, severity);
}

function upsertHeartKnot(
  draft: WritebackDraft,
  knotId: string,
  severity: number,
  ageMonths: number,
  source: EffectSource
): void {
  const index = draft.heartKnots.findIndex((knot) => knot.id === knotId);
  if (index >= 0) {
    const existing = draft.heartKnots[index]!;
    draft.heartKnots[index] = {
      ...existing,
      severity: clampSeverity(existing.severity + severity)
    };
  } else {
    draft.heartKnots.push({
      id: knotId,
      name: knotId,
      severity: clampSeverity(severity),
      tags: freezeArray([knotId]),
      createdAtMonth: ageMonths
    });
  }
  pushApplied(draft, source, "addHeartKnot", knotId, severity);
}

function applyModifyStorylineScore(
  draft: WritebackDraft,
  effect: Extract<LifeInterludeWritebackEffect, { readonly type: "modifyStorylineScore" }>,
  source: EffectSource
): void {
  if (draft.lifeStorylineState === undefined) {
    draft.skippedEffects.push({
      reason: "missingLifeStorylineState",
      effectType: effect.type,
      target: effect.storylineId
    });
    return;
  }
  let matched = false;
  const updateStoryline = (storyline: StorylineProgress): StorylineProgress => {
    if (storyline.storylineId !== effect.storylineId) {
      return storyline;
    }
    matched = true;
    return deepFreeze({
      ...storyline,
      score: clampMeter(storyline.score + effect.amount),
      tags: freezeArray([...storyline.tags])
    });
  };
  draft.lifeStorylineState = deepFreeze({
    ...draft.lifeStorylineState,
    storylineScores: freezeArray(draft.lifeStorylineState.storylineScores.map(updateStoryline)),
    activeStorylines: freezeArray(draft.lifeStorylineState.activeStorylines.map(updateStoryline))
  });
  if (matched) {
    pushApplied(draft, source, effect.type, effect.storylineId, effect.amount);
  } else {
    draft.skippedEffects.push({
      reason: "missingStoryline",
      effectType: effect.type,
      target: effect.storylineId
    });
  }
}

function applyModifyThreadProgress(
  draft: WritebackDraft,
  baseState: LifeSimulationState,
  runConfig: LifeInterludeRunConfig,
  result: LifeInterludeResult,
  effect: Extract<LifeInterludeWritebackEffect, { readonly type: "modifyThreadProgress" }>,
  source: EffectSource,
  eventThreadEngine?: {
    advanceStateByHook(state: LifeStorylineState, hook: EventThreadAdvanceHook): LifeStorylineState;
  }
): void {
  if (draft.lifeStorylineState === undefined) {
    draft.skippedEffects.push({
      reason: "missingLifeStorylineState",
      effectType: effect.type,
      target: effect.threadId
    });
    return;
  }
  const engine = eventThreadEngine ?? new EventThreadEngine();
  try {
    draft.lifeStorylineState = engine.advanceStateByHook(draft.lifeStorylineState, {
      id: `interlude_result:${runConfig.interludeRunId}:${effect.threadId}`,
      threadId: effect.threadId,
      progressDelta: effect.progress,
      ...(effect.tension === undefined ? {} : { tensionDelta: effect.tension }),
      tags: publicUnique([
        "life_interlude",
        runConfig.definitionId,
        runConfig.mode,
        result.outcome,
        ...result.generatedHooks
      ]),
      visibility: "visible",
      occurredAtMonth: baseState.ageMonths,
      weight: 1
    });
    pushApplied(draft, source, effect.type, effect.threadId, effect.progress + (effect.tension ?? 0));
  } catch {
    draft.skippedEffects.push({
      reason: "missingThread",
      effectType: effect.type,
      target: effect.threadId
    });
  }
}

function applyDestinyFailureHooks(
  draft: WritebackDraft,
  state: LifeSimulationState,
  runConfig: LifeInterludeRunConfig,
  result: LifeInterludeResult
): void {
  if (result.outcome !== "failure") {
    return;
  }
  const tokens = buildEvidenceTokens(state, runConfig, result);
  if (hasEvidence(tokens, "destiny_waste_root_reversal")) {
    const current = toFiniteNumber(draft.flags.destiny_waste_root_reversal_points);
    draft.flags.destiny_waste_root_reversal_points = current + 1;
    draft.appliedEffects.push(deepFreeze({
      effectType: "destinyFailureHook",
      source: "destinyFailureHook",
      target: "destiny_waste_root_reversal_points",
      amount: 1
    }));
  }
  if (hasEvidence(tokens, "destiny_unyielding")) {
    reduceMostSevereAffliction(draft);
    draft.aptitude.heart = clampMeter(draft.aptitude.heart + 1);
    draft.appliedEffects.push(deepFreeze({
      effectType: "destinyFailureHook",
      source: "destinyFailureHook",
      target: "destiny_unyielding_failure_recovery",
      amount: 1
    }));
  }
  if (hasEvidence(tokens, "destiny_demon_seed") || hasEvidence(tokens, "destiny_demon_heart_seed")) {
    draft.heartDemon = clampMeter(draft.heartDemon + 2);
    addGeneratedHook(draft, "demon_heart_seed_failure_conversion", 1);
    draft.appliedEffects.push(deepFreeze({
      effectType: "destinyFailureHook",
      source: "destinyFailureHook",
      target: "demon_heart_seed_failure_conversion",
      amount: 2
    }));
  }
}

function reduceMostSevereAffliction(draft: WritebackDraft): void {
  const wound = draft.wounds
    .map((entry, index) => ({ kind: "wound" as const, entry, index }))
    .sort((left, right) => right.entry.severity - left.entry.severity || right.entry.createdAtMonth - left.entry.createdAtMonth)[0];
  const knot = draft.heartKnots
    .map((entry, index) => ({ kind: "knot" as const, entry, index }))
    .sort((left, right) => right.entry.severity - left.entry.severity || right.entry.createdAtMonth - left.entry.createdAtMonth)[0];
  const target = [wound, knot]
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
    .sort((left, right) => right.entry.severity - left.entry.severity || right.entry.createdAtMonth - left.entry.createdAtMonth)[0];
  if (target === undefined) {
    return;
  }
  if (target.kind === "wound") {
    draft.wounds[target.index] = {
      ...target.entry,
      severity: Math.max(0, target.entry.severity - 1)
    };
  } else {
    draft.heartKnots[target.index] = {
      ...target.entry,
      severity: Math.max(0, target.entry.severity - 1)
    };
  }
}

function addGeneratedHook(draft: WritebackDraft, hookId: string, amount: number): void {
  if (!isPublicSignal(hookId)) {
    draft.skippedEffects.push({
      reason: "unsafeGeneratedHook",
      target: hookId
    });
    return;
  }
  draft.generatedHooks.push(hookId);
  const key = `age18Hook:${hookId}`;
  draft.flags[key] = toFiniteNumber(draft.flags[key]) + amount;
}

function buildNextState(
  state: LifeSimulationState,
  runConfig: LifeInterludeRunConfig,
  result: LifeInterludeResult,
  draft: WritebackDraft
): LifeSimulationState {
  const log = createInterludeLog(state, runConfig, result, draft);
  return deepFreeze({
    ...state,
    core: deepFreeze({ ...draft.core }),
    aptitude: deepFreeze({ ...draft.aptitude }),
    lifeSkills: deepFreeze({ ...draft.lifeSkills }),
    karma: draft.karma,
    merit: draft.merit,
    heartDemon: draft.heartDemon,
    wounds: freezeArray(draft.wounds.map((wound) => deepFreeze({
      ...wound,
      tags: freezeArray([...wound.tags])
    }))),
    heartKnots: freezeArray(draft.heartKnots.map((knot) => deepFreeze({
      ...knot,
      tags: freezeArray([...knot.tags])
    }))),
    family: deepFreeze({
      ...draft.family,
      flags: deepFreeze({ ...draft.family.flags })
    }),
    hiddenFateProgress: deepFreeze({ ...draft.hiddenFateProgress }),
    carriedItemAffinity: deepFreeze({ ...draft.carriedItemAffinity }),
    flags: deepFreeze({ ...draft.flags }),
    ...(draft.lifeStorylineState === undefined ? {} : { lifeStorylineState: draft.lifeStorylineState }),
    monthlyLogs: freezeArray([
      ...state.monthlyLogs.map((entry) => cloneMonthlyLog(entry)),
      log
    ])
  });
}

function createInterludeLog(
  state: LifeSimulationState,
  runConfig: LifeInterludeRunConfig,
  result: LifeInterludeResult,
  draft: WritebackDraft
): MonthlyLifeLogEntry {
  const hooks = publicUnique(draft.generatedHooks);
  const visibleEffectSummary = publicUniqueText([
    ...draft.logSummaries,
    ...draft.appliedEffects.map((effect) =>
      `${effect.effectType}:${effect.target ?? "state"}:${effect.amount ?? 0}`
    )
  ]);
  return deepFreeze({
    ageMonth: state.ageMonths,
    ageYear: Math.trunc(state.ageMonths / 12),
    ageMonthInYear: state.ageMonths % 12,
    phaseId: state.phaseId as LifePhaseId,
    eventId: `interlude:${runConfig.definitionId}:${runConfig.interludeRunId}`,
    eventTitle: `Interlude ${runConfig.definitionId}`,
    eventDescription: isPublicText(result.visibleSummary) ? result.visibleSummary : "Interlude result recorded.",
    outcome: toMonthlyOutcome(result.outcome),
    visibleEffectSummary: freezeArray(visibleEffectSummary),
    tags: freezeArray(publicUnique([
      "life_interlude",
      runConfig.definitionId,
      runConfig.mode,
      `outcome:${result.outcome}`
    ])),
    hooks: freezeArray(hooks)
  });
}

function toMonthlyOutcome(outcome: LifeInterludeOutcome): MonthlyOutcomeBandId {
  switch (outcome) {
    case "failure":
    case "abandon":
      return "bad";
    case "partialSuccess":
      return "normal";
    case "success":
      return "good";
    case "greatSuccess":
    case "hiddenSuccess":
      return "great";
  }
}

function buildEvidenceTokens(
  state: LifeSimulationState,
  runConfig: LifeInterludeRunConfig,
  result: LifeInterludeResult
): ReadonlySet<string> {
  const values = [
    ...Object.keys(state.flags),
    ...Object.values(state.flags).filter((value): value is string => typeof value === "string"),
    ...runConfig.playerProjection.destinyModifiers,
    ...result.generatedHooks,
    ...result.effects.flatMap((effect) => isPublicEffect(effect) ? Object.values(effect).map(String) : []),
    ...readRunConfigPublicDebugTags(runConfig)
  ];
  const tokens = new Set<string>();
  for (const value of values.filter(isPublicText)) {
    addTokenVariants(tokens, value);
  }
  return tokens;
}

function readRunConfigPublicDebugTags(runConfig: LifeInterludeRunConfig): readonly string[] {
  const debug = runConfig.debug;
  if (debug === undefined) {
    return [];
  }
  return debug.publicTags;
}

function hasEvidence(tokens: ReadonlySet<string>, value: string): boolean {
  for (const token of buildTokenSet([value])) {
    if (tokens.has(token)) {
      return true;
    }
  }
  return false;
}

function buildTokenSet(values: readonly string[]): ReadonlySet<string> {
  const tokens = new Set<string>();
  for (const value of values) {
    addTokenVariants(tokens, value);
  }
  return tokens;
}

function addTokenVariants(tokens: Set<string>, value: string): void {
  const normalized = normalizeToken(value);
  if (normalized.length === 0) {
    return;
  }
  tokens.add(normalized);
  const parts = normalized.split(/[:_]+/).filter((part) => part.length > 0);
  for (const part of parts) {
    tokens.add(part);
  }
  for (let index = 0; index < parts.length; index += 1) {
    const suffix = parts.slice(index).join("_");
    if (suffix.length > 0) {
      tokens.add(suffix);
    }
  }
}

function pushApplied(
  draft: WritebackDraft,
  source: EffectSource,
  effectType: LifeInterludeWritebackEffect["type"],
  target?: string,
  amount?: number
): void {
  draft.appliedEffects.push(deepFreeze({
    effectType,
    source,
    ...(target === undefined || !isPublicText(target) ? {} : { target }),
    ...(amount === undefined ? {} : { amount })
  }));
}

function uniqueQueuedEffects(effects: readonly QueuedEffect[]): readonly QueuedEffect[] {
  const byKey = new Map<string, QueuedEffect>();
  for (const queued of effects) {
    byKey.set(`${queued.source}:${JSON.stringify(queued.effect)}`, queued);
  }
  return [...byKey.values()];
}

function isPublicEffect(effect: LifeInterludeWritebackEffect): boolean {
  return isPublicText(JSON.stringify(effect));
}

function sanitizeFlags(flags: Readonly<Record<string, number | boolean | string>>): FlagRecord {
  const safe: FlagRecord = {};
  for (const [key, value] of Object.entries(flags)) {
    if (key === "trueNameRevealed" && typeof value === "boolean") {
      safe[key] = value;
      continue;
    }
    if (!isPublicSignal(key)) {
      continue;
    }
    if (typeof value === "string" && !isPublicText(value)) {
      continue;
    }
    safe[key] = value;
  }
  return safe;
}

function cloneMonthlyLog(log: MonthlyLifeLogEntry): MonthlyLifeLogEntry {
  return deepFreeze({
    ...log,
    visibleEffectSummary: freezeArray(log.visibleEffectSummary.filter(isPublicText)),
    ...(log.vagueHiddenSummary === undefined || !isPublicText(log.vagueHiddenSummary) ? {} : { vagueHiddenSummary: log.vagueHiddenSummary }),
    tags: freezeArray(log.tags.filter(isPublicSignal)),
    hooks: freezeArray(log.hooks.filter(isPublicSignal))
  });
}

function publicUnique(values: readonly string[]): readonly string[] {
  return uniqueStable(values.map((value) => value.trim()).filter(isPublicSignal));
}

function publicUniqueText(values: readonly string[]): readonly string[] {
  return uniqueStable(values.map((value) => value.trim()).filter(isPublicText));
}

function isPublicSignal(value: string): boolean {
  const normalized = normalizeToken(value);
  return isPublicText(value) &&
    !normalized.startsWith("hidden:") &&
    !normalized.startsWith("hidden_") &&
    !normalized.includes("internal_hidden");
}

function isPublicText(value: string): boolean {
  const normalized = normalizeToken(value);
  return value.trim().length > 0 &&
    !normalized.includes("true_name") &&
    !normalized.includes("truename") &&
    !normalized.includes("hidden_fate_internal") &&
    !normalized.includes("should_not_leak_hidden_name") &&
    HIDDEN_TRUE_NAME_TERMS.every((term) => !value.includes(term));
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

function toFiniteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function clampMeter(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.trunc(Math.min(100, Math.max(0, value)));
}

function clampSeverity(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.trunc(Math.min(5, Math.max(1, value)));
}

function uniqueStable<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function freezeArray<T>(entries: readonly T[]): readonly T[] {
  return Object.freeze([...entries]);
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
