#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "@playwright/test";

const SCREENSHOT_SCENARIOS = [
  {
    id: "01_initial_combat",
    title: "Initial Combat",
    description: "Default combat playground view with entity sprites, bullets, pickups, VFX, and parallax background.",
    buttons: []
  },
  {
    id: "02_bullets_pickups",
    title: "Bullets And Pickups",
    description: "Projectile skins, 100 enemy bullets, pickup sprites, and magnet collection trails.",
    buttons: ["Play Magnet"]
  },
  {
    id: "03_hit_death_vfx",
    title: "Hit And Death VFX",
    description: "Impact/death visual events plus entity death animation mode.",
    buttons: ["Death"]
  },
  {
    id: "04_spell_vfx",
    title: "Spell VFX",
    description: "Five Thunder, Bagua sword ring, Red Lotus fire, and Sleeve Universe ability VFX.",
    buttons: ["Spells"]
  },
  {
    id: "05_pill_artifact_treasure",
    title: "Pill Artifact Treasure",
    description: "All spell, artifact, pill, and treasure presentation effects together.",
    buttons: ["Play All"]
  },
  {
    id: "06_boss_tribulation_warning",
    title: "Boss Tribulation Warning",
    description: "Tribulation sky profile with lethal warning ring and high-pressure readability dimming.",
    buttons: ["Tribulation Sky"]
  },
  {
    id: "07_high_density_pressure",
    title: "High Density Pressure",
    description: "100 enemy bullets with combat effects and outer battlefield background under simplified density mode.",
    buttons: ["Outer Battlefield", "Play All"]
  }
];

const PLAYGROUND_PATH = "/dev/combat-asset-playground";
const DEFAULT_VIEWPORT = { width: 1920, height: 1080 };
const REQUIRED_FPS_AVERAGE = 55;
const REQUIRED_BULLET_CORE_SAMPLES = 70;
const REQUIRED_HITBOX_BRIGHT_PIXELS = 18;
const AUDIO_BUS_ACTIVE_VOICE_CAP = 16;

export function formatArtifactDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function resolveOutputDir(options = {}) {
  const date = options.date ?? process.env.BAS_C012_DATE ?? formatArtifactDate();
  return path.resolve(options.rootDir ?? process.cwd(), "artifacts", "combat-asset-pass", date);
}

export function auditCombatAssetManifests(rootDir = process.cwd()) {
  const visualManifestPath = path.join(rootDir, "public", "assets", "2d", "manifest.v0.1.json");
  const audioManifestPath = path.join(rootDir, "public", "assets", "audio", "manifest.v0.1.json");
  const visualManifest = readJson(visualManifestPath);
  const audioManifest = readJson(audioManifestPath);
  const issues = [];
  const licenseCounts = {};
  const attributionRequired = [];
  const requiredMissing = [];
  const allowedLicenses = new Set(["CC0", "Public Domain"]);

  const visualEntries = Object.entries(visualManifest.assets ?? {});
  const audioEntries = Object.entries(audioManifest.assets ?? {});

  for (const [id, entry] of visualEntries) {
    recordLicense(licenseCounts, entry.license);
    validateEntry({
      id,
      entry,
      expectedPrefix: "/assets/2d/",
      localPublicPrefix: path.join(rootDir, "public", "assets", "2d"),
      allowedLicenses,
      attributionRequired,
      requiredMissing,
      issues
    });
  }

  for (const [id, entry] of audioEntries) {
    recordLicense(licenseCounts, entry.license);
    validateEntry({
      id,
      entry,
      expectedPrefix: "/assets/audio/",
      localPublicPrefix: path.join(rootDir, "public", "assets", "audio"),
      allowedLicenses,
      attributionRequired,
      requiredMissing,
      issues
    });
  }

  return {
    visualManifestPath: path.relative(rootDir, visualManifestPath).replaceAll("\\", "/"),
    audioManifestPath: path.relative(rootDir, audioManifestPath).replaceAll("\\", "/"),
    visualAssetCount: visualEntries.length,
    audioAssetCount: audioEntries.length,
    licenseCounts,
    attributionRequired,
    requiredMissing,
    pass: issues.length === 0,
    issues
  };
}

