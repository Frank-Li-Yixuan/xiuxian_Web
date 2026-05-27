import { describe, expect, it } from "vitest";

import type { Combat2dAssetEntry } from "../../src/assets/CombatAssetRegistry";
import { SpriteSheetAnimator } from "../../src/render/SpriteSheetAnimator";

describe("SpriteSheetAnimator", () => {
  it("selects sprite-sheet frames from fixed 60 FPS render frames and wraps looping animations", () => {
    const animator = new SpriteSheetAnimator(spriteAsset({ fps: 12, frameCount: 6, loop: true }), { width: 96, height: 32 });

    expect(animator.frameAt({ currentFrame: 0, startFrame: 0 })).toEqual({
      index: 0,
      source: { x: 0, y: 0, width: 32, height: 16 }
    });
    expect(animator.frameAt({ currentFrame: 5, startFrame: 0 })).toEqual({
      index: 1,
      source: { x: 32, y: 0, width: 32, height: 16 }
    });
    expect(animator.frameAt({ currentFrame: 15, startFrame: 0 })).toEqual({
      index: 3,
      source: { x: 0, y: 16, width: 32, height: 16 }
    });
    expect(animator.frameAt({ currentFrame: 30, startFrame: 0 })).toEqual({
      index: 0,
      source: { x: 0, y: 0, width: 32, height: 16 }
    });
    expect(animator.isComplete({ currentFrame: 30, startFrame: 0 })).toBe(false);
  });

  it("clamps non-looping animations to the final frame and reports completion", () => {
    const animator = new SpriteSheetAnimator(spriteAsset({ fps: 60, frameCount: 4, loop: false }), { width: 64, height: 32 });

    expect(animator.frameAt({ currentFrame: 9, startFrame: 3 })).toEqual({
      index: 3,
      source: { x: 32, y: 16, width: 32, height: 16 }
    });
    expect(animator.isComplete({ currentFrame: 6, startFrame: 3 })).toBe(false);
    expect(animator.isComplete({ currentFrame: 7, startFrame: 3 })).toBe(true);
  });

  it("allows loop override when presentation requests need a one-shot loopable asset", () => {
    const animator = new SpriteSheetAnimator(spriteAsset({ fps: 60, frameCount: 2, loop: true }), { width: 64, height: 16 });

    expect(animator.isComplete({ currentFrame: 3, startFrame: 0 })).toBe(false);
    expect(animator.isComplete({ currentFrame: 3, startFrame: 0, loopOverride: false })).toBe(true);
  });
});

function spriteAsset(overrides: Partial<Combat2dAssetEntry>): Combat2dAssetEntry {
  return {
    id: "vfx.test.sprite",
    path: "/assets/2d/test.png",
    type: "spriteSheet",
    category: "test",
    sourceName: "Test Source",
    sourceUrl: "https://example.com/test",
    author: "Test Author",
    license: "CC0",
    attributionRequired: false,
    downloadDate: "2026-05-26",
    originalFileName: "test.png",
    required: true,
    notes: "Fixture.",
    frameWidth: 32,
    frameHeight: 16,
    frameCount: 4,
    fps: 12,
    loop: false,
    ...overrides
  };
}
