# 《人生主线与事件线系统 v0.1》

版本：v0.1  
定位：0–18 岁人生模拟的叙事骨架与事件线系统  
适用范围：创建角色确认后、月度事件与半年重大选择之前/之中  
核心目标：让人生模拟从“随机月报”升级为“命盘驱动的渐进人生故事”。

---

## 0. 设计结论

人生模拟不能只是：

```text
每月随机一个事件
每半年随机一个选择
```

这会变成流水账。正确结构应该是：

```text
九宫命盘 / 灵根 / 天命 / 身世 / 随身物
  ↓
激活若干人生主线倾向
  ↓
每条主线拥有多个事件线 Thread
  ↓
月度事件负责铺垫、显化、埋钩子
  ↓
半年重大选择负责分叉、推进、验证
  ↓
少数关键节点触发玩法插曲
  ↓
阶段转化与 18 岁结算读取主线进度
```

一句话：

> **玩家不是在经历随机童年，而是在看自己的命盘如何一步步显化成一段修真人生。**

---

## 1. 系统边界

本系统负责：

```text
1. 定义人生主线 Life Storyline。
2. 定义事件线 Event Thread。
3. 根据九宫、灵根、天命、身世、隐藏命、随身物计算主线倾向。
4. 为月度事件系统提供 storylineWeight / storylineTags。
5. 为半年重大选择系统提供 choiceHooks / branchHooks。
6. 为玩法插曲系统提供 playInterludeHooks。
7. 为阶段转化和 18 岁系统觉醒提供 accumulatedLifeThreads。
```

本系统不直接负责：

```text
1. 每月事件的具体抽取算法。
2. 每半年选择的成功判定。
3. 玩法插曲的具体战斗实现。
4. 18 岁属性转化公式。
5. DeepSeek / LLM 文本生成。
```

这些会在后续系统中实现。

---

## 2. 人生主线是什么

人生主线是角色 0–18 岁阶段不断被命盘、身世和选择推着靠近的“成长方向”。它不是职业，也不是玩家硬选的路线，而是事件权重和选择结果自然形成的倾向。

v0.1 定义 8 条核心主线：

| 主线 | 核心体验 | 适合命盘 |
|---|---|---|
| 寒门读书线 | 私塾、旧书、问学、悟性成长 | 悟性高、私塾童生、寒门、天妒英才 |
| 药铺丹道线 | 药材、火候、丹炉、救治 | 木/火/土、药铺学徒、丹道奇才 |
| 猎户练武线 | 山林、练武、狩猎、血性 | 精/根骨高、猎户之子、以战养战 |
| 道观香火线 | 道观、符箓、香火、问心 | 心性/神高、道观杂役、清净琉璃心 |
| 破落修士遗脉线 | 祖传旧物、残卷、木剑、遗脉 | 破落修士之后、前世剑魄、废灵逆命 |
| 山村灾劫线 | 山贼、妖兽、村祸、守护或逃亡 | 灾星、兵劫、天煞、护生、功德 |
| 阴梦魂修线 | 梦境、墓地、月夜、神魂 | 阴灵根、神高、太阴残脉、守墓人之子 |
| 系统前兆线 | 杂音、天外战鼓、命盘裂光 | 系统共鸣体、灵感高、域外战场回响 |

这些主线可以共存。一个角色可能是：

```text
药铺丹道线 72
系统前兆线 44
山村灾劫线 28
```

这意味着他主要走药铺丹道，但偶尔会出现系统前兆和村难事件。

---

## 3. 主线激活机制

每条主线拥有一个 `storylineScore`，范围建议为 0–100+。

### 3.1 初始主线分数

创建角色时，由以下输入计算：

```text
OpeningInnateDraft
DestinySelectionState
OriginFateDraft
NinePalaceEvaluation
```

公式：

```text
storylineScore =
  baseWeight
  + originMatch
  + spiritualRootMatch
  + destinyMatch
  + hiddenFateOmenMatch
  + carriedItemMatch
  + ninePalaceScoreMatch
  + randomMinorVariation
```

### 3.2 主线状态

