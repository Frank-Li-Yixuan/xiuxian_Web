执行 NPF-C005：九宫命盘接入人生模拟事件 Hooks。

目标：
让 LM/MLC 事件引擎读取九宫命盘输出的 lifeEventBiasTags 和派生评分。

任务：
1. LifeSimulationState 初始化时保存 ninePalaceEvaluation 摘要。
2. Monthly event weighting 读取：
   - lifeEventBiasTags
   - derivedScores
   - threePower imbalance tags
3. Major choice generation 读取：
   - high/low attributes
   - lateBloomScore
   - destinyPressureScore
   - rebellionScore
4. 不改事件数据内容，只接入权重接口。
5. 不修改 src/sim/**。

测试：
- 高悟性角色更容易抽到 reading/insight 事件
- 低寿元角色更容易抽到 illness/short_life 事件
- 高灵感角色更容易抽到 dream/hidden_fate 事件
- 低根骨高心性更容易抽到 failed_cultivation/reversal 事件

运行：
npm run typecheck
npm test
npm run build
