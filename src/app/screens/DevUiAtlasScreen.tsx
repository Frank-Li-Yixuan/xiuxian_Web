import { useEffect, useMemo, useState, type CSSProperties, type ReactElement } from "react";

import {
  loadNormalizedUiAssetManifest,
  type NormalizedUiAssetEntry,
  type NormalizedUiAssetManifest,
  type NormalizedUiRect,
  type NormalizedUiSize
} from "../../assets/normalizedUiAssets";

interface DevUiAtlasScreenProps {
  readonly manifest?: NormalizedUiAssetManifest;
}

export function DevUiAtlasScreen({ manifest: providedManifest }: DevUiAtlasScreenProps): ReactElement {
  const [loadedManifest, setLoadedManifest] = useState<NormalizedUiAssetManifest | undefined>(providedManifest);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (providedManifest !== undefined) {
      setLoadedManifest(providedManifest);
      return;
    }

    let cancelled = false;
    void loadNormalizedUiAssetManifest()
      .then((manifest) => {
        if (!cancelled) {
          setLoadedManifest(manifest);
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
  }, [providedManifest]);

  const entries = useMemo(
    () =>
      Object.values(loadedManifest?.assets ?? {}).sort((a, b) =>
        `${a.category}:${a.id}`.localeCompare(`${b.category}:${b.id}`)
      ),
    [loadedManifest]
  );

  if (error !== undefined) {
    return (
      <main className="ui-atlas-screen">
        <h1>UI Atlas</h1>
        <p className="ui-atlas-error">{error}</p>
      </main>
    );
  }

  if (loadedManifest === undefined) {
    return (
      <main className="ui-atlas-screen">
        <h1>UI Atlas</h1>
        <p>Loading normalized UI manifest...</p>
      </main>
    );
  }

  return (
    <main className="ui-atlas-screen">
      <header className="ui-atlas-header">
        <div>
          <h1>UI Atlas</h1>
          <p>
            {loadedManifest.namespace} v{loadedManifest.version} · {entries.length} assets
          </p>
        </div>
      </header>
      <section className="ui-atlas-grid" aria-label="Generated UI asset atlas">
        {entries.map((entry) => (
          <AssetPreview entry={entry} key={entry.id} />
        ))}
      </section>
    </main>
  );
}

function AssetPreview({ entry }: { readonly entry: NormalizedUiAssetEntry }): ReactElement {
  const displaySize = clampDisplaySize(entry.recommendedDisplaySize);
  return (
    <article className={`ui-atlas-card is-${entry.category}`}>
      <div className="ui-atlas-card-header">
        <strong>{entry.id}</strong>
        <span>{entry.category}</span>
      </div>
      <div className="ui-atlas-preview-wrap">
        <div className="ui-atlas-preview" style={previewStyle(displaySize)}>
          <img alt="" decoding="async" loading="lazy" src={entry.path} style={previewStyle(displaySize)} />
          <Overlay className="ui-atlas-visual-bounds" imageSize={entry.imageSize} rect={entry.visualBounds} renderedSize={displaySize} />
          <Overlay className="ui-atlas-content-rect" imageSize={entry.imageSize} rect={entry.contentRect} renderedSize={displaySize} />
        </div>
      </div>
      <dl className="ui-atlas-meta">
        <div>
          <dt>Display</dt>
          <dd>
            {entry.recommendedDisplaySize.w} x {entry.recommendedDisplaySize.h}
          </dd>
        </div>
        <div>
          <dt>Image</dt>
          <dd>
            {entry.imageSize.w} x {entry.imageSize.h}
          </dd>
        </div>
        <div>
          <dt>Mode</dt>
          <dd>{entry.scalingMode}</dd>
        </div>
      </dl>
      <div className="ui-atlas-warning-list">
        {(entry.warnings ?? []).map((warning) => (
          <span className="ui-atlas-warning" key={warning}>
            {warning}
          </span>
        ))}
      </div>
    </article>
  );
}

function Overlay({
  className,
  imageSize,
  rect,
  renderedSize
}: {
  readonly className: string;
  readonly imageSize: NormalizedUiSize;
  readonly rect: NormalizedUiRect;
  readonly renderedSize: NormalizedUiSize;
}): ReactElement {
  return <span aria-hidden="true" className={className} style={overlayStyle(rect, imageSize, renderedSize)} />;
}

function previewStyle(size: NormalizedUiSize): CSSProperties {
  return {
    width: `${size.w}px`,
    height: `${size.h}px`
  };
}

function overlayStyle(rect: NormalizedUiRect, imageSize: NormalizedUiSize, renderedSize: NormalizedUiSize): CSSProperties {
  const scaleX = renderedSize.w / imageSize.w;
  const scaleY = renderedSize.h / imageSize.h;
  return {
    left: `${rect.x * scaleX}px`,
    top: `${rect.y * scaleY}px`,
    width: `${rect.w * scaleX}px`,
    height: `${rect.h * scaleY}px`
  };
}

function clampDisplaySize(size: NormalizedUiSize): NormalizedUiSize {
  const maxWidth = 360;
  const maxHeight = 240;
  const scale = Math.min(1, maxWidth / size.w, maxHeight / size.h);
  return {
    w: Math.max(1, Math.round(size.w * scale)),
    h: Math.max(1, Math.round(size.h * scale))
  };
}
