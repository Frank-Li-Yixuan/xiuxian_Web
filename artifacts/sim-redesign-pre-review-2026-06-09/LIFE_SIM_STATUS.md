# REVIEW-PRE-001 Life Simulation Status

## Current Runtime State

The current life simulation code is v0.1 partial/runtime-hook implementation:

- `src/lifeSimulation/LifeSimulationInitializer.ts` creates initial life simulation state.
- `src/lifeSimulation/OriginFateLifeHooks.ts` maps origin fate information into monthly life event bias and hidden fate bands.
- `src/lifeSimulation/DestinyProjectionHooks.ts` maps destiny information into mode modifiers, including `outer_battlefield` and `outer_battlefield_intro`.
- Tests under `tests/life-sim/**` cover origin fate hooks and destiny projection hooks.

Classification: old v0.1 implementation and hooks exist; the imported SIM-REDESIGN life systems are not runtime-connected.

## UI State

`src/app/screens/LifeSimulationScreen.tsx` is a generated UI shell:

- It imports `GeneratedFrame`, `GeneratedImageButton`, and `GeneratedPanel`.
- It uses `className="life-simulation-screen generated-ui-screen"`.
- It renders placeholder timeline/log/choice panels and `life-choice-button` generated image buttons.

Classification: risk待迁移. This remains in tension with the global SIM-REDESIGN rule that generated images should not be primary interactive controls.

## New Imported Life-Sim Material

The following imported data/type/script families are present but not runtime-consumed:

- LST: `data/life_storylines/**`, `src/types/life-storylines-types.v0.1.ts`, `scripts/validate_life_storylines_data.mjs`
- ME2: `data/life_sim_v02/**`, `src/types/monthly-event-v02-types.ts`, `scripts/validate_monthly_events_v02.mjs`
- MC2: `data/life_choices_v02/**`, `src/types/major-life-choice-v02-types.ts`, `scripts/validate_major_choices_v02.mjs`
- LSTG: `data/life_stage/**`, `src/types/life-stage-transition-types.v0.1.ts`, `scripts/validate_life_stage_data.mjs`
- LPI: `data/life_interludes/**`, `src/types/life-interlude-types.v0.1.ts`, `scripts/validate_life_interludes_data.mjs`
- LFP: `data/life_playable/**`, `src/types/life-sim-playable-types.v0.1.ts`, `scripts/validate_life_playable_data.mjs`
- LLM: `data/llm_narrative/**`, `src/types/llm-narrative-types.v0.1.ts`, `scripts/validate_llm_narrative_data.mjs`

## A18 / Adult Node

Current A18 support is old HFO age18 conversion and destiny projection, not the redesigned adult-node/path-scoring system:

- `src/originFate/Age18OriginFateResolver.ts` can resolve hidden fate reveal/conversion at age 18.
- `src/lifeSimulation/DestinyProjectionHooks.ts` has mode handling for `outer_battlefield`.
- `data/age18/**` is tracked and code/test referenced.

The new life-stage docs/data explicitly describe 18 years old as a default adult node with multiple possible exits and `outer_battlefield` as fallback, but that path-scoring runtime is not implemented.

## Browser Evidence

The browser smoke did not reach `life-simulation-screen` because the character creation confirm dialog blocked the route. Therefore live DOM evidence for life simulation is incomplete in this audit. Static source evidence still shows the generated image button risk.