export function createMarkdownReport(report) {
  const screenshotRows = report.screenshots
    .map((screenshot) => `| ${screenshot.title} | \`${screenshot.path}\` | ${screenshot.description} |`)
    .join("\n");
  const readabilityIssues = report.readability.issues.length === 0 ? "None" : report.readability.issues.map((issue) => `- ${issue}`).join("\n");
  const licenseIssues = report.license.issues.length === 0 ? "None" : report.license.issues.map((issue) => `- ${issue}`).join("\n");

  return `# BAS-C012 Combat Asset Quality Gate

Generated: ${report.generatedAt}
Source: ${report.sourceUrl}

## Summary

- Result: **${report.pass ? "PASS" : "FAIL"}**
- Average FPS: **${report.performance.fpsAverage.toFixed(1)}** (minimum sampled: ${report.performance.fpsMin.toFixed(1)})
- Same-screen VFX budget: ${report.vfx.enemyBullets} enemy bullets, ${report.vfx.visualEvents} impact events, ${report.vfx.abilityVfx} ability VFX, ${report.vfx.pickups} pickups, ${report.vfx.playerProjectiles} player projectiles, ${report.vfx.warnings} warnings
- Audio voices: ${report.audio.activeVoicesDuringGate} active during screenshot gate, AudioBus cap ${report.audio.audioBusActiveVoiceCap}, manifest aggregate maxInstances ${report.audio.manifestAggregateMaxInstances}
- License check: ${report.license.pass ? "PASS" : "FAIL"} (${report.license.visualAssetCount} 2D assets, ${report.license.audioAssetCount} audio assets)
- Readability check: ${report.readability.pass ? "PASS" : "FAIL"} (${report.readability.enemyBulletWhiteCoreSamples}/100 enemy bullet white-core samples, ${report.readability.playerHitboxBrightPixels} hitbox bright pixels)

## Screenshots

| Scene | Path | Notes |
|---|---|---|
${screenshotRows}

## Performance

- Frame samples: ${report.performance.frameSamples}
- Average FPS: ${report.performance.fpsAverage.toFixed(2)}
- Minimum sampled FPS: ${report.performance.fpsMin.toFixed(2)}
- Threshold: average FPS >= ${REQUIRED_FPS_AVERAGE}

## Readability

- Nonblank canvas pixels (estimated): ${report.readability.nonblankPixelsEstimate}
- Enemy bullet white-core samples: ${report.readability.enemyBulletWhiteCoreSamples}/100
- Player hitbox bright pixels: ${report.readability.playerHitboxBrightPixels}
- Issues:
${readabilityIssues}

## Audio

- Active voices during screenshot gate: ${report.audio.activeVoicesDuringGate}
- AudioBus active voice cap: ${report.audio.audioBusActiveVoiceCap}
- Manifest aggregate maxInstances: ${report.audio.manifestAggregateMaxInstances}
- Loop assets: ${report.audio.loopAssetCount}

## License Audit

- Visual manifest: \`${report.license.visualManifestPath}\`
- Audio manifest: \`${report.license.audioManifestPath}\`
- License counts: ${Object.entries(report.license.licenseCounts)
    .map(([license, count]) => `${license}: ${count}`)
    .join(", ")}
- Attribution-required entries: ${report.license.attributionRequired.length}
- Required missing files: ${report.license.requiredMissing.length}
- Issues:
${licenseIssues}

## Scope Guard

This quality gate only exercises app/render/dev asset surfaces and artifact output. It does not write to \`src/sim/**\`.
`;
}

