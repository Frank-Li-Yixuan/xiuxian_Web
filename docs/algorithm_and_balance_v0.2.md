# 选择生成、风险收益与成功判定算法 v0.2

## 1. 输入上下文 ChoiceContext

半年选择生成需要读取：

```text
lifeSimulationState
lastSixMonthlyLogs
activeStorylines
eventThreadStates
lifeStageState
openingNinePalaceEvaluation
destinySelection
originFateDraft
carriedItems
hiddenFateVisibleState
recentInterludeHistory
narrativeDensityWindow
```

## 2. 生成事件

```text
candidateEvents = filter by age phase + conditions + cooldown
weightedEvents = computeWeight(candidateEvents, context)
selectedEvent = seededWeightedPick(weightedEvents)
```

### 事件权重

```text
eventWeight =
  baseWeight
  + sourceHookMatch * 8
  + storylineMatch * 6
  + threadCrisisMatch * 10
  + transitionNeedMatch * 8
  + destinyMatch * 5
  + originMatch * 4
  + itemMatch * 4
  + densityAdjust
  - repeatPenalty
```

## 3. 生成选项

每个事件有预设 options，但最终 UI 可做筛选：

```text
必须至少 3 个可见选项
最多 5 个选项
禁/命选项需要条件
interlude 选项受频率预算限制
```

如果可见选项不足，则用 fallback 选项补足：

```text
稳：退一步，稳住局面
正：按常理处理
```

## 4. 风险预估

选择 UI 显示模糊风险，不显示精确概率。

```text
estimatedScore =
  50
  + primaryStatScore
  + supportStatScore
  + destinyKnownModifier
  + rootKnownModifier
  + itemKnownModifier
  - difficulty
  - riskPenalty
```

然后映射到文案：

```text
十拿九稳 / 胜算颇高 / 可堪一试 / 吉凶参半 / 凶险 / 九死一生 / 天机难测
```

隐藏、禁忌、系统前兆类选项默认显示 `天机难测`。

## 5. 成功判定

使用 Seeded RNG，不使用 Math.random。

```text
roll = d100(seed)
score = roll + modifiers - difficulty
band = resolveOutcomeBand(score, hiddenConditions)
```

隐藏成功要求：

```text
score >= hiddenSuccessThreshold
且 hiddenBranch.requiredSignals 满足
且 revealPolicy 允许
```

## 6. 失败补偿

某些天命可把失败转为资源：

```text
废灵逆命 → 逆命点
百折不摧 → 心性/根骨微涨
苟道至尊 → 若选择避战失败，仍可保留部分潜修
魔心暗种 → 失败可能变成心魔资源，但业力增加
```

## 7. 叙事密度控制

半年选择如果过去 6 个月已经有多个高压事件，应降低凶/禁选项权重，提高稳/正选项。

如果过去 6 个月过于平淡，则可提高：

```text
choice_seed
thread crisis
hidden omen
transition seed
```

的权重。
