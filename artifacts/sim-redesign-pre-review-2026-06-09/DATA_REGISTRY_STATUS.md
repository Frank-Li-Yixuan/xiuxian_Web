# REVIEW-PRE-001 Data Registry Status

## Summary

The current repo has three distinct data states:

1. Existing v0.1 runtime data that is already imported by code/tests.
2. MIG-C002's parallel SIM-REDESIGN registry and one minimal checked-in JSON per required domain.
3. Newly re-imported SIM-REDESIGN data bundles that are present in `data/**` but are not runtime-consumed and do not match MIG-C002's minimal registry wrapper schema.

## Code-Consumed Data

The following data sets are actively consumed by code or test-backed registries:

| Data path | Status | Evidence |
|---|---|---|
| `data/opening/**` | Code-connected | Opening generators and tests import/load opening registry data. |
| `data/destiny/**` | Code-connected | DT v0.1 registry/roller tests import `data/destiny/*.v0.1.json`. |
| `data/origin_fate/**` | Code-connected | HFO v0.1 registry/generator/tests import `data/origin_fate/*.v0.1.json`. |
| `data/life_sim/**` | Partly code-connected | Life hooks/tests consume v0.1 monthly events; UI remains placeholder. |
| `data/life_choices/**` | Partly code-connected/planning | v0.1 choice types/data exist; full runtime choice flow is not implemented. |
| `data/age18/**` | Code-connected for old A18 hooks | `DestinyProjectionHooks` imports `data/age18/destiny_projection_rules.v0.1.json`; `Age18OriginFateResolver` uses HFO reveal rules. |
| First-playable combat/outgame data | Code-connected | Existing `validate:data`, headless, determinism, stage01 tests pass. |

## MIG-C002 Core Payload

MIG-C002 introduced a parallel SIM-REDESIGN registry:

- `src/data/SimRedesignRegistry.ts`
- `src/data/registries/SimRedesignDomainRegistry.ts`
- `tools/validate-sim-redesign-data.ts`
- `tests/content/sim-redesign-content-registry.test.ts`

It expects every JSON file under these 11 directories to use the same minimal shape:

```json
{
  "schemaVersion": "0.2",
  "domain": "domain_name",
  "id": "domain.unique_id",
  "items": []
}
```

The domain list is:

- `data/world`
- `data/fate_matrix`
- `data/destiny_v2`
- `data/origin_fate_v02`
- `data/life_storylines`
- `data/life_interludes`
- `data/life_stage`
- `data/life_sim_v02`
- `data/life_choices_v02`
- `data/llm_narrative`
- `data/life_playable`

## Re-Imported Data Inventory

| Directory | JSON files | Tracked | Untracked | Current classification |
|---|---:|---:|---:|---|
| `data/world` | 1 | 1 | 0 | MIG-C002 minimal payload, registered. |
| `data/fate_matrix` | 7 | 1 | 6 | Minimal payload plus NPF imported data; imported data not runtime-consumed. |
| `data/destiny_v2` | 8 | 1 | 7 | Minimal payload plus DEM imported data; imported data not runtime-consumed. |
| `data/origin_fate_v02` | 8 | 1 | 7 | Minimal payload plus HFO2 imported data; imported data not runtime-consumed. |
| `data/life_storylines` | 5 | 1 | 4 | Minimal payload plus LST imported data; not runtime-consumed. |
| `data/life_interludes` | 7 | 1 | 6 | Minimal payload plus LPI imported data; not runtime-consumed. |
| `data/life_stage` | 8 | 1 | 7 | Minimal payload plus LSTG imported data; not runtime-consumed. |
| `data/life_sim_v02` | 8 | 1 | 7 | Minimal payload plus ME2 imported data; not runtime-consumed. |
| `data/life_choices_v02` | 7 | 1 | 6 | Minimal payload plus MC2 imported data; not runtime-consumed. |
| `data/llm_narrative` | 9 | 1 | 8 | Minimal payload plus LLM imported data; not runtime-consumed. |
| `data/life_playable` | 7 | 1 | 6 | Minimal payload plus LFP imported data; not runtime-consumed. |
| `data/sim_redesign` | 12 | 0 | 12 | Planning/metadata data, not treated as MIG-C002 gameplay payload. |

## Validator Failure

`npm run validate:sim-redesign-data` fails because it scans all JSON files in the 11 target folders. The newly imported files use rich domain-specific schemas and therefore fail MIG-C002 minimal checks such as:

- `domain must be '<domain>'`
- `id must be a string`
- `items must be an array`
- `schemaVersion must be '0.2'`

This is also why `npm test` fails in `tests/content/sim-redesign-content-registry.test.ts`.

Classification: data registry range/validator strategy pending follow-up. This audit did not change or fix it.
