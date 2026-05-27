import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";

import type { CanvasPresentationSpriteVfxRequest, CanvasPresentationState } from "../../render/CanvasPresentationState";
import { CanvasRenderer, type CanvasRenderFrame } from "../../render/CanvasRenderer";
import { CombatVfxRenderer } from "../../render/CombatVfxRenderer";
import { loadSpriteAssetRegistry, type SpriteAssetRegistry } from "../../render/SpriteAssetRegistry";
import type { InRunUiViewState } from "../../view/InRunViewState";

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

const DEMO_ASSETS = [
  {
    assetId: "vfx.explosion.small_01",
    label: "Explosion",
    position: { x: 720, y: 420 },
    startOffset: 0,
    scale: 1.2,
    loopOverride: false
  },
  {
    assetId: "vfx.lightning.chain_01",
    label: "Lightning",
    position: { x: 960, y: 370 },
    startOffset: 18,
    scale: 4,
    loopOverride: false
  },
  {
    assetId: "vfx.heal.green_01",
    label: "Heal",
    position: { x: 1180, y: 620 },
    startOffset: 36,
    scale: 0.9,
    loopOverride: false
  },
  {
    assetId: "vfx.shield.barrier_01",
    label: "Shield",
    position: { x: 930, y: 680 },
    startOffset: 54,
    scale: 0.8,
    loopOverride: false
  }
] as const;

export function DevCanvasVfxDemoScreen(): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef(0);
  const requestsRef = useRef<readonly CanvasPresentationSpriteVfxRequest[]>(createDemoRequests(0));
  const pausedRef = useRef(false);
  const stepTokenRef = useRef(0);
  const [spriteRegistry, setSpriteRegistry] = useState<SpriteAssetRegistry | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [paused, setPaused] = useState(false);
  const [stepToken, setStepToken] = useState(0);
  const [requests, setRequests] = useState<readonly CanvasPresentationSpriteVfxRequest[]>(requestsRef.current);
  const [statusFrame, setStatusFrame] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void loadSpriteAssetRegistry()
      .then((registry) => {
        if (!cancelled) {
          setSpriteRegistry(registry);
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
  }, []);

  useEffect(() => {
    requestsRef.current = requests;
  }, [requests]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    stepTokenRef.current = stepToken;
  }, [stepToken]);

  const renderer = useMemo(() => {
    if (spriteRegistry === undefined) {
      return undefined;
    }
    return new CanvasRenderer({
      combatVfxRenderer: new CombatVfxRenderer({ spriteRegistry })
    });
  }, [spriteRegistry]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d") ?? null;
    if (canvas === null || context === null || renderer === undefined) {
      return;
    }

    let running = true;
    let animationFrameId = 0;
    let consumedStepToken = stepTokenRef.current;
    let metricCountdown = 0;

    const draw = (): void => {
      if (!running) {
        return;
      }
      if (!pausedRef.current) {
        frameRef.current += 1;
      } else if (stepTokenRef.current !== consumedStepToken) {
        frameRef.current += 1;
        consumedStepToken = stepTokenRef.current;
      }

      renderer.renderFrame(context, createDemoFrame(frameRef.current, requestsRef.current));
      metricCountdown -= 1;
      if (metricCountdown <= 0) {
        metricCountdown = 12;
        setStatusFrame(frameRef.current);
      }

      animationFrameId = window.requestAnimationFrame(draw);
    };

    animationFrameId = window.requestAnimationFrame(draw);
    return () => {
      running = false;
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [renderer]);

  const playAll = (): void => {
    const next = createDemoRequests(frameRef.current);
    requestsRef.current = next;
    setRequests(next);
  };
  const playOne = (assetId: string): void => {
    const demo = DEMO_ASSETS.find((item) => item.assetId === assetId) ?? DEMO_ASSETS[0];
    const next = [createRequest(demo, frameRef.current, 0)];
    requestsRef.current = next;
    setRequests(next);
  };

  return (
    <main className="dev-canvas-vfx-screen">
      <canvas ref={canvasRef} className="dev-canvas-vfx-canvas" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} data-testid="dev-canvas-vfx-canvas" />
      <section className="dev-canvas-vfx-toolbar" aria-label="Canvas Sprite VFX controls">
        <div className="dev-canvas-vfx-title">
          <strong>Canvas Sprite VFX</strong>
          <span>{error ?? (spriteRegistry === undefined ? "Loading sprite assets" : `Frame ${statusFrame} · ${requests.length} sprite requests`)}</span>
        </div>
        <button type="button" onClick={playAll}>
          Play All
        </button>
        <button type="button" onClick={() => setPaused((value) => !value)}>
          {paused ? "Resume" : "Pause"}
        </button>
        <button type="button" onClick={() => setStepToken((value) => value + 1)}>
          Step
        </button>
      </section>
      <aside className="dev-canvas-vfx-list" aria-label="Canvas Sprite VFX asset list">
        {DEMO_ASSETS.map((asset) => (
          <button key={asset.assetId} type="button" onClick={() => playOne(asset.assetId)}>
            <strong>{asset.label}</strong>
            <span>{asset.assetId}</span>
          </button>
        ))}
      </aside>
    </main>
  );
}

function createDemoRequests(startFrame: number): readonly CanvasPresentationSpriteVfxRequest[] {
  return DEMO_ASSETS.map((asset, index) => createRequest(asset, startFrame, index));
}

function createRequest(asset: (typeof DEMO_ASSETS)[number], startFrame: number, index: number): CanvasPresentationSpriteVfxRequest {
  return {
    id: `${asset.assetId.replace(/\./g, "_")}_${startFrame}_${index}`,
    assetId: asset.assetId,
    position: asset.position,
    startFrame: startFrame + asset.startOffset,
    layerId: asset.assetId.includes("lightning") ? "tribulation_strikes" : "foreground_effects",
    scale: asset.scale,
    alpha: 0.92,
    loopOverride: asset.loopOverride,
    blendModeOverride: "screen"
  };
}

function createDemoFrame(frame: number, spriteVfx: readonly CanvasPresentationSpriteVfxRequest[]): CanvasRenderFrame {
  return {
    viewState: createDemoViewState(frame),
    effectEvents: [],
    presentation: createDemoPresentation(frame, spriteVfx)
  };
}

function createDemoPresentation(frame: number, spriteVfx: readonly CanvasPresentationSpriteVfxRequest[]): CanvasPresentationState {
  return {
    frame,
    screen: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    players: [],
    enemies: [],
    playerProjectiles: [],
    enemyProjectiles: [],
    pickups: [],
    warnings: [],
    visualEvents: [],
    spriteVfx
  };
}

function createDemoViewState(frame: number): InRunUiViewState {
  return {
    mode: "combat",
    screen: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      scale: 1,
      safeArea: { x: 360, y: 0, width: 1200, height: 1080 }
    },
    players: [],
    teamInsight: {
      visible: true,
      teamLevel: 1,
      exp: frame % 120,
      expToNext: 120,
      progress01: (frame % 120) / 120,
      nextTriggerText: "Canvas sprite VFX demo",
      sharedFortuneReroll: 2,
      isReadyToInsight: false
    },
    stage: {
      stageName: "BAS-C005",
      segmentName: "Sprite/VFX playback",
      segmentIndex: 1,
      segmentCount: 1,
      timeRemaining: 0,
      intensity: "medium"
    },
    prompts: []
  };
}
