# SIM-C009：LLM 叙事增强离线优先接入

## 目标

先实现本地 fallback + sanitizer + cache，不强接真实 DeepSeek API。

## 任务

1. 实现 NarrativeSanitizer。
2. 实现 HiddenLeakDetector。
3. 实现 FallbackTemplateRenderer。
4. 实现 NarrativeCache。
5. 实现 NarrativeService：

```text
LLM disabled → fallback
LLM enabled but unavailable → fallback
LLM output invalid → fallback
```

6. 可选 DeepSeek client 只做接口占位，不把 API key 放进前端。
7. `/dev/narrative-lab` 显示：
   - sanitized request
   - fallback output
   - validation result
   - leak detection

## 禁止

- LLM 决定数值。
- LLM 决定成功失败。
- LLM 输出 effects/statChanges/reward。
- hidden trueName 进入 LLM request。

## 验收

- LLM disabled 时完整运行。
- hidden trueName 不进入 request。
- LLM 输出隐藏真名时 fallback。
- 同 cacheKey 结果稳定。

## 命令

```text
npm run typecheck
npm test
npm run build
```
