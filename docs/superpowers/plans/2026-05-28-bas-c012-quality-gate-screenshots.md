# BAS-C012 Quality Gate Screenshots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a repeatable combat visual quality gate that captures screenshots, measures basic readability/performance signals, and writes an audit report under `artifacts/combat-asset-pass/YYYY-MM-DD/`.

**Architecture:** Reuse the existing `/dev/combat-asset-playground` route as the canonical render fixture for combat assets, VFX, pressure, warnings, and background states. Add one Node/Playwright script that starts Vite, captures screenshots, samples canvas pixels, audits local manifests, and writes JSON/Markdown reports without touching `src/sim/**`.

**Tech Stack:** Node ESM, Playwright Chromium, Vite dev server, existing combat asset manifests, Vitest.

---

### Task 1: Add The Screenshot Gate Script

**Files:**
- Create: `scripts/quality-gate-screenshots.mjs`
- Modify: `package.json`

- [x] **Step 1: Add `scripts/quality-gate-screenshots.mjs`**

Implement a Node ESM script that:
- starts `npm run dev -- --port <port> --strictPort`
- opens `/dev/combat-asset-playground`
- captures seven screenshots into `artifacts/combat-asset-pass/<date>/`
- samples `requestAnimationFrame` FPS
- samples canvas pixels for nonblank output, bullet core readability, and hitbox visibility
- audits `public/assets/2d/manifest.v0.1.json` and `public/assets/audio/manifest.v0.1.json`
- writes `quality-gate-report.json` and `quality-gate-report.md`

- [x] **Step 2: Add npm script**

Add:

```json
"quality:combat-screenshots": "node scripts/quality-gate-screenshots.mjs"
```

### Task 2: Add Script Tests

**Files:**
- Create: `tests/scripts/quality-gate-screenshots.test.ts`

- [x] **Step 1: Test exported report helpers**

Verify:
- date-to-output-dir formatting is stable
- manifest audit accepts only local 2D/audio combat assets with allowed license provenance
- Markdown report contains FPS, VFX, audio voice, license, readability, and screenshot sections

### Task 3: Run The Gate And Required Commands

**Commands:**
- [ ] `npm test -- tests/scripts/quality-gate-screenshots.test.ts`
- [ ] `npm run quality:combat-screenshots`
- [ ] `npm run validate:combat-assets`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run check:forbidden`
- [ ] `git diff --name-only -- src/sim`

### Task 4: Report Outcome

**Required final details:**
- changed files
- npm script added
- screenshot output path
- report paths
- FPS / VFX / audio voices / license / readability summary
- required command results
- confirmation that `src/sim/**` was untouched
