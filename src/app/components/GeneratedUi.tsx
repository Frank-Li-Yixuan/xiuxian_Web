import type { CSSProperties, ReactElement, ReactNode } from "react";

import { GENERATED_UI_ASSET_IDS, type GeneratedUiAssetId, type GeneratedUiAssetRegistry } from "../../assets/generatedUiAssets";

interface GeneratedAssetProps {
  readonly assets: GeneratedUiAssetRegistry;
  readonly assetId: GeneratedUiAssetId;
  readonly className?: string;
  readonly children?: ReactNode;
}

interface GeneratedImageButtonProps {
  readonly assets: GeneratedUiAssetRegistry;
  readonly normalAssetId: GeneratedUiAssetId;
  readonly hoverAssetId?: GeneratedUiAssetId;
  readonly pressedAssetId?: GeneratedUiAssetId;
  readonly disabledAssetId?: GeneratedUiAssetId;
  readonly selectedAssetId?: GeneratedUiAssetId;
  readonly className?: string;
  readonly children?: ReactNode;
  readonly disabled?: boolean;
  readonly selected?: boolean;
  readonly ariaLabel?: string;
  readonly onClick?: () => void;
}

export function GeneratedPanel({ assets, assetId, className = "", children }: GeneratedAssetProps): ReactElement {
  return (
    <div className={`generated-ui-panel ${className}`.trim()} style={singleAssetStyle(assets, assetId)}>
      {children}
    </div>
  );
}

export function GeneratedFrame({ assets, assetId, className = "", children }: GeneratedAssetProps): ReactElement {
  return (
    <div className={`generated-ui-frame ${className}`.trim()} style={singleAssetStyle(assets, assetId)}>
      {children}
    </div>
  );
}

export function GeneratedImageButton({
  assets,
  normalAssetId,
  hoverAssetId,
  pressedAssetId,
  disabledAssetId,
  selectedAssetId,
  className = "",
  children,
  disabled = false,
  selected = false,
  ariaLabel,
  onClick
}: GeneratedImageButtonProps): ReactElement {
  return (
    <button
      aria-label={ariaLabel}
      className={`generated-ui-button ${selected ? "is-selected" : ""} ${className}`.trim()}
      disabled={disabled}
      style={stateAssetStyle({ assets, normalAssetId, hoverAssetId, pressedAssetId, disabledAssetId, selectedAssetId })}
      type="button"
      onClick={onClick}
    >
      {children === undefined ? null : <span>{children}</span>}
    </button>
  );
}

export function GeneratedCloseButton({
  assets,
  disabled = false,
  onClick
}: {
  readonly assets: GeneratedUiAssetRegistry;
  readonly disabled?: boolean;
  readonly onClick: () => void;
}): ReactElement {
  return (
    <GeneratedImageButton
      ariaLabel="关闭"
      assets={assets}
      className="generated-close-button"
      disabled={disabled}
      disabledAssetId={GENERATED_UI_ASSET_IDS.closeButtonDisabled}
      hoverAssetId={GENERATED_UI_ASSET_IDS.closeButtonHover}
      normalAssetId={GENERATED_UI_ASSET_IDS.closeButtonNormal}
      pressedAssetId={GENERATED_UI_ASSET_IDS.closeButtonPressed}
      onClick={onClick}
    />
  );
}

function singleAssetStyle(assets: GeneratedUiAssetRegistry, assetId: GeneratedUiAssetId): CSSProperties {
  return {
    "--generated-image": `url("${assets.path(assetId)}")`
  } as CSSProperties;
}

function stateAssetStyle({
  assets,
  normalAssetId,
  hoverAssetId,
  pressedAssetId,
  disabledAssetId,
  selectedAssetId
}: {
  readonly assets: GeneratedUiAssetRegistry;
  readonly normalAssetId: GeneratedUiAssetId;
  readonly hoverAssetId: GeneratedUiAssetId | undefined;
  readonly pressedAssetId: GeneratedUiAssetId | undefined;
  readonly disabledAssetId: GeneratedUiAssetId | undefined;
  readonly selectedAssetId: GeneratedUiAssetId | undefined;
}): CSSProperties {
  return {
    "--generated-normal": `url("${assets.path(normalAssetId)}")`,
    "--generated-hover": `url("${assets.path(hoverAssetId ?? normalAssetId)}")`,
    "--generated-pressed": `url("${assets.path(pressedAssetId ?? hoverAssetId ?? normalAssetId)}")`,
    "--generated-disabled": `url("${assets.path(disabledAssetId ?? normalAssetId)}")`,
    "--generated-selected": `url("${assets.path(selectedAssetId ?? hoverAssetId ?? normalAssetId)}")`
  } as CSSProperties;
}
