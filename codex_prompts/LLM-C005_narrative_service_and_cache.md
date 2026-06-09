# LLM-C005：NarrativeService 与缓存

目标：统一封装缓存、LLM、fallback、校验。

任务：
1. 实现 buildNarrativeCacheKey。
2. 实现 NarrativeCache，v0.1 可存在 profile.narrativeCache 或本地 adapter。
3. 实现 NarrativeService.generate(request)。
4. 同 cacheKey 命中缓存时不调用 LLM。
5. 添加 regenerate dev flag，但默认禁用。

测试：
- 同 cacheKey 返回同文本。
- 不同 eventId 生成不同 key。
- LLM 关闭时缓存 fallback。
