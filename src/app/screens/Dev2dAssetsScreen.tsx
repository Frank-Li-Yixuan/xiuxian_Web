import { useEffect, useMemo, useState, type CSSProperties, type ReactElement } from "react";

import {
  Combat2dAssetRegistry,
  loadCombat2dAssetRegistry,
  requiresAttribution,
  type Combat2dAssetEntry
} from "../../assets/CombatAssetRegistry";

interface Dev2dAssetsScreenProps {
  readonly registry?: Combat2dAssetRegistry;
  readonly initialAssetId?: string;
}

export function Dev2dAssetsScreen({ registry: providedRegistry, initialAssetId }: Dev2dAssetsScreenProps): ReactElement {
  const [loadedRegistry, setLoadedRegistry] = useState<Combat2dAssetRegistry | undefined>(providedRegistry);
  const [error, setError] = useState<string | undefined>(undefined);
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>(initialAssetId);
  const [useDarkBackground, setUseDarkBackground] = useState(true);

  useEffect(() => {
    if (providedRegistry !== undefined) {
      setLoadedRegistry(providedRegistry);
      return;
    }

    let cancelled = false;
    void loadCombat2dAssetRegistry()
      .then((registry) => {
        if (!cancelled) {
          setLoadedRegistry(registry);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : String(reason));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [providedRegistry]);

  const assets = loadedRegistry?.all() ?? [];
  const selectedAsset = useMemo(() => {
    if (loadedRegistry === undefined || assets.length === 0) {
      return undefined;
    }
    const candidateId = selectedAssetId ?? initialAssetId ?? assets[0]?.id;
    if (candidateId !== undefined && loadedRegistry.has(candidateId)) {
      return loadedRegistry.get(candidateId);
    }
    return assets[0];
  }, [assets, initialAssetId, loadedRegistry, selectedAssetId]);

  useEffect(() => {
    if (selectedAssetId === undefined && selectedAsset !== undefined) {
      setSelectedAssetId(selectedAsset.id);
    }
  }, [selectedAsset, selectedAssetId]);

  if (error !== undefined) {
    return (
      <main className="dev-combat-assets-screen">
        <h1>2D Combat Assets</h1>
        <p className="dev-combat-assets-error">{error}</p>
      </main>
    );
  }

  if (loadedRegistry === undefined || selectedAsset === undefined) {
    return (
      <main className="dev-combat-assets-screen">
        <h1>2D Combat Assets</h1>
        <p>Loading 2D asset manifest...</p>
      </main>
    );
  }

  return (
    <main className="dev-combat-assets-screen dev-2d-assets-screen">
      <header className="dev-combat-assets-header">
        <div>
          <h1>2D Combat Assets</h1>
          <p>
            {loadedRegistry.manifest.namespace} v{loadedRegistry.manifest.version} · {assets.length} assets
          </p>
        </div>
        <div className="dev-combat-assets-summary" aria-label="2D asset preview summary">
          <span>{assets.filter((asset) => asset.type === "spriteSheet").length} sprite sheets</span>
          <span>{assets.filter((asset) => asset.required).length} required</span>
          <label>
            <input checked={useDarkBackground} onChange={(event) => setUseDarkBackground(event.currentTarget.checked)} type="checkbox" /> Dark
            background
          </label>
        </div>
      </header>

      <section className="dev-combat-assets-layout">
        <AssetList groups={loadedRegistry.groupByCategory()} selectedAssetId={selectedAsset.id} onSelect={setSelectedAssetId} />
        <section className="dev-combat-assets-preview-panel" aria-label="Selected 2D asset preview">
          <div className="dev-combat-assets-preview-toolbar">
            <strong>{selectedAsset.id}</strong>
            <span>{selectedAsset.type}</span>
          </div>
          <TwoDAssetPreview asset={selectedAsset} useDarkBackground={useDarkBackground} />
        </section>
        <AssetDetails asset={selectedAsset} />
      </section>
    </main>
  );
}

function AssetList({
  groups,
  selectedAssetId,
  onSelect
}: {
  readonly groups: readonly [string, readonly Combat2dAssetEntry[]][];
  readonly selectedAssetId: string;
  readonly onSelect: (assetId: string) => void;
}): ReactElement {
  return (
    <aside className="dev-combat-assets-list" aria-label="2D combat asset list">
      {groups.map(([category, assets]) => (
        <section className="dev-combat-assets-group" key={category}>
          <h2>{category}</h2>
          {assets.map((asset) => (
            <button
              className={`dev-combat-assets-list-item ${asset.id === selectedAssetId ? "is-selected" : ""}`}
              data-asset-id={asset.id}
              key={asset.id}
              onClick={() => onSelect(asset.id)}
              type="button"
            >
              <span>{asset.id}</span>
              <small>
                {asset.type} · {asset.required ? "required" : "optional"}
              </small>
            </button>
          ))}
        </section>
      ))}
    </aside>
  );
}

function TwoDAssetPreview({ asset, useDarkBackground }: { readonly asset: Combat2dAssetEntry; readonly useDarkBackground: boolean }): ReactElement {
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [asset.id]);

  const showPlaceholder = loadFailed || asset.planned === true;
  return (
    <div className={`dev-2d-preview-stage ${useDarkBackground ? "is-dark" : "is-light"}`} data-asset-id={asset.id}>
      {showPlaceholder ? (
        <div className="dev-combat-assets-placeholder">
          <strong>Missing asset placeholder</strong>
          <span>{asset.path}</span>
        </div>
      ) : asset.type === "spriteSheet" ? (
        <SpriteSheetPreview asset={asset} onLoadFailed={() => setLoadFailed(true)} />
      ) : (
        <img alt={asset.id} className="dev-2d-image-preview" onError={() => setLoadFailed(true)} src={asset.path} />
      )}
    </div>
  );
}

function SpriteSheetPreview({ asset, onLoadFailed }: { readonly asset: Combat2dAssetEntry; readonly onLoadFailed: () => void }): ReactElement {
  const [frame, setFrame] = useState(0);
  const frameCount = asset.frameCount ?? 1;
  const frameWidth = asset.frameWidth ?? 1;
  const frameHeight = asset.frameHeight ?? 1;
  const fps = asset.fps ?? 1;

  useEffect(() => {
    setFrame(0);
    const intervalMs = Math.max(32, Math.round(1000 / Math.max(1, fps)));
    const timer = window.setInterval(() => {
      setFrame((currentFrame) => (currentFrame + 1) % Math.max(1, frameCount));
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [asset.id, fps, frameCount]);

  const viewportStyle = {
    width: `${frameWidth}px`,
    height: `${frameHeight}px`,
    maxWidth: "100%"
  } satisfies CSSProperties;
  const imageStyle = {
    width: `${frameWidth * frameCount}px`,
    height: `${frameHeight}px`,
    transform: `translateX(-${frame * frameWidth}px)`
  } satisfies CSSProperties;

  return (
    <div className="dev-2d-sprite-stack">
      <div className="dev-2d-sprite-viewport" style={viewportStyle}>
        <img alt={asset.id} onError={onLoadFailed} src={asset.path} style={imageStyle} />
      </div>
      <span>
        frame {frame + 1}/{frameCount} · {fps} fps
      </span>
    </div>
  );
}

function AssetDetails({ asset }: { readonly asset: Combat2dAssetEntry }): ReactElement {
  return (
    <aside className="dev-combat-assets-details" aria-label="Selected 2D asset metadata">
      <h2>{asset.id}</h2>
      <dl>
        <MetaRow label="Category" value={asset.category} />
        <MetaRow label="Type" value={asset.type} />
        <MetaRow label="Source" value={asset.sourceName} />
        <MetaRow label="Author" value={asset.author} />
        <MetaRow label="License" value={`${asset.license}${requiresAttribution(asset) ? " · attribution required" : ""}`} />
        <MetaRow label="Path" value={asset.path} />
        <MetaRow label="Source URL" value={asset.sourceUrl} />
        <MetaRow label="Required" value={asset.required ? "true" : "false"} />
        <MetaRow label="Planned" value={asset.planned === true ? "true" : "false"} />
        <MetaRow label="Notes" value={asset.notes} />
      </dl>
      <section className="dev-combat-assets-detail-block">
        <h3>Sprite Metadata</h3>
        <dl>
          <MetaRow label="frameWidth" value={formatMaybeNumber(asset.frameWidth)} />
          <MetaRow label="frameHeight" value={formatMaybeNumber(asset.frameHeight)} />
          <MetaRow label="frameCount" value={formatMaybeNumber(asset.frameCount)} />
          <MetaRow label="fps" value={formatMaybeNumber(asset.fps)} />
          <MetaRow label="blendMode" value={asset.blendMode ?? "none"} />
          <MetaRow label="loop" value={asset.loop === true ? "true" : "false"} />
          <MetaRow label="anchor" value={asset.anchor === undefined ? "none" : `${asset.anchor.x}, ${asset.anchor.y}`} />
          <MetaRow label="recommendedScale" value={formatMaybeNumber(asset.recommendedScale)} />
        </dl>
      </section>
    </aside>
  );
}

function MetaRow({ label, value }: { readonly label: string; readonly value: string }): ReactElement {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatMaybeNumber(value: number | undefined): string {
  return value === undefined ? "none" : String(value);
}
