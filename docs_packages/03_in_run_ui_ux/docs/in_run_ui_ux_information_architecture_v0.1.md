# 《局内 UI/UX 信息架构 v0.1》

项目：双人雷霆战机修仙版  
版本：v0.1  
目标：为第一版可玩 Demo 建立局内 HUD、暂停选择、雷劫、救援、Boss、结算前提示等完整信息架构。  
适用范围：PC 端 16:9 宽屏强制垂直卷轴 STG，支持本地双人，预留在线双人。

---

## 0. 本文档的定位

本文件不是美术风格稿，而是 **可实现的信息架构文档**。

它解决以下问题：

1. 局内哪些信息必须常驻，哪些只在事件中显示。
2. 灵气经验与修为如何在 UI 中彻底分离。
3. 双人模式下如何同时显示两名玩家的生命、真元、法术、丹药、法宝、修为、救援状态。
4. 时停顿悟、局内雷劫、Boss 战、精血渡魂这些高压事件如何显示而不干扰 STG 读弹。
5. Codex 实现时，每个 UI 组件需要读取什么 ViewState。
6. v0.1 的 UI 如何在不依赖外部资源的前提下做出修仙质感。

---

## 1. UI 设计总原则

### 1.1 STG 可读性优先

局内 UI 的第一原则是 **不挡子弹，不挡判定点，不抢走玩家对弹幕的注意力**。

因此：

- 中央战斗区不放常驻大面板。
- 高优先级警告必须短、亮、明确。
- 任何全屏特效必须有透明度上限。
- Boss 血条、雷劫警告、顿悟入口可以居中，但不能覆盖玩家当前判定区域。
- 技能图标、丹药图标、槽位信息尽量放在左右两侧面板。
- 局内弱提示尽量使用边缘提示、浮字、图标闪烁，而不是弹窗。

### 1.2 双轨成长必须视觉分离

本项目有两套局内成长：

| 成长线 | 游戏含义 | UI 语言 | 触发 |
|---|---|---|---|
| 灵气经验 | 法的广度与深度，Build 进度 | 青碧色、灵气流、卷轴、顿悟 | 时停三选一 |
| 修为 | 生命层级与境界，突破进度 | 金白色、丹田、周天、雷纹 | 瓶颈、雷劫、突破 |

禁止：

- 把灵气经验条命名为“修为”。
- 把顿悟升级提示写成“境界提升”。
- 把修为突破提示写成“获得经验”。
- 用相同颜色/相同图标/相同条形样式表现两者。

### 1.3 先服务操作，再服务设定

UI 文案可以修仙化，但交互必须清楚：

- `灵气将满` 比 `道心将启` 更清楚。
- `修为瓶颈：即将雷劫` 比 `天机已至` 更清楚。
- `真元不足` 比 `气海枯竭` 更容易被玩家立刻理解。

推荐做法：

```text
主提示：真元不足
副文本：气海尚未充盈
```

第一版优先保证功能清晰，后续再逐步提高文案意境。

### 1.4 常驻信息少，事件信息强

局内战斗极高压，不应让玩家同时读 30 个数字。  
v0.1 常驻信息只保留关键状态：

- 生命/精。
- 真元/气。
- 灵气经验条。
- 修为条。
- 法术冷却。
- 丹药消化。
- 队友生死。
- Boss 血量。
- 雷劫预警。

非关键数据如暴击率、穿透、悟性、气运、根骨、功法细节，默认不常驻。它们放在：

- 顿悟面板详情。
- 暂停详情。
- 鼠标/键盘焦点 Tooltip，后续做。
- 结算面板。

---

## 2. 目标分辨率与布局网格

### 2.1 标准分辨率

v0.1 以 1920 × 1080 为设计基准。  
需兼容：

- 1600 × 900
- 1920 × 1080
- 2560 × 1440
- 3440 × 1440，后续超宽适配

### 2.2 三栏结构

```text
┌──────────────────────────────────────────────────────────────┐
│ 左侧道法区 360px │ 中央战斗区 1080px │ 右侧外物区 360px │
└──────────────────────────────────────────────────────────────┘
```

| 区域 | 建议宽度 | 作用 |
|---|---:|---|
| 左侧道法区 | 320–360px | 生命、真元、法术、灵气经验、局内功法/天赋 |
| 中央战斗区 | 1000–1120px | 玩家、弹幕、怪物、Boss、掉落、雷劫预警 |
| 右侧外物区 | 320–360px | 丹药、本命法宝、灵宝、修为/境界、队友状态 |

重要：  
战斗区宽度不等于传统手机竖屏宽度。玩家需要更大的横向空间，因此中央战斗区建议在 1080px 左右，而不是 720px。

