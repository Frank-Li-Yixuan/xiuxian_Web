# LLM-C003：本地模板兜底渲染器

目标：不接 LLM，也能完整生成叙事文本。

任务：
1. 实现 NarrativeFallbackRenderer。
2. 支持 monthly_event_log、major_choice_intro、major_choice_options、interlude_result、stage_transition_summary、age18_awakening_log、life_chronicle_summary。
3. 读取 fallback_templates.v0.1.json。
4. 输出符合 NarrativeResponse schema。
5. 通过 hiddenLeakDetector。

验收：
- LLM disabled 时 216 个月模拟可生成日志。
- fallback 文本无隐藏真名、无现代词。
