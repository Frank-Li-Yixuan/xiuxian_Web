import { SeededRng, type RngSeed } from "../sim/core/SeededRng";
import {
  DefaultDestinyRoller
} from "../characterCreation/destiny/DestinyRoller";
import { OpeningDestinyV2Roller } from "../characterCreation/destinyV2/OpeningDestinyV2Roller";
import {
  loadDestinyRegistry,
  type DestinyRegistry
} from "../characterCreation/destiny/DestinyRegistry";
import { DefaultOpeningGenerator } from "../opening/OpeningGenerator";
import {
  DefaultOriginFateGenerator,
  type GenerateOriginFateDraftInput,
  type OriginFateGenerator
} from "../originFate/OriginFateGenerator";
import { buildOriginFateNarrativeStateFromDraft } from "../originFate/OriginFateNarrativeDraftAdapter";
import {
  loadOriginFateRegistry,
  type OriginFateRegistry
} from "../originFate/OriginFateRegistry";
import type {
  OpeningGenerationLocks,
  OpeningGenerator,
  OpeningInnateDraft,
  SpiritualRootState as OpeningSpiritualRootState
} from "../types/opening-generator-types.v0.1";
import type {
  CarriedItemResult,
  OriginFateDraft,
  OriginFateLocks,
  OriginRarity
} from "../types/origin-fate-types.v0.1";
import type {
  CharacterCreationLocks as DestinyGenerationLocks,
  DestinyQuality,
  DestinyFateAlignmentInfo,
  DestinyRollDraft,
  DestinyRoller,
  DestinyTraitDefinition as GeneratedDestinyTraitDefinition,
  FateMeterState
} from "../types/destiny-types.v0.1";
import { loadCharacterCreationData } from "./CharacterCreationData";
import type {
  AptitudeStats,
  BackgroundOriginState,
  CarriedItemDraft,
  CharacterAppearanceState,
  CharacterCreationDraft,
  CharacterCreationLocks,
  CharacterCreationLockKey,
  CharacterCreationRarity,
  DestinySelectionState,
  DestinyTraitState,
  HiddenFateState,
  LoadedCharacterCreationData,
  SpiritualRootState,
  WeightedRarity
} from "./CharacterCreationTypes";

export interface CharacterDraftGeneratorOptions {
  readonly seed: RngSeed;
  readonly data?: LoadedCharacterCreationData;
  readonly openingGenerator?: OpeningGenerator;
  readonly originFateGenerator?: OriginFateGenerator;
  readonly originFateRegistry?: OriginFateRegistry;
  readonly destinyRegistry?: DestinyRegistry;
  readonly destinyRoller?: DestinyRoller;
}

export interface GenerateCharacterDraftOptions {
  readonly slotId: string;
  readonly nowMs: number;
  readonly name?: string;
}

export interface RerollCharacterDraftOptions {
  readonly nowMs: number;
  readonly locks?: Partial<CharacterCreationLocks>;
  readonly attributeLock?: boolean;
  readonly spiritualRootLock?: boolean;
  readonly useDivination?: boolean;
  readonly name?: string;
}

export interface ToggleCharacterCreationLockOptions {
  readonly lockKey: CharacterCreationLockKey;
  readonly nowMs: number;
}

