import { CanvasRenderer } from "../render/CanvasRenderer";
import { isBrowserDebugModeEnabled } from "./BrowserDebugMode";
import { createBrowserGameRuntime, type BrowserGameRuntime, type BrowserGameSnapshot } from "./BrowserGameRuntime";
import { advanceFixedStepLoop, createFixedStepLoopState } from "./FixedBrowserLoop";
import { LocalKeyboardInputSource } from "./LocalKeyboardInput";

export interface BrowserGameAppHandle {
  readonly runtime: BrowserGameRuntime;
  readonly canvas: HTMLCanvasElement;
  getSnapshot: () => BrowserGameSnapshot;
  stop: () => void;
}

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

export function mountBrowserGameApp(root: HTMLElement): BrowserGameAppHandle {
  const runtime = createBrowserGameRuntime({ mode: "local_coop", screenWidth: CANVAS_WIDTH, screenHeight: CANVAS_HEIGHT });
  const renderer = new CanvasRenderer();
  const keyboard = new LocalKeyboardInputSource(["p1", "p2"]);
  const shell = document.createElement("div");
  const playfield = document.createElement("div");
  const canvas = document.createElement("canvas");
  const hud = document.createElement("aside");
  const debug = document.createElement("div");
  const outgame = document.createElement("section");

  shell.className = "xiuxian-shell";
  playfield.className = "xiuxian-playfield";
  canvas.className = "xiuxian-canvas";
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  canvas.dataset.testid = "xiuxian-canvas";
  hud.className = "xiuxian-hud";
  hud.dataset.testid = "xiuxian-hud";
  debug.className = "xiuxian-debug";
  outgame.className = "xiuxian-outgame";
  outgame.dataset.testid = "xiuxian-outgame";

  playfield.append(canvas);
  shell.append(playfield, hud, debug, outgame);
  root.replaceChildren(shell);

  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("Canvas 2D context is unavailable");
  }

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

  if (isBrowserDebugModeEnabled(window.location.search)) {
    debug.append(
      actionButton("顿悟", () => runtime.forceInsightForReview()),
      actionButton("救援", () => runtime.forceP2SoulForReview()),
      actionButton("雷劫", () => runtime.triggerDebugTribulationForReview("p1")),
      actionButton("结算", () => runtime.completeRunForReview("boss_victory"))
    );
  } else {
    debug.hidden = true;
  }

  let running = true;
  let latestSnapshot = runtime.getSnapshot();
  let loopState = createFixedStepLoopState();

  const draw = (timestampMs: number): void => {
    if (!running) {
      return;
    }
    const loopAdvance = advanceFixedStepLoop(loopState, timestampMs);
    loopState = loopAdvance.state;
    for (let tick = 0; tick < loopAdvance.ticksToRun; tick += 1) {
      latestSnapshot = runtime.step(keyboard.createFrameInputs(latestSnapshot.simState.frame));
    }
    renderer.renderFrame(context, latestSnapshot);
    renderHud(hud, latestSnapshot);
    renderOutgame(outgame, latestSnapshot);
    window.requestAnimationFrame(draw);
  };
  renderer.renderFrame(context, latestSnapshot);
  renderHud(hud, latestSnapshot);
  renderOutgame(outgame, latestSnapshot);
  window.requestAnimationFrame(draw);

  return {
    runtime,
    canvas,
    getSnapshot: () => latestSnapshot,
    stop: () => {
      running = false;
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
    }
  };
}

