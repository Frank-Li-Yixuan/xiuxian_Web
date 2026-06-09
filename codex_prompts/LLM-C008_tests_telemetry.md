# LLM-C008：测试与遥测

目标：补齐叙事增强测试与质量报告。

测试：
1. hidden trueName 不进入 request。
2. LLM 输出 forbidden term 会 fallback。
3. JSON invalid 会 fallback。
4. timeout 会 fallback。
5. cacheKey 稳定。
6. no API key 模式可跑。
7. 选项数量不被改变。
8. 现代禁词检测。

遥测：
- llm_enabled
- fallback_used
- validation_error_count
- cache_hit_rate
- forbidden_leak_blocked