const DEFAULT_LOCKS: CharacterCreationLocks = {
  spiritualRoot: false,
  mainDestiny: false,
  secondaryDestiny0: false,
  secondaryDestiny1: false,
  flawDestiny: false,
  background: false,
  hiddenFate: false,
  carriedItems: false
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
  private readonly openingGenerator: OpeningGenerator;
  private readonly originFateGenerator: OriginFateGenerator;
  private readonly originFateRegistry: OriginFateRegistry;
  private readonly destinyRegistry: DestinyRegistry;
  private readonly destinyRoller: DestinyRoller;
  private readonly openingSeed: string;
  private nextDraftSerial = 0;

  public constructor(options: CharacterDraftGeneratorOptions) {
    this.data = options.data ?? loadCharacterCreationData();
    this.rng = new SeededRng(options.seed, "character_creation");
    this.openingGenerator = options.openingGenerator ?? new DefaultOpeningGenerator();
    this.originFateRegistry = options.originFateRegistry ?? loadOriginFateRegistry();
    this.originFateGenerator = options.originFateGenerator ?? new DefaultOriginFateGenerator(this.originFateRegistry);
    this.destinyRegistry = options.destinyRegistry ?? loadDestinyRegistry();
    this.destinyRoller = options.destinyRoller ??
      (options.destinyRegistry === undefined
        ? new OpeningDestinyV2Roller(undefined, this.destinyRegistry)
        : new DefaultDestinyRoller(this.destinyRegistry));
    this.openingSeed = String(options.seed);
  }

  public generate(options: GenerateCharacterDraftOptions): CharacterCreationDraft {
    if (options.slotId.length === 0) {
      throw new Error("slotId must not be empty");
    }

    const draftSerial = this.nextDraftSerial;
    const draftId = `draft_${options.slotId}_${draftSerial}`;
    this.nextDraftSerial += 1;
    const openingInnateDraft = this.openingGenerator.generate({
      seed: createOpeningSeed(this.openingSeed, options.slotId, draftSerial),
      draftId,
      rerollIndex: 0
    });
    const spiritualRoot = projectOpeningSpiritualRoot(openingInnateDraft.spiritualRoot);
    const destinySeed = createDestinySeed(this.openingSeed, options.slotId, draftSerial);
    const destinyRollDraft = this.destinyRoller.generate({
      seed: destinySeed,
      draftId,
      rerollIndex: 0,
      openingInnateDraft
    });
    const destinies = projectDestinyRollSelection(destinyRollDraft);
    const divinationTokens = this.destinyRegistry.rerollRules.initialDivinationTokens;
    const destinyRerollSession = buildDestinyRerollSession({
      draftId,
      slotId: options.slotId,
      seed: destinySeed,
      rerollCount: 0,
      locks: DEFAULT_LOCKS,
      fateMeter: destinyRollDraft.fateMeter,
      previousTraitIds: getDestinyTraitIds(destinyRollDraft),
      divinationTokens,
      maxLocks: this.destinyRegistry.rerollRules.maxLockedFields
    });
    const originFate = this.originFateGenerator.generate({
      seed: createOriginFateSeed(this.openingSeed, options.slotId, draftSerial),
      draftId,
      rerollIndex: 0,
      ...buildOriginFateContextTags(openingInnateDraft, destinies),
      divinationTokens
    });
    const originFateNarrativeState = buildOriginFateNarrativeStateFromDraft({
      originFate,
      openingInnateDraft,
      destinies,
      seed: `${originFate.seed}:hfo2_c006`
    });
    const safeOriginFate = sanitizeOriginFateDraft(originFate);

    return deepFreeze({
      draftId,
      slotId: options.slotId,
      name: normalizeName(options.name, this.data.defaults.draftName),
      appearance: this.rollAppearance(),
      coreStats: openingInnateDraft.coreSeed,
      aptitude: openingInnateDraft.aptitude,
      spiritualRoot,
      openingInnateDraft,
      destinies,
      destinyRollDraft,
      destinyRerollSession,
      originFate: safeOriginFate,
      originFateNarrativeState,
      background: this.projectOriginBackground(safeOriginFate),
      hiddenFate: this.projectOriginHiddenFate(safeOriginFate),
      carriedItems: this.projectOriginCarriedItems(safeOriginFate),
      locks: DEFAULT_LOCKS,
      attributeLock: false,
      spiritualRootLock: false,
      rerollCount: 0,
      divinationTokens,
      createdAtMs: options.nowMs,
      updatedAtMs: options.nowMs
    });
  }

  public reroll(draft: CharacterCreationDraft, options: RerollCharacterDraftOptions): CharacterCreationDraft {
    const locks = mergeLocks(draft.locks, options.locks);
    const attributeLock = options.attributeLock ?? draft.attributeLock;
    const spiritualRootLock = options.spiritualRootLock ?? options.locks?.spiritualRoot ?? draft.spiritualRootLock;
    const effectiveLocks = {
      ...locks,
      spiritualRoot: spiritualRootLock
    };
    validateLockBudget(effectiveLocks, this.destinyRegistry.rerollRules.maxLockedFields);
    const openingLocks = buildOpeningLocks(attributeLock, spiritualRootLock);
    const openingInnateDraft = this.openingGenerator.generate({
      seed: draft.openingInnateDraft.seed,
      draftId: draft.draftId,
      rerollIndex: draft.rerollCount + 1,
      ...(openingLocks === undefined ? {} : { locks: openingLocks }),
      previousDraft: draft.openingInnateDraft
    });
    const spiritualRoot = projectOpeningSpiritualRoot(openingInnateDraft.spiritualRoot);
    const divination = resolveDivinationState(draft, options.useDivination === true, this.destinyRegistry);
    const previousDestinyRollDraft = resolvePreviousDestinyRollDraft(draft, this.destinyRegistry);
    const destinySeed = previousDestinyRollDraft?.seed ?? `${draft.openingInnateDraft.seed}:destiny_roll`;
    const destinyRollDraft = this.destinyRoller.generate({
      seed: destinySeed,
      draftId: draft.draftId,
      rerollIndex: draft.rerollCount + 1,
      openingInnateDraft,
      locks: toDestinyGenerationLocks(effectiveLocks),
      ...(previousDestinyRollDraft === undefined ? {} : { previousDraft: previousDestinyRollDraft }),
      fateMeter: divination.fateMeter,
      previousTraitIds: draft.destinyRerollSession?.previousTraitIds ?? getLegacyDestinyTraitIds(draft.destinies)
    });
    const destinies = projectDestinyRollSelection(destinyRollDraft);
    const destinyRerollSession = buildDestinyRerollSession({
      draftId: draft.draftId,
      slotId: draft.slotId,
      seed: destinySeed,
      rerollCount: draft.rerollCount + 1,
      locks: effectiveLocks,
      fateMeter: destinyRollDraft.fateMeter,
      previousTraitIds: appendTraitHistory(
        draft.destinyRerollSession?.previousTraitIds ?? getLegacyDestinyTraitIds(draft.destinies),
        getDestinyTraitIds(destinyRollDraft),
        this.destinyRegistry.rerollRules.rerollHistory.recordLast
      ),
      divinationTokens: divination.nextDivinationTokens,
      maxLocks: this.destinyRegistry.rerollRules.maxLockedFields
    });
    const originFateLocks = buildOriginFateLocks(draft.originFate, locks);
    const originFate = this.originFateGenerator.generate({
      seed: draft.originFate.seed,
      draftId: draft.draftId,
      rerollIndex: draft.rerollCount + 1,
      ...buildOriginFateContextTags(openingInnateDraft, destinies),
      ...(originFateLocks === undefined ? {} : { locks: originFateLocks }),
      previousDraft: draft.originFate,
      divinationTokens: divination.nextDivinationTokens
    });
    const originFateNarrativeState = buildOriginFateNarrativeStateFromDraft({
      originFate,
      openingInnateDraft,
      destinies,
      seed: `${originFate.seed}:hfo2_c006:${draft.rerollCount + 1}`
    });
    const safeOriginFate = sanitizeOriginFateDraft(originFate);

    return deepFreeze({
      ...draft,
      name: normalizeName(options.name, draft.name),
      appearance: this.rollAppearance(),
      coreStats: openingInnateDraft.coreSeed,
      aptitude: openingInnateDraft.aptitude,
      spiritualRoot,
      openingInnateDraft,
      destinies,
      destinyRollDraft,
      destinyRerollSession,
      originFate: safeOriginFate,
      originFateNarrativeState,
      background: this.projectOriginBackground(safeOriginFate),
      hiddenFate: this.projectOriginHiddenFate(safeOriginFate),
      carriedItems: this.projectOriginCarriedItems(safeOriginFate),
      locks: {
        ...effectiveLocks,
        spiritualRoot: spiritualRootLock
      },
      attributeLock,
      spiritualRootLock,
      rerollCount: draft.rerollCount + 1,
      divinationTokens: divination.nextDivinationTokens,
      updatedAtMs: options.nowMs
    });
  }

  public toggleLock(draft: CharacterCreationDraft, options: ToggleCharacterCreationLockOptions): CharacterCreationDraft {
    const nextLocks = {
      ...draft.locks,
      [options.lockKey]: !draft.locks[options.lockKey]
    };
    validateLockBudget(nextLocks, this.destinyRegistry.rerollRules.maxLockedFields);

    return deepFreeze({
      ...draft,
      locks: nextLocks,
      spiritualRootLock: nextLocks.spiritualRoot,
      destinyRerollSession: buildDestinyRerollSession({
        draftId: draft.draftId,
        slotId: draft.slotId,
        seed: draft.destinyRerollSession?.seed ?? draft.destinyRollDraft?.seed ?? `${draft.openingInnateDraft.seed}:destiny_roll`,
        rerollCount: draft.rerollCount,
        locks: nextLocks,
        fateMeter: draft.destinyRerollSession?.fateMeter ?? draft.destinyRollDraft?.fateMeter ?? getInitialFateMeter(this.destinyRegistry),
        previousTraitIds: draft.destinyRerollSession?.previousTraitIds ?? getLegacyDestinyTraitIds(draft.destinies),
        divinationTokens: draft.divinationTokens,
        maxLocks: this.destinyRegistry.rerollRules.maxLockedFields
      }),
      updatedAtMs: options.nowMs
    });
  }

  private projectOriginBackground(originFate: OriginFateDraft): BackgroundOriginState {
    const definition = this.originFateRegistry.getBackgroundOrigin(originFate.backgroundOrigin.originId);
    return {
      backgroundId: originFate.backgroundOrigin.originId,
      name: originFate.backgroundOrigin.name,
      rarity: mapOriginRarity(definition.rarity),
      description: originFate.backgroundOrigin.visibleDescription,
      visibleEffects: uniqueStable([
        ...originFate.backgroundOrigin.matchedTags,
        ...definition.modeBiasTags
      ])
    };
  }

  private projectOriginHiddenFate(originFate: OriginFateDraft): HiddenFateState {
    const definition = this.originFateRegistry.getHiddenFate(originFate.hiddenFateInternal.hiddenFateId);
    const omen = originFate.visibleHiddenOmen;
    return {
      hiddenFateId: originFate.hiddenFateInternal.hiddenFateId,
      hint: uniqueStable([omen.levelLabel, ...omen.hints, omen.riskHint]).join(" / "),
      rarity: mapOriginRarity(definition.rarity),
      tags: uniqueStable([
        `hiddenFateCategory:${originFate.hiddenFateInternal.category}`,
        `hiddenFateBand:${originFate.hiddenFateInternal.progressBand}`,
        ...(omen.relatedTags ?? [])
      ]),
      revealed: false
    };
  }

  private projectOriginCarriedItems(originFate: OriginFateDraft): readonly CarriedItemDraft[] {
    return originFate.carriedItems.map((item) => toCarriedItemDraft(item, this.originFateRegistry.getCarriedItem(item.itemId).rarity));
  }

  private rollAppearance(): CharacterAppearanceState {
    return {
      templateId: this.rng.pickWeighted(APPEARANCE_TEMPLATES.map((item) => ({ item, weight: 1 }))),
      genderPresentation: this.rng.pickWeighted(GENDER_PRESENTATIONS.map((item) => ({ item, weight: 1 }))),
      temperament: this.rng.pickWeighted(TEMPERAMENTS.map((item) => ({ item, weight: 1 }))),
      robeColor: this.rng.pickWeighted(ROBE_COLORS.map((item) => ({ item, weight: 1 })))
    };
  }
}

