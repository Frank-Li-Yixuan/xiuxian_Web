# FP-C018_soul_rescue_settlement — 实现神魂出窍、精血渡魂和局内结算

## Objective
实现神魂出窍、精血渡魂和局内结算。

## Stop condition
完成本任务列出的范围、通过验收命令、提交变更摘要后停止。不要提前进入下一个 FP 任务。

## Read first
- `docs_packages/01_foundation_vertical_slice/docs/vertical_slice_v0_1_patch.md`
- `docs_packages/07_outgame_dongfu_loop/data/outgame/settlement_rewards_stage01.v0.1.json`

## Allowed scope
- `src/sim/player/SoulSystem.ts`
- `src/sim/player/RescueSystem.ts`
- `src/sim/settlement/RunSettlement.ts`
- `tests/integration/rescue-settlement.test.ts`

## Required work
1. 玩家死亡进入 soul
2. 队友长按 Interact 在范围内救援
3. 施救消耗精血，成功复活有无敌
4. Boss 胜利/团灭生成 RunSettlementReceipt
5. 基础材料保留

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
npm test -- rescue-settlement
```

## Final response format for Codex
- Changed files
- Commands run and result
- Tests added
- Risks / follow-ups
