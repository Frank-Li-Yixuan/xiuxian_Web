import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const MANIFEST_PATH = join(ROOT, "public/assets/3d/manifest.v0.1.json");
const FRAME_WIDTH = 128;
const FRAME_HEIGHT = 128;
const FRAME_COUNT = 20;

const ENTITY_BAKES = [
  {
    id: "entity.player.cultivator_01",
    source3dId: "player.baseHumanoid",
    outputPath: "public/assets/2d/combat/player/player_cultivator_01.png",
    modelScale: 0.95,
    materialTint: "#dbeafe",
    overlayTint: "rgba(34, 211, 238, 0.16)",
    shadow: "rgba(34, 211, 238, 0.22)"
  },
  {
    id: "entity.player.soul_01",
    source3dId: "player.baseHumanoid",
    outputPath: "public/assets/2d/combat/player/player_soul_01.png",
    modelScale: 0.9,
    materialTint: "#c4b5fd",
    overlayTint: "rgba(250, 204, 21, 0.24)",
    shadow: "rgba(196, 181, 253, 0.28)",
    opacity: 0.72
  },
  {
    id: "entity.enemy.mountain_imp_01",
    source3dId: "enemy.smallImp",
    outputPath: "public/assets/2d/combat/enemies/mountain_imp_01.png",
    modelScale: 1.06,
    materialTint: "#86efac",
    overlayTint: "rgba(34, 197, 94, 0.18)",
    shadow: "rgba(34, 197, 94, 0.2)"
  },
  {
    id: "entity.enemy.wolf_demon_01",
    source3dId: "enemy.wolfBeast",
    outputPath: "public/assets/2d/combat/enemies/wolf_demon_01.png",
    modelScale: 1.18,
    materialTint: "#fecdd3",
    overlayTint: "rgba(244, 63, 94, 0.22)",
    shadow: "rgba(244, 63, 94, 0.26)"
  },
  {
    id: "entity.enemy.elite_split_wind_wolf_01",
    source3dId: "enemy.wolfBeast",
    outputPath: "public/assets/2d/combat/enemies/elite_split_wind_wolf_01.png",
    modelScale: 1.34,
    materialTint: "#fed7aa",
    overlayTint: "rgba(249, 115, 22, 0.28)",
    shadow: "rgba(249, 115, 22, 0.32)"
  },
  {
    id: "entity.enemy.rogue_cultivator_shadow_01",
    source3dId: "player.baseHumanoid",
    outputPath: "public/assets/2d/combat/enemies/rogue_cultivator_shadow_01.png",
    modelScale: 0.9,
    materialTint: "#a855f7",
    overlayTint: "rgba(88, 28, 135, 0.38)",
    shadow: "rgba(168, 85, 247, 0.3)",
    opacity: 0.88
  },
  {
    id: "entity.enemy.stone_armor_demon_01",
    source3dId: "enemy.stoneGolem",
    outputPath: "public/assets/2d/combat/enemies/stone_armor_demon_01.png",
    modelScale: 1.18,
    materialTint: "#fde68a",
    overlayTint: "rgba(202, 138, 4, 0.24)",
    shadow: "rgba(250, 204, 21, 0.26)"
  }
];

const CONTENT_TYPES = {
  ".bin": "application/octet-stream",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".wasm": "application/wasm"
};

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  const sourceById = new Map(manifest.assets.map((asset) => [asset.id, asset]));
  const server = await startStaticServer(ROOT);
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: FRAME_WIDTH * FRAME_COUNT, height: FRAME_HEIGHT } });
    await page.goto(`${server.url}/__bake_entity_sprites.html`);
    await page.waitForFunction(() => globalThis.__entitySpriteBakeReady === true, undefined, { timeout: 20_000 });

    for (const bake of ENTITY_BAKES) {
      const source = sourceById.get(bake.source3dId);
      if (source === undefined) {
        throw new Error(`Missing 3D source asset ${bake.source3dId} for ${bake.id}`);
      }
      if (source.license !== "CC0" && source.license !== "Public Domain") {
        throw new Error(`Source asset ${source.id} has unsupported license ${source.license}`);
      }
      const dataUrl = await page.evaluate((config) => globalThis.__bakeEntitySpriteSheet(config), {
        ...bake,
        sourcePath: source.path,
        frameWidth: FRAME_WIDTH,
        frameHeight: FRAME_HEIGHT,
        frameCount: FRAME_COUNT
      });
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
      const outputPath = join(ROOT, bake.outputPath);
      await mkdir(resolve(outputPath, ".."), { recursive: true });
      await writeFile(outputPath, Buffer.from(base64, "base64"));
      console.log(`${bake.id} -> ${bake.outputPath}`);
    }
  } finally {
    await browser?.close();
    await server.close();
  }
}