### 2.3 安全区

中央战斗区内部继续划分：

| 区域 | 说明 |
|---|---|
| 上 15% | Boss 入场、远程怪驻留、警告线 |
| 中 55% | 主要弹幕交错区 |
| 下 30% | 玩家活动高频区 |

任何居中 UI 不能持续占用下 30%。  
雷劫、顿悟、Boss 警告允许短时覆盖中上区域，但必须在玩家可操作时尽快淡出。

---

## 3. 局内信息优先级

### 3.1 信息优先级表

| 等级 | 信息 | 显示方式 | 可否遮挡战斗 |
|---|---|---|---|
| P0 | 致命预警、雷劫落点、玩家判定点、敌弹 | 战斗层直接绘制 | 不可遮挡 |
| P1 | 生命、真元、法术可用、丹药消化、队友倒地 | 常驻 HUD + 强提示 | 不可遮挡核心区 |
| P2 | 灵气经验、修为进度、Boss 血量、阶段进度 | 常驻/半常驻 HUD | 不能覆盖判定点 |
| P3 | 奖励预览、功法羁绊、属性变化 | 事件面板/Tooltip | 可暂停时显示 |
| P4 | 叙事、意境文案、装饰纹样 | 辅助层 | 必须可关闭/淡化 |

### 3.2 颜色语义

| 语义 | 颜色建议 | 用途 |
|---|---|---|
| 玩家 1 | 青蓝 `#22D3EE` | P1 边框、技能高亮 |
| 玩家 2 | 紫红 `#D946EF` | P2 边框、技能高亮 |
| 生命/精 | 赤红 `#F87171` | HP |
| 真元/气 | 天青 `#38BDF8` | 法术资源 |
| 灵气经验 | 翠青 `#34D399` | 顿悟进度 |
| 修为/境界 | 金白 `#FDE68A` | 层级/突破 |
| 雷劫 | 暗红 + 紫电 `#EF4444` / `#A855F7` | 雷劫预警 |
| Boss | 敌方主题色 | Boss 血条 |
| 可用 | 高亮流光 | 技能/丹药 Ready |
| 不可用 | 降饱和/灰 | CD、真元不足、空槽 |

---

## 4. 常驻 HUD 总览

### 4.1 单人布局

```text
┌左侧道法区──────────────────────────────┐ ┌中央战斗区────────────────────────────┐ ┌右侧外物区──────────────────────────────┐
│ 玩家核心状态                            │ │ Boss 血条 / 阶段提示                 │ │ 境界与修为                              │
│ 生命/精                                 │ │                                      │ │ 本命法宝：外带 + 局内                   │
│ 真元/气                                 │ │             战斗画面                 │ │ 灵宝 4 格                               │
│ 灵气经验：顿悟进度                       │ │                                      │ │ 丹药 3 格 + 消化                        │
│ 法术 4 格 J/K/L/I                       │ │ 玩家判定点、弹幕、怪物、掉落          │ │ 队友状态，双人时显示                    │
│ 功法/天赋摘要                           │ │                                      │ │ 阶段目标/小阶段                         │
└────────────────────────────────────────┘ └──────────────────────────────────────┘ └────────────────────────────────────────┘
```

### 4.2 双人布局

双人时避免重复两套庞大 HUD。  
建议：

- 左侧显示 P1 主要战斗资源。
- 右侧显示 P2 主要战斗资源。
- 团队共享信息放顶部或底部中线。
- 双人共享的灵气经验条放顶部中央。
- Boss 血条在灵气经验条下方或替换顶部中央。

```text
顶部中央：阶段名 / 团队灵气经验 / Boss 血条
左侧：P1 生命、真元、法术、功法摘要
右侧：P2 生命、真元、丹药、法宝/灵宝，或按玩家镜像显示
底部中央：短提示、连携提示、救援提示、雷劫倒计时
```

v0.1 推荐两种模式：

1. **完整模式**：左右两侧各显示一名玩家完整 HUD。
2. **紧凑模式**：左侧显示 P1，右侧显示 P2；法宝/灵宝折叠为小图标，展开详情放暂停页。

---

## 5. 组件 1：玩家核心状态面板 PlayerCorePanel

### 5.1 位置

| 模式 | P1 | P2 |
|---|---|---|
| 单人 | 左侧道法区顶部 | 不显示 |
| 双人完整 | 左侧顶部 | 右侧顶部 |
| 双人紧凑 | 左侧顶部 | 右侧顶部 |

### 5.2 信息

```text
玩家名 / 颜色标识
境界层级：练气二层
生命/精：HP 条
真元/气：Qi 条
神魂状态：肉身 / 神魂 / 重塑中
短状态：护盾、燃血、虚弱、清心
```