export function projectOpeningSpiritualRoot(root: OpeningSpiritualRootState): SpiritualRootState {
  return {
    rootId: `opening_${root.categoryId}_${root.primaryElement ?? "none"}`,
    displayName: root.displayName,
    elements: Object.entries(root.elements)
      .filter((entry): entry is [string, number] => entry[1] !== undefined && entry[1] > 0)
      .sort(([firstElement, firstValue], [secondElement, secondValue]) => secondValue - firstValue || firstElement.localeCompare(secondElement))
      .map(([element]) => element),
    rarity: mapOpeningRootRarity(root.categoryId),
    tags: root.tags
  };
}

function mapOpeningRootRarity(categoryId: OpeningSpiritualRootState["categoryId"]): CharacterCreationRarity {
  switch (categoryId) {
    case "closed":
      return "flaw";
    case "single":
    case "dual":
      return "common";
    case "triple":
    case "mixed":
      return "uncommon";
    case "hidden":
    case "variant":
      return "rare";
    case "chaos":
      return "epic";
    case "heavenly":
      return "legendary";
  }
}

function projectDestinyRollSelection(draft: DestinyRollDraft): DestinySelectionState {
  const alignments = draft.debug.ninePalace?.slotAlignments;
  return {
    main: toDestinyTraitState(draft.destinies.main, alignments?.main),
    secondary: [
      toDestinyTraitState(draft.destinies.secondary[0], alignments?.secondary0),
      toDestinyTraitState(draft.destinies.secondary[1], alignments?.secondary1)
    ],
    flaw: toDestinyTraitState(draft.destinies.flaw, alignments?.flaw),
    synergies: draft.destinies.synergies,
    softConflicts: draft.destinies.softConflicts,
    synergyWarnings: draft.destinies.synergyWarnings,
    conflictWarnings: draft.destinies.conflictWarnings,
    warnings: draft.destinies.warnings,
    ...(draft.destinies.lifeManifestationHooks === undefined
      ? {}
      : { lifeManifestationHooks: draft.destinies.lifeManifestationHooks })
  };
}

