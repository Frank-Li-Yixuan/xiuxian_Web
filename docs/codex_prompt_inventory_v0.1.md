# Codex Prompt Inventory v0.1

Date: 2026-06-10

Scope: prompt inventory and deprecation marking for SIM-REDESIGN migration. This document changes prompt/docs state only. It does not authorize gameplay, runtime, data schema, or `src/sim/**` changes.

## Rules

Every SIM-REDESIGN prompt must be read with:

- `codex_prompts/00_GLOBAL_PREFIX_SIM_REDESIGN.md`
- `docs/prompt_execution_order_v0.1.md`
- this inventory

Hard guards:

- Do not execute deprecated prompts directly.
- Do not restore generated PNG controls for buttons, panels, destiny cards, save cards, or modal UI.
- Do not hard-code age 18 as the only outer-battlefield route.
- Do not expose hidden `trueName` or concrete hidden bloodline true names in UI, logs, snapshots, or prompt examples.
- Do not modify `src/sim/**` unless a later prompt explicitly scopes that work and preserves deterministic simulation rules.

## Current Inventory Result

`rg --files codex_prompts` found 205 prompt files, including 24 First Playable `fp_tasks` prompts and 5 `review_and_qa` prompts.

| Area | Status | Handling |
|---|---|---|
| `00_GLOBAL_PREFIX_SIM_REDESIGN.md` | Active guard | Must be prepended or read before SIM-REDESIGN work. |
| `00_SIM_REDESIGN_BOOTSTRAP.md` | Active orientation | Use before migration planning if the current thread lacks SIM-REDESIGN context. |
| `MIG-C001_prompt_inventory_and_deprecation.md` | Re-executed | This refreshed inventory and file-top deprecated markers are its output. |
| `MIG-C002` to `MIG-C009` | Active migration prompts | Use after this inventory, with the global prefix and current implementation evidence. |
| `NPF-C001` to `NPF-C006` | Active SIM-REDESIGN prompts | Nine Palace Fate matrix route; recommended next prompt is `NPF-C001_data_schema_registry.md`. |
| `DEM-C001` to `DEM-C007` | Active SIM-REDESIGN prompts | Destiny eligibility / mutation route; execute after NPF registry/scoring dependencies. |
| `HFO2-C001` to `HFO2-C008` | Active SIM-REDESIGN prompts | v0.2 origin/fate/item narrative route; replaces old age-18 HFO conversion work. |
| `LST-C001` to `LST-C007` | Active SIM-REDESIGN prompts | Storyline/event-thread route. |
| `LPI-C001` to `LPI-C008` | Active SIM-REDESIGN prompts | Playable interlude route. |
| `LSTG-C001` to `LSTG-C008` | Active SIM-REDESIGN prompts | Life-stage transition route. |
| `ME2-C001` to `ME2-C008` | Active SIM-REDESIGN prompts | Monthly event v0.2 route. |
| `MC2-C001` to `MC2-C008` | Active SIM-REDESIGN prompts | Major choice v0.2 route. |
| `LLM-C001` to `LLM-C008` | Active optional route | Narrative pipeline must remain offline-first and sanitized; real LLM is optional. |
| `LFP-C001` to `LFP-C009` | Active SIM-REDESIGN prompts | Life sim playable shell/flow route. |
| Canonical `SIM-C001` to `SIM-C011` route | Active but ordered | Follow `docs/prompt_execution_order_v0.1.md`; do not execute duplicate IDs blindly. |
| `E2E-SIM-001` and `RC-SIM-001` | Active gates | Use after migration implementation reaches an end-to-end candidate. |
| `fp_tasks/FP-C001` to `FP-C024` | Active for First Playable track | Separate v0.1 STG/outgame track; still governed by `AGENTS.md`. |
| `review_and_qa/*` | Active review prompts | Use for data, determinism, VFX, RC, and bug triage reviews. |
| `BAS-C001` to `BAS-C012` | Historical / rerun only when scoped | Asset/VFX/audio prompts appear already tied to the existing baseline; do not rerun during SIM-REDESIGN migration unless explicitly requested. |
| `OAG-C001` to `OAG-C005` | Historical migration source | v0.1 source for opening attributes/spiritual roots; migrate through NinePalace/NPF/DEM route instead of rerunning blindly. |
| `DT-C001` to `DT-C006` | Historical migration source | v0.1 destiny source; migrate through eligibility/mutation route instead of rerunning blindly. |
| `HFO-C001` to `HFO-C006` | Historical migration source | v0.1 origin/fate/item source; migrate through HFO2/storyline route instead of rerunning blindly. |
| `HFO-C007` to `HFO-C008` | Deprecated legacy reference | File-top markers added. Superseded by HFO2 + AdultNode bridge. |
| `CC-C001` to `CC-C006` | Deprecated | File-top markers added. Do not execute. |
| `LM-C001` to `LM-C008` | Deprecated legacy reference | File-top markers added. Superseded by LST/LPI/LSTG/ME2-aware route. |
| `MLC-C001` to `MLC-C007` | Deprecated legacy reference | File-top markers added. Superseded by MC2/LPI/LSTG-aware route. |
| `A18-C001` to `A18-C008` | Deprecated legacy reference | File-top markers added. Superseded by AdultNode path-scoring bridge. |

