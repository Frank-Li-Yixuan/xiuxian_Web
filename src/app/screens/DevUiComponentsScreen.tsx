import { useEffect, useState, type ReactElement } from "react";

import {
  loadNormalizedUiAssetRegistry,
  type NormalizedUiAssetRegistry
} from "../../assets/normalizedUiAssets";
import { AssetButton, AssetCard, NineSlicePanel } from "../components/NormalizedUiPrimitives";

interface DevUiComponentsScreenProps {
  readonly registry?: NormalizedUiAssetRegistry;
}

const PANEL_SIZES = [
  { label: "small", width: 420, height: 260 },
  { label: "medium", width: 680, height: 380 },
  { label: "large", width: 900, height: 500 }
] as const;

export function DevUiComponentsScreen({ registry: providedRegistry }: DevUiComponentsScreenProps): ReactElement {
  const [loadedRegistry, setLoadedRegistry] = useState<NormalizedUiAssetRegistry | undefined>(providedRegistry);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (providedRegistry !== undefined) {
      setLoadedRegistry(providedRegistry);
      return;
    }

    let cancelled = false;
    void loadNormalizedUiAssetRegistry()
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

  if (error !== undefined) {
    return (
      <main className="normalized-ui-showcase">
        <h1>Normalized UI Components</h1>
        <p className="normalized-ui-showcase-error">{error}</p>
      </main>
    );
  }

  if (loadedRegistry === undefined) {
    return (
      <main className="normalized-ui-showcase">
        <h1>Normalized UI Components</h1>
        <p>Loading normalized UI components...</p>
      </main>
    );
  }

  return (
    <main className="normalized-ui-showcase">
      <header className="normalized-ui-showcase-header">
        <h1>Normalized UI Components</h1>
        <p>Reusable manifest-driven primitives for game UI composition.</p>
      </header>

      <section className="normalized-ui-showcase-grid" aria-label="Normalized UI primitive showcase">
        <ShowcaseBlock title="Button State Group">
          <AssetButton debug registry={loadedRegistry} stateGroupId="ui.common.closeButton">
            关闭
          </AssetButton>
        </ShowcaseBlock>

        <ShowcaseBlock title="Save Slot Card">
          <NineSlicePanel assetId="ui.save.saveSlotEmpty" debug height={150} registry={loadedRegistry} width={620}>
            <div className="normalized-ui-showcase-save-slot">
              <strong>青云初试</strong>
              <span>未定道友 · 模拟中</span>
            </div>
          </NineSlicePanel>
        </ShowcaseBlock>

        <ShowcaseBlock title="Destiny Card">
          <AssetCard
            debug
            description="雷法加成，真元消耗增加。所有文字由 DOM 渲染。"
            icon={<span className="normalized-ui-showcase-card-icon">符</span>}
            rarity="legendary"
            registry={loadedRegistry}
            title="天雷道体"
          />
        </ShowcaseBlock>

        <ShowcaseBlock title="Scalable Panel">
          <div className="normalized-ui-panel-size-stack">
            {PANEL_SIZES.map((size) => (
              <div data-showcase-panel-size={size.label} key={size.label}>
                <NineSlicePanel
                  assetId="ui.save.savePanelFrame"
                  height={size.height}
                  registry={loadedRegistry}
                  width={size.width}
                >
                  <span>{size.label}</span>
                </NineSlicePanel>
              </div>
            ))}
          </div>
        </ShowcaseBlock>
      </section>
    </main>
  );
}

function ShowcaseBlock({ title, children }: { readonly title: string; readonly children: ReactElement }): ReactElement {
  return (
    <article className="normalized-ui-showcase-block">
      <h2>{title}</h2>
      <div className="normalized-ui-showcase-surface">{children}</div>
    </article>
  );
}