function toDestinyTraitState(
  trait: GeneratedDestinyTraitDefinition,
  alignment?: DestinyFateAlignmentInfo
): DestinyTraitState {
  return {
    traitId: trait.id,
    name: trait.name,
    rarity: mapDestinyQualityToRarity(trait.quality),
    quality: trait.quality,
    qualityLabel: getDestinyQualityLabel(trait.quality),
    description: trait.description,
    tags: trait.tags,
    positiveEffects: trait.positiveEffects,
    negativeEffects: trait.negativeEffects,
    ...(alignment === undefined
      ? {}
      : {
          fateAlignment: alignment.alignment,
          fateAlignmentLabel: alignment.label,
          fateAlignmentReasonTags: alignment.reasonTags,
          ...(alignment.sourceTraitId === undefined ? {} : { mutatedFromTraitId: alignment.sourceTraitId })
        })
  };
}

function mapDestinyQualityToRarity(quality: DestinyQuality): CharacterCreationRarity {
  switch (quality) {
    case "flaw":
      return "flaw";
    case "mortal":
    case "good":
      return "common";
    case "rare":
      return "rare";
    case "mystic":
    case "defiant":
      return "epic";
    case "earthly":
    case "heavenly":
    case "forbidden":
      return "legendary";
  }
}

function getDestinyQualityLabel(quality: DestinyQuality): string {
  switch (quality) {
    case "mortal":
      return "凡命";
    case "good":
      return "良命";
    case "rare":
      return "奇命";
    case "mystic":
      return "玄命";
    case "earthly":
      return "地命";
    case "heavenly":
      return "天命";
    case "defiant":
      return "逆命";
    case "forbidden":
      return "禁命";
    case "flaw":
      return "劫命";
  }
}

