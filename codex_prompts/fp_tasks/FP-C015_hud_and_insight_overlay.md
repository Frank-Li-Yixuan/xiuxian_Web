# FP-C015_hud_and_insight_overlay — 实现 HUD、法术栏、丹药栏、顿悟 overlay

## Objective
实现 HUD、法术栏、丹药栏、顿悟 overlay。

## Stop condition
完成本任务列出的范围、通过验收命令、提交变更摘要后停止。不要提前进入下一个 FP 任务。

## Read first
- `docs_packages/03_in_run_ui_ux/docs/in_run_ui_ux_information_architecture_v0.1.md`
- `docs_packages/03_in_run_ui_ux/wireframes/in_run_layout_1920x1080.svg`

## Allowed scope
- `src/ui/HudPresenter.ts`
- `src/ui/InsightOverlayPresenter.ts`
- `tests/unit/hud-viewstate.test.ts`

## Required work
1. 实现三栏式信息架构
2. 明确区分灵气经验/修为/真元/丹药消化
3. 顿悟双方明牌、公共气运、护法等待
4. UI 不决定奖励结果

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
npm test -- hud-viewstate
```

## Final response format for Codex
- Changed files
- Commands run and result
- Tests added
- Risks / follow-ups
