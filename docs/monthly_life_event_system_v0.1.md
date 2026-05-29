# 《0–18 岁人生模拟月度事件系统 v0.1》

## 0. 文档定位

本文件定义“转生开局 · 十八年人生模拟”中的**月度自动事件系统**。

它承接：

1. 《开局属性与灵根随机生成器 v0.1》
2. 《天命词条品质、互斥与重 Roll 系统 v0.1》
3. 《隐藏血脉、身世与随身物系统 v0.1》

并向后输出给：

4. 《半年重大选择与成功判定系统 v0.1》
5. 《18 岁系统觉醒与域外战场开局转化 v0.1》

本系统负责：

```text
从 0 岁到 18 岁，共 216 个月；
每个月自动推进 1 个事件；
改变精、气、神、生活技能、功德、业力、伤病、心结、隐藏血脉进度、随身物亲和等；
每 6 个月暂停一次，交给“半年重大选择系统”让玩家做选择；
18 岁时把累计的人生状态交给系统觉醒结算。
```

本系统不是完整人生经营游戏，而是“开局命运推演器”的主体。它要让玩家感觉角色不是一组静态词条，而是真的经历了十八年。

---

## 1. 设计目标

### 1.1 玩家体验目标

玩家完成角色创建后，不是立刻进入洞府，也不是立刻战斗，而是进入：

```text
十八年人生模拟
```

目标是让玩家产生这些感受：

```text
我出生时有异象。
我的灵根和命格在童年不断显露。
我的隐藏血脉不是直接告诉我的，而是通过事件慢慢露出端倪。
我每半年的重大选择会改变人生方向。
我到 18 岁时不是白板，而是带着伤病、随身物、心结、功德、业力、血脉线索进入域外战场。
```

### 1.2 系统目标

1. **自动推进**：月度事件大多自动发生，不让玩家每月都操作。
2. **可解释随机**：事件不是平均随机，而是受灵根、天命、身世、隐藏血脉、属性状态影响。
3. **长期记录**：月度日志要可回看，形成角色前史。
4. **服务半年选择**：某些月度事件会埋下半年重大选择的隐藏选项或特殊分支。
5. **服务 18 岁结算**：月度事件积累的状态会影响第一场域外战场与洞府开启。
6. **可复现**：必须使用 Seeded RNG，同 seed 同输入同结果。
7. **可调参**：事件权重、效果强度、重复惩罚、冷却都数据化。

---

## 2. 生命周期总览

```text
CharacterCreationDraft
  ↓ 确认此生
LifeSimulationState 初始化
  ↓
Month 0
  - 应用阶段基础成长
  - 抽取月度事件
  - 应用事件效果
  - 写入日志
  - 检查是否到半年重大选择
  ↓
Month 1...
  ↓
每 6 个月
  - 暂停自动推进
  - 交给 MajorChoiceSystem
  - 玩家选择
  - 应用选择结果
  - 继续月度推进
  ↓
Month 216
  - 停止人生模拟
  - 进入 Age18AwakeningResolver
```

---

## 3. 年龄阶段

### 3.1 阶段划分

| 阶段 | 年龄 | 月份 | 主题 |
|---|---:|---:|---|
| 婴幼年 | 0–3 岁 | 0–47 | 先天异象、家庭、体质、命火 |
| 童年 | 4–8 岁 | 48–107 | 性格、读书、玩耍、采药、早期机缘 |
| 少年 | 9–13 岁 | 108–167 | 灵根显现、身世线索、第一次冲突 |
| 青春 | 14–17 岁 | 168–215 | 流派成形、命格显化、系统前兆 |
| 觉醒 | 18 岁 | 216 | 系统降临，域外战场征召 |

阶段数据见：

```text
data/life_sim/phase_definitions.v0.1.json
```

### 3.2 阶段基础成长

每月先应用少量基础成长，再抽事件：

```text
婴幼年：精 +0.18，气 +0.12，神 +0.14
童年：精 +0.22，气 +0.16，神 +0.18
少年：精 +0.25，气 +0.22，神 +0.22
青春：精 +0.28，气 +0.28，神 +0.28
```

基础成长会被资质修正：