interface BuildDestinyRerollSessionOptions {
  readonly draftId: string;
  readonly slotId: string;
  readonly seed: string;
  readonly rerollCount: number;
  readonly locks: CharacterCreationLocks;
  readonly fateMeter: FateMeterState;
  readonly previousTraitIds: readonly string[];
  readonly divinationTokens: number;
  readonly maxLocks: number;
}

function buildDestinyRerollSession(options: BuildDestinyRerollSessionOptions) {
  const activeLockCount = countBudgetedLocks(options.locks);
  return {
    sessionId: `${options.draftId}:destiny_reroll`,
    slotId: options.slotId,
    seed: options.seed,
    rerollCount: options.rerollCount,
    locksRemaining: Math.max(0, options.maxLocks - activeLockCount),
    divinationTokens: options.divinationTokens,
    lockedFields: toDestinyGenerationLocks(options.locks),
    fateMeter: options.fateMeter,
    previousTraitIds: options.previousTraitIds
  };
}

function validateLockBudget(locks: CharacterCreationLocks, maxLocks: number): void {
  const activeLockCount = countBudgetedLocks(locks);
  if (activeLockCount > maxLocks) {
    throw new Error(`Character creation lock budget exceeded: ${activeLockCount}/${maxLocks}`);
  }
}

function countBudgetedLocks(locks: CharacterCreationLocks): number {
  return [
    locks.spiritualRoot,
    locks.mainDestiny,
    locks.secondaryDestiny0,
    locks.secondaryDestiny1,
    locks.flawDestiny,
    locks.background,
    locks.carriedItems
  ].filter(Boolean).length;
}

function toDestinyGenerationLocks(locks: CharacterCreationLocks): DestinyGenerationLocks {
  return {
    ...(locks.spiritualRoot ? { spiritualRoot: true } : {}),
    ...(locks.mainDestiny ? { mainDestiny: true } : {}),
    ...(locks.secondaryDestiny0 ? { secondaryDestiny0: true } : {}),
    ...(locks.secondaryDestiny1 ? { secondaryDestiny1: true } : {}),
    ...(locks.flawDestiny ? { flawDestiny: true } : {}),
    ...(locks.background ? { backgroundOrigin: true } : {}),
    ...(locks.hiddenFate ? { hiddenFateHint: true } : {}),
    ...(locks.carriedItems ? { carriedItem: true } : {})
  };
}

