import type { SeededRng } from "../sim/core/SeededRng";
import {
  cloneOutgameProfile,
  type OutgameProfileState
} from "../outgame/ProfileState";
import type {
  Age18OriginFateResolution,
  ConvertedCarriedItem,
  HiddenFateDefinition,
  OriginFateDraft,
  OriginFateRevealBandId,
  RevealedHiddenFate
} from "../types/origin-fate-types.v0.1";
import {
  loadOriginFateRegistry,
  type OriginFateRegistry
} from "./OriginFateRegistry";

export interface Age18OriginFateLifeSimulationSummary {
  readonly aptitude?: {
    readonly inspiration?: number;
    readonly fortune?: number;
    readonly heart?: number;
  };
  readonly destinyTags?: readonly string[];
  readonly carriedItemTags?: readonly string[];
  readonly lifeEventTags?: readonly string[];
  readonly age18Hooks?: readonly string[];
}

export interface Age18HiddenFateRevealChance {
  readonly bandId: OriginFateRevealBandId;
  readonly baseChance: number;
  readonly chance: number;
  readonly appliedModifiers: readonly string[];
}

export interface ApplyAge18OriginFateResolutionToProfileOptions {
  readonly profile: OutgameProfileState;
  readonly resolution: Age18OriginFateResolution;
  readonly nowMs: number;
}

export function resolveAge18OriginFate(
  originFate: OriginFateDraft,
  lifeSimulationSummary: Age18OriginFateLifeSimulationSummary,
  rng: SeededRng,
  registry: OriginFateRegistry = loadOriginFateRegistry()
): Age18OriginFateResolution {
  const hiddenFate = registry.getHiddenFate(originFate.hiddenFateInternal.hiddenFateId);
  const revealChance = calculateAge18HiddenFateRevealChance(originFate, lifeSimulationSummary, registry);
  const revealedHiddenFate =
    rng.nextFloat01() < revealChance.chance
      ? createRevealedHiddenFate(originFate, hiddenFate, revealChance)
      : undefined;
  const convertedItems = originFate.carriedItems.map((item): ConvertedCarriedItem => {
    const definition = registry.getCarriedItem(item.itemId);
    return {
      itemId: item.itemId,
      sourceName: item.name,
      conversionType: definition.eighteenConversion.type,
      label: definition.eighteenConversion.label,
      outerBattlefieldEffect: definition.eighteenConversion.outerBattlefieldEffect,
      dongfuHook: definition.eighteenConversion.dongfuHook
    };
  });

  return deepFreeze({
    ...(revealedHiddenFate === undefined ? {} : { revealedHiddenFate }),
    convertedItems,
    outerBattlefieldModifiers: uniqueStable([
      ...originFate.modeProjectionTags,
      ...convertedItems.map((item) => item.outerBattlefieldEffect),
      ...(revealedHiddenFate?.effects ?? [])
    ]),
    dongfuHooks: uniqueStable([
      ...convertedItems.map((item) => item.dongfuHook),
      ...(revealedHiddenFate === undefined ? [] : hiddenFate.dongfuHooks)
    ]),
    longTermTags: uniqueStable([
      `backgroundOrigin:${originFate.backgroundOrigin.originId}`,
      `hiddenFate:${originFate.hiddenFateInternal.hiddenFateId}`,
      revealedHiddenFate === undefined ? "hiddenFate:sealed" : "hiddenFate:revealed",
      ...convertedItems.flatMap((item) => [
        `carriedItem:${item.itemId}`,
        `conversion:${item.conversionType}`,
        `dongfuHook:${item.dongfuHook}`
      ])
    ])
  });
}

export function calculateAge18HiddenFateRevealChance(
  originFate: OriginFateDraft,
  lifeSimulationSummary: Age18OriginFateLifeSimulationSummary,
  registry: OriginFateRegistry = loadOriginFateRegistry()
): Age18HiddenFateRevealChance {
  const hiddenFate = registry.getHiddenFate(originFate.hiddenFateInternal.hiddenFateId);
  const bandId = resolveRevealBandId(originFate.hiddenFateInternal.progress, registry);
  const baseChance = registry.revealRules.age18RevealFormula.baseRevealChanceByBand[bandId] ?? 0;
  const modifierResults = registry.revealRules.age18RevealFormula.modifiers
    .map((modifier) => ({
      condition: modifier.condition,
      delta: modifier.delta,
      applies: revealModifierApplies(modifier.condition, originFate, hiddenFate, lifeSimulationSummary, registry)
    }))
    .filter((modifier) => modifier.applies);
  const chance = clamp01(baseChance + modifierResults.reduce((sum, modifier) => sum + modifier.delta, 0));

  return {
    bandId,
    baseChance,
    chance,
    appliedModifiers: modifierResults.map((modifier) => modifier.condition)
  };
}