```text
精成长 = phaseBaseJing * (0.65 + 根骨 / 180)
气成长 = phaseBaseQi * (0.65 + 根骨 / 260 + 灵根气亲和 / 120)
神成长 = phaseBaseShen * (0.65 + 悟性 / 260 + 灵感 / 220)
```

事件和半年选择仍是主要差异来源，基础成长只保证“人会自然长大”。

---

## 4. 月度事件分类

事件分类见：

```text
data/life_sim/monthly_event_categories.v0.1.json
```

核心分类：

| 分类 | 用途 |
|---|---|
| 出生异象 | 先天灵根、隐藏血脉、命格的早期表现 |
| 家庭亲缘 | 父母、亲族、家境、亲缘、随身物来源 |
| 体质伤病 | 病弱、受伤、早熟、命火、寿元 |
| 读书学识 | 学识、悟性、见识、符箓和功法理解 |
| 练武劳作 | 精、根骨、武艺、体魄、战斗前置 |
| 药理炼丹 | 药理、丹毒、炼丹线索、随身物药炉 |
| 灵根异动 | 五行灵根、异灵根、隐灵根进度 |
| 梦境神识 | 神、灵感、太阴、魂修、前世线索 |
| 人际名声 | 村缘、师缘、善缘、冲突、名声 |
| 身世线索 | 祖传物、前世、家族遗留 |
| 隐藏命异动 | 隐藏血脉、前世残魂、系统共鸣进度 |
| 天命触发 | 天命/劫命让事件变形 |
| 灾祸劫数 | 伤病、心结、业力、灾星、兵劫 |
| 功德业力 | 救人、杀伐、因果、天道响应 |
| 系统前兆 | 18 岁系统觉醒和域外战场征召前兆 |

---

## 5. 事件抽取算法

### 5.1 输入

每个月抽事件时，需要输入：

```ts
LifeSimulationState
OpeningInnateDraft.tags
DestinySelectionState
OriginFateDraft
LifeEventHistory
SeededRng
```

### 5.2 事件候选过滤

事件必须满足：

```text
ageRange 包含当前月份
conditions 满足
未在 cooldown 内
没有超过 maxPerLife
```

如果候选过少，允许加入 fallback 事件：

```text
普通成长事件
家庭日常事件
静坐/读书/劳作事件
```

### 5.3 权重公式

```text
finalWeight =
  (baseWeight + tagBonus + stateBonus)
  × phaseMultiplier
  × repeatPenalty
  × cooldownMultiplier
```

其中：

```text
tagBonus 来自灵根、天命、出身、隐藏命、随身物标签。
stateBonus 来自当前状态，如伤病、心魔、功德、业力、隐藏进度。
repeatPenalty 避免同类事件重复刷屏。
cooldownMultiplier 在冷却期内为 0。
```

### 5.4 结果分层

部分事件可以根据 outcome roll 放大或减弱结果。

```text
判定值 =
1d100
+ 气运 × 0.08
+ 灵感 × 0.08
+ 心性 × 0.05
+ 命格修正
- 事件难度
```

| 判定 | 结果 |
|---:|---|
| <15 | 不顺/小灾 |
| 15–69 | 普通 |
| 70–91 | 良好 |
| ≥92 | 大机缘 |

---

## 6. LifeSimulationState

建议状态：

```ts
interface LifeSimulationState {
  profileId: string;
  characterId: string;
  seed: string;

  ageMonths: number; // 0–216
  phaseId: LifePhaseId;

  core: {
    jing: number;
    qi: number;
    shen: number;
  };

  aptitude: {
    rootBone: number;
    comprehension: number;
    inspiration: number;
    fortune: number;
    heart: number;
    lifespan: number;
  };

  lifeSkills: {
    study: number;
    martial: number;
    alchemy: number;
    craft: number;
    social: number;
    stealth: number;
    ritual: number;
    survival: number;
  };

  karma: number;
  merit: number;
  heartDemon: number;

  wounds: LifeWoundState[];
  heartKnots: LifeHeartKnotState[];
  family: FamilyState;
  relationships: LifeRelationshipState[];

  hiddenFateProgress: Record<string, number>;
  carriedItemAffinity: Record<string, number>;

  flags: Record<string, number | boolean | string>;

  monthlyLogs: MonthlyLifeLogEntry[];
  pendingMajorChoice?: PendingMajorChoiceRef;
}
```

---

## 7. 事件效果类型

