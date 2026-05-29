# HFO-C006：人生模拟 Hook

目标：让 0–18 岁人生模拟事件系统读取 originFate 的事件偏置。

## 任务

1. 暴露 getLifeEventBiasFromOriginFate(originFate)。
2. 将 backgroundOrigin、hiddenFate、carriedItems 的 tags 合并为 lifeEventBiasTags。
3. 月度事件权重计算时读取这些 tags。
4. 半年选择系统可读取 hiddenFate progress band 生成隐藏选项。

## 验收

- 药铺铜炉提高炼丹/药铺事件权重。
- 古雷真血提高雷雨事件权重。
- 黑骨短笛提高夜梦/魂修/心魔事件权重。
- 进度 >= 70 的隐藏命能使关键事件进入候选池。
