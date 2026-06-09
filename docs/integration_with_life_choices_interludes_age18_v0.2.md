# Integration with Monthly Events, Choices, Interludes, Age18 v0.2

## 1. 输入

本系统读取：

```text
OpeningInnateDraft
DestinySelectionState
NinePalaceEvaluation
LifeStorylineState
MonthlyEventState
MajorChoiceState
LifeInterludeResult
LifeStageState
```

## 2. 输出到月度事件

```text
lifeEventBiasTags
hiddenOmenTags
originLocationTags
carriedItemEventTags
misdirectionTags
```

示例：

```text
carried_item:wooden_sword + hidden_fate:sword_soul
→ 提高 木剑轻鸣 / 竹影如剑 / 旧洞府残图 权重
```

## 3. 输出到半年选择

```text
hiddenBranchSignals
destinyOptionUnlocks
carriedItemChoiceOptions
riskWarnings
```

示例：

```text
祖传玉佩 affinity >= 60
→ 祖玉阵局事件中解锁 [命] 按玉佩纹路摆阵
```

## 4. 输出到玩法插曲

```text
interludeCandidateBias
interludeRunConfigModifiers
interludeWritebackMapping
```

示例：

```text
黑骨短笛 + 太阴残脉
→ DBG 心魔/阴梦插曲权重提高
```

## 5. 输出到阶段转化

```text
stageTransitionTokens
initiationNodeCandidates
identityStageBias
```

示例：

```text
hidden_fate_half_revealed:thunder
→ 系统候选者 / 入道候选 分数提高
```

## 6. 输出到 18 岁

```text
Age18OriginFateInput {
  originNarrativeState
  hiddenFateStates
  carriedItemStates
  revealHistory
  misleadingOmenHistory
  keyChoiceRecords
  keyInterludeRecords
}
```

## 7. 输出到多玩法

```text
outerBattlefieldTags
hordeTags
deckbuilderTags
autochessTags
dongfuHooks
```

示例：

```text
丹圣遗骨 halfReveal + 药铺铜炉 highAffinity
→ 域外战场：初始回春丹
→ 洞府：残破丹炉火候经验
→ DBG：药性牌池提高
```
