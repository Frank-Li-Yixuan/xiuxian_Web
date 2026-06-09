# SIM-C005：身世、隐藏命、随身物叙事链集成

## 目标

接入 HFO2 与 LST，使身世/随身物贯穿人生主线。

## 硬约束

- 先阅读 `codex_prompts/00_GLOBAL_PREFIX_SIM_REDESIGN.md`。
- 不要恢复旧 PNG 控件 UI。
- 不要执行废弃的 `CC-C001~CC-C006`。
- 除非本任务明确要求，不修改 `src/sim/**`。
- 不要让 LLM 决定数值或规则结果。

## 任务


1. 升级 OriginFateDraft 到 HFO2 叙事链状态。
2. 增加 carried item lifecycle 与 affinity。
3. 接入 storyline scoring。
4. 确保 UI 不泄露 hidden trueName。


## 验收


- 药铺学徒 + 铜炉 + 丹圣预兆激活药铺丹道线。
- 残破木剑 + 前世剑魄激活破落遗脉线。
- DOM/日志不出现隐藏真名。


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
