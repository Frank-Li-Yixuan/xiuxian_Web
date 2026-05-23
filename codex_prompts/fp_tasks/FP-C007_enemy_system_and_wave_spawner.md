# FP-C007_enemy_system_and_wave_spawner — 实现 EnemySystem 与第一阶段 1-1 到 1-4 波次

## Objective
实现 EnemySystem 与第一阶段 1-1 到 1-4 波次。

## Stop condition
完成本任务列出的范围、通过验收命令、提交变更摘要后停止。不要提前进入下一个 FP 任务。

## Read first
- `docs_packages/01_foundation_vertical_slice/data/stages/stage_01_qingyun.v0.1.json`
- `docs_packages/01_foundation_vertical_slice/data/enemies/enemies.v0.1.json`

## Allowed scope
- `src/sim/stage/StageRunner.ts`
- `src/sim/stage/WaveSpawner.ts`
- `src/sim/enemies/EnemySystem.ts`
- `tests/integration/stage01-waves.test.ts`

## Required work
1. 实现山魈、狼妖、邪修残影、石甲妖、裂风狼妖行为基础
2. 按 StageSegment/WaveDefinition 刷新
3. 使用 stageRng，不使用 Math.random

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
npm test -- stage01-waves
```

## Final response format for Codex
- Changed files
- Commands run and result
- Tests added
- Risks / follow-ups
