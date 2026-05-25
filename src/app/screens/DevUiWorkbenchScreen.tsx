import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactElement
} from "react";

import {
  loadNormalizedUiAssetManifest,
  NormalizedUiAssetRegistry,
  type NormalizedUiAssetEntry,
  type NormalizedUiAssetManifest,
  type NormalizedUiRect
} from "../../assets/normalizedUiAssets";
import { NineSlicePanel, UiAssetImage } from "../components/NormalizedUiPrimitives";
import {
  addLayoutElement,
  addSliceJob,
  applyWorkbenchOverrides,
  createDefaultLayoutDraft,
  moveCalibrationRect,
  moveLayoutElement,
  resizeLayoutElement,
  serializeLayoutDraft,
  serializeOverrides,
  serializeSliceJobs,
  updateCalibrationRect,
  updateNineSlice,
  type CalibrationRectKind,
  type LayoutDraft,
  type SliceJob,
  type UiAssetOverride,
  type UiWorkbenchState,
  type UiWorkbenchTab
} from "./UiWorkbenchState";

interface DevUiWorkbenchScreenProps {
  readonly manifest?: NormalizedUiAssetManifest;
}

interface DragState {
  readonly kind: "calibration" | "layout-move" | "layout-resize";
  readonly id: string;
  readonly rectKind?: CalibrationRectKind;
  readonly startX: number;
  readonly startY: number;
}

const WORKBENCH_TABS: readonly { readonly id: UiWorkbenchTab; readonly label: string }[] = [
  { id: "calibration", label: "标定" },
  { id: "slicing", label: "切分" },
  { id: "layout", label: "布局" }
];

export function DevUiWorkbenchScreen({ manifest: providedManifest }: DevUiWorkbenchScreenProps): ReactElement {
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

  if (error !== undefined) {
    return (
      <main className="ui-workbench">
        <h1>UI Asset Workbench</h1>
        <p className="ui-workbench-error">{error}</p>
      </main>
    );
  }

  if (loadedManifest === undefined) {
    return (
      <main className="ui-workbench">
        <h1>UI Asset Workbench</h1>
        <p>Loading workbench manifest...</p>
      </main>
    );
  }

  return <LoadedUiWorkbench manifest={loadedManifest} />;
}

