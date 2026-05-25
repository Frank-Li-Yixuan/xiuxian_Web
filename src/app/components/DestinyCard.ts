import type { CharacterCreationRarity, DestinyTraitState } from "../../types/character-creation-types.v0.1";
import type { UiAssetId } from "../../assets/UiAssetRegistry";
import { createAssetButton } from "./AssetButton";
import { createAssetPanel, createTextElement } from "./AssetPanel";

export interface DestinyCardOptions {
  readonly trait: DestinyTraitState;
  readonly slotLabel: string;
  readonly locked: boolean;
  readonly onToggleLock: () => void;
}

const DESTINY_ASSET_BY_RARITY: Readonly<Record<CharacterCreationRarity, UiAssetId>> = {
  common: "cc.destiny.common",
  uncommon: "cc.destiny.common",
  rare: "cc.destiny.rare",
  epic: "cc.destiny.epic",
  legendary: "cc.destiny.legendary",
  flaw: "cc.destiny.flaw"
};

const RARITY_LABEL_BY_RARITY: Readonly<Record<CharacterCreationRarity, string>> = {
  common: "普通",
  uncommon: "优秀",
  rare: "稀有",
  epic: "史诗",
  legendary: "传说",
  flaw: "劫命"
};

export function createDestinyCard(options: DestinyCardOptions): HTMLDivElement {
  const card = createAssetPanel({
    assetId: DESTINY_ASSET_BY_RARITY[options.trait.rarity],
    className: `cc-destiny-card rarity-${options.trait.rarity}`
  });

  const header = document.createElement("div");
  header.classList.add("cc-destiny-card-header");
  header.append(
    createTextElement("span", "cc-destiny-slot", options.slotLabel),
    createTextElement("span", "cc-destiny-rarity", RARITY_LABEL_BY_RARITY[options.trait.rarity])
  );

  const title = createTextElement("h3", "cc-destiny-title", options.trait.name);
  const tags = document.createElement("div");
  tags.classList.add("cc-destiny-tags");
  for (const tag of options.trait.tags) {
    tags.appendChild(createTextElement("span", "cc-destiny-tag", tag));
  }

  const positiveList = createEffectList("cc-destiny-positive-effects", "正面", options.trait.positiveEffects);
  const negativeList = createEffectList("cc-destiny-negative-effects", "代价", options.trait.negativeEffects);
  const lockButton = createAssetButton({
    ariaLabel: options.locked ? "解除锁定命格" : "锁定命格",
    className: "cc-trait-lock-button",
    normalAssetId: options.locked ? "cc.traitLock.locked" : "cc.traitLock.unlocked",
    hoverAssetId: options.locked ? "cc.traitLock.locked" : "cc.traitLock.unlocked",
    onClick: options.onToggleLock
  });

  card.append(header, title, tags, positiveList, negativeList, lockButton);
  return card;
}

function createEffectList(className: string, label: string, effects: readonly string[]): HTMLElement {
  const section = document.createElement("section");
  section.classList.add(className);
  section.appendChild(createTextElement("strong", "cc-destiny-effect-heading", label));

  const list = document.createElement("ul");
  for (const effect of effects) {
    const item = document.createElement("li");
    item.textContent = effect;
    list.appendChild(item);
  }
  section.appendChild(list);
  return section;
}
