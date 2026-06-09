# 玩法模式契约与结果回写 v0.1

## 1. 插曲模式不是完整长期模式

人生模拟中的插曲是短版本：

| 插曲 | 对应长期模式 | v0.1 插曲长度 |
|---|---|---|
| STG | 域外战场历练 | 60–180 秒 |
| 割草 | 虫族入侵 | 2–5 分钟 |
| DBG | 万族试炼塔 | 3–10 回合 |
| 天地棋局 | 阵法推演 | 3–8 回合 |

## 2. STG 插曲契约

适用：

```text
夜探后山
飞剑异动
域外梦战
山村灾劫
雷雨试炼
```

输入：

```text
ageMonth
projection from life stats
limited artifact/spell
difficultyTier
scenario
```

输出：

```text
score
survived
kills
damageTaken
pickupCount
specialTriggers
```

回写：

```text
武艺
神
灵感
隐藏进度
伤病
心结
age18Hook
```

## 3. Horde 割草插曲契约

适用：

```text
守药田
村口防守
虫潮
妖兽潮
```

输出：

```text
survivalTime
wavesCleared
resourceProtectedPercent
eliteKilled
```

回写：

```text
药理
精
功德
虫核/灵草线索
家境变化
伤病
```

## 4. DBG 插曲契约

适用：

```text
梦中论道
符阵问心
禁书试炼
心魔辩法
```

输出：

```text
turns
hpRemaining
deckScore
cardsPlayed
curseCount
```

回写：

```text
悟性
神
心性
学识
心魔
法术线索
```

## 5. 天地棋局插曲契约

适用：

```text
道观阵盘
祖传玉佩
地脉棋局
天机推演
```

输出：

```text
rounds
formationIntegrity
piecesSurvived
comboTriggered
```

回写：

```text
心性
气
阵法感悟
随身物亲和
护体线索
```

## 6. 统一回写效果

```ts
type LifeInterludeWritebackEffect =
  | { type: "modifyStat"; stat: string; amount: number }
  | { type: "addWound"; woundId: string; severity: number }
  | { type: "addHeartKnot"; knotId: string; severity: number }
  | { type: "modifyHiddenFateProgress"; hiddenFateId: string; amount: number; visibleHint: string }
  | { type: "modifyCarriedItemAffinity"; itemId: string; amount: number }
  | { type: "modifyStorylineScore"; storylineId: string; amount: number }
  | { type: "modifyThreadProgress"; threadId: string; progress: number; tension?: number }
  | { type: "modifyKarmaMerit"; karma?: number; merit?: number }
  | { type: "addAge18Hook"; hookId: string; amount?: number }
  | { type: "addLifeLog"; text: string };
```

## 7. 失败策略

插曲失败不应终止人生模拟。

常见失败：

```text
伤病 +1
心结 +1
家境 -1
隐藏进度小幅变化
thread tension 上升
```

特殊天命：

```text
废灵逆命：失败获得逆命点
百折不摧：失败后心性增长
魔心暗种：失败可能换取魔念
```
