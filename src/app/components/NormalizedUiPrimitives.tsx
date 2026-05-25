import {
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode
} from "react";

import {
  type NormalizedUiAssetEntry,
  type NormalizedUiAssetRegistry,
  type NormalizedUiAssetState,
  type NormalizedUiRect,
  type NormalizedUiSize
} from "../../assets/normalizedUiAssets";

export type UiAssetScaleMode = "fixed" | "contain" | "cover";
export type AssetCardRarity = "common" | "rare" | "epic" | "legendary" | "flaw";

export interface UiAssetImageProps {
  readonly registry: NormalizedUiAssetRegistry;
  readonly assetId: string;
  readonly scaleMode?: UiAssetScaleMode;
  readonly width?: number;
  readonly height?: number;
  readonly debug?: boolean;
  readonly className?: string;
}

export interface NineSlicePanelProps {
  readonly registry: NormalizedUiAssetRegistry;
  readonly assetId: string;
  readonly width?: number;
  readonly height?: number;
  readonly debug?: boolean;
  readonly className?: string;
  readonly children?: ReactNode;
}

export interface AssetButtonProps {
  readonly registry: NormalizedUiAssetRegistry;
  readonly stateGroupId: string;
  readonly selected?: boolean;
  readonly disabled?: boolean;
  readonly debug?: boolean;
  readonly className?: string;
  readonly children?: ReactNode;
  readonly onClick?: () => void;
}

export interface AssetCardProps {
  readonly registry: NormalizedUiAssetRegistry;
  readonly assetId?: string;
  readonly rarity?: AssetCardRarity;
  readonly title?: ReactNode;
  readonly icon?: ReactNode;
  readonly description?: ReactNode;
  readonly debug?: boolean;
  readonly className?: string;
}

const DESTINY_CARD_BY_RARITY: Readonly<Record<AssetCardRarity, string>> = {
  common: "ui.characterCreation.destinyCard.common",
  rare: "ui.characterCreation.destinyCard.rare",
  epic: "ui.characterCreation.destinyCard.epic",
  legendary: "ui.characterCreation.destinyCard.legendary",
  flaw: "ui.characterCreation.destinyCard.flaw"
};

export function UiAssetImage({
  registry,
  assetId,
  scaleMode = "fixed",
  width,
  height,
  debug = false,
  className = ""
}: UiAssetImageProps): ReactElement {
  const asset = registry.getAsset(assetId);
  const size = resolveDisplaySize(asset, width, height);
  return (
    <span
      className={`normalized-ui-asset normalized-ui-image normalized-ui-scale-${scaleMode} ${className}`.trim()}
      data-asset-id={asset.id}
      style={boxStyle(size)}
    >
      <img alt="" src={asset.path} style={imageStyle(size, scaleMode)} />
      {debug ? <UiAssetDebugOverlay asset={asset} displaySize={size} /> : null}
    </span>
  );
}

export function NineSlicePanel({
  registry,
  assetId,
  width,
  height,
  debug = false,
  className = "",
  children
}: NineSlicePanelProps): ReactElement {
  const asset = registry.getAsset(assetId);
  if (asset.nineSlice === undefined) {
    throw new Error(`Normalized UI asset does not define nineSlice: ${assetId}`);
  }
  const size = resolveDisplaySize(asset, width, height);
  return (
    <section
      className={`normalized-ui-asset normalized-ui-nine-slice-panel ${className}`.trim()}
      data-asset-id={asset.id}
      style={boxStyle(size)}
    >
      {createNineSliceParts(asset, size).map((part) => (
        <span className={`normalized-ui-nine-slice-part normalized-ui-nine-slice-${part.name}`} key={part.name} style={part.style} />
      ))}
      <div className="normalized-ui-content-layer" style={contentLayerStyle(asset, size)}>
        {children}
      </div>
      {debug ? <UiAssetDebugOverlay asset={asset} displaySize={size} /> : null}
    </section>
  );
}

