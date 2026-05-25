import { SeededRng, type RngSeed } from "../sim/core/SeededRng";
import { loadCharacterCreationData } from "./CharacterCreationData";
import type {
  AptitudeStats,
  BackgroundOriginDefinition,
  BackgroundOriginState,
  CarriedItemDraft,
  CharacterAppearanceState,
  CharacterCreationDraft,
  CharacterCreationLocks,
  CoreThreeTreasures,
  DestinySelectionState,
  DestinySlotType,
  DestinyTraitDefinition,
  DestinyTraitState,
  HiddenFateDefinition,
  HiddenFateState,
  LoadedCharacterCreationData,
  SpiritualRootDefinition,
  SpiritualRootState,
  StatRange,
  WeightedRarity
} from "./CharacterCreationTypes";

export interface CharacterDraftGeneratorOptions {
  readonly seed: RngSeed;
  readonly data?: LoadedCharacterCreationData;
}

export interface GenerateCharacterDraftOptions {
  readonly slotId: string;
  readonly nowMs: number;
  readonly name?: string;
}

export interface RerollCharacterDraftOptions {
  readonly nowMs: number;
  readonly locks?: Partial<CharacterCreationLocks>;
  readonly name?: string;
}

const DEFAULT_LOCKS: CharacterCreationLocks = {
  spiritualRoot: false,
  mainDestiny: false,
  secondaryDestiny0: false,
  secondaryDestiny1: false,
  flawDestiny: false,
  background: false,
  hiddenFate: false
};

const RARITY_WEIGHTS: Readonly<Record<WeightedRarity, number>> = {
  common: 100,
  uncommon: 70,
  rare: 28,
  epic: 12,
  legendary: 4
};

const APPEARANCE_TEMPLATES = ["seated_shadow", "plain_robes", "young_wanderer", "temple_child"] as const;
const GENDER_PRESENTATIONS: readonly CharacterAppearanceState["genderPresentation"][] = ["androgynous", "male", "female"];
const TEMPERAMENTS: readonly CharacterAppearanceState["temperament"][] = ["calm", "cold", "gentle", "wild", "mysterious"];
const ROBE_COLORS = ["jade", "ink", "white", "teal", "gold"] as const;

export class CharacterDraftGenerator {
  private readonly data: LoadedCharacterCreationData;
  private readonly rng: SeededRng;
  private nextDraftSerial = 0;

  public constructor(options: CharacterDraftGeneratorOptions) {
    this.data = options.data ?? loadCharacterCreationData();
    this.rng = new SeededRng(options.seed, "character_creation");
  }

  public generate(options: GenerateCharacterDraftOptions): CharacterCreationDraft {
    if (options.slotId.length === 0) {
      throw new Error("slotId must not be empty");
    }

    const spiritualRoot = toSpiritualRootState(pickWeightedByRarity(this.rng, this.data.spiritualRoots));
    const destinies = this.rollDestinies([]);
    const background = toBackgroundOriginState(pickWeightedByRarity(this.rng, this.data.backgrounds));
    const hiddenFate = toHiddenFateState(this.pickHiddenFate(background.backgroundId));
    const draftId = `draft_${options.slotId}_${this.nextDraftSerial}`;
    this.nextDraftSerial += 1;

    return deepFreeze({
      draftId,
      slotId: options.slotId,
      name: normalizeName(options.name, this.data.defaults.draftName),
      appearance: this.rollAppearance(),
      coreStats: this.rollCoreStats(),
      aptitude: this.rollAptitudeStats(),
      spiritualRoot,
      destinies,
      background,
      hiddenFate,
      carriedItems: this.rollCarriedItems(background.backgroundId),
      locks: DEFAULT_LOCKS,
      rerollCount: 0,
      divinationTokens: this.data.defaults.reroll.initialDivinationTokens,
      createdAtMs: options.nowMs,
      updatedAtMs: options.nowMs
    });
  }

  public reroll(draft: CharacterCreationDraft, options: RerollCharacterDraftOptions): CharacterCreationDraft {
    const locks = mergeLocks(draft.locks, options.locks);
    const spiritualRoot = locks.spiritualRoot ? draft.spiritualRoot : toSpiritualRootState(pickWeightedByRarity(this.rng, this.data.spiritualRoots));
    const preservedDestinies = this.getPreservedDestinyTraits(draft.destinies, locks);
    const destinies = this.rollDestinies(preservedDestinies, draft.destinies, locks);
    const background = locks.background
      ? draft.background
      : toBackgroundOriginState(pickWeightedByRarity(this.rng, this.data.backgrounds));
    const hiddenFate = locks.hiddenFate ? draft.hiddenFate : toHiddenFateState(this.pickHiddenFate(background.backgroundId));

    return deepFreeze({
      ...draft,
      name: normalizeName(options.name, draft.name),
      appearance: this.rollAppearance(),
      coreStats: this.rollCoreStats(),
      aptitude: this.rollAptitudeStats(),
      spiritualRoot,
      destinies,
      background,
      hiddenFate,
      carriedItems: this.rollCarriedItems(background.backgroundId),
      locks,
      rerollCount: draft.rerollCount + 1,
      updatedAtMs: options.nowMs
    });
  }

