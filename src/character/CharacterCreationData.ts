import backgroundOriginsData from "../../data/character_creation/background_origins.v0.1.json";
import carriedItemsData from "../../data/character_creation/carried_items.v0.1.json";
import defaultsData from "../../data/character_creation/character_creation_defaults.v0.1.json";
import destinyTraitsData from "../../data/character_creation/destiny_traits.v0.1.json";
import hiddenFatesData from "../../data/character_creation/hidden_fates.v0.1.json";
import spiritualRootsData from "../../data/character_creation/spiritual_roots.v0.1.json";
import type {
  BackgroundOriginDataFile,
  CharacterCreationDefaults,
  CarriedItemDataFile,
  DestinyTraitDataFile,
  HiddenFateDataFile,
  LoadedCharacterCreationData,
  SpiritualRootDataFile
} from "./CharacterCreationTypes";

export const CHARACTER_CREATION_DATA = deepFreeze(
  validateCharacterCreationData({
    spiritualRoots: (spiritualRootsData as SpiritualRootDataFile).roots,
    destinyTraits: (destinyTraitsData as DestinyTraitDataFile).traits,
    backgrounds: (backgroundOriginsData as BackgroundOriginDataFile).backgrounds,
    hiddenFates: (hiddenFatesData as HiddenFateDataFile).hiddenFates,
    carriedItems: (carriedItemsData as CarriedItemDataFile).items.map((item) => ({
      ...item,
      itemId: item.itemId ?? item.id ?? ""
    })),
    defaults: normalizeDefaults(defaultsData)
  })
);

export function loadCharacterCreationData(): LoadedCharacterCreationData {
  return CHARACTER_CREATION_DATA;
}

function validateCharacterCreationData(data: LoadedCharacterCreationData): LoadedCharacterCreationData {
  assertNonEmpty(data.spiritualRoots, "spiritual roots");
  assertNonEmpty(data.destinyTraits, "destiny traits");
  assertNonEmpty(data.backgrounds, "background origins");
  assertNonEmpty(data.hiddenFates, "hidden fates");
  assertNonEmpty(data.carriedItems, "carried items");
  assertUnique(data.spiritualRoots.map((root) => root.id), "spiritual root id");
  assertUnique(data.destinyTraits.map((trait) => trait.id), "destiny trait id");
  assertUnique(data.backgrounds.map((background) => background.id), "background id");
  assertUnique(data.hiddenFates.map((hiddenFate) => hiddenFate.id), "hidden fate id");
  assertUnique(data.carriedItems.map((item) => item.itemId), "carried item id");

  if (!data.destinyTraits.some((trait) => trait.slotTypes.includes("main"))) {
    throw new Error("character creation data must include at least one main destiny trait");
  }
  if (!data.destinyTraits.some((trait) => trait.slotTypes.includes("secondary"))) {
    throw new Error("character creation data must include at least one secondary destiny trait");
  }
  if (!data.destinyTraits.some((trait) => trait.slotTypes.includes("flaw"))) {
    throw new Error("character creation data must include at least one flaw destiny trait");
  }
  if (data.defaults.draftName.trim().length === 0) {
    throw new Error("character creation default draftName must not be empty");
  }

  return data;
}

function assertNonEmpty(values: readonly unknown[], label: string): void {
  if (values.length === 0) {
    throw new Error(`character creation data must include ${label}`);
  }
}

function assertUnique(values: readonly string[], label: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (value.length === 0) {
      throw new Error(`${label} must not be empty`);
    }
    if (seen.has(value)) {
      throw new Error(`duplicate ${label}: ${value}`);
    }
    seen.add(value);
  }
}

function normalizeDefaults(value: unknown): CharacterCreationDefaults {
  const file = value as { readonly defaults?: CharacterCreationDefaults };
  const defaults = file.defaults;
  if (defaults === undefined) {
    throw new Error("character creation defaults file must include defaults");
  }

  return {
    ...defaults,
    baseStats: {
      core: {
        jing: normalizeRange(defaults.baseStats.core.jing, "core.jing"),
        qi: normalizeRange(defaults.baseStats.core.qi, "core.qi"),
        shen: normalizeRange(defaults.baseStats.core.shen, "core.shen")
      },
      aptitude: {
        rootBone: normalizeRange(defaults.baseStats.aptitude.rootBone, "aptitude.rootBone"),
        comprehension: normalizeRange(defaults.baseStats.aptitude.comprehension, "aptitude.comprehension"),
        inspiration: normalizeRange(defaults.baseStats.aptitude.inspiration, "aptitude.inspiration"),
        fortune: normalizeRange(defaults.baseStats.aptitude.fortune, "aptitude.fortune"),
        heart: normalizeRange(defaults.baseStats.aptitude.heart, "aptitude.heart"),
        lifespan: normalizeRange(defaults.baseStats.aptitude.lifespan, "aptitude.lifespan")
      }
    }
  };
}

function normalizeRange(value: readonly number[], label: string): readonly [number, number] {
  const [min, max] = value;
  if (value.length !== 2 || min === undefined || max === undefined || !Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error(`character creation stat range ${label} must contain exactly two finite numbers`);
  }
  if (min > max) {
    throw new Error(`character creation stat range ${label} minimum must be <= maximum`);
  }
  return [min, max];
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