| 分数 | 状态 | 说明 |
|---:|---|---|
| 0–19 | dormant | 暂不活跃 |
| 20–39 | hinted | 偶尔出现相关事件 |
| 40–69 | active | 经常出现相关事件 |
| 70–99 | dominant | 主线显著支配人生 |
| 100+ | fated | 几乎成为此生主轴，可能触发特殊分支 |

### 3.3 主线动态变化

人生模拟中，玩家选择会改变主线分数：

```text
读书、问学、读残卷 → 寒门读书线 +
采药、试药、控火 → 药铺丹道线 +
练武、狩猎、搏杀 → 猎户练武线 +
焚香、画符、问心 → 道观香火线 +
守祖物、修木剑、读旧经 → 破落遗脉线 +
救村、逃灾、复仇 → 山村灾劫线 +
入梦、墓地、魂火 → 阴梦魂修线 +
系统杂音、天外战鼓 → 系统前兆线 +
```

若玩家长期不响应某条主线，它会衰减或转化：

```text
山村灾劫线被长期回避 → 苟道 / 逃亡分支
破落遗脉线长期失败 → 废灵逆命分支
阴梦魂修线被压制 → 心结 / 心魔分支
```

---

## 4. 事件线 Event Thread

主线是大方向，事件线是具体故事链。

例如“药铺丹道线”下可以有：

```text
药理启蒙 Thread
误食灵草 Thread
丹炉梦 Thread
救治病人 Thread
炸炉与火候 Thread
```

每条事件线都有阶段：

```text
seed → omen → development → crisis → resolution
```

对应年龄：

```text
seed：0–8 岁
omen：4–12 岁
development：9–15 岁
crisis：12–17 岁
resolution：16–18 岁
```

但年龄只是推荐，不是硬限制。

---

## 5. 事件线状态

```ts
type EventThreadStage =
  | "notStarted"
  | "seeded"
  | "hinted"
  | "developing"
  | "crisis"
  | "resolved"
  | "failed"
  | "dormant";
```

### 5.1 事件线进度

每条 thread 拥有：

```text
progress: 0–100
tension: 0–100
clarity: 0–100
risk: 0–100
```

含义：

| 字段 | 含义 |
|---|---|
| progress | 故事推进程度 |
| tension | 紧张度，越高越容易触发 crisis |
| clarity | 玩家对真相的清晰程度 |
| risk | 失败/伤病/业力/心魔风险 |

---

## 6. 月度事件如何使用主线

月度事件系统每月抽事件时，先从角色当前主线状态中获取加权标签：

```text
activeStorylineTags
activeThreadTags
recentThreadHooks
```

然后影响事件池：

```text
月度事件基础权重
  + 主线权重
  + 事件线阶段权重
  + 天命显化权重
  + 隐藏预兆权重
```

例如：

```text
药铺丹道线 active + 丹炉梦 developing
→ 梦中丹炉、分药、火候、误食灵草事件权重增加
```

---

## 7. 半年重大选择如何使用主线

每 6 个月生成重大选择时，系统读取：

```text
最近 6 个月月度事件
active threads
thread tension
主线分数
```

然后生成：

```text
主线推进选项
主线回避选项
主线转向选项
隐藏/命格选项
玩法插曲选项
```

例如：

```text
山村灾劫线 tension >= 70
→ 半年选择可能出现“山贼烟尘 / 妖兽袭村”类危机
```

选项：

```text
[稳] 带家人躲入山中
[正] 向镇妖司求援
[险] 夜探山贼营
[命] 独自守村口
```

其中 `[险]` 或 `[命]` 可能触发 STG / 割草玩法插曲。

---

## 8. 玩法插曲如何接入主线

玩法插曲不是随机小游戏，而是事件线 crisis / trial 阶段的可交互呈现。

| 玩法 | 适合主线 |
|---|---|
| STG 雷霆战机 | 后山妖影、飞剑异动、域外梦战、山村灾劫 |
| 肉鸽割草 | 守药田、虫潮、村口防守、妖兽潮 |
| DBG 卡牌 | 私塾问学、符阵问心、梦中论道、心魔辩法 |
| 天地棋局 | 道观阵盘、祖传玉佩、地脉试阵、天机推演 |