function renderHud(target: HTMLElement, snapshot: BrowserGameSnapshot): void {
  target.replaceChildren();
  const title = document.createElement("div");
  title.className = "hud-title";
  title.textContent = "构筑摘要";
  target.append(
    title,
    row("阶段", `${snapshot.viewState.stage.stageName} · ${snapshot.viewState.stage.segmentName}`),
    row("目标", snapshot.viewState.stage.nextEventText ?? "推进妖潮"),
    row("调试证据", evidenceSummary(snapshot))
  );

  for (const player of snapshot.viewState.players) {
    const section = document.createElement("section");
    section.className = "hud-section";
    section.dataset.playerId = player.playerId;
    section.append(
      row(player.core.displayName, `${player.core.realmName}${player.core.realmLayer}`),
      row("本命", player.artifacts.outer?.name ?? player.artifacts.outer?.itemId ?? "未装配"),
      row("灵宝", player.treasures.slots.map((slot) => slot.name ?? slot.itemId ?? "空").join(" / ")),
      row("法术", player.spells.map((slot) => `${slot.keyLabel}:${slot.name ?? "空"}`).join("  ")),
      row("丹药", player.pills.map((slot) => `${slot.keyLabel}:${slot.name ?? "空"}`).join("  "))
    );
    target.append(section);
  }

  if (snapshot.viewState.insight?.visible === true) {
    const insight = document.createElement("section");
    insight.className = "hud-section hud-alert";
    insight.textContent = snapshot.viewState.insight.players
      .map((player) => `${player.playerId.toUpperCase()} ${player.options.map((option) => option.name).join(" / ")}`)
      .join("  ");
    target.append(insight);
  }
  if (snapshot.viewState.rescue?.visible === true) {
    target.append(row("渡魂", `${Math.round(snapshot.viewState.rescue.progress01 * 100)}%`));
  }
  if (snapshot.viewState.tribulation?.active === true) {
    target.append(row(snapshot.viewState.tribulation.warningText, `${Math.round(snapshot.viewState.tribulation.remainingTime)}s`));
  }
}

function renderOutgame(target: HTMLElement, snapshot: BrowserGameSnapshot): void {
  target.replaceChildren();
  if (snapshot.outgameSummary === undefined) {
    target.hidden = true;
    return;
  }
  target.hidden = false;
  const title = document.createElement("div");
  title.className = "hud-title";
  title.textContent = "洞府结算";
  target.append(
    title,
    row("Receipt", compactReceiptId(snapshot.outgameSummary.receiptId)),
    row("资源", formatResourceSummary(snapshot.outgameSummary.resourcesKept)),
    row("强化", snapshot.outgameSummary.upgrades.join("  ")),
    row("第二局", `+${snapshot.outgameSummary.secondRunPowerDelta}`)
  );
}

function row(label: string, value: string): HTMLElement {
  const element = document.createElement("div");
  element.className = "hud-row";
  const labelNode = document.createElement("span");
  const valueNode = document.createElement("strong");
  labelNode.textContent = label;
  valueNode.textContent = value;
  element.append(labelNode, valueNode);
  return element;
}

function meter(label: string, ratio: number, kind: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = `hud-meter hud-meter-${kind}`;
  const header = row(label, `${Math.round(clamp01(ratio) * 100)}%`);
  const track = document.createElement("div");
  const fill = document.createElement("i");
  track.className = "hud-meter-track";
  fill.style.width = `${Math.round(clamp01(ratio) * 100)}%`;
  track.append(fill);
  wrapper.append(header, track);
  return wrapper;
}

function actionButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function evidenceSummary(snapshot: BrowserGameSnapshot): string {
  const evidence = snapshot.rcEvidence;
  const count = [
    evidence.browserCanvasPlayable,
    evidence.localCoopPlayers >= 2,
    evidence.spellInputObserved,
    evidence.pillInputObserved,
    evidence.insightOverlayObserved,
    evidence.rescueOverlayObserved,
    evidence.debugTribulationObserved,
    evidence.outgameSettlementObserved
  ].filter(Boolean).length;
  return `${count}/8`;
}

function compactReceiptId(receiptId: string): string {
  return receiptId.replace("receipt_debug_run_stage01_seed_20260522_stage_01_qingyun_", "stage01:");
}

function formatResourceSummary(resources: Readonly<Record<string, number>>): string {
  return Object.entries(resources)
    .slice(0, 6)
    .map(([id, amount]) => `${resourceLabel(id)}:${amount}`)
    .join("  ");
}

function resourceLabel(id: string): string {
  switch (id) {
    case "spirit_stone_low":
      return "灵石";
    case "qingling_herb":
      return "青灵草";
    case "clear_mind_grass":
      return "清心草";
    case "black_iron_essence":
      return "黑铁精";
    case "demon_core_small":
      return "妖丹";
    case "spirit_jade":
      return "灵玉";
    default:
      return id;
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
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

declare global {
  interface Window {
    __XIUXIAN_APP__?: BrowserGameAppHandle;
  }
}

if (typeof document !== "undefined") {
  const root = document.getElementById("xiuxian-game-root");
  if (root !== null) {
    window.__XIUXIAN_APP__ = mountBrowserGameApp(root);
  }
}