async function startStaticServer(root) {
  const html = bakePageHtml();
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      if (requestUrl.pathname === "/__bake_entity_sprites.html") {
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end(html);
        return;
      }
      const filePath = resolve(root, `.${decodeURIComponent(requestUrl.pathname)}`);
      if (!filePath.startsWith(root)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }
      const bytes = await readFile(filePath);
      response.writeHead(200, { "content-type": CONTENT_TYPES[extname(filePath)] ?? "application/octet-stream" });
      response.end(bytes);
    } catch (error) {
      response.writeHead(404);
      response.end(error instanceof Error ? error.message : String(error));
    }
  });

  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  if (typeof address !== "object" || address === null) {
    throw new Error("Failed to bind local static server");
  }
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolveClose, rejectClose) => server.close((error) => (error === undefined ? resolveClose() : rejectClose(error))))
  };
}

function bakePageHtml() {
  return String.raw`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Entity Sprite Bake</title>
  <script type="importmap">
    {
      "imports": {
        "three": "/node_modules/three/build/three.module.js"
      }
    }
  </script>
</head>
<body>
  <script type="module">
    import * as THREE from "three";
    import { GLTFLoader } from "/node_modules/three/examples/jsm/loaders/GLTFLoader.js";

    const loader = new GLTFLoader();

    globalThis.__bakeEntitySpriteSheet = async function bakeEntitySpriteSheet(config) {
      const sheet = document.createElement("canvas");
      sheet.width = config.frameWidth * config.frameCount;
      sheet.height = config.frameHeight;
      const sheetContext = sheet.getContext("2d", { willReadFrequently: true });
      const renderCanvas = document.createElement("canvas");
      renderCanvas.width = config.frameWidth;
      renderCanvas.height = config.frameHeight;
      const renderer = new THREE.WebGLRenderer({
        canvas: renderCanvas,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true
      });
      renderer.setPixelRatio(1);
      renderer.setSize(config.frameWidth, config.frameHeight, false);
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      try {
        const model = await loadModel(config);
        const scene = new THREE.Scene();
        scene.add(new THREE.AmbientLight(0xffffff, 2.2));
        const key = new THREE.DirectionalLight(0xffffff, 3);
        key.position.set(2.6, 3.8, 4.2);
        scene.add(key);
        const rim = new THREE.DirectionalLight(new THREE.Color(config.materialTint), 1.3);
        rim.position.set(-2.4, 1.8, -3.2);
        scene.add(rim);
        scene.add(model);
        normalizeModel(model, config.modelScale ?? 1);

        const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 100);
        camera.position.set(0, 0.22, 4.35);
        camera.lookAt(0, 0.08, 0);

        for (let frame = 0; frame < config.frameCount; frame += 1) {
          setAnimationPose(model, frame, config);
          renderer.render(scene, camera);
          drawFrame(sheetContext, renderCanvas, frame, config);
        }
      } catch (error) {
        console.warn("3D bake failed; using local silhouette fallback for", config.id, error);
        drawFallbackSheet(sheetContext, config);
      } finally {
        renderer.dispose();
      }

      return sheet.toDataURL("image/png");
    };

    async function loadModel(config) {
      const gltf = await loader.loadAsync(config.sourcePath);
      const root = gltf.scene;
      const tint = new THREE.Color(config.materialTint ?? "#ffffff");
      root.traverse((object) => {
        if (!object.isMesh) {
          return;
        }
        object.castShadow = false;
        object.receiveShadow = false;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        const cloned = materials.map((material) => {
          const next = material.clone();
          if (next.color !== undefined) {
            next.color.multiply(tint);
          }
          if (config.opacity !== undefined) {
            next.transparent = true;
            next.opacity = config.opacity;
          }
          next.needsUpdate = true;
          return next;
        });
        object.material = Array.isArray(object.material) ? cloned : cloned[0];
      });
      return root;
    }

    function normalizeModel(model, modelScale) {
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      model.position.sub(center);
      const maxDimension = Math.max(size.x, size.y, size.z, 0.0001);
      model.scale.multiplyScalar((2.15 * modelScale) / maxDimension);
      model.position.y -= 0.06;
    }

    function setAnimationPose(model, frame, config) {
      const clipIndex = Math.floor(frame / 4);
      const local = frame % 4;
      const swing = Math.sin((local / 4) * Math.PI * 2);
      model.rotation.set(0, -0.65 + frame * 0.055, 0);
      model.position.x = 0;
      model.position.y = -0.06 + Math.sin(frame * 0.7) * 0.018;
      if (clipIndex === 1) {
        model.rotation.z = swing * 0.08;
        model.position.x = swing * 0.04;
      } else if (clipIndex === 2) {
        model.rotation.x = -0.16 - local * 0.035;
        model.rotation.z = swing * 0.12;
      } else if (clipIndex === 3) {
        model.rotation.z = swing * 0.22;
        model.position.x = -swing * 0.03;
      } else if (clipIndex === 4) {
        model.rotation.z = -0.45 - local * 0.15;
        model.position.y = -0.18 - local * 0.045;
      } else {
        model.rotation.z = swing * 0.035;
      }
      if (config.id.includes("wolf")) {
        model.rotation.x += -0.08;
      }
      if (config.id.includes("soul")) {
        model.position.y += Math.sin(frame * 0.8) * 0.05;
      }
    }

    function drawFrame(context, renderCanvas, frame, config) {
      const x = frame * config.frameWidth;
      context.save();
      context.translate(x, 0);
      context.fillStyle = config.shadow ?? "rgba(255,255,255,0.18)";
      context.beginPath();
      context.ellipse(config.frameWidth / 2, config.frameHeight * 0.78, config.frameWidth * 0.27, config.frameHeight * 0.07, 0, 0, Math.PI * 2);
      context.fill();
      context.drawImage(renderCanvas, 0, 0);
      if (config.overlayTint !== undefined) {
        context.globalCompositeOperation = "source-atop";
        context.fillStyle = config.overlayTint;
        context.fillRect(0, 0, config.frameWidth, config.frameHeight);
        context.globalCompositeOperation = "source-over";
      }
      if (config.id.includes("soul")) {
        context.strokeStyle = "rgba(250, 204, 21, 0.58)";
        context.lineWidth = 2;
        context.beginPath();
        context.ellipse(config.frameWidth / 2, config.frameHeight * 0.5, 31, 44, 0, 0, Math.PI * 2);
        context.stroke();
      }
      context.restore();
    }

    function drawFallbackSheet(context, config) {
      for (let frame = 0; frame < config.frameCount; frame += 1) {
        const x = frame * config.frameWidth;
        const clipIndex = Math.floor(frame / 4);
        const pulse = Math.sin(frame * 0.8) * 3;
        context.save();
        context.translate(x + config.frameWidth / 2, config.frameHeight / 2);
        context.fillStyle = config.shadow ?? "rgba(255,255,255,0.18)";
        context.beginPath();
        context.ellipse(0, 38, 34, 8, 0, 0, Math.PI * 2);
        context.fill();
        context.rotate(clipIndex === 4 ? -0.5 : pulse * 0.015);
        context.fillStyle = config.materialTint ?? "#ffffff";
        context.globalAlpha = config.opacity ?? 0.9;
        context.beginPath();
        context.ellipse(0, -4, config.id.includes("stone") ? 28 : 20, config.id.includes("wolf") ? 17 : 32, 0, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = config.overlayTint?.replace(/0\.\d+\)$/, "0.82)") ?? "rgba(255,255,255,0.72)";
        context.lineWidth = 3;
        context.stroke();
        context.restore();
      }
    }

    globalThis.__entitySpriteBakeReady = true;
  </script>
</body>
</html>`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
