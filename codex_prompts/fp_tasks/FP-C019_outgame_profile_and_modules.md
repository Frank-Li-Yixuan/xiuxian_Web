# FP-C019_outgame_profile_and_modules — 实现局外 Profile、资源钱包和洞府基础模块

## Objective
实现局外 Profile、资源钱包和洞府基础模块。

## Stop condition
完成本任务列出的范围、通过验收命令、提交变更摘要后停止。不要提前进入下一个 FP 任务。

## Read first
- `docs_packages/07_outgame_dongfu_loop/docs/off_run_dongfu_min_loop_v0.1.md`
- `docs_packages/07_outgame_dongfu_loop/src/types/outgame-types.v0.1.ts`
- `docs_packages/07_outgame_dongfu_loop/data/outgame/default_profile.v0.1.json`

## Allowed scope
- `src/outgame/ProfileState.ts`
- `src/outgame/ResourceWallet.ts`
- `src/outgame/IdleYieldSystem.ts`
- `src/outgame/AlchemySystem.ts`
- `src/outgame/ArtifactProgressionSystem.ts`
- `src/outgame/CultivationTrainingSystem.ts`
- `tests/integration/outgame-loop.test.ts`

## Required work
1. 应用 RunSettlementReceipt
2. 收聚灵阵收益
3. 炼回春丹
4. 青霜飞剑升星
5. 修功/研法
6. 不要实现弟子/交易/宗门外交

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
npm test -- outgame-loop
```

## Final response format for Codex
- Changed files
- Commands run and result
- Tests added
- Risks / follow-ups
