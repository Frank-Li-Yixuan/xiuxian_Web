# 《角色创建与天命开局页面实现文档 v0.1》

目标读者：Codex / 项目开发者
适用项目：双人雷霆战机修仙版，当前 vanilla TypeScript + Vite 项目
当前阶段：创建角色页面产品化实现
硬约束：只做浏览器 UI、数据、Profile 草稿、路由流转，不改确定性战斗模拟。

---

## 0. 本文档解决什么

当前“新的游戏”不应直接进入战斗，也不应直接给玩家一个已有法宝丹药的 debug 配置。正确流程应当是：

```text
开始界面
  → 新的游戏
  → 选择存档位
  → 创建角色页面
  → 抽命 / 定形 / 锁词条 / 重 Roll
  → 确认此生
  → 写入存档 Profile 草稿
  → 进入 0–18 岁人生模拟阶段
  → 18 岁系统觉醒
  → 域外战场第一战
  → 开辟洞府
```

本次实现只要求做到：

```text
存档位 → 创建角色页面 → 确认此生 → LifeSimulationScreen 占位/入口
```

不要求完整人生模拟，不要求域外战场，不要求洞府完成。但数据结构必须为后续三者预留接口。

---

## 1. 产品定位

角色创建不是普通 RPG 加点页，而是“重开一世”的命运抽取界面。

玩家在这里应该感受到：

```text
我不是在选职业。
我是在抽一段修真人生的底子。
```

核心体验：

1. Roll 灵根、资质、命格、出身、隐藏血脉。
2. 词条有强烈优缺点，不只是平庸属性加成。
3. 可以锁定心仪词条后继续 Roll 其他项。
4. 隐藏血脉和身世只给模糊提示，制造盲盒感。
5. 确认后保存角色草稿，进入十八年人生模拟。

---

## 2. 页面信息架构

建议 1920×1080 布局，使用已经生成的 UI 控件。

```text
┌──────────────────────────────────────────────────────────────┐
│                      角色创建 / 命盘界面                       │
├──────────────────┬────────────────────┬──────────────────────┤
│  左：角色展示区   │  中：属性与灵根区   │  右：命格与身世区       │
│                  │                    │                      │
│  角色立绘框       │  名字输入           │  主命格卡              │
│  外观/气质选项    │  精气神             │  副命格卡 x2           │
│  头像预览         │  六维资质           │  缺陷/劫命卡           │
│                  │  灵根命盘           │  出身面板              │
│                  │                    │  隐藏血脉提示面板       │
├──────────────────┴────────────────────┴──────────────────────┤
│        [重新推演] [锁定项提示] [天机推演次数] [确认此生] [返回] │
└──────────────────────────────────────────────────────────────┘
```

### 左侧：角色展示区

必须显示：

- 角色名输入。
- 角色立绘/剪影/头像区域。
- 性别表现/体型/气质/服色的第一版占位选项。
- 当前灵根色调的视觉提示。

第一版可以不做复杂捏脸，只做 4–6 个外观模板按钮和主色选择。

### 中部：属性与灵根区

必须显示：

基础三宝：

```text
精 / 气 / 神
```

修仙资质：

```text
根骨 / 悟性 / 灵感 / 气运 / 心性 / 寿元
```

灵根：

```text
金 / 木 / 水 / 火 / 土 / 雷 / 阴 / 阳 / 杂灵根 / 天灵根
```

### 右侧：命格与身世区

必须显示：

```text
主命格 x1
副命格 x2
缺陷命格 x1
出身 x1
隐藏血脉/隐藏因果提示 x1
```

命格卡必须展示：

- 名称。
- 稀有度。
- 标签。
- 正面效果。
- 负面代价。
- 是否锁定。

---

## 3. 页面状态机

创建角色页面的内部状态：

```ts
type CharacterCreationMode =
  | "drafting"        // 正在 Roll / 修改
  | "confirming"      // 点击确认此生后的确认弹窗，可选
  | "saving"          // 写入存档
  | "completed";      // 已完成，准备进入人生模拟
```

路由阶段建议：

```ts
type AppRoute =
  | { screen: "main_menu" }
  | { screen: "save_slot"; mode: "new" | "continue" }
  | { screen: "character_creation"; slotId: string }
  | { screen: "life_simulation"; slotId: string }
  | { screen: "outgame_home"; slotId: string }
  | { screen: "battle"; slotId: string; runId: string };
```