### 5.3 状态样式

| 状态 | 表现 |
|---|---|
| 正常 | 边框为玩家色，生命/真元平滑变化 |
| 低生命 | 生命条闪烁，边框短暂红脉冲 |
| 真元足够释放某法术 | 对应法术图标外圈流光 |
| 神魂出窍 | 面板半透明，生命条替换为“神魂” |
| 正在被救援 | 面板出现聚灵阵进度 |
| 倒计时复活 | 生命条以金色填充到复活阈值 |

### 5.4 ViewState

```ts
interface PlayerCorePanelViewState {
  playerId: "p1" | "p2";
  displayName: string;
  colorToken: "player1" | "player2";

  realmName: string;
  realmLayer: number;

  hp: number;
  maxHp: number;
  qi: number;
  maxQi: number;

  aliveState: "body" | "soul" | "reshaping" | "dead";

  activeStatusTags: StatusTagView[];
  lowHp: boolean;
  canBeRescued: boolean;
  rescueProgress?: number;
}
```

---

## 6. 组件 2：灵气经验条 TeamInsightBar

### 6.1 位置

顶部中央，Boss 未出现时常驻。  
Boss 出现时缩小为顶部左侧小条，Boss 血条获得主位置。

### 6.2 视觉语言

灵气经验条必须像“灵气汇聚”，而不是角色等级条。

推荐：

```text
[ 团队灵气 ]  ███████░░░  78%     下一次顿悟
```

样式：

- 颜色：翠青。
- 动效：灵气粒子从掉落物方向飞入条内。
- 满时：卷轴图标亮起，进入顿悟前可有 0.5s 的“灵光聚顶”提示。
- 文字：`灵气将满：即将顿悟`。

### 6.3 触发行为

当经验满：

1. 战斗进入 0.2s 子弹时间。
2. 弹幕冻结或显著减速。
3. 灵气条炸开成两道灵光，分别飞向 P1/P2 的顿悟面板。
4. 打开 InsightOverlay。

### 6.4 禁止事项

- 不显示“修为 +1”。
- 不显示“境界提升”。
- 不给玩家造成“我境界升级了”的错觉。

### 6.5 ViewState

```ts
interface TeamInsightBarViewState {
  visible: boolean;
  teamLevel: number;
  exp: number;
  expToNext: number;
  progress01: number;
  nextTriggerText: string; // "下一次顿悟"
  sharedFortuneReroll: number;
  isReadyToInsight: boolean;
}
```

---

## 7. 组件 3：个人修为条 CultivationBar

### 7.1 位置

右侧外物区顶部，和境界文字绑定。  
双人模式下每名玩家各有一个迷你修为条；完整模式可放在各自面板内。

### 7.2 视觉语言

修为条必须像“丹田周天运转”，不是经验条。

推荐：

```text
练气二层
修为 218 / 380
周天运转 +1.6/s
```

样式：

- 颜色：金白。
- 背景：圆形丹田/八卦环/周天旋转。
- 增长时：细微金色脉冲。
- 接近瓶颈：出现雷纹。
- 满时：不弹三选一，而是提示“境界瓶颈”。

### 7.3 瓶颈阶段提示

修为满后：

```text
境界瓶颈
练气九层 → 筑基
天象将变：准备渡劫
```

如果是小层突破：

```text
周天圆满
练气二层 → 练气三层
精 +6%，气 +5%
```

如果是大境界突破：

```text
天道感应
三九雷劫将在 8 秒后降临
```

### 7.4 ViewState

```ts
interface CultivationBarViewState {
  playerId: "p1" | "p2";
  realmName: string;
  layer: number;
  cultivation: number;
  cultivationToNext: number;
  progress01: number;
  regenPerSecond: number;
  bottleneck?: {
    type: "minor_layer" | "major_realm";
    targetRealmName?: string;
    tribulationIncoming: boolean;
    countdown?: number;
  };
}
```

---

## 8. 组件 4：法术栏 SpellBar

### 8.1 位置

左侧道法区中部，垂直排列 4 格。  
P1 默认使用 J/K/L/I。  
P2 在双人模式可显示 Num1/Num2/Num5/Num6 或自定义映射。

### 8.2 单格结构

```text
┌───────┐
│ 图标  │  五雷正法 Lv.2
│  J    │  CD 3.2s / 真元 45
└───────┘
```

### 8.3 状态

| 状态 | 表现 |
|---|---|
| Ready | 图标高亮，外圈流光 |
| Cooldown | 圆形遮罩逆时针消退，显示剩余秒数 |
| QiInsufficient | 图标可见但青光熄灭，显示“真元不足” |
| Empty | 卷轴空槽，显示“局内可顿悟获得” |
| Casting | 图标短暂放大，向战斗区发出符文线 |
| Empowered | 受燃血丹/功法加成时显示额外火纹或电纹 |

