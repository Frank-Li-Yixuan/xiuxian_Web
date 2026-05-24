import { cloneOutgameProfile, type OutgameProfileState } from "../outgame/ProfileState";

export const SAVE_SLOT_IDS = ["slot_1", "slot_2", "slot_3"] as const;

export type SaveSlotId = (typeof SAVE_SLOT_IDS)[number];
export type SaveSlotMode = "new" | "continue";

export interface SaveSlotSummary {
  readonly slotId: SaveSlotId;
  readonly index: number;
  readonly profile: OutgameProfileState | null;
  readonly occupied: boolean;
}

export interface SaveSlotStorage {
  readonly length: number;
  clear: () => void;
  getItem: (key: string) => string | null;
  key: (index: number) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
}

export interface SaveSlotServiceOptions {
  readonly storage?: SaveSlotStorage;
  readonly nowMs?: () => number;
}

export interface SaveSlotService {
  readonly nowMs: () => number;
  listSlots: () => readonly SaveSlotSummary[];
  readProfile: (slotId: SaveSlotId) => OutgameProfileState | null;
  writeProfile: (slotId: SaveSlotId, profile: OutgameProfileState) => void;
  deleteProfile: (slotId: SaveSlotId) => void;
  hasAnySave: () => boolean;
}

const STORAGE_PREFIX = "xiuxian-stg.save.v0.3";

export function createSaveSlotService(options: SaveSlotServiceOptions = {}): SaveSlotService {
  const storage = options.storage ?? getBrowserLocalStorage();
  const nowMs = options.nowMs ?? (() => Date.now());

  const readProfile = (slotId: SaveSlotId): OutgameProfileState | null => {
    const serialized = storage.getItem(getStorageKey(slotId));
    if (serialized === null) {
      return null;
    }
    return cloneOutgameProfile(JSON.parse(serialized) as OutgameProfileState);
  };

  return {
    nowMs,
    listSlots: () =>
      SAVE_SLOT_IDS.map((slotId, index) => {
        const profile = readProfile(slotId);
        return {
          slotId,
          index,
          profile,
          occupied: profile !== null
        };
      }),
    readProfile,
    writeProfile: (slotId, profile) => {
      storage.setItem(getStorageKey(slotId), JSON.stringify(cloneOutgameProfile(profile)));
    },
    deleteProfile: (slotId) => {
      storage.removeItem(getStorageKey(slotId));
    },
    hasAnySave: () => SAVE_SLOT_IDS.some((slotId) => storage.getItem(getStorageKey(slotId)) !== null)
  };
}

export function getStorageKey(slotId: SaveSlotId): string {
  return `${STORAGE_PREFIX}.${slotId}`;
}

function getBrowserLocalStorage(): SaveSlotStorage {
  if (typeof globalThis.localStorage === "undefined") {
    throw new Error("SaveSlotService requires browser localStorage or an explicit storage adapter");
  }
  return globalThis.localStorage;
}