月度事件可以产生这些效果：

| 效果 | 说明 |
|---|---|
| core | 改变精气神 |
| aptitudeSoft | 小幅改变资质，不宜频繁大改 |
| lifeSkill | 改变学识、武艺、药理等生活技能 |
| merit | 增加功德 |
| karma | 增加业力 |
| state | 添加伤病、心结、天道注视等状态 |
| hiddenFateProgress | 增加某隐藏命进度 |
| itemAffinity | 增加随身物亲和 |
| destinyProgress | 推进特定天命内部层数 |
| majorChoiceHook | 埋下半年选择分支 |
| age18Hook | 埋下 18 岁觉醒修正 |
| modeBias | 后续多模式投射标签 |
| dongfuHook | 洞府开启时的模块线索 |

### 7.1 注意事项

1. 月度事件不应直接揭示隐藏命真名。
2. 月度事件不应直接给完整法宝，只能给“线索/亲和/随身物变化”。
3. 月度事件可以造成伤病，但应可在后续人生选择或洞府中修复。
4. 月度事件可以提高业力，但不要强迫玩家变坏；应体现“选择/结果/因果”的链条。

---

## 8. 月度日志

### 8.1 日志目标

日志不是调试输出，而是角色前史。

每条日志应该像：

```text
七岁六月 · 雨夜异象
暴雨夜，你听见后山传来低语。父母劝你不要出门。
结果：神 +1，灵感 +1。
隐约预兆：你感到某种旧日因果被轻轻拨动。
```

### 8.2 隐藏效果显示规则

禁止显示：

```text
古雷真血进度 +8
系统共鸣体 +5
```

允许显示：

```text
你体内某种沉睡之物似乎动了一下。
你对雷雨的感应更敏锐了。
某件旧物似乎与你更亲近。
```

---

## 9. 与半年重大选择的关系

每 6 个月，月度推进暂停一次。

触发点：

```text
ageMonths > 0 && ageMonths % 6 === 0
```

月度事件可以提供 `majorChoiceHook`：

```text
bandit_threat
first_kill
forbidden_page
wild_ginseng_choice
family_misfortune
meridian_recovery
```

半年选择系统会读取过去 6 个月的 hooks，生成更贴身的选择。

例如：

```text
过去 6 个月触发了【山贼烟尘】
半年选择中可能出现：
- 练武护家
- 带家人避祸
- 报官求援
- 偷偷跟踪山贼
```

---

## 10. 与 18 岁系统觉醒的关系

月度事件可以埋 `age18Hook`：

```text
outer_battlefield_omen
system_static
tribulation_attention
system_countdown
```

18 岁结算读取：

```text
LifeSimulationState.monthlyLogs
hiddenFateProgress
carriedItemAffinity
wounds
heartKnots
karma
merit
age18Hooks
```

然后生成：

```text
Age18AwakeningInput
```

供下一个系统转化为：

```text
域外战场 RunConfig
系统家园/洞府开局
长期因果标签
```

---

## 11. 事件池 MVP 规模

本包提供 82 个 MVP 月度事件。开发期足够跑完整 18 年，但正式体验建议扩展到：

```text
月度事件：200+
半年重大选择：60+
18 岁觉醒事件：20+
```

MVP 验收目标：

```text
同一个角色 18 年日志不应大量重复。
不同灵根/天命/身世的事件倾向应明显不同。
玩家能从日志中感受到“这个人这一生与众不同”。
```

---

## 12. UI 表现建议

人生模拟页面不在本包实现，但月度事件要求 UI 支持：

```text
时间轴
月度日志流
当前年龄
当前阶段
精气神和六维变化
隐藏预兆提示
每半年暂停选择
加速/暂停/继续
```

月度自动推进时建议：

```text
普通事件：日志淡入
机缘事件：玉光/金光闪动
灾祸事件：暗红波纹
隐藏命异动：命盘轻微震动，不显示真名
系统前兆：画面短暂失真或天外杂音
```

---

## 13. 不进入本系统的内容

本系统不负责：

```text
天命主副劫命的抽取
角色创建 UI 的完整布局
半年重大选择的完整数据和成功判定
18 岁系统觉醒结算
域外战场战斗
洞府系统
```

但本系统必须提供它们需要的状态、日志、标签和 hooks。
