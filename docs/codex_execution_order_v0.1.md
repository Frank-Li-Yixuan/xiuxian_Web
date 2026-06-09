# Codex 执行顺序 v0.1

## 推荐顺序

```text
LFP-C001_state_machine_and_registry
LFP-C002_ui_shell_and_route
LFP-C003_monthly_auto_playback
LFP-C004_major_choice_experience
LFP-C005_playable_interlude_flow
LFP-C006_stage_summaries_chronicle
LFP-C007_speed_controls_persistence
LFP-C008_llm_narrative_optional_integration
LFP-C009_e2e_tests_screenshots
```

## 不要跳过

```text
LFP-C001
LFP-C002
LFP-C003
LFP-C004
LFP-C007
LFP-C009
```

## 可以推迟

```text
LFP-C005 中除 1 个 STG 插曲外的完整玩法
LFP-C008 真实 DeepSeek API
```

## 每步必须遵守

```text
不修改 src/sim/**，除非明确涉及可选 STG 插曲并经确认。
不让 LLM 决定数值。
不泄露 hidden trueName。
不恢复 generated PNG 控件方案。
人生模拟 UI 使用 DOM / React / ui-system。
```
