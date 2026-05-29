# 《半年重大选择与月度事件、18 岁觉醒集成 v0.1》

## 1. 与月度事件系统的关系

月度事件系统每月产生：

```ts
MonthlyLifeLogEntry
```

其中包含：

```text
eventId
category
tags
visibleText
visibleEffects
hiddenHooks
majorChoiceHooks
age18Hooks
```

半年重大选择系统读取最近 6 个月日志：

```ts
recentLogs = monthlyLogs.slice(lastChoiceMonth, currentMonth)
```

汇总：

```text
recentHooks
categoryCounts
repeatedTags
woundsAdded
hiddenFateProgressChanged
carriedItemAffinityChanged
```

这些决定半年事件池。

---

## 2. PendingMajorChoiceRef 转换

月度系统在第 6、12、18...月生成 `PendingMajorChoiceRef`：

```ts
interface PendingMajorChoiceRef {
  month: number;
  sourceMonthlyEventIds: string[];
  hooks: string[];
  phaseId: LifePhaseId;
  summaryTags: string[];
}
```

重大选择系统将其解析为：

```ts
PendingMajorChoiceState
```

包含完整事件和选项。

---

## 3. 与人生状态的关系

选择结算后更新：

```text
core 精气神
aptitude 六维资质
lifeSkills 学识/武艺/药理/见识/名声/家境
karma / merit / heartDemon
wounds / heartKnots
hiddenFateProgress
carriedItemAffinity
flags
choiceHistory
age18Hooks
modeBiasTags
```

---

## 4. 与隐藏血脉的关系

选择系统不能暴露隐藏真名。

允许：

```text
“雷声似乎回应了你。”
“旧玉佩变得微温。”
“你梦见一尊残破丹炉。”
```

禁止：

```text
古雷真血 +10
丹圣遗骨进度 +8
前世剑魄半觉醒
```

---

## 5. 与天命的关系

天命可提供：

```text
额外选项
成功加成
失败转收益
结果替换
长期计数
```

例如：

```text
废灵逆命：
choice outcome = failure 时，额外获得逆命点。

苟道至尊：
avoid_combat / seclusion 选项成功时，潜修层数 +1。
combat / dangerous 选项选择后，潜修层数减少。

天妒英才：
study / insight 选项收益提高，但可能附加天道注视 hook。

魔心暗种：
forbidden 选项出现概率提高，心魔代价降低但业力提高。
```

---

## 6. 与 18 岁觉醒系统的关系

重大选择会产生：

```text
age18Hooks
```

这些 hook 会在 18 岁系统觉醒时转化：

| Hook | 转化 |
|---|---|
| outer_battlefield_omen | 第一战特殊开场 / 域外战场熟悉感 |
| thunder_fate_accumulated | 雷系奖励池、雷劫风险 |
| sword_memory_awakened | 初始飞剑/剑修线索 |
| alchemy_fire_control | 初始丹药/炼丹房火候 |
| hidden_system_resonance | 系统权限 / 额外提示 |
| karmic_debt | 业力敌人 / 额外奖励 |
| merit_protection | 护命 / 初始功德 |
| heart_demon_seed | 心魔战斗事件 |

---

## 7. 18 岁前最后一次选择

第 17 岁 6 月到 18 岁之间的最后一个重大选择应提高：

```text
system_path
origin_path
hidden_fate_path
destiny_path
```

因为它要为系统觉醒做铺垫。

常见最后事件：

```text
生辰将近
天外战鼓
梦中黑色战场
旧物裂光
家书与诀别
山门异响
```

---

## 8. 存档恢复

若玩家在半年选择时退出：

```text
LifeSimulationState.pendingMajorChoice
```

必须原样保存。恢复后不重新生成事件、不重新 roll 选项、不重置成功概率估算。

若玩家已选择但未看完动画：

```text
selectedOptionId
resolutionResult
```

也应保存，避免刷新重掷。
