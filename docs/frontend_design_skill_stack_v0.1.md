# Frontend Design Skill Stack v0.1

This repository uses a game-first DOM UI workflow. Future UI work should follow this stack unless a later task explicitly authorizes a design-system migration.

## Selected Skills And References

- Primary local skill: `game-studio:game-ui-frontend`.
- Frontend design references: Anthropic `frontend-design`, Koomook `distinctive-frontend`, Hue, and design-review style visual QA.
- Runtime implementation: hand-built DOM surfaces, `src/app/ui-system`, Radix-backed `XianxiaDialog`, and `motion/react`.
- Reference only: `shadcn/ui`, Tailwind CSS, Radix primitives, and Hue-generated design systems. Do not install or migrate to them during narrow UI tasks.

## Project UI Direction

- Visual language: xianxia talisman lines, jade-teal spiritual light, medicine copper, ink-dark panels, low-saturation glow.
- Typography: use existing local/system Chinese font stacks already present in `src/app/main-menu.css`; do not add external fonts.
- Motion: use restrained state-change motion for confirmation, transition, result, danger, or reward. Respect `prefers-reduced-motion`.
- Layout: protect the current LifeSimulation page structure. Use one dominant decision surface and modal/dialog disclosure instead of dashboard-style card grids.
- Components: use project primitives first: `XianxiaDialog`, `XianxiaButton`, `XianxiaPanel`, semantic HTML, and scoped CSS. Do not use generated PNG UI components for new LifeSimulation or LPI flow surfaces.

## LPI-C006 Decision

- The LifeSimulation interlude flow is built with hand-authored DOM and CSS.
- Do not use `GeneratedPanel`, `GeneratedFrame`, `GeneratedImageButton`, or `/assets/generated/ui/life_simulation/*` for this flow.
- Decorative structure should come from CSS borders, talisman lines, jade/copper color, panel shadows, and reduced-motion-aware Motion transitions.

## Review Checklist

- No external CDN, images, fonts, shader libraries, or runtime design-system dependencies.
- No generic purple gradient, Inter-template, SaaS dashboard, or equal-weight card wall.
- Public DOM, screenshots, and public JSON must not expose hidden true names or `hiddenFateInternal`.
- Text must fit in desktop and compact layouts; long IDs need wrapping or containment.
- Buttons need visible hover/focus/disabled states.
- Reduced-motion mode must disable nonessential animation.
- `src/sim/**` remains untouched for UI work.
