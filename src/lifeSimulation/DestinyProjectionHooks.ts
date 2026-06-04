import destinyProjectionRulesData from "../../data/age18/destiny_projection_rules.v0.1.json";
import { loadDestinyRegistry, type DestinyRegistry } from "../characterCreation/destiny/DestinyRegistry";
import type { CharacterCreationDraft, DestinySelectionState } from "../character/CharacterCreationTypes";
import type { OutgameProfileState } from "../outgame/ProfileState";
import type { DestinyTraitDefinition } from "../types/destiny-types.v0.1";

export interface LifeSimDestinyModifiers {
  readonly traitIds: readonly string[];
  readonly tags: readonly string[];
  readonly sourceTraitNames: readonly string[];
  readonly studyGainMultiplier: number;
  readonly insightGainMultiplier: number;
  readonly lifespanMultiplier: number;
  readonly tribulationPowerDelta: number;
  readonly tribulationWeightMultiplier: number;
  readonly idleGainPerStack: number;
  readonly hiddenCultivationMaxStacks: number;
  readonly idleCultivationMultiplier: number;
  readonly combatCultivationMultiplier: number;
  readonly earlyCultivationMultiplier: number;
  readonly failureTokenGain: number;
  readonly alchemyGainMultiplier: number;
  readonly alchemySuccessBonus: number;
  readonly danToxinGainMultiplier: number;
  readonly eventWeightMultipliers: Readonly<Record<string, number>>;
  readonly rawNumericModifiers: Readonly<Record<string, number>>;
  readonly rawBooleanModifiers: Readonly<Record<string, boolean>>;
  readonly rawStringModifiers: Readonly<Record<string, readonly string[]>>;
}

export interface ModeDestinyModifiers {
  readonly modeId: string;
  readonly traitIds: readonly string[];
  readonly tags: readonly string[];
  readonly outerBattlefieldModifiers: readonly string[];
  readonly outerBattlefieldLoadout: readonly string[];
  readonly systemMessages: readonly string[];
  readonly riskTags: readonly string[];
  readonly homeHooks: readonly string[];
  readonly synergyProjectionIds: readonly string[];
  readonly rawNumericModifiers: Readonly<Record<string, number>>;
  readonly rawBooleanModifiers: Readonly<Record<string, boolean>>;
  readonly rawStringModifiers: Readonly<Record<string, readonly string[]>>;
}

type DestinyProjectionSource = CharacterCreationDraft | OutgameProfileState;
type ModifierValue = number | boolean | string;

interface DestinyProjectionRulesDataFile {
  readonly schemaVersion: string;
  readonly id: string;
  readonly projections: Readonly<Record<string, DestinyProjectionEntry>>;
  readonly synergyProjections: Readonly<Record<string, DestinySynergyProjectionEntry>>;
}

interface DestinyProjectionEntry {
  readonly name?: string;
  readonly outerBattlefieldModifiers?: readonly string[];
  readonly outerBattlefieldLoadout?: readonly string[];
  readonly systemMessages?: readonly string[];
  readonly riskTags?: readonly string[];
  readonly homeHooks?: readonly string[];
  readonly onFirstBattleFailureHooks?: readonly string[];
}

interface DestinySynergyProjectionEntry extends DestinyProjectionEntry {
  readonly requires: readonly string[];
  readonly message?: string;
}

const DESTINY_PROJECTION_RULES = destinyProjectionRulesData as DestinyProjectionRulesDataFile;

