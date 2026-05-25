import type {
  NormalizedUiAssetManifest,
  NormalizedUiNineSlice,
  NormalizedUiRect,
  NormalizedUiSize
} from "../../assets/normalizedUiAssets";

export type UiWorkbenchTab = "calibration" | "slicing" | "layout";
export type CalibrationRectKind = "visualBounds" | "contentRect";

export interface UiAssetOverride {
  readonly assetId: string;
  readonly visualBounds?: NormalizedUiRect;
  readonly contentRect?: NormalizedUiRect;
  readonly nineSlice?: NormalizedUiNineSlice;
  readonly recommendedDisplaySize?: NormalizedUiSize;
  readonly notes?: string;
}

export interface SliceJob {
  readonly sourceAssetId: string;
  readonly outputAssetId: string;
  readonly outputPath: string;
  readonly rect: NormalizedUiRect;
  readonly trimTransparentPadding: boolean;
  readonly category: string;
  readonly stateGroup?: string;
  readonly state?: string;
}

export interface LayoutDraft {
  readonly version: "0.1";
  readonly designSize: { readonly w: 1920; readonly h: 1080 };
  readonly name: string;
  readonly elements: readonly LayoutElement[];
}

export interface LayoutElement {
  readonly id: string;
  readonly assetId: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly z: number;
  readonly locked?: boolean;
  readonly textPlaceholder?: string;
}

export interface UiWorkbenchState {
  readonly activeTab: UiWorkbenchTab;
  readonly activeAssetId: string;
  readonly baseManifest: NormalizedUiAssetManifest;
  readonly overrides: readonly UiAssetOverride[];
  readonly sliceJobs: readonly SliceJob[];
  readonly layout: LayoutDraft;
}

export interface RectDelta {
  readonly dx?: number;
  readonly dy?: number;
  readonly dw?: number;
  readonly dh?: number;
}

export function applyWorkbenchOverrides(
  baseManifest: NormalizedUiAssetManifest,
  overrides: readonly UiAssetOverride[]
): NormalizedUiAssetManifest {
  const assets = { ...baseManifest.assets };
  for (const override of overrides) {
    const baseEntry = assets[override.assetId];
    if (baseEntry === undefined) {
      continue;
    }
    assets[override.assetId] = {
      ...baseEntry,
      ...(override.visualBounds === undefined ? {} : { visualBounds: override.visualBounds }),
      ...(override.contentRect === undefined ? {} : { contentRect: override.contentRect }),
      ...(override.nineSlice === undefined ? {} : { nineSlice: override.nineSlice }),
      ...(override.recommendedDisplaySize === undefined ? {} : { recommendedDisplaySize: override.recommendedDisplaySize }),
      warnings: [...new Set([...(baseEntry.warnings ?? []), "editorOverride"])]
    };
  }
  return {
    ...baseManifest,
    assets
  };
}

export function updateCalibrationRect(
  state: UiWorkbenchState,
  update: { readonly assetId: string; readonly rectKind: CalibrationRectKind; readonly rect: NormalizedUiRect }
): UiWorkbenchState {
  const asset = state.baseManifest.assets[update.assetId];
  if (asset === undefined) {
    return state;
  }
  const rect = clampRectToSize(update.rect, asset.imageSize);
  const existing = state.overrides.find((override) => override.assetId === update.assetId);
  const nextOverride: UiAssetOverride = {
    ...(existing ?? { assetId: update.assetId }),
    [update.rectKind]: rect
  };
  return {
    ...state,
    overrides: upsertOverride(state.overrides, nextOverride)
  };
}

export function moveCalibrationRect(
  state: UiWorkbenchState,
  update: { readonly assetId: string; readonly rectKind: CalibrationRectKind; readonly delta: RectDelta }
): UiWorkbenchState {
  const asset = state.baseManifest.assets[update.assetId];
  if (asset === undefined) {
    return state;
  }
  const override = state.overrides.find((item) => item.assetId === update.assetId);
  const current = update.rectKind === "visualBounds" ? (override?.visualBounds ?? asset.visualBounds) : (override?.contentRect ?? asset.contentRect);
  return updateCalibrationRect(state, {
    assetId: update.assetId,
    rectKind: update.rectKind,
    rect: {
      x: current.x + (update.delta.dx ?? 0),
      y: current.y + (update.delta.dy ?? 0),
      w: current.w + (update.delta.dw ?? 0),
      h: current.h + (update.delta.dh ?? 0)
    }
  });
}

export function updateNineSlice(
  state: UiWorkbenchState,
  update: { readonly assetId: string; readonly nineSlice: NormalizedUiNineSlice }
): UiWorkbenchState {
  const asset = state.baseManifest.assets[update.assetId];
  if (asset === undefined) {
    return state;
  }
  const existing = state.overrides.find((override) => override.assetId === update.assetId);
  const nextOverride: UiAssetOverride = {
    ...(existing ?? { assetId: update.assetId }),
    nineSlice: clampNineSlice(update.nineSlice, asset.imageSize)
  };
  return {
    ...state,
    overrides: upsertOverride(state.overrides, nextOverride)
  };
}

