import type { CSSProperties, ReactElement, ReactNode } from "react";

import { MAIN_MENU_ASSET_IDS, type MainMenuAssetRegistry } from "../../assets/mainMenuAssets";

interface ImageButtonProps {
  readonly assets: MainMenuAssetRegistry;
  readonly className?: string;
  readonly variant?: "main" | "secondary" | "back";
  readonly children: ReactNode;
  readonly disabled?: boolean;
  readonly selected?: boolean;
  readonly onClick?: () => void;
}

export function ImageButton({
  assets,
  className = "",
  variant = "main",
  children,
  disabled = false,
  selected = false,
  onClick
}: ImageButtonProps): ReactElement {
  return (
    <button
      className={`asset-button asset-button-${variant} ${selected ? "is-selected" : ""} ${className}`.trim()}
      disabled={disabled}
      style={buttonStyle(assets, variant)}
      type="button"
      onClick={onClick}
    >
      <span>{children}</span>
    </button>
  );
}

export function CloseButton({
  assets,
  label = "关闭",
  onClick
}: {
  readonly assets: MainMenuAssetRegistry;
  readonly label?: string;
  readonly onClick: () => void;
}): ReactElement {
  return (
    <button
      aria-label={label}
      className="asset-close-button"
      style={
        {
          "--close-normal": `url("${assets.path(MAIN_MENU_ASSET_IDS.closeButtonNormal)}")`,
          "--close-hover": `url("${assets.path(MAIN_MENU_ASSET_IDS.closeButtonHover)}")`
        } as CSSProperties
      }
      type="button"
      onClick={onClick}
    />
  );
}

function buttonStyle(assets: MainMenuAssetRegistry, variant: "main" | "secondary" | "back"): CSSProperties {
  if (variant === "main") {
    return {
      "--button-normal": `url("${assets.path(MAIN_MENU_ASSET_IDS.buttonNormal)}")`,
      "--button-hover": `url("${assets.path(MAIN_MENU_ASSET_IDS.buttonHover)}")`,
      "--button-pressed": `url("${assets.path(MAIN_MENU_ASSET_IDS.buttonPressed)}")`,
      "--button-selected": `url("${assets.path(MAIN_MENU_ASSET_IDS.buttonSelected)}")`,
      "--button-disabled": `url("${assets.path(MAIN_MENU_ASSET_IDS.buttonDisabled)}")`
    } as CSSProperties;
  }
  if (variant === "back") {
    return {
      "--button-normal": `url("${assets.path(MAIN_MENU_ASSET_IDS.backButtonNormal)}")`,
      "--button-hover": `url("${assets.path(MAIN_MENU_ASSET_IDS.backButtonHover)}")`,
      "--button-pressed": `url("${assets.path(MAIN_MENU_ASSET_IDS.secondaryButtonPressed)}")`,
      "--button-selected": `url("${assets.path(MAIN_MENU_ASSET_IDS.secondaryButtonHover)}")`,
      "--button-disabled": `url("${assets.path(MAIN_MENU_ASSET_IDS.secondaryButtonDisabled)}")`
    } as CSSProperties;
  }
  return {
    "--button-normal": `url("${assets.path(MAIN_MENU_ASSET_IDS.secondaryButtonNormal)}")`,
    "--button-hover": `url("${assets.path(MAIN_MENU_ASSET_IDS.secondaryButtonHover)}")`,
    "--button-pressed": `url("${assets.path(MAIN_MENU_ASSET_IDS.secondaryButtonPressed)}")`,
    "--button-selected": `url("${assets.path(MAIN_MENU_ASSET_IDS.secondaryButtonHover)}")`,
    "--button-disabled": `url("${assets.path(MAIN_MENU_ASSET_IDS.secondaryButtonDisabled)}")`
  } as CSSProperties;
}
