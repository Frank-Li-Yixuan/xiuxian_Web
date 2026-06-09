# LLM-C006：人生模拟集成 Hook

目标：把叙事增强接入月度事件、半年选择、插曲结果、阶段总结，但不改变规则逻辑。

任务：
1. 月度事件生成后调用 NarrativeService 生成日志文本。
2. 半年选择生成后可调用 major_choice_intro / major_choice_options。
3. 插曲结果写回后生成 interlude_result。
4. 阶段转化生成 stage_transition_summary。
5. UI 展示 narrativeText。
6. 所有数值 effects 仍来自规则层。

测试：
- LLM disabled 时页面仍显示日志。
- 选择选项数量不被 LLM 改变。
- hidden trueName 不泄露。
