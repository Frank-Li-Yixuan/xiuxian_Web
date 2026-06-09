# 《半年重大选择、风险收益与隐藏分支 v0.2》

## 0. 文档定位

本文件是 `半年重大选择与成功判定系统 v0.1` 的升级版，适用于 0–18 岁人生模拟。

v0.1 已经解决：

```text
每 6 个月暂停
生成重大选择
选择有成功判定
结果能改变属性、伤病、心结、功德、业力、隐藏进度
```

v0.2 要解决更重要的问题：

```text
选择为什么出现？
为什么这个角色会看到这个选项？
风险和收益是否匹配？
隐藏选项如何解锁？
选择如何改变人生主线和事件线？
选择何时触发玩法插曲？
选择何时推动入道、系统候选、血脉半醒、成年觉醒？
```

核心目标：

> 半年选择不是“定期弹出一个三选一”，而是过去六个月事件和角色命盘共同逼出来的岔路。

---

## 1. 设计原则

### 1.1 选择必须来自“最近六个月”

每次半年选择要读取：

```text
最近 6 个月月度事件
最近 6 个月 hooks
活跃人生主线
事件线状态
当前人生阶段
当前身份阶段
当前伤病 / 心结 / 功德 / 业力
命盘九宫
灵根
天命
身世
隐藏预兆
随身物
```

选择不是凭空生成，而是对前面事件的回应。

例如最近六个月出现：

```text
雨夜后山低语
雷雨骨痛
后山白雾
```

半年选择才可能出现：

```text
[稳] 留在家中闭门读书
[险] 偷偷前往后山
[命] 迎着雷声打坐
```

如果最近没有后山、雷雨、异象相关事件，就不应该突然出现“夜探后山”。

---

### 1.2 选择分六类：稳、正、险、凶、禁、命

| 类型 | 含义 | 设计用途 |
|---|---|---|
| 稳 safe | 低风险小收益 | 不想冒险的保底选择 |
| 正 steady | 中低风险稳定成长 | 常规成长路线 |
| 险 risky | 高收益，有失败代价 | 普通冒险 |
| 凶 dangerous | 高风险高收益 | 可能触发伤病、心结、业力 |
| 禁 forbidden | 禁忌/魔念/借寿/违逆常理 | 大收益大代价，可能走歪路 |
| 命 destiny | 与天命、隐藏血脉、随身物、系统共鸣强相关 | 角色专属路线，最有爽点 |

一场半年选择不一定六类全出现。推荐：

```text
普通半年选择：稳 + 正 + 险
主线节点：稳 + 正 + 险 + 命
危机节点：稳 + 险 + 凶 + 命
禁忌节点：正 + 险 + 禁 + 命
```

---

### 1.3 隐藏选项必须有来源

隐藏选项不能只是“气运高就出神选项”。它必须来自至少一个来源：

```text
天命
隐藏血脉/前世/系统共鸣
随身物
人生主线 fated/dominant
事件线 crisis/resolution
九宫命盘极端组合
高灵感/气运/心性
过去事件 hook
```

示例：

```text
【木剑轻鸣】事件线 developing
+ 残破木剑亲和 >= 50
+ 前世剑魄隐藏预兆 >= 命中异动
→ 半年选择出现隐藏选项：
[命] 握住木剑，顺着梦中剑势斩出第一剑
```

---

### 1.4 失败也要有故事

失败不应该只是：

```text
精 -2
```

失败应按风险类型产生叙事后果：

```text
伤病
心结
家境损失
亲缘改变
业力
心魔
隐藏进度扭曲
事件线 tension 升高
玩法插曲失败回响
```

对于【废灵逆命】【百折不摧】这类天命，失败还可能是正向资源。

---

### 1.5 玩家要能预判风险，但不能看到精确公式

UI 不显示：

```text
成功率 63.42%
```

显示：

```text
胜算颇高
可堪一试
吉凶参半
凶险
九死一生
天机难测
```

玩家能基于属性、标签、文案判断，但不会变成纯数学优化。

---

## 2. 半年选择生成流程

```text
收集过去 6 个月 LifeWindow
  ↓
计算选择主题：主线推进 / 危机 / 修行 / 亲缘 / 隐藏预兆 / 阶段转化
  ↓
筛选可用 MajorChoiceEventDefinition
  ↓
按主线、事件线、年龄、身份阶段、命盘计算权重
  ↓
生成 3–4 个常规选项
  ↓
检测隐藏选项来源
  ↓
若符合条件，追加或替换一个命/禁/隐藏选项
  ↓
计算每个选项的风险提示
  ↓
生成 PendingMajorChoiceState
```

---

## 3. 选择主题

v0.2 定义八种选择主题：

