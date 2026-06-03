import {
  CharacterDraftGenerator,
  type CharacterDraftGeneratorOptions,
  type GenerateCharacterDraftOptions,
  type RerollCharacterDraftOptions,
  type ToggleCharacterCreationLockOptions
} from "./CharacterDraftGenerator";
import type {
  CharacterCreationDraft
} from "./CharacterCreationTypes";

export type CharacterCreationControllerOptions = CharacterDraftGeneratorOptions;

export class CharacterCreationController {
  private readonly draftGenerator: CharacterDraftGenerator;

  constructor(options: CharacterCreationControllerOptions) {
    this.draftGenerator = new CharacterDraftGenerator(options);
  }

  generate(options: GenerateCharacterDraftOptions): CharacterCreationDraft {
    return this.draftGenerator.generate(options);
  }

  reroll(draft: CharacterCreationDraft, options: RerollCharacterDraftOptions): CharacterCreationDraft {
    return this.draftGenerator.reroll(draft, options);
  }

  toggleLock(draft: CharacterCreationDraft, options: ToggleCharacterCreationLockOptions): CharacterCreationDraft {
    return this.draftGenerator.toggleLock(draft, options);
  }
}
