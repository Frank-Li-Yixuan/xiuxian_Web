import type { CharacterOriginState } from "../character/CharacterCreationTypes";
import type { OutgameProfileState } from "../outgame/ProfileState";
import { SeededRng, type RngSeed } from "../sim/core/SeededRng";
import type { LifeSimulationState } from "../types/life-monthly-events-types.v0.1";

export function createInitialLifeSimulationState(
  profile: OutgameProfileState,
  characterOrigin: CharacterOriginState,
  seed: RngSeed
): LifeSimulationState {
  const rng = new SeededRng(seed, "life_simulation");

  return deepFreeze({
    profileId: profile.profileId,
    characterId: characterOrigin.characterId,
    seed: String(seed),
    rngState: rng.getState(),
    ageMonths: 0,
    phaseId: "infancy",
    core: characterOrigin.coreStats,
    aptitude: characterOrigin.aptitude,
    lifeSkills: {
      study: 0,
      martial: 0,
      alchemy: 0,
      craft: 0,
      social: 0,
      stealth: 0,
      ritual: 0,
      survival: 0
    },
    karma: 0,
    merit: 0,
    heartDemon: 0,
    wounds: [],
    heartKnots: [],
    family: {
      kinship: 50,
      familyStrain: 0,
      familyWealth: 0,
      flags: {}
    },
    relationships: [],
    hiddenFateProgress: {
      [characterOrigin.originFate.hiddenFateInternal.hiddenFateId]: characterOrigin.originFate.hiddenFateInternal.progress
    },
    carriedItemAffinity: Object.fromEntries(characterOrigin.originFate.carriedItems.map((item) => [item.itemId, 0])),
    flags: {},
    monthlyLogs: []
  });
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
