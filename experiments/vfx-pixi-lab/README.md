# Pixi VFX Lab

隔离的 PixiJS Filters 特效验证页，用来对照主游戏 Canvas 2D VFX 的观感上限。

## Run

```bash
npm install
npm run dev -- --host 127.0.0.1
```

当前 Codex 启动的本地服务为：

```text
http://127.0.0.1:5175/
```

## Review Scenes

- `five_thunder_chain`: 五雷正法连锁，验证 Shockwave、Glow、Bloom 对电弧命中反馈的提升。
- `red_lotus_field`: 红莲业火铺场，验证火场热浪和敌弹白芯可读性。
- `sleeve_universe_absorb`: 袖里乾坤吸弹，验证局部 ZoomBlur、稳定吸入轨迹和短窗口压缩感。
- `tribulation_warning`: 三九雷劫预警，验证落雷危险感和预警圈清晰度。
- `boss_death_cascade`: Boss 死亡连爆，验证 Glitch、RGBSplit、Shockwave 和白闪强反馈。

## Review Rules

- 右侧面板固定在战斗区外，截图时不遮挡特效。
- 敌弹和玩家判定点绘制在未滤镜层，避免被 Bloom、Glitch、RGBSplit 污染。
- 每个场景都提供 `可读`、`平衡`、`华丽` 三档；建议先比较 `可读` 与 `华丽`。
- Codex 生成的 10 张对比截图保存在 `D:\Game_1\artifacts\pixi-vfx-lab`。
