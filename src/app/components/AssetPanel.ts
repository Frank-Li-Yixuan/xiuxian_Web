import { getUiAsset, type UiAssetId } from "../../assets/UiAssetRegistry";

export type DomChild = HTMLElement | Text | string;

export interface AssetPanelOptions {
  readonly assetId: UiAssetId;
  readonly className?: string;
  readonly children?: readonly DomChild[];
}

export function createAssetPanel(options: AssetPanelOptions): HTMLDivElement {
  const panel = document.createElement("div");
  panel.classList.add("cc-asset-panel");
  addClassNames(panel, options.className);
  applyAssetBackground(panel, options.assetId);
  appendChildren(panel, options.children ?? []);
  return panel;
}

export function applyAssetBackground(element: HTMLElement, assetId: UiAssetId): void {
  const asset = getUiAsset(assetId);
  element.style.backgroundColor = "transparent";
  element.style.backgroundImage = `url("${asset.path}")`;
  element.style.backgroundPosition = "center";
  element.style.backgroundRepeat = "no-repeat";
  element.style.backgroundSize = "contain";
}

export function appendChildren(parent: HTMLElement, children: readonly DomChild[]): void {
  for (const child of children) {
    if (typeof child === "string") {
      parent.appendChild(document.createTextNode(child));
    } else {
      parent.appendChild(child);
    }
  }
}

export function addClassNames(element: HTMLElement, classNames: string | undefined): void {
  for (const className of classNames?.split(/\s+/) ?? []) {
    if (className.length > 0) {
      element.classList.add(className);
    }
  }
}

export function createTextElement(tagName: string, className: string, text: string): HTMLElement {
  const element = document.createElement(tagName);
  element.classList.add(className);
  element.textContent = text;
  return element;
}
