# FP-C011_team_insight_and_reward_session — 实现灵气经验、顿悟和奖励生成

## Objective
实现灵气经验、顿悟和奖励生成。

## Stop condition
完成本任务列出的范围、通过验收命令、提交变更摘要后停止。不要提前进入下一个 FP 任务。

## Read first
- `docs_packages/01_foundation_vertical_slice/data/progression/insight_exp_tables.v0.1.json`
- `docs_packages/01_foundation_vertical_slice/data/rewards/reward_pools.v0.1.json`
- `docs_packages/03_in_run_ui_ux/docs/in_run_ui_ux_information_architecture_v0.1.md`

## Allowed scope
- `src/sim/progression/TeamInsightSystem.ts`
- `src/sim/progression/InsightSession.ts`
- `src/sim/rewards/RewardGenerator.ts`
- `tests/integration/insight-session.test.ts`

## Required work
1. TeamInsightExpState 团队共享
2. 满条触发 insight_pause
3. P1/P2 明牌三选一
4. 公共气运重 Roll
5. 奖励生成使用 rewardRng 且顺序稳定
6. 不要修改修为

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
npm test -- insight-session
```

## Final response format for Codex
- Changed files
- Commands run and result
- Tests added
- Risks / follow-ups
