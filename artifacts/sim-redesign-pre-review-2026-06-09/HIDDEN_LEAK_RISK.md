# REVIEW-PRE-001 Hidden Leak Risk

## Summary

No direct pre-reveal UI leak of hidden `trueName` was proven in this audit. Existing tests strongly assert hidden `trueName` privacy in character creation view models and server-rendered markup. However, newly imported HFO2/LLM data and scripts contain internal true-name fields by design, and future LLM or life-sim wiring must keep those fields out of UI/log/prompt payloads until reveal.

## Evidence That Leak Guards Exist

Tests found by scan include:

- `tests/app/character-creation-view-model.test.ts`: asserts origin view model does not contain hidden true name, hidden id, or progress.
- `tests/app/character-creation-origin-fate-ui.test.ts`: asserts markup and visible text do not contain hidden true name/id/progress.
- `tests/character/character-creation-controller-origin-fate.test.ts`: asserts draft visible hidden fate does not contain true name/progress.
- `tests/origin-fate/origin-fate-distribution-telemetry.test.ts`: asserts true name exposure count is zero and debug samples do not contain `trueName`.
- `tests/origin-fate/hidden-fate-generator.test.ts`: asserts visible omen does not contain internal true name.

## Places Where Hidden/Internal Names Exist

Expected internal occurrences:

- `src/types/origin-fate-types.v0.1.ts`
- `src/types/origin-fate-narrative-types.v0.2.ts`
- `src/types/age18-awakening-types.v0.1.ts`
- `data/origin_fate/**`
- `data/origin_fate_v02/**`
- `scripts/validate_origin_fate_data.mjs`
- `scripts/validate_origin_fate_v02.mjs`
- HFO/A18 tests with explicit internal fixture IDs

These are internal schema/test/data references, not automatically UI leaks.

## Browser DOM Check

Latest smoke reached character creation and recorded:

```json
{
  "bodyContainsTrueNameLiteral": false,
  "bodyContainsKnownHiddenTerms": []
}
```

The smoke did not reach life simulation, so life simulation DOM leak coverage remains incomplete.

## LLM-Specific Risk

The newly imported LLM package has prompt templates, sample requests, sanitizer data, and narrative task definitions. No `NarrativeService` implementation exists, which means there is no active runtime leak path yet. The risk is future wiring: hidden `trueName` must not enter LLM input, generated logs, prompt examples, cache keys, telemetry, or DOM unless the system has explicitly revealed it.

## Verdict

Current status: no proven leak in reachable character creation UI; internal `trueName` data is present as expected; LLM/life-sim leak risk remains pending migration safeguards.