export function getLifeSimDestinyModifiers(draftOrProfile: DestinyProjectionSource): LifeSimDestinyModifiers {
  const traits = getSelectedDestinyTraits(draftOrProfile);
  const raw = aggregateRawModifiers(traits);
  const lifeStudyGainMultiplier = numeric(raw.rawNumericModifiers.lifeStudyGainMultiplier, 1);

  return deepFreeze({
    traitIds: traits.map((trait) => trait.id),
    tags: uniqueStable(traits.flatMap((trait) => trait.tags)),
    sourceTraitNames: traits.map((trait) => trait.name),
    studyGainMultiplier: lifeStudyGainMultiplier,
    insightGainMultiplier: numeric(raw.rawNumericModifiers.insightGainMultiplier, lifeStudyGainMultiplier),
    lifespanMultiplier: numeric(raw.rawNumericModifiers.lifespanMultiplier, 1),
    tribulationPowerDelta: numeric(raw.rawNumericModifiers.tribulationPowerDelta, 0),
    tribulationWeightMultiplier: numeric(raw.rawNumericModifiers.tribulationWeightMultiplier, 1),
    idleGainPerStack: numeric(raw.rawNumericModifiers.idleGainPerStack, 0),
    hiddenCultivationMaxStacks: numeric(raw.rawNumericModifiers.maxStacks, 0),
    idleCultivationMultiplier: numeric(raw.rawNumericModifiers.idleCultivationMultiplier, 1),
    combatCultivationMultiplier: numeric(raw.rawNumericModifiers.combatCultivationMultiplier, 1),
    earlyCultivationMultiplier: numeric(raw.rawNumericModifiers.earlyCultivationMultiplier, 1),
    failureTokenGain: numeric(raw.rawNumericModifiers.failureTokenGain, 0),
    alchemyGainMultiplier: numeric(raw.rawNumericModifiers.alchemyGainMultiplier, 1),
    alchemySuccessBonus: numeric(raw.rawNumericModifiers.alchemySuccessBonus, 0),
    danToxinGainMultiplier: numeric(raw.rawNumericModifiers.toxicityGainMultiplier, 1),
    eventWeightMultipliers: extractEventWeightMultipliers(raw.rawNumericModifiers),
    rawNumericModifiers: raw.rawNumericModifiers,
    rawBooleanModifiers: raw.rawBooleanModifiers,
    rawStringModifiers: raw.rawStringModifiers
  });
}

export function getOuterBattlefieldDestinyModifiers(profile: OutgameProfileState): ModeDestinyModifiers {
  return getModeDestinyModifiers(profile, "outer_battlefield");
}

export function getModeDestinyModifiers(profile: OutgameProfileState, modeId: string): ModeDestinyModifiers {
  const traits = getSelectedDestinyTraits(profile);
  const raw = aggregateRawModifiers(traits);
  const traitIds = traits.map((trait) => trait.id);
  const selectedTraitIds = new Set(traitIds);
  const usesOuterBattlefieldProjection = modeId === "outer_battlefield" || modeId === "outer_battlefield_intro";
  const outerBattlefieldModifiers: string[] = [];
  const outerBattlefieldLoadout: string[] = [];
  const systemMessages: string[] = [];
  const riskTags: string[] = [];
  const homeHooks: string[] = [];
  const synergyProjectionIds: string[] = [];

  for (const trait of traits) {
    const projection = DESTINY_PROJECTION_RULES.projections[trait.id];
    if (projection === undefined) {
      continue;
    }
    if (usesOuterBattlefieldProjection) {
      outerBattlefieldModifiers.push(...(projection.outerBattlefieldModifiers ?? []));
      outerBattlefieldLoadout.push(...(projection.outerBattlefieldLoadout ?? []));
    }
    systemMessages.push(...(projection.systemMessages ?? []));
    riskTags.push(...(projection.riskTags ?? []));
    homeHooks.push(...(projection.homeHooks ?? []));
  }

  for (const [projectionId, projection] of Object.entries(DESTINY_PROJECTION_RULES.synergyProjections)) {
    if (!projection.requires.every((traitId) => selectedTraitIds.has(traitId))) {
      continue;
    }
    synergyProjectionIds.push(projectionId);
    if (usesOuterBattlefieldProjection) {
      outerBattlefieldModifiers.push(...(projection.outerBattlefieldModifiers ?? []));
      outerBattlefieldLoadout.push(...(projection.outerBattlefieldLoadout ?? []));
    }
    if (projection.message !== undefined) {
      systemMessages.push(projection.message);
    }
    systemMessages.push(...(projection.systemMessages ?? []));
    riskTags.push(...(projection.riskTags ?? []));
    homeHooks.push(...(projection.homeHooks ?? []));
  }

  return deepFreeze({
    modeId,
    traitIds,
    tags: uniqueStable(traits.flatMap((trait) => trait.tags)),
    outerBattlefieldModifiers: uniqueStable(outerBattlefieldModifiers),
    outerBattlefieldLoadout: uniqueStable(outerBattlefieldLoadout),
    systemMessages: uniqueStable(systemMessages),
    riskTags: uniqueStable(riskTags),
    homeHooks: uniqueStable(homeHooks),
    synergyProjectionIds: uniqueStable(synergyProjectionIds),
    rawNumericModifiers: raw.rawNumericModifiers,
    rawBooleanModifiers: raw.rawBooleanModifiers,
    rawStringModifiers: raw.rawStringModifiers
  });
}

