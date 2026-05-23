# FP-C023_balance_telemetry — 实现基础遥测和调参指标输出

## Objective
实现基础遥测和调参指标输出。

## Stop condition
完成本任务列出的范围、通过验收命令、提交变更摘要后停止。不要提前进入下一个 FP 任务。

## Read first
- `docs_packages/08_first_playable_acceptance/data/acceptance/telemetry_targets.v0.1.json`
- `docs_packages/02_core_balance_model/docs/core_balance_model_v0.1.md`

## Allowed scope
- `src/debug/TelemetryCollector.ts`
- `src/debug/BalanceReport.ts`
- `tools/run-balance-report.ts`
- `tests/unit/telemetry.test.ts`

## Required work
1. 输出阶段时长、TTK、Boss 时长、法术释放频率、顿悟次数、受击次数、修为增长
2. 对照 telemetry_targets 标记偏离
3. 不上传网络

## Do not
- 不要扩展 v0.1 范围外系统。
- 不要在 `src/sim/**` 中使用 `Math.random()`、DOM、Canvas、真实时间或音频。
- 不要把灵气经验和修为合并。
- 不要引入外部图片、字体、CDN 或音频素材。
- 不要让 Renderer/UI 修改 gameplay state。

## Acceptance commands
```bash
npm run typecheck
```
```bash
npm test -- telemetry
```

## Final response format for Codex
- Changed files
- Commands run and result
- Tests added
- Risks / follow-ups
