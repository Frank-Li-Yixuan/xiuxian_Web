# BAS-C004：建立 `/dev/2d-assets` 与 `/dev/audio-assets`

## 目标

资源接入战斗前先能预览、播放、检查授权。

## 任务

1. 创建 `/dev/2d-assets`：
   - 按 category 分组展示 2D 资产。
   - spriteSheet 自动播放。
   - 支持 dark background 预览。
   - 显示 frameWidth/frameHeight/frameCount/fps/blendMode。
   - 显示 source/license/author。
   - missing asset 显示占位。

2. 创建 `/dev/audio-assets`：
   - 按 mixGroup 分组。
   - 播放/停止按钮。
   - 显示 volume/cooldown/maxInstances/duration/source/license。
   - 显示 CC-BY attribution 提醒。

3. 不接入正式战斗。

## 验收

- 两个 dev 页面可打开。
- VFX 动画能播放。
- 音效能播放。
- 授权元数据可见。
- `npm run typecheck`、`npm test`、`npm run build` 通过。
- 不改 `src/sim/**`。
