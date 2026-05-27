import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";

import { loadThreeAssetRegistry, type ThreeAssetRegistry } from "../../assets/ThreeAssetRegistry";
import { createBrowserGameRuntime, type BrowserGameRuntime, type BrowserGameSnapshot } from "../BrowserGameRuntime";
import { advanceFixedStepLoop, createFixedStepLoopState, type FixedStepLoopState } from "../FixedBrowserLoop";
import { LocalKeyboardInputSource } from "../LocalKeyboardInput";
import { CanvasRenderer } from "../../render/CanvasRenderer";
import { buildCombat3dViewState, type Combat3dMetrics, type Combat3dViewState } from "../../render/three/Combat3dViewState";
import { Combat3dRenderer } from "../../render/three/Combat3dRenderer";

export interface Dev3dCombatLabScreenProps {
  readonly enableRuntime?: boolean;
}

type LabRendererMode = "canvas" | "three";

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const ZERO_METRICS: Combat3dMetrics = {
  objectCount: 0,
  activeBullets: 0,
  modelCount: 0,
  fallbackCount: 0
};

export function Dev3dCombatLabScreen({ enableRuntime = typeof window !== "undefined" }: Dev3dCombatLabScreenProps): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rendererMode, setRendererMode] = useState<LabRendererMode>("three");
  const [stressBullets, setStressBullets] = useState(() => initialStressEnabled());
  const [snapshot, setSnapshot] = useState<BrowserGameSnapshot | undefined>(undefined);
  const [assetRegistry, setAssetRegistry] = useState<ThreeAssetRegistry | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    if (!enableRuntime) {
      return;
    }
    let cancelled = false;
    void loadThreeAssetRegistry()
      .then((registry) => {
        if (!cancelled) {
          setAssetRegistry(registry);
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
  }, [enableRuntime]);

  useEffect(() => {
    if (!enableRuntime) {
      return;
    }

    const runtime = createBrowserGameRuntime({ mode: "local_coop", screenWidth: CANVAS_WIDTH, screenHeight: CANVAS_HEIGHT });
    const keyboard = new LocalKeyboardInputSource(["p1", "p2"]);
    const canvasRenderer = new CanvasRenderer();
    let running = true;
    let latestSnapshot = runtime.getSnapshot();
    let loopState: FixedStepLoopState = createFixedStepLoopState();
    let frameCount = 0;
    let fpsWindowStartedAt = 0;
    let animationId = 0;

    setSnapshot(latestSnapshot);

    const keydown = (event: KeyboardEvent): void => {
      keyboard.setKeyDown(event.code, true);
      if (isGameplayKey(event.code)) {
        event.preventDefault();
      }
    };
    const keyup = (event: KeyboardEvent): void => {
      keyboard.setKeyDown(event.code, false);
      if (isGameplayKey(event.code)) {
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);

    const tick = (timestampMs: number): void => {
      if (!running) {
        return;
      }

      const loopAdvance = advanceFixedStepLoop(loopState, timestampMs);
      loopState = loopAdvance.state;
      for (let tickIndex = 0; tickIndex < loopAdvance.ticksToRun; tickIndex += 1) {
        latestSnapshot = runtime.step(keyboard.createFrameInputs(latestSnapshot.simState.frame));
      }

      renderCanvasIfReady(canvasRef.current, canvasRenderer, latestSnapshot);
      setSnapshot(latestSnapshot);
      frameCount += 1;
      if (fpsWindowStartedAt === 0) {
        fpsWindowStartedAt = timestampMs;
      }
      if (timestampMs - fpsWindowStartedAt >= 500) {
        setFps(Math.round((frameCount * 1000) / Math.max(1, timestampMs - fpsWindowStartedAt)));
        frameCount = 0;
        fpsWindowStartedAt = timestampMs;
      }
      animationId = window.requestAnimationFrame(tick);
    };

    renderCanvasIfReady(canvasRef.current, canvasRenderer, latestSnapshot);
    animationId = window.requestAnimationFrame(tick);

    return () => {
      running = false;
      window.cancelAnimationFrame(animationId);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
    };
  }, [enableRuntime]);

  const combat3dView = useMemo<Combat3dViewState | undefined>(() => {
    if (snapshot === undefined || assetRegistry === undefined) {
      return undefined;
    }
    return buildCombat3dViewState(snapshot, assetRegistry, { stressBulletCount: stressBullets ? 1000 : 0 });
  }, [assetRegistry, snapshot, stressBullets]);

  const metrics = combat3dView?.metrics ?? ZERO_METRICS;

  return (
    <main className="dev-3d-combat-lab">
      <header className="dev-3d-combat-header">
        <div>
          <h1>3D Combat Lab</h1>
          <p>Experimental ViewState presentation · 2D simulation remains authoritative</p>
        </div>
        <div className="dev-3d-combat-controls" aria-label="3D combat lab controls">
          <button className={rendererMode === "canvas" ? "is-active" : ""} onClick={() => setRendererMode("canvas")} type="button">
            Canvas
          </button>
          <button className={rendererMode === "three" ? "is-active" : ""} onClick={() => setRendererMode("three")} type="button">
            Experimental 3D
          </button>
          <label>
            <input checked={stressBullets} onChange={(event) => setStressBullets(event.currentTarget.checked)} type="checkbox" /> 1000 bullet stress
          </label>
        </div>
      </header>

      {error === undefined ? null : <p className="dev-3d-combat-error">{error}</p>}

      <section className="dev-3d-combat-stage" data-renderer-mode={rendererMode}>
        <canvas
          aria-label="Existing Canvas combat renderer"
          className={`dev-3d-combat-canvas2d ${rendererMode === "canvas" ? "is-visible" : ""}`}
          height={CANVAS_HEIGHT}
          ref={canvasRef}
          width={CANVAS_WIDTH}
        />
        <section className={`dev-3d-combat-three ${rendererMode === "three" ? "is-visible" : ""}`} aria-label="Experimental 3D combat renderer">
          {enableRuntime && combat3dView !== undefined ? (
            <Combat3dRenderer viewState={combat3dView} />
          ) : (
            <div className="dev-3d-combat-placeholder">{enableRuntime ? "Loading 3D combat assets..." : "Runtime disabled for static render"}</div>
          )}
        </section>
        <DebugOverlay fps={fps} metrics={metrics} mode={rendererMode} snapshot={snapshot} />
      </section>
    </main>
  );
}

function DebugOverlay({
  fps,
  metrics,
  mode,
  snapshot
}: {
  readonly fps: number;
  readonly metrics: Combat3dMetrics;
  readonly mode: LabRendererMode;
  readonly snapshot: BrowserGameSnapshot | undefined;
}): ReactElement {
  return (
    <aside className="dev-3d-combat-debug" aria-label="3D combat lab debug overlay">
      <strong>{mode === "three" ? "Experimental 3D" : "Canvas"}</strong>
      <dl>
        <div>
          <dt>FPS</dt>
          <dd>{fps}</dd>
        </div>
        <div>
          <dt>Object count</dt>
          <dd>{metrics.objectCount}</dd>
        </div>
        <div>
          <dt>Active bullets</dt>
          <dd>{metrics.activeBullets}</dd>
        </div>
        <div>
          <dt>Model count</dt>
          <dd>{metrics.modelCount}</dd>
        </div>
        <div>
          <dt>Fallback count</dt>
          <dd>{metrics.fallbackCount}</dd>
        </div>
        <div>
          <dt>Frame</dt>
          <dd>{snapshot?.presentation.frame ?? 0}</dd>
        </div>
      </dl>
    </aside>
  );
}

function renderCanvasIfReady(canvas: HTMLCanvasElement | null, renderer: CanvasRenderer, snapshot: BrowserGameSnapshot): void {
  if (canvas === null) {
    return;
  }
  const context = canvas.getContext("2d");
  if (context !== null) {
    renderer.renderFrame(context, snapshot);
  }
}

function initialStressEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get("stress") === "1000" || params.get("stressBullets") === "1000";
}

function isGameplayKey(code: string): boolean {
  return (
    code.startsWith("Key") ||
    code.startsWith("Digit") ||
    code.startsWith("Numpad") ||
    code.startsWith("Arrow") ||
    code === "ShiftLeft" ||
    code === "ShiftRight" ||
    code === "Space" ||
    code === "Enter" ||
    code === "Escape" ||
    code === "Backspace"
  );
}
