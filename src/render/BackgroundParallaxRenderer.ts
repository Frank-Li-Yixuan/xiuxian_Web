import type { SpriteAssetRegistry, LoadedSpriteAsset } from "./SpriteAssetRegistry";
import type { CanvasPresentationState } from "./CanvasPresentationState";
import {
  drawFilledCircle,
  drawLine,
  drawRing,
  fillRect,
  type CanvasLikeContext,
  type Rect
} from "./PrimitiveDrawing";
import type { RenderCommand } from "./RenderLayerStack";
import type { InRunUiViewState } from "../view/InRunViewState";

export type BackgroundSceneId = "outer_battlefield" | "qingyun_mountain";

export interface BackgroundParallaxRendererOptions {
  readonly spriteRegistry?: SpriteAssetRegistry;
  readonly backgroundAssetId?: string;
}

export interface BackgroundParallaxCommandInput {
  readonly viewState: InRunUiViewState;
  readonly presentation?: CanvasPresentationState;
}

export interface BackgroundReadabilityState {
  readonly highPressure: boolean;
  readonly tribulationSky: boolean;
  readonly enemyProjectileCount: number;
  readonly brightnessAlpha: number;
  readonly starAlpha: number;
  readonly fogAlpha: number;
  readonly crackAlpha: number;
  readonly runeAlpha: number;
}

const DEFAULT_BACKGROUND_ASSET_ID = "background.space_dark_01";
const HIGH_PRESSURE_ENEMY_PROJECTILE_COUNT = 80;

export class BackgroundParallaxRenderer {
  private readonly spriteRegistry: SpriteAssetRegistry | undefined;
  private readonly backgroundAssetId: string;

  public constructor(options: BackgroundParallaxRendererOptions = {}) {
    this.spriteRegistry = options.spriteRegistry;
    this.backgroundAssetId = options.backgroundAssetId ?? DEFAULT_BACKGROUND_ASSET_ID;
  }

  public createCommands(input: BackgroundParallaxCommandInput): readonly RenderCommand[] {
    const frame = input.presentation?.frame ?? 0;
    const scene = resolveBackgroundScene(input.viewState);
    const readability = resolveBackgroundReadability(input.viewState, input.presentation);
    const backgroundAsset = this.resolveBackgroundAsset();
    return Object.freeze([
      {
        id: "background_parallax_far",
        layerId: "background_far",
        draw: (context) => drawFarLayer(context, input.viewState, frame, scene, readability, backgroundAsset)
      },
      {
        id: "background_parallax_near",
        layerId: "background_near",
        draw: (context) => drawNearLayer(context, input.viewState, frame, scene, readability)
      }
    ]);
  }

  private resolveBackgroundAsset(): LoadedSpriteAsset | undefined {
    if (this.spriteRegistry?.has(this.backgroundAssetId) !== true) {
      return undefined;
    }
    const asset = this.spriteRegistry.get(this.backgroundAssetId);
    return asset.available ? asset : undefined;
  }
}

export function resolveBackgroundScene(viewState: InRunUiViewState): BackgroundSceneId {
  const label = `${viewState.stage.stageName} ${viewState.stage.segmentName}`.toLowerCase();
  return label.includes("青云") || label.includes("qingyun") ? "qingyun_mountain" : "outer_battlefield";
}

export function resolveBackgroundReadability(
  viewState: InRunUiViewState,
  presentation?: Pick<CanvasPresentationState, "enemyProjectiles" | "warnings">
): BackgroundReadabilityState {
  const enemyProjectileCount = presentation?.enemyProjectiles.length ?? 0;
  const hasWarning = presentation?.warnings.some((warning) => warning.kind === "tribulation" || warning.kind === "boss_warning") === true;
  const tribulationSky = viewState.mode === "combat_tribulation" || viewState.tribulation?.active === true || presentation?.warnings.some((warning) => warning.kind === "tribulation") === true;
  const highPressure =
    enemyProjectileCount > HIGH_PRESSURE_ENEMY_PROJECTILE_COUNT ||
    hasWarning ||
    viewState.stage.intensity === "high" ||
    viewState.stage.intensity === "boss";

  if (tribulationSky) {
    return {
      highPressure: true,
      tribulationSky,
      enemyProjectileCount,
      brightnessAlpha: 0.46,
      starAlpha: 0.2,
      fogAlpha: 0.09,
      crackAlpha: 0.26,
      runeAlpha: 0.11
    };
  }
  if (highPressure) {
    return {
      highPressure,
      tribulationSky,
      enemyProjectileCount,
      brightnessAlpha: 0.56,
      starAlpha: 0.24,
      fogAlpha: 0.08,
      crackAlpha: 0.16,
      runeAlpha: 0.1
    };
  }
  return {
    highPressure,
    tribulationSky,
    enemyProjectileCount,
    brightnessAlpha: 0.9,
    starAlpha: 0.44,
    fogAlpha: 0.18,
    crackAlpha: 0.3,
    runeAlpha: 0.22
  };
}