| 主题 | 来源 | 说明 |
|---|---|---|
| growth | 成长 | 读书、练武、药理、吐纳 |
| relationship | 亲缘/人际 | 家人、村邻、师长、贵人 |
| omen | 预兆 | 雷雨、梦境、旧物、系统杂音 |
| crisis | 危机 | 山贼、妖兽、病灾、虫潮 |
| temptation | 诱惑/禁忌 | 魔念、借寿、偷盗、禁书 |
| trial | 试炼 | 道观试阵、问心、飞剑异动 |
| transition | 阶段转化 | 入道节点、系统候选、血脉半醒 |
| interlude | 玩法插曲候选 | STG、割草、DBG、自走棋 |

每次半年选择可以有一个 primaryTheme 和若干 secondaryThemes。

---

## 4. 选择成功判定

### 4.1 总公式

```text
score =
  d100
  + primaryStatScore
  + supportStatScore
  + lifeSkillScore
  + palaceScoreModifier
  + destinyModifier
  + spiritualRootModifier
  + originModifier
  + hiddenOmenModifier
  + carriedItemModifier
  + recentEventModifier
  + meritKarmaModifier
  - difficulty
  - riskPenalty
  - woundPenalty
  - heartKnotPenalty
  - heartDemonPenalty
```

### 4.2 结果分层

| 分数 | 结果 |
|---:|---|
| < 30 | 大失败 |
| 30–44 | 失败 |
| 45–64 | 勉强成功 |
| 65–84 | 成功 |
| 85–99 | 大成功 |
| ≥100 | 极成 |
| ≥100 + hiddenCondition | 隐藏成功 |

### 4.3 风险提示文案

| 估算胜算 | UI 文案 |
|---:|---|
| ≥ 85% | 十拿九稳 |
| 70–84% | 胜算颇高 |
| 55–69% | 可堪一试 |
| 40–54% | 吉凶参半 |
| 25–39% | 凶险 |
| < 25% | 九死一生 |
| 无法估算 | 天机难测 |

“天机难测”用于：

```text
隐藏命
禁忌
系统前兆
心魔
被封印血脉
```

---

## 5. 隐藏分支类型

| 类型 | 说明 |
|---|---|
| hiddenFateBranch | 隐藏血脉/前世/系统共鸣推动 |
| destinyBranch | 天命专属选择 |
| itemBranch | 随身物相关选择 |
| storylineBranch | 人生主线 fated/dominant 后出现 |
| interludeBranch | 触发玩法插曲 |
| transitionBranch | 身份阶段转化 |
| forbiddenBranch | 禁忌路线 |
| redemptionBranch | 功德/救赎路线 |
| karmicBranch | 业力/仇怨/宿债路线 |

---

## 6. 选择对人生主线的影响

选择结果可以：

```text
storylineScore +/-
threadProgress +/-
threadTension +/-
threadClarity +/-
activateThread
resolveThread
failThread
triggerCrisis
generateAge18Hook
```

例如：

```text
山村灾劫线 crisis
选择“独自守村口”
成功：
  山村灾劫线 +12
  功德 +8
  武艺 +4
  age18Hook: protected_home
失败：
  伤病 +1
  心结：守护失败
  山村灾劫线 tension +15
  业力/愧疚分支可能开启
```

---

## 7. 与玩法插曲系统的关系

选择可以携带 `interludeCandidate`：

```ts
option.interludeCandidate = {
  interludeId: "interlude_rain_backhill_stg",
  mode: "stg",
  optional: true,
  autoResolveAllowed: true
}
```

玩家点击后：

```text
显示插曲简报
  → 手动挑战 / 自动推演 / 返回重选
```

手动挑战成功上限更高。自动推演只能达到 success，不能触发 hiddenSuccess。

---

## 8. 与阶段转化系统的关系

选择可以生成：

```text
transitionTokens
initiationNodeProgress
identityStageScore
```

例如：

```text
选择“迎着雷声打坐”
成功：
  stageToken: first_qi_sensed
  systemResonance +8
  initiationReadiness +6
```

阶段转化系统再判断：

```text
凡人孩童 → 异象之子
求道苗子 → 半修行者
入道候选 → 入道者
```

---

## 9. UI 要求

半年选择 UI 需要展示：

```text
事件标题
事件描述
过去 6 个月相关事件摘要
当前主线/事件线提示
选项列表
每个选项的风险标签：稳/正/险/凶/禁/命
风险提示：胜算颇高/吉凶参半/天机难测等
可见收益方向
可能代价方向
是否会触发玩法插曲
是否需要随身物/天命/隐藏预兆
```

禁止显示：

```text
隐藏血脉真实名称
精确隐藏进度
精确成功率
精确公式
```

---

## 10. v0.2 MVP 内容量

建议先实现：

```text
选择事件：40–50 个
隐藏分支规则：20–30 个
interlude 选项：8–12 个
transition 选项：8–12 个
禁忌选项：8–10 个
命格专属选项：20 个左右
```

本包数据提供了第一批 24 个重大选择事件，用作 v0.2 MVP 起点。
