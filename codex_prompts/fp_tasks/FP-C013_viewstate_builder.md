# FP-C013_viewstate_builder — 实现 ViewStateBuilder，把 SimState 转为 UI/Renderer 可读状态

## Objective
实现 ViewStateBuilder，把 SimState 转为 UI/Renderer 可读状态。

## Stop condition
完成本任务列出的范围、通过验收命令、提交变更摘要后停止。不要提前进入下一个 FP 任务。

## Read first
- `docs_packages/03_in_run_ui_ux/src/types/ui-types.v0.1.ts`
- `docs_packages/03_in_run_ui_ux/docs/in_run_ui_ux_information_architecture_v0.1.md`

## Allowed scope
- `src/view/ViewStateBuilder.ts`
- `src/view/InRunViewState.ts`
- `tests/unit/viewstate-builder.test.ts`

## Required work
1. UI 只读 ViewState
2. 区分灵气经验条、修为条、真元、丹药消化
3. 暴露 Boss、雷劫、救援、顿悟 overlay 状态
4. 不修改 SimState

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
npm test -- viewstate-builder
```

## Final response format for Codex
- Changed files
- Commands run and result
- Tests added
- Risks / follow-ups
