# FP-C010_pill_digestion_system — 实现丹药吞服与消化系统

## Objective
实现丹药吞服与消化系统。

## Stop condition
完成本任务列出的范围、通过验收命令、提交变更摘要后停止。不要提前进入下一个 FP 任务。

## Read first
- `docs_packages/01_foundation_vertical_slice/data/pills/pills.v0.1.json`
- `docs_packages/02_core_balance_model/docs/core_balance_model_v0.1.md`

## Allowed scope
- `src/sim/pills/PillSystem.ts`
- `src/sim/pills/DigestionSystem.ts`
- `tests/integration/pill-digestion.test.ts`

## Required work
1. 实现回春丹、燃血丹、清心丹、小破境丹
2. 丹药不是瞬间血瓶
3. 消化/后遗症使用 frame
4. 小破境丹增加修为，不增加灵气经验

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
npm test -- pill-digestion
```

## Final response format for Codex
- Changed files
- Commands run and result
- Tests added
- Risks / follow-ups
