# AGENTS.md patch for SIM-REDESIGN

## SIM-REDESIGN rules

- UI controls are DOM/CSS components, not generated PNG controls.
- Generated images are allowed only for backgrounds, icons, illustrations, character art, VFX textures, and combat sprites.
- Character creation uses CCUI2 fate-altar layout.
- Do not execute deprecated `CC-C001~CC-C006` prompts.
- Life simulation uses SIM-REDESIGN v0.2 rules.
- LLM output is narrative-only and cannot mutate gameplay rules or stats.
- Do not modify `src/sim/**` unless the task explicitly requires it.
- After changes run `npm run typecheck`, `npm test`, and `npm run build`.
