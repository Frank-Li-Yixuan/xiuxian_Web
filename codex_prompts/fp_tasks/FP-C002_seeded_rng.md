# FP-C002_seeded_rng — 实现确定性 Seeded RNG 与 RNG stream

## Objective
实现确定性 Seeded RNG 与 RNG stream。

## Stop condition
完成本任务列出的范围、通过验收命令、提交变更摘要后停止。不要提前进入下一个 FP 任务。

## Read first
- `AGENTS.md`
- `docs_packages/04_netcode_sync/docs/online_sync_technical_design_v0.1.md`
- `docs_packages/05_engineering_codex_plan/docs/module_boundaries_v0.1.md`

## Allowed scope
- `src/sim/core/SeededRng.ts`
- `tests/unit/seeded-rng.test.ts`

## Required work
1. 支持 seed 初始化、fork(streamName)、nextUint32、nextFloat01、rangeInt、rangeFloat、bool、pickWeighted、getState/setState
2. 禁止 Math.random
3. 固定 seed 跨运行稳定

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
npm test -- seeded-rng
```

## Final response format for Codex
- Changed files
- Commands run and result
- Tests added
- Risks / follow-ups
