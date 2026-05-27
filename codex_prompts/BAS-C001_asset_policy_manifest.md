# BAS-C001：资产授权策略、目录、Manifest、校验脚本

## 目标

建立 2D 战斗资源与音效资源的工程管线。不要下载资源，不要接入战斗。

## 约束

- 不修改 `src/sim/**`。
- 不改 gameplay。
- 不下载任何资源。
- 不引入 CDN。
- 不使用 generated PNG 控件方案。
- 本任务只建目录、manifest、license 文档、校验脚本。

## 任务

1. 创建目录：

```text
public/assets/2d/
public/assets/2d/combat/bullets/
public/assets/2d/combat/vfx/
public/assets/2d/combat/pickups/
public/assets/2d/combat/enemies/
public/assets/2d/combat/player/
public/assets/2d/combat/backgrounds/
public/assets/2d/licenses/

public/assets/audio/
public/assets/audio/ui/
public/assets/audio/combat/
public/assets/audio/spells/
public/assets/audio/pickups/
public/assets/audio/ambience/
public/assets/audio/licenses/
```

2. 创建：

```text
public/assets/2d/manifest.v0.1.json
public/assets/audio/manifest.v0.1.json
public/assets/2d/licenses/THIRD_PARTY_2D_ASSETS.md
public/assets/2d/licenses/ATTRIBUTION.md
public/assets/audio/licenses/THIRD_PARTY_AUDIO_ASSETS.md
public/assets/audio/licenses/ATTRIBUTION.md
scripts/validate-combat-assets.mjs
```

3. Manifest 字段必须支持文档中的 2D / audio schema。

4. 校验脚本要求：
   - license 必填。
   - sourceUrl 必填。
   - allowed license：CC0, Public Domain, CC-BY, MIT, Internal Placeholder, Custom Permissive。
   - required asset 文件必须存在。
   - spriteSheet 必须有 frameWidth/frameHeight/frameCount/fps。
   - audio 必须有 mixGroup/volume/cooldownMs/maxInstances。

5. 加 npm script：

```json
"validate:combat-assets": "node scripts/validate-combat-assets.mjs"
```

## 验收

- `npm run validate:combat-assets` 通过。
- `npm run typecheck` 通过。
- `npm test` 通过。
- `git diff --name-only -- src/sim` 无输出。
