# Hidden Fate Taxonomy & Schema v0.2

## 1. 隐藏命分类

v0.2 把隐藏命分为八类：

| 类型 | 说明 | 示例 |
|---|---|---|
| bloodline | 血脉/体质/骨相 | 古雷真血、太阴残脉、龙骨未醒 |
| pastLife | 前世残魂/记忆 | 丹圣遗骨、前世剑魄 |
| curseSeal | 封印/诅咒/魔印 | 魔印微痕 |
| karmicSeed | 功德/因果种子 | 功德种子 |
| systemResonance | 系统异常适配 | 系统共鸣体 |
| karmicObject | 物件因果 | 天书残页 |
| battlefieldEcho | 域外战场回响 | 域外战场回响 |
| falseOmen | 误导性预兆 | 妄承天机、雷厄缠身的假雷血线 |

## 2. 数据字段

```ts
interface HiddenFateDefinitionV02 {
  id: string;
  trueName: string; // internal only
  publicAlias: string;
  category: HiddenFateCategory;
  rarity: "minor" | "rare" | "epic" | "legendary" | "forbidden";
  primaryTags: string[];
  antiTags: string[];
  preferredOrigins: string[];
  preferredRoots: string[];
  preferredDestinies: string[];
  preferredItems: string[];
  omenStages: HiddenFateOmenStage[];
  misleadingOmenIds: string[];
  lifeEventHooks: string[];
  majorChoiceHooks: string[];
  interludeHooks: string[];
  stageTransitionTokens: string[];
  age18Outcomes: HiddenFateAge18Outcome[];
}
```

## 3. UI 可见字段

创建页与人生模拟早期可显示：

```text
publicAlias
omen text
vague progress band
risk hint
related elements if divined
```

不可显示：

```text
trueName
exact progress
full age18 effect
internal hook id
```

## 4. 进度带

| 进度 | 内部状态 | UI 显示 |
|---:|---|---|
| 0–19 | seed | 隐约无形 |
| 20–39 | omen | 偶有异象 |
| 40–59 | stirring | 命中异动 |
| 60–79 | halfReveal | 似有所指 |
| 80–99 | nearAwake | 封印将醒 |
| 100+ | awakened | 已可揭示 |