function LoadedUiWorkbench({ manifest }: { readonly manifest: NormalizedUiAssetManifest }): ReactElement {
  const sortedAssets = useMemo(() => Object.values(manifest.assets).sort((a, b) => a.id.localeCompare(b.id)), [manifest]);
  const firstAssetId = sortedAssets[0]?.id ?? "";
  const [state, setState] = useState<UiWorkbenchState>(() => ({
    activeAssetId: firstAssetId,
    activeTab: "calibration",
    baseManifest: manifest,
    layout: createDefaultLayoutDraft("main_menu"),
    overrides: [],
    sliceJobs: []
  }));
  const [saveMessage, setSaveMessage] = useState<string>("");
  const resolvedManifest = useMemo(() => applyWorkbenchOverrides(state.baseManifest, state.overrides), [state.baseManifest, state.overrides]);
  const registry = useMemo(() => new NormalizedUiAssetRegistry(resolvedManifest), [resolvedManifest]);
  const activeAsset = resolvedManifest.assets[state.activeAssetId] ?? sortedAssets[0];

  const saveJson = async (path: string, json: string): Promise<void> => {
    const result = await writeWorkbenchFile(path, json);
    setSaveMessage(result.ok ? `已保存 ${result.path}` : `保存失败：${result.error}`);
  };

  return (
    <main className="ui-workbench">
      <header className="ui-workbench-header">
        <div>
          <h1>UI Asset Workbench</h1>
          <p>标定、切分和 1920x1080 设计稿布局工具。所有输出写入 editor 旁路目录。</p>
        </div>
        <div className="ui-workbench-save-actions">
          <button type="button" onClick={() => void saveJson("public/assets/generated/ui/editor/ui_asset_overrides.v0.1.json", serializeOverrides(state.overrides))}>
            保存标定
          </button>
          <button type="button" onClick={() => void saveJson("public/assets/generated/ui/editor/slice_jobs.v0.1.json", serializeSliceJobs(state.sliceJobs))}>
            保存切分
          </button>
          <button type="button" onClick={() => void saveJson("public/assets/generated/ui/editor/layouts/main_menu.layout.v0.1.json", serializeLayoutDraft(state.layout))}>
            保存布局
          </button>
        </div>
      </header>

      <nav className="ui-workbench-tabs" aria-label="Workbench tabs">
        {WORKBENCH_TABS.map((tab) => (
          <button
            className={state.activeTab === tab.id ? "is-active" : ""}
            key={tab.id}
            type="button"
            onClick={() => setState((current) => ({ ...current, activeTab: tab.id }))}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="ui-workbench-body">
        <AssetList
          activeAssetId={state.activeAssetId}
          assets={sortedAssets}
          onSelect={(assetId) => setState((current) => ({ ...current, activeAssetId: assetId }))}
        />
        <section className="ui-workbench-stage">
          <WorkbenchPanel active={state.activeTab === "calibration"} tab="calibration">
            {activeAsset === undefined ? null : (
              <CalibrationWorkspace
                asset={activeAsset}
                registry={registry}
                state={state}
                onStateChange={setState}
              />
            )}
          </WorkbenchPanel>
          <WorkbenchPanel active={state.activeTab === "slicing"} tab="slicing">
            {activeAsset === undefined ? null : (
              <SlicingWorkspace
                asset={activeAsset}
                state={state}
                onSavePng={(job) => saveSlicePng(activeAsset, job).then((message) => setSaveMessage(message))}
                onStateChange={setState}
              />
            )}
          </WorkbenchPanel>
          <WorkbenchPanel active={state.activeTab === "layout"} tab="layout">
            <LayoutWorkspace
              manifest={resolvedManifest}
              registry={registry}
              state={state}
              onStateChange={setState}
            />
          </WorkbenchPanel>
        </section>
        <aside className="ui-workbench-inspector">
          <h2>输出</h2>
          <p>{saveMessage.length > 0 ? saveMessage : "尚未保存。编辑结果会写入 public/assets/generated/ui/editor/。"}</p>
          <pre>{JSON.stringify({ overrides: state.overrides.length, sliceJobs: state.sliceJobs.length, layoutElements: state.layout.elements.length }, null, 2)}</pre>
        </aside>
      </div>
    </main>
  );
}

function AssetList({
  assets,
  activeAssetId,
  onSelect
}: {
  readonly assets: readonly NormalizedUiAssetEntry[];
  readonly activeAssetId: string;
  readonly onSelect: (assetId: string) => void;
}): ReactElement {
  return (
    <aside className="ui-workbench-asset-list">
      <h2>素材</h2>
      <div>
        {assets.map((asset) => (
          <button
            className={asset.id === activeAssetId ? "is-active" : ""}
            key={asset.id}
            title={asset.id}
            type="button"
            onClick={() => onSelect(asset.id)}
          >
            <span>{asset.id}</span>
            <small>{asset.category}</small>
          </button>
        ))}
      </div>
    </aside>
  );
}

function WorkbenchPanel({
  active,
  tab,
  children
}: {
  readonly active: boolean;
  readonly tab: UiWorkbenchTab;
  readonly children: ReactElement | null;
}): ReactElement {
  return (
    <section data-workbench-tab={tab} hidden={!active}>
      {children}
    </section>
  );
}

function CalibrationWorkspace({
  asset,
  registry,
  state,
  onStateChange
}: {
  readonly asset: NormalizedUiAssetEntry;
  readonly registry: NormalizedUiAssetRegistry;
  readonly state: UiWorkbenchState;
  readonly onStateChange: (update: (state: UiWorkbenchState) => UiWorkbenchState) => void;
}): ReactElement {
  const [dragState, setDragState] = useState<DragState | undefined>(undefined);
  const previewSize = scaledPreviewSize(asset.imageSize, 720, 420);
  const scaleX = previewSize.w / asset.imageSize.w;
  const scaleY = previewSize.h / asset.imageSize.h;

  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (dragState?.kind !== "calibration" || dragState.rectKind === undefined) {
      return;
    }
    const dx = Math.round((event.clientX - dragState.startX) / scaleX);
    const dy = Math.round((event.clientY - dragState.startY) / scaleY);
    onStateChange((current) =>
      moveCalibrationRect(current, {
        assetId: dragState.id,
        rectKind: dragState.rectKind ?? "contentRect",
        delta: { dx, dy }
      })
    );
    setDragState({ ...dragState, startX: event.clientX, startY: event.clientY });
  };

  return (
    <div className="ui-workbench-calibration">
      <div>
        <h2>标定</h2>
        <p>{asset.id}</p>
        <div className="ui-workbench-tool-row">
          <button type="button" onClick={() => onStateChange((current) => moveCalibrationRect(current, { assetId: asset.id, rectKind: "contentRect", delta: { dx: -4 } }))}>
            内容左移
          </button>
          <button type="button" onClick={() => onStateChange((current) => moveCalibrationRect(current, { assetId: asset.id, rectKind: "contentRect", delta: { dx: 4 } }))}>
            内容右移
          </button>
          <button type="button" onClick={() => onStateChange((current) => moveCalibrationRect(current, { assetId: asset.id, rectKind: "contentRect", delta: { dw: 8 } }))}>
            内容加宽
          </button>
          <button type="button" onClick={() => onStateChange((current) => updateNineSlice(current, { assetId: asset.id, nineSlice: asset.nineSlice ?? { left: 24, right: 24, top: 24, bottom: 24 } }))}>
            采用九宫格
          </button>
        </div>
      </div>
      <div className="ui-workbench-preview-grid">
        <div
          className="ui-workbench-calibration-canvas"
          style={sizeStyle(previewSize)}
          onPointerMove={onPointerMove}
          onPointerUp={() => setDragState(undefined)}
        >
          <img alt="" decoding="async" draggable={false} src={asset.path} style={sizeStyle(previewSize)} />
          <RectOverlay
            className="is-visual"
            imageSize={asset.imageSize}
            previewSize={previewSize}
            rect={asset.visualBounds}
            rectKind="visualBounds"
            onPointerDown={(event) => setDragState({ id: asset.id, kind: "calibration", rectKind: "visualBounds", startX: event.clientX, startY: event.clientY })}
          />
          <RectOverlay
            className="is-content"
            imageSize={asset.imageSize}
            previewSize={previewSize}
            rect={asset.contentRect}
            rectKind="contentRect"
            onPointerDown={(event) => setDragState({ id: asset.id, kind: "calibration", rectKind: "contentRect", startX: event.clientX, startY: event.clientY })}
          />
        </div>
        <div className="ui-workbench-live-preview">
          <h3>实时预览</h3>
          {asset.nineSlice === undefined ? (
            <UiAssetImage assetId={asset.id} debug registry={registry} />
          ) : (
            <NineSlicePanel assetId={asset.id} debug height={Math.min(260, asset.recommendedDisplaySize.h)} registry={registry} width={Math.min(520, asset.recommendedDisplaySize.w)}>
              <span>DOM 文本区域</span>
            </NineSlicePanel>
          )}
        </div>
      </div>
    </div>
  );
}

function SlicingWorkspace({
  asset,
  state,
  onStateChange,
  onSavePng
}: {
  readonly asset: NormalizedUiAssetEntry;
  readonly state: UiWorkbenchState;
  readonly onStateChange: (update: (state: UiWorkbenchState) => UiWorkbenchState) => void;
  readonly onSavePng: (job: SliceJob) => Promise<void>;
}): ReactElement {
  const outputAssetId = `ui.editor.${asset.id.split(".").slice(-1)[0] ?? "slice"}.normal`;
  const outputPath = `/assets/generated/ui/editor/slices/${outputAssetId.replace(/\./g, "_")}.png`;
  const job: SliceJob = {
    category: asset.category,
    outputAssetId,
    outputPath,
    rect: asset.visualBounds,
    sourceAssetId: asset.id,
    state: "normal",
    stateGroup: outputAssetId.replace(/\.normal$/, ""),
    trimTransparentPadding: true
  };

  return (
    <div className="ui-workbench-slicing">
      <h2>切分</h2>
      <p>从当前素材的 visualBounds 生成一个切片任务。后续可继续扩展为多矩形批量切分。</p>
      <div className="ui-workbench-slice-source">
        <img alt="" decoding="async" draggable={false} src={asset.path} />
      </div>
      <div className="ui-workbench-tool-row">
        <button type="button" onClick={() => onStateChange((current) => addSliceJob(current, job))}>
          添加切分任务
        </button>
        <button
          type="button"
          onClick={() => {
            onStateChange((current) => addSliceJob(current, job));
            void onSavePng(job);
          }}
        >
          导出 PNG
        </button>
      </div>
      <pre>{JSON.stringify({ pendingJob: job, jobs: state.sliceJobs }, null, 2)}</pre>
    </div>
  );
}

function LayoutWorkspace({
  manifest,
  registry,
  state,
  onStateChange
}: {
  readonly manifest: NormalizedUiAssetManifest;
  readonly registry: NormalizedUiAssetRegistry;
  readonly state: UiWorkbenchState;
  readonly onStateChange: (update: (state: UiWorkbenchState) => UiWorkbenchState) => void;
}): ReactElement {
  const [dragState, setDragState] = useState<DragState | undefined>(undefined);
  const scale = 0.42;

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (dragState === undefined) {
      return;
    }
    const dx = Math.round((event.clientX - dragState.startX) / scale);
    const dy = Math.round((event.clientY - dragState.startY) / scale);
    onStateChange((current) => ({
      ...current,
      layout:
        dragState.kind === "layout-resize"
          ? resizeLayoutElement(current.layout, dragState.id, { dw: dx, dh: dy })
          : moveLayoutElement(current.layout, dragState.id, { dx, dy })
    }));
    setDragState({ ...dragState, startX: event.clientX, startY: event.clientY });
  };

  return (
    <div className="ui-workbench-layout">
      <div className="ui-workbench-layout-header">
        <h2>布局</h2>
        <button
          type="button"
          onClick={() =>
            onStateChange((current) => ({
              ...current,
              layout: addLayoutElement(current.layout, {
                assetId: current.activeAssetId,
                h: 120,
                textPlaceholder: "新元素",
                w: 360,
                x: 120,
                y: 120
              })
            }))
          }
        >
          添加当前素材
        </button>
      </div>
      <div
        className="ui-workbench-layout-canvas"
        data-layout-design-size="1920x1080"
        style={{ height: `${1080 * scale}px`, width: `${1920 * scale}px` }}
        onPointerMove={handlePointerMove}
        onPointerUp={() => setDragState(undefined)}
      >
        {state.layout.elements.map((element) => {
          const asset = manifest.assets[element.assetId];
          return (
            <div
              className="ui-workbench-layout-element"
              key={element.id}
              style={{
                height: `${element.h * scale}px`,
                left: `${element.x * scale}px`,
                top: `${element.y * scale}px`,
                width: `${element.w * scale}px`,
                zIndex: element.z
              }}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                setDragState({ id: element.id, kind: "layout-move", startX: event.clientX, startY: event.clientY });
              }}
            >
              {asset === undefined ? null : asset.nineSlice === undefined ? (
                <UiAssetImage assetId={element.assetId} height={element.h * scale} registry={registry} width={element.w * scale} />
              ) : (
                <NineSlicePanel assetId={element.assetId} height={element.h * scale} registry={registry} width={element.w * scale}>
                  <span>{element.textPlaceholder}</span>
                </NineSlicePanel>
              )}
              <button
                className="ui-workbench-resize-handle"
                type="button"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setDragState({ id: element.id, kind: "layout-resize", startX: event.clientX, startY: event.clientY });
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RectOverlay({
  className,
  imageSize,
  previewSize,
  rect,
  rectKind,
  onPointerDown
}: {
  readonly className: string;
  readonly imageSize: { readonly w: number; readonly h: number };
  readonly previewSize: { readonly w: number; readonly h: number };
  readonly rect: NormalizedUiRect;
  readonly rectKind: CalibrationRectKind;
  readonly onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
}): ReactElement {
  return (
    <div
      className={`ui-workbench-rect-overlay ${className}`}
      data-calibration-overlay={rectKind}
      style={rectStyle(rect, imageSize, previewSize)}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        onPointerDown(event);
      }}
    />
  );
}

async function writeWorkbenchFile(path: string, text: string): Promise<{ readonly ok: boolean; readonly path?: string; readonly error?: string }> {
  const response = await fetch("/__ui-workbench/write", {
    body: JSON.stringify({ path, base64: toBase64(text) }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  return (await response.json()) as { readonly ok: boolean; readonly path?: string; readonly error?: string };
}

async function saveSlicePng(asset: NormalizedUiAssetEntry, job: SliceJob): Promise<string> {
  const dataUrl = await cropAssetToPngDataUrl(asset.path, job.rect);
  const base64 = dataUrl.split(",")[1] ?? "";
  const response = await fetch("/__ui-workbench/write", {
    body: JSON.stringify({ path: job.outputPath.replace(/^\//, "public/"), base64 }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  const result = (await response.json()) as { readonly ok: boolean; readonly path?: string; readonly error?: string };
  return result.ok ? `已导出 ${result.path}` : `导出失败：${result.error}`;
}

function cropAssetToPngDataUrl(path: string, rect: NormalizedUiRect): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = rect.w;
      canvas.height = rect.h;
      const context = canvas.getContext("2d");
      if (context === null) {
        reject(new Error("Canvas 2D unavailable"));
        return;
      }
      context.clearRect(0, 0, rect.w, rect.h);
      context.drawImage(image, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error(`Failed to load image for slice: ${path}`));
    image.src = path;
  });
}

function scaledPreviewSize(size: { readonly w: number; readonly h: number }, maxWidth: number, maxHeight: number): { readonly w: number; readonly h: number } {
  const scale = Math.min(maxWidth / size.w, maxHeight / size.h, 1);
  return {
    w: Math.round(size.w * scale),
    h: Math.round(size.h * scale)
  };
}

function rectStyle(rect: NormalizedUiRect, imageSize: { readonly w: number; readonly h: number }, previewSize: { readonly w: number; readonly h: number }): CSSProperties {
  return {
    height: `${(rect.h / imageSize.h) * previewSize.h}px`,
    left: `${(rect.x / imageSize.w) * previewSize.w}px`,
    top: `${(rect.y / imageSize.h) * previewSize.h}px`,
    width: `${(rect.w / imageSize.w) * previewSize.w}px`
  };
}

function sizeStyle(size: { readonly w: number; readonly h: number }): CSSProperties {
  return {
    height: `${size.h}px`,
    width: `${size.w}px`
  };
}

function toBase64(text: string): string {
  return btoa(unescape(encodeURIComponent(text)));
}
