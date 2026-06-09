# LST-C002：人生主线评分引擎

目标：根据 Opening / NinePalace / Destiny / OriginFate 计算 activeStorylines。

前提：LST-C001 已完成。

任务：
1. 实现 `StorylineScoringEngine.evaluate(input): StorylineProgress[]`。
2. 输入包括：
   - OpeningInnateDraft
   - NinePalaceEvaluation
   - DestinySelectionState
   - OriginFateDraft
   - optional LifeSimulationState
3. 按 signal rules 计算分数。
4. 输出 status：dormant / hinted / active / dominant / fated。
5. 限制 dominant/fated 主线数量，避免所有线都激活。
6. 输出 debug breakdown。
7. 测试典型角色：
   - 药铺丹修 → 药铺丹道线最高
   - 废灵剑修 → 破落修士遗脉线最高
   - 阴梦魂修 → 阴梦魂修线最高
   - 雷修天妒 → 系统前兆/山村灾劫/读书线更高

硬约束：
- 不修改 `src/sim/**`
- 不改 UI
- 不实现月度事件

运行：
- npm run typecheck
- npm test
- npm run build

最终回复：
- 修改文件
- 示例评分输出
- 测试结果
