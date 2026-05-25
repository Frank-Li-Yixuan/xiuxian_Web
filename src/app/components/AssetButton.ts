import type { UiAssetId } from "../../assets/UiAssetRegistry";
import { addClassNames, appendChildren, applyAssetBackground, type DomChild } from "./AssetPanel";

export interface AssetButtonOptions {
  readonly label?: string;
  readonly normalAssetId: UiAssetId;
  readonly hoverAssetId?: UiAssetId;
  readonly pressedAssetId?: UiAssetId;
  readonly disabledAssetId?: UiAssetId;
  readonly className?: string;
  readonly ariaLabel?: string;
  readonly disabled?: boolean;
  readonly children?: readonly DomChild[];
  readonly onClick?: () => void;
}

export type AssetButtonElement = HTMLButtonElement & {
  setDisabled: (disabled: boolean) => void;
};

type AssetButtonVisualState = "normal" | "hover" | "pressed" | "disabled";

export function createAssetButton(options: AssetButtonOptions): AssetButtonElement {
  const button = document.createElement("button") as AssetButtonElement;
  const stateAssetIds: Readonly<Record<AssetButtonVisualState, UiAssetId>> = {
    normal: options.normalAssetId,
    hover: options.hoverAssetId ?? options.normalAssetId,
    pressed: options.pressedAssetId ?? options.hoverAssetId ?? options.normalAssetId,
    disabled: options.disabledAssetId ?? options.normalAssetId
  };
  let disabled = options.disabled ?? false;
  let hovered = false;
  let pressed = false;

  button.type = "button";
  button.classList.add("cc-asset-button");
  addClassNames(button, options.className);
  if (options.ariaLabel !== undefined) {
    button.setAttribute("aria-label", options.ariaLabel);
  }

  if (options.label !== undefined) {
    const label = document.createElement("span");
    label.classList.add("cc-asset-button-label");
    label.textContent = options.label;
    button.appendChild(label);
  }
  appendChildren(button, options.children ?? []);

  const syncVisualState = (): void => {
    button.disabled = disabled;
    button.classList.toggle("is-hover", hovered && !disabled);
    button.classList.toggle("is-pressed", pressed && !disabled);
    button.classList.toggle("is-disabled", disabled);
    button.setAttribute("aria-disabled", disabled ? "true" : "false");
    if (disabled) {
      applyAssetBackground(button, stateAssetIds.disabled);
    } else if (pressed) {
      applyAssetBackground(button, stateAssetIds.pressed);
    } else if (hovered) {
      applyAssetBackground(button, stateAssetIds.hover);
    } else {
      applyAssetBackground(button, stateAssetIds.normal);
    }
  };

  button.setDisabled = (nextDisabled: boolean): void => {
    disabled = nextDisabled;
    if (disabled) {
      pressed = false;
    }
    syncVisualState();
  };

  button.addEventListener("mouseenter", () => {
    hovered = true;
    syncVisualState();
  });
  button.addEventListener("mouseleave", () => {
    hovered = false;
    pressed = false;
    syncVisualState();
  });
  button.addEventListener("pointerdown", () => {
    pressed = true;
    syncVisualState();
  });
  button.addEventListener("pointerup", () => {
    pressed = false;
    syncVisualState();
  });
  button.addEventListener("click", () => {
    if (!disabled) {
      options.onClick?.();
    }
  });

  syncVisualState();
  return button;
}
