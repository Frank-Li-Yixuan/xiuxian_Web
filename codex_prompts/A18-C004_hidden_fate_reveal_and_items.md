# A18-C004：隐藏命揭示与随身物转化

目标：实现隐藏血脉 / 前世 / 系统共鸣的揭示，以及随身物的第一战/洞府转化。

任务：

1. 实现 `resolveHiddenFateReveal(input, rng)`：
   - 根据 progress band 取基础概率
   - 应用灵感、气运、天命、随身物、age18Hook 修正
   - 输出 sealed / halfAwakened / revealed / unstable
2. 创建 UI 可见结果时，不泄露未揭示 trueName。
3. 实现 `resolveCarriedItemConversions(input, rng)`：
   - 根据 carried_item_conversion 表
   - 根据 affinity band、hidden fate、destiny、origin、life hooks 选择 conversion
4. 输出 ConvertedCarriedItem[]。
5. 写入 outerBattlefieldLoadout、outerBattlefieldModifiers、homeHooks。
6. 不实现 UI。

测试：

- hidden progress 100 必定至少 halfAwakened
- 未揭示时可见结果不包含 trueName
- 药铺铜炉 + 丹圣遗骨倾向炼丹转化
- 残破木剑 + 前世剑魄倾向飞剑线索
- 同 seed 可复现
