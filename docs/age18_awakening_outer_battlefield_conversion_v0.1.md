# 《18 岁系统觉醒与域外战场开局转化 v0.1》

版本：v0.1
定位：新手流程关键枢纽 / 人生模拟结算 / 第一场战斗开局生成 / 系统洞府开启前置
目标：让 Codex 能按此实现从 18 岁觉醒到域外战场第一战，再到系统家园开启的完整过渡流程。

---

## 0. 系统定位

18 岁系统觉醒不是一个普通弹窗，而是整个新游戏流程的第一个高潮。

完整流程：

```text
开始界面
  → 新的游戏
  → 选择存档位
  → 创建角色 / 抽命
  → 0–18 岁人生模拟
  → 18 岁系统觉醒
  → 系统解析人生结果
  → 投放域外战场第一战
  → 战斗结算
  → 系统开辟家园 / 洞府
  → 进入正式局外修真模拟器
```

本系统负责把前面所有开局系统的结果收束为三个输出：

```text
1. 18 岁觉醒结算 Age18AwakeningResolution
2. 第一战配置 OuterBattlefieldIntroRunConfig
3. 战后洞府开启计划 SystemHomeUnlockPlan
```

---

## 1. 设计目标

### 1.1 让人生模拟结果有意义

18 年里积累的：

```text
属性
灵根
天命
劫命
隐藏血脉
身世
随身物
月度事件
半年选择
功德 / 业力
心魔 / 伤病 / 心结
随身物亲和
```

都应该在 18 岁结算时得到回应。

玩家应当感到：

```text
我不是随便被丢进第一战。
我的童年经历、天命组合、随身物和选择，真的改变了第一场战斗。
```

### 1.2 域外战场是第一场实战，不是完整常规关卡

域外战场第一战的目的不是测试完整 STG 系统，而是：

```text
1. 教玩家移动、普攻、拾取。
2. 教玩家第一次顿悟。
3. 展示天命 / 灵根 / 随身物影响。
4. 给玩家一次战斗压力，但不让 18 年模拟白费。
5. 战斗结束后开启系统家园。
```

### 1.3 失败不删档

第一场域外战场失败不能让玩家重走 18 年人生模拟。

失败结果：

```text
保留人生模拟结果
保留角色和命格
记录“初战惊魂”或“域外劫伤”
允许再次挑战域外战场
可给少量补偿或提示
```

---

## 2. 输入数据

本系统读取以下输入：

```ts
interface Age18AwakeningInput {
  profileId: string;
  characterId: string;
  seed: string;

  openingDraft: OpeningInnateDraft;
  destinySelection: DestinySelectionState;
  originFate: OriginFateDraft;
  lifeSimulation: LifeSimulationState;
  majorChoiceHistory: MajorChoiceResolution[];

  currentSaveStage: "life_simulation_completed";
}
```

### 2.1 必要输入说明

| 输入 | 来源 | 用途 |
|---|---|---|
| `OpeningInnateDraft` | 开局属性与灵根随机生成器 | 属性、灵根、成长偏置、模式标签 |
| `DestinySelectionState` | 天命系统 | 天命、劫命、互斥、共鸣、长期规则 |
| `OriginFateDraft` | 身世 / 隐藏血脉 / 随身物 | 隐藏揭示、随身物转化、身世因果 |
| `LifeSimulationState` | 月度事件系统 | 18 年属性、日志、伤病、心魔、隐藏进度 |
| `MajorChoiceResolution[]` | 半年选择系统 | 关键人生选择、成功失败、age18 hooks |

---

## 3. 输出数据

### 3.1 Age18AwakeningResolution

```ts
interface Age18AwakeningResolution {
  resolutionId: string;
  profileId: string;
  characterId: string;
  resolvedAtAgeMonths: 216;

  finalLifeStats: FinalLifeStats;
  awakeningScore: AwakeningScoreBreakdown;

  revealedHiddenFates: RevealedHiddenFate[];
  sealedHiddenFates: SealedHiddenFate[];

  convertedCarriedItems: ConvertedCarriedItem[];
  destinyProjections: DestinyAge18Projection[];

  firstBattleModifiers: OuterBattlefieldModifier[];
  initialLoadout: OuterBattlefieldInitialLoadout;

  systemMessages: SystemAwakeningMessage[];
  warnings: Age18Warning[];

  debug?: Age18AwakeningDebugInfo;
}
```

