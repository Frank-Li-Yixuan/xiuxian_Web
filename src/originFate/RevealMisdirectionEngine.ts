import type {
  HiddenFateDefinitionV02,
  HiddenFateNarrativeStateV02,
  HiddenFateRevealBand,
  Id,
  OriginFateMisdirectionCandidateV02,
  OriginFateNarrativeRevealBandRuleV02,
  OriginFateNarrativeRevealPolicyV02,
  OriginFatePublicOmenViewV02,
  OriginFateRevealMisdirectionContextV02
} from "../types/origin-fate-narrative-types.v0.2";
import {
  loadOriginFateNarrativeRegistry,
  type OriginFateNarrativeRegistry
} from "./OriginFateNarrativeRegistry";

export interface RevealMisdirectionEngineContext extends OriginFateRevealMisdirectionContextV02 {
  readonly registry?: OriginFateNarrativeRegistry;
}

export interface RevealBandLookupContext {
  readonly registry?: OriginFateNarrativeRegistry;
}

export function getRevealBand(
  progress: number,
  context: RevealBandLookupContext = {}
): OriginFateNarrativeRevealBandRuleV02 {
  const registry = context.registry ?? loadOriginFateNarrativeRegistry();
  return registry.getRevealBandForProgress(progress);
}

export function canRevealTrueName(
  stage: HiddenFateNarrativeStateV02 | HiddenFateRevealBand,
  context: RevealMisdirectionEngineContext
): boolean {
  const registry = context.registry ?? loadOriginFateNarrativeRegistry();
  const policy = getPolicy(context.surface, registry);
  const band = typeof stage === "string"
    ? registry.getRevealBand(stage)
    : registry.getRevealBandForProgress(stage.progress);
  if (context.surface !== "age18" || !policy.allowTrueName || !band.canShowTrueName) {
    return false;
  }
  if (typeof stage === "string") {
    return context.age18Resolved === true;
  }
  return stage.trueNameRevealed || context.age18Resolved === true;
}

export function buildPublicOmenView(
  hiddenFateState: HiddenFateNarrativeStateV02,
  context: RevealMisdirectionEngineContext
): OriginFatePublicOmenViewV02 {
  const registry = context.registry ?? loadOriginFateNarrativeRegistry();
  const hiddenFate = registry.getHiddenFate(hiddenFateState.hiddenFateId);
  const policy = getPolicy(context.surface, registry);
  const band = registry.getRevealBandForProgress(hiddenFateState.progress);
  const allHiddenNames = registry.hiddenFates.map((item) => item.trueName).filter((value) => value.length > 0);
  const omenLines = collectOmenLines(hiddenFate, hiddenFateState, band.id, registry, allHiddenNames, getMaxOmenLines(policy, context));
  const misdirectionLines = collectMisdirectionLines(hiddenFateState.misleadingOmenIds, registry, allHiddenNames);
  const misdirectionCandidates = buildMisdirectionCandidates(context.signalTags ?? hiddenFate.primaryTags, { registry });
  const canRevealName = canRevealTrueName(hiddenFateState, { ...context, registry });
  const revealedName = canRevealName ? hiddenFate.trueName : undefined;

  return deepFreeze({
    surface: context.surface,
    ...(policy.allowVagueBand === true ? { revealBand: band.id, revealBandLabel: band.uiLabel } : {}),
    ...(policy.allowExactProgress ? { exactProgress: hiddenFateState.progress } : {}),
    omenLines,
    misdirectionLines,
    destinyOptionHints: policy.allowDestinyOptionHint === true
      ? uniqueStable(misdirectionCandidates.flatMap((candidate) => candidate.matchedSignals.map((signal) => `destiny_option_hint:${signal}`)))
      : [],
    ...(revealedName === undefined ? {} : { revealedName }),
    canRevealName,
    debugTags: uniqueStable([
      `originFateReveal.surface:${context.surface}`,
      ...(policy.allowVagueBand === true ? [`originFateReveal.band:${band.id}`] : []),
      ...(canRevealName ? ["originFateReveal.nameAllowed"] : ["originFateReveal.nameHidden"])
    ])
  });
}

