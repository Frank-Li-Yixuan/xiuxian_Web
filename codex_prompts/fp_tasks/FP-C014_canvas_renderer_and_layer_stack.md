# FP-C014_canvas_renderer_and_layer_stack — 实现 CanvasRenderer 与渲染层级

## Objective
实现 CanvasRenderer 与渲染层级。

## Stop condition
完成本任务列出的范围、通过验收命令、提交变更摘要后停止。不要提前进入下一个 FP 任务。

## Read first
- `docs_packages/06_combat_feel_vfx/docs/combat_feel_and_vfx_spec_v0.1.md`
- `docs_packages/06_combat_feel_vfx/data/vfx/render_layers.v0.1.json`

## Allowed scope
- `src/render/CanvasRenderer.ts`
- `src/render/RenderLayerStack.ts`
- `src/render/PrimitiveDrawing.ts`
- `tests/unit/render-layer-stack.test.ts`

## Required work
1. CanvasRenderer 只读 ViewState/EffectEvents
2. 按 layer stack 绘制
3. 敌弹/雷劫/判定点优先级正确
4. 不依赖外部图片/字体/CDN

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
npm test -- render-layer-stack
```

## Final response format for Codex
- Changed files
- Commands run and result
- Tests added
- Risks / follow-ups
