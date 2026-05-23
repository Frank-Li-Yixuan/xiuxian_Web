import { cloneOutgameProfile, type MethodProgressState, type OutgameProfileState, type SpellMasteryState } from "./ProfileState";
import { spendResources, type ResourceMap } from "./ResourceWallet";

export interface CultivationMethodPack {
  readonly schemaVersion: string;
  readonly methodTrainingRules: Readonly<Record<string, unknown>>;
  readonly methods: readonly CultivationMethodDefinition[];
}

export interface CultivationMethodDefinition {
  readonly id: string;
  readonly name: string;
  readonly type: "main_method" | "minor_method" | "forbidden_method";
  readonly element: string;
  readonly tags: readonly string[];
  readonly unlockCost?: ResourceMap;
  readonly levels: readonly MethodLevelDefinition[];
}

export interface MethodLevelDefinition {
  readonly level: number;
  readonly trainingRequired: number;
  readonly cost?: ResourceMap;
  readonly effects: Readonly<Record<string, number | boolean | string>>;
}

export interface SpellCompendiumPack {
  readonly schemaVersion: string;
  readonly rules: Readonly<Record<string, unknown>>;
  readonly spells: readonly SpellCompendiumDefinition[];
}

export interface SpellCompendiumDefinition {
  readonly id: string;
  readonly name: string;
  readonly element: string;
  readonly unlockCost?: ResourceMap;
  readonly masteryLevels: readonly SpellMasteryLevelDefinition[];
}

export interface SpellMasteryLevelDefinition {
  readonly level: number;
  readonly cost?: ResourceMap;
  readonly effects: Readonly<Record<string, number | boolean | string>>;
}

export interface TrainMethodOptions {
  readonly profile: OutgameProfileState;
  readonly methods: CultivationMethodPack;
  readonly methodId: string;
  readonly trainingPower: number;
}

export interface TrainMethodResult {
  readonly profile: OutgameProfileState;
  readonly methodId: string;
  readonly leveledUp: boolean;
  readonly spent: ResourceMap;
}

export interface UpgradeSpellMasteryOptions {
  readonly profile: OutgameProfileState;
  readonly compendium: SpellCompendiumPack;
  readonly spellId: string;
}

export interface UpgradeSpellMasteryResult {
  readonly profile: OutgameProfileState;
  readonly spellId: string;
  readonly fromLevel: number;
  readonly toLevel: number;
  readonly spent: ResourceMap;
}

export function trainMethod(options: TrainMethodOptions): TrainMethodResult {
  assertNonNegativeFinite(options.trainingPower, "trainingPower");
  const definition = requireMethod(options.methods, options.methodId);
  const current = requireMethodState(options.profile.methods[options.methodId], options.methodId);
  const target = definition.levels.find((level) => level.level === current.level + 1);
  if (target === undefined) {
    return deepFreeze({
      profile: cloneOutgameProfile(options.profile),
      methodId: options.methodId,
      leveledUp: false,
      spent: {}
    });
  }

  const nextProgress = round3(current.trainingProgress + options.trainingPower);
  if (nextProgress < target.trainingRequired) {
    return deepFreeze({
      profile: cloneOutgameProfile({
        ...options.profile,
        methods: {
          ...options.profile.methods,
          [options.methodId]: {
            ...current,
            trainingProgress: nextProgress
          }
        }
      }),
      methodId: options.methodId,
      leveledUp: false,
      spent: {}
    });
  }

  const spent = spendResources(options.profile.wallet, target.cost);
  const methods = {
    ...options.profile.methods,
    [options.methodId]: {
      ...current,
      level: target.level,
      trainingProgress: round3(nextProgress - target.trainingRequired)
    }
  };

  return deepFreeze({
    profile: cloneOutgameProfile({
      ...options.profile,
      wallet: spent.wallet,
      methods
    }),
    methodId: options.methodId,
    leveledUp: true,
    spent: spent.spent
  });
}

export function upgradeSpellMastery(options: UpgradeSpellMasteryOptions): UpgradeSpellMasteryResult {
  const definition = requireSpell(options.compendium, options.spellId);
  const current = requireSpellState(options.profile.spells[options.spellId], options.spellId);
  const toLevel = current.masteryLevel + 1;
  const target = definition.masteryLevels.find((level) => level.level === toLevel);
  if (target === undefined) {
    throw new Error(`Spell ${options.spellId} does not define mastery level ${toLevel}`);
  }
  if (target.cost === undefined) {
    throw new Error(`Spell ${options.spellId} mastery level ${toLevel} has no research cost`);
  }
  const spent = spendResources(options.profile.wallet, target.cost);
  const spells = {
    ...options.profile.spells,
    [options.spellId]: {
      unlocked: true,
      masteryLevel: toLevel
    }
  };

  return deepFreeze({
    profile: cloneOutgameProfile({
      ...options.profile,
      wallet: spent.wallet,
      spells
    }),
    spellId: options.spellId,
    fromLevel: current.masteryLevel,
    toLevel,
    spent: spent.spent
  });
}

function requireMethod(methods: CultivationMethodPack, methodId: string): CultivationMethodDefinition {
  const method = methods.methods.find((candidate) => candidate.id === methodId);
  if (method === undefined) {
    throw new Error(`Missing cultivation method ${methodId}`);
  }
  return method;
}

function requireMethodState(state: MethodProgressState | undefined, methodId: string): MethodProgressState {
  if (state === undefined || !state.unlocked || state.level <= 0) {
    throw new Error(`Method ${methodId} is not unlocked`);
  }
  return state;
}

function requireSpell(compendium: SpellCompendiumPack, spellId: string): SpellCompendiumDefinition {
  const spell = compendium.spells.find((candidate) => candidate.id === spellId);
  if (spell === undefined) {
    throw new Error(`Missing spell compendium entry ${spellId}`);
  }
  return spell;
}

function requireSpellState(state: SpellMasteryState | undefined, spellId: string): SpellMasteryState {
  if (state === undefined || !state.unlocked || state.masteryLevel <= 0) {
    throw new Error(`Spell ${spellId} is not unlocked`);
  }
  return state;
}

function assertNonNegativeFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be non-negative finite`);
  }
}

function round3(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}
