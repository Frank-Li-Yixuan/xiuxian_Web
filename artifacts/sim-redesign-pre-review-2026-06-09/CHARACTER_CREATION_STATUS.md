# REVIEW-PRE-001 Character Creation Status

## Route and UI Stack

Character creation is currently code-connected through the React/DOM route:

- `src/app/MainMenuApp.tsx` routes `profile_created` into `CharacterCreationScreen`.
- `src/app/screens/CharacterCreationScreen.tsx` renders `data-testid="character-creation-screen"`.
- The screen uses local UI system primitives: `XianxiaButton`, `XianxiaDialog`, `XianxiaInput`, `XianxiaPanel`.
- The primary character creation controls are DOM buttons/inputs, not generated PNG controls.

Classification: CCUI2 is code-connected and follows the DOM/React route.

## Current Generation Stack

The current character creation flow uses the old v0.1 systems:

- OAG v0.1 for opening attributes/spiritual roots.
- DT v0.1 for destiny rolling, conflict/synergy, locks and reroll.
- HFO v0.1 for background origin, hidden fate internals, visible omens, carried items.
- Profile mapping writes confirmed character data into a profile and sets life simulation state.

NPF/DEM/HFO2 imported types/data are not used by the character creation controller in this audit.

## Hidden Data Exposure

Existing tests assert that hidden fate `trueName`, hidden fate id, and exact progress do not appear in character creation view model or markup before reveal. Browser smoke on the character creation screen recorded:

```json
{
  "bodyContainsTrueNameLiteral": false,
  "bodyContainsKnownHiddenTerms": []
}
```

The smoke did not reach life simulation, so DOM leak coverage after `确认此生` remains incomplete.

## Browser Smoke Status

The latest browser smoke reached:

1. main menu
2. new-game save slot list
3. save-slot creation dialog
4. character creation screen
5. confirm-life dialog

It did not reach `life-simulation-screen`. Normal click on the confirm-life dialog button failed because `.xianxia-dialog-overlay` intercepted pointer events; a forced click was used only as an audit attempt, but the route still did not complete. Evidence:

- `browser_smoke_metrics.json`
- `screenshots/01_main_menu.png`
- `screenshots/02_save_slots.png`
- `screenshots/03_save_slot_dialog.png`
- `screenshots/04_character_creation.png`
- `screenshots/05_confirm_life_dialog.png`
- `screenshots/error.png`

Classification: CCUI2 route is present and reachable, but the confirm-life dialog has an interactive flow risk that blocks a normal browser smoke to life simulation.