### 8.4 UX 规则

- 按键按下但真元不足：播放轻微“空响”，不弹大提示，只在图标上显示 `气不足` 0.5s。
- 按键按下但冷却中：图标脉冲，显示剩余时间。
- 法术造成连锁击杀时：在图标旁边显示 `连锁 x8`，持续 1s。
- 释放保命类法术时：可以短暂在玩家周围显示同色环，帮助队友知道你开了救援窗口。

### 8.5 ViewState

```ts
interface SpellSlotViewState {
  slotIndex: 0 | 1 | 2 | 3;
  keyLabel: string;
  spellId?: string;
  name?: string;
  level?: number;
  costQi?: number;
  cooldownRemaining?: number;
  cooldownTotal?: number;
  state: "empty" | "ready" | "cooldown" | "qi_insufficient" | "casting" | "disabled";
  element?: "metal" | "wood" | "water" | "fire" | "earth" | "thunder" | "void";
  comboCounter?: number;
}
```

---

## 9. 组件 5：丹药栏 PillBar / DigestionSlots

### 9.1 位置

右侧外物区中部，垂直排列 3 格。  
比法术栏小，但消化进度要明显。

### 9.2 单格结构

```text
┌───────┐
│ 鼎炉  │  回春丹
│  1    │  炼化中 7.2 / 12s
└───────┘
```

### 9.3 状态

| 状态 | 表现 |
|---|---|
| Ready | 鼎炉静置，图标可用 |
| Digesting | 鼎炉燃烧，进度条从下往上填充 |
| FinishedBuff | 药效残留图标进入状态栏 |
| Empty | 空鼎，显示“空” |
| Locked | 后续未解锁槽位，v0.1 暂不用 |
| SideEffect | 燃血虚弱等后遗症，用暗红边框 |

### 9.4 消化进度视觉

丹药不是瞬间血瓶，因此 UI 必须表达“正在炼化”。

推荐：

- 鼎炉火焰由弱到强。
- 进度条使用竖向填充，而不是普通水平条。
- 回春丹每次回血时，生命条出现绿色小段流入。
- 燃血丹生效时，普攻图标/本命法宝区域出现红色火脉。
- 清心丹生效时，负面状态图标被一道青光扫掉。

### 9.5 交互提示

当玩家生命低但回春丹可用：

```text
回春丹可炼化
提前服用，12秒持续恢复
```

当 Boss 雷劫预警且燃血丹可用：

```text
燃血丹可用
Boss 虚弱期前建议炼化
```

提示必须节制，不能每次都打扰。  
同类提示 20 秒内最多出现一次。

### 9.6 ViewState

```ts
interface PillSlotViewState {
  slotIndex: 0 | 1 | 2;
  keyLabel: string;
  pillId?: string;
  name?: string;
  state: "empty" | "ready" | "digesting" | "side_effect" | "disabled";
  remainingTime?: number;
  totalTime?: number;
  effectSummary?: string;
  warningRecommended?: boolean;
}
```

---

## 10. 组件 6：本命法宝与灵宝面板

### 10.1 位置

右侧外物区下部，丹药栏下方。

### 10.2 本命法宝显示

本命法宝有两个槽：

```text
本命法宝
[外] 青霜飞剑 ★★
[内] 紫阳葫芦 ★
```

区分：

- 外带本命法宝：稳定核心，用“本命”标识。
- 局内本命法宝：临时变异，用“机缘”标识。

### 10.3 灵宝显示

灵宝 4 格：

```text
灵宝
[外] 小周天剑阵
[外] 八卦玉佩
[内] 聚宝金蟾
[内] 空
```

每个灵宝用小图标 + 状态点：

| 类型 | 图标/形状建议 |
|---|---|
| 攻击 | 小剑 |
| 防御 | 玉佩/盾环 |
| 功能 | 金蟾/手掌 |
| 联机 | 同心锁/连线 |

### 10.4 可读性规则

法宝/灵宝信息很重要，但不应抢战斗注意力。  
默认只显示图标、星级、是否触发。  
详细词条放在暂停页或顿悟选择详情中。

### 10.5 ViewState

