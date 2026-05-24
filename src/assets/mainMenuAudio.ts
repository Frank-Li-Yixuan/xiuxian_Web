export const MAIN_MENU_AUDIO_ASSETS = {
  bgmStillnessOnTheSummit: "/assets/audio/Stillness_on_the_Summit.mp3"
} as const;

export type MainMenuAudioAssetId = keyof typeof MAIN_MENU_AUDIO_ASSETS;

export function mainMenuAudioPath(assetId: MainMenuAudioAssetId): string {
  return MAIN_MENU_AUDIO_ASSETS[assetId];
}
