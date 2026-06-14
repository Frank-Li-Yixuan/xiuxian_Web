import { cloneOutgameProfile, type OutgameProfileState } from "../outgame/ProfileState";
import { createInitialLifeSimulationState } from "../lifeSimulation/LifeSimulationInitializer";
import { buildCharacterOriginV02ProfileShape } from "./CharacterCreationV02Adapter";
import type { CharacterCreationDraft, CharacterOriginState } from "./CharacterCreationTypes";

export interface ApplyCharacterDraftToProfileOptions {
  readonly profile: OutgameProfileState;
  readonly draft: CharacterCreationDraft;
  readonly nowMs: number;
  readonly ageYears?: number;
}

export function applyCharacterDraftToProfile(options: ApplyCharacterDraftToProfileOptions): OutgameProfileState {
  const characterOrigin = mapCharacterDraftToOrigin(options.draft, options.nowMs);
  const profile = cloneOutgameProfile(options.profile);
  const lifeSimulationState = createInitialLifeSimulationState(
    profile,
    characterOrigin,
    `${profile.profileId}:${characterOrigin.characterId}:life_simulation`
  );
  return cloneOutgameProfile({
    ...profile,
    characterName: characterOrigin.name,
    characterOrigin,
    stage: "life_simulation",
    lifeSimulation: {
      status: "simulating",
      ageYears: 0
    },
    lifeSimulationState,
    updatedAtMs: options.nowMs
  });
}

export function mapCharacterDraftToOrigin(draft: CharacterCreationDraft, confirmedAtMs: number): CharacterOriginState {
  const name = draft.name.trim();
  if (name.length === 0) {
    throw new Error("character draft name must not be empty");
  }
  const v02ProfileShape = buildCharacterOriginV02ProfileShape(draft);
  return {
    characterId: draft.draftId,
    name,
    appearance: draft.appearance,
    coreStats: draft.coreStats,
    aptitude: draft.aptitude,
    spiritualRoot: draft.spiritualRoot,
    openingInnateDraft: draft.openingInnateDraft,
    destinies: draft.destinies,
    originFate: draft.originFate,
    ...(draft.originFateNarrativeState === undefined ? {} : { originFateNarrativeState: draft.originFateNarrativeState }),
    background: draft.background,
    hiddenFate: draft.hiddenFate,
    carriedItems: draft.carriedItems,
    destinyEvaluationResults: v02ProfileShape.destinyEvaluationResults,
    carriedItemLifecycleSummary: v02ProfileShape.carriedItemLifecycleSummary,
    lifeStorylineInitialScores: v02ProfileShape.lifeStorylineInitialScores,
    attributeLock: draft.attributeLock,
    spiritualRootLock: draft.spiritualRootLock,
    confirmedAtMs
  };
}