Profile 阶段建议：

```ts
type ProfileStage =
  | "empty"
  | "character_creation"
  | "life_simulation"
  | "outer_battlefield"
  | "dongfu_unlocked";
```

规则：

1. 点击“新的游戏”选择空存档后，创建一个 `profileStage: "character_creation"` 的草稿 Profile。
2. 确认角色后，写入 `characterOrigin`，并把 `profileStage` 改为 `"life_simulation"`。
3. 继续游戏读取存档时：
   - `character_creation` → 回到创建角色。
   - `life_simulation` → 回到人生模拟。
   - `outer_battlefield` → 回到域外战场。
   - `dongfu_unlocked` → 回到洞府。

---

## 4. 属性系统

### 4.1 核心三宝

| 属性 | 范围 | 含义 | 影响 |
|---|---:|---|---|
| 精 `jing` | 1–100 | 体魄、血肉、承载力 | 生命、抗压、寿元承载、炼体 |
| 气 `qi` | 1–100 | 真元、周天、法力 | 真元池、吐纳、功法效率 |
| 神 `shen` | 1–100 | 神识、心念、感知 | 顿悟、暴击、索敌、抗心魔 |

### 4.2 修仙资质

| 属性 | 范围 | 含义 | 影响 |
|---|---:|---|---|
| 根骨 `rootBone` | 1–100 | 身体资质 | 修炼效率、生命成长、炼体 |
| 悟性 `comprehension` | 1–100 | 领悟能力 | 法术学习、顿悟奖励质量 |
| 灵感 `inspiration` | 1–100 | 感应异象能力 | 奇遇、隐藏血脉线索、事件识别 |
| 气运 `fortune` | 1–100 | 福缘与命数 | 掉落、保命、稀有事件 |
| 心性 `heart` | 1–100 | 道心稳定 | 抗心魔、突破稳定、极端命格缓冲 |
| 寿元 `lifespan` | 1–100 | 人生长度和闭关成本 | 长线模拟、短命命格制约 |

### 4.3 派生值

第一版只需在 UI 显示，不要求全部接入战斗。

```ts
maxLifeExpectancy = 60 + lifespan * 2;
trainingAffinity = rootBone * 0.45 + qi * 0.25 + comprehension * 0.2 + heart * 0.1;
insightQuality = comprehension * 0.55 + shen * 0.25 + fortune * 0.2;
hiddenEventChance = inspiration * 0.55 + fortune * 0.35 + shen * 0.1;
heartDemonResistance = heart * 0.6 + shen * 0.25 + lifespan * 0.15;
```

---

## 5. 灵根系统

第一版灵根要影响 UI、事件权重、初始法术池权重，但不需要立刻完全接入战斗数值。

| 灵根 | 标签 | 倾向 |
|---|---|---|
| 金灵根 | `metal` | 飞剑、暴击、破甲 |
| 木灵根 | `wood` | 生发、恢复、药理、控制 |
| 水灵根 | `water` | 真元回复、清心、护盾 |
| 火灵根 | `fire` | 炼丹、爆发、灼烧 |
| 土灵根 | `earth` | 阵法、防御、聚灵 |
| 雷灵根 | `thunder` | 雷法、雷劫、清屏 |
| 阴灵根 | `yin` | 魂修、神魂、梦境 |
| 阳灵根 | `yang` | 精血、护体、正法 |
| 杂灵根 | `mixed` | 起步慢，适配广 |
| 天灵根 | `heavenly` | 单项极强，发展窄 |

生成规则：

- 单灵根：权重 35%。
- 双灵根：权重 32%。
- 三灵根/杂灵根：权重 22%。
- 异灵根（雷/阴/阳）：权重 9%。
- 天灵根：权重 2%。

气运、隐藏血脉、出身可修正权重。

---

## 6. 命格系统

### 6.1 创建时结构

```text
主命格 x1
副命格 x2
缺陷/劫命 x1
```

### 6.2 命格类型

| 类型 | 用途 |
|---|---|
| 成长型 | 改变修炼速度、寿元、阶段收益 |
| 战斗型 | 改变域外战场和局内战斗倾向 |
| 经营型 | 改变炼丹、炼器、洞府、资源收益 |
| 风险型 | 高收益高代价 |
| 隐藏联动型 | 与血脉、身世、法脉产生特殊组合 |

