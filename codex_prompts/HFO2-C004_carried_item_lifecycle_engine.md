执行 HFO2-C004：随身物生命周期引擎。

目标：
实现 CarriedItemLifecycleEngine，让随身物在 0–18 岁期间持续推进，而不是只在创建页和 18 岁出现。

任务：
1. 生成 1–2 个 carried item。
2. 初始化 affinity 和 lifecycleStage。
3. 根据月度事件、半年选择、玩法插曲结果推进：
   - affinity
   - lifecycleStage
   - damaged
   - converted
4. 生成随身物相关月度事件 hook。
5. 生成随身物相关半年选择 hook。
6. 生成玩法插曲 candidate bias。
7. 生成 18 岁 conversion input。
8. 不泄露隐藏命 trueName。

测试：
- 残破木剑 + 前世剑魄可提高 affinity。
- 药铺铜炉 + 丹圣遗骨可提高 affinity。
- 黑骨短笛可提高魂修/心魔相关 hook。
- affinity 达到阈值后生命周期推进。
