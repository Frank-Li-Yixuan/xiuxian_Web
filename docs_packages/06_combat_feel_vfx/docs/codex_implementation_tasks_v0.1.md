# Codex 实施任务：战斗手感与特效 v0.1

## VFX-C001 EffectEventQueue

目标：把玩法事件和视觉表现解耦。

交付：

- `EffectEvent` 类型。
- `EffectEventQueue`。
- 支持 one-shot、duration、attached entity。
- 支持按 frame 排序。

验收：

- `src/sim/**` 只发事件，不创建粒子。

## VFX-C002 VfxRegistry

目标：加载所有效果 JSON。

交付：

- `visual_tokens.v0.1.json`
- `render_layers.v0.1.json`
- `effect_profiles.v0.1.json`
- `spell_vfx_profiles.v0.1.json`
- `artifact_vfx_profiles.v0.1.json`
- `tribulation_vfx_profiles.v0.1.json`

验收：

- 新增效果不需要改 gameplay。

## VFX-C003 RenderLayerStack

目标：实现固定渲染顺序。

验收重点：

- 敌弹层高于玩家火场。
- 雷劫预警高于普通敌弹。
- 判定点高于玩家本体和法术。

## VFX-C004 ParticlePool

目标：稳定性能。

交付：

- 固定容量对象池。
- Low/Medium/High 三档预算。
- 超预算合并爆炸。

## VFX-C005 ScreenShakeManager

目标：震屏好看但不影响玩法。

交付：

- render-only camera offset。
- 强度只取最大，不累加。
- 雷劫预警保护窗口。

## VFX-C006 ReadabilityGuard

目标：保护判定点和敌弹。

交付：

- 敌弹附近自动降低玩家法术 alpha。
- 大范围特效不覆盖判定点 24px 内圈。
- 高压阶段自动降低掉落尾迹数量。

## VFX-C007 ProceduralAudioBus

目标：无外部资源音效。

交付：

- WebAudio 简单合成器。
- 音效优先级。
- 同类音效节流。

## VFX-C008 First Stage VFX Hookup

目标：把第一大阶段五个小阶段接入效果脚本。

交付：

- 1-1 教学低噪表现。
- 1-2 冲锋预警。
- 1-3 远程弹幕可读性。
- 1-4 连锁爆炸合并。
- 1-5 Boss/雷劫表现。