### 6.3 设计原则

禁止只有平庸数值：

```text
攻击 +5%
生命 +10
修炼速度 +8%
```

推荐正负并存：

```text
天妒英才：修炼速度 +300%，悟性大幅提高；寿元上限 -70%，突破雷劫强度提高。
苟道至尊：不战斗时收益极高；主动战斗会暂时失效，攻击法术初始等级降低。
废灵逆命：前期修炼极慢；突破失败后获得永久逆命点。
魔心暗种：暴击、奇遇、魔念选项提高；心魔事件频发。
饮鸩止渴：丹药收益翻倍；丹毒也翻倍。
```

### 6.4 互斥与碰撞

命格数据中必须支持：

```ts
exclusiveWith?: string[];
synergyWith?: string[];
conflictWith?: string[];
```

示例：

- `清净琉璃心` 与 `魔心暗种` 冲突但可共存，形成高风险压制流。
- `天妒英才` 与 `长生种` 互斥。
- `苟道至尊` 与 `以战养战` 冲突。
- `废灵逆命` 与 `百折不摧` 协同。

第一版实现策略：

- `exclusiveWith` 必须阻止同池出现。
- `synergyWith` 在 UI 显示“潜在共鸣”。
- `conflictWith` 在 UI 显示“命理相冲”，但允许玩家确认。

---

## 7. 身世与隐藏血脉

### 7.1 表面身世

第一批身世：

| 身世 | 倾向 |
|---|---|
| 山村孤儿 | 高随机、隐藏血脉权重略高 |
| 药铺学徒 | 药理、炼丹、木/火/水 |
| 道观杂役 | 心性、符箓、藏经线索 |
| 猎户之子 | 精、根骨、武艺 |
| 破落修士之后 | 初始随身物、法宝残片 |
| 流民遗孤 | 资源少，气运事件多 |
| 私塾童生 | 悟性、学识、符文理解 |
| 富户庶子 | 资源多，心性/亲缘事件复杂 |

### 7.2 隐藏血脉/隐藏因果

创建时不完全明示，只显示“隐约预兆”。

示例：

```text
古雷真血：你偶尔能听见雷云深处的战鼓。
太阴残脉：你在月夜总会感到额心发凉。
龙骨未醒：你幼时跌落山崖，却只擦破了皮。
丹圣遗骨：你闻到草药时，脑中会浮现不属于你的火候记忆。
前世剑魄：你握住木枝时，仿佛听见剑鸣。
```

UI 显示：

```text
隐藏预兆：雨夜时常梦见天外雷鸣。
```

不要直接显示“古雷真血”，除非未来人生事件觉醒。

---

## 8. Roll 机制

### 8.1 基础 Roll

点击“重新推演”时，随机生成：

```text
基础属性
灵根
主命格
副命格 x2
缺陷命格
表面身世
隐藏血脉/预兆
初始随身物线索
```

### 8.2 锁定规则

玩家可锁定：

```text
灵根
主命格
副命格 1
副命格 2
缺陷命格
身世
隐藏预兆
```

第一版建议：

```text
免费锁定位：1
天机推演可额外锁 1 次，占用 divination token
```

锁定后，重 Roll 保留锁定项。

### 8.3 天机推演

第一版先做 UI 和状态，不需要复杂经济系统。

```text
初始天机推演次数：1
效果：提升下一次 Roll 的稀有命格权重，并允许多锁定一项。
```

### 8.4 防止 Roll 崩坏

- 同一 Roll 不能出现互斥命格。
- 缺陷命格不能被普通副命格替代。
- 至少保证一个可玩路线提示。
- 如果生成结果过弱，允许系统自动补一个补偿标签，如“逆命微光”。

---

## 9. 创建角色数据模型

建议新增：

```text
src/character/CharacterCreationState.ts
src/character/CharacterDraftGenerator.ts
src/character/CharacterProfileMapper.ts
```

### 9.1 CharacterCreationDraft

```ts
interface CharacterCreationDraft {
  readonly draftId: string;
  readonly slotId: string;
  readonly name: string;
  readonly appearance: CharacterAppearanceState;
  readonly coreStats: CoreThreeTreasures;
  readonly aptitude: AptitudeStats;
  readonly spiritualRoot: SpiritualRootState;
  readonly destinies: DestinySelectionState;
  readonly background: BackgroundOriginState;
  readonly hiddenFate: HiddenFateState;
  readonly carriedItems: readonly CarriedItemDraft[];
  readonly locks: CharacterCreationLocks;
  readonly rerollCount: number;
  readonly divinationTokens: number;
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
}
```

