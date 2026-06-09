# 事件分类与 Schema v0.2

## 1. 事件对象

```ts
interface MonthlyLifeEventV02 {
  id: string;
  title: string;
  phase: "infant" | "child" | "youth" | "teen";
  ageMonthRange: [number, number];

  category: MonthlyEventCategoryId;
  tier: MonthlyEventTierId;

  description: string;
  baseWeight: number;
  cooldownMonths: number;
  maxTriggersPerLife: number;

  tags: string[];
  storylineIds: string[];
  threadIds: string[];

  conditions: LifeEventCondition[];
  visibleEffects: LifeEventEffect[];
  hiddenEffects: LifeEventEffect[];

  hooks: string[];

  interludeCandidate?: string;
  stageTransitionSignal?: string;

  llmBrief: {
    tone: string;
    maxChars: number;
    mustNotRevealHiddenTrueName: boolean;
  };
}
```

## 2. 分类 category

分类用于判断事件语义、控制重复、辅助 UI 过滤和事件编辑器分组。

v0.2 分类包括：

```text
ambient_world
family_bond
body_health
study_scholar
martial_labor
alchemy_herb
temple_talisman
dream_spirit
origin_clue
destiny_manifest
hidden_omen
disaster_karmic
storyline_thread
interlude_hook
stage_transition
system_omen
```

## 3. 层级 tier

层级用于叙事密度控制：

```text
breath
growth
omen
thread
pressure
choice_seed
transition_seed
```

不要把 category 和 tier 混用：

```text
category = 事件讲什么
tier = 事件在叙事节奏中的重量
```

例如：

```text
雷雨骨痛
category = hidden_omen
tier = omen

山贼烟尘
category = disaster_karmic
tier = choice_seed
```

## 4. visibleEffects 与 hiddenEffects

visibleEffects 可以写入 UI 日志，例如：

```json
{"stat":"qi","delta":2}
```

hiddenEffects 不直接展示，例如：

```json
{"hiddenFateTag":"ancient_thunder","delta":8}
```

前端和日志层必须区分两者。

## 5. hooks

hooks 是月度事件给后续系统的“短语义标记”。

例子：

```text
hook_bandit_threat
hook_interlude_rain_mountain
transition_initiation_ready
hook_age18_countdown
```

hooks 可供：

```text
半年重大选择系统
玩法插曲系统
阶段转化系统
18 岁觉醒系统
```

读取。

## 6. interludeCandidate

月度事件不直接开启玩法插曲，只产出 candidate。

半年选择系统读取 candidate 后，生成可选项：

```text
[险] 前往后山查看 → interlude_rain_backhill_stg
```

## 7. stageTransitionSignal

用于提示阶段转化系统：

```text
transition_seek_dao_seed
transition_half_cultivator
transition_age18_pending
```

事件本身通常不直接更改 identity stage。