  private rollCoreStats(): CoreThreeTreasures {
    const ranges = this.data.defaults.baseStats.core;
    return {
      jing: this.rollStat(ranges.jing),
      qi: this.rollStat(ranges.qi),
      shen: this.rollStat(ranges.shen)
    };
  }

  private rollAptitudeStats(): AptitudeStats {
    const ranges = this.data.defaults.baseStats.aptitude;
    return {
      rootBone: this.rollStat(ranges.rootBone),
      comprehension: this.rollStat(ranges.comprehension),
      inspiration: this.rollStat(ranges.inspiration),
      fortune: this.rollStat(ranges.fortune),
      heart: this.rollStat(ranges.heart),
      lifespan: this.rollStat(ranges.lifespan)
    };
  }

  private rollStat(range: StatRange): number {
    return this.rng.rangeInt(range[0], range[1]);
  }

  private rollAppearance(): CharacterAppearanceState {
    return {
      templateId: this.rng.pickWeighted(APPEARANCE_TEMPLATES.map((item) => ({ item, weight: 1 }))),
      genderPresentation: this.rng.pickWeighted(GENDER_PRESENTATIONS.map((item) => ({ item, weight: 1 }))),
      temperament: this.rng.pickWeighted(TEMPERAMENTS.map((item) => ({ item, weight: 1 }))),
      robeColor: this.rng.pickWeighted(ROBE_COLORS.map((item) => ({ item, weight: 1 })))
    };
  }

  private rollDestinies(
    preserved: readonly DestinyTraitDefinition[],
    previous?: DestinySelectionState,
    locks: CharacterCreationLocks = DEFAULT_LOCKS
  ): DestinySelectionState {
    const selected: DestinyTraitDefinition[] = [...preserved];
    const main = locks.mainDestiny && previous !== undefined ? previous.main : toDestinyTraitState(this.pickDestiny("main", selected));
    addSelectedDefinition(selected, this.requireDestinyDefinition(main.traitId));

    const secondary0 =
      locks.secondaryDestiny0 && previous !== undefined
        ? previous.secondary[0]
        : toDestinyTraitState(this.pickDestiny("secondary", selected));
    addSelectedDefinition(selected, this.requireDestinyDefinition(secondary0.traitId));

    const secondary1 =
      locks.secondaryDestiny1 && previous !== undefined
        ? previous.secondary[1]
        : toDestinyTraitState(this.pickDestiny("secondary", selected));
    addSelectedDefinition(selected, this.requireDestinyDefinition(secondary1.traitId));

    const flaw = locks.flawDestiny && previous !== undefined ? previous.flaw : toDestinyTraitState(this.pickDestiny("flaw", selected));

    return {
      main,
      secondary: [secondary0, secondary1],
      flaw
    };
  }

  private pickDestiny(slotType: DestinySlotType, selected: readonly DestinyTraitDefinition[]): DestinyTraitDefinition {
    const candidates = this.data.destinyTraits.filter(
      (trait) => trait.slotTypes.includes(slotType) && !selected.some((existing) => existing.id === trait.id) && isTraitCompatible(trait, selected)
    );
    if (candidates.length === 0) {
      throw new Error(`No compatible destiny traits available for ${slotType} slot`);
    }
    return pickWeightedByRarity(this.rng, candidates);
  }

  private pickHiddenFate(backgroundId: string): HiddenFateDefinition {
    const background = this.data.backgrounds.find((candidate) => candidate.id === backgroundId);
    const weights = background?.hiddenFateWeights ?? {};
    return this.rng.pickWeighted(
      this.data.hiddenFates.map((hiddenFate) => ({
        item: hiddenFate,
        weight: getRarityWeight(hiddenFate.rarity) * (weights[hiddenFate.id] ?? weights[hiddenFate.id.replace(/^hidden_/, "")] ?? 1)
      }))
    );
  }