### 9.2 与 OutgameProfileState 的关系

当前项目已有 `OutgameProfileState`。不要直接破坏原接口。建议新增扩展字段：

```ts
interface OutgameProfileState {
  ...existingFields;
  readonly profileStage?: ProfileStage;
  readonly characterOrigin?: CharacterOriginState;
  readonly lifeSimulation?: LifeSimulationProgressState;
}
```

如果不想改现有接口太大，也可以新增：

```ts
interface GameProfileState extends OutgameProfileState {
  readonly profileStage: ProfileStage;
  readonly characterOrigin?: CharacterOriginState;
  readonly lifeSimulation?: LifeSimulationProgressState;
}
```

但建议最终统一到 Profile 内，避免以后存档分裂。

---

## 10. UI 组件清单

由于当前项目没有 React 依赖，默认用 DOM 组件。

建议新增目录：

```text
src/app/screens/CharacterCreationScreen.ts
src/app/screens/LifeSimulationScreen.ts
src/app/components/AssetButton.ts
src/app/components/AssetPanel.ts
src/app/components/DestinyCard.ts
src/app/components/AttributePanel.ts
src/app/components/SpiritualRootDisc.ts
src/app/components/CloseButton.ts
src/assets/UiAssetRegistry.ts
src/character/CharacterCreationState.ts
src/character/CharacterDraftGenerator.ts
src/character/CharacterCreationData.ts
```

### 10.1 CharacterCreationScreen

职责：

- 渲染创建角色页面。
- 管理当前 Draft。
- 处理 Roll / Lock / Name / Appearance / Confirm。
- 调用 SaveSlotService 保存 Draft。
- 路由到 LifeSimulationScreen。

禁止：

- 不允许直接启动战斗。
- 不允许修改 `src/sim/**`。
- 不允许把文字写进 Canvas。

### 10.2 DestinyCard

Props：

```ts
interface DestinyCardProps {
  readonly trait: DestinyTraitDefinition;
  readonly slot: "main" | "secondary1" | "secondary2" | "flaw";
  readonly locked: boolean;
  readonly onToggleLock: () => void;
}
```

显示：

- 稀有度框。
- 名称。
- 标签。
- 正面效果。
- 负面效果。
- 锁定按钮。
- 冲突/共鸣提示。

### 10.3 AttributePanel

显示：

```text
精 气 神
根骨 悟性 灵感 气运 心性 寿元
```

数值建议使用：

- 数字。
- 短条形进度。
- 增减颜色。

### 10.4 SpiritualRootDisc

显示：

- 灵根名称。
- 元素徽章。
- 倾向描述。
- 与命格/出身的共鸣提示。

### 10.5 BackgroundOriginPanel

显示：

- 表面出身。
- 出身描述。
- 初始资源/随身物线索。

### 10.6 HiddenBloodlinePanel

显示模糊提示，不直接泄露真名：

```text
隐约预兆：你常在雷雨夜梦见天外战鼓。
```

---

## 11. 样式与视觉要求

### 11.1 页面风格

- 使用已生成的玉青 + 金纹 + 云纹 + 法印控件。
- 背景可暂时沿用开始界面背景或深色云海背景。
- 不要使用默认 HTML 灰色 input/button。
- 所有按钮、卡牌、面板都要用资产背景。
- 中文必须清晰，优先使用系统字体：`"Microsoft YaHei", "PingFang SC", system-ui`。

### 11.2 动效

第一版至少要有：

- 命格卡 hover 微放大/发光。
- 点击“重新推演”时命盘短暂旋转/闪光。
- 锁定按钮切换时有 seal 视觉变化。
- 传说命格出现时有一次轻微闪光。
- 确认此生时有法阵收束效果，可先用 CSS 动画实现。

不要过度动画，避免影响可读性。

---

## 12. 交互流程

### 12.1 初次进入

```text
SaveSlotScreen 新建空存档
  → createDraftProfile(slotId)
  → CharacterCreationScreen(slotId)
  → 自动生成第一版 Draft
```

默认角色名：

```text
无名散修
```

### 12.2 重新推演

点击“重新推演”：

