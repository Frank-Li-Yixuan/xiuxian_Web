import type {
  CharacterCreationDraft,
  CharacterCreationLockKey,
  CharacterCreationLocks,
  DestinyTraitState
} from "../../character/CharacterCreationTypes";
import { loadDestinyRegistry } from "../../characterCreation/destiny/DestinyRegistry";

export type CharacterCreationDetailTab = "stats" | "root" | "destiny" | "origin" | "items";
export type CharacterCreationDestinyCardSlot = "main" | "secondary0" | "secondary1" | "flaw";

export interface CharacterCreationSelectionState {
  readonly selectedSlot: CharacterCreationDestinyCardSlot;
  readonly activeTab: CharacterCreationDetailTab;
}

export interface CharacterCreationDestinyCardViewModel {
  readonly slot: CharacterCreationDestinyCardSlot;
  readonly slotLabel: string;
  readonly lockKey: CharacterCreationLockKey;
  readonly traitId: string;
  readonly name: string;
  readonly rarity: string;
  readonly qualityLabel: string;
  readonly tags: readonly string[];
  readonly positiveEffects: readonly string[];
  readonly negativeEffects: readonly string[];
  readonly locked: boolean;
  readonly synergyWarnings: readonly string[];
  readonly conflictWarnings: readonly string[];
}

export interface CharacterCreationViewModel {
  readonly destinyCards: readonly CharacterCreationDestinyCardViewModel[];
  readonly selectedLockKey?: CharacterCreationLockKey;
  readonly lockBudget: {
    readonly activeLocks: readonly CharacterCreationLockKey[];
    readonly locksRemaining: number;
    readonly maxLocks: number;
  };
  readonly fateMeter: {
    readonly value: number;
    readonly boostThreshold: number;
    readonly guaranteeThreshold: number;
    readonly guaranteeRareNext: boolean;
  };
  readonly rerollCount: number;
  readonly divinationTokens: number;
  readonly canUseDivination: boolean;
  readonly synergyWarnings: readonly string[];
  readonly conflictWarnings: readonly string[];
  readonly warnings: readonly string[];
}

const DESTINY_CARD_CONFIG = [
  { slot: "main", slotLabel: "主天命", lockKey: "mainDestiny" },
  { slot: "secondary0", slotLabel: "副天命 1", lockKey: "secondaryDestiny0" },
  { slot: "secondary1", slotLabel: "副天命 2", lockKey: "secondaryDestiny1" },
  { slot: "flaw", slotLabel: "劫命", lockKey: "flawDestiny" }
] as const;
const DESTINY_REROLL_RULES = loadDestinyRegistry().rerollRules;

export function createCharacterCreationViewModel(
  draft: CharacterCreationDraft,
  selection: CharacterCreationSelectionState
): CharacterCreationViewModel {
  const activeLocks = getActiveBudgetedLocks(draft.locks);
  const locksRemaining = draft.destinyRerollSession?.locksRemaining ?? 0;
  const maxLocks = draft.destinyRerollSession === undefined
    ? DESTINY_REROLL_RULES.maxLockedFields
    : activeLocks.length + locksRemaining;
  const fateMeter = draft.destinyRerollSession?.fateMeter ?? draft.destinyRollDraft?.fateMeter ?? {
    value: 0,
    guaranteeRareNext: false
  };

  const selectedLockKey = getCharacterCreationLockKeyForSelection(selection);

  return {
    destinyCards: DESTINY_CARD_CONFIG.map((config) => {
      const trait = getTraitForCard(draft, config.slot);
      return {
        slot: config.slot,
        slotLabel: config.slotLabel,
        lockKey: config.lockKey,
        traitId: trait.traitId,
        name: trait.name,
        rarity: trait.rarity,
        qualityLabel: trait.qualityLabel ?? trait.rarity,
        tags: trait.tags,
        positiveEffects: trait.positiveEffects,
        negativeEffects: trait.negativeEffects,
        locked: draft.locks[config.lockKey],
        synergyWarnings: draft.destinies.synergyWarnings,
        conflictWarnings: draft.destinies.conflictWarnings
      };
    }),
    ...(selectedLockKey === undefined ? {} : { selectedLockKey }),
    lockBudget: {
      activeLocks,
      locksRemaining,
      maxLocks
    },
    fateMeter: {
      value: fateMeter.value,
      boostThreshold: DESTINY_REROLL_RULES.fateMeter.thresholdBoost,
      guaranteeThreshold: DESTINY_REROLL_RULES.fateMeter.thresholdGuaranteeRare,
      guaranteeRareNext: fateMeter.guaranteeRareNext
    },
    rerollCount: draft.rerollCount,
    divinationTokens: draft.divinationTokens,
    canUseDivination: draft.divinationTokens > 0,
    synergyWarnings: draft.destinies.synergyWarnings,
    conflictWarnings: draft.destinies.conflictWarnings,
    warnings: draft.destinies.warnings
  };
}

export function getCharacterCreationLockKeyForSelection(
  selection: CharacterCreationSelectionState
): CharacterCreationLockKey | undefined {
  switch (selection.activeTab) {
    case "root":
      return "spiritualRoot";
    case "destiny":
      return DESTINY_CARD_CONFIG.find((config) => config.slot === selection.selectedSlot)?.lockKey;
    case "origin":
      return "background";
    case "items":
      return "carriedItems";
    case "stats":
      return undefined;
  }
}

function getTraitForCard(
  draft: CharacterCreationDraft,
  slot: CharacterCreationDestinyCardSlot
): DestinyTraitState {
  switch (slot) {
    case "main":
      return draft.destinies.main;
    case "secondary0":
      return draft.destinies.secondary[0];
    case "secondary1":
      return draft.destinies.secondary[1];
    case "flaw":
      return draft.destinies.flaw;
  }
}

function getActiveBudgetedLocks(locks: CharacterCreationLocks): readonly CharacterCreationLockKey[] {
  const lockKeys: readonly CharacterCreationLockKey[] = [
    "spiritualRoot",
    "mainDestiny",
    "secondaryDestiny0",
    "secondaryDestiny1",
    "flawDestiny",
    "background",
    "carriedItems"
  ];
  return lockKeys.filter((lockKey) => locks[lockKey]);
}
