# ME2-C007：LLM 文案 Hook 预留

目标：为后续 DeepSeek / LLM 文案生成预留结构，但本任务不调用外部 API。

实现：
1. 定义 StructuredLifeEventNarrationInput。
2. 定义 LifeEventNarrationResult。
3. 定义 fallback template。
4. 定义 mustNotRevealHiddenTrueName 过滤器。
5. 定义 forbidden modern terms 检查。
6. 不实现真实 DeepSeek 调用。

验收：
- 能从事件生成 narration input
- fallback 能生成文本
- forbidden hidden trueName 会被测试拦截
- npm run typecheck
- npm test