function drawFarLayer(
  context: CanvasLikeContext,
  viewState: InRunUiViewState,
  frame: number,
  scene: BackgroundSceneId,
  readability: BackgroundReadabilityState,
  backgroundAsset: LoadedSpriteAsset | undefined
): void {
  context.recordCommand?.("background_far", "background_parallax_far");
  const screen = screenRect(viewState);
  fillRect(context, screen, readability.tribulationSky ? "#03020a" : "#030713", 1);
  if (backgroundAsset !== undefined && context.drawImage !== undefined) {
    drawTiledBackgroundImage(context, viewState.screen.safeArea, backgroundAsset, frame, readability);
  } else {
    drawProceduralStarfield(context, viewState.screen.safeArea, frame, readability);
  }
  drawFarCracks(context, viewState.screen.safeArea, frame, scene, readability);
  if (readability.tribulationSky) {
    drawTribulationSky(context, viewState.screen.safeArea, frame);
  }
}

function drawNearLayer(
  context: CanvasLikeContext,
  viewState: InRunUiViewState,
  frame: number,
  scene: BackgroundSceneId,
  readability: BackgroundReadabilityState
): void {
  context.recordCommand?.("background_near", "background_parallax_near");
  const safeArea = viewState.screen.safeArea;
  drawSpiritFog(context, safeArea, frame, scene, readability);
  drawBattlefieldDebris(context, safeArea, frame, readability);
  drawGroundRunes(context, safeArea, frame, scene, readability);
  drawPlayfieldRails(context, safeArea, readability);
}

function drawTiledBackgroundImage(
  context: CanvasLikeContext,
  safeArea: Rect,
  asset: LoadedSpriteAsset,
  frame: number,
  readability: BackgroundReadabilityState
): void {
  const image = asset.image;
  const sourceWidth = Math.max(1, image.width);
  const sourceHeight = Math.max(1, image.height);
  const tileWidth = safeArea.width;
  const tileHeight = Math.max(safeArea.height * 0.55, tileWidth * (sourceHeight / sourceWidth));
  const scrollY = -positiveModulo(frame * 0.22, tileHeight);
  const scrollX = Math.sin(frame / 240) * 8;
  const startY = scrollY - tileHeight;
  const endY = safeArea.y + safeArea.height + tileHeight;
  withCanvasState(context, () => {
    context.globalAlpha = readability.brightnessAlpha;
    for (let y = startY; y < endY; y += tileHeight) {
      context.drawImage?.(image, 0, 0, sourceWidth, sourceHeight, safeArea.x + scrollX, y, tileWidth, tileHeight);
    }
  });
}

function drawProceduralStarfield(context: CanvasLikeContext, safeArea: Rect, frame: number, readability: BackgroundReadabilityState): void {
  for (let index = 0; index < 56; index += 1) {
    const x = safeArea.x + positiveModulo(index * 167 + 37, safeArea.width);
    const y = safeArea.y + positiveModulo(index * 241 + frame * (0.18 + (index % 3) * 0.05), safeArea.height);
    const radius = index % 11 === 0 ? 2 : 1;
    const color = index % 5 === 0 ? "#fde68a" : index % 3 === 0 ? "#c4b5fd" : "#bfdbfe";
    drawFilledCircle(context, { x, y }, radius, color, readability.starAlpha * (index % 4 === 0 ? 0.95 : 0.55));
  }
}

function drawFarCracks(
  context: CanvasLikeContext,
  safeArea: Rect,
  frame: number,
  scene: BackgroundSceneId,
  readability: BackgroundReadabilityState
): void {
  const baseY = scene === "qingyun_mountain" ? 180 : 130;
  const drift = positiveModulo(frame * 0.08, safeArea.height + 260) - 130;
  for (let index = 0; index < 4; index += 1) {
    const x = safeArea.x + 190 + index * 245 + Math.sin((frame + index * 31) / 170) * 14;
    const y = safeArea.y + positiveModulo(baseY + index * 190 + drift, safeArea.height + 180) - 90;
    const color = scene === "qingyun_mountain" ? "#7dd3fc" : "#8b5cf6";
    drawLine(context, { x: x - 42, y }, { x: x + 54, y: y + 24 }, color, 2, readability.crackAlpha);
    drawLine(context, { x: x + 10, y: y - 24 }, { x: x + 54, y: y + 24 }, "#f5d0fe", 1, readability.crackAlpha * 0.7);
  }
}

