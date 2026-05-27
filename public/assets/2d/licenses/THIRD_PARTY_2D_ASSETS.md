# Third-Party 2D Assets

This document covers assets registered in `public/assets/2d/manifest.v0.1.json`.

BAS-C002 policy: only CC0 or Public Domain assets are accepted. No CC-BY, NC, ND, SA, GPL, unknown-license, generated PNG UI controls, CDN, or remote runtime image dependencies are used in this intake.

## Registered Assets

| Asset ID | Local file | Source | Author | License | Original file | Changes |
|---|---|---|---|---|---|---|
| `projectile.player_energy_01` | `public/assets/2d/combat/bullets/player_energy_01.png` | https://opengameart.org/content/space-shooter-redux | Kenney | CC0 | `PNG/Lasers/laserBlue08.png` | Selected one projectile PNG from the Space Shooter Redux archive. |
| `projectile.enemy_danger_01` | `public/assets/2d/combat/bullets/enemy_danger_01.png` | https://opengameart.org/content/space-shooter-redux | Kenney | CC0 | `PNG/Lasers/laserRed08.png` | Selected one red projectile PNG with white core and danger edge. |
| `pickup.qi_orb_01` | `public/assets/2d/combat/pickups/qi_orb_01.png` | https://opengameart.org/content/powerup-animated-orb | jcrown41 | CC0 | `Animated Orb.zip/Spnning Orb/Green/frame 1-6.png` | Stitched six green frames horizontally into one transparent sprite sheet. |
| `pickup.zhenyuan_orb_01` | `public/assets/2d/combat/pickups/zhenyuan_orb_01.png` | https://opengameart.org/content/powerup-animated-orb | jcrown41 | CC0 | `Animated Orb.zip/Spnning Orb/Blue/frame 1-6.png` | Stitched six blue frames horizontally into one transparent sprite sheet. |
| `vfx.explosion.small_01` | `public/assets/2d/combat/vfx/explosion_small_01.png` | https://opengameart.org/content/explosion-7 | BenHickling | CC0 | `explosion1.png` | Copied source sprite sheet without pixel edits. |
| `vfx.lightning.chain_01` | `public/assets/2d/combat/vfx/lightning_chain_01.png` | https://lpc.opengameart.org/content/m484-lightning-weapon | Master484 | Public Domain | `M484LightningWeapon.png` | Copied source sheet; runtime extraction/mapping is deferred. |
| `vfx.slash.sword_01` | `public/assets/2d/combat/vfx/slash_sword_01.png` | https://opengameart.org/content/pixel-art-sword-slash-effect | tbbk | CC0 | `pixel_art_sword_slash_sprites.png` | Copied source sprite sheet without pixel edits. |
| `vfx.heal.green_01` | `public/assets/2d/combat/vfx/heal_green_01.png` | https://opengameart.org/content/nature-magic-effect | Cethiel | CC0 | `Nature Magic Effect.zip/0-1.png through 0-5.png` | Stitched five frames horizontally into one uniform transparent sprite sheet. |
| `vfx.shield.barrier_01` | `public/assets/2d/combat/vfx/shield_barrier_01.png` | https://opengameart.org/content/barrier-sprite-sheet | gfroad | CC0 | `barrier000.png` | Copied source sprite sheet without pixel edits. |
| `background.space_dark_01` | `public/assets/2d/combat/backgrounds/space_dark_01.png` | https://opengameart.org/content/space-background-3 | ansimuz | CC0 | `space_background_pack.zip/layers/parallax-space-backgound.png` | Selected one dark base parallax layer from the source pack. |
| `entity.player.cultivator_01` | `public/assets/2d/combat/player/player_cultivator_01.png` | `internal://baked/3d-to-2d/entity-sprites/player.baseHumanoid` | Quaternius; baked locally by Xiuxian STG Team | CC0 | `player.baseHumanoid/Superhero_Male_FullBody.gltf` | Baked locally from the existing CC0 3D player humanoid into a 128x128 sprite sheet. |
| `entity.player.soul_01` | `public/assets/2d/combat/player/player_soul_01.png` | `internal://baked/3d-to-2d/entity-sprites/player.baseHumanoid-soul` | Quaternius; baked locally by Xiuxian STG Team | CC0 | `player.baseHumanoid/Superhero_Male_FullBody.gltf` | Baked locally from the existing CC0 3D player humanoid with spirit tint. |
| `entity.enemy.mountain_imp_01` | `public/assets/2d/combat/enemies/mountain_imp_01.png` | `internal://baked/3d-to-2d/entity-sprites/enemy.smallImp` | Quaternius; baked locally by Xiuxian STG Team | CC0 | `enemy.smallImp/Orc.gltf` | Baked locally from the existing CC0 3D Orc stand-in. |
| `entity.enemy.wolf_demon_01` | `public/assets/2d/combat/enemies/wolf_demon_01.png` | `internal://baked/3d-to-2d/entity-sprites/enemy.wolfBeast` | Quaternius; baked locally by Xiuxian STG Team | CC0 | `enemy.wolfBeast/Wolf.gltf` | Baked locally from the existing CC0 3D Wolf stand-in. |
| `entity.enemy.elite_split_wind_wolf_01` | `public/assets/2d/combat/enemies/elite_split_wind_wolf_01.png` | `internal://baked/3d-to-2d/entity-sprites/enemy.wolfBeast-elite` | Quaternius; baked locally by Xiuxian STG Team | CC0 | `enemy.wolfBeast/Wolf.gltf` | Baked locally from the existing CC0 3D Wolf stand-in with elite scale/tint. |
| `entity.enemy.rogue_cultivator_shadow_01` | `public/assets/2d/combat/enemies/rogue_cultivator_shadow_01.png` | `internal://baked/3d-to-2d/entity-sprites/player.baseHumanoid-shadow` | Quaternius; baked locally by Xiuxian STG Team | CC0 | `player.baseHumanoid/Superhero_Male_FullBody.gltf` | Baked locally from the existing CC0 3D humanoid with shadow cultivator tint. |
| `entity.enemy.stone_armor_demon_01` | `public/assets/2d/combat/enemies/stone_armor_demon_01.png` | `internal://baked/3d-to-2d/entity-sprites/enemy.stoneGolem` | Quaternius; baked locally by Xiuxian STG Team | CC0 | `enemy.stoneGolem/Goleling.gltf` | Baked locally from the existing CC0 3D Goleling stand-in. |

## Intake Notes

- Download date: 2026-05-26.
- Runtime assets are local PNG files under `public/assets/2d/combat/**`.
- BAS-C009 entity sheets are local derivatives of already registered CC0 3D combat assets under `public/assets/3d/**`; no new downloads were performed.
- Source archives were used only as temporary intake material and are not kept in the repository.
- Total local runtime PNG size remains below the 20 MB per-file asset cap.