## Deprecated Prompts Marked

### Old Character Creation

| Prompt | Reason | Replacement |
|---|---|---|
| `codex_prompts/CC-C001_data_types_generator.md` | Old CC-C route, pre-redesign assumptions. | CCUI2 baseline, then `MIG-C003` / `SIM-C008`. |
| `codex_prompts/CC-C002_ui_asset_registry.md` | Creates generated PNG UI asset registry. | CCUI2 baseline, then `MIG-C003` / `SIM-C008`. |
| `codex_prompts/CC-C003_dom_components.md` | Builds controls around PNG background/border layers. | CCUI2 baseline, then `MIG-C003` / `SIM-C008`. |
| `codex_prompts/CC-C004_character_creation_screen_layout.md` | Restores old portrait-frame layout. | CCUI2 black seated figure + destiny plate route. |
| `codex_prompts/CC-C005_interactions_profile_save.md` | Old CC-C profile/save flow. | CCUI2 baseline, then `MIG-C003` / `SIM-C008`. |
| `codex_prompts/CC-C006_app_routing_integration.md` | Old CC-C app routing flow. | CCUI2 baseline, then `MIG-C003` / `SIM-C008`. |

### Legacy Life Monthly Events

| Prompt | Reason | Replacement |
|---|---|---|
| `LM-C001_data_schema_registry.md` | v0.1 monthly schema, not LST/LPI/LSTG/ME2-aware. | `MIG-C004` / `SIM-C006`. |
| `LM-C002_life_state_monthly_stepper.md` | v0.1 month stepper, not storyline/density-aware. | `MIG-C004` / `SIM-C006`. |
| `LM-C003_weight_conditions_engine.md` | v0.1 weight model, not ME2 density-aware. | `MIG-C004` / `SIM-C006`. |
| `LM-C004_effect_applier_logs.md` | v0.1 effects/logs, not v0.2 narrative-chain aware. | `MIG-C004` / `SIM-C006`. |
| `LM-C005_major_choice_hooks.md` | Hooks old major-choice flow. | `MIG-C004` + `MIG-C005`; `SIM-C006` + `SIM-C007`. |
| `LM-C006_persistence_resume.md` | Resumes old `LifeSimulationScreen` state. | `MIG-C008` / `SIM-C008`. |
| `LM-C007_dev_life_sim_page.md` | Old dev UI, not LFP/LifeSimulationV02 route. | `MIG-C008` / `SIM-C008`. |
| `LM-C008_tests_distribution.md` | Tests old monthly distribution only. | `SIM-C011` after ME2 migration. |

### Legacy Major Choices

| Prompt | Reason | Replacement |
|---|---|---|
| `MLC-C001_data_schema_registry.md` | v0.1 major-choice schema. | `MIG-C005` / `SIM-C007`. |
| `MLC-C002_choice_generation_engine.md` | v0.1 choice generation, not MC2/LPI/LSTG-aware. | `MIG-C005` / `SIM-C007`. |
| `MLC-C003_success_resolution_engine.md` | v0.1 success resolver, not MC2-aware. | `MIG-C005` / `SIM-C007`. |
| `MLC-C004_effect_application_and_logs.md` | v0.1 effects/logs. | `MIG-C005` / `SIM-C007`. |
| `MLC-C005_ui_integration_life_sim.md` | Direct old UI integration into `LifeSimulationScreen`. | `MIG-C005` + `MIG-C008`. |
| `MLC-C006_persistence_resume.md` | Old half-year choice persistence. | `MIG-C005` + `MIG-C008`. |
| `MLC-C007_tests_distribution.md` | Old major-choice distribution tests only. | `SIM-C011` after MC2 migration. |

