# WORLD-C003：LLM / 文案生成世界观词典

目标：为 DeepSeek/LLM 文案生成和本地模板提供世界观上下文。

任务：
1. 创建 WorldNarrativeContextBuilder。
2. 它能根据：
   - location tags
   - faction tags
   - truthLevel
   - lifePhase
   - hidden leak rules
   生成供 LLM 使用的 system/context prompt 片段。
3. 提供本地 fallback 文案模板上下文。
4. 不实际调用 DeepSeek。
5. 不让 LLM 决定数值。

验收：
- 单元测试：生成的 context 不包含隐藏真名。
- 单元测试：包含世界观禁用词规则。