export function buildMisdirectionCandidates(
  signalTags: readonly string[],
  context: RevealBandLookupContext = {}
): readonly OriginFateMisdirectionCandidateV02[] {
  const registry = context.registry ?? loadOriginFateNarrativeRegistry();
  const signalTokens = new Set<string>();
  for (const signal of signalTags) {
    addTokenVariants(signalTokens, signal);
  }
  const candidates = registry.revealStageRules.misdirectionRules.flatMap((rule) => {
    const matchedSignals = rule.signals.filter((signal) => signalTokens.has(normalizeToken(signal)));
    if (matchedSignals.length === 0) {
      return [];
    }
    return [
      deepFreeze({
        ruleId: rule.id,
        signals: [...rule.signals],
        matchedSignals,
        possibleTruthIds: [...rule.possibleTruths],
        debugTags: uniqueStable([
          `misdirection.rule:${rule.id}`,
          ...matchedSignals.map((signal) => `misdirection.signal:${signal}`)
        ])
      })
    ];
  });
  return deepFreeze(candidates);
}

function getPolicy(surface: RevealMisdirectionEngineContext["surface"], registry: OriginFateNarrativeRegistry): OriginFateNarrativeRevealPolicyV02 {
  const policy = registry.revealStageRules.revealPolicies[surface];
  if (policy === undefined) {
    throw new Error(`Missing origin fate v0.2 reveal policy: ${surface}`);
  }
  return policy;
}

function getMaxOmenLines(
  policy: OriginFateNarrativeRevealPolicyV02,
  context: RevealMisdirectionEngineContext
): number | undefined {
  if (context.maxOmenLines !== undefined) {
    if (!Number.isInteger(context.maxOmenLines) || context.maxOmenLines < 0) {
      throw new Error("origin fate v0.2 maxOmenLines must be a non-negative integer");
    }
    return context.maxOmenLines;
  }
  return policy.maxOmenLines;
}

function collectOmenLines(
  hiddenFate: HiddenFateDefinitionV02,
  state: HiddenFateNarrativeStateV02,
  band: HiddenFateRevealBand,
  registry: OriginFateNarrativeRegistry,
  hiddenNames: readonly string[],
  maxLines: number | undefined
): readonly string[] {
  const reachedBands = getReachedBandIds(band, registry);
  const lines: string[] = [];
  for (const stage of hiddenFate.omenStages.filter((item) => reachedBands.has(item.band))) {
    pushSafeLine(lines, stage.text, hiddenNames);
  }
  for (const rule of getKnownMisdirectionRules(state.misleadingOmenIds, registry)) {
    for (const signal of rule.signals) {
      pushSafeLine(lines, `misdirection:${signal}`, hiddenNames);
    }
  }
  for (const phrase of registry.omenPhrases) {
    if (phrase.tags.some((tag) => hiddenFate.primaryTags.includes(tag))) {
      pushSafeLine(lines, phrase.text, hiddenNames);
    }
  }
  const unique = uniqueStable(lines);
  return maxLines === undefined ? unique : unique.slice(0, maxLines);
}

function collectMisdirectionLines(
  misleadingOmenIds: readonly Id[],
  registry: OriginFateNarrativeRegistry,
  hiddenNames: readonly string[]
): readonly string[] {
  const lines: string[] = [];
  for (const rule of getKnownMisdirectionRules(misleadingOmenIds, registry)) {
    for (const signal of rule.signals) {
      pushSafeLine(lines, `misdirection:${signal}`, hiddenNames);
    }
  }
  return uniqueStable(lines);
}

function getKnownMisdirectionRules(
  misleadingOmenIds: readonly Id[],
  registry: OriginFateNarrativeRegistry
): readonly OriginFateNarrativeRegistry["revealStageRules"]["misdirectionRules"][number][] {
  const rulesById = new Map(registry.revealStageRules.misdirectionRules.map((rule) => [rule.id, rule]));
  return misleadingOmenIds.flatMap((id) => {
    const rule = rulesById.get(id);
    return rule === undefined ? [] : [rule];
  });
}

function getReachedBandIds(
  revealBand: HiddenFateRevealBand,
  registry: OriginFateNarrativeRegistry
): ReadonlySet<HiddenFateRevealBand> {
  const ids = new Set<HiddenFateRevealBand>();
  for (const band of registry.revealBands) {
    ids.add(band.id);
    if (band.id === revealBand) {
      break;
    }
  }
  return ids;
}

function pushSafeLine(lines: string[], line: string, hiddenNames: readonly string[]): void {
  if (line.trim().length === 0 || hiddenNames.some((hiddenName) => line.includes(hiddenName))) {
    return;
  }
  lines.push(line);
}

function addTokenVariants(tokens: Set<string>, value: string): void {
  const normalized = normalizeToken(value);
  if (normalized.length === 0) {
    return;
  }
  tokens.add(normalized);
  for (const separator of ["_", ":"] as const) {
    for (const part of normalized.split(separator)) {
      if (part.length > 1) {
        tokens.add(part);
      }
    }
  }
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

function uniqueStable<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}
