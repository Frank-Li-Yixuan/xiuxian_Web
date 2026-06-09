# SIM-REDESIGN 总集成与 Codex 实施路线 v0.1

## 1. 目的

本路线把前 11 套设计收束成可执行的工程迁移计划：

1. 凡域边地与修仙世界观底座
2. 九宫命盘、三才阴阳与属性因果
3. 天命成立条件、互斥共鸣与变异命格
4. 人生主线与事件线系统
5. 半年重大选择中的玩法插曲系统
6. 人生阶段转化、入道节点与节奏控制
7. 月度事件池、权重与叙事密度 v0.2
8. 半年重大选择、风险收益与隐藏分支 v0.2
9. 隐藏血脉、身世盲盒与随身物叙事链 v0.2
10. DeepSeek / LLM 叙事增强管线
11. 18 年人生模拟首版可玩体验规格

总集成的目标是：让现有项目从“功能模块堆叠”变成一条可玩的、可复现的、可测试的新游戏主链。

```text
开始页
  → 新建 / 继续存档
  → 创建角色：命盘推演
  → 18 年人生模拟
  → 成年节点 / 入道节点 / 系统预兆
  → 首个试炼或洞府开启
```

## 2. 当前原则

### 2.1 UI 原则

正式路线不再使用 generated PNG 控件方案。按钮、卡牌、面板、弹窗、存档卡、命格卡全部用 DOM 组件。图片可用于：

```text
背景
图标
人物剪影
法宝/丹药/资源图标
灵根光环
命盘纹理
VFX 贴图
```

### 2.2 规则原则

规则系统必须本地可复现：

```text
Seeded RNG 决定结果
规则引擎决定属性变化、事件、成功失败、隐藏进度
LLM 只负责文本表达
```

### 2.3 隐藏信息原则

任何未揭示的隐藏命真名不得出现在：

```text
创建角色 DOM
人生月度日志
半年选择文案
玩法插曲结果
LLM request
截图
测试 snapshot
```

UI 只显示安全预兆：

```text
雷云深处的战鼓
陌生火候
木剑低鸣
耳边断续杂音
月下冰凉影子
```

### 2.4 战斗原则

当前域外战场 STG 不应在本路线前半段继续重做。先完成：

```text
创建角色
人生模拟
成年节点
Profile / AgeResolution / RunConfig 投射
```

之后再执行 STG-R 系列。

## 3. 工程主线

### Phase A：总审计

先审计当前项目是否已完成 OAG / DT / HFO / CCUI2 / BAS。输出缺口清单。

### Phase B：数据注册表统一

把 v0.1 / v0.2 数据统一接入 registry：

```text
world
nine_palace
destiny_v2
origin_fate_v02
life_storylines
life_interludes
life_stage
monthly_events_v02
major_choices_v02
llm_narrative
life_playable
```

### Phase C：创建角色生成链升级

当前创建角色页必须从以下链路生成：

```text
OpeningInnateDraft
  → NinePalaceEvaluation
  → SpiritualRootResult
  → DestinyV2Evaluation / Mutation
  → OriginFateNarrativeDraft
  → CharacterCreationViewModel
```

### Phase D：人生模拟核心

把人生模拟从旧版 monthly event engine 升级为：

```text
LifeStorylineState
LifeStageState
LifeInterludeBudget
MonthlyEventV02
MajorChoiceV02
OriginFateNarrativeState
NarrativeService
```

### Phase E：首版可玩 UI

用 LifeSimulationPlayableState 组织 UI，不直接把底层状态乱传组件。

### Phase F：成年节点与试炼桥接

本阶段不强制 18 岁域外战场唯一结果，而是输出 AdultNodeResolution：

```text
system_trial_candidate
mortal_initiation_candidate
calamity_resolution_candidate
bloodline_inner_trial_candidate
seclusion_delay_candidate
```

v0.1 可先 fallback 到域外战场第一战，但数据结构必须支持后续多分支。

### Phase G：E2E / RC

完整验证：

```text
主菜单 → 存档 → 创建角色 → 人生模拟 → 成年节点 → 后续试炼/洞府
```

## 4. 不做事项

本次总集成不做：

```text
新的 3D combat
完整虫族入侵
完整 DBG 战斗
完整天地棋局
完整宗门经营
完整联网
真实 DeepSeek API 强依赖
```

真实 DeepSeek 接入应晚于本地 fallback 成功。

## 5. 关键成功标准

实现后玩家应能感受到：

1. 我 Roll 的不是随机数，而是一段命盘。
2. 我的天命和属性互相解释得通。
3. 我的人生事件和身世、随身物、灵根、天命有关。
4. 每半年选择是在回应过去半年发生的事。
5. 玩法插曲是人生关键节点，不是随机小游戏。
6. 隐藏血脉有悬念，且不会过早剧透。
7. 模拟结束能自然进入成年节点 / 试炼 / 洞府。
