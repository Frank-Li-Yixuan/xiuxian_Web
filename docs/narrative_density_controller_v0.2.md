# 叙事密度控制器 v0.2

## 1. 为什么需要叙事密度

216 个月如果每月都“高能”，玩家会疲劳；如果每月都平淡，玩家会觉得流水账。

叙事密度控制器的目标：

```text
小事件维持世界呼吸
中事件维持成长感
预兆事件制造期待
主线事件推动人生
压力事件制造选择代价
玩法/转化钩子作为少数高光
```

## 2. 六个月窗口

每 6 个月计算一个密度窗口：

```ts
interface NarrativeDensityWindow {
  startMonth: number;
  endMonth: number;
  densityUsed: number;
  hardEventCount: number;
  categoryCounts: Record<string, number>;
  tierCounts: Record<string, number>;
  hookCounts: Record<string, number>;
}
```

窗口预算：

```text
densityBudgetPerSixMonths = 18
hardEventBudgetPerSixMonths = 2
```

## 3. 窗口过载时的权重调整

如果预算过低：

```text
breath +6
growth +4
omen -8
thread -10
pressure -10
choice_seed -14
transition_seed -18
```

也就是说，当半年窗口已经很高能，后续月份更容易发生轻量事件。

## 4. 窗口过轻时的权重调整

如果过去数月都很平淡：

```text
omen +4
thread +6
pressure +4
choice_seed +3
```

这样防止玩家连续半年只看到日常。

## 5. 主线推进保障

如果 active storyline 在过去 12 个月没有任何推进：

```text
matching active storyline thread events +12
choice_seed related to active storyline +6
```

如果 fated storyline 过去 18 个月没有推进：

```text
thread/crisis event +20
```

## 6. 插曲候选控制

玩法插曲候选每年推荐 0–2 次。

若过去 12 个月已有 2 个 interludeCandidate：

```text
interlude_hook weight *= 0.35
```

若 24 个月没有任何可玩插曲候选，且年龄 >= 4 岁：

```text
interlude_hook weight += 8
```

## 7. 压力事件控制

压力事件包括：

```text
伤病
心结
灾祸
家境损失
业力
心魔
```

如果玩家已经有多个未解决压力：

```text
pressure weight -8
resolution/relief events +10
```

不要把玩家压到无法翻身，除非他主动选禁忌路线。

## 8. 日志压缩

快速推演模式下：

```text
breath 事件可折叠
growth 事件可合并
omen/thread/pressure/choice_seed/transition_seed 必须展示
```

例如：

```text
这一年你在私塾读书，学识渐长。
```

可压缩多个 breath/growth 事件，但不能压缩：

```text
旧书旁注
禁书一页
天外战鼓
```
