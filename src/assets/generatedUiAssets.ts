import { loadAssetRegistry, type AssetRegistry } from "./AssetRegistry";

export const GENERATED_UI_ASSET_MANIFEST_URL = "/assets/generated/ui/manifest.v0.4.json";

export const GENERATED_UI_ASSET_IDS = {
  closeButtonNormal: "ui.common.closeButton.normal",
  closeButtonHover: "ui.common.closeButton.hover",
  closeButtonPressed: "ui.common.closeButton.pressed",
  closeButtonDisabled: "ui.common.closeButton.disabled",

  savePanelFrame: "ui.save.panel.frame",
  savePanelInnerBackground: "ui.save.panel.innerBackground",
  saveSlotEmpty: "ui.save.slot.empty",
  saveSlotExistingNormal: "ui.save.slot.existing.normal",
  saveSlotExistingHover: "ui.save.slot.existing.hover",
  saveSlotExistingSelected: "ui.save.slot.existing.selected",
  saveSlotDisabled: "ui.save.slot.disabled",
  saveOverwriteConfirmDialog: "ui.save.dialog.overwriteConfirm",
  saveAvatarFrame: "ui.save.avatarFrame",
  saveCreateButtonNormal: "ui.save.createButton.normal",
  saveCreateButtonHover: "ui.save.createButton.hover",
  saveLoadButtonNormal: "ui.save.loadButton.normal",
  saveDangerButtonNormal: "ui.save.dangerButton.normal",

  characterCreationMainPanel: "ui.characterCreation.mainPanel",
  characterPortraitFrame: "ui.characterCreation.portraitFrame",
  nameInputField: "ui.characterCreation.nameInput",
  characterAttributePanel: "ui.characterCreation.attributePanel",
  attributeRow: "ui.characterCreation.attributeRow",
  spiritualRootDisc: "ui.characterCreation.spiritualRootDisc",
  elementBadgeFrame: "ui.characterCreation.elementBadgeFrame",
  destinyCardCommon: "ui.characterCreation.destinyCard.common",
  destinyCardRare: "ui.characterCreation.destinyCard.rare",
  destinyCardEpic: "ui.characterCreation.destinyCard.epic",
  destinyCardLegendary: "ui.characterCreation.destinyCard.legendary",
  destinyCardFlaw: "ui.characterCreation.destinyCard.flaw",
  traitLockButtonLocked: "ui.characterCreation.traitLockButton.locked",
  traitLockButtonUnlocked: "ui.characterCreation.traitLockButton.unlocked",
  rerollFateButtonNormal: "ui.characterCreation.rerollFateButton.normal",
  rerollFateButtonHover: "ui.characterCreation.rerollFateButton.hover",
  confirmLifeButtonNormal: "ui.characterCreation.confirmLifeButton.normal",
  backgroundOriginPanel: "ui.characterCreation.backgroundOriginPanel",
  hiddenBloodlinePanel: "ui.characterCreation.hiddenBloodlinePanel",
  divinationTokenBadge: "ui.characterCreation.divinationTokenBadge",

  lifeTimelineVertical: "ui.lifeSimulation.timeline.vertical",
  lifeEventLogPanel: "ui.lifeSimulation.eventLogPanel",
  lifeChoiceEventCard: "ui.lifeSimulation.choiceEventCard",
  lifeChoiceButtonNormal: "ui.lifeSimulation.choiceButton.normal",
  lifeChoiceButtonHover: "ui.lifeSimulation.choiceButton.hover"
} as const;

export type GeneratedUiAssetId = (typeof GENERATED_UI_ASSET_IDS)[keyof typeof GENERATED_UI_ASSET_IDS];
export type GeneratedUiAssetRegistry = AssetRegistry<GeneratedUiAssetId>;

export function loadGeneratedUiAssets(): Promise<GeneratedUiAssetRegistry> {
  return loadAssetRegistry<GeneratedUiAssetId>(GENERATED_UI_ASSET_MANIFEST_URL);
}
