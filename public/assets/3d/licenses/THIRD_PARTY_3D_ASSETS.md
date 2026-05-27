# Third Party 3D Combat Assets

Status: first official Quaternius/Kenney CC0 3D combat placeholder batch is committed.

This inventory tracks every free commercial-use 3D placeholder asset before it can be used by the combat renderer. The v0.1 intake policy prefers GLB or glTF assets from Quaternius and Kenney. Sketchfab assets are not allowed in this phase unless the asset is explicitly CC0 or CC-BY and the attribution requirement is recorded in the manifest and this file.

## Source Policy

- Prefer GLB or glTF 2.0 files.
- FBX or OBJ files may be stored only when conversion status is recorded in `public/assets/3d/manifest.v0.1.json`.
- Do not commit assets with unclear, missing, AI-generated-with-unknown-rights, personal-use-only, editorial-only, or non-commercial licenses.
- Every asset entry must record source, license, author if available, download URL, attribution requirement, download date, original filename, transforms, gameplay role, required flag, fallback primitive, and notes.
- Run `npm run validate:3d-assets` after editing the manifest or adding/removing 3D asset files.

## Attribution Inventory

| Asset id | Display name | Category | Source | Author | License | Attribution required | Source URL | Local path | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `player.baseHumanoid` | Base Humanoid Placeholder | player | Quaternius Universal Base Characters | Quaternius | CC0 | No | https://quaternius.com/packs/universalbasecharacters.html | `/assets/3d/combat/player/player.baseHumanoid/Superhero_Male_FullBody.gltf` | Runtime-ready glTF. Free standard pack full-body humanoid selected as cultivator stand-in. |
| `artifact.sword` | Qingshuang Sword Placeholder | artifact | Kenney Mini Dungeon | Kenney | CC0 | No | https://kenney.nl/assets/mini-dungeon | `/assets/3d/combat/artifacts/artifact.sword/weapon-sword.glb` | Runtime-ready GLB sword placeholder. |
| `pickup.qiOrb` | Qi Orb Placeholder | pickup | Kenney Blaster Kit | Kenney | CC0 | No | https://kenney.nl/assets/blaster-kit | `/assets/3d/combat/pickups/pickup.qiOrb/bullet-foam.glb` | Runtime-ready GLB round projectile used as qi orb placeholder. |
| `enemy.smallImp` | Small Imp Placeholder | enemy | Quaternius Ultimate Monsters | Quaternius | CC0 | No | https://quaternius.com/packs/ultimatemonsters.html | `/assets/3d/combat/enemies/enemy.smallImp/Orc.gltf` | Runtime-ready embedded glTF Blob Orc used as mountain imp stand-in. |
| `enemy.wolfBeast` | Wolf Beast Placeholder | enemy | Quaternius Ultimate Animated Animal Pack | Quaternius | CC0 | No | https://quaternius.com/packs/ultimateanimatedanimals.html | `/assets/3d/combat/enemies/enemy.wolfBeast/Wolf.gltf` | Runtime-ready embedded glTF wolf demon placeholder. |
| `enemy.insect` | Insect Placeholder | enemy | Quaternius Ultimate Monsters | Quaternius | CC0 | No | https://quaternius.com/packs/ultimatemonsters.html | `/assets/3d/combat/enemies/enemy.insect/Armabee.gltf` | Runtime-ready embedded glTF bug/horde placeholder. |
| `enemy.stoneGolem` | Stone Golem Placeholder | enemy | Quaternius Ultimate Monsters | Quaternius | CC0 | No | https://quaternius.com/packs/ultimatemonsters.html | `/assets/3d/combat/enemies/enemy.stoneGolem/Goleling.gltf` | Runtime-ready embedded glTF tank enemy placeholder. |
| `boss.floatingCrystal` | Floating Crystal Boss Placeholder | boss | Quaternius 3D Card Kit - Fantasy | Quaternius | CC0 | No | https://quaternius.com/packs/3dcardkitfantasy.html | `/assets/3d/combat/bosses/boss.floatingCrystal/21_Element_Lightning.gltf` | Runtime-ready glTF fallback. Fantasy Props free standard pack had no crystal model; Lightning Element card scene is used as the floating energy/crystal boss stand-in. |

## Batch Notes

- Download date for this batch: 2026-05-26.
- No Sketchfab, non-commercial, no-derivatives, editorial, personal-use-only, CDN runtime, or unclear-license assets were used.
- Source ZIPs were downloaded only into ignored scratch space under `artifacts/3d-source-downloads/`; only selected runtime files and required textures were copied into `public/assets/3d/combat/**`.
- The Quaternius Universal Base Characters glTF references two `_png` texture names that are absent as separate files in the ZIP. The matching source normal maps are included in the asset folder under those referenced names for loader compatibility.

## Preferred First-Pass Sources

| Source | Typical license | Usage note |
|---|---|---|
| Quaternius | CC0 / public-domain-style releases, verify per page | Good first pass for low-poly characters, creatures, props, and environment placeholders. |
| Kenney | CC0, verify per package page | Good first pass for game-ready placeholder props and simple combat readability assets. |