```ts
interface ArtifactPanelViewState {
  outer?: ArtifactSlotViewState;
  inner?: ArtifactSlotViewState;
}

interface SpiritTreasureRackViewState {
  slots: SpiritTreasureSlotViewState[]; // length 4
}

interface ArtifactSlotViewState {
  slotType: "outer" | "inner";
  itemId?: string;
  name?: string;
  star?: number;
  state: "empty" | "active" | "cooldown" | "empowered";
  procFlash?: boolean;
}

interface SpiritTreasureSlotViewState {
  slotIndex: 0 | 1 | 2 | 3;
  source: "outer" | "inner";
  itemId?: string;
  name?: string;
  role?: "offense" | "defense" | "utility" | "coop";
  state: "empty" | "active" | "cooldown" | "triggered";
  cooldownRemaining?: number;
}
```

---

## 11. 组件 7：Boss UI

### 11.1 位置

顶部中央，进入 Boss 战后主显示。

```text
青云劫灵
Phase 2 / 3：青云压顶
██████████░░░░░░  63%
```

### 11.2 内容

- Boss 名称。
- 当前阶段名。
- 血条。
- 阶段刻度。
- 大招预警。
- 破防/虚弱窗口倒计时。

### 11.3 阶段变化提示

当 Boss 切阶段：

```text
青云劫灵引动天雷
Phase 2：青云压顶
```

持续 1.5s，显示在顶部中部，不覆盖玩家。

### 11.4 大招预警

```text
雷劫乱流 3.0s
```

预警必须至少包含：

- 技能名。
- 倒计时。
- 落点/危险区域预览。
- 是否可清弹。

### 11.5 ViewState

```ts
interface BossHudViewState {
  visible: boolean;
  bossId?: string;
  name?: string;
  hp?: number;
  maxHp?: number;
  phaseIndex?: number;
  phaseCount?: number;
  phaseName?: string;
  currentWarning?: {
    text: string;
    remainingTime: number;
    severity: "medium" | "high" | "lethal";
  };
}
```

---

## 12. 组件 8：阶段进度 StageProgress

### 12.1 位置

顶部左/右边缘或中央上方小字，不应抢 Boss 血条位置。

```text
青云山 · 1-3 雾中邪修
距精英出现：18s
```

### 12.2 状态

| 状态 | 显示 |
|---|---|
| 小阶段开始 | 阶段名短暂居中 1s |
| 怪潮高压 | `妖潮压境` |
| 精英登场 | 精英名 + 红色警告 |
| Boss 前 | `青云雷劫将临` |
| 阶段结束 | 掉落/顿悟/奖励提示 |

### 12.3 ViewState

```ts
interface StageProgressViewState {
  stageName: string;
  segmentName: string;
  segmentIndex: number;
  segmentCount: number;
  timeRemaining?: number;
  nextEventText?: string;
  intensity: "low" | "medium" | "high" | "boss";
}
```

---

## 13. 组件 9：双人顿悟界面 InsightOverlay

### 13.1 触发

由 TeamInsightBar 满触发。  
全局时停，弹幕冻结或极慢。

### 13.2 布局

双人模式不能轮流弹窗，必须明牌并行：

```text
┌────────────────────── P1 顿悟 ──────────────────────┐ ┌────────────────────── P2 顿悟 ──────────────────────┐
│ [卷轴1] 五雷正法 +1                                  │ │ [卷轴1] 红莲业火                                     │
│ [卷轴2] 锐金诀                                       │ │ [卷轴2] 先天道胎                                     │
│ [卷轴3] 聚宝金蟾                                     │ │ [卷轴3] 燃血丹 x1                                    │
│                                                       │ │                                                       │
│ 选择：J / K / L                                       │ │ 选择：Num1 / Num2 / Num3                              │
└───────────────────────────────────────────────────────┘ └───────────────────────────────────────────────────────┘

公共气运：2     重Roll：R / Num0
```

### 13.3 单人模式

单人居中三选一：

```text
顿悟
[卷轴1] [卷轴2] [卷轴3]
公共气运：2
```

### 13.4 奖励卡信息层级

每张卷轴卡包含：

1. 名称。
2. 类型：法术/功法/天赋/体质/灵宝/法宝/丹药/修为助益。
3. 稀有度。
4. 一句话效果。
5. 对当前 Build 的关联提示。

示例：

```text
五雷正法 +1
法术升级 · 雷
连锁次数 +1，击杀雷暴半径 +15%
当前已装备：J 槽
```

修为类奖励必须标明：

```text
屏息凝神
修为助益
获得 +80 修为
不会触发顿悟等级变化
```

### 13.5 护法等待

先选完的玩家：

- 其半屏变暗。
- 玩家角色在战场中进入打坐/飞剑环绕的护法视觉。
- 半屏显示：

```text
已悟出大道
正在为道友护法……
```

不可催促弹窗，避免破坏协作氛围。  
可以允许轻量表情/快捷语音，后续做。

### 13.6 重 Roll

