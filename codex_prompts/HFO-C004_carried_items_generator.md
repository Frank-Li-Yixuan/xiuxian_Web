# HFO-C004：随身物生成器

目标：根据身世、隐藏命、天命、灵根生成 1–2 个随身物。

## 任务

1. 实现 generateCarriedItems(context, background, hiddenFate, registry, rng)。
2. 默认生成 1 个随身物。
3. 第二件随身物基础概率 25%，根据规则修正。
4. 不允许重复。
5. 随身物应和身世或隐藏命有解释关联。
6. 输出 CarriedItemResult，包括 conversion。

## 验收

- 破落修士之后更容易获得木剑/无字残页/祖传玉佩。
- 药铺学徒更容易获得药铺铜炉。
- 守墓人之子更容易获得黑骨短笛。
- 祖传玉佩可转化为护盾/八卦玉佩残片线索。