export function createReport({ generatedAt, sourceUrl, outputDir, screenshots, performance, canvasMetrics, license }) {
  const manifestAggregateMaxInstances = canvasMetrics.audioManifestMaxInstances;
  const readabilityIssues = [];
  if (canvasMetrics.nonblankPixelsEstimate <= 0) {
    readabilityIssues.push("Canvas appears blank.");
  }
  if (canvasMetrics.enemyBulletWhiteCoreSamples < REQUIRED_BULLET_CORE_SAMPLES) {
    readabilityIssues.push(
      `Enemy bullet white-core samples below threshold: ${canvasMetrics.enemyBulletWhiteCoreSamples}/${REQUIRED_BULLET_CORE_SAMPLES}.`
    );
  }
  if (canvasMetrics.playerHitboxBrightPixels < REQUIRED_HITBOX_BRIGHT_PIXELS) {
    readabilityIssues.push(
      `Player hitbox bright pixels below threshold: ${canvasMetrics.playerHitboxBrightPixels}/${REQUIRED_HITBOX_BRIGHT_PIXELS}.`
    );
  }

  const performanceIssues = [];
  if (performance.fpsAverage < REQUIRED_FPS_AVERAGE) {
    performanceIssues.push(`Average FPS below threshold: ${performance.fpsAverage.toFixed(1)} < ${REQUIRED_FPS_AVERAGE}.`);
  }

  const readability = {
    nonblankPixelsEstimate: canvasMetrics.nonblankPixelsEstimate,
    enemyBulletWhiteCoreSamples: canvasMetrics.enemyBulletWhiteCoreSamples,
    playerHitboxBrightPixels: canvasMetrics.playerHitboxBrightPixels,
    pass: readabilityIssues.length === 0,
    issues: readabilityIssues
  };
  const audio = {
    activeVoicesDuringGate: canvasMetrics.activeAudioElements,
    audioBusActiveVoiceCap: AUDIO_BUS_ACTIVE_VOICE_CAP,
    manifestAggregateMaxInstances,
    loopAssetCount: canvasMetrics.audioLoopAssets
  };
  const vfx = {
    enemyBullets: 100,
    visualEvents: 8,
    abilityVfx: 15,
    pickups: 4,
    playerProjectiles: 3,
    warnings: 2
  };

  return {
    version: "0.1",
    gate: "BAS-C012",
    generatedAt,
    sourceUrl,
    outputDir,
    screenshots,
    performance: {
      ...performance,
      pass: performanceIssues.length === 0,
      issues: performanceIssues
    },
    vfx,
    audio,
    license,
    readability,
    pass: performanceIssues.length === 0 && license.pass && readability.pass
  };
}

async function main() {
  const rootDir = process.cwd();
  const port = await findAvailablePort(5173);
  const outputDir = resolveOutputDir({ rootDir });
  await fsp.mkdir(outputDir, { recursive: true });

  const server = startViteServer(port);
  let browser;
  try {
    const sourceUrl = `http://127.0.0.1:${port}${PLAYGROUND_PATH}`;
    await waitForHttp(`http://127.0.0.1:${port}/`, 30_000);

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: DEFAULT_VIEWPORT, deviceScaleFactor: 1 });
    await page.goto(sourceUrl, { waitUntil: "networkidle" });
    await page.getByTestId("dev-combat-asset-playground-canvas").waitFor({ state: "visible", timeout: 20_000 });
    await page.addStyleTag({
      content:
        ".bas-c012-canvas-only .dev-combat-asset-playground-toolbar,.bas-c012-canvas-only .dev-combat-asset-playground-list{display:none!important;}"
    });
    await page.waitForTimeout(900);

    const screenshots = [];
    const canvasLocator = page.getByTestId("dev-combat-asset-playground-canvas");
    for (const scenario of SCREENSHOT_SCENARIOS) {
      for (const buttonName of scenario.buttons) {
        await page.getByRole("button", { name: buttonName, exact: true }).click();
        await page.waitForTimeout(260);
      }
      await page.waitForTimeout(420);
      const screenshotPath = path.join(outputDir, `${scenario.id}.png`);
      await page.evaluate(() => document.body.classList.add("bas-c012-canvas-only"));
      await canvasLocator.screenshot({ path: screenshotPath });
      await page.evaluate(() => document.body.classList.remove("bas-c012-canvas-only"));
      screenshots.push({
        id: scenario.id,
        title: scenario.title,
        description: scenario.description,
        path: path.relative(rootDir, screenshotPath).replaceAll("\\", "/")
      });
    }

    const performance = await sampleFps(page);
    const canvasMetrics = await sampleCanvasMetrics(page);
    const license = auditCombatAssetManifests(rootDir);
    const generatedAt = new Date().toISOString();
    const report = createReport({
      generatedAt,
      sourceUrl,
      outputDir: path.relative(rootDir, outputDir).replaceAll("\\", "/"),
      screenshots,
      performance,
      canvasMetrics,
      license
    });

    const reportJsonPath = path.join(outputDir, "quality-gate-report.json");
    const reportMarkdownPath = path.join(outputDir, "quality-gate-report.md");
    await fsp.writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await fsp.writeFile(reportMarkdownPath, createMarkdownReport(report), "utf8");

    console.log(`BAS-C012 combat quality gate ${report.pass ? "PASS" : "FAIL"}`);
    console.log(`Output: ${path.relative(rootDir, outputDir).replaceAll("\\", "/")}`);
    console.log(`Screenshots: ${screenshots.length}`);
    console.log(`Average FPS: ${performance.fpsAverage.toFixed(1)}`);
    console.log(`Enemy bullet white-core samples: ${report.readability.enemyBulletWhiteCoreSamples}/100`);
    console.log(`Audio voices: active=${report.audio.activeVoicesDuringGate}, cap=${report.audio.audioBusActiveVoiceCap}`);
    console.log(`License check: ${license.pass ? "PASS" : "FAIL"}`);

    if (!report.pass) {
      process.exitCode = 1;
      for (const issue of [...report.performance.issues, ...report.readability.issues, ...license.issues]) {
        console.error(issue);
      }
    }
  } finally {
    if (browser !== undefined) {
      await browser.close();
    }
    await stopServer(server);
  }
}

