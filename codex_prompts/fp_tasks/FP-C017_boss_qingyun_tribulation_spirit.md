# FP-C017_boss_qingyun_tribulation_spirit — 实现第一 Boss 青云劫灵

## Objective
实现第一 Boss 青云劫灵。

## Stop condition
完成本任务列出的范围、通过验收命令、提交变更摘要后停止。不要提前进入下一个 FP 任务。

## Read first
- `docs_packages/01_foundation_vertical_slice/data/bosses/bosses.v0.1.json`
- `docs_packages/02_core_balance_model/docs/core_balance_model_v0.1.md`
- `docs_packages/06_combat_feel_vfx/data/vfx/first_stage_vfx_cues.v0.1.json`

## Allowed scope
- `src/sim/boss/BossSystem.ts`
- `src/sim/boss/BossTimelineRunner.ts`
- `tests/integration/boss-qingyun.test.ts`

## Required work
1. Boss 入场、三阶段、血量阈值、攻击时间轴
2. Phase 1/2/3 可打完
3. Boss 死亡触发结算材料和 EffectEvent
4. Boss timeline 使用 frame

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
npm test -- boss-qingyun
```

## Final response format for Codex
- Changed files
- Commands run and result
- Tests added
- Risks / follow-ups
