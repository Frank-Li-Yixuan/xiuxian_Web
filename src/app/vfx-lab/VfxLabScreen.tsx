import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";

import { CanvasRenderer, type CanvasRenderFrame } from "../../render/CanvasRenderer";
import {
  VFX_LAB_PRESETS,
  VFX_LAB_SCENARIOS,
  createVfxLabFrame,
  createVfxLabReadabilitySummary,
  type VfxLabPresetId,
  type VfxLabScenarioId
} from "./VfxLabModel";

interface VfxLabMetrics {
  readonly fps: number;
  readonly frame: number;
  readonly particles: number;
  readonly bullets: number;
  readonly flags: readonly string[];
}

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

export function VfxLabScreen(): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scenarioId, setScenarioId] = useState<VfxLabScenarioId>("five_thunder_chain");
  const [presetId, setPresetId] = useState<VfxLabPresetId>("balanced");
  const [paused, setPaused] = useState(false);
  const [stepToken, setStepToken] = useState(0);
  const [metrics, setMetrics] = useState<VfxLabMetrics>({
    fps: 0,
    frame: 0,
    particles: 0,
    bullets: 0,
    flags: []
  });
  const renderer = useMemo(() => new CanvasRenderer(), []);
  const labFrameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d") ?? null;
    if (canvas === null || context === null) {
      return;
    }

    let running = true;
    let animationFrameId = 0;
    let lastTimestamp = 0;
    let metricCountdown = 0;
    let consumedStepToken = paused ? stepToken - 1 : stepToken;

    const render = (timestamp: number): void => {
      if (!running) {
        return;
      }
      if (!paused) {
        labFrameRef.current += 1;
      } else if (stepToken !== consumedStepToken) {
        labFrameRef.current += 1;
        consumedStepToken = stepToken;
      }
      const frame = createVfxLabFrame({ scenarioId, presetId, frame: labFrameRef.current });
      const summary = createVfxLabReadabilitySummary(frame);
      renderer.renderFrame(context, frame as CanvasRenderFrame);

      metricCountdown -= 1;
      if (metricCountdown <= 0) {
        const delta = lastTimestamp > 0 ? timestamp - lastTimestamp : 16.67;
        lastTimestamp = timestamp;
        metricCountdown = 10;
        setMetrics({
          fps: Math.round(1000 / Math.max(1, delta / 10)),
          frame: frame.presentation.frame,
          particles: summary.activeParticleBudget,
          bullets: summary.enemyBulletCount,
          flags: summary.flags
        });
      }

      animationFrameId = window.requestAnimationFrame(render);
    };

    animationFrameId = window.requestAnimationFrame(render);

    return () => {
      running = false;
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [paused, presetId, renderer, scenarioId, stepToken]);

  return (
    <main className="vfx-lab-shell">
      <canvas ref={canvasRef} className="vfx-lab-canvas" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} data-testid="vfx-lab-canvas" />
      <section className="vfx-lab-toolbar" aria-label="VFX Lab controls">
        <div className="vfx-lab-title">
          <strong>VFX Lab</strong>
          <span>Canvas 2D / EffectEvent / ReadabilityGuard</span>
        </div>
        <label>
          场景
          <select value={scenarioId} onChange={(event) => setScenarioId(event.currentTarget.value as VfxLabScenarioId)}>
            {VFX_LAB_SCENARIOS.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          强度
          <select value={presetId} onChange={(event) => setPresetId(event.currentTarget.value as VfxLabPresetId)}>
            {VFX_LAB_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => setPaused((value) => !value)}>
          {paused ? "继续" : "暂停"}
        </button>
        <button type="button" onClick={() => setStepToken((value) => value + 1)}>
          逐帧
        </button>
      </section>
      <aside className="vfx-lab-metrics" aria-label="VFX Lab metrics">
        <div>
          <span>FPS</span>
          <strong>{metrics.fps}</strong>
        </div>
        <div>
          <span>Frame</span>
          <strong>{metrics.frame}</strong>
        </div>
        <div>
          <span>Bullets</span>
          <strong>{metrics.bullets}</strong>
        </div>
        <div>
          <span>Particles</span>
          <strong>{metrics.particles}</strong>
        </div>
        <div className="vfx-lab-flags">
          <span>Readability</span>
          <strong>{metrics.flags.length > 0 ? metrics.flags.join(" / ") : "clear"}</strong>
        </div>
      </aside>
    </main>
  );
}
