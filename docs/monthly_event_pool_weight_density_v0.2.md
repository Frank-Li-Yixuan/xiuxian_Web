# 《月度事件池、权重与叙事密度 v0.2》

版本：v0.2  
系统位置：创建角色后、半年重大选择前的自动人生推进层  
适用范围：0–18 岁人生模拟，每月自动事件，216 个月完整推演

---

## 0. 本次 v0.2 的核心升级

v0.1 的月度事件系统已经能做到：

```text
每月推进
按年龄抽事件
应用属性变化
写日志
每 6 个月产生半年选择 hook
```

但现在项目设计已经升级。我们新增了：

```text
凡域边地世界观
九宫命盘因果
天命成立条件与变异命格
人生主线与事件线
半年选择玩法插曲
人生阶段转化 / 入道节点
```

所以月度事件也必须升级。

v0.2 的核心目标是：

> 月度事件不再只是“随机月报”，而是让命盘、天命、灵根、身世、随身物、人生主线持续显化的叙事引擎。

也就是说，月度事件要回答：

```text
这个月为什么发生这件事？
它和角色的命盘有什么关系？
它在推进哪条人生主线？
它会不会影响下一次半年选择？
它会不会埋下玩法插曲或阶段转化钩子？
它是否在暗示隐藏血脉，但不剧透？
```

---

## 1. 月度事件的定位

月度事件是人生模拟中最高频的叙事单元。

```text
1 个月 = 1 次自动事件
6 个月 = 1 次半年重大选择
216 个月 = 18 年人生
```

月度事件的作用不是每次都给大收益，而是：

```text
铺垫世界
表现成长
显化天命
推进主线
积累压力
埋选择钩子
埋玩法插曲钩子
埋阶段转化钩子
写入人生记忆
```

每月事件应有“小而明确”的意义。不要每个月都惊天动地，也不要每个月都“你读了一本书，悟性 +1”。

---

## 2. 事件分层

v0.2 将月度事件分为七层。

| 层级 | 名称 | 作用 |
|---|---|---|
| breath | 气息事件 | 世界呼吸、日常、轻描淡写 |
| growth | 成长事件 | 小幅属性/技能成长 |
| omen | 预兆事件 | 隐藏血脉、天命、随身物、系统前兆 |
| thread | 事件线推进 | 推进人生主线的具体事件线 |
| pressure | 压力事件 | 伤病、心结、家境、灾劫 |
| choice_seed | 半年选择种子 | 为下一次半年选择埋伏笔 |
| transition_seed | 阶段转化种子 | 为入道、系统候选、血脉半醒等转化埋伏笔 |

设计要求：

```text
breath / growth 占多数
omen / thread 让人生有线索
pressure 提供代价与张力
choice_seed / transition_seed 不能太多，否则节奏过载
```

---

## 3. 事件分类

v0.2 第一批事件分类：

```text
凡域日常
亲缘家事
体质伤病
读书学识
练武劳作
药理丹道
道观符箓
梦境神识
身世旧物
天命显化
隐藏预兆
灾劫因果
主线推进
玩法插曲钩子
阶段转化候选
系统前兆
```

这些分类不是给 UI 看的，而是给权重系统、叙事密度系统和后续事件编辑器用的。

---

## 4. 叙事密度问题

216 个月如果每月都写一件事，很容易变成流水账。

所以 v0.2 引入 **叙事密度控制器 NarrativeDensityController**。

它要控制四件事：

```text
1. 不让高强度事件过多。
2. 不让同类事件连续重复。
3. 不让主线过久不推进。
4. 不让玩法插曲候选过频。
```

### 4.1 六个月密度预算

每 6 个月为一个窗口，预算如下：

```text
densityBudgetPerSixMonths = 18
hardEventBudgetPerSixMonths = 2
```

每个事件有 `densityCost`：

| 事件层级 | 成本 |
|---|---:|
| breath | 1 |
| growth | 2 |
| omen | 3 |
| thread | 3 |
| pressure | 3 |
| choice_seed | 4 |
| transition_seed | 4 |

当 6 个月窗口已经很“满”时，系统会提高轻事件权重，降低重事件权重。

---

## 5. 月度事件抽取流程

每月事件抽取流程：

```text
1. 获取当前 ageMonth 与 phase
2. 获取 LifeSimulationState
3. 获取 NinePalaceEvaluation
4. 获取 DestinySelection / DestinyManifestationHooks
5. 获取 OriginFateDraft / HiddenOmen
6. 获取 activeStorylines / eventThreads
7. 获取 LifeStageState
8. 获取最近 6 个月 densityState
9. 筛选可用事件
10. 计算 finalWeight
11. Seeded RNG 加权抽取
12. 应用 visibleEffects / hiddenEffects
13. 推进 eventThreads / storylines
14. 写入日志
15. 更新 densityState
16. 若产生 hook，交给半年选择 / 插曲 / 阶段转化系统
```

禁止：

```text
Math.random()
LLM 决定事件 id
LLM 决定数值效果
事件直接泄露隐藏血脉真名
```

