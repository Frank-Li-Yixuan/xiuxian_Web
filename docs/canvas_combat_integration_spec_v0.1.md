# 《Canvas 战斗表现接入规格 v0.1》

## 1. 新增模块

建议增加：

```text
src/assets/
  AssetManifestLoader.ts
  SpriteAssetRegistry.ts
  AudioAssetRegistry.ts

src/render/
  SpriteSheetAnimator.ts
  CombatVfxRenderer.ts
  ProjectileSkinRenderer.ts
  PickupPresentationSystem.ts
  BackgroundParallaxRenderer.ts

src/audio/
  AudioBus.ts
  CombatSfxMapper.ts
  AudioLimiter.ts

src/dev/
  TwoDAssetPreviewPage.ts
  AudioAssetPreviewPage.ts
```

## 2. SpriteSheetAnimator

职责：

```text
根据 manifest 帧数据播放序列帧
支持 loop / non-loop
支持 blendMode
支持 scale / rotation / alpha
支持完成后自动销毁
```

## 3. CombatVfxRenderer

读取 EffectEvent：

```text
projectile_fired
projectile_hit
enemy_damaged
enemy_killed
boss_phase_changed
spell_cast
pill_consumed
pill_tick
treasure_triggered
pickup_collected
tribulation_warning
```

映射到 VFX：

```text
effectEvent.type → assetId → spawn position → playback params
```

## 4. ProjectileSkinRenderer

不要改变 projectile 逻辑，只改变画法。

示例：

| projectile tag | 视觉 |
|---|---|
| player.sword | 飞剑 sprite + 青色尾迹 |
| player.thunder | 雷球 sprite + 电弧 |
| enemy.normal | 红白核心弹 |
| enemy.fast | 品红高速弹 |
| enemy.big | 橙红大弹 |
| tribulation | 紫白天雷预警/落雷 |

## 5. PickupPresentationSystem

掉落表现状态机：

```text
spawnBurst 0.2s
floatIdle
magnetAcquire
magnetTravel
collectFlash
```

表现参数：

```text
spawn velocity
rotation speed
bob amplitude
magnet curve
trail color
collect target UI
```

## 6. AudioBus

音效不能每次事件都无脑播放，否则会爆音。

必须支持：

```text
mix groups
volume
cooldown per sfx
max simultaneous instances
random pitch variation
random variant selection
priority
reduced audio spam in high density combat
```

## 7. 与 sim 的边界

表现系统不能：

```text
修改实体位置
修改血量
修改掉落
修改 RNG
修改碰撞
修改命中
```

表现系统可以：

```text
读取 ViewState
读取 EffectEvent
播放序列帧
播放音效
渲染背景
渲染粒子
做屏幕震动
```

## 8. 降级策略

在高压阶段：

```text
VFX 数量超过预算 → 合并小爆炸
同类 hit 音效过密 → 冷却去重
掉落尾迹过多 → 降低 alpha / 关闭 trail
背景粒子过多 → 暂停远景动态
```
