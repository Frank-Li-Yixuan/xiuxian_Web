# 《人生主线评分与事件线推进算法 v0.1》

## 1. 输入

```text
OpeningInnateDraft
NinePalaceEvaluation
DestinySelectionState
OriginFateDraft
LifeSimulationState
recentMonthlyLogs
recentMajorChoiceResults
```

## 2. 主线评分流程

```text
for each storyline:
  score = baseWeight
  score += ninePalaceSignals
  score += rootSignals
  score += destinySignals
  score += originSignals
  score += hiddenFateSignals
  score += carriedItemSignals
  score += recentChoiceSignals
  score -= suppressionSignals
  clamp / normalize
```

## 3. 主线状态

```ts
function getStorylineStatus(score: number) {
  if (score < 20) return "dormant";
  if (score < 40) return "hinted";
  if (score < 70) return "active";
  if (score < 100) return "dominant";
  return "fated";
}
```

## 4. 事件线初始化

当主线状态达到 hinted 或 active 时，选择该主线下最匹配的 1–2 条事件线初始化：

```text
threadWeight =
  baseWeight
  + threadTagMatch
  + agePhaseMatch
  + hiddenFateMatch
  + carriedItemMatch
```

## 5. 事件线推进

每月事件和半年选择都可以推进 thread：

```text
progress += event.progressDelta
tension += event.tensionDelta
clarity += event.clarityDelta
risk += event.riskDelta
```

当：

```text
progress >= 30 → hinted/developing
tension >= 70 → crisis candidate
clarity >= 80 → resolution candidate
risk >= 80 → failure/crisis candidate
```

## 6. 事件线结果

### resolved

产生：

```text
age18Hooks
originTags
modeProjectionTags
lifeSkillBoost
hiddenFateProgress
```

### failed

产生：

```text
wounds
heartKnots
karma
hiddenFateDistortion
逆命点
```

### dormant

长时间未响应主线则 dormant：

```text
progress -10
tension -5
```

但某些线如系统前兆、魔心暗种不会自然消失，只会潜伏。

## 7. 防止所有人生都相似

系统应保证：

```text
每个角色初始 dominant/fated 主线不超过 2 条。
active 主线通常为 1–3 条。
hinted 主线可为 2–4 条。
```

如果所有线都低，强制根据命盘最高 signal 选择一条 hinted。

如果系统前兆线过高但没有对应隐藏命，则限制到 active，不允许 fated。
