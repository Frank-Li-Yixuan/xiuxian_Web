# SIM-C009：可选 LLM 叙事增强

## 目标

接入 LLM 叙事服务的本地模板、脱敏、缓存；真实 DeepSeek API 可选。

## 硬约束

- 先阅读 `codex_prompts/00_GLOBAL_PREFIX_SIM_REDESIGN.md`。
- 不要恢复旧 PNG 控件 UI。
- 不要执行废弃的 `CC-C001~CC-C006`。
- 除非本任务明确要求，不修改 `src/sim/**`。
- 不要让 LLM 决定数值或规则结果。

## 任务


1. 实现 NarrativeSanitizer。
2. 实现 FallbackTemplateRenderer。
3. 实现 NarrativeCache。
4. 接入 LifeSimulation 日志生成。
5. 不要求真实 API key；DeepSeek client 必须可关闭。


## 验收


- LLM disabled 时完整运行。
- hidden trueName 不进入请求。
- 输出隐藏真名时 fallback。
- 同 cacheKey 结果一致。


## 必跑命令

```text
npm run typecheck
npm test
npm run build
npm run validate:data
npm run check:forbidden
```

如果某命令不存在，记录为 missing，不要临时发明命令。

## 最终回复

- 修改文件列表
- 测试结果
- `git diff --name-only -- src/sim` 结果
- 手动验证步骤
- 已知问题
