# FP-C006_player_and_artifact_system — 实现 PlayerSystem 与自动本命法宝普攻

## Objective
实现 PlayerSystem 与自动本命法宝普攻。

## Stop condition
完成本任务列出的范围、通过验收命令、提交变更摘要后停止。不要提前进入下一个 FP 任务。

## Read first
- `docs_packages/01_foundation_vertical_slice/docs/vertical_slice_v0_1_patch.md`
- `docs_packages/02_core_balance_model/docs/core_balance_model_v0.1.md`

## Allowed scope
- `src/sim/player/PlayerSystem.ts`
- `src/sim/artifacts/ArtifactSystem.ts`
- `src/sim/projectiles/ProjectileSystem.ts`
- `tests/integration/player-artifact.test.ts`

## Required work
1. 实现 P1/P2 移动、边界、专注模式、判定半径
2. 实现青霜飞剑、紫阳葫芦、玄岳重印自动普攻
3. 普攻不依赖按键射击
4. 根据 FrameInput 推进

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
npm test -- player-artifact
```

## Final response format for Codex
- Changed files
- Commands run and result
- Tests added
- Risks / follow-ups
