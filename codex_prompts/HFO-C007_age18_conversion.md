# HFO-C007：18 岁系统觉醒与随身物转化

目标：18 岁时解析隐藏命和随身物，生成域外战场与洞府开局钩子。

## 任务

1. 实现 resolveAge18OriginFate(originFate, lifeSimulationSummary, rng)。
2. 根据 reveal_rules 计算隐藏命是否揭示。
3. 根据 carriedItems.eighteenConversion 生成 ConvertedCarriedItem。
4. 输出：
   - revealedHiddenFate?
   - convertedItems
   - outerBattlefieldModifiers
   - dongfuHooks
   - longTermTags
5. 将结果写入 Profile。

## 验收

- 药铺铜炉转化为炼丹/回春丹钩子。
- 残破木剑转化为飞剑/剑魄线索。
- 祖传玉佩转化为护盾/灵宝残片线索。
- 隐藏进度越高，18 岁揭示概率越高。