公共气运显示在底部中央。  
任何玩家点击/按键重 Roll 都消耗公共气运。  
重 Roll 前可短提示：

```text
将消耗团队气运 1 点
```

v0.1 可不做确认弹窗，防止操作慢。  
但必须要求长按 0.3s 或双击，避免误触。

### 13.7 ViewState

```ts
interface InsightOverlayViewState {
  visible: boolean;
  mode: "single" | "coop";
  sharedFortuneReroll: number;
  players: InsightPlayerPanelViewState[];
}

interface InsightPlayerPanelViewState {
  playerId: "p1" | "p2";
  selected: boolean;
  guardianState: boolean;
  options: InsightOptionCardViewState[];
}

interface InsightOptionCardViewState {
  optionId: string;
  rewardType:
    | "spell_new"
    | "spell_upgrade"
    | "technique"
    | "talent"
    | "constitution"
    | "spirit_treasure"
    | "natal_artifact_inner"
    | "pill"
    | "cultivation_boost"
    | "heavenly_material";
  name: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  shortDescription: string;
  buildSynergyTags: string[];
  keyLabel: string;
  disabled?: boolean;
}
```

---

## 14. 组件 10：局内雷劫 UI TribulationOverlay

### 14.1 雷劫不是普通技能提示

局内雷劫是由修为瓶颈触发的环境高压测试。  
UI 要明确告诉玩家：

- 这不是 Boss 弹幕。
- 这不是普通怪物技能。
- 这不可被常规法术清除。
- 撑过后会突破并清场。

### 14.2 触发流程

```text
修为满
  ↓
右侧修为条出现雷纹
  ↓
顶部提示：天道感应
  ↓
8s 倒计时：三九雷劫将临
  ↓
画面边缘变暗，BGM 压低
  ↓
红色锁定光柱出现
  ↓
天雷落下
  ↓
持续 20–24s
  ↓
最终雷罚
  ↓
造化清气，全屏清场，回满，突破
```

### 14.3 常驻雷劫组件

位置：顶部中央偏下，Boss 战时放 Boss 血条下方。

```text
三九雷劫
剩余 18.6s
天雷不可清除
```

### 14.4 落雷预警

落雷落点必须画在战斗层，不在 HUD 层。

预警规则：

- 红色/紫色圆形光柱。
- 1.0 秒预警。
- 内圈表示真实命中半径。
- 外圈表示视觉扩散。
- 最后 0.25s 高频闪烁。
- 不得被爆炸粒子遮住。
- 优先级高于掉落物、玩家弹幕、普通敌弹特效。

### 14.5 成功反馈

```text
逆天改命
练气九层 → 筑基一层
精 +80%，气 +65%，神识衍生属性 +35%
```

不要只显示“Level Up”。  
必须显示境界变化和基础面板质变。

### 14.6 ViewState

```ts
interface TribulationOverlayViewState {
  active: boolean;
  playerId: "p1" | "p2";
  tribulationName: string;
  phase: "incoming" | "active" | "final_strike" | "success" | "failed";
  remainingTime: number;
  warningText: string;
  canClearThunder: false;
  targetRealmName?: string;
  lightningWarnings: LightningWarningViewState[];
}

interface LightningWarningViewState {
  id: string;
  x: number;
  y: number;
  radius: number;
  timeToImpact: number;
  severity: "medium" | "high" | "lethal";
}
```

---

## 15. 组件 11：死亡、神魂与精血渡魂 RescueUI

### 15.1 神魂出窍提示

倒地玩家：

```text
神魂出窍
等待道友渡魂
```

面板变化：

- 玩家核心面板变灰蓝/半透明。
- HP 条替换为“神魂”条。
- 战场中玩家模型变成半透明魂体。
- 普攻/法术栏禁用或变为魂修技能预留。

### 15.2 队友救援提示

存活玩家靠近神魂时：

```text
按住 H 渡魂
将消耗自身精血
```

长按后：

```text
精血渡魂  62%
```

战斗层显示聚灵阵圆圈：

- 内圈表示救援有效范围。
- 进度以环形填充。
- 施救者生命条出现“精血流失”红色预览段。
- 若受到攻击或离开范围，进度暂停/衰减。

### 15.3 复活成功

```text
肉身重塑
无敌 2.0s
```

倒地玩家生命恢复至 35%，并短暂无敌。

### 15.4 团灭提示

如果两人都处于神魂且无魂修重塑能力：

```text
道途暂断
正在结算本局所得
```

不要立即显示失败黑屏。  
保留 1–2 秒战场慢动作和资源飞回镜头，让“哈迪斯式保留资源”情绪更好。

### 15.5 ViewState

