# NPF / DEM Execution Order v0.1

## Why This Patch Exists

The SIM redesign total integration route correctly references the Nine Palace Fate Matrix and Destiny Eligibility Mutation systems, but the integration package did not embed their prompt files.

This patch supplies the missing prompt files so Codex can execute the route without hunting across separate packages.

## Boundary

NPF means:

```text
Nine Palace Fate Matrix
```

It owns:

```text
nine attributes
three powers scoring
yinyang / wuxing inclination
derived scores
causality tags
event bias hooks
```

DEM means:

```text
Destiny Eligibility Mutation
```

It owns:

```text
destiny definitions v2
eligibility evaluation
anti-condition rejection
weak support handling
conflict / synergy
mutation resolution
life manifestation hooks
```

Do not merge the two concepts into one blob. NPF calculates the character's fate structure. DEM decides which destiny traits can legally appear from that structure.

## Required Precondition

Run first:

```text
00_GLOBAL_PREFIX_SIM_REDESIGN
REVIEW-PRE-001_current_implementation_audit
MIG-C001_prompt_inventory_and_deprecation
MIG-C002_data_registry_unification
```

Do not modify the LifeSimulation runtime before the registry and evaluator layers pass tests.

## Recommended Execution Order

```text
NPF-C001_data_schema_registry
NPF-C002_scoring_engine
DEM-C001_schema_registry
DEM-C002_eligibility_evaluator
DEM-C003_mutation_resolver
DEM-C004_conflict_synergy_engine_v2
NPF-C003_destiny_eligibility_mutation_engine
NPF-C004_opening_destiny_integration
DEM-C005_life_manifestation_hooks
DEM-C006_character_creation_integration
NPF-C005_life_event_hooks_integration
NPF-C006_tests_telemetry
DEM-C007_tests_telemetry
```

## Why This Order

1. NPF registry loads the raw nine palace data.
2. NPF scoring creates derived values used by destiny checks.
3. DEM registry loads destiny v2 definitions.
4. DEM evaluator checks legal destiny eligibility.
5. DEM mutation resolver handles anti-match and weak-support cases.
6. DEM conflict/synergy resolves final trait sets.
7. NPF-C003 connects derived scores to destiny evaluation.
8. NPF-C004 and DEM-C006 connect the result to character creation.
9. DEM-C005 and NPF-C005 expose life-sim event hooks.
10. NPF-C006 and DEM-C007 lock the behavior with tests and telemetry.

## Hard Acceptance

Codex must verify:

```text
npm run typecheck
npm test
npm run build
```

If scripts exist, also run:

```text
npm run validate:nine-palace-data
node scripts/validate_destiny_eligibility_data.mjs
npm run validate:data
npm run check:forbidden
```

## Behavioral Gates

The implementation must prove:

```text
Low comprehension + low inspiration cannot produce original Heaven-Jealous Genius.
High comprehension + low lifespan can produce Heaven-Jealous Genius.
Waste Root Defies Fate can appear only under legal low-root/high-will conditions.
High talent cannot remain original Waste Root Defies Fate; it must be rejected or mutated.
Hidden true names are not shown in character creation.
Destiny results are deterministic for the same seed/input.
No Math.random appears in NPF/DEM evaluation logic.
```

## Continue After This Patch

After all NPF/DEM tasks pass, continue:

```text
MIG-C003_character_creation_v02_adapter
MIG-C004_life_sim_v02_core_integration
MIG-C005_life_choice_interlude_stage_integration
```

