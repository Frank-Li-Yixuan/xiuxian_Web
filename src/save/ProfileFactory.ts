import defaultProfileData from "../../data/outgame/default_profile.v0.1.json";
import { cloneOutgameProfile, type OutgameProfileState } from "../outgame/ProfileState";
import type { SaveSlotId } from "./SaveSlotService";

export interface CreateDefaultProfileForSlotOptions {
  readonly slotId: SaveSlotId;
  readonly nowMs: number;
  readonly saveName?: string;
}

export interface CompleteLifeSimulationForProfileOptions {
  readonly profile: OutgameProfileState;
  readonly nowMs: number;
  readonly ageYears: number;
  readonly characterName?: string;
}

export const DEFAULT_CHARACTER_NAME = "未定道友";

export function createDefaultProfileForSlot(options: CreateDefaultProfileForSlotOptions): OutgameProfileState {
  const baseProfile = cloneOutgameProfile(defaultProfileData as unknown as OutgameProfileState);
  return cloneOutgameProfile({
    ...baseProfile,
    profileId: `local_${options.slotId}`,
    saveName: normalizeName(options.saveName, getDefaultSaveName(options.slotId)),
    characterName: DEFAULT_CHARACTER_NAME,
    stage: "character_creation",
    lifeSimulation: {
      status: "simulating",
      ageYears: 0
    },
    createdAtMs: options.nowMs,
    updatedAtMs: options.nowMs,
    appliedReceiptIds: [],
    flags: {
      ...baseProfile.flags,
      firstStageCleared: false
    }
  });
}

export function completeLifeSimulationForProfile(options: CompleteLifeSimulationForProfileOptions): OutgameProfileState {
  return cloneOutgameProfile({
    ...cloneOutgameProfile(options.profile),
    characterName: normalizeName(options.characterName, options.profile.characterName ?? DEFAULT_CHARACTER_NAME),
    stage: "dongfu_unlocked",
    lifeSimulation: {
      status: "completed",
      ageYears: options.ageYears
    },
    updatedAtMs: options.nowMs
  });
}

function getDefaultSaveName(slotId: SaveSlotId): string {
  const suffix = slotId.replace("slot_", "");
  return `存档 ${suffix}`;
}

function normalizeName(value: string | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized === undefined || normalized.length === 0 ? fallback : normalized;
}