async function sampleFps(page) {
  return page.evaluate(
    async (sampleCount) =>
      new Promise((resolve) => {
        const deltas = [];
        let previous = 0;
        const step = (timestamp) => {
          if (previous > 0) {
            deltas.push(timestamp - previous);
          }
          previous = timestamp;
          if (deltas.length >= sampleCount) {
            const fpsSamples = deltas.map((delta) => (delta > 0 ? 1000 / delta : 0));
            const fpsAverage = fpsSamples.reduce((sum, value) => sum + value, 0) / fpsSamples.length;
            const fpsMin = Math.min(...fpsSamples);
            resolve({
              frameSamples: fpsSamples.length,
              fpsAverage,
              fpsMin
            });
            return;
          }
          window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
      }),
    90
  );
}

async function sampleCanvasMetrics(page) {
  const manifestVoiceSummary = auditAudioVoiceBudget();
  const canvasMetrics = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="dev-combat-asset-playground-canvas"]');
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("Missing combat asset playground canvas.");
    }
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (context === null) {
      throw new Error("Canvas 2D context unavailable.");
    }
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let nonblankSamples = 0;
    const stridePixels = 16;
    for (let pixel = 0; pixel < canvas.width * canvas.height; pixel += stridePixels) {
      const index = pixel * 4;
      const r = data[index] ?? 0;
      const g = data[index + 1] ?? 0;
      const b = data[index + 2] ?? 0;
      const a = data[index + 3] ?? 0;
      if (a > 0 && r + g + b > 36) {
        nonblankSamples += 1;
      }
    }

    const statusText = document.querySelector(".dev-combat-asset-playground-title span")?.textContent ?? "";
    const frameMatch = statusText.match(/Frame\s+(\d+)/);
    const frame = frameMatch === null ? 0 : Number(frameMatch[1]);

    let enemyBulletWhiteCoreSamples = 0;
    for (let index = 0; index < 100; index += 1) {
      const column = index % 20;
      const row = Math.floor(index / 20);
      const x = 430 + column * 56 + Math.sin((frame + index * 7) / 25) * 5;
      const y = 150 + row * 72 + ((frame + index * 3) % 42) * 0.18;
      if (hasBrightWhitePixel(data, canvas.width, canvas.height, Math.round(x), Math.round(y), 10)) {
        enemyBulletWhiteCoreSamples += 1;
      }
    }

    let playerHitboxBrightPixels = 0;
    for (let dy = -24; dy <= 24; dy += 1) {
      for (let dx = -24; dx <= 24; dx += 1) {
        if (dx * dx + dy * dy > 24 * 24) {
          continue;
        }
        const x = 920 + dx;
        const y = 880 + dy;
        const offset = (y * canvas.width + x) * 4;
        const r = data[offset] ?? 0;
        const g = data[offset + 1] ?? 0;
        const b = data[offset + 2] ?? 0;
        const a = data[offset + 3] ?? 0;
        if (a > 0 && (r + g + b > 520 || (g > 160 && b > 160))) {
          playerHitboxBrightPixels += 1;
        }
      }
    }

    function hasBrightWhitePixel(bytes, width, height, centerX, centerY, radius) {
      for (let y = Math.max(0, centerY - radius); y <= Math.min(height - 1, centerY + radius); y += 1) {
        for (let x = Math.max(0, centerX - radius); x <= Math.min(width - 1, centerX + radius); x += 1) {
          const offset = (y * width + x) * 4;
          const r = bytes[offset] ?? 0;
          const g = bytes[offset + 1] ?? 0;
          const b = bytes[offset + 2] ?? 0;
          const a = bytes[offset + 3] ?? 0;
          if (a > 0 && r > 215 && g > 215 && b > 215) {
            return true;
          }
        }
      }
      return false;
    }

    return {
      nonblankPixelsEstimate: nonblankSamples * stridePixels,
      enemyBulletWhiteCoreSamples,
      playerHitboxBrightPixels,
      activeAudioElements: document.querySelectorAll("audio").length
    };
  });

  return {
    ...canvasMetrics,
    audioManifestMaxInstances: manifestVoiceSummary.manifestAggregateMaxInstances,
    audioLoopAssets: manifestVoiceSummary.loopAssetCount
  };
}

