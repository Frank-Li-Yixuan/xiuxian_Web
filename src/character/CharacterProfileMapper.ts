import { cloneOutgameProfile, type OutgameProfileState } from "../outgame/ProfileState";
import type { CharacterCreationDraft, CharacterOriginState } from "./CharacterCreationTypes";

export interface ApplyCharacterDraftToProfileOptions {
  readonly profile: OutgameProfileState;
  readonly draft: CharacterCreationDraft;
  readonly nowMs: number;
  readonly ageYears: number;
}

export function applyCharacterDraftToProfile(options: ApplyCharacterDraftToProfileOptions): OutgameProfileState {
  const characterOrigin = mapCharacterDraftToOrigin(options.draft, options.nowMs);
  return cloneOutgameProfile({
    ...cloneOutgameProfile(options.profile),
    characterName: characterOrigin.name,
    characterOrigin,
    lifeSimulation: {
      status: "completed",
      ageYears: options.ageYears
    },
    updatedAtMs: options.nowMs
  });
}

export function mapCharacterDraftToOrigin(draft: CharacterCreationDraft, confirmedAtMs: number): CharacterOriginState {
  const name = draft.name.trim();
  if (name.length === 0) {
    throw new Error("character draft name must not be empty");
  }
  return {
    characterId: draft.draftId,
    name,
    appearance: draft.appearance,
    coreStats: draft.coreStats,
    aptitude: draft.aptitude,
    spiritualRoot: draft.spiritualRoot,
    destinies: draft.destinies,
    background: draft.background,
    hiddenFate: draft.hiddenFate,
    carriedItems: draft.carriedItems,
    confirmedAtMs
  };
}
