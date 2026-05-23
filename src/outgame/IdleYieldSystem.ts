import { addResources, type ResourceMap } from "./ResourceWallet";
import { cloneOutgameProfile, type OutgameProfileState } from "./ProfileState";

export interface IdleYieldConfig {
  readonly schemaVersion: string;
  readonly rules: {
    readonly requiresInjectedNowMs: boolean;
    readonly doesNotUseInsightExp: boolean;
    readonly defaultOfflineCapMinutes: number;
    readonly idleEventsMaxPerClaim: number;
  };
  readonly formationYieldByLevel: Readonly<Record<string, FormationYieldDefinition>>;
  readonly idleEvents: readonly IdleEventDefinition[];
}

export interface FormationYieldDefinition {
  readonly cultivationPerMinute: number;
  readonly spiritStonePerMinute: number;
  readonly offlineCapMinutes: number;
}

export interface IdleEventDefinition {
  readonly id: string;
  readonly name: string;
  readonly weight: number;
  readonly minClaimMinutes: number;
  readonly rewards: ResourceMap;
}

export interface IdleClaimResult {
  readonly elapsedMinutes: number;
  readonly cappedMinutes: number;
  readonly rewards: ResourceMap;
  readonly cultivationGain: number;
  readonly eventIds: readonly string[];
  readonly newLastClaimAtMs: number;
}

export interface ClaimIdleYieldOptions {
  readonly profile: OutgameProfileState;
  readonly idleYield: IdleYieldConfig;
  readonly nowMs: number;
  readonly eventRoll?: number;
}

export interface ClaimIdleYieldResult {
  readonly profile: OutgameProfileState;
  readonly claim: IdleClaimResult;
}

const MS_PER_MINUTE = 60_000;

export function claimIdleYield(options: ClaimIdleYieldOptions): ClaimIdleYieldResult {
  if (!Number.isInteger(options.nowMs) || options.nowMs < 0) {
    throw new Error("nowMs must be a non-negative integer");
  }
  if (options.nowMs < options.profile.idle.lastClaimAtMs) {
    throw new Error("nowMs must not be before lastClaimAtMs");
  }
  const formation = getFormationYield(options.profile, options.idleYield);
  const elapsedMinutes = Math.floor((options.nowMs - options.profile.idle.lastClaimAtMs) / MS_PER_MINUTE);
  const cappedMinutes = Math.min(elapsedMinutes, formation.offlineCapMinutes);
  const baseRewards: ResourceMap = {
    spirit_stone_low: round3(cappedMinutes * formation.spiritStonePerMinute)
  };
  const cultivationGain = round3(cappedMinutes * formation.cultivationPerMinute);
  const event = chooseIdleEvent(options.idleYield, cappedMinutes, options.eventRoll);
  const eventRewards = event?.rewards ?? {};
  const rewards = addResources(baseRewards, filterNonCultivationRewards(eventRewards));
  const eventCultivation = resourceAmount(eventRewards, "cultivation");
  const totalCultivationGain = round3(cultivationGain + eventCultivation);

  const nextProfile = cloneOutgameProfile({
    ...options.profile,
    wallet: addResources(options.profile.wallet, rewards),
    realm: {
      ...options.profile.realm,
      cultivation: round3(options.profile.realm.cultivation + totalCultivationGain)
    },
    idle: {
      lastClaimAtMs: options.nowMs,
      pendingEventIds: event === undefined ? [] : [event.id]
    }
  });

  return deepFreeze({
    profile: nextProfile,
    claim: {
      elapsedMinutes,
      cappedMinutes,
      rewards,
      cultivationGain: totalCultivationGain,
      eventIds: event === undefined ? [] : [event.id],
      newLastClaimAtMs: options.nowMs
    }
  });
}

function getFormationYield(profile: OutgameProfileState, idleYield: IdleYieldConfig): FormationYieldDefinition {
  const level = profile.buildings.building_spirit_gathering_array?.level ?? 1;
  const formation = idleYield.formationYieldByLevel[String(level)];
  if (formation === undefined) {
    throw new Error(`Missing idle yield definition for spirit gathering array level ${level}`);
  }
  return formation;
}

function chooseIdleEvent(idleYield: IdleYieldConfig, cappedMinutes: number, eventRoll: number | undefined): IdleEventDefinition | undefined {
  if (eventRoll === undefined || idleYield.rules.idleEventsMaxPerClaim <= 0) {
    return undefined;
  }
  if (!Number.isFinite(eventRoll) || eventRoll < 0 || eventRoll >= 1) {
    return undefined;
  }
  const candidates = idleYield.idleEvents
    .filter((event) => event.minClaimMinutes <= cappedMinutes)
    .filter((event) => event.weight > 0)
    .sort((a, b) => a.id.localeCompare(b.id));
  const totalWeight = candidates.reduce((sum, event) => sum + event.weight, 0);
  if (totalWeight <= 0 || eventRoll >= totalWeight / 100) {
    return undefined;
  }
  let threshold = eventRoll * 100;
  for (const event of candidates) {
    threshold -= event.weight;
    if (threshold < 0) {
      return event;
    }
  }
  return undefined;
}

function filterNonCultivationRewards(resources: ResourceMap): ResourceMap {
  const filtered: Record<string, number> = {};
  for (const [resourceId, amount] of Object.entries(resources)) {
    if (resourceId !== "cultivation") {
      filtered[resourceId] = amount;
    }
  }
  return Object.freeze(filtered);
}

function resourceAmount(resources: ResourceMap, resourceId: string): number {
  return resources[resourceId] ?? 0;
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
