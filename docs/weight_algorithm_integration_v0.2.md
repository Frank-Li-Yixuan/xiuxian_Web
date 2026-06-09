# 权重算法与系统集成 v0.2

## 1. 输入

月度事件选择器需要读取：

```ts
LifeSimulationState
NinePalaceEvaluation
DestinySelectionState
OriginFateDraft
LifeStorylineState
LifeStageState
NarrativeDensityState
RecentLifeLogs
```

## 2. 筛选

事件需要满足：

```text
ageMonthRange 包含当前月
phase 匹配当前 agePhase
conditions 通过
cooldown 通过
maxTriggersPerLife 未超
```

## 3. 权重

基础公式：

```text
finalWeight =
  (baseWeight
   + tagBonus
   + storylineBonus
   + threadBonus
   + stageBonus
   + densityAdjust
   + destinyManifestBonus)
  × repeatPenalty
  × cooldownPenalty
  × phaseMultiplier
```

## 4. 标签来源

| 来源 | 示例 |
|---|---|
| 九宫命盘 | high_talent、low_lifespan、high_rebellion |
| 灵根 | root_thunder、root_wood、root_yin |
| 天命 | destiny_heaven_jealous、destiny_coward_path |
| 身世 | origin_apothecary、origin_temple_servant |
| 隐藏命 | hidden_omen_thunder、hidden_omen_system |
| 随身物 | item_broken_sword、item_jade_amulet |
| 主线 | storyline_alchemy、storyline_system_omen |
| 事件线 | thread_wooden_sword、thread_furnace_dream |

## 5. 结果对象

```ts
interface MonthlyEventSelectionResult {
  selectedEventId: string;
  finalWeight: number;
  candidateCount: number;
  debugTopCandidates: Array<{
    eventId: string;
    weight: number;
    reasons: string[];
  }>;
}
```

## 6. Debug 要求

开发模式可显示：

```text
本月事件为什么被选中
前 5 个候选事件
权重贡献项
密度调整
冷却/重复惩罚
```

正式 UI 不显示这些 debug 信息。

## 7. 确定性

所有随机必须来自 Seeded RNG。

同样输入：

```text
同 seed
同 ageMonth
同 LifeSimulationState
```

必须抽到同样事件。

## 8. 与 LLM 的边界

LLM 不参与事件选择。  
LLM 只在事件选定后，根据结构化事件生成文案变体。