```ts
interface RescueViewState {
  visible: boolean;
  downedPlayerId: "p1" | "p2";
  rescuerPlayerId?: "p1" | "p2";
  canRescue: boolean;
  inRange: boolean;
  progress01: number;
  hpCostPreviewPercent: number;
  keyLabel: string;
  decayActive: boolean;
}
```

---

## 16. 组件 12：即时提示 Toast / CombatPrompt

### 16.1 提示类型

| 类型 | 示例 | 位置 |
|---|---|---|
| 资源提示 | 真元不足 | 对应法术图标旁 |
| 战斗提示 | 连锁 x12 | 击杀中心附近 |
| 系统提示 | 顿悟将至 | 顶部中央 |
| 队友提示 | P2 神魂出窍 | 屏幕边缘 + 队友面板 |
| 雷劫提示 | 天雷不可清除 | 顶部中央 |
| Build 提示 | 木火相生：爆燃触发 | 中下方短浮字 |

### 16.2 节流规则

```ts
samePromptCooldown = 2.0s
lowHpPillSuggestionCooldown = 20.0s
tribulationWarningNoThrottle = true
```

任何提示都要有优先级队列。  
P0/P1 可以打断 P3/P4。

### 16.3 文案格式

推荐：

```text
主信息：真元不足
副信息：还差 12 点气
```

雷劫：

```text
主信息：天雷不可清除
副信息：离开红色光柱
```

丹药：

```text
主信息：回春丹可炼化
副信息：12秒持续恢复
```

---

## 17. 暂停/详情面板 PauseRunPanel

### 17.1 作用

暂停页用于承载不适合常驻的信息：

- 当前装备详情。
- 功法/天赋/体质列表。
- 精气神与副属性。
- 当前难度词条。
- 掉落资源。
- 队友构筑摘要。
- 操作键位。
- UI 显示设置。

### 17.2 布局

```text
左：P1 当前 Build
右：P2 当前 Build
中：队伍状态 / 阶段进度 / 掉落资源
底部：设置 / 退出 / 继续
```

### 17.3 必须强调

暂停页仍然要区分：

- 灵气经验等级。
- 修为境界层级。

示例：

```text
团队顿悟等级：3
下一次顿悟：420 / 680 灵气

P1 修为：练气三层 218 / 470
P2 修为：练气二层 330 / 380
```

---

## 18. 结算前提示 RunEndPreview

v0.1 可以先做简单结算前提示，不做完整局外 UI。

失败时：

```text
身死道消，但道途未绝
已带回：
灵草 x24
妖丹 x8
玄石 x5
功法残页 x1
```

胜利时：

```text
青云山已破
获得：
雷灵核 x1
妖丹 x18
青云玉简 x1
```

注意：局内战败并非“白打”。UI 要表达“资源带回洞府”的安慰感。

---

## 19. 输入提示与键位显性化

### 19.1 默认键位

| 操作 | P1 | P2 |
|---|---|---|
| 移动 | WASD | 方向键 |
| 法术 1–4 | J/K/L/I | Num1/Num2/Num5/Num6 |
| 丹药 1–3 | 1/2/3 | 7/8/9 |
| 救援/交互 | H | Num0 |
| 暂停 | Esc | Esc |

### 19.2 HUD 显示规则

- 法术图标必须显示按键标签。
- 丹药图标必须显示按键标签。
- 救援时必须显示长按键位。
- 顿悟奖励必须显示选择键位。
- 支持后续键位重绑，UI 读取 `InputBindingViewState`，不要硬编码文本。

---

## 20. 可访问性与可读性

v0.1 至少预留：

1. UI 缩放：0.85 / 1.0 / 1.15 / 1.3。
2. 低特效模式：降低粒子、震屏、边缘暗角。
3. 色弱友好：颜色 + 形状 + 文案三重区分。
4. 关闭屏幕震动。
5. 法术/丹药图标显示文字缩写。
6. 雷劫落点使用形状区分，而不是只靠红色。
7. 可调背景暗度，防止弹幕和背景混在一起。

---

## 21. UI 层级与渲染顺序

推荐 Canvas/Web 渲染层级：

```text
L0 Background
L1 Background Effects
L2 Pickups
L3 Enemies
L4 Boss
L5 Enemy Bullets
L6 Player Bullets
L7 Players
L8 Combat Critical Warnings
L9 Spell/Pill Effects
L10 Floating Text
L11 HUD Panels
L12 Event Overlays
L13 Pause/Insight/RunEnd Modal
```

关键规则：

- 雷劫落点属于 L8，必须高于普通特效。
- HUD 面板属于 L11，不能影响战斗逻辑。
- 顿悟/暂停属于 L13，会冻结战斗模拟。
- 任何 UI 动画不能写入 gameplay state。

