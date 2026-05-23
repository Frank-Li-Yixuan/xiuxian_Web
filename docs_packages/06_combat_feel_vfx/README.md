# 双人雷霆战机修仙版 · 战斗手感与特效规范 v0.1

本包用于指导 Codex 实现第一版 Canvas 战斗表现层。它定义：

- STG 战斗手感基准
- 视觉层级与弹幕可读性
- 法宝、法术、丹药、雷劫、Boss 的效果规范
- 屏幕震动、闪白、粒子、拖尾、浮字的预算
- 低配模式与性能阈值
- TypeScript 效果数据契约

核心原则：**好看不能牺牲判定点、敌弹、雷劫预警的可读性。**

## 文件结构

```text
xiuxian_combat_feel_v0_1/
  README.md
  docs/
    combat_feel_and_vfx_spec_v0.1.md
    vfx_readability_checklist_v0.1.md
    gemini_effect_migration_notes_v0.1.md
    codex_implementation_tasks_v0.1.md
  data/vfx/
    visual_tokens.v0.1.json
    render_layers.v0.1.json
    effect_profiles.v0.1.json
    spell_vfx_profiles.v0.1.json
    artifact_vfx_profiles.v0.1.json
    tribulation_vfx_profiles.v0.1.json
    screen_shake_profiles.v0.1.json
    particle_budgets.v0.1.json
    readability_rules.v0.1.json
    first_stage_vfx_cues.v0.1.json
    procedural_audio_cues.v0.1.json
  src/types/
    vfx-types.v0.1.ts
  diagrams/
    render_layer_stack.mmd
    effect_event_pipeline.mmd
  templates/
    vfx_registry.example.ts
```
