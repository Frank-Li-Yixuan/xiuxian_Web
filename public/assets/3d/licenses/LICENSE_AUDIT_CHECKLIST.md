# 3D Asset License Audit Checklist

Use this checklist before adding any 3D combat placeholder asset to `public/assets/3d/**`.

## Before Download

- Confirm the asset is free for commercial use.
- Confirm the exact license is one of: `CC0`, `CC-BY`, `MIT`, `Public Domain`, or `Internal Placeholder`.
- Reject assets with missing, unclear, non-commercial, editorial-only, or personal-use-only terms.
- Prefer Quaternius or Kenney for the first pass.
- Use Sketchfab only when the license is explicitly `CC0` or `CC-BY`.

## Required Evidence

- Save the source page URL in `sourceUrl`.
- Record `sourceName`, `author`, `license`, `attributionRequired`, `downloadDate`, and `originalFileName`.
- Record whether attribution text is required.
- Add an attribution row to `THIRD_PARTY_3D_ASSETS.md`.
- Keep any license text or source proof with the asset package when the source provides it.

## File And Format Rules

- Prefer `.glb` or `.gltf` runtime files.
- Put files under the matching category in `public/assets/3d/combat/**`.
- FBX or OBJ is acceptable only when `notes` clearly states whether it is converted, pending conversion, or retained as a source file.
- Do not wire assets into combat rendering or gameplay in the intake task.
- Do not modify `src/sim/**` for asset intake.

## Manifest Review

- Add one manifest entry per asset in `public/assets/3d/manifest.v0.1.json`.
- Use `planned: true` only when the asset has not been downloaded yet.
- Do not leave `license` or `sourceUrl` empty, including planned entries.
- Set `required: true` only when a missing file should fail validation.
- Set `fallbackPrimitive` so future render code can degrade to a procedural placeholder.
- Run `npm run validate:3d-assets` before committing.
