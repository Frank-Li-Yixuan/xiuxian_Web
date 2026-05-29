# MLC-C002：半年选择生成引擎

目标：从 LifeSimulationState 和最近 6 个月月度事件生成 PendingMajorChoiceState。

任务：
1. 实现 buildChoiceContext(lifeState)。
2. 实现 getMajorChoiceCandidates(context)。
3. 实现 computeMajorChoiceEventWeight(event, context)。
4. 实现 generatePendingMajorChoice(context, rng)。
5. 为每个选项生成 successChanceLabel。
6. 生成后写入 LifeSimulationState.pendingMajorChoice。

规则：
- 同 seed + 同 state 必须生成相同选择。
- 如果 state 已有 pendingMajorChoice，不要重新生成。
- 必须至少包含 3 个可显示选项。
- 正常情况下至少有一个 safe/steady 选项。

测试：
- 同 seed 确定性。
- hook 会提高对应事件权重。
- 不同阶段出现不同事件池。