---

## 6. 权重公式

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

### 6.1 标签加成

| 匹配项 | 加成 |
|---|---:|
| lifeEventBiasTag 命中 | +8 |
| destinyHook 命中 | +10 |
| hiddenFateOmen 命中 | +10 |
| carriedItem 命中 | +8 |
| activeStoryline 命中 | +12 |
| developingThread 命中 | +16 |
| crisisThread 命中 | +24 |
| stageTransitionNeed 命中 | +14 |

### 6.2 九宫命盘派生加成

| 派生评分 | 加权事件 |
|---|---|
| talentScore 高 | 读书、旧书、天妒、系统、悟道 |
| vesselScore 高 | 练武、劳作、龙骨、肉身、狩猎 |
| stabilityScore 高 | 静修、道观、心性、清心、苟道 |
| destinyPressure 高 | 雷雨、病弱、天道注视、系统杂音 |
| rebellionScore 高 | 失败、逆命、嘲笑、吐纳受阻 |

---

## 7. 重复控制

### 7.1 同类事件惩罚

如果最近 6 个月已出现同分类事件：

```text
weight *= 0.55
```

如果最近 4 个月出现相同 tag：

```text
weight *= 0.7
```

### 7.2 同事件冷却

默认：

```text
sameEventCooldownDefaultMonths = 12
```

高强度事件：

```text
cooldownMonths = 18–36
```

### 7.3 一生触发上限

轻事件可触发多次，主线/预兆/压力事件通常一次。

---

## 8. 事件与人生主线

月度事件必须读取 `LifeStorylineState`。

事件可执行这些操作：

```text
advanceThread
increaseThreadTension
increaseThreadClarity
seedThread
resolveThread
failThread
addStorylineScore
```

例如：

```text
木剑轻鸣
→ broken_lineage 主线 +4
→ wooden_sword_thread progress +8
→ 前世剑魄 hiddenFateProgress +6
```

这使得事件不是孤立日志，而是主线系统的推进单位。

---

## 9. 事件与玩法插曲

月度事件不会直接强制玩家进入玩法。  
它只生成 hook：

```text
hook_interlude_rain_mountain
hook_wild_ginseng
hook_jade_board
hook_outer_battlefield_dream
```

半年重大选择系统再根据这些 hook 生成带玩法插曲的选择项。

例如月度事件：

```text
【雨夜后山低语】
hook_interlude_rain_mountain
```

半年选择可能出现：

```text
[险] 偷偷前往后山
→ STG 插曲：雨夜后山
```

---

## 10. 事件与阶段转化

月度事件可以输出：

```text
stageToken
transitionSignal
age18Hook
```

但不能直接把身份阶段改掉，除非它是专门的转化事件并满足规则。

例如：

```text
一息通达
→ stageToken: first_qi_sensed
→ transition_initiation_ready
```

后续阶段转化系统判断：

```text
求道苗子 → 半修行者
```

---

## 11. 隐藏信息泄露规则

月度事件可以修改隐藏血脉进度，但日志不能显示真实名称。

内部效果：

```json
{"hiddenFateTag":"ancient_thunder","delta":8}
```

可见日志：

```text
你感到雷声离自己更近了一些。
```

禁止：

```text
古雷真血进度 +8
丹圣遗骨觉醒 +5
系统共鸣体 +1
```

---

## 12. LLM 文案钩子

本系统只提供结构化事件和 `llmBrief`。

LLM 可以用于：

```text
把事件写成更自然的月度日志
根据角色名字/身世/当前阶段润色
生成阶段小结
```

LLM 不可以：

```text
改变事件 id
改变数值
改变 hiddenEffects
泄露隐藏真名
生成不符合世界观的现代内容
```

---

## 13. v0.2 第一批事件池

本包提供第一批 86 个事件，覆盖：

```text
婴幼年
童年
少年
青春
```

事件池重点不是数量，而是结构：

```text
每个事件都带年龄范围
每个事件都有 category / tier
多数事件绑定人生主线或事件线
关键事件能产出半年选择 hook / 插曲 hook / 阶段转化 hook
隐藏事件不泄露真名
```

---

## 14. 与下一系统的关系

本系统输出给：

```text
半年重大选择 v0.2
玩法插曲系统
阶段转化系统
隐藏血脉系统
18 岁觉醒系统
LLM 文案生成管线
```

也就是说，它是“人生模拟每月推进”的中枢。

---

## 15. MVP 实现边界

v0.2 MVP 必做：

```text
数据 Registry
事件条件筛选
权重计算
叙事密度控制
冷却和重复惩罚
事件效果应用
隐藏信息不泄露
事件日志
半年选择 hook 输出
主线/事件线推进
```

暂不做：

```text
LLM 实时生成文本
事件编辑器
复杂 NPC 关系网
完整所有 216 个月手写事件
自动剧情摘要大模型
多语言
```

LLM 只预留钩子，具体实现放到第 10 次《DeepSeek / LLM 叙事增强管线》。