---

## 22. UI 状态机

### 22.1 全局 UI 模式

```ts
type UiMode =
  | "combat"
  | "combat_boss"
  | "combat_tribulation"
  | "insight_paused"
  | "rescue_focus"
  | "pause"
  | "run_end";
```

### 22.2 模式转换

```text
combat
  → combat_boss        Boss 入场
  → combat_tribulation 修为瓶颈触发雷劫
  → insight_paused     灵气经验满
  → rescue_focus       玩家倒地且队友接近
  → pause              Esc
  → run_end            胜利/团灭

insight_paused
  → combat             双方选择完成

combat_tribulation
  → combat             雷劫成功/失败处理后
```

### 22.3 冲突处理优先级

如果多个事件同时发生：

1. RunEnd
2. InsightOverlay
3. Tribulation final strike
4. Boss phase warning
5. Rescue prompt
6. Normal toast

雷劫可以与 Boss 同时存在，但 UI 上 Boss 血条不消失，雷劫计时条挂在 Boss 血条下方。

---

## 23. 数据契约总览

### 23.1 Root ViewState

```ts
interface InRunUiViewState {
  mode: UiMode;
  screen: {
    width: number;
    height: number;
    scale: number;
    safeArea: Rect;
  };

  players: PlayerHudViewState[];
  teamInsight: TeamInsightBarViewState;
  stage: StageProgressViewState;
  boss?: BossHudViewState;
  tribulation?: TribulationOverlayViewState;
  rescue?: RescueViewState;
  insight?: InsightOverlayViewState;
  prompts: CombatPromptViewState[];
}
```

### 23.2 PlayerHudViewState

```ts
interface PlayerHudViewState {
  core: PlayerCorePanelViewState;
  cultivation: CultivationBarViewState;
  spells: SpellSlotViewState[];
  pills: PillSlotViewState[];
  artifacts: ArtifactPanelViewState;
  treasures: SpiritTreasureRackViewState;
  buildSummary: BuildSummaryViewState;
}
```

---

## 24. v0.1 最小实现范围

### 24.1 必做

- P1/P2 核心状态面板。
- 团队灵气经验条。
- 个人修为条。
- 4 法术格。
- 3 丹药格 + 消化进度。
- 本命法宝 2 格。
- 灵宝 4 格。
- Boss 血条。
- 阶段进度。
- 双人顿悟界面。
- 雷劫提示与落雷预警。
- 神魂/救援 UI。
- 基础暂停详情。
- 基础胜负结算提示。

### 24.2 暂缓

- 鼠标 Tooltip。
- 全局皮肤系统。
- 复杂图标库。
- 自定义 HUD 拖拽。
- 观战者 UI。
- 聊天/表情。
- 超宽专属布局。
- 完整设置页。

---

## 25. 第一版验收标准

### 25.1 双轨成长可读性

新玩家在 3 分钟内应该能理解：

- 翠青色灵气条满了会顿悟抓牌。
- 金白色修为条满了会突破/雷劫。
- 真元条是放法术的资源。
- 丹药不是瞬间血瓶，而是需要消化。

### 25.2 高压战斗可读性

在 1-4 妖潮压境中：

- 玩家能看清自己的判定点。
- 玩家能知道法术是否可用。
- 玩家能知道丹药是否正在消化。
- 玩家能看清队友是否倒地。
- 雷劫落点不会被粒子或掉落物遮挡。

### 25.3 双人协作可读性

在双人顿悟中：

- 双方都能看到彼此选项。
- 公共气运点位置明确。
- 谁已选择、谁在护法一眼可知。
- 选项类型、稀有度、是否替换槽位清楚。

### 25.4 代码实现可读性

Codex 实现时：

- 不从 gameplay state 直接读 DOM。
- 每帧由 `InRunUiViewState` 渲染 UI。
- UI 动画不改变战斗逻辑。
- 所有键位标签来自输入绑定。
- 组件状态有明确枚举，不靠字符串拼接猜状态。

---

## 26. 下一步建议

UI/UX 信息架构之后，下一份文档应继续写：

# 《联机同步技术设计 v0.1》

原因：

- 顿悟是双人全局暂停。
- 公共气运重 Roll 是共享资源。
- 局内雷劫可由某一名玩家修为触发，但影响全场。
- 救援进度、丹药消化、法术释放都需要在在线联机中保持一致。
- STG 海量弹幕不适合状态同步，必须尽早按确定性输入同步设计 UI 与 gameplay 的事件边界。

这份 UI 文档已经把所有需要同步的 UI 事件抽象成 ViewState 和事件提示，下一步应定义这些状态如何从确定性战斗模拟中生成，并如何在联机双方保持一致。
