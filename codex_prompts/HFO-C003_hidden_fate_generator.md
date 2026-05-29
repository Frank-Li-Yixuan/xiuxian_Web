# HFO-C003：隐藏命生成与预兆显示

目标：生成隐藏血脉/前世/封印/系统共鸣，并只向 UI 暴露预兆，不暴露真名。

## 任务

1. 实现 generateHiddenFate(context, backgroundResult, registry, rng)。
2. 根据 biasTags / antiBiasTags / 灵感 / 气运 / 天命 / 身世修正权重。
3. 生成 initial progress。
4. 生成 VisibleHiddenOmen：
   - vagueLevel
   - levelLabel
   - hints
   - riskHint
5. 创建页不得显示 hiddenFate.trueName。
6. 支持天机推演：消耗 token 显示额外 hint 和 category，但仍不显示 trueName。

## 验收

- 页面可见数据中不包含 trueName。
- 高灵感样本平均 progress 更高。
- 雷灵根 + 劫雷亲和更容易抽古雷真血。
- 药铺学徒 + 丹道奇才更容易抽丹圣遗骨。
