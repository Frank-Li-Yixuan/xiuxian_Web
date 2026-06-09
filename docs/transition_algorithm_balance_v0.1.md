# 阶段转化算法与节奏平衡 v0.1

## 1. 每月推进顺序

每月推进建议顺序：

```text
1. 更新 AgePhase
2. 应用月度事件
3. 应用月度事件产生的 stage hooks / transition tokens
4. 更新人生主线与事件线
5. 计算 IdentityStage 候选转化
6. 如果本月是半年节点，生成重大选择和可选玩法插曲
7. 如果重大选择或玩法插曲结束，回写 transitionTokens
8. 重新计算阶段转化候选
9. 若 ageMonths == 216，触发成年节点
```

## 2. 转化优先级

若多个转化同时可发生，按优先级：

1. 年龄阶段转化
2. 强制灾劫/生死类转化
3. 系统预兆转化
4. 入道节点转化
5. 普通身份转化
6. 可选延后/压制类转化

## 3. 身份转化评分

```text
transitionScore =
  base
  + matchingTokens
  + activeStorylineScore * 0.25
  + threadTension * 0.15
  + hiddenFateProgress * 0.20
  + relevantDestinyBonus
  + relevantRootBonus
  + majorChoiceOutcomeBonus
  + interludeResultBonus
  - cooldownPenalty
  - ageRestrictionPenalty
```

达到阈值后生成 `pendingStageTransition`。

## 4. Player Choice Policy

阶段转化可以分成三类：

| 策略 | 说明 |
|---|---|
| automatic | 小型身份变化，可自动写入 |
| prompt | 玩家可选择顺其自然/压制/主动探寻 |
| forced | 成年节点、灾劫、生死、强制系统事件 |

例如：

```text
异象之子 → 求道苗子
```

可以是 prompt。

而：

```text
18 岁成年节点
```

是 forced。

## 5. 节奏阈值

推荐 v0.1：

```text
身份转化阈值：60
入道候选阈值：75
系统候选阈值：65
成年路径决策阈值：按各路径 score 排序
```

## 6. 成年路径决策

成年节点计算：

```text
systemPathScore
initiationPathScore
calamityPathScore
bloodlinePathScore
seclusionPathScore
```

推荐公式：

```text
systemPathScore =
  systemResonance * 0.45
  + outerBattlefieldHooks * 8
  + thunderRootBonus
  + destinySystemBonus
  + age18HookBonus

initiationPathScore =
  initiationReadiness * 0.45
  + initiatedStageBonus
  + teacherTrialSuccess * 10
  + daoTempleStorylineScore * 0.2

calamityPathScore =
  calamityStorylineScore * 0.35
  + karmicPressure * 0.35
  + familyAttachment * 0.2
  + disasterHooks * 8

bloodlinePathScore =
  maxHiddenFateProgress * 0.45
  + bloodlineStirringTokens * 10
  + relevantDestinyBonus

seclusionPathScore =
  seclusionTags * 10
  + heart * 0.25
  + lifespan * 0.25
  + goudaoBonus
```

v0.1 可以先选分最高路径，但 UI 允许未来扩展为玩家选择。

## 7. 防止阶段跳跃过快

硬规则：

```text
身份转化后 12 个月内，不再触发普通身份转化。
玩法插曲后 6 个月内，不再触发普通玩法插曲。
系统预演类节点 12 个月冷却。
入道节点 18 个月冷却。
```

成年人节点无视冷却。

## 8. 自动推演与手动玩法的关系

如果半年选择触发玩法插曲，玩家可以：

```text
手动挑战：最高可 hiddenSuccess
自动推演：最高 success
避开：partial 或放弃
```

阶段系统只读取最终结果，不关心玩法细节。

## 9. 失败不应阻断人生

所有 0–18 岁玩法插曲失败都不应结束人生。失败应回写：

```text
伤病
心结
业力
主线张力
逆命点
系统恐惧 hook
```

而不是 Game Over。