function auditAudioVoiceBudget(rootDir = process.cwd()) {
  const audioManifest = readJson(path.join(rootDir, "public", "assets", "audio", "manifest.v0.1.json"));
  const entries = Object.values(audioManifest.assets ?? {});
  return {
    manifestAggregateMaxInstances: entries.reduce((sum, asset) => sum + Number(asset.maxInstances ?? 0), 0),
    loopAssetCount: entries.filter((asset) => asset.loop === true).length
  };
}

function validateEntry({ id, entry, expectedPrefix, localPublicPrefix, allowedLicenses, attributionRequired, requiredMissing, issues }) {
  if (!allowedLicenses.has(entry.license)) {
    issues.push(`${id} uses non-CC0/Public Domain license: ${entry.license}`);
  }
  if (entry.attributionRequired === true) {
    attributionRequired.push(id);
    issues.push(`${id} requires attribution.`);
  }
  if (typeof entry.path !== "string" || !entry.path.startsWith(expectedPrefix)) {
    issues.push(`${id} path is outside ${expectedPrefix}: ${entry.path}`);
    return;
  }
  if (entry.required === true && entry.planned !== true) {
    const localPath = path.join(localPublicPrefix, entry.path.slice(expectedPrefix.length).replaceAll("/", path.sep));
    if (!fs.existsSync(localPath)) {
      requiredMissing.push(id);
      issues.push(`${id} required file is missing: ${entry.path}`);
    }
  }
}

function recordLicense(licenseCounts, license) {
  licenseCounts[license] = (licenseCounts[license] ?? 0) + 1;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 100; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available localhost port found from ${startPort}.`);
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

function startViteServer(port) {
  const viteBin = path.join(process.cwd(), "node_modules", "vite", "bin", "vite.js");
  const child = spawn(process.execPath, [viteBin, "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
    cwd: process.cwd(),
    env: { ...process.env, BROWSER: "none" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  return child;
}

async function waitForHttp(url, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await canGet(url)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function canGet(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve((response.statusCode ?? 0) >= 200 && (response.statusCode ?? 0) < 500);
    });
    request.on("error", () => resolve(false));
    request.setTimeout(1000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function stopServer(child) {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.killed) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, 4000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill();
  });
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
