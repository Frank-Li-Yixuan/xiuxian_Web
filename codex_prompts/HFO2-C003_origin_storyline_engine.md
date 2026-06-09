执行 HFO2-C003：表面身世叙事线引擎。

目标：
实现 OriginNarrativeEngine，把表面身世从出生标签升级为人生主线种子。

任务：
1. 根据 origin_storyline_definitions 生成 OriginNarrativeStateV02。
2. 输出：
   - activeStorylineIds
   - originThreadProgress
   - lifeEventBiasTags
   - carriedItemBias
   - hiddenFateBias
3. 支持四段身世事件阶段：
   earlyEcho / childhoodSeed / youthConflict / teenChoice
4. 与 LifeStorylines 系统对接：
   - 给 storyline scoring 提供 origin bias。
   - 给 monthly events 提供 regionTags 和 hook。
5. 不改 UI。
6. 不改 src/sim/**。

测试：
- 药铺学徒激活药铺丹道线。
- 破落修士之后激活破落遗脉线。
- 守墓人之子激活阴梦魂修线。
