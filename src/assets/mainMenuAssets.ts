import { loadAssetRegistry, type AssetRegistry } from "./AssetRegistry";

export const MAIN_MENU_ASSET_MANIFEST_URL = "/assets/generated/ui/main_menu/manifest.v0.3.json";

export const MAIN_MENU_ASSET_IDS = {
  background: "mainMenu.background.qingyun",
  titlePlaque: "mainMenu.titlePlaque",
  buttonNormal: "mainMenu.button.normal",
  buttonHover: "mainMenu.button.hover",
  buttonPressed: "mainMenu.button.pressed",
  buttonSelected: "mainMenu.button.selected",
  buttonDisabled: "mainMenu.button.disabled",
  secondaryButtonNormal: "mainMenu.secondaryButton.normal",
  secondaryButtonHover: "mainMenu.secondaryButton.hover",
  secondaryButtonPressed: "mainMenu.secondaryButton.pressed",
  secondaryButtonDisabled: "mainMenu.secondaryButton.disabled",
  saveSlotNormal: "mainMenu.saveSlot.normal",
  saveSlotHover: "mainMenu.saveSlot.hover",
  saveSlotSelected: "mainMenu.saveSlot.selected",
  saveSlotEmpty: "mainMenu.saveSlot.empty",
  saveSlotDisabled: "mainMenu.saveSlot.disabled",
  dialogFrame: "mainMenu.dialog.frame",
  settingsPanel: "mainMenu.settings.panel",
  closeButtonNormal: "mainMenu.closeButton.normal",
  closeButtonHover: "mainMenu.closeButton.hover",
  backButtonNormal: "mainMenu.backButton.normal",
  backButtonHover: "mainMenu.backButton.hover"
} as const;

export type MainMenuAssetId = (typeof MAIN_MENU_ASSET_IDS)[keyof typeof MAIN_MENU_ASSET_IDS];
export type MainMenuAssetRegistry = AssetRegistry<MainMenuAssetId>;

export function loadMainMenuAssets(): Promise<MainMenuAssetRegistry> {
  return loadAssetRegistry<MainMenuAssetId>(MAIN_MENU_ASSET_MANIFEST_URL);
}