function getSelectedDestinyTraits(source: DestinyProjectionSource, registry: DestinyRegistry = loadDestinyRegistry()): readonly DestinyTraitDefinition[] {
  const selection = getDestinySelection(source);
  if (selection === undefined) {
    return [];
  }
  return getDestinyTraitIds(selection).map((traitId) => registry.getTrait(traitId));
}

function getDestinySelection(source: DestinyProjectionSource): DestinySelectionState | undefined {
  const maybeDraft = source as Partial<CharacterCreationDraft>;
  if (maybeDraft.destinies !== undefined) {
    return maybeDraft.destinies;
  }
  return (source as OutgameProfileState).characterOrigin?.destinies;
}

function getDestinyTraitIds(selection: DestinySelectionState): readonly string[] {
  return uniqueStable([
    selection.main.traitId,
    selection.secondary[0].traitId,
    selection.secondary[1].traitId,
    selection.flaw.traitId
  ]);
}

function aggregateRawModifiers(traits: readonly DestinyTraitDefinition[]): Pick<
  LifeSimDestinyModifiers,
  "rawNumericModifiers" | "rawBooleanModifiers" | "rawStringModifiers"
> {
  const rawNumericModifiers: Record<string, number> = {};
  const rawBooleanModifiers: Record<string, boolean> = {};
  const rawStringModifiers: Record<string, string[]> = {};

  for (const trait of traits) {
    for (const [key, value] of Object.entries(trait.modifiers as Record<string, ModifierValue>)) {
      if (typeof value === "number") {
        rawNumericModifiers[key] = mergeNumericModifier(key, rawNumericModifiers[key], value);
      } else if (typeof value === "boolean") {
        rawBooleanModifiers[key] = (rawBooleanModifiers[key] ?? false) || value;
      } else {
        rawStringModifiers[key] = [...uniqueStable([...(rawStringModifiers[key] ?? []), value])];
      }
    }
  }

  return deepFreeze({
    rawNumericModifiers,
    rawBooleanModifiers,
    rawStringModifiers
  });
}

function mergeNumericModifier(key: string, current: number | undefined, value: number): number {
  if (key === "maxStacks") {
    return Math.max(current ?? 0, value);
  }
  if (key.endsWith("Multiplier")) {
    return round6((current ?? 1) * value);
  }
  return round6((current ?? 0) + value);
}

function extractEventWeightMultipliers(rawNumericModifiers: Readonly<Record<string, number>>): Readonly<Record<string, number>> {
  const entries = Object.entries(rawNumericModifiers).filter(([key]) => key.endsWith("EventWeightMultiplier"));
  return Object.freeze(Object.fromEntries(entries));
}

function numeric(value: number | undefined, fallback: number): number {
  return value ?? fallback;
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
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
