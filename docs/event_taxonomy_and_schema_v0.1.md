# 《月度事件数据结构与事件池规范 v0.1》

## 1. MonthlyLifeEvent

```ts
interface MonthlyLifeEvent {
  id: string;
  title: string;
  description: string;

  /** Inclusive range, e.g. [0, 47]. */
  ageRangeMonths: [number, number];

  category: LifeEventCategoryId;
  baseWeight: number;
  tags: string[];

  conditions: LifeEventCondition[];
  difficulty: number;
  cooldownMonths: number;

  visibleEffects: LifeEffect[];
  hiddenEffects: LifeEffect[];

  /** Hooks consumed by the half-year major choice system. */
  majorChoiceHooks: string[];
}
```

---

## 2. LifeEffect

```ts
type LifeEffectKind =
  | "core"
  | "aptitudeSoft"
  | "lifeSkill"
  | "merit"
  | "karma"
  | "state"
  | "hiddenFateProgress"
  | "itemAffinity"
  | "destinyProgress"
  | "majorChoiceHook"
  | "age18Hook"
  | "modeBias"
  | "dongfuHook"
  | "tag"
  | "lifeEventBias";

interface LifeEffect {
  kind: LifeEffectKind;
  target: string;
  value: number;
  reason?: string;
}
```

---

## 3. Condition

```ts
type LifeEventCondition =
  | { kind: "tagAny"; tags: string[] }
  | { kind: "tagAll"; tags: string[] }
  | { kind: "statAbove"; stat: string; value: number }
  | { kind: "statBelow"; stat: string; value: number }
  | { kind: "statAnyAbove"; stats: string[]; value: number }
  | { kind: "stateFlag"; flag: string }
  | { kind: "hiddenFateBandAtLeast"; hiddenFateId: string; band: HiddenFateBandId };
```

---

## 4. 事件 ID 规范

```text
m001_thunder_birth_cry
m002_silent_infant
...
```

命名要求：

```text
m + 3 位序号 + 英文语义
```

不要用中文作为 ID，便于测试和引用。

---

## 5. 标签规范

标签应尽量复用：

```text
root:metal / root:wood / root:water / root:fire / root:earth / root:thunder / root:yin
destiny:heaven_jealous_talent
destiny:goudao_supreme
origin:herb_shop_apprentice
hiddenBias:thunder
lifeEvent:thunderstorm_omen
modeBias:stg:sword
```

不要随意创造近义标签，如：

```text
thunder_event
thunderOmen
雷雨
```

统一用：

```text
thunder
lifeEvent:thunderstorm_omen
```

---

## 6. 事件写作规范

每条事件应该：

1. 不超过 2 句描述。
2. 有明确修仙意象。
3. 不直接剧透隐藏血脉真名。
4. 不写现代系统词，18 岁前不明说“系统”。
5. 可以暗示域外战场，但不提前解释。
6. 负面事件不血腥，不恶心，强调命数和状态变化。

示例：

```text
你连续数夜梦见黑色战场，天上有流星般的残兵坠落。
```

比：

```text
系统即将把你传送到域外战场。
```

更好。

---

## 7. 数据文件

```text
data/life_sim/phase_definitions.v0.1.json
data/life_sim/monthly_event_categories.v0.1.json
data/life_sim/monthly_event_rules.v0.1.json
data/life_sim/stat_growth_tables.v0.1.json
data/life_sim/monthly_events.v0.1.json
data/life_sim/log_templates.v0.1.json
data/life_sim/sample_monthly_timeline.v0.1.json
```
