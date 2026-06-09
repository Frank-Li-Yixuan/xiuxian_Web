执行 HFO2-C006：HFO v0.2 与人生模拟集成。

目标：
把 OriginFateNarrativeStateV02 接入月度事件、半年选择、玩法插曲和阶段转化系统。

任务：
1. LifeSimulationState 增加 originFateNarrativeState。
2. 月度事件权重读取：
   - hiddenFate.lifeEventHooks
   - origin.regionTags
   - carriedItem.eventHooks
3. 半年选择读取：
   - majorChoiceSignals
   - carriedItem related options
   - hidden fate branch hints
4. 玩法插曲读取：
   - interludeBiasTags
5. 阶段转化读取：
   - stageTransitionTokens
6. 所有日志不泄露 trueName。
7. 不修改 src/sim/**。

测试：
- 药铺学徒+铜炉产生更多药炉事件。
- 破落修士之后+木剑产生木剑轻鸣事件。
- 守墓人+黑骨短笛产生阴梦事件。
