# FP-C012_cultivation_and_tribulation_debug — 实现个人修为、小层突破和 Debug 局内雷劫

## Objective
实现个人修为、小层突破和 Debug 局内雷劫。

## Stop condition
完成本任务列出的范围、通过验收命令、提交变更摘要后停止。不要提前进入下一个 FP 任务。

## Read first
- `docs_packages/01_foundation_vertical_slice/docs/progression_split.md`
- `docs_packages/01_foundation_vertical_slice/data/progression/cultivation_realms.v0.1.json`
- `docs_packages/01_foundation_vertical_slice/data/events/tribulations.v0.1.json`

## Allowed scope
- `src/sim/progression/CultivationSystem.ts`
- `src/sim/tribulation/TribulationSystem.ts`
- `tests/integration/cultivation-tribulation.test.ts`

## Required work
1. 个人修为独立增长
2. 小层突破提升精气神
3. 大境界瓶颈触发雷劫事件
4. Debug 可强制触发三九雷劫
5. 雷劫落点使用 tribulationRng
6. 雷劫成功全屏清场、回满、突破

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
npm test -- cultivation-tribulation
```

## Final response format for Codex
- Changed files
- Commands run and result
- Tests added
- Risks / follow-ups