1. 读取 locks。
2. 保留锁定项。
3. 对未锁定项重新随机。
4. 增加 rerollCount。
5. 刷新 UI。
6. 如果出现稀有命格，播放对应视觉提示。

### 12.3 锁定

点击锁定：

- 若剩余普通锁定位 > 0，允许。
- 若已无锁定位但有天机推演 token，可提示消耗。
- 第一版可以简化为：最多锁 2 项。

### 12.4 确认此生

点击“确认此生”：

1. 校验名字非空。
2. 校验 draft 完整。
3. 写入 Profile：`characterOrigin`。
4. 更新 `profileStage = "life_simulation"`。
5. 保存到 localStorage。
6. 路由到 LifeSimulationScreen。

### 12.5 返回/关闭

点击右上角叉号：

- 如果是未保存新建 draft，弹窗确认返回存档页。
- 第一版也可以直接返回 SaveSlotScreen，但不能丢存档槽状态。

---

## 13. 第一批数据内容

第一版至少包含：

```text
灵根：10 个
主命格：16 个
副命格：24 个
缺陷命格：12 个
身世：8 个
隐藏血脉/因果：12 个
随身物：12 个
```

不需要全部平衡完，但要能让页面随机结果有差异。

---

## 14. 测试要求

### 14.1 单元测试

新增：

```text
tests/character/character-draft-generator.test.ts
tests/character/destiny-trait-rules.test.ts
tests/app/character-creation-screen.test.ts
```

测试点：

1. Draft 生成包含所有必要字段。
2. 主命格、副命格、缺陷命格不为空。
3. 互斥命格不会同时出现。
4. 锁定项在 reroll 后不改变。
5. 未锁定项在 reroll 后大概率变化。
6. 确认此生后 Profile stage 变为 `life_simulation`。
7. 名字为空时不能确认。
8. UI manifest 缺 required asset 会失败。

### 14.2 App 流程测试

1. New Game → Save Slot → CharacterCreationScreen。
2. CharacterCreationScreen 渲染命格卡。
3. 点击 reroll 后卡牌更新。
4. 点击 lock 后锁定图标变化。
5. 点击 confirm 后进入 LifeSimulationScreen。
6. App 不再从新游戏直接进入 battle。

### 14.3 手动验收

截图必须包含：

1. 创建角色初始页面。
2. 重 Roll 前后对比。
3. 锁定一个传说/稀有词条后继续 Roll。
4. 命格卡 hover 效果。
5. 确认此生后的 LifeSimulationScreen 入口。

---

## 15. 验收标准

本任务完成后，必须满足：

```text
1. 新建存档后进入创建角色页面，而不是直接战斗。
2. 页面使用生成好的 UI 资产，不是默认 HTML 控件。
3. 玩家可以输入名字。
4. 玩家可以看到精气神、六维、灵根、命格、身世、隐藏预兆。
5. 玩家可以鼠标点击重 Roll。
6. 玩家可以锁定命格。
7. 锁定后的命格不会被重 Roll 改掉。
8. 命格有正负效果，不是平庸加点。
9. 点击确认此生会保存 characterOrigin。
10. Profile stage 进入 life_simulation。
11. 刷新页面后可以继续到对应阶段。
12. 不修改 src/sim/**。
13. npm run typecheck 通过。
14. npm test 通过。
```

阻塞级失败：

```text
1. 新游戏仍直接进入战斗。
2. 页面未使用生成 UI 资产。
3. 重 Roll 不生效。
4. 锁定不生效。
5. 确认角色未写入存档。
6. 确认后不能进入 life_simulation。
7. Codex 改动 src/sim/**。
```

---

## 16. 不做范围

本次不做：

- 完整 0–18 岁人生模拟。
- 域外战场第一战。
- 洞府主界面重做。
- 完整人物捏脸。
- 完整血脉觉醒系统。
- 完整命格平衡。
- 命格与战斗系统的完整接入。

但必须为这些保留数据字段。

---

## 17. Codex 最终回复格式

Codex 完成实现后必须回复：

```text
Files changed:
- ...

Assets used:
- ...

Data added:
- ...

Tests run:
- npm run typecheck: pass/fail
- npm test: pass/fail

Manual test steps:
1. ...

Screenshots:
- 创建角色页面
- reroll 后页面
- 锁定后页面
- confirm 后 life simulation 入口

Known gaps:
- ...
```
