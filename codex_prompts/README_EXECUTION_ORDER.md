# Prompt Execution Order

This file is the lightweight entrypoint for choosing Codex prompts.

Authoritative order:

- `docs/prompt_execution_order_v0.1.md`

Inventory and deprecation status:

- `docs/codex_prompt_inventory_v0.1.md`

Mandatory SIM-REDESIGN guard:

- `codex_prompts/00_GLOBAL_PREFIX_SIM_REDESIGN.md`

## Current Route

For SIM-REDESIGN migration work, read the global prefix first, then use the execution order document. The current inventory pass marks old CC/LM/MLC/A18 prompt families, plus HFO-C007/C008, as deprecated while preserving their paths for history.

Recommended next prompt after this inventory:

```text
WORLD-C001_data_schema_registry.md
```

After WORLD-C001~C003 have a dedicated schema/validator/runtime plan, continue with:

```text
NPF-C001_data_schema_registry.md
```

If `npm run validate:sim-redesign-data` still fails because the imported SIM-REDESIGN payload mixes v0.1/v0.2 wrapper shapes, schedule a registry/validator range repair before runtime or UI migration.

If using the MIG or SIM aggregate route instead, explicitly choose one of:

```text
MIG-C002_data_registry_unification.md
SIM-C002_data_registry_unification.md
```

Do not execute both routes in the same step unless the task explicitly reconciles them.

## Do Not Execute Directly

```text
CC-C001~CC-C006
LM-C001~LM-C008
MLC-C001~MLC-C007
A18-C001~A18-C008
HFO-C007~HFO-C008
```

Reasons:

- CC-C may restore old generated PNG control or portrait-frame character-creation assumptions.
- LM/MLC are legacy v0.1 life-sim prompts and are not LST/LPI/LSTG/ME2/MC2-aware.
- A18 hard-couples 18-year completion to outer battlefield; the current route requires AdultNode path scoring.
- HFO-C007/C008 bind hidden origin/fate conversion and tests to the old age-18 route.

## Still Available

```text
00_SESSION_BOOTSTRAP.md
00_GLOBAL_PREFIX_SIM_REDESIGN.md
00_SIM_REDESIGN_BOOTSTRAP.md
MIG-C002~MIG-C009
WORLD-C001~WORLD-C003
NPF-C001~NPF-C006
DEM-C001~DEM-C007
HFO2-C001~HFO2-C008
LST-C001~LST-C007
LPI-C001~LPI-C008
LSTG-C001~LSTG-C008
ME2-C001~ME2-C008
MC2-C001~MC2-C008
LLM-C001~LLM-C008
LFP-C001~LFP-C009
SIM-C001~SIM-C011, following docs/prompt_execution_order_v0.1.md
E2E-SIM-001_life_sim_redesign_full_flow.md
RC-SIM-001_life_sim_first_playable_gate.md
fp_tasks/FP-C001~FP-C024
review_and_qa/*.md
```

Historical OAG/DT/HFO-C001~C006/BAS prompts remain in place as evidence or rerun-only-when-scoped prompts.

## Missing Placeholders

The following names are still referenced by planning docs but are not present as individual prompt files:

```text
POST-BAS-001
CCUI2-C001~C006
STG-R001~R002
E2E-C001
RC-C001
```

## Guardrails

- Do not modify `src/sim/**` during prompt inventory or docs cleanup.
- Do not expose hidden `trueName` in UI, logs, snapshots, or prompt examples.
- Do not introduce external CDN/fonts/images/audio.
- Run the verification commands requested by the controlling prompt and report missing or failed commands honestly.