export function AssetButton({
  registry,
  stateGroupId,
  selected = false,
  disabled = false,
  debug = false,
  className = "",
  children,
  onClick
}: AssetButtonProps): ReactElement {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const normalAsset = registry.getStateAsset(stateGroupId, "normal");
  const hoverAsset = registry.getStateAsset(stateGroupId, "hover");
  const pressedAsset = registry.getStateAsset(stateGroupId, "pressed");
  const selectedAsset = registry.getStateAsset(stateGroupId, "selected");
  const disabledAsset = registry.getStateAsset(stateGroupId, "disabled");
  const visualState = getButtonVisualState({ disabled, hovered, pressed, selected });
  const activeAsset =
    visualState === "disabled"
      ? disabledAsset
      : visualState === "pressed"
        ? pressedAsset
        : visualState === "selected"
          ? selectedAsset
          : visualState === "hover"
            ? hoverAsset
            : normalAsset;
  const size = normalAsset.recommendedDisplaySize;

  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (disabled || !isKeyboardActivationKey(event.key)) {
      return;
    }
    event.preventDefault();
    setPressed(true);
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (disabled || !isKeyboardActivationKey(event.key)) {
      return;
    }
    event.preventDefault();
    setPressed(false);
    onClick?.();
  };

  return (
    <button
      aria-disabled={disabled ? "true" : "false"}
      className={`normalized-ui-asset normalized-ui-button is-${visualState} ${className}`.trim()}
      data-asset-id={activeAsset.id}
      data-state-group={stateGroupId}
      disabled={disabled}
      style={buttonStyle(size, { normalAsset, hoverAsset, pressedAsset, selectedAsset, disabledAsset, activeAsset })}
      type="button"
      onBlur={() => setPressed(false)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onMouseDown={() => setPressed(true)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseUp={() => setPressed(false)}
    >
      <span className="normalized-ui-button-label">{children}</span>
      {debug ? <UiAssetDebugOverlay asset={activeAsset} displaySize={size} /> : null}
    </button>
  );
}

export function AssetCard({
  registry,
  assetId,
  rarity = "common",
  title,
  icon,
  description,
  debug = false,
  className = ""
}: AssetCardProps): ReactElement {
  const resolvedAssetId = assetId ?? DESTINY_CARD_BY_RARITY[rarity];
  return (
    <NineSlicePanel
      assetId={resolvedAssetId}
      className={`normalized-ui-card normalized-ui-card-${rarity} ${className}`.trim()}
      debug={debug}
      registry={registry}
    >
      <div className="normalized-ui-card-layout">
        {icon === undefined ? null : <div className="normalized-ui-card-icon">{icon}</div>}
        {title === undefined ? null : <h3 className="normalized-ui-card-title">{title}</h3>}
        {description === undefined ? null : <p className="normalized-ui-card-description">{description}</p>}
      </div>
    </NineSlicePanel>
  );
}

export function UiAssetDebugOverlay({
  asset,
  displaySize
}: {
  readonly asset: NormalizedUiAssetEntry;
  readonly displaySize: NormalizedUiSize;
}): ReactElement {
  return (
    <>
      <span
        aria-hidden="true"
        className="normalized-ui-debug-visual-bounds"
        style={rectOverlayStyle(asset.visualBounds, asset.imageSize, displaySize)}
      />
      <span
        aria-hidden="true"
        className="normalized-ui-debug-content-rect"
        style={rectOverlayStyle(asset.contentRect, asset.imageSize, displaySize)}
      />
    </>
  );
}

export function isKeyboardActivationKey(key: string): boolean {
  return key === "Enter" || key === " ";
}

function getButtonVisualState({
  disabled,
  hovered,
  pressed,
  selected
}: {
  readonly disabled: boolean;
  readonly hovered: boolean;
  readonly pressed: boolean;
  readonly selected: boolean;
}): NormalizedUiAssetState {
  if (disabled) {
    return "disabled";
  }
  if (pressed) {
    return "pressed";
  }
  if (selected) {
    return "selected";
  }
  if (hovered) {
    return "hover";
  }
  return "normal";
}

function resolveDisplaySize(asset: NormalizedUiAssetEntry, width: number | undefined, height: number | undefined): NormalizedUiSize {
  if (width === undefined && height === undefined) {
    return asset.recommendedDisplaySize;
  }
  const aspect = asset.recommendedDisplaySize.w / asset.recommendedDisplaySize.h;
  if (width !== undefined && height !== undefined) {
    return { w: width, h: height };
  }
  if (width !== undefined) {
    return { w: width, h: Math.round(width / aspect) };
  }
  const resolvedHeight = height ?? asset.recommendedDisplaySize.h;
  return { w: Math.round(resolvedHeight * aspect), h: resolvedHeight };
}

function boxStyle(size: NormalizedUiSize): CSSProperties {
  return {
    height: `${size.h}px`,
    width: `${size.w}px`
  };
}

function imageStyle(size: NormalizedUiSize, scaleMode: UiAssetScaleMode): CSSProperties {
  return {
    height: `${size.h}px`,
    objectFit: scaleMode === "fixed" ? "contain" : scaleMode,
    width: `${size.w}px`
  };
}

function buttonStyle(
  size: NormalizedUiSize,
  assets: {
    readonly normalAsset: NormalizedUiAssetEntry;
    readonly hoverAsset: NormalizedUiAssetEntry;
    readonly pressedAsset: NormalizedUiAssetEntry;
    readonly selectedAsset: NormalizedUiAssetEntry;
    readonly disabledAsset: NormalizedUiAssetEntry;
    readonly activeAsset: NormalizedUiAssetEntry;
  }
): CSSProperties {
  return {
    "--normalized-active-image": `url("${assets.activeAsset.path}")`,
    "--normalized-disabled-image": `url("${assets.disabledAsset.path}")`,
    "--normalized-hover-image": `url("${assets.hoverAsset.path}")`,
    "--normalized-normal-image": `url("${assets.normalAsset.path}")`,
    "--normalized-pressed-image": `url("${assets.pressedAsset.path}")`,
    "--normalized-selected-image": `url("${assets.selectedAsset.path}")`,
    height: `${size.h}px`,
    width: `${size.w}px`
  } as CSSProperties;
}

function contentLayerStyle(asset: NormalizedUiAssetEntry, displaySize: NormalizedUiSize): CSSProperties {
  const rect = scaleRect(asset.contentRect, asset.imageSize, displaySize);
  return {
    height: `${rect.h}px`,
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    width: `${rect.w}px`
  };
}

function rectOverlayStyle(rect: NormalizedUiRect, imageSize: NormalizedUiSize, displaySize: NormalizedUiSize): CSSProperties {
  const scaled = scaleRect(rect, imageSize, displaySize);
  return {
    height: `${scaled.h}px`,
    left: `${scaled.x}px`,
    top: `${scaled.y}px`,
    width: `${scaled.w}px`
  };
}

function scaleRect(rect: NormalizedUiRect, imageSize: NormalizedUiSize, displaySize: NormalizedUiSize): NormalizedUiRect {
  const scaleX = displaySize.w / imageSize.w;
  const scaleY = displaySize.h / imageSize.h;
  return {
    x: Math.round(rect.x * scaleX),
    y: Math.round(rect.y * scaleY),
    w: Math.round(rect.w * scaleX),
    h: Math.round(rect.h * scaleY)
  };
}

function createNineSliceParts(asset: NormalizedUiAssetEntry, displaySize: NormalizedUiSize): readonly {
  readonly name: string;
  readonly style: CSSProperties;
}[] {
  const slice = asset.nineSlice;
  if (slice === undefined) {
    return [];
  }
  const scaleX = displaySize.w / asset.imageSize.w;
  const scaleY = displaySize.h / asset.imageSize.h;
  const left = Math.max(1, Math.round(slice.left * scaleX));
  const right = Math.max(1, Math.round(slice.right * scaleX));
  const top = Math.max(1, Math.round(slice.top * scaleY));
  const bottom = Math.max(1, Math.round(slice.bottom * scaleY));
  const middleWidth = Math.max(1, displaySize.w - left - right);
  const middleHeight = Math.max(1, displaySize.h - top - bottom);
  const columns = [
    { name: "left", x: 0, w: left },
    { name: "center", x: left, w: middleWidth },
    { name: "right", x: displaySize.w - right, w: right }
  ] as const;
  const rows = [
    { name: "top", y: 0, h: top },
    { name: "middle", y: top, h: middleHeight },
    { name: "bottom", y: displaySize.h - bottom, h: bottom }
  ] as const;

  return rows.flatMap((row) =>
    columns.map((column) => ({
      name: `${row.name}-${column.name}`,
      style: {
        backgroundImage: `url("${asset.path}")`,
        backgroundPosition: `-${column.x}px -${row.y}px`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${displaySize.w}px ${displaySize.h}px`,
        height: `${row.h}px`,
        left: `${column.x}px`,
        top: `${row.y}px`,
        width: `${column.w}px`
      } as CSSProperties
    }))
  );
}
