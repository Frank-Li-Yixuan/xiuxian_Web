import type { RunSettlementReceipt } from "../sim/settlement/RunSettlement";
import type { CharacterOriginState } from "../types/character-creation-types.v0.1";
import { addResources, copyResourceMap, type ResourceMap } from "./ResourceWallet";

export type ResourceWallet = ResourceMap;
export type LifeSimulationStatus = "simulating" | "completed";

export interface LifeSimulationProgressState {
  readonly status: LifeSimulationStatus;
  readonly ageYears: number;
}

export interface OutgameProfileState {
  readonly saveVersion: string;
  readonly profileId: string;
  readonly saveName?: string;
  readonly characterName?: string;
  readonly characterOrigin?: CharacterOriginState;
  readonly lifeSimulation?: LifeSimulationProgressState;
  readonly createdAtMs?: number;
  readonly updatedAtMs?: number;
  readonly realm: RealmProgressState;
  readonly wallet: ResourceWallet;
  readonly buildings: Readonly<Record<string, BuildingState>>;
  readonly methods: Readonly<Record<string, MethodProgressState>>;
  readonly spells: Readonly<Record<string, SpellMasteryState>>;
  readonly artifacts: Readonly<Record<string, EquipmentProgressState>>;
  readonly treasures: Readonly<Record<string, EquipmentProgressState>>;
  readonly pills: Readonly<Record<string, number>>;
  readonly alchemy: AlchemyState;
  readonly idle: IdleState;
  readonly activeTraining: readonly MethodTrainingAllocation[];
  readonly activeLoadoutId: string;
  readonly loadouts: readonly LoadoutPresetState[];
  readonly appliedReceiptIds: readonly string[];
  readonly flags: OutgameFlags;
}

export interface RealmProgressState {
  readonly realmId: string;
  readonly layer: number;
  readonly cultivation: number;
  readonly cultivationToNext: number;
  readonly atBottleneck: boolean;
  readonly bottleneckTrialId?: string;
  readonly injuryDebuffs?: readonly OutgameDebuffState[];
}

export interface BuildingState {
  readonly level: number;
  readonly unlocked?: boolean;
}

export interface MethodProgressState {
  readonly unlocked: boolean;
  readonly level: number;
  readonly trainingProgress: number;
  readonly equippedAsMain?: boolean;
}

export interface SpellMasteryState {
  readonly unlocked: boolean;
  readonly masteryLevel: number;
}

export interface EquipmentProgressState {
  readonly unlocked: boolean;
  readonly star: number;
}

export interface AlchemyState {
  readonly toxin: {
    readonly body: number;
    readonly qi: number;
    readonly shen: number;
  };
  readonly permanentPillProgress: {
    readonly jing: number;
    readonly qiRoot: number;
    readonly shen: number;
  };
}

export interface IdleState {
  readonly lastClaimAtMs: number;
  readonly pendingEventIds: readonly string[];
}

export interface OutgameDebuffState {
  readonly id: string;
  readonly remainingRuns?: number;
  readonly expiresAtMs?: number;
  readonly effects: Readonly<Record<string, number | boolean | string>>;
}

export interface MethodTrainingAllocation {
  readonly methodId: string;
  readonly allocationWeight: number;
}

export interface LoadoutPresetState {
  readonly id: string;
  readonly name: string;
  readonly mainMethodId: string | null;
  readonly natalArtifactId: string | null;
  readonly spiritTreasureIds: readonly (string | null)[];
  readonly spellIds: readonly (string | null)[];
  readonly pillIds: readonly (string | null)[];
}

export interface OutgameFlags {
  readonly firstStageCleared?: boolean;
  readonly foundationTrialUnlocked?: boolean;
  readonly [flag: string]: boolean | undefined;
}

export interface ApplyRunSettlementReceiptOptions {
  readonly profile: OutgameProfileState;
  readonly receipt: RunSettlementReceipt;
}

export interface ApplyRunSettlementReceiptResult {
  readonly profile: OutgameProfileState;
  readonly applied: boolean;
}

