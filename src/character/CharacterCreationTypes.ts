import type {
  AptitudeStats,
  BackgroundOriginDefinition,
  CarriedItemDraft,
  CharacterCreationDataBundle,
  CharacterCreationLocks,
  CharacterCreationRarity,
  CoreThreeTreasures,
  DestinySlotType,
  DestinyTraitDefinition,
  HiddenFateDefinition,
  SpiritualRootDefinition
} from "../types/character-creation-types.v0.1";

export * from "../types/character-creation-types.v0.1";

export type StatRange = readonly [number, number];

export interface CharacterCreationDefaults {
  readonly draftName: string;
  readonly baseStats: {
    readonly core: Readonly<Record<keyof CoreThreeTreasures, StatRange>>;
    readonly aptitude: Readonly<Record<keyof AptitudeStats, StatRange>>;
  };
  readonly reroll: {
    readonly initialFreeLocks: number;
    readonly initialDivinationTokens: number;
    readonly maxNormalLocks: number;
    readonly maxLocksWithDivination: number;
  };
  readonly traitSlots: Readonly<Record<DestinySlotType, number>>;
  readonly profileStageAfterConfirm: string;
}

export interface CharacterCreationDefaultsFile {
  readonly version: string;
  readonly defaults: CharacterCreationDefaults;
}

export interface SpiritualRootDataFile {
  readonly version: string;
  readonly roots: readonly SpiritualRootDefinition[];
}

export interface DestinyTraitDataFile {
  readonly version: string;
  readonly traits: readonly DestinyTraitDefinition[];
}

export interface BackgroundOriginDataFile {
  readonly version: string;
  readonly backgrounds: readonly BackgroundOriginDefinition[];
}

export interface HiddenFateDataFile {
  readonly version: string;
  readonly hiddenFates: readonly HiddenFateDefinition[];
}

export interface CarriedItemDataFile {
  readonly version: string;
  readonly items: readonly RawCarriedItemDefinition[];
}

export interface LoadedCharacterCreationData extends CharacterCreationDataBundle {
  readonly carriedItems: readonly CarriedItemDraft[];
  readonly defaults: CharacterCreationDefaults;
}

export interface RawCarriedItemDefinition extends Omit<CarriedItemDraft, "itemId"> {
  readonly id?: string;
  readonly itemId?: string;
}

export type CharacterCreationLockKey = keyof CharacterCreationLocks;
export type WeightedRarity = Exclude<CharacterCreationRarity, "flaw">;
