# AGENTS.md — 双人雷霆战机修仙版 v0.1 First Playable

## Repository role
This repository is for a PC wide-screen vertical scrolling STG + Roguelike + outgame xiuxian progression prototype.
The v0.1 target is **First Playable**, not a full game.

## Must-read documents before implementation
Read these in order before touching code:

1. `START_HERE.md`
2. `PROJECT_DOCUMENT_INDEX.md`
3. `docs_packages/08_first_playable_acceptance/docs/first_playable_integration_acceptance_v0.1.md`
4. `docs_packages/05_engineering_codex_plan/docs/engineering_architecture_and_codex_plan_v0.1.md`
5. `docs_packages/05_engineering_codex_plan/docs/module_boundaries_v0.1.md`
6. The specific package documents relevant to your task.

## Non-negotiable design rules

### 1. Dual progression tracks must never be merged
- `TeamInsightExpState`: team-shared spirit/experience for Roguelike insight choices.
- `PlayerCultivationState`: personal cultivation for realm layers, bottlenecks, tribulation, and life-tier growth.
- Spirit/experience triggers `InsightSession`.
- Cultivation triggers small realm-layer breakthroughs or tribulation.
- Do not name insight experience `cultivationExp` or treat cultivation as ordinary XP.

### 2. PC STG control model
- Mandatory vertical scrolling STG structure.
- No mouse aiming for v0.1.
- Auto normal attack through natal artifact.
- Active spells on `J/K/L/I`.
- Pills on `1/2/3`, with digestion over time.
- Focus mode reduces speed and highlights hitbox.

### 3. Deterministic simulation first
`src/sim/**` is a deterministic gameplay simulation layer. It must not use:

- `Math.random()`
- `Date.now()` / `performance.now()`
- `requestAnimationFrame`
- DOM / Canvas APIs
- Audio APIs
- network fetches
- localStorage
- real elapsed time for gameplay

Use fixed 60 FPS frames and seeded RNG streams.

### 4. Renderer and UI are consumers, not simulation owners
- Renderer reads ViewState and EffectEvents.
- Renderer can create visual particles but cannot mutate gameplay state.
- UI cannot directly read DOM input for gameplay.
- UI cannot decide rewards, drops, or collisions.

### 5. No external resources for v0.1
Do not add CDN dependencies, external fonts, external images, external audio, or external shader libraries.
Use Canvas 2D procedural rendering, system fonts, local JSON, and procedural audio where needed.

### 6. Data-driven content
The following must be data driven:
- stages, segments, waves
- enemies and bosses
- artifacts, spirit treasures, spells, pills
- rewards and drops
- cultivation realms and tribulations
- UI layout and VFX profiles
- outgame recipes, buildings, upgrades, settlement receipts

Use `implementation_assets/data/**` as the consolidated v0.1 data source.

## Expected project commands
When creating the code repository, define at minimum:

```bash
npm run dev
npm run build
npm run typecheck
npm test
npm run validate:data
npm run check:forbidden
npm run test:determinism
npm run test:headless:stage01
```

## Definition of done for a Codex task
A task is done only when:

1. It stays inside its declared scope.
2. It updates or adds tests when behavior changes.
3. It runs the relevant validation commands.
4. It keeps deterministic simulation pure.
5. It does not broaden v0.1 scope without instruction.
6. It reports changed files, commands run, and any remaining risks.

## v0.1 implementation priority
Do not begin with Canvas polish. Build in this order:

1. Repository scaffold.
2. Seeded RNG.
3. Fixed tick + frame input.
4. Content registry and data validation.
5. Headless simulation.
6. Basic Canvas renderer.
7. Local two-player playable.
8. First stage, boss, settlement, outgame loop.
9. Determinism harness.
10. First Playable RC.
