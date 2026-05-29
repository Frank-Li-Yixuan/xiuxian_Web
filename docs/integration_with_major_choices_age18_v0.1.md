# 《月度事件与半年选择、18 岁觉醒的集成 v0.1》

## 1. 与半年重大选择系统的边界

月度事件系统只负责：

```text
自动推进
记录发生了什么
改变状态
埋 majorChoiceHook
```

半年重大选择系统负责：

```text
根据过去 6 个月的 hooks 和状态生成 3–4 个选项
计算成功/失败
应用重大选择结果
```

### 1.1 PendingMajorChoiceRef

每 6 个月生成：

```ts
interface PendingMajorChoiceRef {
  ageMonths: number;
  phaseId: LifePhaseId;
  recentEventIds: string[];
  hooks: string[];
  stateSummary: LifeStateSummary;
}
```

示例：

```json
{
  "ageMonths": 78,
  "phaseId": "childhood",
  "recentEventIds": ["m020_hide_in_cellar", "m018_help_lost_goat"],
  "hooks": ["goudao_layers", "merit_minor"],
  "stateSummary": {
    "highStats": ["heart"],
    "wounds": [],
    "heartKnots": [],
    "hiddenFateBand": "faint_omen"
  }
}
```

---

## 2. 月度事件如何影响半年选择

### 2.1 直接 hook

事件可以添加：

```text
majorChoiceHook: bandit_threat
majorChoiceHook: forbidden_page
majorChoiceHook: wild_ginseng_choice
```

半年选择池可读取这些 hook 生成专属选项。

### 2.2 状态影响

即使没有 hook，状态也会影响选择：

| 状态 | 半年选择倾向 |
|---|---|
| 伤病 | 出现疗伤、休养、硬撑、寻医 |
| 心结 | 出现报复、释怀、闭关、求助 |
| 高功德 | 出现护生、救援、善缘 |
| 高业力 | 出现冲突、魔念、夺宝 |
| 高隐藏进度 | 出现“追查异象”“压制异动” |
| 随身物亲和高 | 出现“研究旧物” |

---

## 3. 与 18 岁觉醒系统的边界

月度事件系统到 216 月停止，输出：

```ts
LifeSimulationResult
```

其中包含：

```text
finalLifeState
monthlyLogs
triggeredHooks
hiddenFateProgress
carriedItemAffinity
wounds
heartKnots
karma
merit
age18Hooks
```

18 岁系统觉醒负责：

```text
解析隐藏命
转化随身物
生成域外战场第一战 RunConfig
生成系统家园/洞府初始钩子
```

---

## 4. Age18 输入结构

```ts
interface Age18AwakeningInput {
  characterOrigin: CharacterOriginState;
  openingDraft: OpeningInnateDraft;
  destinySelection: DestinySelectionState;
  originFateDraft: OriginFateDraft;
  lifeSimulationResult: LifeSimulationResult;
}
```

---

## 5. 重要 hooks

### 5.1 age18Hook

| Hook | 含义 |
|---|---|
| outer_battlefield_omen | 域外战场预兆，第一战特殊开场 |
| system_static | 系统共鸣增强 |
| tribulation_attention | 天道注视，雷劫权重提高 |
| system_countdown | 18 岁倒计时，必定触发系统觉醒特殊日志 |

### 5.2 dongfuHook

| Hook | 含义 |
|---|---|
| alchemy_fire_control | 洞府炼丹房火候经验 |
| craft_old_artifact | 炼器阁旧物修复线 |
| formation_earth_pulse | 聚灵阵/阵法地气线 |
| soul_moonlight | 清心池/魂修线索 |

### 5.3 modeBias

| Hook | 影响 |
|---|---|
| stg:sword | 域外战场飞剑/剑修初始池 |
| stg:thunder | 域外战场雷法初始池 |
| horde:wood_growth | 虫族入侵恢复/藤蔓类进化 |
| deck:scripture | 万族试炼塔法诀牌池 |
| autochess:earth_formation | 天地棋局土阵/中宫权重 |

---

## 6. 持久化建议

人生模拟可能较长，必须支持中途退出。

建议每个月或每次半年选择后保存：

```text
lifeSimulationState
currentAgeMonth
monthlyLogs
pendingMajorChoice
rngState
```

继续游戏时：

```text
如果 profile.stage === "life_simulation"
  → 恢复 LifeSimulationScreen
```

不要让玩家 14 岁退出后丢失进度。

---

## 7. 调试工具建议

开发模式提供：

```text
/dev/life-sim
```

功能：

```text
选择 seed
选择预设角色
快速跑 216 个月
显示事件分布
显示隐藏进度曲线
显示精气神曲线
显示 hooks
导出 JSON
```

这比在正式 UI 里逐月调试高效。
