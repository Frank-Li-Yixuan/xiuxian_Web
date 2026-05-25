import type { SpiritualRootState } from "../../types/character-creation-types.v0.1";
import { createAssetPanel, createTextElement } from "./AssetPanel";

export interface SpiritualRootDiscOptions {
  readonly root: SpiritualRootState;
}

export function createSpiritualRootDisc(options: SpiritualRootDiscOptions): HTMLDivElement {
  const disc = createAssetPanel({
    assetId: "cc.spiritualRootDisc",
    className: `cc-spiritual-root-disc rarity-${options.root.rarity}`
  });

  disc.append(
    createTextElement("h3", "cc-spiritual-root-name", options.root.displayName),
    createBadgeList("cc-spiritual-root-elements", options.root.elements, "cc-element-badge"),
    createBadgeList("cc-spiritual-root-tags", options.root.tags, "cc-spiritual-root-tag")
  );

  return disc;
}

function createBadgeList(className: string, values: readonly string[], badgeClassName: string): HTMLElement {
  const list = document.createElement("div");
  list.classList.add(className);
  for (const value of values) {
    const badge = createAssetPanel({
      assetId: "cc.elementBadgeFrame",
      className: badgeClassName,
      children: [value]
    });
    list.appendChild(badge);
  }
  return list;
}
