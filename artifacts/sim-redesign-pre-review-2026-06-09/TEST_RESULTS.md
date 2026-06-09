# REVIEW-PRE-001 Test Results

## Required Verification Commands

| Command | Exit | Result | Summary |
|---|---:|---|---|
| `npm run typecheck` | 0 | pass | `tsc --noEmit` completed. |
| `npm test` | 1 | failed | 1 failed / 457 passed tests; failure is `tests/content/sim-redesign-content-registry.test.ts`. |
| `npm run build` | 0 | pass | Vite build completed; chunk-size warning only. |
| `npm run validate:data` | 0 | pass | `Validated 189 JSON files, 92 content ids, contentHash=8fcee14b.` |
| `npm run check:forbidden` | 0 | pass | `No forbidden gameplay patterns found.` |
| `npm run validate:combat-assets` | 0 | pass | 2D/audio combat manifests OK. |
| `npm run test:determinism` | 0 | pass | 1 file / 2 tests passed. |
| `npm run test:headless:stage01` | 0 | pass | 1 file / 3 tests passed. |
| `git diff --name-only -- src/sim` | 0 | pass | Empty output. |

Logs:

- `logs/npm_typecheck.log`
- `logs/npm_test.log`
- `logs/npm_build.log`
- `logs/npm_validate_data.log`
- `logs/npm_check_forbidden.log`
- `logs/npm_validate_combat_assets.log`
- `logs/npm_test_determinism.log`
- `logs/npm_test_headless_stage01.log`
- `logs/git_diff_name_only_src_sim_final_commands.log`

## `npm test` Failure

Failing test:

```text
tests/content/sim-redesign-content-registry.test.ts
SimRedesignContentRegistry > loads checked-in SIM-REDESIGN v0.2 data for every required domain
expected [ Array(238) ] to deeply equal []
```

Root cause: the test scans checked-in/current JSON under the 11 MIG-C002 SIM-REDESIGN directories. After re-import, those directories now contain rich v0.1/v0.2 domain files that do not use the MIG-C002 wrapper schema. The registry therefore reports issues such as:

- `domain must be '<domain>'`
- `id must be a string`
- `items must be an array`
- `schemaVersion must be '0.2'`

This audit records the failure and does not fix it.

## Extra Non-Gating Command

| Command | Exit | Result | Summary |
|---|---:|---|---|
| `npm run validate:sim-redesign-data` | 1 | failed / non-gating for REVIEW-PRE-001 | Same registry-scope problem as `npm test`; mixed newly imported SIM-REDESIGN files fail the MIG-C002 minimal schema. |

Log: `logs/npm_validate_sim_redesign_data_extra.log`

## Browser Smoke

Vite was started on temporary ports and stopped after each smoke attempt. No listeners remained on ports 5173-5177 after cleanup.

Latest smoke:

```text
npm run dev -- --port 5177
node browser_smoke.mjs http://127.0.0.1:5177 D:\Game_1\artifacts\sim-redesign-pre-review-2026-06-09
exitCode: 1
```

Reached:

- main menu
- new-game save slots
- save-slot creation dialog
- character creation screen
- confirm-life dialog

Did not reach:

- `life-simulation-screen`

Failure evidence:

- Normal click on `.ccui2-confirm-life-dialog button` was intercepted by `.xianxia-dialog-overlay`.
- Forced click was used only to continue the audit attempt; the route still did not reach `life-simulation-screen`.
- `browser_smoke_metrics.json`
- `logs/browser_smoke_retry4.log`
- screenshots under `screenshots/`

## Acceptance Status

The audit package is complete and `src/sim/**` is untouched. Verification is not fully clean because `npm test` fails and browser smoke cannot complete the character-creation-to-life-simulation transition. These failures are current implementation evidence, not fixed in REVIEW-PRE-001.