### 3.2 OuterBattlefieldIntroRunConfig

```ts
interface OuterBattlefieldIntroRunConfig {
  modeId: "outer_battlefield_intro";
  runId: string;
  seed: string;

  playerProfile: OuterBattlefieldPlayerStart;
  scenario: OuterBattlefieldIntroScenario;
  tutorialSteps: TutorialStepDefinition[];
  enemyPool: string[];
  rewardPoolIds: string[];
  failurePolicy: FirstBattleFailurePolicy;
}
```

### 3.3 SystemHomeUnlockPlan

```ts
interface SystemHomeUnlockPlan {
  unlockId: string;
  profileId: string;
  trigger: "after_outer_battlefield_intro_clear";

  initialHomeModules: SystemHomeModuleUnlock[];
  initialResources: ResourceGrant[];
  originBasedBonuses: OriginBasedHomeBonus[];
  nextMainObjectives: MainObjective[];
}
```

---

## 4. 18 岁觉醒流程

### 4.1 结算流程

```text
进入 18 岁
  ↓
冻结人生模拟时间
  ↓
播放系统觉醒日志
  ↓
计算最终人生属性
  ↓
解析隐藏血脉/前世/系统共鸣
  ↓
解析随身物
  ↓
投射天命到第一战
  ↓
生成域外战场 RunConfig
  ↓
存档阶段改为 outer_battlefield_pending
  ↓
进入域外战场过渡界面
```

### 4.2 系统觉醒文案节奏

系统觉醒不应只是一个 alert，而应该像仪式：

```text
十八岁生辰夜，天色无月。
你忽然听见耳边传来冰冷的声音。

【检测到宿主年龄已满十八岁。】
【人生模拟阶段结束。】
【正在解析天命、灵根、随身因果……】
【域外战场征召开始。】
【存活，即可获得系统家园权限。】
```

可以用逐行打字机效果，允许玩家跳过。

---

## 5. 最终人生属性结算

### 5.1 FinalLifeStats

18 岁最终状态来自：

```text
出生种子
+ 月度事件成长
+ 半年选择结果
+ 天命修正
+ 身世修正
+ 伤病 / 心结 / 心魔 / 功德 / 业力
```

核心输出：

```ts
interface FinalLifeStats {
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
    knowledge: number;
    martial: number;
    alchemy: number;
    insight: number;
    reputation: number;
    survival: number;
  };
  karma: number;
  merit: number;
  heartDemon: number;
  wounds: LifeWoundState[];
  heartKnots: LifeHeartKnotState[];
}
```

---

## 6. 战斗属性转化

域外战场第一战使用简化战斗投射，不等于完整中后期模式数值。

### 6.1 基础公式

```text
maxHp = 80 + 精 × 2.6 + 根骨 × 0.7 - 伤病惩罚
maxQi = 60 + 气 × 3.0 + 悟性 × 0.45
pickupRadius = 85 + 神 × 1.25 + 灵感 × 0.35
critChance = 0.03 + 神 × 0.00045 + 悟性 × 0.00025
passiveQiRegen = 0.8 + 气 × 0.018 + 心性 × 0.006
spellInsightBonus = 悟性 × 0.25 + 灵感 × 0.2
lifeSimDropLuckBonus = 气运 × 0.18
heartDemonResistance = 心性 × 0.35 + 功德 × 0.08
```

### 6.2 软上限

为避免极端开局第一战直接爆表，第一战投射做软上限：

```text
有效属性 = softCap(raw, cap=120, softness=0.45)
```

也就是 120 以上仍有收益，但收益递减。天命的机制性效果仍然保留。

### 6.3 状态惩罚

| 状态 | 第一战影响 |
|---|---|
| 重伤 | maxHp -10% 到 -25% |
| 心结 | 法术冷却 +3% 到 +10% |
| 心魔 | 可能插入心魔弹 / 幻听提示 |
| 丹毒 | 丹药效果下降或消化变慢 |
| 业力高 | 敌人更强，掉落略好 |
| 功德高 | 首次濒死保命概率 / 额外护盾 |

---

## 7. 隐藏血脉揭示

### 7.1 揭示概率

隐藏命在创建页不暴露真名。18 岁根据进度结算：

