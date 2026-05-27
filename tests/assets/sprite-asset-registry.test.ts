import { describe, expect, it, vi, afterEach } from "vitest";

import { Combat2dAssetRegistry, type Combat2dManifest } from "../../src/assets/CombatAssetRegistry";
import { SpriteAssetRegistry, loadSpriteAssetRegistry, type SpriteImageLike } from "../../src/render/SpriteAssetRegistry";

describe("SpriteAssetRegistry", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the combat 2D manifest, preloads image assets, and returns image metadata by asset id", async () => {
    const manifest = createManifest();
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => manifest
    }));
    vi.stubGlobal("fetch", fetchSpy);

    const registry = await loadSpriteAssetRegistry({
      imageLoader: async () => image(300, 200)
    });

    expect(fetchSpy).toHaveBeenCalledWith("/assets/2d/manifest.v0.1.json");
    expect(registry.get("vfx.explosion.small_01")).toEqual(
      expect.objectContaining({
        id: "vfx.explosion.small_01",
        available: true,
        fallback: false,
        entry: expect.objectContaining({ frameWidth: 100, frameHeight: 100, frameCount: 6 })
      })
    );
    expect(registry.get("vfx.explosion.small_01").image.width).toBe(300);
  });

  it("throws a readable error when a required non-planned sprite cannot be loaded", async () => {
    const combatRegistry = new Combat2dAssetRegistry(createManifest());

    await expect(
      SpriteAssetRegistry.preload(combatRegistry, {
        imageLoader: async () => {
          throw new Error("not found");
        }
      })
    ).rejects.toThrow("Failed to preload required sprite asset vfx.explosion.small_01");
  });

  it("uses an in-memory fallback for planned or optional missing sprite assets", async () => {
    const combatRegistry = new Combat2dAssetRegistry(createManifest());
    const fallbackImage = image(1, 1);

    const registry = await SpriteAssetRegistry.preload(combatRegistry, {
      fallbackImage,
      imageLoader: async (path) => {
        if (path.includes("missing") || path.includes("optional")) {
          throw new Error("missing fixture");
        }
        return image(300, 200);
      }
    });

    expect(registry.get("vfx.planned.missing")).toEqual(
      expect.objectContaining({
        available: false,
        fallback: true,
        image: fallbackImage
      })
    );
    expect(registry.get("vfx.optional.missing")).toEqual(
      expect.objectContaining({
        available: false,
        fallback: true,
        image: fallbackImage
      })
    );
  });
});

function createManifest(): Combat2dManifest {
  return {
    version: "0.1",
    namespace: "assets.2d.combat",
    root: "/assets/2d/",
    assets: {
      "vfx.explosion.small_01": asset({
        path: "/assets/2d/combat/vfx/explosion_small_01.png",
        type: "spriteSheet",
        category: "explosion",
        frameWidth: 100,
        frameHeight: 100,
        frameCount: 6,
        fps: 12,
        loop: false
      }),
      "vfx.planned.missing": asset({
        path: "/assets/2d/combat/vfx/missing.png",
        type: "spriteSheet",
        category: "planned",
        frameWidth: 32,
        frameHeight: 32,
        frameCount: 4,
        fps: 8,
        planned: true,
        required: false
      }),
      "vfx.optional.missing": asset({
        path: "/assets/2d/combat/vfx/optional.png",
        type: "image",
        category: "optional",
        required: false
      })
    }
  };
}

function asset(overrides: Partial<Combat2dManifest["assets"][string]>): Combat2dManifest["assets"][string] {
  return {
    path: "/assets/2d/test.png",
    type: "image",
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
    ...overrides
  };
}

function image(width: number, height: number): SpriteImageLike {
  return { width, height } as unknown as SpriteImageLike;
}
