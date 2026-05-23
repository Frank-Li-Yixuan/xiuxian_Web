# FP-C008_collision_damage_drop — 实现碰撞、伤害、掉落和拾取基础

## Objective
实现碰撞、伤害、掉落和拾取基础。

## Stop condition
完成本任务列出的范围、通过验收命令、提交变更摘要后停止。不要提前进入下一个 FP 任务。

## Read first
- `docs_packages/02_core_balance_model/docs/core_balance_model_v0.1.md`
- `docs_packages/01_foundation_vertical_slice/data/rewards/drop_tables.v0.1.json`

## Allowed scope
- `src/sim/combat/CollisionSystem.ts`
- `src/sim/combat/DamageSystem.ts`
- `src/sim/drops/DropSystem.ts`
- `src/sim/drops/PickupSystem.ts`
- `tests/integration/collision-drop.test.ts`

## Required work
1. 实现玩家弹命中敌人、敌弹命中玩家、接触伤害
2. 实现掉落表和拾取半径
3. 灵气进入 TeamInsight，不进入修为
4. 真元球按拾取者和队友共鸣规则结算

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
npm test -- collision-drop
```

## Final response format for Codex
- Changed files
- Commands run and result
- Tests added
- Risks / follow-ups
