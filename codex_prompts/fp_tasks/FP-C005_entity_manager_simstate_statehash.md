# FP-C005_entity_manager_simstate_statehash — 实现 EntityManager、SimState 与 StateHash

## Objective
实现 EntityManager、SimState 与 StateHash。

## Stop condition
完成本任务列出的范围、通过验收命令、提交变更摘要后停止。不要提前进入下一个 FP 任务。

## Read first
- `AGENTS.md`
- `docs_packages/04_netcode_sync/docs/deterministic_simulation_checklist_v0.1.md`
- `docs_packages/05_engineering_codex_plan/docs/module_boundaries_v0.1.md`

## Allowed scope
- `src/sim/state/SimState.ts`
- `src/sim/entity/EntityManager.ts`
- `src/sim/core/StateHash.ts`
- `tests/unit/state-hash.test.ts`

## Required work
1. 定义稳定实体 id 分配
2. 实现玩家/敌人/弹幕/掉落/Boss/雷劫等 state 容器
3. StateHash 不包含粒子/UI/音效/真实时间
4. 同状态 hash 相同，字段顺序稳定

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
npm test -- state-hash
```

## Final response format for Codex
- Changed files
- Commands run and result
- Tests added
- Risks / follow-ups
