# ME2-C003：权重选择器 v2

目标：实现新的月度事件权重选择器。

输入：
- LifeSimulationState
- NinePalaceEvaluation
- DestinySelectionState
- OriginFateDraft
- LifeStorylineState
- LifeStageState
- NarrativeDensityState

实现：
1. 条件筛选。
2. baseWeight。
3. tagBonus。
4. storylineBonus。
5. threadBonus。
6. stageBonus。
7. destinyManifestBonus。
8. repeatPenalty / cooldownPenalty。
9. Seeded RNG 加权选择。
10. debugTopCandidates 输出权重原因。

禁止：
- Math.random()
- LLM 参与选择
- src/sim/** 修改

验收：
- 同 seed 结果可复现
- 药铺角色更容易抽药铺事件
- 雷灵根/天妒更容易抽雷雨/天道压力事件
- npm run typecheck
- npm test