玩法插曲结果应该回写：

```text
threadProgress
threadTension
lifeStats
wounds
heartKnots
merit / karma
hiddenFateProgress
age18Hooks
```

---

## 9. 主线与阶段转化

人生阶段转化不能只看年龄，还要看主线完成度。

例如：

```text
寒门读书线 resolution
→ 可能成为“童生问道 / 书卷入道”身份

药铺丹道线 resolution
→ 可能获得“丹火初识 / 残炉亲和”

破落遗脉线 crisis 成功
→ 可能提前触发“旧物认主”

系统前兆线 dominant
→ 可能提前触发“系统半觉醒”
```

因此本系统为后续阶段转化系统输出：

```text
transitionCandidateHooks
```

---

## 10. 与九宫命盘的关系

九宫命盘决定哪些主线更容易活跃。

| 九宫特征 | 主线偏置 |
|---|---|
| 悟性高 | 寒门读书、道观香火、系统前兆 |
| 灵感高 | 阴梦魂修、系统前兆、破落遗脉 |
| 根骨/精高 | 猎户练武、山村灾劫 |
| 气高 | 道观香火、丹道、系统前兆 |
| 气运高 | 山村灾劫转功德、破落遗脉奇遇、系统前兆 |
| 心性高 | 道观香火、苟道、破落遗脉 |
| 寿元低 | 天妒、病弱、系统前兆、短命线 |

---

## 11. 与天命的关系

天命会让特定主线显著提高。

| 天命 | 主线偏置 |
|---|---|
| 天妒英才 | 寒门读书、系统前兆、山村灾劫 |
| 苟道至尊 | 道观香火、隐居/避战支线 |
| 废灵逆命 | 破落遗脉、吐纳失败、山村灾劫 |
| 丹道奇才 | 药铺丹道 |
| 器灵之眷 | 破落遗脉、道观香火、法宝旧物 |
| 魔心暗种 | 阴梦魂修、荒祠、禁忌线 |
| 清净琉璃心 | 道观香火、心魔化解 |
| 以战养战 | 猎户练武、山村灾劫 |
| 劫雷亲和 | 系统前兆、后山雷雨、山村灾劫 |

---

## 12. 输出给后续系统

本系统最终输出：

```ts
interface LifeStorylineState {
  activeStorylines: StorylineProgress[];
  eventThreads: EventThreadProgress[];
  recentHooks: StorylineHook[];
  transitionCandidateHooks: string[];
  playInterludeCandidateHooks: string[];
}
```

这些被后续系统读取：

| 系统 | 使用 |
|---|---|
| 月度事件 | 抽取相关事件 |
| 半年选择 | 生成重大选择 |
| 玩法插曲 | 决定是否触发短玩法 |
| 阶段转化 | 判断是否入道/转阶段 |
| 18 岁结算 | 决定第一战开局与洞府线索 |
| LLM 文案 | 提供上下文和禁止泄露约束 |

---

# 13. v0.1 MVP 内容量

v0.1 建议实现：

```text
8 条主线
每条 3–5 条事件线
总计 32 条左右 Event Thread
每条 thread 3–5 个阶段 hook
```

不要一开始写几百个事件。  
真正的事件池由 LM 系统生成，但主线/事件线给它方向。

---

# 14. 设计禁区

```text
1. 不允许每月事件完全脱离主线。
2. 不允许半年选择只是属性加减。
3. 不允许主线被职业硬锁。
4. 不允许隐藏命真名被普通主线事件泄露。
5. 不允许玩法插曲无世界观包装。
6. 不允许 0–3 岁触发真实战斗。
7. 不允许所有角色都走系统前兆线。
```

---

# 15. Codex 实施目标

实现后，工程中应有：

```text
StorylineRegistry
StorylineScoringEngine
EventThreadEngine
LifeStorylineState
StorylineHookGenerator
MonthlyEventStorylineAdapter
MajorChoiceStorylineAdapter
```

但本系统第一步只需要跑出：

```text
根据角色命盘生成 activeStorylines 和 eventThreads。
```

后续再接 LM/MLC。