function resolvePreviousDestinyRollDraft(
  draft: CharacterCreationDraft,
  registry: DestinyRegistry
): DestinyRollDraft | undefined {
  if (draft.destinyRollDraft !== undefined) {
    return draft.destinyRollDraft;
  }

  try {
    const main = registry.getTrait(draft.destinies.main.traitId);
    const secondary0 = registry.getTrait(draft.destinies.secondary[0].traitId);
    const secondary1 = registry.getTrait(draft.destinies.secondary[1].traitId);
    const flaw = registry.getTrait(draft.destinies.flaw.traitId);
    return {
      draftId: draft.draftId,
      seed: `${draft.openingInnateDraft.seed}:destiny_roll`,
      rerollIndex: draft.rerollCount,
      destinies: {
        main,
        secondary: [secondary0, secondary1],
        flaw,
        synergies: [],
        softConflicts: [],
        synergyWarnings: [],
        conflictWarnings: [],
        warnings: []
      },
      fateMeter: draft.destinyRerollSession?.fateMeter ?? getInitialFateMeter(registry),
      debug: {
        attempts: 0,
        rejectedByExclusive: [],
        selectedWeights: {},
        fateMeterBefore: draft.destinyRerollSession?.fateMeter ?? getInitialFateMeter(registry),
        fateMeterAfter: draft.destinyRerollSession?.fateMeter ?? getInitialFateMeter(registry)
      }
    };
  } catch {
    return undefined;
  }
}

function getInitialFateMeter(registry: DestinyRegistry): FateMeterState {
  return {
    value: registry.rerollRules.fateMeter.initial,
    guaranteeRareNext: registry.rerollRules.fateMeter.initial >= registry.rerollRules.fateMeter.thresholdGuaranteeRare
  };
}

function resolveDivinationState(
  draft: CharacterCreationDraft,
  useDivination: boolean,
  registry: DestinyRegistry
): { readonly fateMeter: FateMeterState; readonly nextDivinationTokens: number } {
  const currentFateMeter = draft.destinyRerollSession?.fateMeter ?? draft.destinyRollDraft?.fateMeter ?? getInitialFateMeter(registry);
  if (!useDivination) {
    return {
      fateMeter: currentFateMeter,
      nextDivinationTokens: draft.divinationTokens
    };
  }
  if (draft.divinationTokens <= 0) {
    throw new Error("No divination tokens remaining");
  }
  return {
    fateMeter: {
      ...currentFateMeter,
      value: Math.max(currentFateMeter.value, registry.rerollRules.fateMeter.thresholdGuaranteeRare),
      guaranteeRareNext: true
    },
    nextDivinationTokens: draft.divinationTokens - 1
  };
}

function getDestinyTraitIds(draft: DestinyRollDraft): readonly string[] {
  return [draft.destinies.main.id, ...draft.destinies.secondary.map((trait) => trait.id), draft.destinies.flaw.id];
}

function getLegacyDestinyTraitIds(destinies: DestinySelectionState): readonly string[] {
  return [destinies.main.traitId, ...destinies.secondary.map((trait) => trait.traitId), destinies.flaw.traitId];
}

function appendTraitHistory(
  previousTraitIds: readonly string[],
  nextTraitIds: readonly string[],
  limit: number
): readonly string[] {
  const combined = [...previousTraitIds, ...nextTraitIds];
  return limit <= 0 ? combined : combined.slice(-limit);
}

function mergeLocks(current: CharacterCreationLocks, next: Partial<CharacterCreationLocks> | undefined): CharacterCreationLocks {
  return {
    spiritualRoot: next?.spiritualRoot ?? current.spiritualRoot,
    mainDestiny: next?.mainDestiny ?? current.mainDestiny,
    secondaryDestiny0: next?.secondaryDestiny0 ?? current.secondaryDestiny0,
    secondaryDestiny1: next?.secondaryDestiny1 ?? current.secondaryDestiny1,
    flawDestiny: next?.flawDestiny ?? current.flawDestiny,
    background: next?.background ?? current.background,
    hiddenFate: next?.hiddenFate ?? current.hiddenFate,
    carriedItems: next?.carriedItems ?? current.carriedItems
  };
}