  private rollCarriedItems(backgroundId: string): readonly CarriedItemDraft[] {
    const background = this.data.backgrounds.find((candidate) => candidate.id === backgroundId);
    const carriedItemsById = new Map(this.data.carriedItems.map((item) => [item.itemId, item]));
    const backgroundItems = (background?.carriedItemPool ?? []).flatMap((itemId) => {
      const item = carriedItemsById.get(itemId);
      return item === undefined ? [] : [item];
    });
    const pool = backgroundItems.length > 0 ? backgroundItems : this.data.carriedItems;
    return [this.rng.pickWeighted(pool.map((item) => ({ item, weight: getRarityWeight(item.rarity) })))];
  }

  private requireDestinyDefinition(traitId: string): DestinyTraitDefinition {
    const definition = this.data.destinyTraits.find((trait) => trait.id === traitId);
    if (definition === undefined) {
      throw new Error(`Unknown destiny trait id: ${traitId}`);
    }
    return definition;
  }

  private getPreservedDestinyTraits(destinies: DestinySelectionState, locks: CharacterCreationLocks): readonly DestinyTraitDefinition[] {
    const traitIds = [
      ...(locks.mainDestiny ? [destinies.main.traitId] : []),
      ...(locks.secondaryDestiny0 ? [destinies.secondary[0].traitId] : []),
      ...(locks.secondaryDestiny1 ? [destinies.secondary[1].traitId] : []),
      ...(locks.flawDestiny ? [destinies.flaw.traitId] : [])
    ];
    return traitIds.flatMap((traitId) => {
      const definition = this.data.destinyTraits.find((trait) => trait.id === traitId);
      return definition === undefined ? [] : [definition];
    });
  }
}

function pickWeightedByRarity<T extends { readonly rarity: string }>(rng: SeededRng, values: readonly T[]): T {
  return rng.pickWeighted(values.map((item) => ({ item, weight: getRarityWeight(item.rarity) })));
}

function getRarityWeight(rarity: string): number {
  if (rarity === "flaw") {
    return 100;
  }
  return RARITY_WEIGHTS[rarity as WeightedRarity] ?? 1;
}

function toSpiritualRootState(root: SpiritualRootDefinition): SpiritualRootState {
  return {
    rootId: root.id,
    displayName: root.name,
    elements: root.elements,
    rarity: root.rarity,
    tags: root.tags
  };
}

function toDestinyTraitState(trait: DestinyTraitDefinition): DestinyTraitState {
  return {
    traitId: trait.id,
    name: trait.name,
    rarity: trait.rarity,
    tags: trait.tags,
    positiveEffects: trait.positiveEffects,
    negativeEffects: trait.negativeEffects
  };
}

function toBackgroundOriginState(background: BackgroundOriginDefinition): BackgroundOriginState {
  return {
    backgroundId: background.id,
    name: background.name,
    rarity: background.rarity,
    description: background.description,
    visibleEffects: background.visibleEffects
  };
}

function toHiddenFateState(hiddenFate: HiddenFateDefinition): HiddenFateState {
  return {
    hiddenFateId: hiddenFate.id,
    hint: hiddenFate.hint,
    rarity: hiddenFate.rarity,
    tags: hiddenFate.tags,
    revealed: false
  };
}

function isTraitCompatible(candidate: DestinyTraitDefinition, selected: readonly DestinyTraitDefinition[]): boolean {
  const candidateExclusive = new Set(candidate.exclusiveWith ?? []);
  return selected.every((existing) => !candidateExclusive.has(existing.id) && existing.exclusiveWith?.includes(candidate.id) !== true);
}

function addSelectedDefinition(selected: DestinyTraitDefinition[], definition: DestinyTraitDefinition): void {
  if (!selected.some((trait) => trait.id === definition.id)) {
    selected.push(definition);
  }
}

function mergeLocks(current: CharacterCreationLocks, next: Partial<CharacterCreationLocks> | undefined): CharacterCreationLocks {
  return {
    spiritualRoot: next?.spiritualRoot ?? current.spiritualRoot,
    mainDestiny: next?.mainDestiny ?? current.mainDestiny,
    secondaryDestiny0: next?.secondaryDestiny0 ?? current.secondaryDestiny0,
    secondaryDestiny1: next?.secondaryDestiny1 ?? current.secondaryDestiny1,
    flawDestiny: next?.flawDestiny ?? current.flawDestiny,
    background: next?.background ?? current.background,
    hiddenFate: next?.hiddenFate ?? current.hiddenFate
  };
}

function normalizeName(value: string | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized === undefined || normalized.length === 0 ? fallback : normalized;
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
