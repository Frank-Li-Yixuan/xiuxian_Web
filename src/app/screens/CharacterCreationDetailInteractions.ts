import type {
  CharacterCreationDestinyCardSlot,
  CharacterCreationSelectionState
} from "./CharacterCreationViewModel";

export type CharacterCreationDetailTarget =
  | { readonly type: "stats" }
  | { readonly type: "root" }
  | { readonly type: "origin" }
  | { readonly type: "items" }
  | {
      readonly type: "destiny";
      readonly slot: CharacterCreationDestinyCardSlot;
    };

export function getCharacterCreationSelectionForDetailTarget(
  current: CharacterCreationSelectionState,
  target: CharacterCreationDetailTarget
): CharacterCreationSelectionState {
  if (target.type === "destiny") {
    return {
      activeTab: "destiny",
      selectedSlot: target.slot
    };
  }

  return {
    activeTab: target.type,
    selectedSlot: current.selectedSlot
  };
}