function buildOpeningLocks(attributeLock: boolean, spiritualRootLock: boolean): OpeningGenerationLocks | undefined {
  if (!attributeLock && !spiritualRootLock) {
    return undefined;
  }
  return {
    ...(attributeLock
      ? {
          attributeArchetype: true,
          aptitudeStats: true,
          coreSeedStats: true
        }
      : {}),
    ...(spiritualRootLock ? { spiritualRootFull: true } : {})
  };
}

function buildOriginFateContextTags(
  openingInnateDraft: OpeningInnateDraft,
  destinies: DestinySelectionState
): Pick<GenerateOriginFateDraftInput, "openingTags" | "destinyTags" | "spiritualRootTags" | "aptitudeTags"> {
  const destinyTraits = [destinies.main, ...destinies.secondary, destinies.flaw];
  return {
    openingTags: uniqueStable([
      `archetype:${openingInnateDraft.archetype.id}`,
      ...openingInnateDraft.archetype.tags,
      ...openingInnateDraft.tags.lifeEventBiasTags,
      ...openingInnateDraft.tags.hiddenFateBiasTags,
      ...openingInnateDraft.tags.modeBiasTags,
      ...openingInnateDraft.tags.destinyBiasTags
    ]),
    destinyTags: uniqueStable([
      ...destinyTraits.map((trait) => trait.traitId),
      ...destinyTraits.flatMap((trait) => trait.tags)
    ]),
    spiritualRootTags: uniqueStable([
      `rootCategory:${openingInnateDraft.spiritualRoot.categoryId}`,
      ...Object.entries(openingInnateDraft.spiritualRoot.elements)
        .filter(([, value]) => value > 0)
        .map(([element]) => `root:${element}`),
      ...openingInnateDraft.spiritualRoot.relationTags,
      ...openingInnateDraft.spiritualRoot.tags
    ]),
    aptitudeTags: deriveAptitudeTags(openingInnateDraft.aptitude)
  };
}

function deriveAptitudeTags(aptitude: AptitudeStats): readonly string[] {
  const entries = Object.entries(aptitude) as readonly [keyof AptitudeStats, number][];
  return uniqueStable(
    entries.flatMap(([key, value]) => {
      if (value >= 75) {
        return [`aptitude:${key}_high`, `${key}_high`];
      }
      if (value <= 35) {
        return [`aptitude:${key}_low`, `${key}_low`];
      }
      return [];
    })
  );
}

function buildOriginFateLocks(originFate: OriginFateDraft, locks: CharacterCreationLocks): OriginFateLocks | undefined {
  const nextLocks: OriginFateLocks = {
    ...(locks.background ? { backgroundOriginId: originFate.backgroundOrigin.originId } : {}),
    ...(locks.hiddenFate ? { hiddenFateId: originFate.hiddenFateInternal.hiddenFateId } : {}),
    ...(locks.carriedItems ? { carriedItemIds: originFate.carriedItems.map((item) => item.itemId) } : {})
  };
  return Object.keys(nextLocks).length === 0 ? undefined : nextLocks;
}

function sanitizeOriginFateDraft(originFate: OriginFateDraft): OriginFateDraft {
  const { trueName: _hiddenName, ...safeHiddenFateInternal } = originFate.hiddenFateInternal;
  return {
    ...originFate,
    hiddenFateInternal: safeHiddenFateInternal as OriginFateDraft["hiddenFateInternal"]
  };
}

function toCarriedItemDraft(item: CarriedItemResult, rarity: OriginRarity): CarriedItemDraft {
  return {
    itemId: item.itemId,
    name: item.name,
    rarity: mapOriginRarity(rarity),
    description: item.visibleDescription,
    tags: uniqueStable([...item.matchedTags, item.conversion.type]),
    outerBattlefieldConversion: `${item.conversion.label}: ${item.conversion.outerBattlefieldEffect}`
  };
}

function mapOriginRarity(rarity: OriginRarity): CharacterCreationRarity {
  return rarity === "mythic" ? "legendary" : rarity;
}

function createOriginFateSeed(seed: string, slotId: string, draftSerial: number): string {
  return `${seed}:character_creation_origin_fate:${slotId}:${draftSerial}`;
}

function createDestinySeed(seed: string, slotId: string, draftSerial: number): string {
  return `${seed}:character_creation_destiny:${slotId}:${draftSerial}`;
}

function createOpeningSeed(seed: string, slotId: string, draftSerial: number): string {
  return `${seed}:character_creation:${slotId}:${draftSerial}`;
}

function uniqueStable<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
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
