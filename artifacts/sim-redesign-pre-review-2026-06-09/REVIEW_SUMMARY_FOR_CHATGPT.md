# REVIEW-PRE-001 Summary For ChatGPT

## Bottom Line

After re-importing SIM-REDESIGN prompts/docs/data/types/scripts, the current implementation is still mostly the old v0.1 code path plus a MIG-C002 parallel registry. The newly imported NPF/DEM/HFO2/LST/ME2/MC2/LSTG/LPI/LLM/LFP material is present as docs/data/types/scripts, but it is not runtime-connected.

`src/sim/**` was not modified. `git diff --name-only -- src/sim` is empty.

## Current Module Verdict

- OAG: old v0.1 implemented.
- DT: old v0.1 implemented; DEM eligibility/mutation v2 not wired.
- HFO: old v0.1 implemented; HFO2 narrative lifecycle not wired.
- CCUI2: DOM/React route is code-connected and reachable in browser smoke.
- LM: old v0.1 hooks and generated-shell UI; new storyline/density/interlude/stage/playable systems not wired.
- MLC: old v0.1 material only; MC2 v0.2 not wired.
- A18: old HFO age18 resolver/projection exists; adult-node/path-scoring redesign not wired.
- NPF/DEM/HFO2/LST/ME2/MC2/LSTG/LPI/LLM/LFP: imported but not runtime-consumed.
- `NarrativeService`: missing.

## Verification

Passed:

- `npm run typecheck`
- `npm run build`
- `npm run validate:data`
- `npm run check:forbidden`
- `npm run validate:combat-assets`
- `npm run test:determinism`
- `npm run test:headless:stage01`
- `git diff --name-only -- src/sim`

Failed:

- `npm test`
- extra non-gating `npm run validate:sim-redesign-data`
- browser smoke to life simulation

The `npm test` failure is one test in `tests/content/sim-redesign-content-registry.test.ts`, caused by newly imported mixed SIM-REDESIGN files failing MIG-C002's minimal wrapper schema expectations.

Browser smoke reached main menu, save slots, save creation dialog, character creation, and confirm-life dialog. It could not reach life simulation because the confirm-life dialog button was intercepted by `.xianxia-dialog-overlay`; a forced-click audit attempt also did not complete the route.

## Next Recommendation

Do not jump directly to UI/life-sim migration while `npm test` is red from the registry scope conflict. Recommended next step:

1. First resolve or explicitly scope the SIM-REDESIGN registry/validator strategy exposed by MIG-C002.
2. Then execute `NPF-C001_data_schema_registry.md` if the goal is to wire the newly imported Nine Palace data first.

If the team accepts a temporarily red `validate:sim-redesign-data`, `NPF-C001` can proceed, but it should state the known blocker up front.