export function applyAge18OriginFateResolutionToProfile(
  options: ApplyAge18OriginFateResolutionToProfileOptions
): OutgameProfileState {
  return cloneOutgameProfile({
    ...cloneOutgameProfile(options.profile),
    age18OriginFate: options.resolution,
    lifeSimulation: {
      status: "completed",
      ageYears: 18
    },
    updatedAtMs: options.nowMs,
    flags: {
      ...options.profile.flags,
      originFateAge18Resolved: true
    }
  });
}

function createRevealedHiddenFate(
  originFate: OriginFateDraft,
  hiddenFate: HiddenFateDefinition,
  chance: Age18HiddenFateRevealChance
): RevealedHiddenFate {
  const effects = hiddenFate.outerBattlefieldEffects
    .filter((effect) => originFate.hiddenFateInternal.progress >= effect.threshold)
    .map((effect) => effect.effect);

  return {
    hiddenFateId: originFate.hiddenFateInternal.hiddenFateId,
    trueName: hiddenFate.trueName,
    category: hiddenFate.category,
    progress: originFate.hiddenFateInternal.progress,
    revealReason: `age18:${chance.bandId}:${chance.appliedModifiers.join("|") || "base"}`,
    effects
  };
}

function resolveRevealBandId(progress: number, registry: OriginFateRegistry): OriginFateRevealBandId {
  const band = registry.revealRules.progressBands.find((candidate) => progress >= candidate.range[0] && progress <= candidate.range[1]);
  if (band !== undefined) {
    return band.id;
  }
  return progress >= 100 ? "awakened" : progress >= 70 ? "halfAwakened" : progress >= 30 ? "suspicious" : "hintOnly";
}

function revealModifierApplies(
  condition: string,
  originFate: OriginFateDraft,
  hiddenFate: HiddenFateDefinition,
  lifeSimulationSummary: Age18OriginFateLifeSimulationSummary,
  registry: OriginFateRegistry
): boolean {
  switch (condition) {
    case "inspiration >= 90":
      return (lifeSimulationSummary.aptitude?.inspiration ?? 0) >= 90;
    case "fortune >= 90":
      return (lifeSimulationSummary.aptitude?.fortune ?? 0) >= 90;
    case "matchingDestinyTag":
      return hasAnyTagOverlap(lifeSimulationSummary.destinyTags ?? [], [...hiddenFate.biasTags, ...originFate.hiddenFateInternal.matchedTags]);
    case "matchingCarriedItem":
      return hasMatchingCarriedItem(originFate, hiddenFate, lifeSimulationSummary, registry);
    case "heart < 25 and hidden category is curseSeal":
      return hiddenFate.category === "curseSeal" && (lifeSimulationSummary.aptitude?.heart ?? Number.POSITIVE_INFINITY) < 25;
    default:
      return false;
  }
}

function hasMatchingCarriedItem(
  originFate: OriginFateDraft,
  hiddenFate: HiddenFateDefinition,
  lifeSimulationSummary: Age18OriginFateLifeSimulationSummary,
  registry: OriginFateRegistry
): boolean {
  const hiddenAliases = uniqueStable([
    hiddenFate.id,
    stripKnownPrefix(hiddenFate.id, "hidden_"),
    ...hiddenFate.biasTags,
    ...originFate.hiddenFateInternal.matchedTags,
    ...(lifeSimulationSummary.carriedItemTags ?? [])
  ]);

  return originFate.carriedItems.some((item) => {
    const definition = registry.getCarriedItem(item.itemId);
    return hasAnyTagOverlap(
      [
        item.itemId,
        stripKnownPrefix(item.itemId, "origin_item_"),
        ...item.matchedTags,
        ...definition.biasTags,
        ...definition.hiddenFateSynergyTags,
        ...definition.lifeEventTags
      ],
      hiddenAliases
    );
  });
}

function hasAnyTagOverlap(first: readonly string[], second: readonly string[]): boolean {
  const firstTokens = new Set(first.flatMap(expandToken));
  return second.flatMap(expandToken).some((token) => firstTokens.has(token));
}

function expandToken(token: string): readonly string[] {
  return uniqueStable([
    token,
    stripKnownPrefix(token, "hidden_"),
    stripKnownPrefix(token, "hidden:"),
    stripKnownPrefix(token, "lifeEvent:"),
    stripKnownPrefix(token, "destiny:"),
    stripKnownPrefix(token, "root:")
  ]).filter((value) => value.length > 0);
}

function stripKnownPrefix(value: string, prefix: string): string {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, round4(value)));
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function uniqueStable<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
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