| 进度段 | 概率 | 结果 |
|---:|---:|---|
| 0–29 | 5% | 通常只保留线索 |
| 30–69 | 25% | 可能半觉醒 |
| 70–99 | 70% | 大概率半觉醒 / 揭示 |
| 100+ | 100% | 正式觉醒 |

修正：

```text
灵感 >= 90：+8%
气运 >= 90：+6%
匹配天命：+12%
匹配随身物：+10%
系统共鸣类：若有 system omen hook，+15%
心性过低且为魔印类：可强制负向揭示
```

### 7.2 揭示等级

```text
sealed：未揭示，只留下线索
halfAwakened：半觉醒，第一战临时触发
revealed：真名揭示，写入长期 Profile
unstable：不稳定觉醒，获得强效果但附带风险
```

### 7.3 示例

#### 古雷真血

```text
sealed：第一战雷系事件权重 +5%
halfAwakened：首次雷击命中敌人时触发小型链雷
revealed：解锁“古雷真血”长期标签，雷法和雷劫相关系统开启
unstable：雷法强度提高，但第一战出现额外天雷预警
```

#### 丹圣遗骨

```text
sealed：药理事件保留线索
halfAwakened：第一战开局获得回春丹 +1，丹药炼化 +10%
revealed：洞府开启时炼丹房初始火候经验提高
unstable：丹药效果提高，但丹毒敏感度提高
```

---

## 8. 随身物转化

随身物在 18 岁时被系统扫描。

```text
检测到随身物：祖传玉佩
正在解析因果……
解析结果：八卦玉佩·残
```

### 8.1 转化类型

| 类型 | 第一战效果 | 洞府效果 |
|---|---|---|
| artifactSeed | 初始本命法宝 / 法宝线索 | 炼器阁修复线 |
| treasureSeed | 初始灵宝 / 护盾 | 灵宝修复线 |
| pillSeed | 初始丹药 | 炼丹房加成 |
| talismanSeed | 初始符箓 | 符箓系统线索 |
| methodFragment | 初始功法/法术奖励权重 | 藏经阁残章 |
| karmaObject | 功德/业力/心结 | 后续因果事件 |
| systemKey | 系统权限 / 特殊 UI | 系统家园扩展 |

### 8.2 转化示例

| 随身物 | 域外战场 | 洞府 |
|---|---|---|
| 残破木剑 | 青霜飞剑·残 / 剑气 + | 炼器阁获得飞剑修复线索 |
| 祖传玉佩 | 一次护盾 / 八卦玉佩残影 | 灵宝修复线索 |
| 药铺铜炉 | 回春丹 +1 / 丹药炼化 + | 炼丹房初始火候经验 |
| 无字残页 | 首次顿悟多一张法术卡 | 藏经阁解读线 |
| 破旧符纸 | 护命符 +1 | 符箓系统入口 |
| 黑骨短笛 | 神魂状态增强，心魔风险 | 魂修 / 心魔线 |
| 残旧家书 | 功德护命 / 心性 + | 家园纪念物 |
| 裂纹铜钱 | 气运事件 / 商人折扣 | 奇货商人线索 |

---

## 9. 天命投射

天命不只给数值，而是投射为第一战规则。

### 9.1 示例

#### 天妒英才

```text
正面：第一次顿悟奖励品质 +1，法术升级权重提高。
负面：第一战有 1 次“天道注视”高危预警。
```

#### 苟道至尊

```text
正面：开局获得“潜修护盾”。前 60 秒不主动释放法术，护盾增强。
负面：主动法术初始伤害 -10%，击杀灵气收益 -10%。
```

#### 废灵逆命

```text
正面：首次濒死触发“逆命回响”，清除附近敌弹并回复少量真元。
负面：开局精气神投射 -8%。
失败：若第一战失败，额外获得逆命点。
```

#### 以战养战

```text
正面：击杀精英恢复精/气。
负面：战斗外奖励降低，但第一战中不明显。
```

#### 丹道奇才

```text
正面：开局回春丹 +1，丹药炼化速度 +15%。
负面：炼器类法宝修复线索略少。
```

#### 魔心暗种

```text
正面：暴击 +，高危掉落 +。
负面：第一战可能出现一次心魔幻弹。
```

---

## 10. 域外战场第一战设计

详见 `docs/outer_battlefield_first_run_design_v0.1.md`。