### Legacy Age 18 / Outer Battlefield

| Prompt | Reason | Replacement |
|---|---|---|
| `A18-C001_data_schema_registry.md` | Fixed 18-year awakening and outer-battlefield data path. | `MIG-C009` / `SIM-C010`. |
| `A18-C002_awakening_resolution_engine.md` | Fixed age-18 resolution. | `MIG-C009` / `SIM-C010`. |
| `A18-C003_stat_conversion_and_modifiers.md` | Converts directly to outer-battlefield first-war start. | `MIG-C009` / `SIM-C010`. |
| `A18-C004_hidden_fate_reveal_and_items.md` | Reveal/item flow tied to fixed A18 chain. | `MIG-C006` + `MIG-C009`. |
| `A18-C005_outer_battlefield_run_config.md` | Hardcodes `outer_battlefield_intro`. | `MIG-C009` / `SIM-C010`. |
| `A18-C006_system_home_unlock.md` | Home unlock follows fixed outer-battlefield chain. | `MIG-C009` / `SIM-C010`. |
| `A18-C007_ui_flow_integration.md` | Direct UI path to age-18 awakening and outer battlefield. | `MIG-C009` / `SIM-C010`. |
| `A18-C008_tests_telemetry.md` | Asserts old `age18_awakening -> outer_battlefield_pending` route. | `SIM-C011` after AdultNode bridge. |

### Legacy HFO Age-18 Conversion

| Prompt | Reason | Replacement |
|---|---|---|
| `HFO-C007_age18_conversion.md` | Binds hidden origin/fate conversion to the old age-18 route and emits outer-battlefield/dongfu hooks before AdultNode path scoring. | `HFO2-C007` plus `MIG-C006` and `MIG-C009` / `SIM-C010`. |
| `HFO-C008_tests_telemetry.md` | Tests old 18-year hidden origin/fate conversion instead of HFO2 reveal pacing and AdultNode bridge acceptance. | `HFO2-C008` plus `MIG-C006` and `MIG-C009` / `SIM-C010`. |

## Still Executable Prompts

These prompts may still be executed when their scope matches the current task:

- `codex_prompts/00_SESSION_BOOTSTRAP.md` for First Playable session bootstrap.
- `codex_prompts/00_GLOBAL_PREFIX_SIM_REDESIGN.md` as a mandatory SIM-REDESIGN guard.
- `codex_prompts/00_SIM_REDESIGN_BOOTSTRAP.md` for SIM-REDESIGN orientation.
- `codex_prompts/MIG-C002_data_registry_unification.md` through `MIG-C009_age18_or_adult_node_bridge.md`.
- `codex_prompts/NPF-C001_data_schema_registry.md` through `NPF-C006_tests_telemetry.md`.
- `codex_prompts/DEM-C001_schema_registry.md` through `DEM-C007_tests_telemetry.md`.
- `codex_prompts/HFO2-C001_data_schema_registry.md` through `HFO2-C008_tests_telemetry.md`.
- `codex_prompts/LST-C001_data_schema_registry.md` through `LST-C007_tests_telemetry.md`.
- `codex_prompts/LPI-C001_data_schema_registry.md` through `LPI-C008_tests_telemetry.md`.
- `codex_prompts/LSTG-C001_data_schema_registry.md` through `LSTG-C008_tests_telemetry.md`.
- `codex_prompts/ME2-C001_data_schema_registry.md` through `ME2-C008_dev_page_tests_telemetry.md`.
- `codex_prompts/MC2-C001_data_schema_registry.md` through `MC2-C008_tests_telemetry.md`.
- `codex_prompts/LLM-C001_data_schema_registry.md` through `LLM-C008_tests_telemetry.md`, keeping real LLM optional and sanitized.
- `codex_prompts/LFP-C001_state_machine_and_registry.md` through `LFP-C009_e2e_tests_screenshots.md`.
- Canonical SIM route from `docs/prompt_execution_order_v0.1.md`:
  - `SIM-C001_current_state_audit.md`
  - `SIM-C002_data_registry_unification.md`
  - `SIM-C003_nine_palace_destiny_upgrade.md`
  - `SIM-C004_origin_storyline_item_upgrade.md`
  - `SIM-C005_life_storyline_stage_interlude_core.md`
  - `SIM-C006_monthly_event_v02_upgrade.md`
  - `SIM-C007_major_choice_v02_upgrade.md`
  - `SIM-C008_life_playable_ui_flow.md`
  - `SIM-C009_llm_narrative_offline_first.md`
  - `SIM-C010_adult_node_and_trial_bridge.md`
  - `SIM-C011_e2e_rc_gate.md`
