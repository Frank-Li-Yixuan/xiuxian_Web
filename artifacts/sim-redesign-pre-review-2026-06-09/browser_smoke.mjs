import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const url = process.argv[2] ?? "http://127.0.0.1:5173";
const artifactDir = process.argv[3] ?? "artifacts/sim-redesign-pre-review-2026-06-09";
const screenshots = join(artifactDir, "screenshots");
mkdirSync(screenshots, { recursive: true });
const metrics = { url, steps: [], console: [], pageErrors: [], uiRisks: [], errors: [], startedAt: new Date().toISOString() };

async function capture(page, id, label) {
  await page.screenshot({ path: join(screenshots, `${id}_${label}.png`), fullPage: true });
  const text = await page.locator("body").innerText().catch((error) => `DOM_TEXT_ERROR: ${error.message}`);
  writeFileSync(join(artifactDir, `browser_dom_text_${id}_${label}.txt`), text, "utf8");
  metrics.steps.push({ id, label, url: page.url(), textSample: text.slice(0, 700) });
}

async function clickFirst(page, candidates, note) {
  for (const candidate of candidates) {
    const locator = typeof candidate === "string" ? page.getByText(candidate, { exact: false }) : candidate;
    const count = await locator.count().catch(() => 0);
    if (count > 0) {
      await locator.first().click({ timeout: 5000 });
      metrics.steps.push({ action: "click", note, matched: typeof candidate === "string" ? candidate : "locator" });
      return;
    }
  }
  throw new Error(`No clickable candidate found for ${note}`);
}

async function clickSelector(page, selector, note) {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: "visible", timeout: 10000 });
  await locator.click({ timeout: 10000 });
  metrics.steps.push({ action: "click", note, selector });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1365, height: 768 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(10000);
page.on("console", (message) => {
  metrics.console.push({ type: message.type(), text: message.text() });
});
page.on("pageerror", (error) => {
  metrics.pageErrors.push(error.stack ?? error.message);
});
try {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
  await page.getByTestId("main-menu-screen").waitFor({ timeout: 30000 });
  await capture(page, "01", "main_menu");

  await clickFirst(page, ["新的游戏", "鏂扮殑娓告垙"], "open new game save slots");
  await page.getByTestId("save-slot-screen").waitFor({ timeout: 30000 });
  await capture(page, "02", "save_slots");

  await clickSelector(page, ".xianxia-save-card.is-empty", "select first empty save slot");
  await capture(page, "03", "save_slot_dialog");

  await page.locator(".save-slot-action-dialog input").first().fill("review-2026-06-09");
  await page.locator(".save-slot-action-dialog button:not([disabled])").last().click({ timeout: 10000 });
  metrics.steps.push({ action: "click", note: "create profile", selector: ".save-slot-action-dialog button:not([disabled]) last" });
  await page.getByTestId("character-creation-screen").waitFor({ timeout: 30000 });
  await capture(page, "04", "character_creation");

  const bodyBeforeConfirm = await page.locator("body").innerText();
  metrics.hiddenLeak = {
    bodyContainsTrueNameLiteral: bodyBeforeConfirm.includes("trueName"),
    bodyContainsKnownHiddenTerms: ["古雷真血", "丹圣遗骨", "系统共鸣体", "前世剑魄", "魔印微痕"].filter((term) => bodyBeforeConfirm.includes(term))
  };

  await clickFirst(page, [page.locator(".confirm-life-button"), "确认此生"], "request confirm life");
  await capture(page, "05", "confirm_life_dialog");
  const confirmDialogButton = page.locator(".ccui2-confirm-life-dialog button").last();
  try {
    await confirmDialogButton.click({ timeout: 5000 });
    metrics.steps.push({ action: "click", note: "confirm life dialog", selector: ".ccui2-confirm-life-dialog button last" });
  } catch (error) {
    metrics.uiRisks.push({
      note: "confirm life dialog normal click failed; forced click used only to continue audit smoke",
      error: error instanceof Error ? error.message : String(error)
    });
    await confirmDialogButton.click({ timeout: 5000, force: true });
    metrics.steps.push({ action: "force-click", note: "confirm life dialog", selector: ".ccui2-confirm-life-dialog button last" });
  }
  await page.getByTestId("life-simulation-screen").waitFor({ timeout: 30000 });
  await capture(page, "06", "life_simulation");

  const lifeText = await page.locator("body").innerText();
  metrics.lifeSimulation = {
    reached: true,
    containsGeneratedUiScreen: await page.locator(".generated-ui-screen").count(),
    bodyContainsTrueNameLiteral: lifeText.includes("trueName")
  };
  metrics.status = "pass";
} catch (error) {
  metrics.status = "fail";
  metrics.errors.push(error instanceof Error ? error.stack ?? error.message : String(error));
  await page.screenshot({ path: join(screenshots, "error.png"), fullPage: true }).catch(() => undefined);
  process.exitCode = 1;
} finally {
  metrics.endedAt = new Date().toISOString();
  writeFileSync(join(artifactDir, "browser_smoke_metrics.json"), JSON.stringify(metrics, null, 2), "utf8");
  await browser.close();
}


