# FP-C020_loadout_builder_second_run — 实现 Loadout Builder 与第二局 RunConfig

## Objective
实现 Loadout Builder 与第二局 RunConfig。

## Stop condition
完成本任务列出的范围、通过验收命令、提交变更摘要后停止。不要提前进入下一个 FP 任务。

## Read first
- `docs_packages/07_outgame_dongfu_loop/data/outgame/loadout_presets.v0.1.json`
- `docs_packages/01_foundation_vertical_slice/data/run/debug_run_config.v0.1.json`

## Allowed scope
- `src/outgame/LoadoutBuilder.ts`
- `src/outgame/RunConfigFactory.ts`
- `tests/integration/loadout-second-run.test.ts`

## Required work
1. 从 Profile 生成 PlayerLoadout
2. 支持稳健开荒/火力清怪/双人护法预设
3. 升星/研法影响第二局初始配置
4. 第二局开局强度可验证

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
npm test -- loadout-second-run
```

## Final response format for Codex
- Changed files
- Commands run and result
- Tests added
- Risks / follow-ups
