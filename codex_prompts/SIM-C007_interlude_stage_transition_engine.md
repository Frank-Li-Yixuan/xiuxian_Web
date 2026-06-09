# SIM-C007：玩法插曲与阶段转化引擎

## 目标

集成 LPI 与 LSTG，使半年选择可触发玩法插曲，并推动身份阶段变化。

## 硬约束

- 先阅读 `codex_prompts/00_GLOBAL_PREFIX_SIM_REDESIGN.md`。
- 不要恢复旧 PNG 控件 UI。
- 不要执行废弃的 `CC-C001~CC-C006`。
- 除非本任务明确要求，不修改 `src/sim/**`。
- 不要让 LLM 决定数值或规则结果。

## 任务


1. 实现 InterludeCandidate 生成。
2. 实现手动/自动推演结果回写接口。
3. 实现 StageTransitionState、身份阶段评分、入道节点。
4. 控制插曲频率与阶段冷却。


## 验收


- 0-3 岁不触发玩法插曲。
- 玩法插曲结果能回写主线/隐藏/随身物。
- 身份阶段可从凡人孩童推进到求道苗子/半修行者。


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
