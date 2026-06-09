# REVIEW-PRE-001 Command Logs

## Baseline

| Command | Exit | Log |
|---|---:|---|
| `git status -sb` | 0 | `logs/git_status_sb_baseline.log` |
| `git diff --stat` | 0 | `logs/git_diff_stat_baseline.log` |
| `git diff --name-only -- src/sim` | 0 | `logs/git_diff_name_only_src_sim_baseline.log` |
| `git ls-files` | 0 | `logs/git_ls_files.log` |
| `git ls-files --others --exclude-standard` | 0 | `logs/git_untracked_files.log` |

One helper command for SIM-REDESIGN-related tracked files failed because PowerShell interpreted an unquoted token (`SimRedesign`) as a command. It was not used as pass evidence; the broader `git ls-files` and untracked logs remain valid.

## Scans

| Command group | Exit | Log |
|---|---:|---|
| Keyword scan for `NinePalaceEvaluation`, `eligibility`, `mutation`, `storyline`, `density`, `interlude`, `NarrativeService`, `trueName`, `18 岁`, `域外` | 0 | `logs/rg_keywords.log` |
| Generated UI / PNG interaction scan | 0 | `logs/rg_generated_png_ui.log` |
| `package.json` capture | 0 | `logs/package_json.log` |

## Verification

| Command | Exit | Log |
|---|---:|---|
| `npm run typecheck` | 0 | `logs/npm_typecheck.log` |
| `npm test` | 1 | `logs/npm_test.log` |
| `npm run build` | 0 | `logs/npm_build.log` |
| `npm run validate:data` | 0 | `logs/npm_validate_data.log` |
| `npm run check:forbidden` | 0 | `logs/npm_check_forbidden.log` |
| `npm run validate:combat-assets` | 0 | `logs/npm_validate_combat_assets.log` |
| `npm run test:determinism` | 0 | `logs/npm_test_determinism.log` |
| `npm run test:headless:stage01` | 0 | `logs/npm_test_headless_stage01.log` |
| `git diff --name-only -- src/sim` | 0 | `logs/git_diff_name_only_src_sim_final_commands.log` |

## Extra

| Command | Exit | Log |
|---|---:|---|
| `npm run validate:sim-redesign-data` | 1 | `logs/npm_validate_sim_redesign_data_extra.log` |

## Browser Smoke

| Attempt | Port | Exit | Notes |
|---|---:|---:|---|
| initial | 5173 | 1 | Reload/network idle timeout. |
| retry | 5174 | 1 | Reached main menu/save slots, script selected wrong action. |
| retry2 | 5175 | 1 | Reached save slots, failed waiting for character creation. |
| retry3 | 5176 | 1 | Reached character creation, normal confirm-life dialog click intercepted by overlay. |
| retry4 | 5177 | 1 | Reached confirm-life dialog; forced click still did not reach life simulation. |

Current browser evidence is partial and honest: smoke proves main menu/save/new profile/character creation reachability, but not life simulation reachability through normal UI.