- `codex_prompts/E2E-SIM-001_life_sim_redesign_full_flow.md`.
- `codex_prompts/RC-SIM-001_life_sim_first_playable_gate.md`.
- `codex_prompts/fp_tasks/FP-C001_repository_scaffold.md` through `FP-C024_first_playable_rc.md` when working on the First Playable STG/outgame track.
- `codex_prompts/review_and_qa/*.md` for review and bug triage.

Historical prompts (`OAG-*`, `DT-*`, `HFO-C001~C006`, `BAS-*`) are not deleted or marked deprecated in this pass. Treat them as migration evidence or rerun-only-when-scoped prompts, not as the preferred forward path.

## Duplicate SIM IDs Needing Owner Attention

The prompt root contains multiple files with the same SIM ID. Until renamed or reconciled, use `docs/prompt_execution_order_v0.1.md` as the canonical route and do not execute two prompts with the same ID in one migration step.

| ID | Files present | Current handling |
|---|---|---|
| `SIM-C001` | `SIM-C001_current_state_audit.md`, `SIM-C001_inventory_and_migration_plan.md` | Prefer `SIM-C001_current_state_audit.md`; REVIEW-PRE audit may already satisfy this step. |
| `SIM-C003` | `SIM-C003_nine_palace_destiny_upgrade.md`, `SIM-C003_world_and_nine_palace_integration.md` | Prefer execution-order file; reconcile before implementation if both are needed. |
| `SIM-C004` | `SIM-C004_origin_storyline_item_upgrade.md`, `SIM-C004_destiny_eligibility_v2_integration.md` | Both describe relevant migration work; owner should assign unique order before execution. |
| `SIM-C005` | `SIM-C005_life_storyline_stage_interlude_core.md`, `SIM-C005_origin_storyline_item_v2_integration.md` | Prefer execution-order file; reconcile HFO2 integration dependency before execution. |
| `SIM-C006` | `SIM-C006_monthly_event_v02_upgrade.md`, `SIM-C006_storyline_monthly_choice_engine.md` | Prefer execution-order file; avoid overlapping LM/MC2 work. |
| `SIM-C007` | `SIM-C007_major_choice_v02_upgrade.md`, `SIM-C007_interlude_stage_transition_engine.md` | Prefer execution-order file; reconcile interlude/stage dependency before execution. |
| `SIM-C008` | `SIM-C008_life_playable_ui_flow.md`, `SIM-C008_life_playable_ui_and_persistence.md` | Prefer execution-order file; persistence may need to be a substep. |
| `SIM-C009` | `SIM-C009_llm_narrative_offline_first.md`, `SIM-C009_optional_llm_narrative_pipeline.md` | Prefer offline-first file; keep real LLM optional. |
| `SIM-C010` | `SIM-C010_adult_node_and_trial_bridge.md`, `SIM-C010_e2e_quality_gate.md` | Prefer AdultNode bridge for C010; E2E gate should remain later or be renumbered. |

## Missing Individual Prompt Families

The following names are referenced by planning docs but are not present as individual files under `codex_prompts/`:

```text
POST-BAS-001
WORLD-C001~C003
CCUI2-C001~C006
STG-R001~R002
E2E-C001
RC-C001
```

This is not automatically a blocker: current `SIM-C00x`, `MIG-C00x`, `E2E-SIM-001`, and `RC-SIM-001` prompts cover the active route. It becomes a blocker only if a later task asks to execute one of the missing granular prompt files directly.

## Recommended Next Step

After this inventory:

1. Default to `NPF-C001_data_schema_registry.md`.
2. If `npm run validate:sim-redesign-data` still fails because the imported SIM-REDESIGN payload mixes v0.1/v0.2 wrapper shapes, schedule a registry/validator range repair before runtime or UI migration.
3. Keep `MIG-C003` before any character-creation v0.2 implementation.
4. Do not run `CC-*`, `LM-*`, `MLC-*`, `A18-*`, `HFO-C007`, or `HFO-C008` directly.
5. Before touching runtime, resolve duplicate SIM IDs or state the chosen canonical prompt in the task scope.
