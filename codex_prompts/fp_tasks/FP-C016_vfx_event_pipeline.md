# FP-C016_vfx_event_pipeline — 实现 EffectEventQueue、VfxRegistry、粒子池、震屏和可读性守卫

## Objective
实现 EffectEventQueue、VfxRegistry、粒子池、震屏和可读性守卫。

## Stop condition
完成本任务列出的范围、通过验收命令、提交变更摘要后停止。不要提前进入下一个 FP 任务。

## Read first
- `docs_packages/06_combat_feel_vfx/docs/codex_implementation_tasks_v0.1.md`
- `docs_packages/06_combat_feel_vfx/data/vfx/effect_profiles.v0.1.json`
- `docs_packages/06_combat_feel_vfx/data/vfx/particle_budgets.v0.1.json`

## Allowed scope
- `src/render/vfx/EffectEventQueue.ts`
- `src/render/vfx/VfxRegistry.ts`
- `src/render/vfx/ParticlePool.ts`
- `src/render/vfx/ScreenShakeManager.ts`
- `src/render/vfx/ReadabilityGuard.ts`
- `tests/unit/vfx-registry.test.ts`

## Required work
1. Sim 发事件，VFX 解释事件
2. 粒子使用 visualRng 或 render-side random，不进 gameplay hash
3. 震屏只改 render camera
4. 可读性守卫压制遮挡

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
npm test -- vfx-registry
```

## Final response format for Codex
- Changed files
- Commands run and result
- Tests added
- Risks / follow-ups
