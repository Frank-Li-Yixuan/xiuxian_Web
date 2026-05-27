# BAS-C007：命中、受击、死亡、爆炸特效

## 目标

让每次攻击都能得到明确反馈。

## 任务

1. 映射 EffectEvent：
   - projectile_hit
   - enemy_damaged
   - enemy_killed
   - elite_killed
   - player_hit
   - shield_break
   - boss_phase_changed
   - boss_killed

2. 接入 VFX：
   - 小命中火花。
   - 护盾碎裂。
   - 小怪死亡 burst。
   - 精英 shockwave。
   - Boss 阶段转换。
   - 浮字。
   - 屏幕震动预算。

3. 接入音效 hook，但可暂由 BAS-C010 完成实际 AudioBus。

## 验收

- 命中可见。
- 小怪死亡有 burst。
- 精英死亡有更强反馈。
- 特效不遮敌弹白芯。
- 高压下自动降级。
- 不改 sim。
