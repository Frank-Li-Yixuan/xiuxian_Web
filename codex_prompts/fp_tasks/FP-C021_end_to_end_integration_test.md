# FP-C021_end_to_end_integration_test — 实现从默认存档到第二局的端到端集成测试

## Objective
实现从默认存档到第二局的端到端集成测试。

## Stop condition
完成本任务列出的范围、通过验收命令、提交变更摘要后停止。不要提前进入下一个 FP 任务。

## Read first
- `docs_packages/08_first_playable_acceptance/docs/end_to_end_playtest_script_v0.1.md`
- `docs_packages/08_first_playable_acceptance/docs/integration_test_plan_v0.1.md`

## Allowed scope
- `tests/integration/first-playable-e2e.test.ts`
- `tools/run-headless-stage01.ts`

## Required work
1. 默认 Profile -> Loadout -> 第一大阶段 -> Boss 结算 -> 回洞府强化 -> 第二局 RunConfig
2. 不要要求人工 Canvas 操作
3. 同 seed 可复现

## Do not
- 不要扩展 v0.1 范围外系统。
- 不要在 `src/sim/**` 中使用 `Math.random()`、DOM、Canvas、真实时间或音频。
- 不要把灵气经验和修为合并。
- 不要引入外部图片、字体、CDN 或音频素材。
- 不要让 Renderer/UI 修改 gameplay state。

## Acceptance commands
```bash
npm run test:headless:stage01
```
```bash
npm test -- first-playable-e2e
```

## Final response format for Codex
- Changed files
- Commands run and result
- Tests added
- Risks / follow-ups
