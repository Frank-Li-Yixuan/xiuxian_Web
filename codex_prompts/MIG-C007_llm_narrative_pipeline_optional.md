# MIG-C007：LLM Narrative Pipeline Optional Integration

目标：接入 LLM NarrativeService，但默认使用 fallback 模板，不强制真实 DeepSeek API。

任务：

1. 接入 LLM narrative data registry。
2. 实现 sanitizer：禁止 hidden trueName、内部 hidden id、现代词进入请求。
3. 实现 fallback template renderer。
4. 实现 NarrativeService：
   - build sanitized request
   - resolve from cache
   - fallback if no provider
   - validate output
5. 接入 LifeSimulation 日志生成 hook。
6. 不实现真实 API，除非 env 显式配置并通过 LLM-C004。

禁止：

- LLM 不决定数值。
- LLM 不决定事件发生。
- LLM 不决定成功失败。
- LLM 不写入 effects/rewards。

测试：

- hidden trueName 被脱敏。
- LLM disabled 完整可运行。
- 非法输出 fallback。
- 同 cacheKey 文本稳定。
