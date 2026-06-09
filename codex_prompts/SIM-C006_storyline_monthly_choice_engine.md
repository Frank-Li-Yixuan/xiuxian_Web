# SIM-C006：人生主线、月度事件、半年选择引擎

## 目标

集成 LST、ME2、MC2，替换旧 LM/MLC 的简单逻辑。

## 硬约束

- 先阅读 `codex_prompts/00_GLOBAL_PREFIX_SIM_REDESIGN.md`。
- 不要恢复旧 PNG 控件 UI。
- 不要执行废弃的 `CC-C001~CC-C006`。
- 除非本任务明确要求，不修改 `src/sim/**`。
- 不要让 LLM 决定数值或规则结果。

## 任务


1. 实现 StorylineState 与 EventThreadState。
2. 实现 MonthlyEventSelector v0.2。
3. 实现 NarrativeDensityController。
4. 实现 MajorChoiceGenerator v0.2。
5. 生成 SixMonthWindowSummary。


## 验收


- 216 个月可推进。
- 每 6 个月选择来自过去事件。
- 事件受主线/命盘/身世影响明显。
- 同 seed 可复现。


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
