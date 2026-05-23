import { describe, expect, it } from "vitest";

import { createRenderVfxParticles } from "../../src/render/RenderVfxTimeline";
import type { CanvasPresentationVisualEvent } from "../../src/render/CanvasPresentationState";

describe("RenderVfxTimeline", () => {
  it("derives deterministic render-only particles from visual events within budget", () => {
    const events: readonly CanvasPresentationVisualEvent[] = [
      {
        id: "kill_42",
        kind: "kill_burst",
        frame: 120,
        position: { x: 900, y: 420 },
        color: "#f43f5e",
        text: "破",
        intensity: "medium"
      },
      {
        id: "pickup_7",
        kind: "pickup",
        frame: 120,
        position: { x: 930, y: 440 },
        color: "#34d399",
        text: "灵",
        intensity: "micro"
      }
    ];

    const first = createRenderVfxParticles({ frame: 126, events, budget: 18 });
    const second = createRenderVfxParticles({ frame: 126, events, budget: 18 });

    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(4);
    expect(first.length).toBeLessThanOrEqual(18);
    expect(first[0]).toEqual(
      expect.objectContaining({
        color: "#f43f5e",
        alpha: expect.any(Number)
      })
    );
    expect(first.some((particle) => particle.position.x !== 900 || particle.position.y !== 420)).toBe(true);
  });
});
