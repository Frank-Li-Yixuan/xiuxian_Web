# BAS-C010：音效总线与事件映射

## 目标

建立稳定的战斗音效反馈，不爆音、不刷屏。

## 任务

1. 实现 AudioAssetRegistry。
2. 实现 AudioBus：
   - mix groups
   - volume
   - cooldown
   - maxInstances
   - random variant
   - priority
3. CombatSfxMapper：
   - 读取 EffectEvent。
   - 映射到 sfx asset。
4. `/dev/audio-assets` 保持可用。

## 音效映射

- 飞剑发射
- 敌人发弹
- 命中
- 小怪死亡
- 精英死亡
- 法术释放
- 丹药吞服
- 灵气拾取
- 稀有拾取
- Boss/雷劫警告

## 验收

- 高密度战斗不爆音。
- 音效有冷却。
- Boss 警告能压过普通音效。
- 可以关闭/调节音效组音量。
- 不改 sim。
