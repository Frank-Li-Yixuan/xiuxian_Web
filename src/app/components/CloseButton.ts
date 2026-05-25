import { createAssetButton, type AssetButtonElement, type AssetButtonOptions } from "./AssetButton";

export interface CloseButtonOptions {
  readonly disabled?: boolean;
  readonly onClick: () => void;
}

export function createCloseButton(options: CloseButtonOptions): AssetButtonElement {
  const buttonOptions: AssetButtonOptions = {
    ariaLabel: "关闭",
    className: "cc-close-button",
    normalAssetId: "common.close.normal",
    hoverAssetId: "common.close.hover",
    pressedAssetId: "common.close.pressed",
    disabledAssetId: "common.close.disabled",
    onClick: options.onClick
  };
  if (options.disabled !== undefined) {
    return createAssetButton({ ...buttonOptions, disabled: options.disabled });
  }
  return createAssetButton(buttonOptions);
}
