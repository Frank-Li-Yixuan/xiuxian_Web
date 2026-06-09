# LPI-C004：玩法插曲结果回写引擎

目标：将插曲结果回写 LifeSimulationState。

硬约束：
- 不泄露 hidden trueName。
- 不直接写成年 Profile 战斗数据。
- 不修改 src/sim/**。

任务：
1. 实现 `LifeInterludeResultWritebackEngine`。
2. 输入：
   - LifeSimulationState
   - LifeInterludeResult
3. 应用效果：
   - modifyStat
   - addWound
   - addHeartKnot
   - modifyHiddenFateProgress
   - modifyCarriedItemAffinity
   - modifyStorylineScore
   - modifyThreadProgress
   - modifyKarmaMerit
   - addAge18Hook
   - addLifeLog
4. 自动结算结果不能产生 hiddenSuccess。
5. 失败不能终止人生模拟。
6. 特殊天命 hook：
   - 废灵逆命失败给逆命点
   - 百折不摧失败减轻伤病/提升心性
   - 魔心暗种失败可能转化魔念

验收：
- 成功/失败写回正确。
- 不泄露隐藏命真名。
- age18Hook 被保存。
- thread progress/tension 可变化。
- npm run typecheck
- npm test