function drawTribulationSky(context: CanvasLikeContext, safeArea: Rect, frame: number): void {
  const pulse = 0.08 + Math.sin(frame / 28) * 0.025;
  fillRect(context, safeArea, "#2e0615", pulse);
  for (let index = 0; index < 5; index += 1) {
    const x = safeArea.x + 120 + index * 250;
    const y = safeArea.y + 70 + positiveModulo(frame * 0.7 + index * 53, safeArea.height * 0.62);
    drawLine(context, { x, y: y - 52 }, { x: x + 24, y }, "#fef2f2", 1.2, 0.12);
    drawLine(context, { x: x + 24, y }, { x: x - 10, y: y + 56 }, "#a78bfa", 1.6, 0.16);
  }
}

function drawSpiritFog(
  context: CanvasLikeContext,
  safeArea: Rect,
  frame: number,
  scene: BackgroundSceneId,
  readability: BackgroundReadabilityState
): void {
  const colors = scene === "qingyun_mountain" ? ["#60a5fa", "#86efac", "#c4b5fd"] : ["#7c3aed", "#38bdf8", "#a78bfa"];
  for (let index = 0; index < 6; index += 1) {
    const y = safeArea.y + positiveModulo(index * 170 + frame * (0.34 + index * 0.02), safeArea.height + 220) - 110;
    const left = safeArea.x + 60 + Math.sin((frame + index * 31) / 80) * 40;
    const right = safeArea.x + safeArea.width - 80 + Math.cos((frame + index * 19) / 90) * 38;
    drawLine(context, { x: left, y }, { x: right, y: y - 60 }, colors[index % colors.length] ?? "#a78bfa", 5, readability.fogAlpha);
    drawLine(context, { x: left + 35, y: y + 34 }, { x: right - 35, y: y - 20 }, "#e0f2fe", 1.5, readability.fogAlpha * 0.45);
  }
}

function drawBattlefieldDebris(context: CanvasLikeContext, safeArea: Rect, frame: number, readability: BackgroundReadabilityState): void {
  for (let index = 0; index < 18; index += 1) {
    const x = safeArea.x + positiveModulo(index * 101 + 29, safeArea.width);
    const y = safeArea.y + positiveModulo(index * 157 + frame * (0.48 + (index % 4) * 0.05), safeArea.height + 80) - 40;
    const radius = 3 + (index % 4);
    drawFilledCircle(context, { x, y }, radius, "#64748b", readability.starAlpha * 0.18);
    if (index % 5 === 0) {
      drawLine(context, { x: x - radius, y }, { x: x + radius + 5, y: y + 3 }, "#94a3b8", 1, readability.starAlpha * 0.2);
    }
  }
}

function drawGroundRunes(
  context: CanvasLikeContext,
  safeArea: Rect,
  frame: number,
  scene: BackgroundSceneId,
  readability: BackgroundReadabilityState
): void {
  const runeColor = scene === "qingyun_mountain" ? "#6ee7b7" : "#7dd3fc";
  const scrollY = positiveModulo(frame * 0.7, 180);
  for (let row = -1; row < 8; row += 1) {
    const y = safeArea.y + row * 180 + scrollY;
    drawLine(context, { x: safeArea.x + 72, y }, { x: safeArea.x + safeArea.width - 72, y: y - 58 }, runeColor, 1.2, readability.runeAlpha);
    for (let col = 0; col < 5; col += 1) {
      const center = { x: safeArea.x + 170 + col * 210 + ((row + col) % 2) * 42, y: y - 25 };
      drawRing(context, center, 18 + (col % 2) * 6, runeColor, 1, readability.runeAlpha * 0.7);
      drawLine(context, { x: center.x - 18, y: center.y }, { x: center.x + 18, y: center.y }, runeColor, 1, readability.runeAlpha * 0.62);
    }
  }
}

function drawPlayfieldRails(context: CanvasLikeContext, safeArea: Rect, readability: BackgroundReadabilityState): void {
  drawLine(context, { x: safeArea.x, y: safeArea.y }, { x: safeArea.x, y: safeArea.y + safeArea.height }, "#6ee7b7", 1, 0.22 * readability.brightnessAlpha);
  drawLine(
    context,
    { x: safeArea.x + safeArea.width, y: safeArea.y },
    { x: safeArea.x + safeArea.width, y: safeArea.y + safeArea.height },
    "#6ee7b7",
    1,
    0.22 * readability.brightnessAlpha
  );
  fillRect(context, { x: 0, y: 0, width: safeArea.x, height: safeArea.height }, "#020617", 0.28);
  fillRect(context, { x: safeArea.x + safeArea.width, y: 0, width: safeArea.x, height: safeArea.height }, "#020617", 0.28);
}

function screenRect(viewState: InRunUiViewState): Rect {
  return { x: 0, y: 0, width: viewState.screen.width, height: viewState.screen.height };
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function withCanvasState(context: CanvasLikeContext, draw: () => void): void {
  context.save();
  try {
    draw();
  } finally {
    context.restore();
  }
}
