import { createAssetPanel } from "./AssetPanel";

export interface CharacterPortraitFrameOptions {
  readonly showSilhouette?: boolean;
  readonly children?: readonly HTMLElement[];
}

export function createCharacterPortraitFrame(options: CharacterPortraitFrameOptions = {}): HTMLDivElement {
  const frame = createAssetPanel({
    assetId: "cc.portraitFrame",
    className: "cc-character-portrait-frame"
  });

  if (options.showSilhouette === true) {
    const silhouette = document.createElement("div");
    silhouette.classList.add("cc-portrait-silhouette", "is-seated");
    frame.appendChild(silhouette);
  }

  for (const child of options.children ?? []) {
    frame.appendChild(child);
  }

  return frame;
}