export function cloneOutgameProfile(profile: OutgameProfileState): OutgameProfileState {
  validateProfile(profile);
  return deepFreeze(structuredClone(profile));
}

export function applyRunSettlementReceipt(options: ApplyRunSettlementReceiptOptions): ApplyRunSettlementReceiptResult {
  validateProfile(options.profile);
  validateReceipt(options.receipt);

  if (options.profile.profileId !== options.receipt.profileId) {
    throw new Error("receipt profileId must match profile");
  }
  if (options.profile.appliedReceiptIds.includes(options.receipt.receiptId)) {
    return deepFreeze({
      profile: cloneOutgameProfile(options.profile),
      applied: false
    });
  }

  const wallet = addResources(
    addResources(addResources(options.profile.wallet, options.receipt.baseRewards), options.receipt.bonusRewards ?? {}),
    options.receipt.firstClearBonus ?? {}
  );
  const cultivationGain = options.receipt.cultivationRewards ?? 0;
  const realm =
    cultivationGain <= 0
      ? options.profile.realm
      : {
          ...options.profile.realm,
          cultivation: round3(options.profile.realm.cultivation + cultivationGain)
        };

  return deepFreeze({
    profile: {
      ...cloneOutgameProfile(options.profile),
      wallet,
      realm,
      appliedReceiptIds: [...options.profile.appliedReceiptIds, options.receipt.receiptId],
      flags: {
        ...options.profile.flags,
        ...(options.receipt.bossKilled === undefined ? {} : { firstStageCleared: true })
      }
    },
    applied: true
  });
}

export function withWallet(profile: OutgameProfileState, wallet: ResourceMap): OutgameProfileState {
  return deepFreeze({
    ...cloneOutgameProfile(profile),
    wallet: copyResourceMap(wallet)
  });
}

function validateProfile(profile: OutgameProfileState): void {
  if (profile.saveVersion.length === 0) {
    throw new Error("profile saveVersion must not be empty");
  }
  if (profile.profileId.length === 0) {
    throw new Error("profileId must not be empty");
  }
  if (profile.saveName !== undefined && profile.saveName.trim().length === 0) {
    throw new Error("profile saveName must not be empty when provided");
  }
  if (profile.characterName !== undefined && profile.characterName.trim().length === 0) {
    throw new Error("profile characterName must not be empty when provided");
  }
  if (profile.characterOrigin !== undefined) {
    if (profile.characterOrigin.characterId.trim().length === 0) {
      throw new Error("profile characterOrigin characterId must not be empty");
    }
    if (profile.characterOrigin.name.trim().length === 0) {
      throw new Error("profile characterOrigin name must not be empty");
    }
    assertNonNegativeInteger(profile.characterOrigin.confirmedAtMs, "characterOrigin.confirmedAtMs");
  }
  if (profile.lifeSimulation !== undefined) {
    if (profile.lifeSimulation.status !== "simulating" && profile.lifeSimulation.status !== "completed") {
      throw new Error("profile lifeSimulation status is invalid");
    }
    assertNonNegativeInteger(profile.lifeSimulation.ageYears, "lifeSimulation.ageYears");
  }
  assertNonNegativeFinite(profile.realm.cultivation, "realm.cultivation");
  assertNonNegativeFinite(profile.realm.cultivationToNext, "realm.cultivationToNext");
  assertNonNegativeInteger(profile.idle.lastClaimAtMs, "idle.lastClaimAtMs");
  for (const [pillId, count] of Object.entries(profile.pills)) {
    if (pillId.length === 0) {
      throw new Error("pill id must not be empty");
    }
    assertNonNegativeFinite(count, `pill ${pillId}`);
  }
}

function validateReceipt(receipt: RunSettlementReceipt): void {
  if (receipt.receiptId.length === 0) {
    throw new Error("receiptId must not be empty");
  }
  if (receipt.profileId.length === 0) {
    throw new Error("receipt profileId must not be empty");
  }
  if (receipt.appliedAtMs !== null) {
    throw new Error("outgame can only apply unapplied receipts");
  }
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
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
