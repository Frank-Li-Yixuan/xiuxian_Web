#!/usr/bin/env node

import { spawn } from "node:child_process";
import fsp from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "@playwright/test";

export const CHARACTER_CREATION_SCREENSHOT_SCENARIOS = [
  {
    id: "01_idle_default",
    title: "Idle Default",
    description: "Default character creation page with idle fate altar motion.",
    viewport: { width: 1920, height: 1080 },
    reducedMotion: false,
    actions: []
  },
  {
    id: "02_after_reroll",
    title: "After Reroll",
    description: "Reroll feedback state after one real reroll action.",
    viewport: { width: 1920, height: 1080 },
    reducedMotion: false,
    actions: ["reroll"]
  },
  {
    id: "03_locked_main_destiny",
    title: "Locked Main Destiny",
    description: "Main destiny selected and locked with stable seal highlight.",
    viewport: { width: 1920, height: 1080 },
    reducedMotion: false,
    actions: ["selectMainDestiny", "lock"]
  },
  {
    id: "04_confirm_life_dialog",
    title: "Confirm Life Dialog",
    description: "Confirm-life modal and confirm feedback state.",
    viewport: { width: 1920, height: 1080 },
    reducedMotion: false,
    actions: ["confirmDialog"]
  },
  {
    id: "05_compact_1366x768",
    title: "Compact 1366x768",
    description: "Compact desktop viewport without overlapping fixed rows.",
    viewport: { width: 1366, height: 768 },
    reducedMotion: false,
    actions: []
  },
  {
    id: "06_compact_reduced_motion",
    title: "Compact Reduced Motion",
    description: "Compact viewport with prefers-reduced-motion enabled.",
    viewport: { width: 1366, height: 768 },
    reducedMotion: true,
    actions: ["reroll"]
  }
];

const DEFAULT_PORT = 5173;
const DEFAULT_DATE = "2026-06-03";

export function formatArtifactDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function resolveOutputDir(options = {}) {
  const date = options.date ?? process.env.CCUI2_C006_DATE ?? DEFAULT_DATE;
  return path.resolve(options.rootDir ?? process.cwd(), "artifacts", `ccui2-c006-screenshots-${date}`);
}

export function createReport({ generatedAt, sourceUrl, outputDir, screenshots, checks }) {
  const issues = checks.flatMap((check) => check.issues.map((issue) => `${check.id}: ${issue}`));
  return deepFreeze({
    version: "0.1",
    gate: "CCUI2-C006",
    generatedAt,
    sourceUrl,
    outputDir,
    screenshots,
    checks,
    pass: issues.length === 0,
    issues
  });
}

export function createMarkdownReport(report) {
  const screenshotRows = report.screenshots
    .map((screenshot) => `| ${screenshot.title} | ${screenshot.viewport.width}x${screenshot.viewport.height} | ${screenshot.reducedMotion ? "yes" : "no"} | \`${screenshot.path}\` | ${screenshot.description} |`)
    .join("\n");
  const checkRows = report.checks
    .map((check) => `| ${check.id} | ${check.horizontalOverflow ? "fail" : "pass"} | ${check.overlapCount} | ${check.visibleKeyElements ? "pass" : "fail"} | ${check.issues.join("<br>") || "None"} |`)
    .join("\n");

  return `# CCUI2-C006 Character Creation Screenshot Gate

- Gate: ${report.gate}
- Generated: ${report.generatedAt}
- Source: ${report.sourceUrl}
- Output: \`${report.outputDir}\`
- Result: ${report.pass ? "PASS" : "FAIL"}

## Screenshots

| Scenario | Viewport | Reduced Motion | Path | Description |
|---|---:|---|---|---|
${screenshotRows}

## Layout Checks

| Scenario | Horizontal Overflow | Overlaps | Key Elements | Issues |
|---|---|---:|---|---|
${checkRows}
`;
}

