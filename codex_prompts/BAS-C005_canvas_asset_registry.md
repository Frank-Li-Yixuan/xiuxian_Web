# BAS-C005：Canvas 资产 Registry 与 Sprite/VFX 播放基础设施

## 目标

建立正式渲染层资源加载与序列帧播放能力，但先不大规模替换画面。

## 任务

1. 实现 `SpriteAssetRegistry`：
   - 加载 2D manifest。
   - 预加载图片。
   - 根据 assetId 返回 Image/metadata。
   - 缺失 required 资源时报错。
   - optional 缺失返回 fallback。

2. 实现 `SpriteSheetAnimator`：
   - 支持 frameWidth/frameHeight/frameCount/fps。
   - 支持 loop/non-loop。
   - 支持 blendMode。
   - 支持 scale/rotation/alpha/anchor。
   - 支持播放完成后销毁。

3. 实现 `CombatVfxRenderer` 初版：
   - 接收 presentation effect requests。
   - 在 Canvas 上播放 VFX。
   - 不修改 sim。

4. 增加 dev demo：
   - 播放爆炸、雷电、治疗、护盾 VFX。

## 禁止

- 不改 `src/sim/**`。
- 不改变碰撞、伤害、掉落。
- 不一次性替换全部对象。

## 验收

- `/dev/2d-assets` 仍正常。
- VFX demo 正常。
- typecheck/test/build 通过。
