# First Playable RC Report v0.1

Date: 2026-05-23

## Verdict

**CONDITIONAL for engineering readiness; not a final internal playtest sign-off yet.**

The previous RC blocker around the packaged entry has been fixed: the Vite build now ships a browser app from `index.html` and `src/app/BrowserGameApp.ts`, backed by a two-player browser runtime, keyboard-to-`FrameInput` mapping, `ViewStateBuilder`, `CanvasRenderer`, HUD DOM, rescue/insight/debug-tribulation triggers, and an outgame settlement panel.

Remaining RC sign-off risk is evidence, not the prior missing app shell: this machine did not expose a usable Chrome/Edge/Playwright browser binary, so screenshot/FPS capture and the required human playtest counts still need to be collected before marking G8 as fully passed.

## Verification Commands

| Command | Result | Evidence |
|---|---:|---|
| `npm run typecheck` | PASS | `tsc --noEmit` exit 0 |
| `npm test` | PASS | 25 test files, 98 tests passed |
| `npm run validate:data` | PASS | 57 JSON files, 37 content ids, `contentHash=8c47740e` |
| `npm run check:forbidden` | PASS | No forbidden gameplay patterns found in `src/sim/**` |
| `npm run test:determinism` | PASS | 1 file, 2 tests passed |
| `npm run test:headless:stage01` | PASS | 1 file, 3 tests passed |
| `npm run build` | PASS | Vite built `dist/index.html` and `dist/assets/index-puc3WI7t.js` |

## Supplemental Checks

| Check | Result | Evidence |
|---|---:|---|
| Browser app endpoint | PASS | `http://127.0.0.1:5173` returned 200 with `xiuxian-game-root` and `/src/app/BrowserGameApp.ts` |
| Browser runtime unit coverage | PASS | `tests/app/browser-game-runtime.test.ts`: HTML entry, local two-player keyboard mapping, runtime ViewState/EffectEvent evidence, Canvas primitive rendering |
| VFX readability ordering | PASS | `player_hitbox` now renders above `rescue_and_soul` and `foreground_effects` in render layer data and default renderer stack |
| `npx tsx tools\run-headless-stage01.ts` | PASS | `outcome=boss_victory`, `spawnedEnemies=232`, `openingPowerDelta=25.7`, `finalStateHash=f1052fa0` |
| `npx tsx tools\run-balance-report.ts` | PASS | Stage 359.2s, boss 114.2s, insight count 3, hit count 6, no deviations |
| 10-minute two-client harness | PASS | 36000 frames, 300 comparisons, 0 mismatches, final hashes `060c94a7` / `060c94a7` |
| Runtime external resource scan | PASS | No `http`, CDN, external font, image, `drawImage`, or audio references in `src`, `public`, or `dist` |

Legacy note: `references/gemini_canvas_demo_original.html` still contains CDN, Google Fonts, `Math.random`, and `requestAnimationFrame` references. It is not part of the Vite runtime build and should remain reference-only. The duplicate root-level `code_artifact.html` is kept out of git via `.gitignore`.

## Blocking Bugs

| ID | Gate | Severity | Status | Detail |
|---|---|---:|---|---|
| B-RC-001 | G2/G3/G8 | Blocker | Resolved | Packaged app entry is now `index.html` -> `src/app/BrowserGameApp.ts`; build output includes a browser app instead of library-only `DevBootstrap`. |
| B-RC-002 | G2/G7/G8 | Blocker | Partially resolved | Automated Canvas/runtime evidence exists, and HTTP boot works. Screenshot and FPS capture remain uncollected because no usable local browser binary was available in this environment. |
| B-RC-003 | G3/G8 | Blocker | Partially resolved | Browser runtime now supports P1/P2 local keyboard input, shared HUD, rescue overlay, and co-op insight/debug triggers. Full player-facing local co-op playtest runs are still required. |
| B-RC-004 | G8 | Blocker | Open until playtest | RC checklist still requires 3 single-player full flows, 2 local two-player full flows, 1 failure settlement flow, 1 Debug tribulation flow, collected playtest reports, and 0 blocking bugs. |

## Gate Status

| Gate | Status | Evidence / Gap |
|---|---:|---|
| G0 Content pack and data validation | PASS | `npm run validate:data`; content registry tests pass. |
| G1 Headless deterministic simulation | PASS | Determinism tests and 10-minute two-client harness pass. |
| G2 Basic Canvas playable | PARTIAL / NEEDS VISUAL QA | Browser app shell, Canvas render path, HUD, keyboard input, enemies/projectiles/hitbox effects now exist; screenshot/FPS validation still needed. |
| G3 Local two-player cooperation | PARTIAL / NEEDS PLAYTEST | Runtime has P1/P2 controls, co-op HUD, rescue, and insight evidence; needs actual local co-op full-flow playtest. |
| G4 Full Stage 01 in-run loop | PASS for headless / PARTIAL in browser | Headless stage 01 victory path passes; browser runtime is now present but not yet manually playtested end to end. |
| G5 Dual progression and debug tribulation | PASS | Existing tests pass; browser runtime exposes debug tribulation without merging insight exp and cultivation. |
| G6 Outgame cave loop | PASS for headless / PARTIAL in browser | Existing outgame loop passes; browser app exposes settlement/second-run-strength panel for player-facing evidence. |
| G7 VFX readability and performance | PARTIAL | Layer ordering fix verified; screenshot and 1080p FPS remain uncollected. |
| G8 First Playable RC | CONDITIONAL / NOT FINAL | Engineering blockers are reduced, but formal playtest counts and visual evidence are still required. |

## RC Decision

```text
[ ] Pass, ready for internal playtest
[x] Conditional pass, engineering app-shell blockers fixed; playtest evidence still required
[ ] Fail, return to corresponding gates
```

Recommended next step: run the browser app at `http://127.0.0.1:5173`, capture desktop screenshots/FPS for normal combat, insight, rescue, debug tribulation, and settlement states, then execute the required playtest count checklist before final G8 sign-off.
