# LFP-C008：Optional LLM Narrative Integration

目标：接入 NarrativeService，但默认可只使用 fallback 模板。

前提：LLM-C001~LLM-C003 或等价能力已完成。

硬约束：
- LLM 不能决定数值、事件、成功失败。
- 不把 hidden trueName 传给 LLM。
- 无 API key 时必须正常运行。

任务：
1. LifeSimulationScreen 的月度日志、选择引入、阶段总结调用 NarrativeService。
2. 默认 fallback 模板。
3. 若启用 LLM，使用 sanitized request + cache。
4. 失败时 fallback。
5. 增加 dev 显示 narrative source：fallback/cache/llm。

验收：
- LLM disabled 时完整流程可跑。
- 输出不泄露 hidden trueName。
- 非 JSON 或失败能 fallback。
- npm run typecheck / npm test / npm run build。
