import defaultProfileData from "../../data/outgame/default_profile.v0.1.json";
import { cloneOutgameProfile, type OutgameProfileState } from "../outgame/ProfileState";
import type { SaveSlotId } from "./SaveSlotService";

export interface CreateDefaultProfileForSlotOptions {
  readonly slotId: SaveSlotId;
  readonly nowMs: number;
}

export function createDefaultProfileForSlot(options: CreateDefaultProfileForSlotOptions): OutgameProfileState {
  const baseProfile = cloneOutgameProfile(defaultProfileData as unknown as OutgameProfileState);
  return cloneOutgameProfile({
    ...baseProfile,
    profileId: `local_${options.slotId}`,
    createdAtMs: options.nowMs,
    updatedAtMs: options.nowMs,
    appliedReceiptIds: [],
    flags: {
      ...baseProfile.flags,
      firstStageCleared: false
    }
  });
}