export function addSliceJob(state: UiWorkbenchState, job: SliceJob): UiWorkbenchState {
  validateEditorOutputPath(job.outputPath);
  return {
    ...state,
    sliceJobs: [...state.sliceJobs.filter((item) => item.outputAssetId !== job.outputAssetId), job]
  };
}

export function createDefaultLayoutDraft(name: string): LayoutDraft {
  return {
    version: "0.1",
    designSize: { w: 1920, h: 1080 },
    name,
    elements: [
      {
        id: "element_1",
        assetId: "ui.save.saveSlotEmpty",
        x: 0,
        y: 0,
        w: 320,
        h: 80,
        z: 1,
        textPlaceholder: "存档信息"
      }
    ]
  };
}

export function moveLayoutElement(layout: LayoutDraft, elementId: string, delta: { readonly dx: number; readonly dy: number }): LayoutDraft {
  return updateLayoutElement(layout, elementId, (element) =>
    element.locked === true
      ? element
      : {
          ...element,
          x: clamp(element.x + delta.dx, 0, layout.designSize.w - element.w),
          y: clamp(element.y + delta.dy, 0, layout.designSize.h - element.h)
        }
  );
}

export function resizeLayoutElement(layout: LayoutDraft, elementId: string, delta: { readonly dw: number; readonly dh: number }): LayoutDraft {
  return updateLayoutElement(layout, elementId, (element) =>
    element.locked === true
      ? element
      : {
          ...element,
          w: clamp(element.w + delta.dw, 16, layout.designSize.w - element.x),
          h: clamp(element.h + delta.dh, 16, layout.designSize.h - element.y)
        }
  );
}

export function addLayoutElement(layout: LayoutDraft, element: Omit<LayoutElement, "id" | "z">): LayoutDraft {
  const nextIndex = layout.elements.length + 1;
  const maxZ = layout.elements.reduce((current, item) => Math.max(current, item.z), 0);
  return {
    ...layout,
    elements: [
      ...layout.elements,
      {
        ...element,
        id: `element_${nextIndex}`,
        z: maxZ + 1
      }
    ]
  };
}

export function serializeOverrides(overrides: readonly UiAssetOverride[]): string {
  return `${JSON.stringify({ version: "0.1", overrides }, null, 2)}\n`;
}

export function serializeSliceJobs(sliceJobs: readonly SliceJob[]): string {
  return `${JSON.stringify({ version: "0.1", sliceJobs }, null, 2)}\n`;
}

export function serializeLayoutDraft(layout: LayoutDraft): string {
  return `${JSON.stringify(layout, null, 2)}\n`;
}

function upsertOverride(overrides: readonly UiAssetOverride[], nextOverride: UiAssetOverride): readonly UiAssetOverride[] {
  const found = overrides.some((override) => override.assetId === nextOverride.assetId);
  if (!found) {
    return [...overrides, nextOverride];
  }
  return overrides.map((override) => (override.assetId === nextOverride.assetId ? nextOverride : override));
}

function updateLayoutElement(layout: LayoutDraft, elementId: string, update: (element: LayoutElement) => LayoutElement): LayoutDraft {
  return {
    ...layout,
    elements: layout.elements.map((element) => (element.id === elementId ? update(element) : element))
  };
}

function clampRectToSize(rect: NormalizedUiRect, size: NormalizedUiSize): NormalizedUiRect {
  const x = clamp(Math.round(rect.x), 0, Math.max(0, size.w - 1));
  const y = clamp(Math.round(rect.y), 0, Math.max(0, size.h - 1));
  return {
    x,
    y,
    w: clamp(Math.round(rect.w), 1, size.w - x),
    h: clamp(Math.round(rect.h), 1, size.h - y)
  };
}

function clampNineSlice(nineSlice: NormalizedUiNineSlice, size: NormalizedUiSize): NormalizedUiNineSlice {
  const maxX = Math.max(1, Math.floor(size.w / 2) - 1);
  const maxY = Math.max(1, Math.floor(size.h / 2) - 1);
  return {
    left: clamp(Math.round(nineSlice.left), 1, maxX),
    right: clamp(Math.round(nineSlice.right), 1, maxX),
    top: clamp(Math.round(nineSlice.top), 1, maxY),
    bottom: clamp(Math.round(nineSlice.bottom), 1, maxY)
  };
}

function validateEditorOutputPath(outputPath: string): void {
  if (!outputPath.startsWith("/assets/generated/ui/editor/")) {
    throw new Error(`Slice output path must stay under /assets/generated/ui/editor/: ${outputPath}`);
  }
  if (!outputPath.endsWith(".png")) {
    throw new Error(`Slice output path must be a PNG: ${outputPath}`);
  }
  if (outputPath.includes("..")) {
    throw new Error(`Slice output path must not contain traversal: ${outputPath}`);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