async function main() {
  const rootDir = process.cwd();
  const port = await findAvailablePort(DEFAULT_PORT);
  const outputDir = resolveOutputDir({ rootDir });
  await fsp.mkdir(outputDir, { recursive: true });

  const server = startViteServer(port);
  let browser;
  try {
    const sourceUrl = `http://127.0.0.1:${port}/`;
    await waitForHttp(sourceUrl, 30_000);

    browser = await chromium.launch({ headless: true });
    const screenshots = [];
    const checks = [];

    for (const scenario of CHARACTER_CREATION_SCREENSHOT_SCENARIOS) {
      const page = await browser.newPage({ viewport: scenario.viewport, deviceScaleFactor: 1 });
      await page.emulateMedia({ reducedMotion: scenario.reducedMotion ? "reduce" : "no-preference" });
      await enterCharacterCreation(page, sourceUrl);
      for (const action of scenario.actions) {
        await performScenarioAction(page, action);
      }
      await page.waitForTimeout(scenario.reducedMotion ? 120 : 720);
      const screenshotPath = path.join(outputDir, `${scenario.id}.png`);
      await page.locator('[data-testid="character-creation-screen"]').screenshot({ path: screenshotPath });
      screenshots.push({
        id: scenario.id,
        title: scenario.title,
        description: scenario.description,
        viewport: scenario.viewport,
        reducedMotion: scenario.reducedMotion,
        path: path.relative(rootDir, screenshotPath).replaceAll("\\", "/")
      });
      checks.push(await collectLayoutCheck(page, scenario.id));
      await page.close();
    }

    const generatedAt = new Date().toISOString();
    const report = createReport({
      generatedAt,
      sourceUrl,
      outputDir: path.relative(rootDir, outputDir).replaceAll("\\", "/"),
      screenshots,
      checks
    });

    await fsp.writeFile(path.join(outputDir, "quality-character-creation-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await fsp.writeFile(path.join(outputDir, "quality-character-creation-report.md"), createMarkdownReport(report), "utf8");

    console.log(`CCUI2-C006 character creation screenshot gate ${report.pass ? "PASS" : "FAIL"}`);
    console.log(`Output: ${path.relative(rootDir, outputDir).replaceAll("\\", "/")}`);
    console.log(`Screenshots: ${screenshots.length}`);
    if (!report.pass) {
      process.exitCode = 1;
      for (const issue of report.issues) {
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

async function enterCharacterCreation(page, sourceUrl) {
  await page.goto(sourceUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".main-menu-actions button").first().click();
  await page.locator(".xianxia-save-card").first().click();
  await page.locator(".xianxia-save-dialog-form input").fill("CCUI2-C006");
  await page.locator(".xianxia-dialog-actions button").last().click();
  await page.getByTestId("character-creation-screen").waitFor({ state: "visible", timeout: 20_000 });
}

async function performScenarioAction(page, action) {
  switch (action) {
    case "reroll":
      await page.locator(".ccui2-action-bar .ccui2-action-button").nth(0).click();
      break;
    case "selectMainDestiny":
      await page.locator('[data-destiny-card-slot="main"]').click();
      break;
    case "lock":
      await page.locator('.ccui2-action-bar .ccui2-action-button[data-lock-key="mainDestiny"]').click();
      break;
    case "confirmDialog":
      await page.locator('input[name="characterName"]').fill("Lin Wendao");
      await page.locator(".confirm-life-button").click();
      await page.locator(".ccui2-confirm-life-dialog").waitFor({ state: "visible", timeout: 10_000 });
      break;
    default:
      throw new Error(`Unknown character creation screenshot action: ${action}`);
  }
}

async function collectLayoutCheck(page, id) {
  return page.evaluate((scenarioId) => {
    const root = document.querySelector('[data-testid="character-creation-screen"]');
    if (!(root instanceof HTMLElement)) {
      return {
        id: scenarioId,
        horizontalOverflow: true,
        overlapCount: 0,
        visibleKeyElements: false,
        issues: ["Missing character creation screen"]
      };
    }
    const selectors = [
      ".ccui2-header",
      ".ccui2-main-stage",
      ".ccui2-destiny-card-row",
      ".ccui2-detail-drawer",
      ".ccui2-action-bar"
    ];
    const boxes = selectors
      .map((selector) => ({ selector, element: document.querySelector(selector) }))
      .filter((entry) => entry.element instanceof HTMLElement)
      .map((entry) => {
        const rect = entry.element.getBoundingClientRect();
        return {
          selector: entry.selector,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
          width: rect.width,
          height: rect.height
        };
      });
    const overlaps = [];
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        const overlapX = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const overlapY = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        if (overlapX > 2 && overlapY > 2) {
          overlaps.push(`${a.selector} overlaps ${b.selector}`);
        }
      }
    }
    const horizontalOverflow = document.documentElement.scrollWidth > window.innerWidth + 1 || root.scrollWidth > root.clientWidth + 1;
    const visibleKeyElements =
      boxes.length === selectors.length &&
      boxes.every((box) => box.width > 0 && box.height > 0 && box.left >= -1 && box.right <= window.innerWidth + 1);
    const issues = [
      ...(horizontalOverflow ? [`Horizontal overflow ${document.documentElement.scrollWidth}/${window.innerWidth}`] : []),
      ...overlaps,
      ...(visibleKeyElements ? [] : ["One or more key CCUI2 regions are not visible inside viewport"])
    ];
    return {
      id: scenarioId,
      horizontalOverflow,
      overlapCount: overlaps.length,
      visibleKeyElements,
      issues
    };
  }, id);
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

async function stopServer(server) {
  if (server.exitCode !== null) {
    return;
  }
  server.kill();
  await new Promise((resolve) => {
    server.once("exit", resolve);
    setTimeout(resolve, 2_000);
  });
}

async function findAvailablePort(preferredPort) {
  for (let port = preferredPort; port < preferredPort + 50; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found from ${preferredPort}`);
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

async function waitForHttp(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
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
      resolve((response.statusCode ?? 500) < 500);
    });
    request.on("error", () => resolve(false));
    request.setTimeout(1_000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