第一战建议时长：3–5 分钟。

```text
0:00–0:30 系统校准，少量残兵
0:30–1:20 残妖小潮，教拾取与自动普攻
1:20–1:40 第一次顿悟
1:40–2:40 人生/天命效果展示
2:40–3:40 战场巡游者 / 小 Boss
3:40–4:10 系统结算，家园权限开启
```

### 10.1 第一战必须展示

```text
玩家移动
自动普攻
掉落磁吸
灵气经验
第一次顿悟
丹药或随身物触发
天命效果至少触发一次
小 Boss
结算
系统家园开启
```

### 10.2 第一战失败规则

```text
失败不删除角色
不重走人生模拟
写入“初战惊魂”或“域外劫伤”
允许再次挑战
可提供一次系统提示或低保丹药
```

---

## 11. 系统家园开启

第一战成功后：

```text
域外战场结算完成。
系统提取战场残余灵机。
正在开辟宿主专属家园……
```

初始家园不是完整洞府，而是：

```text
草庐
残破聚灵阵基
藏经残壁
残炉 / 石台
简易炼器石
系统核心界面
```

### 11.1 家园模块初始解锁

| 模块 | 默认状态 |
|---|---|
| 草庐 | 已解锁，主界面 |
| 聚灵阵基 | 已解锁，低产出 |
| 藏经残壁 | 已解锁，显示法术/功法残章 |
| 残破丹炉 | 条件解锁，药铺/丹道/铜炉更容易 |
| 炼器石台 | 条件解锁，木剑/玉佩/修士后人更容易 |
| 劫雷台 | 未解锁，筑基前开启 |
| 诸天试炼台 | 第一战后显示域外战场入口，其他模式锁定 |

---

## 12. 存档阶段变化

新增存档阶段：

```ts
type SaveStage =
  | "empty"
  | "character_creation"
  | "life_simulation"
  | "age18_awakening"
  | "outer_battlefield_pending"
  | "outer_battlefield_in_progress"
  | "system_home_unlocked"
  | "dongfu";
```

流程：

```text
life_simulation at age 216
  ↓
age18_awakening
  ↓
outer_battlefield_pending
  ↓
outer_battlefield_in_progress
  ↓
first battle clear
  ↓
system_home_unlocked
  ↓
dongfu
```

如果玩家关闭游戏：

```text
age18_awakening：恢复觉醒结算界面，不重算随机
outer_battlefield_pending：恢复战前确认界面
outer_battlefield_in_progress：v0.1 可重开第一战，不重算人生
system_home_unlocked：恢复家园开启动画或直接进入洞府
```

---

## 13. UI/UX 要求

### 13.1 18 岁觉醒界面

结构：

```text
左侧：十八年人生摘要
中央：系统解析日志 / 打坐黑影被系统光照亮
右侧：解析结果卡片
底部：进入域外战场
```

显示内容：

```text
最终属性
关键天命
隐藏预兆结果
随身物解析
第一战提示
```

禁止显示：

```text
未揭示隐藏血脉真名
Debug 权重
精确随机数
```

### 13.2 域外战场战前界面

```text
宿主状态
随身物转化
初始法宝 / 丹药 / 符箓
天命规则提示
失败不会删除角色提示
开始征召
```

---

## 14. 实现边界

本系统 v0.1 不做：

```text
完整常规域外战场关卡
完整洞府经营 UI
完整多模式入口
完整魂修 / 弟子 / 宗门系统
复杂剧情分支
```

本系统必须做：

```text
18 岁结算
隐藏揭示
随身物转化
第一战 RunConfig
第一战失败策略
战后家园开启计划
存档阶段转换
```

---

## 15. 验收标准

```text
1. 216 月人生模拟结束后进入 age18_awakening。
2. 同 seed + 同人生结果，觉醒结算一致。
3. 未揭示隐藏命不泄露真名。
4. 随身物能转化为第一战初始效果或洞府线索。
5. 天命能投射为第一战规则。
6. 第一战 RunConfig 不再来自 debug_run_config。
7. 第一战失败不清空人生模拟结果。
8. 第一战胜利后进入 system_home_unlocked / dongfu。
9. 存档恢复不会重复 Roll 觉醒结果。
10. 测试覆盖关键预设：天妒雷修、苟道丹修、废灵剑修、魔心禁修。
```
